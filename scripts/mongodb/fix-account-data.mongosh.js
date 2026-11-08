/**
 * 账号数据修复脚本（mongosh），配合 app-user-auth 的邀请、注册修复使用。
 *
 * 任务（执行时机不同）：
 *   backfill-permanent-vip  给已经是永久 VIP 的账号标记 invite_permanent_vip_granted = true。
 *                           新版 bind-invitation 只给未标记的账号发“邀请满 50 人”的 9999 天。
 *                           必须在上传新版 app-user-auth 之前执行：否则已领过 9999 天的账号人数回落后再到 50，会被再发一次。
 *   clear-self-invites      把 inviter_uid 等于自身 _id 的自邀账号改为 inviter_uid = ''、invite_time = 0，
 *                           与后台“取消邀请人”页面清空关系的写法一致。已发放的 VIP 不回收。
 *   ban-clone-accounts      封禁注册平台为“熊多多共存版”的账号（status 改为 3，登录接口会拒绝）。共存版是他人用分身工具重新打包的
 *                           App，不是官方版本，被用来批量注册小号刷邀请。
 *   ban-fake-hex32          封禁脚本伪造注册的账号（平台 WithHim、设备号 32 位小写 hex）中有邀请关系的：
 *                           绑了邀请人，或名下有受邀号。只封不删，保留刷邀请的证据，也不让邀请人的受邀人数下降。
 *   delete-fake-hex32       删除其余伪造注册的账号：平台 WithHim、设备号 32 位小写 hex、没有邀请关系、未封禁、
 *                           注册超过 1 天后没有登录或在线记录。删除前把完整文档逐批写入备份，可原样导回。
 *                           只删 user-accounts，不清理通知等其他表的关联数据。
 *   除 backfill 外的任务都应在新版 app-user-auth 上线之后执行，否则执行完还会继续产生新数据。
 *   不处理内部用户；封禁、删除任务在命中账号里有付费用户（status=1 且 total_fee>0 的订单）时整个中止，交给人工处理。
 *
 * 运行方式（在项目根目录执行，需要 mongosh 2.x）：
 *   预览（默认，只读）：
 *     Git Bash：   ACCOUNT_FIX_TASK=backfill-permanent-vip mongosh --nodb --quiet scripts/mongodb/fix-account-data.mongosh.js
 *     PowerShell：$env:ACCOUNT_FIX_TASK='backfill-permanent-vip'; mongosh --nodb --quiet scripts/mongodb/fix-account-data.mongosh.js
 *   正式写入：额外设置 ACCOUNT_FIX_APPLY=YES（PowerShell 下该变量会保留到窗口关闭，用完执行 Remove-Item Env:ACCOUNT_FIX_APPLY）。
 *
 * 连接配置与 create-indexes.mongosh.js 相同：读取项目根目录 .env（DATABASE_URL / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME），
 * 不输出连接串、账号和密码。
 *
 * 写入约定：
 * - 先取出全部命中账号的 _id，再每 1000 个一批：读出原值，追加写入 scripts/mongodb/backups/<任务>-<时间>.jsonl
 *   （每行一个 Extended JSON 文档，保留 ObjectId），追加成功后才写入这一批；写文件失败即抛错停止。
 *   backups/ 已加入 .gitignore，备份含用户数据，不要提交。
 * - 每批的写入条件是“筛选条件，且 _id 属于本批已备份的账号”，执行期间状态已变化的账号不会被误改或误删。
 * - 写入后重新统计剩余命中数，并核对写入条数是否等于备份条数；不一致时以非 0 退出。
 * - 回滚：backfill 按备份 _id 对 invite_permanent_vip_granted 执行 $unset；clear 按备份逐条写回原 inviter_uid、invite_time；
 *   两个 ban 任务按备份逐条写回原 status；delete 把备份文件逐行 EJSON.parse 后重新 insert。
 */

(() => {
	'use strict'

	const fs = require('fs')
	const path = require('path')

	const DEFAULT_DATABASE_NAME = 'tddlegacy'
	const BATCH_SIZE = 1000
	// 按 _id 列表做 $in 查询时每段的数量，避免单条命令超过 16MB
	const ID_CHUNK_SIZE = 20000
	const DAY = 24 * 60 * 60 * 1000

	/**
	 * “已是永久 VIP”的判定线：VIP 到期时间晚于当前时间 20 年。
	 * 邀请满 50 人的 9999 天最早在 2024 年发放，领取者到期时间都在 2051 年以后，全部高于这条线。
	 * 通过其他途径已有 20 年以上 VIP 的账号也会被标记，结果只是今后不会再从邀请拿到 9999 天，没有实际损失。
	 * 无法覆盖的情况：领过 9999 天后被后台“取消邀请人”收回了 VIP 的账号。这些账号若重新凑满正好 50 人，会再领一次。
	 */
	const PERMANENT_VIP_YEARS = 20

	/**
	 * 脚本伪造注册的账号：平台为 App 请求模型的默认值 WithHim（正版 App 传的是应用名“熊多多”），设备号为随机 32 位小写 hex。
	 * 正版 App 也会产生 32 位 hex 设备号，但平台是“熊多多”，不在此范围。
	 */
	const FAKE_HEX32 = { app_platform: 'WithHim', device_oaid: /^[0-9a-f]{32}$/, is_internal_user: { $ne: true } }

	/** 按 ID_CHUNK_SIZE 分段执行 fn，返回各段结果拼接后的数组。 */
	function inChunks(ids, fn) {
		const result = []
		for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) result.push(...fn(ids.slice(i, i + ID_CHUNK_SIZE)))
		return result
	}

	/** 返回 accountIds 中名下有受邀号（是别人的邀请人）的账号 _id。 */
	function findInviters(users, accountIds) {
		return inChunks(accountIds, chunk => users.aggregate([
			{ $match: { inviter_uid: { $in: chunk } } },
			{ $group: { _id: '$inviter_uid' } }
		], { allowDiskUse: true }).toArray().map(item => item._id))
	}

	/** 命中账号里有付费订单（status=1 且 total_fee>0）时抛错，让任务在写入前中止。 */
	function assertNoPaidUsers(users, filter) {
		const ids = users.find(filter, { _id: 1 }).toArray().map(doc => doc._id)
		const orders = users.getDB().getCollection('user-payment-orders')
		const paidUsers = inChunks(ids, chunk => orders.distinct('user_id', {
			user_id: { $in: chunk.concat(chunk.map(String)) },
			status: 1,
			total_fee: { $gt: 0 }
		}))
		print(`其中有付费订单的账号：${paidUsers.length}`)
		if (paidUsers.length > 0) {
			throw new Error(`命中账号中有 ${paidUsers.length} 个付费用户，任务中止，未做任何写入：${paidUsers.map(String).join(', ')}`)
		}
	}

	/** 输出近 24 小时内新产生的命中数；大于 0 通常说明新版 app-user-auth 还没上线。 */
	function reportRecent(users, filter, now, field, label) {
		const recent = users.countDocuments({ $and: [filter, { [field]: { $gte: now - DAY } }] })
		print(`其中近 24 小时内${label}：${recent}${recent > 0 ? '（大于 0 说明新版 app-user-auth 可能尚未上线）' : ''}`)
	}

	/** 伪造注册账号中有邀请关系的条件：绑了邀请人，或名下有受邀号。 */
	function fakeHex32InviteCondition(users) {
		const fakeIds = users.find(FAKE_HEX32, { _id: 1 }).toArray().map(doc => doc._id)
		return { $or: [{ inviter_uid: { $nin: ['', null] } }, { _id: { $in: findInviters(users, fakeIds) } }] }
	}

	/**
	 * 每个任务：
	 * - filter(users, now)：命中条件，只在开始时计算一次，预览、备份、写入、复核共用；
	 * - backupFields：备份的字段，不填表示备份完整文档；
	 * - update：写入内容；remove 为 true 时改为删除；
	 * - report(users, filter, now)：预览和写入前额外输出的统计，可抛错中止任务。
	 */
	const TASKS = {
		'backfill-permanent-vip': {
			filter: (users, now) => ({
				vip_expire_date: { $gt: now + PERMANENT_VIP_YEARS * 365 * DAY },
				invite_permanent_vip_granted: { $ne: true }
			}),
			backupFields: { _id: 1, invite_permanent_vip_granted: 1, vip_expire_date: 1 },
			update: { $set: { invite_permanent_vip_granted: true } },
			report(users, filter) {
				const alreadyMarked = users.countDocuments({ invite_permanent_vip_granted: true })
				print(`已标记 invite_permanent_vip_granted=true 的账号：${alreadyMarked}`)
				// 当前受邀人数 >= 50、却不在本次标记范围内的邀请人：他们若人数回落后再到 50，仍会领一次 9999 天
				const over50 = users.aggregate([
					{ $match: { inviter_uid: { $nin: ['', null] } } },
					{ $group: { _id: '$inviter_uid', n: { $sum: 1 } } },
					{ $match: { n: { $gte: 50 } } }
				], { allowDiskUse: true }).toArray().map(item => item._id)
				const uncovered = users.countDocuments({
					_id: { $in: over50 },
					vip_expire_date: { $not: filter.vip_expire_date },
					invite_permanent_vip_granted: filter.invite_permanent_vip_granted
				})
				print(`当前受邀人数 >= 50 的邀请人：${over50.length}，其中未达到判定线且未标记的：${uncovered}`)
			}
		},
		'clear-self-invites': {
			filter: () => ({
				inviter_uid: { $nin: ['', null] },
				// 线上自邀的 inviter_uid 都是 ObjectId；转成字符串比较，以防有字符串形式的历史数据
				$expr: { $eq: [{ $toString: '$inviter_uid' }, { $toString: '$_id' }] }
			}),
			backupFields: { _id: 1, inviter_uid: 1, invite_time: 1 },
			update: { $set: { inviter_uid: '', invite_time: 0 } },
			report(users, filter, now) {
				reportRecent(users, filter, now, 'invite_time', '产生的自邀')
			}
		},
		'ban-clone-accounts': {
			filter: () => ({
				app_platform: '熊多多共存版',
				status: { $ne: 3 },
				is_internal_user: { $ne: true }
			}),
			backupFields: { _id: 1, status: 1, app_platform: 1 },
			update: { $set: { status: 3 } },
			report(users, filter, now) {
				reportRecent(users, filter, now, 'register_date', '注册的')
				assertNoPaidUsers(users, filter)
			}
		},
		'ban-fake-hex32': {
			filter: users => ({ $and: [FAKE_HEX32, { status: { $ne: 3 } }, fakeHex32InviteCondition(users)] }),
			backupFields: { _id: 1, status: 1, inviter_uid: 1 },
			update: { $set: { status: 3 } },
			report(users, filter, now) {
				reportRecent(users, filter, now, 'register_date', '注册的')
				assertNoPaidUsers(users, filter)
			}
		},
		'delete-fake-hex32': {
			filter: users => ({
				$and: [
					FAKE_HEX32,
					{ status: { $ne: 3 } },
					{ $nor: [fakeHex32InviteCondition(users)] },
					// 注册超过 1 天后仍有登录或在线记录的账号不删（线上核对时为 0 个）。
					// register_date 缺失时下面的差值为 null，而 null <= 1 天会被判为真，所以要求 register_date 是正数
					{ register_date: { $gt: 0 } },
					{
						$expr: {
							$lte: [
								{ $subtract: [{ $max: [{ $ifNull: ['$login_date', 0] }, { $ifNull: ['$last_online_time', 0] }] }, '$register_date'] },
								DAY
							]
						}
					}
				]
			}),
			remove: true,
			report(users, filter, now) {
				reportRecent(users, filter, now, 'register_date', '注册的')
				assertNoPaidUsers(users, filter)
			}
		}
	}

	/** 解析 .env：忽略空行和 # 注释行，去掉值两端成对的引号；不支持行尾注释和多行值。与 create-indexes.mongosh.js 相同。 */
	function readDotEnv(filePath) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`未找到 ${filePath}，请参照 .env.example 创建并填写连接配置`)
		}
		const result = {}
		const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
		for (const rawLine of text.split(/\r?\n/)) {
			const line = rawLine.trim()
			if (!line || line.startsWith('#')) continue
			const separatorIndex = line.indexOf('=')
			if (separatorIndex <= 0) continue
			let value = line.slice(separatorIndex + 1).trim()
			if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
			result[line.slice(0, separatorIndex).trim()] = value
		}
		return result
	}

	/** 生成连接串：DATABASE_URL 已带凭据时原样返回，否则把编码后的账号密码拼进去。与 create-indexes.mongosh.js 相同。 */
	function buildConnectionUri(url, user, password) {
		const match = /^(mongodb(?:\+srv)?:\/\/)([^/?]*)(.*)$/.exec(url)
		if (!match) throw new Error('DATABASE_URL 必须以 mongodb:// 或 mongodb+srv:// 开头')
		const [, scheme, authority, rest] = match
		if (authority.includes('@') || !user || !password) return url
		return `${scheme}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${authority}${rest}`
	}

	function main() {
		if (typeof __dirname !== 'string') {
			throw new Error('请以文件方式运行：mongosh --nodb --quiet scripts/mongodb/fix-account-data.mongosh.js')
		}
		const taskName = process.env.ACCOUNT_FIX_TASK || ''
		const task = TASKS[taskName]
		if (!task) throw new Error(`ACCOUNT_FIX_TASK 必须是 ${Object.keys(TASKS).join(' 或 ')}`)
		const apply = process.env.ACCOUNT_FIX_APPLY === 'YES'

		const projectRoot = path.resolve(__dirname, '..', '..')
		const dotEnv = readDotEnv(path.join(projectRoot, '.env'))
		const config = name => dotEnv[name] || process.env[name] || ''
		const url = config('DATABASE_URL')
		const password = config('DATABASE_PASSWORD')
		const databaseName = config('DATABASE_NAME') || DEFAULT_DATABASE_NAME
		if (!url) throw new Error('.env 中未配置 DATABASE_URL')
		const uri = buildConnectionUri(url, config('DATABASE_USER'), password)
		const secrets = [uri, url, password, password && encodeURIComponent(password)].filter(Boolean)
		const redact = text => secrets.reduce((result, secret) => result.split(secret).join('***'), String(text))

		print(`目标数据库：${databaseName}`)
		print(`任务：${taskName}`)
		print(`运行模式：${apply ? '正式写入' : '预览（只读）'}`)

		let users
		try {
			users = new Mongo(uri).getDB(databaseName).getCollection('user-accounts')
			users.estimatedDocumentCount()
		} catch (error) {
			throw new Error(`连接失败：${redact(error.message)}`)
		}

		const now = Date.now()
		const filter = task.filter(users, now)
		const total = users.countDocuments(filter)
		print(`命中账号：${total}`)
		task.report(users, filter, now)

		if (!apply) {
			print('\n预览完成，未做任何写入。确认后设置 ACCOUNT_FIX_APPLY=YES 再运行一次。')
			return
		}
		if (total === 0) {
			print('\n没有需要处理的账号，未做任何写入。')
			return
		}

		// 先固定本次要处理的账号，再逐批：读出原值 → 追加写入备份文件 → 只对已备份的账号写入
		const ids = users.find(filter, { _id: 1 }).toArray().map(doc => doc._id)
		const backupDir = path.join(__dirname, 'backups')
		fs.mkdirSync(backupDir, { recursive: true })
		const backupFile = path.join(backupDir, `${taskName}-${new Date(now).toISOString().replace(/[:.]/g, '-')}.jsonl`)
		print(`备份文件：${path.relative(projectRoot, backupFile)}`)
		let backedUp = 0
		let written = 0
		for (let i = 0; i < ids.length; i += BATCH_SIZE) {
			const docs = users.find({ $and: [filter, { _id: { $in: ids.slice(i, i + BATCH_SIZE) } }] }, task.backupFields).toArray()
			if (docs.length === 0) continue
			fs.appendFileSync(backupFile, docs.map(doc => EJSON.stringify(doc, undefined, 0, { relaxed: true })).join('\n') + '\n')
			backedUp += docs.length
			const batchFilter = { $and: [filter, { _id: { $in: docs.map(doc => doc._id) } }] }
			written += task.remove ? users.deleteMany(batchFilter).deletedCount : users.updateMany(batchFilter, task.update).modifiedCount
			if ((i / BATCH_SIZE + 1) % 50 === 0) print(`进度：已处理 ${Math.min(i + BATCH_SIZE, ids.length)} / ${ids.length}`)
		}

		// 复核
		const remaining = users.countDocuments(filter)
		print(`已${task.remove ? '删除' : '更新'}：${written} / 备份 ${backedUp}，剩余命中：${remaining}`)
		if (written !== backedUp) {
			throw new Error(`写入条数 ${written} 与备份条数 ${backedUp} 不一致，请按备份核对后再处理`)
		}
		if (remaining > 0) {
			throw new Error(`执行后仍有 ${remaining} 个账号命中，可能是执行期间新产生的数据，请确认新版云函数已上线后重新运行`)
		}
		print('\n全部完成。')
	}

	main()
})()

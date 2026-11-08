/**
 * 账号数据修复脚本（mongosh），配合 app-user-auth 的邀请、注册修复使用。
 *
 * 三个任务，执行时机不同：
 *   backfill-permanent-vip  给已经是永久 VIP 的账号标记 invite_permanent_vip_granted = true。
 *                           新版 bind-invitation 只给未标记的账号发“邀请满 50 人”的 9999 天。
 *                           必须在上传新版 app-user-auth 之前执行：否则已领过 9999 天的账号人数回落后再到 50，会被再发一次。
 *   clear-self-invites      把 inviter_uid 等于自身 _id 的自邀账号改为 inviter_uid = ''、invite_time = 0，
 *                           与后台“取消邀请人”页面清空关系的写法一致。已发放的 VIP 不回收。
 *                           应在新版 app-user-auth 上线之后执行，否则执行完还会继续产生新的自邀。
 *   ban-clone-accounts      封禁注册平台为“熊多多共存版”的账号（status 改为 3，登录接口会拒绝）。共存版是他人用分身工具重新打包的
 *                           App，不是官方版本，被用来批量注册小号刷邀请。不封内部用户；命中账号里有付费用户时整个任务中止，交给人工处理。
 *                           应在新版 app-user-auth（拒绝共存版新注册）上线之后执行。
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
 * - 先把命中账号的原值导出到 scripts/mongodb/backups/<任务>-<时间>.json（Extended JSON，保留 ObjectId），导出失败则不写入。
 *   backups/ 已加入 .gitignore，备份含用户 _id，不要提交。
 * - 按备份里的 _id 每 1000 个一批更新，更新条件同时带上筛选条件，执行期间状态已变化的账号不会被误改。
 * - 写入后重新统计剩余命中数，并核对更新条数是否等于备份条数；不一致时以非 0 退出。
 * - 回滚：backfill 按备份 _id 对 invite_permanent_vip_granted 执行 $unset；clear 按备份逐条写回原 inviter_uid、invite_time；
 *   ban 按备份逐条写回原 status。
 */

(() => {
	'use strict'

	const fs = require('fs')
	const path = require('path')

	const DEFAULT_DATABASE_NAME = 'tddlegacy'
	const BATCH_SIZE = 1000
	const DAY = 24 * 60 * 60 * 1000

	/**
	 * “已是永久 VIP”的判定线：VIP 到期时间晚于当前时间 20 年。
	 * 邀请满 50 人的 9999 天最早在 2024 年发放，领取者到期时间都在 2051 年以后，全部高于这条线。
	 * 通过其他途径已有 20 年以上 VIP 的账号也会被标记，结果只是今后不会再从邀请拿到 9999 天，没有实际损失。
	 * 无法覆盖的情况：领过 9999 天后被后台“取消邀请人”收回了 VIP 的账号。这些账号若重新凑满正好 50 人，会再领一次。
	 */
	const PERMANENT_VIP_YEARS = 20

	/**
	 * 每个任务：
	 * - filter(now)：命中条件，预览、备份、更新、复核共用同一个条件；
	 * - backupFields：备份的字段；
	 * - update：写入内容；
	 * - report(users, filter, now)：预览和写入前额外输出的统计。
	 */
	const TASKS = {
		'backfill-permanent-vip': {
			filter: now => ({
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
				const recent = users.countDocuments({ ...filter, invite_time: { $gte: now - DAY } })
				print(`其中近 24 小时内产生的自邀：${recent}${recent > 0 ? '（大于 0 说明新版 app-user-auth 可能尚未上线）' : ''}`)
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
				const recent = users.countDocuments({ ...filter, register_date: { $gte: now - DAY } })
				print(`其中近 24 小时内注册的：${recent}${recent > 0 ? '（大于 0 说明新版 app-user-auth 可能尚未上线）' : ''}`)
				// 付费用户不自动封禁：命中账号里只要有付费订单（status=1 且 total_fee>0）就中止，交给人工核对
				const ids = users.find(filter, { _id: 1 }).toArray().map(doc => doc._id)
				const paidUsers = users.getDB().getCollection('user-payment-orders').distinct('user_id', {
					user_id: { $in: ids.concat(ids.map(String)) },
					status: 1,
					total_fee: { $gt: 0 }
				})
				print(`其中有付费订单的账号：${paidUsers.length}`)
				if (paidUsers.length > 0) {
					throw new Error(`命中账号中有 ${paidUsers.length} 个付费用户，任务中止，未做任何写入：${paidUsers.map(String).join(', ')}`)
				}
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
		const filter = task.filter(now)
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

		// 1. 备份：导出命中账号的原值，写文件失败直接抛错，不进入更新
		const backup = users.find(filter, task.backupFields).toArray()
		const backupDir = path.join(__dirname, 'backups')
		fs.mkdirSync(backupDir, { recursive: true })
		const backupFile = path.join(backupDir, `${taskName}-${new Date(now).toISOString().replace(/[:.]/g, '-')}.json`)
		fs.writeFileSync(backupFile, EJSON.stringify(backup, undefined, 0, { relaxed: true }))
		print(`已备份 ${backup.length} 个账号的原值：${path.relative(projectRoot, backupFile)}`)

		// 2. 按备份的 _id 分批更新，条件里同时带上筛选条件
		let modified = 0
		for (let i = 0; i < backup.length; i += BATCH_SIZE) {
			const ids = backup.slice(i, i + BATCH_SIZE).map(doc => doc._id)
			const result = users.updateMany({ ...filter, _id: { $in: ids } }, task.update)
			modified += result.modifiedCount
		}

		// 3. 复核
		const remaining = users.countDocuments(filter)
		print(`已更新：${modified} / 备份 ${backup.length}，剩余命中：${remaining}`)
		if (modified !== backup.length) {
			throw new Error(`更新条数 ${modified} 与备份条数 ${backup.length} 不一致，请按备份核对后再处理`)
		}
		if (remaining > 0) {
			throw new Error(`执行后仍有 ${remaining} 个账号命中，可能是执行期间新产生的数据，请确认新版云函数已上线后重新运行`)
		}
		print('\n全部完成。')
	}

	main()
})()

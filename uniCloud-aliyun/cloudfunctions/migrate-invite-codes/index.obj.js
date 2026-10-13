'use strict';
// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
//
// 用途：把旧表 user-all-Invitation-codes 单文档 codes 数组里的邀请码逐条写入 user-invite-codes（每个码一条记录）。
// 只新增记录：不修改、不删除旧表；新表已有的码会跳过，所以可以重复运行。
// 不扫描 user-accounts 补齐：清理僵尸用户后用户表约 46.5 万条，与旧数组的码数一致；
// 注册时 reserveInviteCode 还会按 user-accounts.my_invite_code 查重，旧数组即使漏掉个别在用码也不会被重新分配。
//
// 安全设计：默认只做 dry-run（只读统计）；只有显式传 { dryRun: false, confirm: "YES_MIGRATE" } 才会写入。
//
// 调用示例：
//   1) 预览：run({ dryRun: true })
//   2) 迁移：run({ dryRun: false, confirm: "YES_MIGRATE" })
//   3) 超出单次时间预算后续跑：run({ dryRun: false, confirm: "YES_MIGRATE", resume: <上次返回的 resume> })

const db = uniCloud.database()
const dbCmd = db.command

const LEGACY_COLLECTION = 'user-all-Invitation-codes'
const TARGET_COLLECTION = 'user-invite-codes'
const USER_COLLECTION = 'user-accounts'
// 写入新表的 source 值，与 user-invite-codes.schema.json 的枚举一致
const LEGACY_SOURCE = 'legacy_array'

const legacyCollection = db.collection(LEGACY_COLLECTION)
const targetCollection = db.collection(TARGET_COLLECTION)
const userCollection = db.collection(USER_COLLECTION)

// 每批处理的邀请码数，同时决定 in 查询与批量 add 的数组长度。
// 不得超过 1000：uniCloud 单次查询最多返回 1000 条，查重结果会被截断而重复写入
const BATCH_SIZE = 1000
// 单次运行默认时间预算；package.json 超时为 600 秒，留出收尾与返回结果的余量
const DEFAULT_TIME_BUDGET_MS = 500 * 1000
const MAX_TIME_BUDGET_MS = 550 * 1000
// 批次之间的默认等待时间。
// 阿里云服务空间每分钟新增慢查询日志超过 200 条，或扫描文档超过 2000 万行，就会触发 Throttling.Api 限流。
// 每批 2 次已命中索引的请求，等待 300 毫秒后约每分钟 120 批；
// 即使每批都产生一条慢日志（批量写入最可能偏慢），也低于 200 条的阈值
const DEFAULT_INTERVAL_MS = 300
const MAX_INTERVAL_MS = 60 * 1000
// 历史生成规则是 6 位数字或大写字母。不符合的码同样迁移（可能已被用户使用），只在结果里提示
const STANDARD_CODE_PATTERN = /^[0-9A-Z]{6}$/
const SAMPLE_LIMIT = 5
const CONFIRM_TOKEN = 'YES_MIGRATE'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 返回批次节流函数：每次运行的第一批立即执行，之后每批开始前先等待 intervalMs。 */
function createThrottle(intervalMs) {
	let first = true
	return async () => {
		if (first) {
			first = false
			return
		}
		if (intervalMs > 0) await sleep(intervalMs)
	}
}

/**
 * 读取旧表全部文档的 codes 并去重（正常只有 1 个文档，这里兼容多个）。
 * 只接受非空字符串并去掉两端空白，其余值计入 invalid。
 * @returns {Promise<object>} codes 为去重后的数组，保持首次出现的顺序；summary 为统计信息
 */
async function loadLegacyCodes() {
	const res = await legacyCollection.field({ codes: true }).limit(1000).get()
	const docs = res.data || []
	const unique = new Set()
	let rawTotal = 0
	let invalid = 0
	let docsWithoutArray = 0
	let nonStandard = 0
	const nonStandardSamples = []

	for (const doc of docs) {
		if (!Array.isArray(doc.codes)) {
			docsWithoutArray++
			continue
		}
		rawTotal += doc.codes.length
		for (const value of doc.codes) {
			const code = typeof value === 'string' ? value.trim() : ''
			if (!code) {
				invalid++
				continue
			}
			if (!unique.has(code) && !STANDARD_CODE_PATTERN.test(code)) {
				nonStandard++
				if (nonStandardSamples.length < SAMPLE_LIMIT) nonStandardSamples.push(code)
			}
			unique.add(code)
		}
	}

	return {
		codes: Array.from(unique),
		summary: {
			collection: LEGACY_COLLECTION,
			docCount: docs.length,
			docsWithoutArray,
			rawTotal,
			unique: unique.size,
			duplicates: rawTotal - invalid - unique.size,
			invalid,
			nonStandard,
			nonStandardSamples
		}
	}
}

/**
 * 写入本批中新表还没有的邀请码，返回 { inserted, existed }。
 * 写入失败（例如与并发注册抢占同一个码触发唯一索引冲突）直接抛出，由调用方中止并返回续跑位置；
 * 重跑时会重新查询已存在的码，因此不会重复写入。
 */
async function insertMissingCodes(codes, createDate) {
	// limit 取 uniCloud 上限 1000（≥ BATCH_SIZE）；依赖 code 唯一索引保证每个码最多一条，查重结果才不会被截断
	const existingRes = await targetCollection
		.where({ code: dbCmd.in(codes) })
		.field({ code: true })
		.limit(1000)
		.get()
	const existing = new Set((existingRes.data || []).map((item) => item.code))
	const missing = codes.filter((code) => !existing.has(code))
	if (missing.length > 0) {
		await targetCollection.add(missing.map((code) => ({ code, source: LEGACY_SOURCE, create_date: createDate })))
	}
	return { inserted: missing.length, existed: codes.length - missing.length }
}

/** 校验续跑位置；不传时从头开始。返回 { legacyOffset } 或 { error }。 */
function parseResume(resume, legacyCodeCount) {
	if (resume === null || resume === undefined) return { legacyOffset: 0 }
	const legacyOffset = resume.legacyOffset
	if (Number.isInteger(legacyOffset) && legacyOffset >= 0 && legacyOffset <= legacyCodeCount) {
		return { legacyOffset }
	}
	return { error: `resume 参数无效：${JSON.stringify(resume)}，请原样传入上次返回的 resume，或不传以从头开始` }
}

/** 只读预览：统计旧数组与新表；用户表只做一次计数，供与旧数组码数对照。 */
async function previewMigration(legacy) {
	const [targetCount, userCount] = await Promise.all([targetCollection.count(), userCollection.count()])
	return {
		mode: 'dryRun',
		legacy: legacy.summary,
		target: { collection: TARGET_COLLECTION, total: targetCount.total },
		users: { collection: USER_COLLECTION, total: userCount.total },
		batchSize: BATCH_SIZE,
		hint: '确认无误后调用 run({ dryRun: false, confirm: "YES_MIGRATE" }) 执行迁移；新表已有的码会被跳过。'
	}
}

/** 执行迁移：分批写入旧数组的码；超出时间预算或出错时返回 resume 供续跑。 */
async function migrate(legacy, startOffset, isOverBudget, throttle) {
	const createDate = Date.now()
	const codes = legacy.codes
	const progress = { inserted: 0, existed: 0 }
	const result = (extra) => ({
		mode: 'migrate',
		legacy: legacy.summary,
		progress,
		batchSize: BATCH_SIZE,
		...extra
	})

	let legacyOffset = startOffset
	try {
		while (legacyOffset < codes.length) {
			await throttle()
			if (isOverBudget()) {
				return result({ done: false, resume: { legacyOffset } })
			}
			const batchResult = await insertMissingCodes(codes.slice(legacyOffset, legacyOffset + BATCH_SIZE), createDate)
			progress.inserted += batchResult.inserted
			progress.existed += batchResult.existed
			legacyOffset += BATCH_SIZE
		}
	} catch (err) {
		return result({
			done: false,
			resume: { legacyOffset },
			errCode: 'MIGRATE_ABORTED',
			errMsg: (err && err.message) ? err.message : String(err),
			hint: '查明原因后原样传入 resume 续跑，不会重复写入。' +
				'若错误含 Throttling（阿里云限流），先等待 1 分钟以上再续跑，必要时调大 intervalMs，并确认 code 唯一索引已上传'
		})
	}

	const targetTotal = (await targetCollection.count()).total
	const output = result({
		done: true,
		target: { collection: TARGET_COLLECTION, total: targetTotal }
	})
	// 新表至少应包含旧数组去重后的全部码；不满足说明写入或唯一索引存在异常，需要人工核查
	if (targetTotal < legacy.summary.unique) {
		output.errCode = 'VERIFY_FAILED'
		output.errMsg = `新表记录数 ${targetTotal} 少于旧数组去重后的 ${legacy.summary.unique} 个邀请码`
	}
	return output
}

module.exports = {
	_before: function() {
		// 通用预处理器；如需鉴权可在此处加 uniID 校验。
	},

	/**
	 * 执行邀请码迁移。默认 dry-run；必须显式传 { dryRun:false, confirm:"YES_MIGRATE" } 才会写入。
	 * @param {object} options
	 * @param {boolean} [options.dryRun=true] 是否只统计不写入
	 * @param {string}  [options.confirm] 写入时必须传 "YES_MIGRATE"
	 * @param {object}  [options.resume] 上次运行返回的 resume（{ legacyOffset }），用于从断点继续；不传则从头开始（已迁移的码会被跳过）
	 * @param {number}  [options.timeBudgetMs=500000] 单次运行时间预算（毫秒，最大 550000），用尽后返回 resume
	 * @param {number}  [options.intervalMs=300] 批次之间的等待毫秒数（0～60000），用于避免触发阿里云数据库限流；0 表示不等待
	 * @returns {Promise<object>} 统计或迁移结果；出错时带 errCode / errMsg
	 */
	async run({
		dryRun = true,
		confirm = '',
		resume = null,
		timeBudgetMs = DEFAULT_TIME_BUDGET_MS,
		intervalMs = DEFAULT_INTERVAL_MS
	} = {}) {
		// 传了 dryRun=false 或任何 confirm 值都视为写入意图；口令不完全一致时拒绝，避免手误后静默退回 dry-run
		const intentToWrite = dryRun === false || confirm !== ''
		if (intentToWrite && confirm !== CONFIRM_TOKEN) {
			return {
				errCode: 'CONFIRM_REQUIRED',
				errMsg: `检测到写入意图（dryRun=false 或 confirm 传值），但 confirm 不是 "${CONFIRM_TOKEN}"。` +
					'当前 confirm 值: ' + JSON.stringify(confirm)
			}
		}
		// 上限：时间预算要给 600 秒的函数超时留出收尾余量，否则可能在返回 resume 前被平台强制结束；
		// 间隔超过 60 秒没有意义，过大的值还会被 setTimeout 当作 1 毫秒处理
		if (!(Number.isFinite(timeBudgetMs) && timeBudgetMs > 0 && timeBudgetMs <= MAX_TIME_BUDGET_MS)) {
			return { errCode: 'INVALID_PARAM', errMsg: `timeBudgetMs 必须是 (0, ${MAX_TIME_BUDGET_MS}] 范围内的毫秒数` }
		}
		if (!(Number.isFinite(intervalMs) && intervalMs >= 0 && intervalMs <= MAX_INTERVAL_MS)) {
			return { errCode: 'INVALID_PARAM', errMsg: `intervalMs 必须是 [0, ${MAX_INTERVAL_MS}] 范围内的毫秒数` }
		}

		const startedAt = Date.now()
		const isOverBudget = () => Date.now() - startedAt >= timeBudgetMs

		try {
			const legacy = await loadLegacyCodes()
			if (!intentToWrite) {
				return await previewMigration(legacy)
			}
			const parsed = parseResume(resume, legacy.codes.length)
			if (parsed.error) {
				return { errCode: 'INVALID_RESUME', errMsg: parsed.error }
			}
			const output = await migrate(legacy, parsed.legacyOffset, isOverBudget, createThrottle(intervalMs))
			output.intervalMs = intervalMs
			output.elapsedMs = Date.now() - startedAt
			return output
		} catch (err) {
			return {
				errCode: 'RUN_FAILED',
				errMsg: (err && err.message) ? err.message : String(err),
				hint: `若提示集合不存在，请先在 HBuilderX 上传 ${TARGET_COLLECTION} 的 schema 与 index.json`
			}
		}
	}
}

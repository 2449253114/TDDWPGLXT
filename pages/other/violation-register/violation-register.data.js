/**
 * 违规注册检测的数据访问：按注册时间范围游标扫描、按 id 批量读取、带条件的状态变更。
 * 所有函数都通过参数接收 { collection, dbCmd }，页面传入 clientDB 的 user-accounts 集合，测试传入假实现。
 */
const { chunkArray } = require('../violation-invitation-v2/violation-invitation-v2.utils.js')
const { getStatusText, toIdString } = require('./violation-register.utils.js')

/** 单页读取条数，clientDB 单次查询上限为 1000。 */
const SCAN_PAGE_SIZE = 1000
/** 按 _id 批量读取或写入时每批的 id 数量。 */
const ID_BATCH_SIZE = 100
/** 扫描单页读取的最大尝试次数（含首次）。 */
const READ_MAX_ATTEMPTS = 3

/**
 * 扫描阶段只读分组和统计必需的字段。
 * 30 天范围可达数十万账号，昵称、登录信息等详情改为展开分组时按页读取。
 */
const SCAN_FIELDS = {
	_id: true,
	register_ip: true,
	register_date: true,
	inviter_uid: true,
	status: true
}

/** 展开分组后，账号行和邀请人行展示所需的字段。 */
const DETAIL_FIELDS = {
	_id: true,
	nickname: true,
	my_invite_code: true,
	inviter_uid: true,
	invite_time: true,
	status: true,
	register_date: true,
	register_ip: true,
	login_date: true,
	login_ip: true
}

/** 封禁（0 → 3）与解封（3 → 0）的状态迁移。只处理正常账号，解封才能准确恢复原状态。 */
const STATUS_ACTIONS = {
	ban: { from: 0, to: 3, label: '封禁' },
	unban: { from: 3, to: 0, label: '解封' }
}

function createCancelledError() {
	const error = new Error('检测已取消')
	error.cancelled = true
	return error
}

/** 读取 clientDB 查询结果的数组；结构异常时抛错，不当作空数据处理。 */
function readResultData(response, label) {
	const data = response && response.result && response.result.data
	if (!Array.isArray(data)) throw new Error(`${label}返回结果无效`)
	return data
}

function getErrorMessage(error) {
	return (error && (error.message || error.errMsg)) || String(error || '未知错误')
}

/** id 去重并统一为字符串，丢弃 null、undefined 和空串。 */
function uniqueIdList(ids) {
	return Array.from(new Set((Array.isArray(ids) ? ids : []).map(toIdString).filter(Boolean)))
}

/** 注册时间范围条件：两端都包含，与 resolveBusinessDateRange 返回的 startMs / endMs 对应。 */
function registerDateCondition(dbCmd, range) {
	const startMs = Number(range && range.startMs)
	const endMs = Number(range && range.endMs)
	if (!Number.isSafeInteger(startMs) || !Number.isSafeInteger(endMs) || startMs > endMs) {
		throw new TypeError('注册时间范围无效')
	}
	return dbCmd.and([dbCmd.gte(startMs), dbCmd.lte(endMs)])
}

/**
 * 读取失败时重试。取消后不再重试，直接抛出取消错误。
 * @param {Function} task - 返回 Promise 的读取函数
 * @param {{isCancelled?: Function, retryDelayMs?: number, onRetry?: Function}} options
 */
async function readWithRetry(task, options = {}) {
	const isCancelled = options.isCancelled || (() => false)
	const retryDelayMs = options.retryDelayMs === undefined ? 800 : options.retryDelayMs
	for (let attempt = 1; ; attempt++) {
		if (isCancelled()) throw createCancelledError()
		try {
			return await task()
		} catch (error) {
			if (error && error.cancelled) throw error
			if (attempt >= READ_MAX_ATTEMPTS) {
				throw new Error(`连续 ${READ_MAX_ATTEMPTS} 次读取失败：${getErrorMessage(error)}`)
			}
			if (options.onRetry) options.onRetry(attempt + 1, error)
			if (retryDelayMs > 0) await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt))
		}
	}
}

/** 统计范围内注册的账号数，用于显示扫描进度。 */
async function countRegisteredAccounts({ collection, dbCmd }, range, options = {}) {
	const condition = registerDateCondition(dbCmd, range)
	return readWithRetry(async () => {
		const response = await collection.where({ register_date: condition }).count()
		const total = response && response.result && response.result.total
		if (!Number.isSafeInteger(total) || total < 0) throw new Error('账号总数返回结果无效')
		return total
	}, options)
}

/**
 * 按 _id 游标分页读取范围内注册的全部账号（只读 SCAN_FIELDS）。
 * 用 _id 游标而不是 skip：扫描期间有账号被删除时不会漏读或重复读，深分页也不会越来越慢。
 * @param {{collection, dbCmd}} context
 * @param {{startMs: number, endMs: number}} range
 * @param {{isCancelled?: Function, onPage?: Function, onRetry?: Function, retryDelayMs?: number}} options
 *   onPage(loadedCount) 每读完一页回调一次
 * @returns {Promise<Array>} 账号数组；取消时抛出 error.cancelled === true 的错误
 */
async function scanRegisteredAccounts({ collection, dbCmd }, range, options = {}) {
	const condition = registerDateCondition(dbCmd, range)
	const accounts = []
	let lastId = ''
	for (;;) {
		const where = { register_date: condition }
		if (lastId) where._id = dbCmd.gt(lastId)
		const data = await readWithRetry(async () => readResultData(
			await collection.where(where).field(SCAN_FIELDS).orderBy('_id', 'asc').limit(SCAN_PAGE_SIZE).get(),
			'注册账号'
		), options)
		if (options.isCancelled && options.isCancelled()) throw createCancelledError()
		if (!data.length) break

		const nextLastId = String(data[data.length - 1]._id || '')
		// 游标必须前进，否则说明 _id 条件没有生效，继续读会死循环或重复计数。
		if (!nextLastId || (lastId && nextLastId <= lastId)) {
			throw new Error('分页游标没有前进，已中止扫描以免重复读取')
		}
		for (let index = 0; index < data.length; index++) accounts.push(data[index])
		if (options.onPage) options.onPage(accounts.length)
		// 读到空页才结束，不用“本页不足 SCAN_PAGE_SIZE”判断，避免服务端单次上限更小时静默漏读。
		lastId = nextLastId
	}
	return accounts
}

/**
 * 按 id 批量读取账号。
 * @returns {Promise<Map<string, Object>>} 以字符串 _id 为键；不存在的账号不在结果里
 */
async function readAccountsByIds({ collection, dbCmd }, ids, fields) {
	const uniqueIds = uniqueIdList(ids)
	const result = new Map()
	for (const chunk of chunkArray(uniqueIds, ID_BATCH_SIZE)) {
		const data = readResultData(
			await collection.where({ _id: dbCmd.in(chunk) }).field(fields).limit(chunk.length).get(),
			'账号详情'
		)
		data.forEach(row => {
			if (row && row._id !== undefined && row._id !== null) result.set(String(row._id), row)
		})
	}
	return result
}

/**
 * 批量封禁或解封。每批先带原状态条件写入（status: from），再回读最终状态逐个归类。
 * 带条件写入保证只改动仍处于原状态的账号，不会覆盖“禁止购买会员”等其它状态。
 * @param {'ban'|'unban'} action
 * @param {{onChunk?: Function}} options - onChunk(processedCount, totalCount) 每批完成后回调
 * @returns {Promise<{success: Array, skipped: Array, failed: Array, uncertain: Array}>}
 *   每项为 { id, reason, status }，status 为回读到的最新状态（账号不存在时为 null，无法确认时为 undefined）：
 *   - success：回读状态已是目标状态；
 *   - skipped：账号不存在，或处于其它状态未被处理；
 *   - failed：写入报错且回读仍是原状态；
 *   - uncertain：写入后回读失败，无法确认结果，调用方不得当作成功或失败处理。
 */
async function changeAccountStatus({ collection, dbCmd }, ids, action, options = {}) {
	const config = STATUS_ACTIONS[action]
	if (!config) throw new TypeError(`未知的状态操作：${action}`)
	const uniqueIds = uniqueIdList(ids)
	const outcome = { success: [], skipped: [], failed: [], uncertain: [] }
	let processedCount = 0

	for (const chunk of chunkArray(uniqueIds, ID_BATCH_SIZE)) {
		let writeError = null
		try {
			await collection.where({ _id: dbCmd.in(chunk), status: config.from }).update({ status: config.to })
		} catch (error) {
			writeError = error
		}

		let latest
		try {
			latest = await readAccountsByIds({ collection, dbCmd }, chunk, { _id: true, status: true })
		} catch (error) {
			const reason = writeError
				? `写入报错（${getErrorMessage(writeError)}），回读也失败（${getErrorMessage(error)}）`
				: `写入后回读失败：${getErrorMessage(error)}`
			chunk.forEach(id => outcome.uncertain.push({ id, reason, status: undefined }))
			processedCount += chunk.length
			if (options.onChunk) options.onChunk(processedCount, uniqueIds.length)
			continue
		}

		chunk.forEach(id => {
			const row = latest.get(id)
			if (!row) {
				outcome.skipped.push({ id, reason: '账号不存在或已删除', status: null })
				return
			}
			const status = Number(row.status)
			if (status === config.to) {
				outcome.success.push({ id, reason: `已${config.label}`, status })
			} else if (status === config.from) {
				outcome.failed.push({
					id,
					reason: writeError ? `写入失败：${getErrorMessage(writeError)}` : '写入后状态未变化',
					status
				})
			} else {
				outcome.skipped.push({ id, reason: `账号当前为“${getStatusText(status)}”，未处理`, status })
			}
		})
		processedCount += chunk.length
		if (options.onChunk) options.onChunk(processedCount, uniqueIds.length)
	}
	return outcome
}

module.exports = {
	READ_MAX_ATTEMPTS,
	SCAN_FIELDS,
	DETAIL_FIELDS,
	STATUS_ACTIONS,
	getErrorMessage,
	countRegisteredAccounts,
	scanRegisteredAccounts,
	readAccountsByIds,
	changeAccountStatus
}

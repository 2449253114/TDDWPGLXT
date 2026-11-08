/**
 * 僵尸号清理的数据访问：候选账号扫描、付费用户与邀请关系核对、带保护条件的封禁与删除。
 * 所有函数通过参数接收 { collection, dbCmd }，页面传入 clientDB 集合，测试传入假实现。
 */
const {
	getErrorMessage,
	readResultData,
	readWithRetry,
	scanByIdCursor
} = require('../violation-register/violation-register.data.js')
const { getStatusText, toIdString } = require('../violation-register/violation-register.utils.js')
const { chunkArray } = require('../violation-invitation-v2/violation-invitation-v2.utils.js')

/** 封禁、删除和邀请关系核对每批处理的账号数。 */
const ACTION_BATCH_SIZE = 500
/** 邀请关系核对单次读取上限；读满说明可能有遗漏，需要拆小再查。 */
const INVITER_CHECK_LIMIT = 1000

/** 扫描阶段读取的字段：判定、分类、受保护判定和写入保护条件都只依赖这些字段。 */
const CANDIDATE_FIELDS = {
	_id: true,
	register_date: true,
	login_date: true,
	last_online_time: true,
	status: true,
	vip_expire_date: true,
	is_internal_user: true,
	inviter_uid: true
}

/** 写入后回读的字段：用于判断是否成功以及跳过原因。 */
const VERIFY_FIELDS = {
	_id: true,
	status: true,
	description: true,
	login_date: true,
	last_online_time: true
}

function registerRangeCondition(dbCmd, criteria) {
	return dbCmd.and([dbCmd.gte(criteria.startMs), dbCmd.lt(criteria.endExclusiveMs)])
}

/**
 * 候选账号的两个预筛条件。命中账号的最后活跃时间不晚于 activeBoundMs，所以：
 * - 有 last_online_time 的账号：login_date 与 last_online_time 都不晚于上界；
 * - 没有 last_online_time 的账号：login_date 不晚于上界。
 * 拆成两次查询是为了避免 or 条件。login_date 缺失或为 null、last_online_time 为 null 的账号
 * 不满足任一条件，不在候选内；2026-11-09 核对线上全表，这几类均为 0 个。
 */
function candidateConditions(dbCmd, criteria) {
	const registerDate = registerRangeCondition(dbCmd, criteria)
	const bound = criteria.activeBoundMs
	return [
		{ register_date: registerDate, login_date: dbCmd.lte(bound), last_online_time: dbCmd.lte(bound) },
		{ register_date: registerDate, login_date: dbCmd.lte(bound), last_online_time: dbCmd.exists(false) }
	]
}

/** 统计候选账号数，用于显示扫描进度。 */
async function countZombieCandidates({ collection, dbCmd }, criteria, options = {}) {
	let total = 0
	for (const where of candidateConditions(dbCmd, criteria)) {
		total += await readWithRetry(async () => {
			const response = await collection.where(where).count()
			const value = response && response.result && response.result.total
			if (!Number.isSafeInteger(value) || value < 0) throw new Error('候选账号总数返回结果无效')
			return value
		}, options)
	}
	return total
}

/**
 * 读取全部候选账号（只读 CANDIDATE_FIELDS）。精确判定由 classifyZombies 在内存中完成。
 * @param {{isCancelled?, onPage?, onRetry?, retryDelayMs?}} options - onPage(本次累计读取数)
 */
async function scanZombieCandidates(context, criteria, options = {}) {
	const results = []
	for (const where of candidateConditions(context.dbCmd, criteria)) {
		const loadedBefore = results.length
		const rows = await scanByIdCursor(context, where, CANDIDATE_FIELDS, {
			...options,
			label: '候选账号',
			onPage: loaded => options.onPage && options.onPage(loadedBefore + loaded)
		})
		for (let index = 0; index < rows.length; index++) results.push(rows[index])
	}
	return results
}

/**
 * 读取有真实付费的用户：金额大于 0 且已支付或已退款的订单。订单表很小（2026-11-09 约 1 万条）。
 * @returns {Promise<Set<string>>}
 */
async function loadPaidUserIds(ordersContext, options = {}) {
	const { dbCmd } = ordersContext
	const rows = await scanByIdCursor(
		ordersContext,
		{ total_fee: dbCmd.gt(0), status: dbCmd.in([1, 2]) },
		{ _id: true, user_id: true },
		{ ...options, label: '付费订单' }
	)
	return new Set(rows.map(row => toIdString(row.user_id)).filter(Boolean))
}

/**
 * 找出哪些账号是别人的邀请人。单次读取读满上限时把这一批拆成两半再查，
 * 拆到只剩一个 id 仍读满，说明它确实是邀请人。
 * @returns {Promise<Set<string>>} 输入 id 中本身是邀请人的那些
 */
async function findInviterIds({ collection, dbCmd }, ids, options = {}) {
	const uniqueIds = Array.from(new Set((Array.isArray(ids) ? ids : []).map(toIdString).filter(Boolean)))
	const inputIds = new Set(uniqueIds)
	const result = new Set()
	let checked = 0

	async function check(chunk) {
		const data = await readWithRetry(async () => readResultData(
			await collection.where({ inviter_uid: dbCmd.in(chunk) }).field({ _id: true, inviter_uid: true }).limit(INVITER_CHECK_LIMIT).get(),
			'邀请关系'
		), options)
		if (data.length < INVITER_CHECK_LIMIT) {
			data.forEach(row => {
				const inviterId = toIdString(row.inviter_uid)
				// inviter_uid 等于自身 _id 的异常数据不算“是别人的邀请人”
				if (inputIds.has(inviterId) && inviterId !== toIdString(row._id)) result.add(inviterId)
			})
			return
		}
		if (chunk.length === 1) {
			result.add(chunk[0])
			return
		}
		const middle = Math.ceil(chunk.length / 2)
		await check(chunk.slice(0, middle))
		await check(chunk.slice(middle))
	}

	for (const chunk of chunkArray(uniqueIds, ACTION_BATCH_SIZE)) {
		await check(chunk)
		checked += chunk.length
		if (options.onProgress) options.onProgress(checked, uniqueIds.length)
	}
	return result
}

/**
 * 写入保护条件：账号自扫描开始后没有任何登录或在线记录。
 * 按扫描时是否有 last_online_time 字段把 id 分成两组，分别使用 lte 与 exists(false)，避免 or 条件。
 * @returns {Array<Object>} 每组一个 where（空组不返回）
 */
function activityGuardedWheres(dbCmd, hits, base, scanStartedAt) {
	const withOnline = hits.filter(hit => hit.hasOnlineField).map(hit => hit.id)
	const withoutOnline = hits.filter(hit => !hit.hasOnlineField).map(hit => hit.id)
	const wheres = []
	if (withOnline.length) {
		wheres.push({ ...base, _id: dbCmd.in(withOnline), login_date: dbCmd.lte(scanStartedAt), last_online_time: dbCmd.lte(scanStartedAt) })
	}
	if (withoutOnline.length) {
		wheres.push({ ...base, _id: dbCmd.in(withoutOnline), login_date: dbCmd.lte(scanStartedAt), last_online_time: dbCmd.exists(false) })
	}
	return wheres
}

/** 回读结果中账号自扫描开始后是否有活动。 */
function activeSinceScan(row, scanStartedAt) {
	return Number(row.login_date) > scanStartedAt || Number(row.last_online_time) > scanStartedAt
}

async function readVerifyRows({ collection, dbCmd }, ids) {
	const data = readResultData(
		await collection.where({ _id: dbCmd.in(ids) }).field(VERIFY_FIELDS).limit(ids.length).get(),
		'回读'
	)
	return new Map(data.map(row => [toIdString(row._id), row]))
}

function createOutcome() {
	return { success: [], skipped: [], failed: [], uncertain: [], notProcessed: [] }
}

/**
 * 批量封禁命中账号（0 → 3），并把批次标记写入 description。
 * 写入条件：status 为 0、注册时间仍在范围内、扫描开始后没有活动、description 不存在（不覆盖运营写的备注）。
 * 每批写入后回读逐个归类。
 * @param {Array<{id: string, hasOnlineField: boolean}>} hits
 * @param {{criteria: Object, scanStartedAt: number, tag: string}} guard
 * @param {{isStopped?: Function, onChunk?: Function}} options - isStopped 为 true 时不再处理后续批次，剩余账号记入 notProcessed
 * @returns {Promise<{success, skipped, failed, uncertain, notProcessed}>} 每项 { id, reason, status }；
 *   status 为回读到的最新状态，账号不存在时为 null，无法确认时为 undefined
 */
async function banZombieAccounts(context, hits, guard, options = {}) {
	const { collection, dbCmd } = context
	const outcome = createOutcome()
	const chunks = chunkArray(hits, ACTION_BATCH_SIZE)
	let processed = 0
	for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
		const chunk = chunks[chunkIndex]
		if (options.isStopped && options.isStopped()) {
			chunks.slice(chunkIndex).forEach(rest => rest.forEach(hit => outcome.notProcessed.push({ id: hit.id, reason: '已停止，未处理', status: undefined })))
			break
		}
		const base = {
			status: 0,
			register_date: registerRangeCondition(dbCmd, guard.criteria),
			description: dbCmd.exists(false)
		}
		let writeError = null
		try {
			for (const where of activityGuardedWheres(dbCmd, chunk, base, guard.scanStartedAt)) {
				await collection.where(where).update({ status: 3, description: guard.tag })
			}
		} catch (error) {
			writeError = error
		}

		const ids = chunk.map(hit => hit.id)
		let rows
		try {
			rows = await readVerifyRows(context, ids)
		} catch (error) {
			const reason = writeError
				? `写入报错（${getErrorMessage(writeError)}），回读也失败（${getErrorMessage(error)}）`
				: `写入后回读失败：${getErrorMessage(error)}`
			ids.forEach(id => outcome.uncertain.push({ id, reason, status: undefined }))
			processed += chunk.length
			if (options.onChunk) options.onChunk(processed, hits.length)
			continue
		}

		ids.forEach(id => {
			const row = rows.get(id)
			if (!row) {
				outcome.skipped.push({ id, reason: '账号不存在或已删除', status: null })
				return
			}
			const status = Number(row.status)
			if (status === 3 && row.description === guard.tag) {
				outcome.success.push({ id, reason: '已封禁', status })
			} else if (status === 3) {
				outcome.skipped.push({ id, reason: '账号已是封禁状态，非本次操作', status })
			} else if (status !== 0) {
				outcome.skipped.push({ id, reason: `账号当前为“${getStatusText(status)}”，未处理`, status })
			} else if (activeSinceScan(row, guard.scanStartedAt)) {
				outcome.skipped.push({ id, reason: '扫描后有登录或在线记录，已跳过', status })
			} else if (row.description !== undefined && row.description !== null) {
				outcome.skipped.push({ id, reason: '账号已有备注，未自动封禁，请人工处理', status })
			} else {
				outcome.failed.push({ id, reason: writeError ? `写入失败：${getErrorMessage(writeError)}` : '写入后状态未变化', status })
			}
		})
		processed += chunk.length
		if (options.onChunk) options.onChunk(processed, hits.length)
	}
	return outcome
}

/**
 * 批量删除“无邀请关系”的命中账号（硬删除，不可恢复，不清理其它表的关联数据）。
 * 每批删除前重新核对邀请关系，扫描后成为邀请人的账号不删；
 * 删除条件：注册时间仍在范围内、扫描开始后没有活动、不是内部用户。删除后回读，仍存在的账号逐个归类。
 * @param {Array<{id: string, hasOnlineField: boolean}>} hits
 * @param {{criteria: Object, scanStartedAt: number}} guard
 * @param {{isStopped?: Function, onChunk?: Function}} options
 * @returns {Promise<{success, skipped, failed, uncertain, notProcessed}>} 成功删除的 status 为 null
 */
async function deleteZombieAccounts(context, hits, guard, options = {}) {
	const { collection, dbCmd } = context
	const outcome = createOutcome()
	const chunks = chunkArray(hits, ACTION_BATCH_SIZE)
	let processed = 0
	for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
		const chunk = chunks[chunkIndex]
		if (options.isStopped && options.isStopped()) {
			chunks.slice(chunkIndex).forEach(rest => rest.forEach(hit => outcome.notProcessed.push({ id: hit.id, reason: '已停止，未处理', status: undefined })))
			break
		}
		const finish = () => {
			processed += chunk.length
			if (options.onChunk) options.onChunk(processed, hits.length)
		}

		let inviterIds
		try {
			inviterIds = await findInviterIds(context, chunk.map(hit => hit.id), { retryDelayMs: options.retryDelayMs })
		} catch (error) {
			chunk.forEach(hit => outcome.failed.push({ id: hit.id, reason: `删除前邀请关系核对失败，未删除：${getErrorMessage(error)}`, status: undefined }))
			finish()
			continue
		}
		const deletable = chunk.filter(hit => {
			if (!inviterIds.has(hit.id)) return true
			outcome.skipped.push({ id: hit.id, reason: '已成为别人的邀请人，不能删除', status: undefined })
			return false
		})
		if (!deletable.length) {
			finish()
			continue
		}

		const base = {
			register_date: registerRangeCondition(dbCmd, guard.criteria),
			is_internal_user: dbCmd.neq(true)
		}
		let writeError = null
		try {
			for (const where of activityGuardedWheres(dbCmd, deletable, base, guard.scanStartedAt)) {
				await collection.where(where).remove()
			}
		} catch (error) {
			writeError = error
		}

		const ids = deletable.map(hit => hit.id)
		let rows
		try {
			rows = await readVerifyRows(context, ids)
		} catch (error) {
			const reason = writeError
				? `删除报错（${getErrorMessage(writeError)}），回读也失败（${getErrorMessage(error)}）`
				: `删除后回读失败：${getErrorMessage(error)}`
			ids.forEach(id => outcome.uncertain.push({ id, reason, status: undefined }))
			finish()
			continue
		}
		ids.forEach(id => {
			const row = rows.get(id)
			if (!row) {
				outcome.success.push({ id, reason: '已删除', status: null })
			} else if (activeSinceScan(row, guard.scanStartedAt)) {
				outcome.skipped.push({ id, reason: '扫描后有登录或在线记录，未删除', status: Number(row.status) })
			} else {
				outcome.failed.push({ id, reason: writeError ? `删除失败：${getErrorMessage(writeError)}` : '删除后账号仍存在', status: Number(row.status) })
			}
		})
		finish()
	}
	return outcome
}

module.exports = {
	ACTION_BATCH_SIZE,
	INVITER_CHECK_LIMIT,
	CANDIDATE_FIELDS,
	countZombieCandidates,
	scanZombieCandidates,
	loadPaidUserIds,
	findInviterIds,
	banZombieAccounts,
	deleteZombieAccounts
}

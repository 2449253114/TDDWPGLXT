const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

const CLEANUP_KEYS = Object.freeze({
	vipChanges: 'vipChanges',
	paymentOrders: 'paymentOrders'
})
const PENDING_CLEANUP_STATE_VERSION = 1
const PENDING_CLEANUP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const PENDING_CLEANUP_FUTURE_TOLERANCE_MS = 5 * 60 * 1000
const PERSISTED_USER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const OPERATION_STATE_VERSION = 2
const OPERATION_PHASES = Object.freeze({
	blockedOnly: 'blocked-only',
	cleanupOnly: 'cleanup-only'
})
const OPERATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/

function assertTargetUserId(targetUserId) {
	if (typeof targetUserId !== 'string' || !targetUserId.trim()) {
		throw new Error('目标用户ID无效')
	}
	return targetUserId.trim()
}

function createZeroAmountWhere(targetUserId) {
	return {
		user_id: assertTargetUserId(targetUserId),
		total_fee: 0
	}
}

function normalizeCount(value, label) {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${label}返回了无效数量`)
	}
	return value
}

function getErrorMessage(error) {
	if (!error) return ''
	if (typeof error.message === 'string' && error.message) return error.message
	return String(error)
}

function normalizeVipExpireTimestamp(value) {
	if (Number.isFinite(value)) return Math.trunc(value)
	if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime()
	if (typeof value !== 'string' || !value.trim()) return null

	const normalized = value.trim()
	if (/^-?\d+$/.test(normalized)) {
		const numericValue = Number(normalized)
		return Number.isSafeInteger(numericValue) ? numericValue : null
	}
	const parsed = Date.parse(normalized)
	return Number.isFinite(parsed) ? parsed : null
}

function isValidPersistedUserId(value) {
	return typeof value === 'string' && PERSISTED_USER_ID_PATTERN.test(value)
}

function normalizeOperationRecord(value, expectedTargetUserId, now) {
	const currentTime = Number.isSafeInteger(now) && now > 0 ? now : Date.now()
	let source = value
	if (typeof source === 'string' && source) {
		try {
			source = JSON.parse(source)
		} catch (error) {
			return { record: null, issue: '操作状态不是有效JSON' }
		}
	}
	if (!source || typeof source !== 'object' || Array.isArray(source)) {
		return { record: null, issue: '操作状态结构无效' }
	}
	if (source.version !== OPERATION_STATE_VERSION) {
		return { record: null, issue: '操作状态版本不受支持' }
	}
	if (!isValidPersistedUserId(source.targetUserId)) {
		return { record: null, issue: '操作状态的目标用户ID无效' }
	}
	if (expectedTargetUserId && source.targetUserId !== expectedTargetUserId) {
		return { record: null, issue: '操作状态与存储键的目标用户ID不一致' }
	}
	if (typeof source.operationId !== 'string' || !OPERATION_ID_PATTERN.test(source.operationId)) {
		return { record: null, issue: '操作状态的操作ID无效' }
	}
	if (!Object.keys(OPERATION_PHASES).some(key => OPERATION_PHASES[key] === source.phase)) {
		return { record: null, issue: '操作状态阶段无效' }
	}
	const validInviteCode = typeof source.inviteCode === 'string' && /^[A-Z0-9]{6}$/.test(source.inviteCode)
	const blockedWithoutInviteCode = source.phase === OPERATION_PHASES.blockedOnly && source.inviteCode === ''
	if (!validInviteCode && !blockedWithoutInviteCode) {
		return { record: null, issue: '操作状态的邀请码格式无效' }
	}
	if (!Number.isSafeInteger(source.createdAt) || source.createdAt <= 0 ||
		!Number.isSafeInteger(source.updatedAt) || source.updatedAt < source.createdAt) {
		return { record: null, issue: '操作状态时间无效' }
	}
	if (source.createdAt > currentTime + PENDING_CLEANUP_FUTURE_TOLERANCE_MS ||
		source.updatedAt > currentTime + PENDING_CLEANUP_FUTURE_TOLERANCE_MS) {
		return { record: null, issue: '操作状态时间明显晚于当前时间' }
	}
	if (source.reason !== undefined && (typeof source.reason !== 'string' || source.reason.length > 500)) {
		return { record: null, issue: '操作状态原因无效' }
	}
	return {
		record: {
			version: OPERATION_STATE_VERSION,
			targetUserId: source.targetUserId,
			inviteCode: source.inviteCode,
			operationId: source.operationId,
			phase: source.phase,
			createdAt: source.createdAt,
			updatedAt: source.updatedAt,
			reason: source.reason || '',
			expired: currentTime - source.createdAt > PENDING_CLEANUP_MAX_AGE_MS
		},
		issue: ''
	}
}

function serializeOperationRecord(record) {
	return {
		version: OPERATION_STATE_VERSION,
		targetUserId: record.targetUserId,
		inviteCode: record.inviteCode,
		operationId: record.operationId,
		phase: record.phase,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		reason: record.reason || ''
	}
}

function createOperationRecord(input, now) {
	const currentTime = Number.isSafeInteger(now) && now > 0 ? now : Date.now()
	const source = input || {}
	const candidate = {
		version: OPERATION_STATE_VERSION,
		targetUserId: source.targetUserId,
		inviteCode: String(source.inviteCode || '').trim().toUpperCase(),
		operationId: source.operationId,
		phase: source.phase || OPERATION_PHASES.blockedOnly,
		createdAt: source.createdAt === undefined ? currentTime : source.createdAt,
		updatedAt: source.updatedAt === undefined ? currentTime : source.updatedAt,
		reason: source.reason || ''
	}
	const normalized = normalizeOperationRecord(candidate, candidate.targetUserId, currentTime)
	if (!normalized.record) throw new Error(normalized.issue)
	return normalized.record
}

function transitionOperationRecord(record, nextPhase, now, reason) {
	const currentTime = Number.isSafeInteger(now) && now > 0 ? now : Date.now()
	const normalized = normalizeOperationRecord(record, record && record.targetUserId, currentTime)
	if (!normalized.record) throw new Error(normalized.issue)
	const current = normalized.record
	const allowed = current.phase === nextPhase ||
		(current.phase === OPERATION_PHASES.blockedOnly && nextPhase === OPERATION_PHASES.cleanupOnly)
	if (!allowed) throw new Error(`不允许从 ${current.phase} 转换到 ${nextPhase}`)
	const candidate = {
		...serializeOperationRecord(current),
		phase: nextPhase,
		updatedAt: currentTime,
		reason: reason === undefined ? current.reason : String(reason)
	}
	const transitioned = normalizeOperationRecord(candidate, current.targetUserId, currentTime)
	if (!transitioned.record) throw new Error(transitioned.issue)
	return transitioned.record
}

function normalizePendingCleanupState(value, now) {
	const currentTime = Number.isSafeInteger(now) && now > 0 ? now : Date.now()
	let source = value
	const issues = []
	const blockedTargetUserIds = new Set()
	const blockTargetUserId = targetUserId => {
		if (isValidPersistedUserId(targetUserId)) blockedTargetUserIds.add(targetUserId)
	}
	if (typeof source === 'string' && source) {
		try {
			source = JSON.parse(source)
		} catch (error) {
			issues.push('待恢复状态不是有效JSON')
			source = null
		}
	}

	const records = {}
	if (source !== undefined && source !== null && source !== '') {
		if (!source || typeof source !== 'object' || Array.isArray(source)) {
			issues.push('待恢复状态结构无效')
		} else if (source.version !== PENDING_CLEANUP_STATE_VERSION) {
			issues.push('待恢复状态版本不受支持')
		} else if (!source.records || typeof source.records !== 'object' || Array.isArray(source.records)) {
			issues.push('待恢复记录集合无效')
		}
	}
	if (source && Array.isArray(source.blockedTargetUserIds)) {
		source.blockedTargetUserIds.forEach(targetUserId => {
			if (isValidPersistedUserId(targetUserId)) {
				blockedTargetUserIds.add(targetUserId)
			} else {
				issues.push('待恢复状态包含无效的阻止操作用户ID')
			}
		})
	}
	if (source && source.version === PENDING_CLEANUP_STATE_VERSION && source.records && typeof source.records === 'object' && !Array.isArray(source.records)) {
		Object.keys(source.records).forEach(key => {
			const record = source.records[key]
			if (!record || typeof record !== 'object' || Array.isArray(record)) {
				blockTargetUserId(key)
				issues.push(`记录 ${key || '(空ID)'} 的用户ID或结构无效`)
				return
			}
			if (!isValidPersistedUserId(key)) {
				blockTargetUserId(record.targetUserId)
				issues.push(`记录 ${key || '(空ID)'} 的用户ID或结构无效`)
				return
			}
			if (record.targetUserId !== key || !isValidPersistedUserId(record.targetUserId)) {
				blockTargetUserId(key)
				blockTargetUserId(record.targetUserId)
				issues.push(`记录 ${key} 的目标用户ID不一致`)
				return
			}
			if (typeof record.inviteCode !== 'string' || !/^[A-Z0-9]{6}$/.test(record.inviteCode)) {
				blockTargetUserId(key)
				issues.push(`记录 ${key} 的邀请码格式无效`)
				return
			}
			if (!Number.isSafeInteger(record.createdAt) || record.createdAt <= 0) {
				blockTargetUserId(key)
				issues.push(`记录 ${key} 的创建时间无效`)
				return
			}
			if (record.createdAt > currentTime + PENDING_CLEANUP_FUTURE_TOLERANCE_MS) {
				blockTargetUserId(key)
				issues.push(`记录 ${key} 的创建时间明显晚于当前时间`)
				return
			}
			records[key] = {
				targetUserId: key,
				inviteCode: record.inviteCode,
				createdAt: record.createdAt,
				expired: currentTime - record.createdAt > PENDING_CLEANUP_MAX_AGE_MS
			}
		})
	} else if (source && source.records && typeof source.records === 'object' && !Array.isArray(source.records)) {
		Object.keys(source.records).forEach(key => {
			blockTargetUserId(key)
			const record = source.records[key]
			if (record && typeof record === 'object' && !Array.isArray(record)) {
				blockTargetUserId(record.targetUserId)
			}
		})
	}

	return {
		version: PENDING_CLEANUP_STATE_VERSION,
		records,
		blockedTargetUserIds: Array.from(blockedTargetUserIds).sort(),
		issues
	}
}

function createStageFailure(stage, message, details) {
	return {
		success: false,
		stage,
		message,
		details: details || null
	}
}

function canReleaseOperationLockAfterCoreFailure(core) {
	return Boolean(
		core &&
		core.stage === 'relations' &&
		core.details &&
		core.details.safeToReleaseOperationLock === true
	)
}

async function countImpact(operations, targetUserId) {
	const userId = assertTargetUserId(targetUserId)
	const counts = await Promise.all([
		operations.countRelations(userId),
		operations.countVipChanges(userId),
		operations.countPaymentOrders(userId)
	])

	return {
		relations: normalizeCount(counts[0], '邀请关系统计'),
		vipChanges: normalizeCount(counts[1], '会员变更0元记录统计'),
		paymentOrders: normalizeCount(counts[2], '支付订单0元记录统计')
	}
}

async function runCoreCancellation(operations, targetUser, now) {
	if (!targetUser || typeof targetUser !== 'object') {
		return createStageFailure('relations', '目标账号信息无效', {
			relationClearIssued: false,
			safeToReleaseOperationLock: true
		})
	}

	let targetUserId
	try {
		targetUserId = assertTargetUserId(targetUser._id)
	} catch (error) {
		return createStageFailure('relations', getErrorMessage(error), {
			relationClearIssued: false,
			safeToReleaseOperationLock: true
		})
	}
	if (typeof operations.assertOperationLock === 'function') {
		try {
			await operations.assertOperationLock(targetUserId, OPERATION_PHASES.blockedOnly)
		} catch (error) {
			return createStageFailure('relations', `操作安全锁校验失败，未执行邀请关系或VIP修改：${getErrorMessage(error)}`, {
				relationClearIssued: false,
				safeToReleaseOperationLock: true
			})
		}
	}

	let relationUpdateError = null
	let relationUpdated = null
	try {
		relationUpdated = await operations.clearRelations(targetUserId)
	} catch (error) {
		relationUpdateError = error
	}
	const relationClearConfirmedNoChange = relationUpdateError === null && relationUpdated === 0
	const relationFailureDetails = extra => ({
		relationClearIssued: true,
		relationClearConfirmedNoChange,
		safeToReleaseOperationLock: relationClearConfirmedNoChange,
		relationUpdated: Number.isSafeInteger(relationUpdated) && relationUpdated >= 0 ? relationUpdated : null,
		relationUpdateError: getErrorMessage(relationUpdateError),
		...(extra || {})
	})

	let remainingRelations
	try {
		remainingRelations = normalizeCount(
			await operations.countRelations(targetUserId),
			'邀请关系复核'
		)
	} catch (error) {
		return createStageFailure(
			'relations',
			`邀请关系清理后无法复核：${getErrorMessage(error)}`,
			relationFailureDetails({ relationCountError: getErrorMessage(error) })
		)
	}

	if (remainingRelations !== 0) {
		const updateMessage = getErrorMessage(relationUpdateError)
		return createStageFailure(
			'relations',
			`仍有 ${remainingRelations} 个账号未清除邀请关系，目标账号VIP未修改${updateMessage ? `；清理请求异常：${updateMessage}` : ''}`,
			relationFailureDetails({ remainingRelations })
		)
	}

	if (!Number.isFinite(now)) {
		return createStageFailure('vip', '执行时间无效，目标账号VIP未修改', {
			relationsCleared: true
		})
	}
	if (typeof operations.assertOperationLock === 'function') {
		try {
			await operations.assertOperationLock(targetUserId, OPERATION_PHASES.blockedOnly)
		} catch (error) {
			return createStageFailure(
				'vip',
				`邀请关系已清除，但操作安全锁失效，目标账号VIP未修改：${getErrorMessage(error)}`,
				{ relationsCleared: true }
			)
		}
	}
	const vipExpireDate = Math.trunc(now) - ONE_DAY_IN_MILLISECONDS
	let vipUpdateError = null
	let vipUpdated = null
	try {
		vipUpdated = await operations.cancelVip(targetUser, vipExpireDate)
	} catch (error) {
		vipUpdateError = error
	}

	let latestUser
	try {
		latestUser = await operations.readTargetUser(targetUserId)
	} catch (error) {
		return createStageFailure(
			'vip',
			`邀请关系已清除，但无法复核目标账号VIP状态：${getErrorMessage(error)}。为避免误伤新购买的VIP，不能直接重试完整流程`,
			{
				relationsCleared: true,
				vipUpdateError: getErrorMessage(vipUpdateError)
			}
		)
	}

	if (!latestUser) {
		return createStageFailure(
			'vip',
			'邀请关系已清除，但目标账号已不存在，无法确认VIP状态；未执行0元记录清理',
			{ relationsCleared: true }
		)
	}

	const vipStateVerified = latestUser.vip === false &&
		normalizeVipExpireTimestamp(latestUser.vip_expire_date) === vipExpireDate
	if (!vipStateVerified) {
		const updateMessage = getErrorMessage(vipUpdateError)
		return createStageFailure(
			'vip',
			`邀请关系已清除，但VIP状态未按本次操作更新${updateMessage ? `：${updateMessage}` : '，账号可能在确认后发生了变化'}。为避免取消新购买的VIP，未执行0元记录清理，不能直接重试完整流程`,
			{
				relationsCleared: true,
				latestUser,
				vipExpireDate
			}
		)
	}

	return {
		success: true,
		stage: 'core-complete',
		targetUserId,
		relationUpdated: Number.isFinite(Number(relationUpdated)) ? Number(relationUpdated) : null,
		vipUpdated: Number.isFinite(Number(vipUpdated)) ? Number(vipUpdated) : null,
		vipExpireDate,
		latestUser,
		warnings: [
			getErrorMessage(relationUpdateError),
			getErrorMessage(vipUpdateError)
		].filter(Boolean)
	}
}

async function cleanupOneCollection(config, targetUserId) {
	let removeError = null
	let removeResult = null
	try {
		removeResult = await config.remove(targetUserId)
	} catch (error) {
		removeError = error
	}

	let remaining = null
	let countError = null
	try {
		remaining = normalizeCount(await config.count(targetUserId), `${config.label}复核`)
	} catch (error) {
		countError = error
	}

	const verified = countError === null
	return {
		key: config.key,
		label: config.label,
		success: verified && remaining === 0,
		verified,
		remaining,
		removeResult,
		removeError: getErrorMessage(removeError),
		countError: getErrorMessage(countError)
	}
}

async function cleanupZeroAmountRecords(operations, targetUserId) {
	const userId = assertTargetUserId(targetUserId)
	const results = await Promise.all([
		cleanupOneCollection({
			key: CLEANUP_KEYS.vipChanges,
			label: '会员变更0元记录',
			remove: operations.removeVipChanges,
			count: operations.countVipChanges
		}, userId),
		cleanupOneCollection({
			key: CLEANUP_KEYS.paymentOrders,
			label: '支付订单0元记录',
			remove: operations.removePaymentOrders,
			count: operations.countPaymentOrders
		}, userId)
	])

	return {
		success: results.every(item => item.success),
		items: results
	}
}

async function runCancellationWorkflow(operations, targetUser, now) {
	const core = await runCoreCancellation(operations, targetUser, now)
	if (!core.success) {
		return {
			success: false,
			coreSucceeded: false,
			core,
			cleanup: null
		}
	}

	let recoveryStateError = ''
	if (typeof operations.markCoreSucceeded !== 'function') {
		recoveryStateError = '缺少核心完成后的本地安全状态切换能力'
	} else {
		try {
			await operations.markCoreSucceeded(core)
		} catch (error) {
			recoveryStateError = getErrorMessage(error)
		}
	}
	if (recoveryStateError) {
		return {
			success: false,
			coreSucceeded: true,
			core,
			cleanup: null,
			recoveryStateError,
			cleanupSkipped: true
		}
	}
	const cleanup = await cleanupZeroAmountRecords(operations, core.targetUserId)
	return {
		success: cleanup.success,
		coreSucceeded: true,
		core,
		cleanup,
		recoveryStateError
	}
}

module.exports = {
	ONE_DAY_IN_MILLISECONDS,
	CLEANUP_KEYS,
	PENDING_CLEANUP_STATE_VERSION,
	PENDING_CLEANUP_MAX_AGE_MS,
	PENDING_CLEANUP_FUTURE_TOLERANCE_MS,
	OPERATION_STATE_VERSION,
	OPERATION_PHASES,
	createZeroAmountWhere,
	normalizeVipExpireTimestamp,
	normalizeOperationRecord,
	serializeOperationRecord,
	createOperationRecord,
	transitionOperationRecord,
	normalizePendingCleanupState,
	countImpact,
	canReleaseOperationLockAfterCoreFailure,
	runCoreCancellation,
	cleanupZeroAmountRecords,
	runCancellationWorkflow
}

const test = require('node:test')
const assert = require('node:assert/strict')

const {
	createZeroAmountWhere,
	countImpact,
	cleanupZeroAmountRecords,
	runCancellationWorkflow,
	canReleaseOperationLockAfterCoreFailure,
	normalizeVipExpireTimestamp,
	normalizePendingCleanupState,
	PENDING_CLEANUP_MAX_AGE_MS,
	PENDING_CLEANUP_FUTURE_TOLERANCE_MS,
	OPERATION_PHASES,
	createOperationRecord,
	transitionOperationRecord,
	normalizeOperationRecord,
	serializeOperationRecord
} = require('./cancel-inviter.workflow.js')

function createBaseOperations(overrides) {
	const operations = {
		countRelations: async () => 0,
		countVipChanges: async () => 0,
		countPaymentOrders: async () => 0,
		clearRelations: async () => 0,
		cancelVip: async () => 1,
		readTargetUser: async () => ({ vip: false, vip_expire_date: 1000 - 86400000 }),
		removeVipChanges: async () => ({ deleted: 0 }),
		removePaymentOrders: async () => ({ deleted: 0 })
	}
	return Object.assign(operations, overrides || {})
}

test('0元条件只匹配目标用户的数字0', () => {
	assert.deepEqual(createZeroAmountWhere(' user-1 '), {
		user_id: 'user-1',
		total_fee: 0
	})
	assert.equal(typeof createZeroAmountWhere('user-1').total_fee, 'number')
	assert.throws(() => createZeroAmountWhere(''), /目标用户ID无效/)
})

test('VIP到期时间兼容数字、数字字符串、ISO和Date表示', () => {
	const timestamp = Date.UTC(2026, 6, 16, 0, 0, 0)
	assert.equal(normalizeVipExpireTimestamp(timestamp), timestamp)
	assert.equal(normalizeVipExpireTimestamp(String(timestamp)), timestamp)
	assert.equal(normalizeVipExpireTimestamp('2026-07-16T00:00:00.000Z'), timestamp)
	assert.equal(normalizeVipExpireTimestamp(new Date(timestamp)), timestamp)
	assert.equal(normalizeVipExpireTimestamp(null), null)
	assert.equal(normalizeVipExpireTimestamp(undefined), null)
})

test('待恢复记录区分新鲜、明显未来、过期和损坏状态', () => {
	const now = 2000000000000
	const source = {
		version: 1,
		records: {
			fresh: { targetUserId: 'fresh', inviteCode: 'ABC123', createdAt: now - 1000 },
			expired: { targetUserId: 'expired', inviteCode: 'DEF456', createdAt: now - PENDING_CLEANUP_MAX_AGE_MS - 1 },
			future: { targetUserId: 'future', inviteCode: 'GHI789', createdAt: now + PENDING_CLEANUP_FUTURE_TOLERANCE_MS + 1 },
			broken: { targetUserId: 'different-user', inviteCode: 'bad', createdAt: 0 }
		}
	}
	const normalized = normalizePendingCleanupState(source, now)
	assert.equal(normalized.records.fresh.expired, false)
	assert.equal(normalized.records.expired.expired, true)
	assert.equal(normalized.records.future, undefined)
	assert.equal(normalized.records.broken, undefined)
	assert.equal(normalized.issues.length, 2)
	assert.deepEqual(normalized.blockedTargetUserIds, ['broken', 'different-user', 'future'])
	assert.match(normalized.issues.join('|'), /明显晚于当前时间/)
	assert.match(normalized.issues.join('|'), /目标用户ID不一致/)
})

test('损坏持久状态不生成可操作记录并返回明确告警', () => {
	const invalidJson = normalizePendingCleanupState('{bad json', 2000000000000)
	assert.deepEqual(invalidJson.records, {})
	assert.match(invalidJson.issues[0], /有效JSON/)

	const invalidFields = normalizePendingCleanupState({
		version: 1,
		records: {
			'bad user id': { targetUserId: 'bad user id', inviteCode: 'abc123', createdAt: -1 }
		}
	}, 2000000000000)
	assert.deepEqual(invalidFields.records, {})
	assert.ok(invalidFields.issues.length > 0)

	const validIdWithDamagedFields = normalizePendingCleanupState({
		version: 1,
		records: {
			'user-with-damaged-state': {
				targetUserId: 'user-with-damaged-state',
				inviteCode: 'bad',
				createdAt: 2000000000000
			}
		}
	}, 2000000000000)
	assert.deepEqual(validIdWithDamagedFields.records, {})
	assert.deepEqual(validIdWithDamagedFields.blockedTargetUserIds, ['user-with-damaged-state'])

	const unsupportedVersion = normalizePendingCleanupState({
		version: 2,
		records: {
			'user-from-newer-version': {
				targetUserId: 'user-from-newer-version'
			}
		}
	}, 2000000000000)
	assert.deepEqual(unsupportedVersion.records, {})
	assert.deepEqual(unsupportedVersion.blockedTargetUserIds, ['user-from-newer-version'])
})

test('逐用户操作状态只允许安全阶段迁移并保留过期边界', () => {
	const now = 2000000000000
	const started = createOperationRecord({
		targetUserId: 'user-1',
		inviteCode: 'ABC123',
		operationId: 'op-12345678'
	}, now)
	assert.equal(started.phase, OPERATION_PHASES.blockedOnly)
	assert.equal(started.expired, false)

	const cleanupPending = transitionOperationRecord(started, OPERATION_PHASES.cleanupOnly, now + 1)
	assert.equal(cleanupPending.phase, OPERATION_PHASES.cleanupOnly)
	assert.equal(cleanupPending.operationId, started.operationId)
	assert.throws(
		() => transitionOperationRecord(cleanupPending, OPERATION_PHASES.blockedOnly, now + 3),
		/不允许/
	)

	const restored = normalizeOperationRecord(
		JSON.stringify(serializeOperationRecord(cleanupPending)),
		'user-1',
		now + PENDING_CLEANUP_MAX_AGE_MS + 1
	)
	assert.equal(restored.issue, '')
	assert.equal(restored.record.expired, true)
	assert.equal(normalizeOperationRecord('{bad json', 'user-1', now).record, null)
	assert.match(normalizeOperationRecord({ ...serializeOperationRecord(started), targetUserId: 'user-2' }, 'user-1', now).issue, /不一致/)
	assert.match(normalizeOperationRecord({ ...serializeOperationRecord(started), updatedAt: now + PENDING_CLEANUP_FUTURE_TOLERANCE_MS + 1 }, 'user-1', now).issue, /晚于当前时间/)
})

test('邀请码转移不影响恢复清理，始终使用原目标用户ID', async () => {
	const receivedIds = []
	const operations = createBaseOperations({
		removeVipChanges: async targetUserId => receivedIds.push(`remove-vip:${targetUserId}`),
		countVipChanges: async targetUserId => {
			receivedIds.push(`count-vip:${targetUserId}`)
			return 0
		},
		removePaymentOrders: async targetUserId => receivedIds.push(`remove-payment:${targetUserId}`),
		countPaymentOrders: async targetUserId => {
			receivedIds.push(`count-payment:${targetUserId}`)
			return 0
		}
	})

	const result = await cleanupZeroAmountRecords(operations, 'original-user-id')
	assert.equal(result.success, true)
	assert.deepEqual(receivedIds.sort(), [
		'count-payment:original-user-id',
		'count-vip:original-user-id',
		'remove-payment:original-user-id',
		'remove-vip:original-user-id'
	])
})

test('预览的三项统计并行开始', async () => {
	const started = []
	let release
	const gate = new Promise(resolve => {
		release = resolve
	})
	const operations = {
		countRelations: async () => {
			started.push('relations')
			await gate
			return 3
		},
		countVipChanges: async () => {
			started.push('vipChanges')
			await gate
			return 2
		},
		countPaymentOrders: async () => {
			started.push('paymentOrders')
			await gate
			return 1
		}
	}

	const pending = countImpact(operations, 'user-1')
	await Promise.resolve()
	assert.deepEqual(started.sort(), ['paymentOrders', 'relations', 'vipChanges'])
	release()
	assert.deepEqual(await pending, {
		relations: 3,
		vipChanges: 2,
		paymentOrders: 1
	})
})

test('核心流程严格复核关系和VIP后才并行清理两张表', async () => {
	const events = []
	const now = 200000000
	const expectedExpireDate = now - 86400000
	const operations = createBaseOperations({
		clearRelations: async () => {
			events.push('clear-relations')
			return 5
		},
		countRelations: async () => {
			events.push('verify-relations')
			return 0
		},
		cancelVip: async (snapshot, expireDate) => {
			events.push('cancel-vip')
			assert.equal(snapshot.vip_expire_date, 999)
			assert.equal(expireDate, expectedExpireDate)
			return 1
		},
		readTargetUser: async () => {
			events.push('verify-vip')
			return { _id: 'user-1', vip: false, vip_expire_date: new Date(expectedExpireDate).toISOString() }
		},
		markCoreSucceeded: async () => {
			events.push('persist-recovery')
		},
		removeVipChanges: async () => {
			events.push('remove-vip-changes')
			return { deleted: 2 }
		},
		countVipChanges: async () => {
			events.push('verify-vip-changes')
			return 0
		},
		removePaymentOrders: async () => {
			events.push('remove-payment-orders')
			return { deleted: 1 }
		},
		countPaymentOrders: async () => {
			events.push('verify-payment-orders')
			return 0
		}
	})

	const result = await runCancellationWorkflow(operations, {
		_id: 'user-1',
		vip: true,
		vip_expire_date: 999
	}, now)

	assert.equal(result.success, true)
	assert.deepEqual(events.slice(0, 4), [
		'clear-relations',
		'verify-relations',
		'cancel-vip',
		'verify-vip'
	])
	assert.ok(events.indexOf('persist-recovery') > events.indexOf('verify-vip'))
	assert.ok(events.indexOf('remove-vip-changes') > events.indexOf('persist-recovery'))
	assert.ok(events.indexOf('remove-payment-orders') > events.indexOf('persist-recovery'))
})

test('两张表部分成功时结构化返回并保留失败表剩余数量', async () => {
	let paymentAttempted = false
	const operations = createBaseOperations({
		removeVipChanges: async () => ({ deleted: 2 }),
		countVipChanges: async () => 0,
		removePaymentOrders: async () => {
			paymentAttempted = true
			throw new Error('payment timeout')
		},
		countPaymentOrders: async () => 2
	})

	const result = await cleanupZeroAmountRecords(operations, 'user-1')
	assert.equal(paymentAttempted, true)
	assert.equal(result.success, false)
	assert.deepEqual(result.items.map(item => ({
		key: item.key,
		success: item.success,
		remaining: item.remaining
	})), [
		{ key: 'vipChanges', success: true, remaining: 0 },
		{ key: 'paymentOrders', success: false, remaining: 2 }
	])
	assert.match(result.items[1].removeError, /payment timeout/)
})

test('remove超时但最终复核为0时按成功处理', async () => {
	const operations = createBaseOperations({
		removeVipChanges: async () => {
			throw new Error('timeout after delete')
		},
		countVipChanges: async () => 0,
		removePaymentOrders: async () => {
			throw new Error('network interrupted')
		},
		countPaymentOrders: async () => 0
	})

	const result = await cleanupZeroAmountRecords(operations, 'user-1')
	assert.equal(result.success, true)
	assert.equal(result.items.every(item => item.success), true)
	assert.match(result.items[0].removeError, /timeout after delete/)
})

test('remove返回成功但最终仍有残留时按失败处理', async () => {
	const operations = createBaseOperations({
		removeVipChanges: async () => ({ deleted: 10 }),
		countVipChanges: async () => 1
	})

	const result = await cleanupZeroAmountRecords(operations, 'user-1')
	assert.equal(result.success, false)
	assert.equal(result.items[0].success, false)
	assert.equal(result.items[0].remaining, 1)
})

test('0元清理可幂等重试且不会再次执行关系和VIP操作', async () => {
	let paymentRemaining = 1
	let paymentRemoveCalls = 0
	let clearRelationsCalls = 0
	let cancelVipCalls = 0
	const operations = createBaseOperations({
		clearRelations: async () => {
			clearRelationsCalls += 1
			return 0
		},
		cancelVip: async () => {
			cancelVipCalls += 1
			return 1
		},
		removePaymentOrders: async () => {
			paymentRemoveCalls += 1
			if (paymentRemoveCalls >= 2) paymentRemaining = 0
			return { deleted: 1 }
		},
		countPaymentOrders: async () => paymentRemaining
	})

	const firstRetry = await cleanupZeroAmountRecords(operations, 'user-1')
	const secondRetry = await cleanupZeroAmountRecords(operations, 'user-1')
	assert.equal(firstRetry.success, false)
	assert.equal(secondRetry.success, true)
	assert.equal(clearRelationsCalls, 0)
	assert.equal(cancelVipCalls, 0)
})

test('邀请关系核心流程失败时不取消VIP也不清理0元记录', async () => {
	let cancelVipCalls = 0
	let cleanupCalls = 0
	const operations = createBaseOperations({
		clearRelations: async () => 2,
		countRelations: async () => 1,
		cancelVip: async () => {
			cancelVipCalls += 1
		},
		removeVipChanges: async () => {
			cleanupCalls += 1
		},
		removePaymentOrders: async () => {
			cleanupCalls += 1
		}
	})

	const result = await runCancellationWorkflow(operations, {
		_id: 'user-1',
		vip: true,
		vip_expire_date: 999
	}, Date.now())

	assert.equal(result.success, false)
	assert.equal(result.coreSucceeded, false)
	assert.equal(result.core.stage, 'relations')
	assert.equal(result.core.details.safeToReleaseOperationLock, false)
	assert.equal(canReleaseOperationLockAfterCoreFailure(result.core), false)
	assert.equal(cancelVipCalls, 0)
	assert.equal(cleanupCalls, 0)
})

test('关系清理已修改后复核失败必须保留安全锁', async () => {
	const result = await runCancellationWorkflow(createBaseOperations({
		clearRelations: async () => 2,
		countRelations: async () => {
			throw new Error('count unavailable')
		}
	}), { _id: 'user-1', vip: true }, Date.now())

	assert.equal(result.coreSucceeded, false)
	assert.equal(result.core.stage, 'relations')
	assert.equal(result.core.details.relationClearIssued, true)
	assert.equal(result.core.details.relationClearConfirmedNoChange, false)
	assert.equal(result.core.details.relationUpdated, 2)
	assert.equal(result.core.details.safeToReleaseOperationLock, false)
	assert.equal(canReleaseOperationLockAfterCoreFailure(result.core), false)
	assert.match(result.core.details.relationCountError, /count unavailable/)
})

test('关系清理超时后无论复核失败或仍有残留都不得释放安全锁', async () => {
	for (const countRelations of [
		async () => { throw new Error('count unavailable') },
		async () => 3
	]) {
		const result = await runCancellationWorkflow(createBaseOperations({
			clearRelations: async () => {
				throw new Error('clear timeout')
			},
			countRelations
		}), { _id: 'user-1', vip: true }, Date.now())

		assert.equal(result.coreSucceeded, false)
		assert.equal(result.core.stage, 'relations')
		assert.equal(result.core.details.relationClearIssued, true)
		assert.equal(result.core.details.relationClearConfirmedNoChange, false)
		assert.equal(result.core.details.safeToReleaseOperationLock, false)
		assert.equal(canReleaseOperationLockAfterCoreFailure(result.core), false)
		assert.match(result.core.details.relationUpdateError, /clear timeout/)
	}
})

test('关系清理明确返回0时即使复核失败也可证明本次未修改', async () => {
	const result = await runCancellationWorkflow(createBaseOperations({
		clearRelations: async () => 0,
		countRelations: async () => {
			throw new Error('count unavailable')
		}
	}), { _id: 'user-1', vip: true }, Date.now())

	assert.equal(result.coreSucceeded, false)
	assert.equal(result.core.details.relationClearConfirmedNoChange, true)
	assert.equal(result.core.details.safeToReleaseOperationLock, true)
	assert.equal(canReleaseOperationLockAfterCoreFailure(result.core), true)
})

test('VIP复核发现状态变化时不清理0元记录', async () => {
	let cleanupCalls = 0
	const operations = createBaseOperations({
		readTargetUser: async () => ({
			_id: 'user-1',
			vip: true,
			vip_expire_date: 999999999
		}),
		removeVipChanges: async () => {
			cleanupCalls += 1
		},
		removePaymentOrders: async () => {
			cleanupCalls += 1
		}
	})

	const result = await runCancellationWorkflow(operations, {
		_id: 'user-1',
		vip: true,
		vip_expire_date: 999
	}, Date.now())

	assert.equal(result.success, false)
	assert.equal(result.core.stage, 'vip')
	assert.match(result.core.message, /避免取消新购买的VIP/)
	assert.equal(cleanupCalls, 0)
})

test('破坏性核心步骤前后都必须持有同一操作安全锁', async () => {
	const events = []
	const now = 200000000
	const operations = createBaseOperations({
		assertOperationLock: async (targetUserId, phase) => {
			events.push(`lock:${targetUserId}:${phase}`)
		},
		clearRelations: async () => {
			events.push('clear-relations')
			return 1
		},
		countRelations: async () => {
			events.push('verify-relations')
			return 0
		},
		cancelVip: async () => {
			events.push('cancel-vip')
			return 1
		},
		readTargetUser: async () => ({
			_id: 'user-1',
			vip: false,
			vip_expire_date: now - 86400000
		}),
		markCoreSucceeded: async () => {}
	})
	await runCancellationWorkflow(operations, { _id: 'user-1', vip: true }, now)
	assert.deepEqual(events.slice(0, 6), [
		`lock:user-1:${OPERATION_PHASES.blockedOnly}`,
		'clear-relations',
		'verify-relations',
		`lock:user-1:${OPERATION_PHASES.blockedOnly}`,
		'cancel-vip',
	])
})

test('关系清理后的安全锁丢失必须阻止VIP和0元记录清理', async () => {
	let lockChecks = 0
	let cancelVipCalls = 0
	let cleanupCalls = 0
	const operations = createBaseOperations({
		assertOperationLock: async () => {
			lockChecks += 1
			if (lockChecks === 2) throw new Error('锁已被其他页面替换')
		},
		cancelVip: async () => {
			cancelVipCalls += 1
		},
		removeVipChanges: async () => {
			cleanupCalls += 1
		},
		removePaymentOrders: async () => {
			cleanupCalls += 1
		}
	})
	const result = await runCancellationWorkflow(operations, { _id: 'user-1', vip: true }, Date.now())
	assert.equal(result.coreSucceeded, false)
	assert.equal(result.core.stage, 'vip')
	assert.equal(result.core.details.relationsCleared, true)
	assert.equal(cancelVipCalls, 0)
	assert.equal(cleanupCalls, 0)
})

test('核心成功但cleanup-only状态持久化失败时不得删除0元记录', async () => {
	let cleanupCalls = 0
	const now = 200000000
	const operations = createBaseOperations({
		readTargetUser: async () => ({
			_id: 'user-1',
			vip: false,
			vip_expire_date: now - 86400000
		}),
		markCoreSucceeded: async () => {
			throw new Error('storage unavailable')
		},
		removeVipChanges: async () => {
			cleanupCalls += 1
		},
		removePaymentOrders: async () => {
			cleanupCalls += 1
		}
	})
	const result = await runCancellationWorkflow(operations, { _id: 'user-1', vip: true }, now)
	assert.equal(result.coreSucceeded, true)
	assert.equal(result.cleanup, null)
	assert.equal(result.cleanupSkipped, true)
	assert.match(result.recoveryStateError, /storage unavailable/)
	assert.equal(cleanupCalls, 0)
})

test('缺少cleanup-only状态切换能力时不得删除0元记录', async () => {
	let cleanupCalls = 0
	const now = 200000000
	const operations = createBaseOperations({
		readTargetUser: async () => ({
			_id: 'user-1',
			vip: false,
			vip_expire_date: now - 86400000
		}),
		removeVipChanges: async () => {
			cleanupCalls += 1
		},
		removePaymentOrders: async () => {
			cleanupCalls += 1
		}
	})
	const result = await runCancellationWorkflow(operations, { _id: 'user-1', vip: true }, now)
	assert.equal(result.coreSucceeded, true)
	assert.equal(result.cleanup, null)
	assert.equal(result.cleanupSkipped, true)
	assert.match(result.recoveryStateError, /缺少核心完成后的本地安全状态切换能力/)
	assert.equal(cleanupCalls, 0)
})

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createRequire } = require('node:module')

const componentPath = path.join(__dirname, 'cancel-inviter.vue')
const componentRequire = createRequire(componentPath)
const componentSource = fs.readFileSync(componentPath, 'utf8')
const scriptMatch = componentSource.match(/<script>([\s\S]*?)<\/script>/)
const LEGACY_STORAGE_KEY = 'cancel-inviter-pending-cleanup-v1'

const {
	OPERATION_PHASES,
	createOperationRecord,
	serializeOperationRecord
} = require('./cancel-inviter.workflow.js')

assert(scriptMatch, 'cancel-inviter.vue script block is missing')

function createStorage(initialValues) {
	const values = new Map(Object.entries(initialValues || {}))
	const modals = []
	return {
		values,
		modals,
		uni: {
			getStorageSync(key) {
				return values.has(key) ? values.get(key) : ''
			},
			setStorageSync(key, value) {
				values.set(key, value)
			},
			removeStorageSync(key) {
				values.delete(key)
			},
			getStorageInfoSync() {
				return { keys: Array.from(values.keys()) }
			},
			showLoading() {},
			hideLoading() {},
			showToast() {},
			showModal(options) {
				modals.push(options)
			}
		}
	}
}

function loadComponent(uni) {
	const context = {
		require: componentRequire,
		uni,
		uniCloud: {
			database() {
				return {
					command: { exists() {} },
					collection() {
						return {}
					}
				}
			}
		},
		console: {
			error() {},
			warn() {},
			log() {}
		}
	}
	vm.runInNewContext(
		scriptMatch[1].replace('export default', 'globalThis.__cancelInviterComponent ='),
		context,
		{ filename: componentPath }
	)
	return context.__cancelInviterComponent
}

function createHost(storage) {
	const component = loadComponent(storage.uni)
	const host = Object.assign({}, component.data(), {
		$set(target, key, value) {
			target[key] = value
		},
		$delete(target, key) {
			delete target[key]
		}
	})
	Object.keys(component.methods).forEach(name => {
		host[name] = component.methods[name].bind(host)
	})
	return host
}

function configureRelationshipFailure(host, clearRelations, countRelations) {
	host.targetUser = {
		_id: 'failure-user',
		my_invite_code: 'ABC123',
		vip: true,
		vip_expire_date: 123456789
	}
	host.createWorkflowOperations = operationContext => ({
		assertOperationLock: (targetUserId, phase) => {
			assert.equal(targetUserId, host.targetUser._id)
			host.assertOperationContext(operationContext, phase)
		},
		clearRelations,
		countRelations,
		cancelVip: async () => {
			throw new Error('VIP不应执行')
		},
		readTargetUser: async () => null,
		removeVipChanges: async () => 0,
		removePaymentOrders: async () => 0,
		countVipChanges: async () => 0,
		countPaymentOrders: async () => 0
	})
}

test('逐用户 key 隔离：A/B 状态互不覆盖，删除 A 不影响 B', () => {
	const storage = createStorage()
	const host = createHost(storage)
	const contextA = host.beginCoreOperation({ _id: 'user-A', my_invite_code: 'AAA111' })
	const contextB = host.beginCoreOperation({ _id: 'user-B', my_invite_code: 'BBB222' })
	const keyA = host.getOperationStorageKey('user-A')
	const keyB = host.getOperationStorageKey('user-B')

	assert.notEqual(keyA, keyB)
	assert.equal(storage.values.size, 2)
	assert.equal(storage.values.get(keyA).operationId, contextA.record.operationId)
	assert.equal(storage.values.get(keyB).operationId, contextB.record.operationId)

	host.removeAndVerifyOperationRecord(contextA.record)
	assert.equal(storage.values.has(keyA), false)
	assert.equal(storage.values.has(keyB), true)
	assert.equal(
		host.assertOperationContext(contextB, OPERATION_PHASES.blockedOnly).operationId,
		contextB.record.operationId
	)
})

test('operationId 不匹配时禁止阶段转换和删除', () => {
	const storage = createStorage()
	const host = createHost(storage)
	const ownedContext = host.beginCoreOperation({ _id: 'same-user', my_invite_code: 'ABC123' })
	const key = host.getOperationStorageKey('same-user')
	const foreignRecord = createOperationRecord({
		targetUserId: 'same-user',
		inviteCode: 'ABC123',
		operationId: 'op-foreign-1234',
		phase: OPERATION_PHASES.blockedOnly
	}, Date.now())
	storage.values.set(key, serializeOperationRecord(foreignRecord))

	assert.throws(
		() => host.transitionOperationContext(ownedContext, OPERATION_PHASES.cleanupOnly),
		/其他页面替换或删除/
	)
	assert.throws(
		() => host.removeAndVerifyOperationRecord(ownedContext.record),
		/不能删除其他页面创建/
	)
	assert.equal(storage.values.get(key).operationId, foreignRecord.operationId)
})

test('安全状态写入后任一持久字段被篡改都不得开始核心操作', () => {
	const storage = createStorage()
	const originalSetStorageSync = storage.uni.setStorageSync
	storage.uni.setStorageSync = (key, value) => {
		originalSetStorageSync(key, { ...value, inviteCode: 'ZZZ999' })
	}
	const host = createHost(storage)

	assert.throws(
		() => host.beginCoreOperation({ _id: 'mutated-user', my_invite_code: 'ABC123' }),
		/写入后回读不一致/
	)
})

test('存储键枚举失败时全局 fail-closed', () => {
	const storage = createStorage()
	storage.uni.getStorageInfoSync = () => {
		throw new Error('枚举故障')
	}
	const host = createHost(storage)

	host.restorePendingCleanups()

	assert.equal(host.operationStorageReady, false)
	assert.match(host.operationStorageError, /枚举故障/)
	assert.equal(host.isCoreOperationLocked('any-user'), true)
	assert.throws(
		() => host.beginCoreOperation({ _id: 'any-user', my_invite_code: 'ABC123' }),
		/枚举故障/
	)
})

test('枚举成功但任一逐用户状态读取失败时仍全局 fail-closed', () => {
	const targetUserId = 'unreadable-user'
	const key = `cancel-inviter-phase-v2:${encodeURIComponent(targetUserId)}`
	const record = createOperationRecord({
		targetUserId,
		inviteCode: 'ABC123',
		operationId: 'op-unreadable-1234',
		phase: OPERATION_PHASES.blockedOnly
	}, Date.now())
	const storage = createStorage({ [key]: serializeOperationRecord(record) })
	const originalGetStorageSync = storage.uni.getStorageSync
	storage.uni.getStorageSync = storageKey => {
		if (storageKey === key) throw new Error('读取故障')
		return originalGetStorageSync(storageKey)
	}
	const host = createHost(storage)

	host.restorePendingCleanups()

	assert.equal(host.operationStorageReady, false)
	assert.match(host.operationStorageError, /全局禁止/)
	assert.match(host.blockedCoreUsers[targetUserId], /读取故障/)
	assert.equal(host.isCoreOperationLocked('other-user'), true)
})

test('旧聚合 key 迁移为逐用户 phase key，并保留 cleanup-only 与 blocked-only 语义', () => {
	const now = Date.now()
	const storage = createStorage({
		[LEGACY_STORAGE_KEY]: {
			version: 1,
			records: {
				'legacy-A': {
					targetUserId: 'legacy-A',
					inviteCode: 'AAA111',
					createdAt: now - 1000
				},
				'legacy-B': {
					targetUserId: 'legacy-B',
					inviteCode: 'BBB222',
					createdAt: now - 2000
				}
			},
			blockedTargetUserIds: ['legacy-blocked']
		}
	})
	const host = createHost(storage)

	host.restorePendingCleanups()

	assert.equal(storage.values.has(LEGACY_STORAGE_KEY), false)
	for (const targetUserId of ['legacy-A', 'legacy-B', 'legacy-blocked']) {
		assert.equal(storage.values.has(host.getOperationStorageKey(targetUserId)), true)
	}
	assert.equal(host.readOperationState('legacy-A').record.phase, OPERATION_PHASES.cleanupOnly)
	assert.equal(host.readOperationState('legacy-B').record.phase, OPERATION_PHASES.cleanupOnly)
	assert.equal(host.readOperationState('legacy-blocked').record.phase, OPERATION_PHASES.blockedOnly)
	assert.equal(host.completedCoreUsers['legacy-A'].recovered, true)
	assert.equal(host.completedCoreUsers['legacy-B'].recovered, true)
	assert.match(host.blockedCoreUsers['legacy-blocked'], /人工核对/)
	assert.equal(host.operationStorageReady, true)
})

test('关系清理成功但复核失败时页面与持久状态都必须保持 blocked-only', async () => {
	const storage = createStorage()
	const host = createHost(storage)
	configureRelationshipFailure(
		host,
		async () => 2,
		async () => { throw new Error('关系复核不可用') }
	)

	await host.cancelInviter()

	const key = host.getOperationStorageKey(host.targetUser._id)
	assert.equal(storage.values.has(key), true)
	assert.equal(host.readOperationState(host.targetUser._id).record.phase, OPERATION_PHASES.blockedOnly)
	assert.equal(host.isCoreOperationLocked(host.targetUser._id), true)
	assert.match(host.blockedCoreUsers[host.targetUser._id], /无法证明本次操作完全未修改/)
	assert.match(host.lastResult.message, /禁止重复完整流程/)
	assert.equal(storage.modals.length, 1)
})

test('关系清理超时后复核失败或仍有残留时都必须保持 blocked-only', async () => {
	for (const countRelations of [
		async () => { throw new Error('关系复核不可用') },
		async () => 3
	]) {
		const storage = createStorage()
		const host = createHost(storage)
		configureRelationshipFailure(
			host,
			async () => { throw new Error('关系清理超时') },
			countRelations
		)

		await host.cancelInviter()

		const key = host.getOperationStorageKey(host.targetUser._id)
		assert.equal(storage.values.has(key), true)
		assert.equal(host.readOperationState(host.targetUser._id).record.phase, OPERATION_PHASES.blockedOnly)
		assert.equal(host.isCoreOperationLocked(host.targetUser._id), true)
		assert.match(host.blockedCoreUsers[host.targetUser._id], /禁止重复完整流程/)
	}
})

test('关系清理明确返回0时复核失败可移除本次 blocked-only 锁', async () => {
	const storage = createStorage()
	const host = createHost(storage)
	configureRelationshipFailure(
		host,
		async () => 0,
		async () => { throw new Error('关系复核不可用') }
	)

	await host.cancelInviter()

	const key = host.getOperationStorageKey(host.targetUser._id)
	assert.equal(storage.values.has(key), false)
	assert.equal(host.isCoreOperationLocked(host.targetUser._id), false)
	assert.equal(host.blockedCoreUsers[host.targetUser._id], undefined)
})

const assert = require('assert')
const {
	LEGACY_STORAGE_KEY,
	META_STORE_NAME,
	BaselineStoreError,
	createBaselineStore
} = require('./violation-invitation-v2.baseline-store.js')

function clone(value) {
	return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function namedError(name, message) {
	const error = new Error(message)
	error.name = name
	return error
}

class FakeObjectStore {
	constructor(transaction, definition) {
		this.transaction = transaction
		this.definition = definition
	}

	get(key) {
		return this.transaction.request(() => clone(this.definition.records.get(key)))
	}

	getAll() {
		this.transaction.factory.getAllCount++
		return this.transaction.request(() => Array.from(this.definition.records.values(), clone))
	}

	getAllKeys() {
		return this.transaction.request(() => Array.from(this.definition.records.keys()))
	}

	count() {
		return this.transaction.request(() => this.definition.records.size)
	}

	put(value) {
		return this.transaction.request(() => {
			const key = value && value[this.definition.keyPath]
			if (key === undefined) throw namedError('DataError', 'missing keyPath')
			this.definition.records.set(key, clone(value))
			return key
		}, true)
	}

	delete(key) {
		return this.transaction.request(() => this.definition.records.delete(key), true)
	}

	clear() {
		return this.transaction.request(() => this.definition.records.clear(), true)
	}
}

class FakeTransaction {
	constructor(databaseState, storeNames, mode, factory) {
		this.databaseState = databaseState
		this.mode = mode
		this.factory = factory
		this.error = null
		this.oncomplete = null
		this.onabort = null
		this.onerror = null
		this.pending = 0
		this.finished = false
		this.aborted = false
		this.completionTimer = null
		this.stores = {}
		storeNames.forEach(storeName => {
			const source = databaseState.stores.get(storeName)
			if (!source) throw namedError('NotFoundError', `missing store ${storeName}`)
			this.stores[storeName] = {
				keyPath: source.keyPath,
				records: new Map(Array.from(source.records, ([key, value]) => [key, clone(value)]))
			}
		})
		this.scheduleCompletion()
	}

	objectStore(storeName) {
		if (!this.stores[storeName]) throw namedError('NotFoundError', `missing store ${storeName}`)
		return new FakeObjectStore(this, this.stores[storeName])
	}

	request(operation, write) {
		const request = {
			result: undefined,
			error: null,
			onsuccess: null,
			onerror: null
		}
		this.pending++
		this.factory.activeRequestCount++
		this.factory.maxActiveRequestCount = Math.max(
			this.factory.maxActiveRequestCount,
			this.factory.activeRequestCount
		)
		if (this.completionTimer) clearTimeout(this.completionTimer)
		setTimeout(() => {
			if (this.finished) {
				request.error = namedError('AbortError', 'transaction already aborted')
				if (request.onerror) request.onerror({ target: request })
				this.pending--
				this.factory.activeRequestCount--
				return
			}
			try {
				if (write && this.mode !== 'readwrite') throw namedError('ReadOnlyError', 'readonly transaction')
				if (write && this.factory.failNextWrite) {
					this.factory.failNextWrite = false
					throw namedError('QuotaExceededError', 'simulated IndexedDB quota failure')
				}
				if (write && Number.isInteger(this.factory.failWriteAfter)) {
					if (this.factory.failWriteAfter === 0) {
						this.factory.failWriteAfter = null
						throw namedError('QuotaExceededError', 'simulated late IndexedDB quota failure')
					}
					this.factory.failWriteAfter--
				}
				request.result = operation()
				if (request.onsuccess) request.onsuccess({ target: request })
			} catch (error) {
				request.error = error
				this.error = error
				if (request.onerror) request.onerror({ target: request })
				this.abort()
			} finally {
				this.pending--
				this.factory.activeRequestCount--
				this.scheduleCompletion()
			}
		}, 0)
		return request
	}

	scheduleCompletion() {
		if (this.finished || this.pending > 0) return
		if (this.completionTimer) clearTimeout(this.completionTimer)
		this.completionTimer = setTimeout(() => {
			if (this.finished || this.pending > 0) return
			this.finished = true
			if (this.aborted) {
				if (this.onabort) this.onabort({ target: this })
				return
			}
			if (this.mode === 'readwrite') {
				Object.keys(this.stores).forEach(storeName => {
					const target = this.databaseState.stores.get(storeName)
					target.records = new Map(Array.from(
						this.stores[storeName].records,
						([key, value]) => [key, clone(value)]
					))
				})
			}
			if (this.oncomplete) this.oncomplete({ target: this })
		}, 0)
	}

	abort() {
		if (this.finished || this.aborted) return
		this.aborted = true
		if (this.completionTimer) clearTimeout(this.completionTimer)
		this.completionTimer = setTimeout(() => {
			if (this.finished) return
			this.finished = true
			if (this.onabort) this.onabort({ target: this })
		}, 0)
	}
}

class FakeDatabase {
	constructor(state, factory) {
		this.state = state
		this.factory = factory
		this.onversionchange = null
		this.closed = false
	}

	get objectStoreNames() {
		return {
			contains: storeName => this.state.stores.has(storeName)
		}
	}

	createObjectStore(storeName, options) {
		if (this.state.stores.has(storeName)) throw namedError('ConstraintError', 'store exists')
		const definition = { keyPath: options.keyPath, records: new Map() }
		this.state.stores.set(storeName, definition)
		return definition
	}

	transaction(storeNames, mode) {
		if (this.closed) throw namedError('InvalidStateError', 'database closed')
		return new FakeTransaction(this.state, Array.isArray(storeNames) ? storeNames : [storeNames], mode, this.factory)
	}

	close() {
		this.closed = true
	}
}

class FakeIndexedDBFactory {
	constructor() {
		this.databases = new Map()
		this.failNextWrite = false
		this.failWriteAfter = null
		this.getAllCount = 0
		this.activeRequestCount = 0
		this.maxActiveRequestCount = 0
	}

	open(databaseName, version) {
		const request = {
			result: null,
			error: null,
			transaction: null,
			onupgradeneeded: null,
			onblocked: null,
			onerror: null,
			onsuccess: null
		}
		setTimeout(() => {
			let state = this.databases.get(databaseName)
			if (!state) {
				state = { version: 0, stores: new Map() }
				this.databases.set(databaseName, state)
			}
			if (version < state.version) {
				request.error = namedError('VersionError', 'requested older version')
				if (request.onerror) request.onerror({ target: request })
				return
			}
			const database = new FakeDatabase(state, this)
			request.result = database
			if (version > state.version) {
				let aborted = false
				request.transaction = { abort: () => { aborted = true } }
				if (request.onupgradeneeded) request.onupgradeneeded({ target: request })
				if (aborted) {
					request.error = namedError('AbortError', 'upgrade aborted')
					if (request.onerror) request.onerror({ target: request })
					return
				}
				state.version = version
			}
			if (request.onsuccess) request.onsuccess({ target: request })
		}, 0)
		return request
	}
}

function baselineEntry(label, pendingReview) {
	return {
		snapshot: {
			version: 1,
			inviterId: label,
			inviteeIds: [`${label}-invitee`],
			ipGroups: [],
			overallRisk: 'normal'
		},
		snapshotComplete: true,
		completeSnapshot: null,
		pendingReview: pendingReview !== false,
		pendingChange: pendingReview === false ? null : { firstDiscovery: true },
		firstSeenAt: 100,
		lastSeenAt: 100,
		reviewedAt: 0
	}
}

function createLegacyStorage(initialValue, options) {
	const values = new Map()
	if (initialValue !== undefined) values.set(LEGACY_STORAGE_KEY, clone(initialValue))
	return {
		values,
		getStorageSync(key) {
			if (options && options.failRead) throw new Error('simulated legacy read failure')
			return clone(values.get(key))
		},
		removeStorageSync(key) {
			if (options && options.failRemove) throw new Error('simulated legacy cleanup failure')
			values.delete(key)
		}
	}
}

async function assertRejectCode(promise, code) {
	let caught = null
	try {
		await promise
	} catch (error) {
		caught = error
	}
	assert.ok(caught instanceof BaselineStoreError, `expected BaselineStoreError ${code}`)
	assert.strictEqual(caught.code, code)
	return caught
}

async function run() {
	await assertRejectCode(
		createBaselineStore({ indexedDBFactory: null, legacyStorage: null }).initialize(),
		'INDEXEDDB_UNSUPPORTED'
	)

	const legacyBaseline = {
		version: 1,
		updatedAt: 100,
		inviters: {
			'a': baselineEntry('a'),
			'b': baselineEntry('b', false)
		}
	}
	const factory = new FakeIndexedDBFactory()
	const legacyStorage = createLegacyStorage(legacyBaseline)
	const warnings = []
	const store = createBaselineStore({
		indexedDBFactory: factory,
		legacyStorage,
		databaseName: 'baseline-main-test',
		onWarning: warning => warnings.push(warning)
	})
	const initialized = await store.initialize()
	assert.strictEqual(initialized.migrated, true)
	assert.strictEqual(initialized.baseline.revision, 1, 'legacy migration creates the first persisted revision')
	assert.deepStrictEqual(initialized.warnings, [])
	assert.strictEqual(warnings.length, 0)
	assert.strictEqual(factory.getAllCount, 0, 'initialization checks metadata without loading every inviter record')
	assert.strictEqual(legacyStorage.values.has(LEGACY_STORAGE_KEY), false, 'legacy key is removed only after migration commits')
	const getAllCountBeforeMetadata = factory.getAllCount
	assert.deepStrictEqual(await store.loadMetadata(), {
		version: 1,
		updatedAt: 100,
		revision: 1,
		recordCount: 2
	})
	assert.strictEqual(
		factory.getAllCount,
		getAllCountBeforeMetadata,
		'metadata reads must use count and never materialize inviter records'
	)

	const emptyMetadataFactory = new FakeIndexedDBFactory()
	const emptyMetadataStore = createBaselineStore({
		indexedDBFactory: emptyMetadataFactory,
		legacyStorage: null,
		databaseName: 'empty-metadata-test'
	})
	assert.deepStrictEqual(await emptyMetadataStore.loadMetadata(), {
		version: 1,
		updatedAt: 0,
		revision: 0,
		recordCount: 0
	})
	assert.strictEqual(emptyMetadataFactory.getAllCount, 0, 'empty metadata reads must not call getAll')
	await emptyMetadataStore.close()

	const corruptMetadataFactory = new FakeIndexedDBFactory()
	const corruptMetadataSeedStore = createBaselineStore({
		indexedDBFactory: corruptMetadataFactory,
		legacyStorage: null,
		databaseName: 'corrupt-metadata-test'
	})
	await corruptMetadataSeedStore.initialize()
	await corruptMetadataSeedStore.replaceAll({
		version: 1,
		updatedAt: 200,
		records: { corrupt: baselineEntry('corrupt') }
	}, 0)
	await corruptMetadataSeedStore.close()
	corruptMetadataFactory.databases
		.get('corrupt-metadata-test')
		.stores.get(META_STORE_NAME)
		.records.delete('baseline')
	const corruptMetadataStore = createBaselineStore({
		indexedDBFactory: corruptMetadataFactory,
		legacyStorage: null,
		databaseName: 'corrupt-metadata-test'
	})
	await assertRejectCode(corruptMetadataStore.loadMetadata(), 'DATABASE_CORRUPTED')
	assert.strictEqual(corruptMetadataFactory.getAllCount, 0, 'corruption checks must use count without calling getAll')
	await corruptMetadataStore.close()

	const largeRecords = {}
	for (let index = 0; index < 501; index++) {
		largeRecords[`large-${String(index).padStart(3, '0')}`] = baselineEntry(`large-${index}`)
	}
	const largeFactory = new FakeIndexedDBFactory()
	const largeStore = createBaselineStore({
		indexedDBFactory: largeFactory,
		legacyStorage: null,
		databaseName: 'bounded-request-test'
	})
	await largeStore.initialize()
	largeFactory.maxActiveRequestCount = 0
	await largeStore.replaceAll({ version: 1, updatedAt: 50, records: largeRecords }, 0)
	assert.ok(
		largeFactory.maxActiveRequestCount <= 200,
		'large baseline writes must cap simultaneous IndexedDB requests at 200'
	)
	largeFactory.maxActiveRequestCount = 0
	const largeSubset = await largeStore.loadRecords(Object.keys(largeRecords))
	assert.strictEqual(Object.keys(largeSubset.records).length, 501)
	assert.ok(
		largeFactory.maxActiveRequestCount <= 200,
		'large baseline reads must cap simultaneous IndexedDB requests at 200'
	)
	const largeCommittedBaseline = await largeStore.loadAll()
	const changedLargeRecords = Object.fromEntries(Object.keys(largeRecords).map(inviterId => [
		inviterId,
		{ ...baselineEntry(inviterId), lastSeenAt: 999 }
	]))
	largeFactory.failWriteAfter = 250
	await assertRejectCode(largeStore.replaceAll({
		version: 1,
		updatedAt: 999,
		records: changedLargeRecords
	}, largeCommittedBaseline.revision), 'DATABASE_WRITE_FAILED')
	assert.deepStrictEqual(
		await largeStore.loadAll(),
		largeCommittedBaseline,
		'a failure after the first 200-request batch must roll back the entire IndexedDB transaction'
	)
	await largeStore.close()
	let loaded = await store.loadAll()
	assert.strictEqual(loaded.updatedAt, 100)
	assert.strictEqual(loaded.revision, 1)
	assert.deepStrictEqual(Object.keys(loaded.records).sort(), ['a', 'b'])

	const mergeResult = await store.mergeRecords({
		a: { ...baselineEntry('a'), lastSeenAt: 200 },
		c: baselineEntry('c')
	}, 200, loaded.revision)
	assert.deepStrictEqual(mergeResult, { updatedAt: 200, mergedCount: 2, revision: 2 })
	loaded = await store.loadAll()
	assert.deepStrictEqual(Object.keys(loaded.records).sort(), ['a', 'b', 'c'])
	assert.strictEqual(loaded.records.a.lastSeenAt, 200)
	assert.strictEqual(loaded.records.b.lastSeenAt, 100, 'merge does not remove unscanned inviters')
	const getAllCountBeforeSubset = factory.getAllCount
	const subset = await store.loadRecords(['c', 'missing', 'c'])
	assert.deepStrictEqual(Object.keys(subset.records), ['c'])
	assert.strictEqual(subset.updatedAt, 200, 'subset loads preserve global baseline metadata for change semantics')
	assert.strictEqual(subset.revision, 2, 'subset loads return the CAS revision')
	assert.strictEqual(factory.getAllCount, getAllCountBeforeSubset, 'subset reads must not materialize the complete baseline')
	const subsetAlias = await store.loadSubset(new Set(['a']))
	assert.deepStrictEqual(Object.keys(subsetAlias.records), ['a'])

	const pruneResult = await store.pruneExcept(new Set(['a', 'c']), 300, subset.revision)
	assert.deepStrictEqual(pruneResult.removedIds, ['b'])
	assert.strictEqual(pruneResult.revision, 3)
	loaded = await store.loadAll()
	assert.deepStrictEqual(Object.keys(loaded.records).sort(), ['a', 'c'])
	assert.strictEqual(loaded.updatedAt, 300)

	await assertRejectCode(store.saveReviewed('a', 400), 'EXPECTED_REVISION_REQUIRED')
	const reviewed = await store.saveReviewed('a', 400, loaded.revision)
	assert.strictEqual(reviewed.entry.pendingReview, false)
	assert.strictEqual(reviewed.entry.pendingChange, null)
	assert.strictEqual(reviewed.entry.reviewedAt, 400)
	assert.strictEqual(reviewed.revision, 4)
	loaded = await store.loadAll()
	assert.strictEqual(loaded.records.a.pendingReview, false)
	assert.strictEqual(loaded.records.c.pendingReview, true, 'saving one reviewed inviter does not rewrite another inviter')
	assert.strictEqual(loaded.updatedAt, 400)
	await assertRejectCode(store.saveReviewed('missing', 500, reviewed.revision), 'BASELINE_RECORD_NOT_FOUND')

	await assertRejectCode(store.replaceAll({
		version: 1,
		updatedAt: 600,
		records: { replacement: baselineEntry('replacement') }
	}), 'EXPECTED_REVISION_REQUIRED')
	await store.replaceAll({
		version: 1,
		updatedAt: 600,
		records: { replacement: baselineEntry('replacement') }
	}, loaded.revision)
	loaded = await store.loadAll()
	assert.deepStrictEqual(Object.keys(loaded.records), ['replacement'])
	assert.strictEqual(loaded.updatedAt, 600)
	assert.strictEqual(loaded.revision, 5)

	const stableBaseline = clone(loaded)
	factory.failWriteAfter = 2
	await assertRejectCode(store.replaceAll({
		version: 1,
		updatedAt: 700,
			records: {
			failed: baselineEntry('failed'),
			'also-failed': baselineEntry('also-failed')
		}
	}, stableBaseline.revision), 'DATABASE_WRITE_FAILED')
	loaded = await store.loadAll()
	assert.deepStrictEqual(loaded, stableBaseline, 'failed IndexedDB transactions must preserve the last committed baseline')

	assert.deepStrictEqual(await store.clearAll(), { warnings: [], revision: 6 })
	loaded = await store.loadAll()
	assert.deepStrictEqual(loaded, { version: 1, updatedAt: 0, revision: 6, records: {} })
	await store.close()

	const cleanupWarnings = []
	const cleanupLegacy = createLegacyStorage(legacyBaseline, { failRemove: true })
	const cleanupFactory = new FakeIndexedDBFactory()
	const cleanupStore = createBaselineStore({
		indexedDBFactory: cleanupFactory,
		legacyStorage: cleanupLegacy,
		databaseName: 'cleanup-warning-test',
		onWarning: warning => cleanupWarnings.push(warning)
	})
	const cleanupMigration = await cleanupStore.initialize()
	assert.strictEqual(cleanupMigration.migrated, true)
	assert.strictEqual(cleanupMigration.warnings[0].code, 'LEGACY_CLEANUP_FAILED')
	assert.strictEqual(cleanupWarnings[0].code, 'LEGACY_CLEANUP_FAILED')
	assert.strictEqual(cleanupLegacy.values.has(LEGACY_STORAGE_KEY), true)
	assert.deepStrictEqual(Object.keys((await cleanupStore.loadAll()).records).sort(), ['a', 'b'])
	const cleanupClear = await cleanupStore.clearAll()
	assert.strictEqual(cleanupClear.warnings[0].code, 'LEGACY_CLEANUP_FAILED')
	assert.deepStrictEqual(await cleanupStore.loadAll(), { version: 1, updatedAt: 0, revision: 2, records: {} }, 'a cleanup warning must not resurrect legacy data in the active page')
	await cleanupStore.close()
	const cleanupReloadedStore = createBaselineStore({
		indexedDBFactory: cleanupFactory,
		legacyStorage: cleanupLegacy,
		databaseName: 'cleanup-warning-test'
	})
	assert.strictEqual((await cleanupReloadedStore.initialize()).migrated, false)
	assert.deepStrictEqual(await cleanupReloadedStore.loadAll(), { version: 1, updatedAt: 0, revision: 2, records: {} }, 'the clear tombstone prevents failed legacy cleanup from resurrecting data after reload')

	const invalidLegacy = createLegacyStorage({ version: 99, updatedAt: 1, records: {} })
	const invalidStore = createBaselineStore({
		indexedDBFactory: new FakeIndexedDBFactory(),
		legacyStorage: invalidLegacy,
		databaseName: 'invalid-legacy-test'
	})
	await assertRejectCode(invalidStore.initialize(), 'LEGACY_BASELINE_INVALID')
	assert.strictEqual(invalidLegacy.values.has(LEGACY_STORAGE_KEY), true, 'invalid legacy data must never be deleted')
	assert.deepStrictEqual(await invalidStore.clearAll(), { warnings: [], revision: 1 }, 'explicit clear remains available to recover from invalid legacy data')
	assert.strictEqual(invalidLegacy.values.has(LEGACY_STORAGE_KEY), false)
	assert.deepStrictEqual(await invalidStore.loadAll(), { version: 1, updatedAt: 0, revision: 1, records: {} })

	const failedMigrationFactory = new FakeIndexedDBFactory()
	failedMigrationFactory.failNextWrite = true
	const retainedLegacy = createLegacyStorage(legacyBaseline)
	const failedMigrationStore = createBaselineStore({
		indexedDBFactory: failedMigrationFactory,
		legacyStorage: retainedLegacy,
		databaseName: 'failed-migration-test'
	})
	await assertRejectCode(failedMigrationStore.initialize(), 'DATABASE_WRITE_FAILED')
	assert.strictEqual(retainedLegacy.values.has(LEGACY_STORAGE_KEY), true, 'legacy data remains when IndexedDB migration does not commit')

	const raceFactory = new FakeIndexedDBFactory()
	const scanTabStore = createBaselineStore({
		indexedDBFactory: raceFactory,
		legacyStorage: null,
		databaseName: 'cross-tab-cas-test'
	})
	const reviewTabStore = createBaselineStore({
		indexedDBFactory: raceFactory,
		legacyStorage: null,
		databaseName: 'cross-tab-cas-test'
	})
	await scanTabStore.initialize()
	await scanTabStore.replaceAll({
		version: 1,
		updatedAt: 1000,
		records: {
			raceA: baselineEntry('raceA'),
			raceB: baselineEntry('raceB')
		}
	}, 0)
	await reviewTabStore.initialize()
	const staleReplaceView = await scanTabStore.loadRecords(['raceA', 'raceB'])
	assert.strictEqual(staleReplaceView.revision, 1)
	const reviewA = await reviewTabStore.saveReviewed('raceA', 1100, staleReplaceView.revision)
	assert.strictEqual(reviewA.revision, 2)
	const afterReviewA = await reviewTabStore.loadAll()
	await assertRejectCode(scanTabStore.replaceAll({
		version: 1,
		updatedAt: 1200,
		records: staleReplaceView.records
	}, staleReplaceView.revision), 'BASELINE_CONFLICT')
	assert.deepStrictEqual(
		await reviewTabStore.loadAll(),
		afterReviewA,
		'a stale full-scan replace must perform zero writes and cannot undo another tab review'
	)

	const staleMergeView = await scanTabStore.loadRecords(['raceB'])
	assert.strictEqual(staleMergeView.revision, 2)
	const reviewB = await reviewTabStore.saveReviewed('raceB', 1300, staleMergeView.revision)
	assert.strictEqual(reviewB.revision, 3)
	const afterReviewB = await reviewTabStore.loadAll()
	await assertRejectCode(scanTabStore.mergeBaseline({
		version: 1,
		updatedAt: 1400,
		records: staleMergeView.records
	}, staleMergeView.revision), 'BASELINE_CONFLICT')
	assert.deepStrictEqual(
		await reviewTabStore.loadAll(),
		afterReviewB,
		'a stale scoped-scan merge must perform zero writes and cannot undo another tab review'
	)

	const oldReviewView = await reviewTabStore.loadRecords(['raceA'])
	const pendingChangeX = {
		...oldReviewView.records.raceA,
		pendingReview: true,
		pendingChange: { firstDiscovery: false, newInviteeIds: ['change-x'] }
	}
	const changeXWrite = await scanTabStore.mergeRecords(
		{ raceA: pendingChangeX },
		1500,
		oldReviewView.revision
	)
	const staleReviewView = await reviewTabStore.loadRecords(['raceA'])
	assert.strictEqual(staleReviewView.revision, changeXWrite.revision)
	assert.deepStrictEqual(staleReviewView.records.raceA.pendingChange.newInviteeIds, ['change-x'])

	const pendingChangeY = {
		...staleReviewView.records.raceA,
		pendingReview: true,
		pendingChange: { firstDiscovery: false, newInviteeIds: ['change-y'] }
	}
	const changeYWrite = await scanTabStore.mergeRecords(
		{ raceA: pendingChangeY },
		1600,
		staleReviewView.revision
	)
	const afterChangeY = await scanTabStore.loadAll()
	assert.strictEqual(changeYWrite.revision, staleReviewView.revision + 1)
	await assertRejectCode(
		reviewTabStore.saveReviewed('raceA', 1700, staleReviewView.revision),
		'BASELINE_CONFLICT'
	)
	assert.deepStrictEqual(
		await scanTabStore.loadAll(),
		afterChangeY,
		'a stale review must perform zero writes and cannot approve a newer change from another tab'
	)
	assert.strictEqual(afterChangeY.records.raceA.pendingReview, true)
	assert.deepStrictEqual(afterChangeY.records.raceA.pendingChange.newInviteeIds, ['change-y'])

	const oldMetaFactory = new FakeIndexedDBFactory()
	const oldMetaSeedStore = createBaselineStore({
		indexedDBFactory: oldMetaFactory,
		legacyStorage: null,
		databaseName: 'old-meta-revision-test'
	})
	await oldMetaSeedStore.initialize()
	await oldMetaSeedStore.replaceAll({
		version: 1,
		updatedAt: 1500,
		records: { oldMeta: baselineEntry('oldMeta') }
	}, 0)
	await oldMetaSeedStore.close()
	const oldMetaState = oldMetaFactory.databases.get('old-meta-revision-test')
	delete oldMetaState.stores.get(META_STORE_NAME).records.get('baseline').revision
	const upgradedMetaStore = createBaselineStore({
		indexedDBFactory: oldMetaFactory,
		legacyStorage: null,
		databaseName: 'old-meta-revision-test'
	})
	assert.strictEqual((await upgradedMetaStore.loadRecords(['oldMeta'])).revision, 0, 'old IndexedDB meta without revision starts at revision zero')
	const upgradedMetaWrite = await upgradedMetaStore.mergeRecords(
		{ oldMeta: baselineEntry('oldMeta') },
		1600,
		0
	)
	assert.strictEqual(upgradedMetaWrite.revision, 1)

	console.log('violation-invitation-v2 baseline store tests passed')
}

run().catch(error => {
	console.error(error)
	process.exitCode = 1
})

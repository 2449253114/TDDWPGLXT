const DEFAULT_DATABASE_NAME = 'violation_invitation_v2_baseline'
const DATABASE_VERSION = 1
const RECORD_STORE_NAME = 'inviter_records'
const META_STORE_NAME = 'meta'
const META_KEY = 'baseline'
const LEGACY_STORAGE_KEY = 'violation_invitation_v2_baseline'
const INDEXED_DB_REQUEST_BATCH_SIZE = 200

function BaselineStoreError(code, message, cause) {
	this.name = 'BaselineStoreError'
	this.code = code
	this.message = message
	this.cause = cause || null
	if (Error.captureStackTrace) Error.captureStackTrace(this, BaselineStoreError)
}

BaselineStoreError.prototype = Object.create(Error.prototype)
BaselineStoreError.prototype.constructor = BaselineStoreError

function asStoreError(error, code, message) {
	if (error instanceof BaselineStoreError) return error
	const detail = error && error.message ? `：${error.message}` : ''
	return new BaselineStoreError(code, `${message}${detail}`, error)
}

function emptyBaseline() {
	return {
		version: 1,
		updatedAt: 0,
		revision: 0,
		records: {}
	}
}

function isRecord(value) {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeInviterId(value) {
	const inviterId = String(value === undefined || value === null ? '' : value).trim()
	if (!inviterId) {
		throw new BaselineStoreError('INVALID_BASELINE', '邀请人基线记录缺少有效 inviterId')
	}
	return inviterId
}

function normalizeUpdatedAt(value, fallback) {
	const candidate = value === undefined ? fallback : value
	const updatedAt = Number(candidate)
	if (!Number.isFinite(updatedAt) || updatedAt < 0) {
		throw new BaselineStoreError('INVALID_BASELINE', '基线 updatedAt 必须是非负时间戳')
	}
	return updatedAt
}

function normalizeRevision(value, fallback, code) {
	const candidate = value === undefined ? fallback : value
	const revision = Number(candidate)
	if (!Number.isInteger(revision) || revision < 0) {
		throw new BaselineStoreError(code || 'INVALID_BASELINE', '基线 revision 必须是非负整数')
	}
	return revision
}

function requireExpectedRevision(value) {
	if (value === undefined || value === null) {
		throw new BaselineStoreError('EXPECTED_REVISION_REQUIRED', '保存检测基线必须提供 expectedRevision')
	}
	return normalizeRevision(value, 0, 'INVALID_ARGUMENT')
}

function defineRecord(records, inviterId, entry) {
	Object.defineProperty(records, inviterId, {
		value: entry,
		enumerable: true,
		configurable: true,
		writable: true
	})
}

function extractBaselineRecords(value) {
	if (!isRecord(value)) {
		throw new BaselineStoreError('INVALID_BASELINE', '本地检测基线必须是对象')
	}
	if (isRecord(value.records)) return value.records
	if (isRecord(value.inviters)) return value.inviters
	if (isRecord(value.snapshots)) return value.snapshots
	if (value.records === undefined && value.inviters === undefined && value.snapshots === undefined) return {}
	throw new BaselineStoreError('INVALID_BASELINE', '本地检测基线 records 结构无效')
}

function normalizeRecordMap(value) {
	if (!isRecord(value)) {
		throw new BaselineStoreError('INVALID_BASELINE', '邀请人基线记录集合必须是对象')
	}
	const records = {}
	Object.keys(value).forEach(rawInviterId => {
		const inviterId = normalizeInviterId(rawInviterId)
		const entry = value[rawInviterId]
		if (!isRecord(entry)) {
			throw new BaselineStoreError('INVALID_BASELINE', `邀请人 ${inviterId} 的基线记录结构无效`)
		}
		defineRecord(records, inviterId, entry)
	})
	return records
}

function normalizeBaseline(value) {
	const source = value === undefined || value === null ? emptyBaseline() : value
	const version = Number(source.version === undefined ? 1 : source.version)
	if (!Number.isInteger(version) || version !== 1) {
		throw new BaselineStoreError('UNSUPPORTED_BASELINE_VERSION', `不支持的检测基线版本：${source.version}`)
	}
	return {
		version,
		updatedAt: normalizeUpdatedAt(source.updatedAt, 0),
		revision: normalizeRevision(source.revision, 0),
		records: normalizeRecordMap(extractBaselineRecords(source))
	}
}

function requestToPromise(request, code, message) {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(asStoreError(request.error, code, message))
	})
}

async function mapRequestsInBatches(items, mapper, batchSize = INDEXED_DB_REQUEST_BATCH_SIZE) {
	const source = Array.isArray(items) ? items : []
	const results = []
	for (let start = 0; start < source.length; start += batchSize) {
		const batch = source.slice(start, start + batchSize)
		const values = await Promise.all(batch.map((item, offset) => mapper(item, start + offset)))
		results.push(...values)
	}
	return results
}

function transactionCompletion(transaction, label) {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve()
		transaction.onabort = () => reject(asStoreError(
			transaction.error,
			'TRANSACTION_ABORTED',
			`${label}事务已中止`
		))
		transaction.onerror = () => {}
	})
}

async function runTransaction(database, storeNames, mode, label, operation) {
	let transaction
	try {
		transaction = database.transaction(storeNames, mode)
	} catch (error) {
		throw asStoreError(error, 'TRANSACTION_OPEN_FAILED', `无法开始${label}事务`)
	}
	const completed = transactionCompletion(transaction, label)
	try {
		const result = await operation(transaction)
		await completed
		return result
	} catch (error) {
		try {
			transaction.abort()
		} catch (abortError) {
			// The transaction may already have aborted because of the failed request.
		}
		await completed.catch(() => {})
		throw asStoreError(error, 'TRANSACTION_FAILED', `${label}失败`)
	}
}

function containsStore(database, storeName) {
	return Boolean(
		database.objectStoreNames &&
		typeof database.objectStoreNames.contains === 'function' &&
		database.objectStoreNames.contains(storeName)
	)
}

function openDatabase(indexedDBFactory, databaseName) {
	if (!indexedDBFactory || typeof indexedDBFactory.open !== 'function') {
		return Promise.reject(new BaselineStoreError(
			'INDEXEDDB_UNSUPPORTED',
			'当前浏览器不支持 IndexedDB，无法安全保存邀请违规检测基线'
		))
	}
	return new Promise((resolve, reject) => {
		let request
		let settled = false
		try {
			request = indexedDBFactory.open(databaseName, DATABASE_VERSION)
		} catch (error) {
			reject(asStoreError(error, 'DATABASE_OPEN_FAILED', '打开检测基线数据库失败'))
			return
		}
		request.onupgradeneeded = () => {
			try {
				const database = request.result
				if (!containsStore(database, RECORD_STORE_NAME)) {
					database.createObjectStore(RECORD_STORE_NAME, { keyPath: 'inviterId' })
				}
				if (!containsStore(database, META_STORE_NAME)) {
					database.createObjectStore(META_STORE_NAME, { keyPath: 'key' })
				}
			} catch (error) {
				settled = true
				try {
					request.transaction.abort()
				} catch (abortError) {
					// The upgrade transaction may already be inactive.
				}
				reject(asStoreError(error, 'DATABASE_UPGRADE_FAILED', '创建检测基线数据库结构失败'))
			}
		}
		request.onerror = () => {
			if (settled) return
			settled = true
			reject(asStoreError(request.error, 'DATABASE_OPEN_FAILED', '打开检测基线数据库失败'))
		}
		request.onblocked = () => {
			if (settled) return
			settled = true
			reject(new BaselineStoreError(
				'DATABASE_OPEN_BLOCKED',
				'检测基线数据库升级被其他页面阻塞，请关闭同一后台的其他标签页后重试'
			))
		}
		request.onsuccess = () => {
			const database = request.result
			if (settled) {
				database.close()
				return
			}
			settled = true
			database.onversionchange = () => database.close()
			resolve(database)
		}
	})
}

function metaRow(baseline) {
	return {
		key: META_KEY,
		version: baseline.version,
		updatedAt: baseline.updatedAt,
		revision: baseline.revision
	}
}

function baselineFromMeta(meta, records) {
	return normalizeBaseline({
		version: meta.version,
		updatedAt: meta.updatedAt,
		revision: meta.revision,
		records
	})
}

function nextBaselineRevision(meta, expectedRevision) {
	const currentRevision = meta ? normalizeRevision(meta.revision, 0) : 0
	if (currentRevision !== expectedRevision) {
		throw new BaselineStoreError(
			'BASELINE_CONFLICT',
			`检测基线已被其他页面更新：期望 revision ${expectedRevision}，当前 revision ${currentRevision}`
		)
	}
	return currentRevision + 1
}

function recordRows(records) {
	return Object.keys(records).map(inviterId => ({
		inviterId,
		entry: records[inviterId]
	}))
}

async function readDatabaseState(database) {
	return runTransaction(
		database,
		[RECORD_STORE_NAME, META_STORE_NAME],
		'readonly',
		'读取检测基线',
		async transaction => {
			const recordStore = transaction.objectStore(RECORD_STORE_NAME)
			const metaStore = transaction.objectStore(META_STORE_NAME)
			const [rows, meta] = await Promise.all([
				requestToPromise(recordStore.getAll(), 'DATABASE_READ_FAILED', '读取邀请人基线记录失败'),
				requestToPromise(metaStore.get(META_KEY), 'DATABASE_READ_FAILED', '读取检测基线元数据失败')
			])
			if (!meta && rows.length) {
				throw new BaselineStoreError(
					'DATABASE_CORRUPTED',
					'检测基线数据库存在邀请人记录但缺少元数据，未自动覆盖该数据'
				)
			}
			if (!meta) return { initialized: false, baseline: emptyBaseline() }
			const records = {}
			rows.forEach(row => {
				if (!row || !isRecord(row.entry)) {
					throw new BaselineStoreError('DATABASE_CORRUPTED', '检测基线数据库中存在无效邀请人记录')
				}
				defineRecord(records, normalizeInviterId(row.inviterId), row.entry)
			})
			return {
				initialized: true,
				baseline: baselineFromMeta(meta, records)
			}
		}
	)
}

async function readDatabaseMetadata(database) {
	return runTransaction(
		database,
		[RECORD_STORE_NAME, META_STORE_NAME],
		'readonly',
		'读取检测基线元数据',
		async transaction => {
			const recordStore = transaction.objectStore(RECORD_STORE_NAME)
			const metaStore = transaction.objectStore(META_STORE_NAME)
			const [recordCount, meta] = await Promise.all([
				requestToPromise(recordStore.count(), 'DATABASE_READ_FAILED', '统计邀请人基线记录失败'),
				requestToPromise(metaStore.get(META_KEY), 'DATABASE_READ_FAILED', '读取检测基线元数据失败')
			])
			if (!meta && recordCount) {
				throw new BaselineStoreError(
					'DATABASE_CORRUPTED',
					'检测基线数据库存在邀请人记录但缺少元数据，未自动覆盖该数据'
				)
			}
			if (!meta) return { initialized: false, baseline: emptyBaseline(), recordCount: 0 }
			return {
				initialized: true,
				baseline: baselineFromMeta(meta, {}),
				recordCount
			}
		}
	)
}

async function readDatabaseRecords(database, inviterIds) {
	return runTransaction(
		database,
		[RECORD_STORE_NAME, META_STORE_NAME],
		'readonly',
		'按邀请人读取检测基线',
		async transaction => {
			const recordStore = transaction.objectStore(RECORD_STORE_NAME)
			const metaStore = transaction.objectStore(META_STORE_NAME)
			const meta = await requestToPromise(
				metaStore.get(META_KEY),
				'DATABASE_READ_FAILED',
				'读取检测基线元数据失败'
			)
			const values = await mapRequestsInBatches(inviterIds, inviterId => requestToPromise(
				recordStore.get(inviterId),
				'DATABASE_READ_FAILED',
				`读取邀请人 ${inviterId} 的基线记录失败`
			))
			const records = {}
			values.forEach((row, index) => {
				if (!row) return
				if (!isRecord(row.entry) || String(row.inviterId) !== inviterIds[index]) {
					throw new BaselineStoreError('DATABASE_CORRUPTED', `邀请人 ${inviterIds[index]} 的基线记录结构无效`)
				}
				defineRecord(records, inviterIds[index], row.entry)
			})
			if (!meta) {
				if (Object.keys(records).length) {
					throw new BaselineStoreError('DATABASE_CORRUPTED', '检测基线数据库存在邀请人记录但缺少元数据')
				}
				return emptyBaseline()
			}
			return baselineFromMeta(meta, records)
		}
	)
}

async function replaceDatabaseBaseline(database, baseline, expectedRevision) {
	const rows = recordRows(baseline.records)
	return runTransaction(
		database,
		[RECORD_STORE_NAME, META_STORE_NAME],
		'readwrite',
		'替换检测基线',
		async transaction => {
			const recordStore = transaction.objectStore(RECORD_STORE_NAME)
			const metaStore = transaction.objectStore(META_STORE_NAME)
			const currentMeta = await requestToPromise(
				metaStore.get(META_KEY),
				'DATABASE_READ_FAILED',
				'读取检测基线 revision 失败'
			)
			const committedBaseline = {
				...baseline,
				revision: nextBaselineRevision(currentMeta, expectedRevision)
			}
			await requestToPromise(
				recordStore.clear(),
				'DATABASE_WRITE_FAILED',
				'清空旧邀请人基线记录失败'
			)
			await mapRequestsInBatches(rows, row => requestToPromise(
					recordStore.put(row),
					'DATABASE_WRITE_FAILED',
					`保存邀请人 ${row.inviterId} 的基线记录失败`
				))
			await requestToPromise(
				metaStore.put(metaRow(committedBaseline)),
				'DATABASE_WRITE_FAILED',
				'保存检测基线元数据失败'
			)
			return committedBaseline
		}
	)
}

function resolveGlobalIndexedDB(options) {
	if (Object.prototype.hasOwnProperty.call(options, 'indexedDBFactory')) return options.indexedDBFactory
	return typeof indexedDB === 'undefined' ? null : indexedDB
}

function resolveLegacyStorage(options) {
	if (Object.prototype.hasOwnProperty.call(options, 'legacyStorage')) return options.legacyStorage
	return typeof uni === 'undefined' ? null : uni
}

function readLegacyBaseline(storage, storageKey) {
	if (!storage || typeof storage.getStorageSync !== 'function') return null
	let value
	try {
		value = storage.getStorageSync(storageKey)
	} catch (error) {
		throw asStoreError(error, 'LEGACY_READ_FAILED', '读取旧版单键检测基线失败')
	}
	if (value === undefined || value === null || value === '') return null
	try {
		return normalizeBaseline(value)
	} catch (error) {
		throw new BaselineStoreError(
			'LEGACY_BASELINE_INVALID',
			`旧版单键检测基线结构无效，未覆盖或删除原数据：${error.message}`,
			error
		)
	}
}

function cleanupLegacyBaseline(storage, storageKey, completedAction) {
	if (!storage) return null
	if (typeof storage.removeStorageSync !== 'function') {
		return {
			code: 'LEGACY_CLEANUP_FAILED',
			message: `${completedAction}，但当前存储接口无法清理旧单键数据`,
			cause: null
		}
	}
	try {
		storage.removeStorageSync(storageKey)
		return null
	} catch (error) {
		return {
			code: 'LEGACY_CLEANUP_FAILED',
			message: `${completedAction}，但清理旧单键数据失败：${error && error.message ? error.message : '未知错误'}`,
			cause: error
		}
	}
}

function createBaselineStore(rawOptions) {
	const options = rawOptions || {}
	const indexedDBFactory = resolveGlobalIndexedDB(options)
	const legacyStorage = resolveLegacyStorage(options)
	const databaseName = String(options.databaseName || DEFAULT_DATABASE_NAME)
	const legacyStorageKey = String(options.legacyStorageKey || LEGACY_STORAGE_KEY)
	const onWarning = typeof options.onWarning === 'function' ? options.onWarning : null
	let databasePromise = null
	let initializePromise = null
	let writeTail = Promise.resolve()

	function reportWarning(warning) {
		if (!warning) return []
		if (onWarning) {
			try {
				onWarning(warning)
			} catch (callbackError) {
				// The operation result still returns the warning if the UI callback fails.
			}
		}
		return [warning]
	}

	function getDatabase() {
		if (!databasePromise) {
			databasePromise = openDatabase(indexedDBFactory, databaseName).catch(error => {
				databasePromise = null
				throw error
			})
		}
		return databasePromise
	}

	async function performInitialize() {
		const database = await getDatabase()
		const state = await readDatabaseMetadata(database)
		if (state.initialized) {
			return { baseline: state.baseline, migrated: false, warnings: [] }
		}
		const legacyBaseline = readLegacyBaseline(legacyStorage, legacyStorageKey)
		if (!legacyBaseline) {
			return { baseline: state.baseline, migrated: false, warnings: [] }
		}
		let migratedBaseline
		let migrated = true
		try {
			migratedBaseline = await replaceDatabaseBaseline(
				database,
				legacyBaseline,
				state.baseline.revision
			)
		} catch (error) {
			if (!error || error.code !== 'BASELINE_CONFLICT') throw error
			const latestState = await readDatabaseMetadata(database)
			if (!latestState.initialized) throw error
			migratedBaseline = latestState.baseline
			migrated = false
		}
		const warning = cleanupLegacyBaseline(
			legacyStorage,
			legacyStorageKey,
			migrated ? '旧基线已成功迁移到 IndexedDB' : 'IndexedDB 基线已由其他页面完成初始化'
		)
		const warnings = reportWarning(warning)
		return { baseline: migratedBaseline, migrated, warnings }
	}

	function initialize() {
		if (!initializePromise) {
			initializePromise = performInitialize().catch(error => {
				initializePromise = null
				throw error
			})
		}
		return initializePromise
	}

	function enqueueWrite(operation, initializeFirst) {
		const shouldInitialize = initializeFirst !== false
		const result = writeTail
			.then(() => {
				if (shouldInitialize) return initialize()
				return initializePromise ? initializePromise.catch(() => {}) : null
			})
			.then(() => getDatabase())
			.then(operation)
		writeTail = result.catch(() => {})
		return result
	}

	async function loadAll() {
		await initialize()
		await writeTail
		const database = await getDatabase()
		const state = await readDatabaseState(database)
		return state.baseline
	}

	async function loadMetadata() {
		await initialize()
		await writeTail
		const database = await getDatabase()
		const state = await readDatabaseMetadata(database)
		return {
			version: state.baseline.version,
			updatedAt: state.baseline.updatedAt,
			revision: state.baseline.revision,
			recordCount: state.recordCount
		}
	}

	async function loadRecords(rawInviterIds) {
		if (!Array.isArray(rawInviterIds) && !(rawInviterIds instanceof Set)) {
			throw new BaselineStoreError('INVALID_ARGUMENT', 'loadRecords 需要邀请人 ID 数组或 Set')
		}
		const inviterIds = Array.from(new Set(Array.from(rawInviterIds, normalizeInviterId)))
		await initialize()
		await writeTail
		const database = await getDatabase()
		return readDatabaseRecords(database, inviterIds)
	}

	function replaceAll(value, rawExpectedRevision) {
		let baseline
		let expectedRevision
		try {
			baseline = normalizeBaseline(value)
			expectedRevision = requireExpectedRevision(rawExpectedRevision)
		} catch (error) {
			return Promise.reject(error)
		}
		return enqueueWrite(database => replaceDatabaseBaseline(database, baseline, expectedRevision))
	}

	function mergeBaseline(value, rawExpectedRevision) {
		let baseline
		let expectedRevision
		try {
			baseline = normalizeBaseline(value)
			expectedRevision = requireExpectedRevision(rawExpectedRevision)
		} catch (error) {
			return Promise.reject(error)
		}
		const rows = recordRows(baseline.records)
		return enqueueWrite(database => runTransaction(
			database,
			[RECORD_STORE_NAME, META_STORE_NAME],
			'readwrite',
			'合并检测基线',
			async transaction => {
				const recordStore = transaction.objectStore(RECORD_STORE_NAME)
				const metaStore = transaction.objectStore(META_STORE_NAME)
				const currentMeta = await requestToPromise(
					metaStore.get(META_KEY),
					'DATABASE_READ_FAILED',
					'读取检测基线 revision 失败'
				)
				const revision = nextBaselineRevision(currentMeta, expectedRevision)
				const committedBaseline = { ...baseline, revision }
				await mapRequestsInBatches(rows, row => requestToPromise(
						recordStore.put(row),
						'DATABASE_WRITE_FAILED',
						`合并邀请人 ${row.inviterId} 的基线记录失败`
					))
				await requestToPromise(
					metaStore.put(metaRow(committedBaseline)),
					'DATABASE_WRITE_FAILED',
					'更新检测基线元数据失败'
				)
				return { updatedAt: baseline.updatedAt, mergedCount: rows.length, revision }
			}
		))
	}

	function mergeRecords(records, updatedAt, expectedRevision) {
		let normalizedRecords
		let normalizedTime
		try {
			normalizedRecords = normalizeRecordMap(records)
			normalizedTime = normalizeUpdatedAt(updatedAt, Date.now())
		} catch (error) {
			return Promise.reject(error)
		}
		return mergeBaseline(
			{ version: 1, updatedAt: normalizedTime, records: normalizedRecords },
			expectedRevision
		)
	}

	function pruneExcept(inviterIds, updatedAt, rawExpectedRevision) {
		let keepIds
		let normalizedTime
		let expectedRevision
		try {
			if (!Array.isArray(inviterIds) && !(inviterIds instanceof Set)) {
				throw new BaselineStoreError('INVALID_ARGUMENT', 'pruneExcept 需要邀请人 ID 数组或 Set')
			}
			keepIds = new Set(Array.from(inviterIds, normalizeInviterId))
			normalizedTime = normalizeUpdatedAt(updatedAt, Date.now())
			expectedRevision = requireExpectedRevision(rawExpectedRevision)
		} catch (error) {
			return Promise.reject(error)
		}
		return enqueueWrite(database => runTransaction(
			database,
			[RECORD_STORE_NAME, META_STORE_NAME],
			'readwrite',
			'裁剪检测基线',
			async transaction => {
				const recordStore = transaction.objectStore(RECORD_STORE_NAME)
				const metaStore = transaction.objectStore(META_STORE_NAME)
				const [keys, currentMeta] = await Promise.all([
					requestToPromise(
						recordStore.getAllKeys(),
						'DATABASE_READ_FAILED',
						'读取待裁剪邀请人 ID 失败'
					),
					requestToPromise(
						metaStore.get(META_KEY),
						'DATABASE_READ_FAILED',
						'读取检测基线 revision 失败'
					)
				])
				const revision = nextBaselineRevision(currentMeta, expectedRevision)
				const removed = keys.map(String).filter(inviterId => !keepIds.has(inviterId))
				await mapRequestsInBatches(removed, inviterId => requestToPromise(
						recordStore.delete(inviterId),
						'DATABASE_WRITE_FAILED',
						`删除邀请人 ${inviterId} 的过期基线失败`
					))
				await requestToPromise(
					metaStore.put({ key: META_KEY, version: 1, updatedAt: normalizedTime, revision }),
					'DATABASE_WRITE_FAILED',
					'更新检测基线元数据失败'
				)
				return { updatedAt: normalizedTime, removedIds: removed, revision }
			}
		))
	}

	function saveReviewed(rawInviterId, reviewedAt, rawExpectedRevision) {
		let inviterId
		let normalizedTime
		let expectedRevision
		try {
			inviterId = normalizeInviterId(rawInviterId)
			normalizedTime = normalizeUpdatedAt(reviewedAt, Date.now())
			if (!normalizedTime) throw new BaselineStoreError('INVALID_ARGUMENT', 'reviewedAt 必须是有效时间戳')
			expectedRevision = requireExpectedRevision(rawExpectedRevision)
		} catch (error) {
			return Promise.reject(error)
		}
		return enqueueWrite(database => runTransaction(
			database,
			[RECORD_STORE_NAME, META_STORE_NAME],
			'readwrite',
			'保存审核状态',
			async transaction => {
				const recordStore = transaction.objectStore(RECORD_STORE_NAME)
				const metaStore = transaction.objectStore(META_STORE_NAME)
				const [row, currentMeta] = await Promise.all([
					requestToPromise(
						recordStore.get(inviterId),
						'DATABASE_READ_FAILED',
						`读取邀请人 ${inviterId} 的基线记录失败`
					),
					requestToPromise(
						metaStore.get(META_KEY),
						'DATABASE_READ_FAILED',
						'读取检测基线 revision 失败'
					)
				])
				if (!row || !isRecord(row.entry)) {
					throw new BaselineStoreError('BASELINE_RECORD_NOT_FOUND', `未找到邀请人 ${inviterId} 的待审核基线记录`)
				}
				if (!currentMeta) {
					throw new BaselineStoreError('DATABASE_CORRUPTED', '邀请人基线记录缺少对应元数据')
				}
				const revision = nextBaselineRevision(currentMeta, expectedRevision)
				const entry = {
					...row.entry,
					pendingReview: false,
					pendingChange: null,
					reviewedAt: normalizedTime
				}
				await Promise.all([
					requestToPromise(
						recordStore.put({ inviterId, entry }),
						'DATABASE_WRITE_FAILED',
						`保存邀请人 ${inviterId} 的审核状态失败`
					),
					requestToPromise(
						metaStore.put({ key: META_KEY, version: 1, updatedAt: normalizedTime, revision }),
						'DATABASE_WRITE_FAILED',
						'更新检测基线元数据失败'
					)
				])
				return { entry, revision, updatedAt: normalizedTime }
			}
		))
	}

	function clearAll() {
		return enqueueWrite(async database => {
			const clearedBaseline = await runTransaction(
				database,
				[RECORD_STORE_NAME, META_STORE_NAME],
				'readwrite',
				'清除检测基线',
				async transaction => {
					const metaStore = transaction.objectStore(META_STORE_NAME)
					const currentMeta = await requestToPromise(
						metaStore.get(META_KEY),
						'DATABASE_READ_FAILED',
						'读取检测基线 revision 失败'
					)
					const baseline = {
						...emptyBaseline(),
						revision: normalizeRevision(currentMeta && currentMeta.revision, 0) + 1
					}
					await Promise.all([
						requestToPromise(
							transaction.objectStore(RECORD_STORE_NAME).clear(),
							'DATABASE_WRITE_FAILED',
							'清除邀请人基线记录失败'
						),
						requestToPromise(
							metaStore.put(metaRow(baseline)),
							'DATABASE_WRITE_FAILED',
							'重置检测基线元数据失败'
						)
					])
					return baseline
				}
			)
			const warning = cleanupLegacyBaseline(
				legacyStorage,
				legacyStorageKey,
				'IndexedDB 检测基线已清除'
			)
			const warnings = reportWarning(warning)
			initializePromise = Promise.resolve({
				baseline: clearedBaseline,
				migrated: false,
				warnings
			})
			return { warnings, revision: clearedBaseline.revision }
		}, false)
	}

	async function close() {
		await writeTail
		if (!databasePromise) return
		const database = await databasePromise
		database.close()
		databasePromise = null
		initializePromise = null
	}

	return {
		initialize,
		loadAll,
		loadMetadata,
		loadRecords,
		loadSubset: loadRecords,
		replaceAll,
		mergeBaseline,
		mergeRecords,
		pruneExcept,
		saveReviewed,
		clearAll,
		close
	}
}

module.exports = {
	DEFAULT_DATABASE_NAME,
	DATABASE_VERSION,
	RECORD_STORE_NAME,
	META_STORE_NAME,
	LEGACY_STORAGE_KEY,
	BaselineStoreError,
	emptyBaseline,
	normalizeBaseline,
	createBaselineStore
}

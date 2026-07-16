const assert = require('assert')

const NOW = Date.now()
const BASELINE_STORAGE_KEY = 'violation_invitation_v2_baseline'
const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000
const CONSISTENCY_FAILURE_CONTENT = '邀请关系或风险字段在扫描期间发生变化，请重新检测。上一次成功结果和本地新增基线均未被覆盖。'
const ZERO_RESULT_FAILURE_CONTENT = '本轮检测结果异常为 0，已阻止覆盖或清空，请重新检测。上一次成功结果和本地新增基线均未被覆盖。'
const PROTECTED_EMPTY_FAILURE_CONTENT = '本轮全量邀请关系为 0，但本地仍有历史基线；为防止误清空已停止覆盖。若已确认线上邀请关系确实全部删除，请先手动清除本地检测基线后重新检测。上一次成功结果和本地新增基线均未被覆盖。'

function businessDate(value) {
	return new Date(value + CHINA_TIME_OFFSET_MS).toISOString().slice(0, 10)
}

function businessDateStart(date) {
	return Date.parse(`${date}T00:00:00+08:00`)
}

function operation(type, value) {
	return { __mockCommand: true, type, value }
}

const command = {
	and(values) {
		return operation('and', values)
	},
	or(values) {
		return operation('or', values)
	},
	exists(value) {
		return operation('exists', value)
	},
	neq(value) {
		return operation('neq', value)
	},
	gte(value) {
		return operation('gte', value)
	},
	lte(value) {
		return operation('lte', value)
	},
	lt(value) {
		return operation('lt', value)
	},
	gt(value) {
		return operation('gt', value)
	},
	not(value) {
		return operation('not', value)
	},
	in(values) {
		return operation('in', values)
	}
}

function matchesCondition(value, condition) {
	if (!condition || !condition.__mockCommand) return value === condition
	switch (condition.type) {
		case 'and':
			return condition.value.every(item => matchesCondition(value, item))
		case 'or':
			return condition.value.some(item => matchesCondition(value, item))
		case 'exists':
			return condition.value ? value !== undefined : value === undefined
		case 'neq':
			return value !== condition.value
		case 'gte':
			return value >= condition.value
		case 'lte':
			return value <= condition.value
		case 'lt':
			return value < condition.value
		case 'gt':
			return value > condition.value
		case 'not':
			return !matchesCondition(value, condition.value)
		case 'in':
			return condition.value.includes(value)
		default:
			throw new Error(`Unsupported mock command: ${condition.type}`)
	}
}

function matchesWhere(row, where) {
	return Object.keys(where || {}).every(key => matchesCondition(row[key], where[key]))
}

const inviter = {
	_id: 'inviter-1',
	my_invite_code: 'ABC123',
	nickname: 'Inviter',
	status: 0,
	register_date: NOW - 30 * 24 * 60 * 60 * 1000,
	register_ip: '203.0.113.1',
	login_date: NOW - 1000,
	login_ip: '203.0.113.1'
}

function invitee(index) {
	return {
		_id: `invitee-${String(index).padStart(4, '0')}`,
		inviter_uid: inviter._id,
		my_invite_code: `I${String(index).padStart(5, '0')}`,
		nickname: `Invitee ${index}`,
		status: 0,
		device_oaid: `device-${index}`,
		invite_time: NOW - index * 1000,
		register_date: NOW - index * 1000,
		register_ip: '198.51.100.10',
		login_date: NOW - index * 500,
		login_ip: '198.51.100.10'
	}
}

const rows = [inviter]
for (let index = 0; index < 1001; index++) rows.push(invitee(index))

const queryLog = []
let failNextPageRead = false
let requestFailurePlan = null
let replaceRecordAfterFirstPage = false
let removedForReplacement = null
let failStorageWrites = false
let failBaselineReads = false
let baselineReadGate = null
let baselineWriteGate = null
let baselineReviewGate = null
let baselineReviewCallCount = 0
let activeInviterProfileQueries = 0
let maxActiveInviterProfileQueries = 0
let activeRelationshipPageQueries = 0
let maxActiveRelationshipPageQueries = 0
let activeNonEmptyRelationshipPageQueries = 0
let maxActiveNonEmptyRelationshipPageQueries = 0
let activeDatabaseGetQueries = 0
let maxActiveDatabaseGetQueries = 0
let relationshipPageGate = null
let failIdRangeQueries = false
let failIdGtQueries = false

function hasRangeCommand(condition) {
	if (!condition || !condition.__mockCommand) return false
	if (['gt', 'gte', 'lt', 'lte'].includes(condition.type)) return true
	return Array.isArray(condition.value) && condition.value.some(hasRangeCommand)
}

function hasCommandType(condition, type) {
	if (!condition || !condition.__mockCommand) return false
	if (condition.type === type) return true
	return Array.isArray(condition.value) && condition.value.some(item => hasCommandType(item, type))
}

function createAsyncGate() {
	let release
	let signalEntered
	return {
		entered: new Promise(resolve => { signalEntered = resolve }),
		waiting: new Promise(resolve => { release = resolve }),
		signalEntered,
		release
	}
}

class MockQuery {
	constructor(where) {
		this.whereValue = where || {}
		this.skipValue = 0
		this.limitValue = Infinity
		this.orderField = ''
		this.orderDirection = 'asc'
		this.fieldValue = null
	}

	field(value) {
		this.fieldValue = value
		return this
	}

	orderBy(field, direction) {
		this.orderField = field
		this.orderDirection = direction
		return this
	}

	skip(value) {
		this.skipValue = value
		return this
	}

	limit(value) {
		this.limitValue = value
		return this
	}

	filteredRows() {
		if (failIdRangeQueries && hasRangeCommand(this.whereValue && this.whereValue._id)) return []
		if (failIdGtQueries && hasCommandType(this.whereValue && this.whereValue._id, 'gt')) return []
		const result = rows.filter(row => matchesWhere(row, this.whereValue))
		if (this.orderField) {
			const direction = this.orderDirection === 'desc' ? -1 : 1
			result.sort((left, right) => String(left[this.orderField]).localeCompare(String(right[this.orderField])) * direction)
		}
		return result
	}

	async count() {
		queryLog.push({ action: 'count', where: this.whereValue })
		return { result: { total: this.filteredRows().length } }
	}

	async get() {
		const logEntry = {
			action: 'get',
			where: this.whereValue,
			fields: this.fieldValue,
			skip: this.skipValue,
			limit: this.limitValue,
			returnedCount: 0
		}
		queryLog.push(logEntry)
		const relationshipPageQuery = Boolean(
			this.orderField === '_id' &&
			this.orderDirection === 'asc' &&
			this.limitValue === 1000 &&
			this.fieldValue &&
			this.fieldValue.inviter_uid === true
		)
		if (failNextPageRead && this.orderField === '_id' && this.orderDirection === 'asc' && this.limitValue === 1000) {
			failNextPageRead = false
			throw new Error('simulated page read failure')
		}
		if (relationshipPageQuery && requestFailurePlan) {
			const signature = JSON.stringify(this.whereValue)
			if (!requestFailurePlan.targetSignature) requestFailurePlan.targetSignature = signature
			if (signature === requestFailurePlan.targetSignature && requestFailurePlan.remaining > 0) {
				requestFailurePlan.remaining--
				requestFailurePlan.attempts++
				const error = new Error('request:fail')
				error.errMsg = 'request:fail timeout'
				throw error
			}
		}
		const inviterProfileQuery = Boolean(
			this.fieldValue &&
			this.fieldValue.status === true &&
			this.whereValue &&
			this.whereValue._id &&
			this.whereValue._id.type === 'in'
		)
		if (inviterProfileQuery) {
			activeInviterProfileQueries++
			maxActiveInviterProfileQueries = Math.max(maxActiveInviterProfileQueries, activeInviterProfileQueries)
			await Promise.resolve()
		}
		if (relationshipPageQuery) {
			activeRelationshipPageQueries++
			maxActiveRelationshipPageQueries = Math.max(maxActiveRelationshipPageQueries, activeRelationshipPageQueries)
			const activeGate = relationshipPageGate
			if (activeGate) {
				activeGate.signalEntered()
				await activeGate.waiting
			}
			await Promise.resolve()
		}
		activeDatabaseGetQueries++
		maxActiveDatabaseGetQueries = Math.max(maxActiveDatabaseGetQueries, activeDatabaseGetQueries)
		await Promise.resolve()
		try {
			const data = this.filteredRows().slice(this.skipValue, this.skipValue + this.limitValue)
			logEntry.returnedCount = data.length
			if (relationshipPageQuery && data.length) {
				activeNonEmptyRelationshipPageQueries++
				maxActiveNonEmptyRelationshipPageQueries = Math.max(
					maxActiveNonEmptyRelationshipPageQueries,
					activeNonEmptyRelationshipPageQueries
				)
				await Promise.resolve()
			}
			if (replaceRecordAfterFirstPage && this.orderField === '_id' && this.orderDirection === 'asc' && data.length === 1000) {
				replaceRecordAfterFirstPage = false
				const removeIndex = rows.findIndex(row => row._id === 'invitee-0000')
				removedForReplacement = rows.splice(removeIndex, 1)[0]
				rows.push({ ...removedForReplacement, _id: 'invitee-0000a' })
			}
			return { result: { data: data.map(row => ({ ...row })) } }
		} finally {
			activeDatabaseGetQueries--
			if (inviterProfileQuery) activeInviterProfileQueries--
			if (relationshipPageQuery) activeRelationshipPageQueries--
			if (relationshipPageQuery && logEntry.returnedCount) activeNonEmptyRelationshipPageQueries--
		}
	}
}

const userCollection = {
	where(where) {
		return new MockQuery(where)
	},
	doc(id) {
		return new MockQuery({ _id: id })
	}
}

const storage = Object.create(null)
let unexpectedModal = null
let lastScrollRequest = null

function clone(value) {
	return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function storedBaseline() {
	return storage[BASELINE_STORAGE_KEY] || { version: 1, updatedAt: 0, revision: 0, records: {} }
}

const baselineStoreMock = {
	async initialize() {
		const current = storedBaseline()
		return { baseline: { version: 1, updatedAt: current.updatedAt, revision: current.revision, records: {} }, migrated: false, warnings: [] }
	},
	async loadRecords(inviterIds) {
		if (baselineReadGate) {
			baselineReadGate.signalEntered()
			await baselineReadGate.waiting
		}
		if (failBaselineReads) throw new Error('simulated IndexedDB read failure')
		const current = storedBaseline()
		const records = {}
		inviterIds.forEach(inviterId => {
			if (Object.prototype.hasOwnProperty.call(current.records || {}, inviterId)) {
				records[inviterId] = clone(current.records[inviterId])
			}
		})
		return { version: 1, updatedAt: current.updatedAt || 0, revision: current.revision || 0, records }
	},
	async loadMetadata() {
		if (failBaselineReads) throw new Error('simulated IndexedDB read failure')
		const current = storedBaseline()
		return {
			version: 1,
			updatedAt: current.updatedAt || 0,
			revision: current.revision || 0,
			recordCount: Object.keys(current.records || {}).length
		}
	},
	async replaceAll(baseline, expectedRevision) {
		if (baselineWriteGate) {
			baselineWriteGate.signalEntered()
			await baselineWriteGate.waiting
		}
		if (failStorageWrites) throw new Error('simulated IndexedDB quota failure')
		const current = storedBaseline()
		if (expectedRevision !== current.revision) {
			const error = new Error('simulated baseline conflict')
			error.code = 'BASELINE_CONFLICT'
			throw error
		}
		const committed = { ...baseline, revision: current.revision + 1 }
		storage[BASELINE_STORAGE_KEY] = clone(committed)
		return clone(committed)
	},
	async mergeBaseline(baseline, expectedRevision) {
		if (baselineWriteGate) {
			baselineWriteGate.signalEntered()
			await baselineWriteGate.waiting
		}
		if (failStorageWrites) throw new Error('simulated IndexedDB quota failure')
		const current = storedBaseline()
		if (expectedRevision !== current.revision) {
			const error = new Error('simulated baseline conflict')
			error.code = 'BASELINE_CONFLICT'
			throw error
		}
		const revision = current.revision + 1
		storage[BASELINE_STORAGE_KEY] = clone({
			version: 1,
			updatedAt: baseline.updatedAt,
			revision,
			records: { ...(current.records || {}), ...(baseline.records || {}) }
		})
		return { updatedAt: baseline.updatedAt, mergedCount: Object.keys(baseline.records || {}).length, revision }
	},
	async saveReviewed(inviterId, reviewedAt, expectedRevision) {
		baselineReviewCallCount++
		if (baselineReviewGate) {
			baselineReviewGate.signalEntered()
			await baselineReviewGate.waiting
		}
		if (failStorageWrites) throw new Error('simulated IndexedDB quota failure')
		const current = storedBaseline()
		if (expectedRevision !== current.revision) {
			const error = new Error('simulated baseline conflict')
			error.code = 'BASELINE_CONFLICT'
			throw error
		}
		if (!current.records || !current.records[inviterId]) {
			const error = new Error('baseline record not found')
			error.code = 'BASELINE_RECORD_NOT_FOUND'
			throw error
		}
		const entry = {
			...current.records[inviterId],
			pendingReview: false,
			pendingChange: null,
			reviewedAt
		}
		const revision = current.revision + 1
		storage[BASELINE_STORAGE_KEY] = clone({
			...current,
			updatedAt: reviewedAt,
			revision,
			records: { ...current.records, [inviterId]: entry }
		})
		return { entry: clone(entry), revision, updatedAt: reviewedAt }
	},
	async clearAll() {
		const revision = storedBaseline().revision + 1
		delete storage[BASELINE_STORAGE_KEY]
		return { warnings: [], revision }
	}
}

global.uniCloud = {
	database() {
		return {
			command,
			collection(name) {
				assert.strictEqual(name, 'user-accounts')
				return userCollection
			}
		}
	}
}

global.uni = {
	__violationInvitationV2BaselineStore: baselineStoreMock,
	getStorageSync(key) {
		return storage[key] ? JSON.parse(JSON.stringify(storage[key])) : null
	},
	setStorageSync(key, value) {
		if (failStorageWrites) throw new Error('simulated storage quota failure')
		storage[key] = JSON.parse(JSON.stringify(value))
	},
	removeStorageSync(key) {
		delete storage[key]
	},
	showModal(options) {
		unexpectedModal = options
	},
	showToast() {},
	pageScrollTo(options) {
		lastScrollRequest = options
	}
}

const discoveryMixin = require('./violation-invitation-v2.discovery.js')

function createHost() {
	const host = {
		...discoveryMixin.data(),
		...discoveryMixin.methods,
		inviteCodeInput: '',
		queryRunId: 0,
		isQuerying: false,
		queryComplete: false,
		busy: false,
		taskStatus: { error: false },
		taskEvents: [],
		inviter: null,
		invitedUsers: [],
		dataNotice: '',
		loadWarning: '',
		setTask(message, metrics = null, error = false) {
			const current = metrics && Number(metrics.current)
			const total = metrics && Number(metrics.total)
			const determinate = Boolean(
				metrics &&
				metrics.determinate !== false &&
				Number.isFinite(current) &&
				Number.isFinite(total) &&
				total > 0 &&
				current >= 0
			)
			const boundedCurrent = determinate ? Math.min(current, total) : 0
			const event = {
				message,
				metricText: metrics && metrics.metricText ? String(metrics.metricText) : (determinate ? `${boundedCurrent} / ${total}` : '处理中'),
				current: boundedCurrent,
				total: determinate ? total : 0,
				determinate,
				progress: determinate ? Math.round((boundedCurrent / total) * 100) : 0,
				error: Boolean(error)
			}
			this.taskStatus = event
			this.taskEvents.push({ ...event })
		},
		clearTask() {},
		getErrorMessage(error) {
			return error && error.message ? error.message : String(error)
		},
		formatTimestamp(value) {
			return new Date(Number(value)).toISOString()
		},
		resetQueryResult() {
			this.queryComplete = false
			this.inviter = null
			this.invitedUsers = []
		},
		applyAccountAnalysis(users) {
			this.invitedUsers = users.slice()
		},
		syncVisibleSelection() {},
		$set(target, key, value) {
			target[key] = value
		},
		$nextTick(callback) {
			if (typeof callback === 'function') callback()
			return Promise.resolve()
		}
	}
	Object.defineProperty(host, 'filteredScanResults', {
		get() {
			return discoveryMixin.computed.filteredScanResults.call(host)
		}
	})
	return host
}

function isRiskRelationshipRead(entry) {
	return Boolean(
		entry &&
		entry.action === 'get' &&
		entry.fields &&
		entry.fields.inviter_uid === true &&
		entry.fields.invite_time === true &&
		entry.fields.register_ip === true
	)
}

function isCandidateRelationshipRead(entry) {
	return Boolean(
		entry &&
		entry.action === 'get' &&
		entry.fields &&
		entry.fields.inviter_uid === true &&
		entry.fields.invite_time === true &&
		entry.fields.register_ip !== true
	)
}

function isInviterProfileRead(entry) {
	return Boolean(
		entry &&
		entry.action === 'get' &&
		entry.fields &&
		entry.fields.status === true &&
		entry.where &&
		entry.where._id &&
		entry.where._id.type === 'in'
	)
}

function returnedRows(entries) {
	return entries.reduce((total, entry) => total + Number(entry.returnedCount || 0), 0)
}

function assertTruthfulIndeterminateScanProgress(events, message) {
	assert.ok(events.length > 0, `${message}: the scan must report its current work`)
	const determinateEvents = events.filter(event => event.determinate)
	assert.ok(determinateEvents.length > 0, `${message}: the verification pass must expose real numeric progress`)
	determinateEvents.forEach(event => {
		assert.ok(event.message.includes('复核'), `${message}: only a pass with a known total may be determinate`)
		assert.ok(event.total > 0 && event.current >= 0 && event.current <= event.total)
		assert.strictEqual(event.progress, Math.round((event.current / event.total) * 100))
	})
	events.filter(event => event.message.includes('批量') && !event.message.includes('复核')).forEach(event => {
		assert.strictEqual(event.determinate, false, `${message}: first-pass totals must remain indeterminate until discovered`)
	})
}

function assertFinalMetric(events, message, expectedCount) {
	const matching = events.filter(event => event.message === message)
	assert.ok(matching.length > 0, `missing scan metric: ${message}`)
	assert.ok(
		matching[matching.length - 1].metricText.includes(`${expectedCount} / ${expectedCount}`),
		`${message}: the final X/Y metric must match the rows actually returned`
	)
}

function assertMonotonicFinalVerification(events, expectedTotal) {
	const matching = events.filter(event => event.message === '正在最终复核邀请关系' && event.determinate)
	assert.ok(matching.length > 0, 'final relationship verification must expose determinate progress')
	let previousCurrent = -1
	matching.forEach(event => {
		assert.strictEqual(event.total, expectedTotal, 'the final verification denominator must stay stable')
		assert.ok(event.current >= previousCurrent, 'final verification progress must never move backwards')
		assert.ok(event.current <= event.total)
		previousCurrent = event.current
	})
	assert.strictEqual(matching[matching.length - 1].current, expectedTotal)
	assert.strictEqual(matching[matching.length - 1].progress, 100)
}

async function run() {
	const host = createHost()
	await host.loadDiscoveryBaseline([])
	const accumulatingLoader = host.loadInvitationRecords
	host.loadInvitationRecords = async () => {
		throw new Error('risk scans must not use the accumulating detail loader')
	}
	assert.strictEqual(host.scanScope, 'all', 'default scan scope must actively scan all invitation relationships')
	assert.strictEqual(host.inviteCodeInput, '', 'all-scope scan must not require an invite code')

	const allQueryStart = queryLog.length
	const allTaskStart = host.taskEvents.length
	await host.startRiskScan()
	assert.strictEqual(unexpectedModal, null, 'default all-scope scan must finish without an error modal')
	assert.strictEqual(host.scanResults.length, 1)
	assert.strictEqual(host.scanResults[0].inviterId, inviter._id)
	assert.strictEqual(host.scanResults[0].invitedCount, 1001)
	assert.strictEqual(host.scanResults.every(result => result.pendingReview), true, 'every first-baseline result must await review')
	assert.strictEqual(host.scanResults.every(result => result.change.firstDiscovery), true)
	assert.strictEqual(host.scanSummary.firstDiscoveryCount, 1)
	assert.strictEqual(host.scanSummary.pendingCount, 1)
	assert.ok(storage[BASELINE_STORAGE_KEY], 'successful first scan must persist its local baseline')
	assert.deepStrictEqual(host._discoveryBaselineCache.records, {}, 'the page must retain only baseline metadata after commit, not all invitee IDs')
	assert.strictEqual(host._discoveryBaselineCache.revision, storedBaseline().revision)
	const firstAllScanQueryEnd = queryLog.length

	const publicationHost = createHost()
	publicationHost.scanRiskFilter = 'high'
	publicationHost.scanReviewFilter = 'changed'
	publicationHost.scanKeyword = 'will-hide-everything'
	baselineWriteGate = createAsyncGate()
	const publicationScan = publicationHost.startRiskScan()
	await baselineWriteGate.entered
	assert.strictEqual(publicationHost.isCommittingScan, true, 'baseline persistence must expose its non-cancellable commit phase')
	assert.ok(publicationHost.scanCompletedAt > 0, 'verified results must be published before a potentially slow IndexedDB commit finishes')
	assert.strictEqual(publicationHost.scanResults.length, 1, 'the published view must already contain the stable inviter result during baseline commit')
	assert.deepStrictEqual(publicationHost.scanReadSummary, {
		relationshipCount: 1001,
		discoveredInviterCount: 1,
		stableInviterCount: 1,
		skippedInviterCount: 0
	})
	assert.strictEqual(publicationHost.scanRiskFilter, 'all', 'a new scan must not inherit a filter that hides every new result')
	assert.strictEqual(publicationHost.scanReviewFilter, 'all')
	assert.strictEqual(publicationHost.scanKeyword, '')
	assert.strictEqual(publicationHost.taskStatus.message, '结果已汇总，正在保存本地检测基线')
	baselineWriteGate.release()
	await publicationScan
	baselineWriteGate = null
	assert.strictEqual(publicationHost.isCommittingScan, false)

	const transientReadHost = createHost()
	const retryDelays = []
	transientReadHost.waitForScanReadRetry = async delayMs => { retryDelays.push(delayMs) }
	const transientFailurePlan = { remaining: 1, attempts: 0, targetSignature: '' }
	requestFailurePlan = transientFailurePlan
	unexpectedModal = null
	try {
		await transientReadHost.startRiskScan()
	} finally {
		requestFailurePlan = null
	}
	assert.strictEqual(unexpectedModal, null, 'one transient request:fail must recover without a failure modal')
	assert.strictEqual(transientFailurePlan.attempts, 1)
	assert.deepStrictEqual(retryDelays, [250], 'the first transient read retry must use the bounded backoff')
	assert.strictEqual(transientReadHost.scanResults.length, 1)
	assert.strictEqual(transientReadHost.scanResults[0].invitedCount, 1001)
	assert.ok(
		transientReadHost.taskEvents.some(event => (
			event.message === '网络请求暂时失败，正在重试：读取邀请关系分片第 1 页' &&
			event.metricText === '第 2 / 3 次读取'
		)),
		'a real retry must be visible to the operator'
	)

	const exhaustedReadHost = createHost()
	exhaustedReadHost.scanResults = [{ inviterId: 'protected-before-request-failure' }]
	exhaustedReadHost.waitForScanReadRetry = async () => {}
	const exhaustedFailurePlan = { remaining: 3, attempts: 0, targetSignature: '' }
	const baselineBeforeExhaustedRead = JSON.stringify(storage[BASELINE_STORAGE_KEY])
	const originalExhaustedReadConsoleError = console.error
	requestFailurePlan = exhaustedFailurePlan
	unexpectedModal = null
	console.error = () => {}
	try {
		await exhaustedReadHost.startRiskScan()
	} finally {
		console.error = originalExhaustedReadConsoleError
		requestFailurePlan = null
	}
	assert.strictEqual(exhaustedFailurePlan.attempts, 3)
	assert.ok(
		unexpectedModal && unexpectedModal.content.includes('读取邀请关系分片第 1 页连续 3 次请求失败：request:fail'),
		'a persistent request:fail must identify the failed read stage and real retry count'
	)
	assert.ok(unexpectedModal.content.includes('上一次成功结果和本地新增基线均未被覆盖'))
	assert.deepStrictEqual(exhaustedReadHost.scanResults, [{ inviterId: 'protected-before-request-failure' }])
	assert.strictEqual(JSON.stringify(storage[BASELINE_STORAGE_KEY]), baselineBeforeExhaustedRead)
	unexpectedModal = null

	const droppedAggregationHost = createHost()
	droppedAggregationHost.scanResults = [{ inviterId: 'protected-result' }]
	const droppedAggregationStream = droppedAggregationHost.streamInvitationSnapshots
	droppedAggregationHost.streamInvitationSnapshots = async () => ({ total: 1 })
	const baselineBeforeDroppedAggregation = JSON.stringify(storage[BASELINE_STORAGE_KEY])
	const originalDroppedAggregationConsoleError = console.error
	unexpectedModal = null
	console.error = () => {}
	try {
		await droppedAggregationHost.startRiskScan()
	} finally {
		console.error = originalDroppedAggregationConsoleError
		droppedAggregationHost.streamInvitationSnapshots = droppedAggregationStream
	}
	assert.ok(
		unexpectedModal && unexpectedModal.content.includes('完整关系读取数与汇总接收数不一致'),
		'a non-empty relationship pass may never silently publish an empty inviter list'
	)
	assert.deepStrictEqual(droppedAggregationHost.scanResults, [{ inviterId: 'protected-result' }])
	assert.strictEqual(JSON.stringify(storage[BASELINE_STORAGE_KEY]), baselineBeforeDroppedAggregation)
	unexpectedModal = null

	const incompleteTimeRiskHost = createHost()
	incompleteTimeRiskHost.scanScope = 'time'
	incompleteTimeRiskHost.scanDateMode = 'days30'
	incompleteTimeRiskHost.scanResults = [{ inviterId: 'protected-time-result' }]
	const realTimeStream = incompleteTimeRiskHost.streamInvitationSnapshots
	let timeStreamPass = 0
	incompleteTimeRiskHost.streamInvitationSnapshots = async function (...args) {
		timeStreamPass++
		if (timeStreamPass === 2) return { total: 0 }
		return realTimeStream.apply(this, args)
	}
	const baselineBeforeIncompleteTimeRisk = JSON.stringify(storage[BASELINE_STORAGE_KEY])
	const originalIncompleteTimeConsoleError = console.error
	console.error = () => {}
	try {
		await incompleteTimeRiskHost.startRiskScan()
	} finally {
		console.error = originalIncompleteTimeConsoleError
		incompleteTimeRiskHost.streamInvitationSnapshots = realTimeStream
	}
	assert.ok(
		unexpectedModal && unexpectedModal.content.includes('候选完整关系少于时间范围内已确认的关系'),
		'a time-scope candidate pass may never be published when its full-risk pass loses those relationships'
	)
	assert.deepStrictEqual(incompleteTimeRiskHost.scanResults, [{ inviterId: 'protected-time-result' }])
	assert.strictEqual(JSON.stringify(storage[BASELINE_STORAGE_KEY]), baselineBeforeIncompleteTimeRisk)
	unexpectedModal = null
	const allScanQueries = queryLog.slice(allQueryStart, firstAllScanQueryEnd)
	assert.strictEqual(
		allScanQueries.some(entry => Object.prototype.hasOwnProperty.call(entry.where, 'my_invite_code')),
		false,
		'default all-scope scan must not perform an invite-code lookup'
	)
	const allRiskReads = allScanQueries.filter(isRiskRelationshipRead)
	assert.strictEqual(allRiskReads.length, 4, '1001 all-scope relationships must use two pages in the first pass and two pages in the final verification pass')
	assert.strictEqual(
		returnedRows(allRiskReads),
		1001 * 2,
		'all-scope risk relationships must be transferred exactly once for analysis and once for final verification'
	)
	assert.strictEqual(
		allRiskReads.filter(entry => entry.fields.login_ip === true).length,
		2,
		'the first risk pass must read login_ip for risk analysis'
	)
	assert.strictEqual(
		allRiskReads.filter(entry => entry.fields.login_date === true).length,
		2,
		'the first risk pass must read login_date so post-cutoff login IP changes can be deferred'
	)
	assert.strictEqual(
		allRiskReads.filter(entry => entry.fields.login_ip !== true).length,
		2,
		'the final verification pass must only request stable relationship and register-IP fields'
	)
	assert.strictEqual(
		allRiskReads.some(entry => entry.where.inviter_uid && entry.where.inviter_uid.type === 'in'),
		false,
		'all-scope risk reads must stream the global relationship snapshot instead of rescanning per 50 inviters'
	)
	const initialProfileReads = allScanQueries.filter(isInviterProfileRead)
	assert.strictEqual(initialProfileReads.length, 2, 'the single inviter profile must be loaded once and then batch-verified once')
	assert.ok(initialProfileReads.every(entry => entry.where._id.value.length <= 50), 'inviter profile batches must respect the defensive 50-id limit')
	assert.strictEqual(initialProfileReads[0].fields.login_ip, true, 'the analysis pass must load inviter login IP evidence')
	assert.strictEqual(initialProfileReads[1].fields.login_ip, undefined, 'volatile inviter login IP must be omitted from stable verification')
	const allTaskEvents = host.taskEvents.slice(allTaskStart)
	assertTruthfulIndeterminateScanProgress(allTaskEvents, 'all-scope scan')
	assertFinalMetric(allTaskEvents, '正在批量扫描全部邀请关系', 1001)
	assertFinalMetric(allTaskEvents, '正在最终复核邀请关系', 1001)
	assertMonotonicFinalVerification(allTaskEvents, 1001)

	const rowsBeforeParallelScan = rows.slice()
	const baselineBeforeParallelScan = clone(storedBaseline())
	const parallelBaseId = BigInt('0x650000000000000000000000')
	const parallelInviter = {
		_id: parallelBaseId.toString(16).padStart(24, '0'),
		my_invite_code: 'PAR123',
		status: 0,
		register_ip: '203.0.113.60'
	}
	const parallelInvitees = Array.from({ length: 2401 }, (_, index) => ({
		_id: (parallelBaseId + BigInt(index + 1)).toString(16).padStart(24, '0'),
		inviter_uid: parallelInviter._id,
		invite_time: NOW - index,
		register_ip: `198.51.100.${(index % 200) + 1}`,
		login_ip: '',
		status: 0
	}))
	rows.splice(0, rows.length, parallelInviter, ...parallelInvitees)
	const parallelHost = createHost()
	const parallelQueryStart = queryLog.length
	maxActiveRelationshipPageQueries = 0
	activeRelationshipPageQueries = 0
	maxActiveNonEmptyRelationshipPageQueries = 0
	activeNonEmptyRelationshipPageQueries = 0
	unexpectedModal = null
	try {
		await parallelHost.startRiskScan()
	} finally {
		rows.splice(0, rows.length, ...rowsBeforeParallelScan)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeParallelScan)
	}
	const parallelQueries = queryLog.slice(parallelQueryStart)
	const parallelRiskReads = parallelQueries.filter(isRiskRelationshipRead)
	assert.strictEqual(unexpectedModal, null, '24-hex Aliyun IDs must complete through bounded parallel shards')
	assert.strictEqual(parallelHost.scanResults.length, 1)
	assert.strictEqual(parallelHost.scanResults[0].invitedCount, 2401)
	assert.strictEqual(maxActiveRelationshipPageQueries, 6, 'relationship pages must use six-way bounded concurrency')
	assert.strictEqual(maxActiveNonEmptyRelationshipPageQueries, 6, 'six concurrent workers must carry real non-empty relationship pages')
	assert.strictEqual(parallelQueries.some(entry => entry.action === 'count'), false, 'large scans must not run slow where+count queries')
	assert.strictEqual(parallelRiskReads.length, 48, '24 disjoint shards must each be read once for analysis and once for verification')
	assert.ok(
		parallelHost.taskEvents.some(event => event.metricText.includes('24 个分片，最多 6 路并行')),
		'task feedback must expose the real shard and concurrency counts'
	)
	assertFinalMetric(parallelHost.taskEvents, '正在批量扫描全部邀请关系', 2401)
	assertFinalMetric(parallelHost.taskEvents, '正在最终复核邀请关系', 2401)
	assertMonotonicFinalVerification(parallelHost.taskEvents, 2401)

	const rowsBeforeSkewedScan = rows.slice()
	const baselineBeforeSkewedScan = clone(storedBaseline())
	const skewedBaseId = BigInt('0x6fffffffffffffff00000000')
	const skewedInviter = {
		_id: skewedBaseId.toString(16).padStart(24, '0'),
		my_invite_code: 'SKW123',
		status: 0
	}
	const skewedInvitees = Array.from({ length: 2001 }, (_, index) => ({
		_id: (skewedBaseId + BigInt(index + 1)).toString(16).padStart(24, '0'),
		inviter_uid: skewedInviter._id,
		invite_time: NOW - index,
		register_ip: '198.51.100.80',
		login_ip: ''
	}))
	rows.splice(0, rows.length, {
		_id: '600000000000000000000000',
		inviter_uid: skewedInviter._id,
		invite_time: NOW - 3000,
		register_ip: '198.51.100.80',
		login_ip: ''
	}, skewedInviter, ...skewedInvitees)
	const skewedHost = createHost()
	const skewedQueryStart = queryLog.length
	maxActiveRelationshipPageQueries = 0
	unexpectedModal = null
	try {
		await skewedHost.startRiskScan()
	} finally {
		rows.splice(0, rows.length, ...rowsBeforeSkewedScan)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeSkewedScan)
	}
	const skewedRiskReads = queryLog.slice(skewedQueryStart).filter(isRiskRelationshipRead)
	assert.strictEqual(unexpectedModal, null, 'a heavily skewed shard must still finish')
	assert.strictEqual(skewedHost.scanResults[0].invitedCount, 2002, 'multi-page shard boundaries must not duplicate or omit rows')
	assert.strictEqual(returnedRows(skewedRiskReads), 2002 * 2)
	assert.strictEqual(
		skewedRiskReads.filter(entry => entry.returnedCount === 1000).length,
		4,
		'a shard larger than 1000 rows must use two full pages in both passes'
	)
	assert.ok(maxActiveRelationshipPageQueries > 1 && maxActiveRelationshipPageQueries <= 6)

	const overflowGuardHost = createHost()
	overflowGuardHost.queryRunId = 1
	const manyBaseWhereSnapshots = []
	manyBaseWhereSnapshots.baseWheres = Array.from({ length: 7400 }, (_, index) => ({ inviter_uid: `candidate-${index}` }))
	manyBaseWhereSnapshots.fixedUpperBoundary = 'zzzzzzzzzzzzzzzzzzzzzzzz'
	manyBaseWhereSnapshots.postBoundaryGuard = {
		where: {},
		inviterIds: new Set(['candidate-7399'])
	}
	const overflowGuardQueryStart = queryLog.length
	assert.strictEqual(await overflowGuardHost.assertNoPostBoundaryMatches(manyBaseWhereSnapshots, 1), true)
	const overflowGuardReads = queryLog.slice(overflowGuardQueryStart).filter(entry => (
		entry.action === 'get' &&
		entry.limit === 1000 &&
		entry.fields &&
		entry.fields._id === true &&
		entry.fields.inviter_uid === true
	))
	assert.strictEqual(overflowGuardReads.length, 1, 'thousands of time-risk inviter batches must share one global post-boundary cursor instead of thousands of empty queries')

	const rowsBeforeAsOfScan = rows.slice()
	const baselineBeforeAsOfScan = clone(storedBaseline())
	const asOfBaseId = BigInt('0x660000000000000000000000')
	const asOfInviter = {
		_id: asOfBaseId.toString(16).padStart(24, '0'),
		my_invite_code: 'CUT123',
		status: 0
	}
	const stableAsOfInvitee = {
		_id: (asOfBaseId + BigInt(1)).toString(16).padStart(24, '0'),
		inviter_uid: asOfInviter._id,
		invite_time: NOW - 1000,
		register_ip: '203.0.113.70',
		login_ip: ''
	}
	const liveBindingAccount = {
		_id: (asOfBaseId + BigInt(2)).toString(16).padStart(24, '0'),
		inviter_uid: '',
		invite_time: 0,
		register_ip: '203.0.113.71',
		login_ip: ''
	}
	const exactMillisecondBindingAccount = {
		_id: (asOfBaseId + BigInt(5)).toString(16).padStart(24, '0'),
		inviter_uid: '',
		invite_time: 0,
		register_ip: '203.0.113.74',
		login_ip: ''
	}
	rows.splice(
		0,
		rows.length,
		asOfInviter,
		stableAsOfInvitee,
		liveBindingAccount,
		exactMillisecondBindingAccount
	)
	const asOfHost = createHost()
	const originalResolveAsOfPlan = asOfHost.resolveScanPlan
	const originalAsOfStream = asOfHost.streamInvitationSnapshots
	const originalDateNow = Date.now
	let controlledScanNow = Math.floor(NOW / 1000) * 1000 + 500
	let scanCutoff = 0
	let liveBindingInjected = false
	asOfHost.resolveScanPlan = async function (confirmedAt) {
		scanCutoff = confirmedAt
		return originalResolveAsOfPlan.call(this, confirmedAt)
	}
	asOfHost.streamInvitationSnapshots = async function (...args) {
		const result = await originalAsOfStream.apply(this, args)
		const snapshots = args[0] || []
		const riskStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.register_ip === true)
		if (riskStream && !liveBindingInjected) {
			liveBindingInjected = true
			liveBindingAccount.inviter_uid = asOfInviter._id
			liveBindingAccount.invite_time = scanCutoff
			exactMillisecondBindingAccount.inviter_uid = asOfInviter._id
			exactMillisecondBindingAccount.invite_time = scanCutoff
		}
		return result
	}
	unexpectedModal = null
	try {
		Date.now = () => controlledScanNow
		await asOfHost.startRiskScan()
		assert.strictEqual(liveBindingInjected, true)
		assert.strictEqual(unexpectedModal, null, 'a relationship created at the exact millisecond cutoff must wait for the next scan')
		assert.strictEqual(asOfHost.scanResults.length, 1)
		assert.strictEqual(asOfHost.scanResults[0].invitedCount, 1, 'both exact-cutoff relationships must be deferred')

		controlledScanNow += 1000
		unexpectedModal = null
		await asOfHost.startRiskScan()
		assert.strictEqual(unexpectedModal, null, 'the deferred millisecond relationships must become visible after the cutoff advances')
		assert.strictEqual(asOfHost.scanResults.length, 1)
		assert.strictEqual(asOfHost.scanResults[0].invitedCount, 3, 'exact-millisecond boundary rows must become visible after the cutoff advances')
	} finally {
		Date.now = originalDateNow
		rows.splice(0, rows.length, ...rowsBeforeAsOfScan)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeAsOfScan)
	}

	const timeAsOfHost = createHost()
	timeAsOfHost.scanScope = 'time'
	timeAsOfHost.scanDateMode = 'manual'
	const timeAsOfDay = businessDate(controlledScanNow)
	timeAsOfHost.scanDateRange = [timeAsOfDay, timeAsOfDay]
	const exactMillisecondCandidate = {
		_id: 'time-as-of-candidate',
		inviter_uid: 'time-as-of-inviter',
		invite_time: controlledScanNow
	}
	const firstTimePlan = await timeAsOfHost.resolveScanPlan(controlledScanNow)
	assert.strictEqual(
		matchesWhere(exactMillisecondCandidate, firstTimePlan.where),
		false,
		'time-scope candidate discovery must use an exclusive millisecond cutoff'
	)
	const nextTimePlan = await timeAsOfHost.resolveScanPlan(controlledScanNow + 1000)
	assert.strictEqual(matchesWhere(exactMillisecondCandidate, nextTimePlan.where), true)
	const nextMillisecondPlan = await timeAsOfHost.resolveScanPlan(controlledScanNow + 1)
	assert.strictEqual(
		matchesWhere(exactMillisecondCandidate, nextMillisecondPlan.where),
		true,
		'the exact-millisecond boundary row must become visible after the cutoff advances by one millisecond'
	)

	const rowsBeforeSharedBoundaryScan = rows.slice()
	const baselineBeforeSharedBoundaryScan = clone(storedBaseline())
	const sharedBoundaryBaseId = BigInt('0x668000000000000000000000')
	const sharedBoundaryInviter = {
		_id: sharedBoundaryBaseId.toString(16).padStart(24, '0'),
		my_invite_code: 'SHR123',
		status: 0
	}
	const sharedBoundaryCandidate = {
		_id: (sharedBoundaryBaseId + BigInt(1)).toString(16).padStart(24, '0'),
		inviter_uid: sharedBoundaryInviter._id,
		invite_time: controlledScanNow - 1000,
		register_ip: '203.0.113.81',
		login_ip: ''
	}
	const lateBackfilledRelationship = {
		_id: (sharedBoundaryBaseId + BigInt(2)).toString(16).padStart(24, '0'),
		inviter_uid: sharedBoundaryInviter._id,
		invite_time: controlledScanNow - 4 * 24 * 60 * 60 * 1000,
		register_ip: '203.0.113.82',
		login_ip: ''
	}
	rows.splice(0, rows.length, sharedBoundaryInviter, sharedBoundaryCandidate)
	const sharedBoundaryHost = createHost()
	sharedBoundaryHost.scanScope = 'time'
	sharedBoundaryHost.scanDateMode = 'days3'
	const streamSharedBoundarySnapshots = sharedBoundaryHost.streamInvitationSnapshots
	let lateBackfillInjected = false
	sharedBoundaryHost.streamInvitationSnapshots = async function (...args) {
		const result = await streamSharedBoundarySnapshots.apply(this, args)
		const snapshots = args[0] || []
		const candidateStream = snapshots.length && snapshots.every(snapshot => (
			snapshot.fields && snapshot.fields.invite_time === true && snapshot.fields.register_ip !== true
		))
		if (candidateStream && !lateBackfillInjected) {
			lateBackfillInjected = true
			rows.push(lateBackfilledRelationship)
		}
		return result
	}
	unexpectedModal = null
	const originalSharedBoundaryDateNow = Date.now
	const originalSharedBoundaryConsoleError = console.error
	Date.now = () => controlledScanNow
	console.error = () => {}
	try {
		await sharedBoundaryHost.startRiskScan()
	} finally {
		Date.now = originalSharedBoundaryDateNow
		console.error = originalSharedBoundaryConsoleError
		rows.splice(0, rows.length, ...rowsBeforeSharedBoundaryScan)
	}
	assert.strictEqual(lateBackfillInjected, true)
	assert.strictEqual(unexpectedModal, null, 'a localized backfill must be retried without aborting the whole scan')
	assert.strictEqual(sharedBoundaryHost.scanResults.length, 1)
	assert.strictEqual(sharedBoundaryHost.scanResults[0].invitedCount, 2, 'the stable local retry must include the backfilled relationship')
	assert.strictEqual(sharedBoundaryHost.scanSummary.skippedCount, 0)
	storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeSharedBoundaryScan)
	unexpectedModal = null

	const rowsBeforeOverflowScan = rows.slice()
	const baselineBeforeOverflowScan = clone(storedBaseline())
	const overflowBaseId = BigInt('0x670000000000000000000000')
	const overflowInviter = {
		_id: overflowBaseId.toString(16).padStart(24, '0'),
		my_invite_code: 'OVR123',
		status: 0
	}
	rows.splice(0, rows.length, overflowInviter, {
		_id: (overflowBaseId + BigInt(1)).toString(16).padStart(24, '0'),
		inviter_uid: overflowInviter._id,
		invite_time: NOW - 1000,
		register_ip: '203.0.113.90',
		login_ip: ''
	})
	const overflowHost = createHost()
	const originalOverflowResolve = overflowHost.resolveScanPlan
	const originalOverflowStream = overflowHost.streamInvitationSnapshots
	let overflowCutoff = 0
	let overflowInjected = false
	overflowHost.resolveScanPlan = async function (confirmedAt) {
		overflowCutoff = confirmedAt
		return originalOverflowResolve.call(this, confirmedAt)
	}
	overflowHost.streamInvitationSnapshots = async function (...args) {
		const result = await originalOverflowStream.apply(this, args)
		const snapshots = args[0] || []
		const riskStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.register_ip === true)
		if (riskStream && !overflowInjected) {
			overflowInjected = true
			rows.push({
				_id: (overflowBaseId + BigInt(1000)).toString(16).padStart(24, '0'),
				inviter_uid: overflowInviter._id,
				invite_time: overflowCutoff - 1,
				register_ip: '203.0.113.91',
				login_ip: ''
			})
		}
		return result
	}
	unexpectedModal = null
	const originalOverflowConsoleError = console.error
	console.error = () => {}
	try {
		await overflowHost.startRiskScan()
	} finally {
		console.error = originalOverflowConsoleError
		rows.splice(0, rows.length, ...rowsBeforeOverflowScan)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeOverflowScan)
	}
	assert.strictEqual(overflowInjected, true)
	assert.strictEqual(unexpectedModal, null, 'one post-boundary inviter must be isolated and retried')
	assert.strictEqual(overflowHost.scanResults.length, 1)
	assert.strictEqual(overflowHost.scanResults[0].invitedCount, 2)
	assert.strictEqual(overflowHost.scanSummary.skippedCount, 0)

	const rowsBeforeCancellation = rows.slice()
	const baselineBeforeCancellation = clone(storedBaseline())
	const cancelBaseId = BigInt('0x680000000000000000000000')
	const cancelInviter = {
		_id: cancelBaseId.toString(16).padStart(24, '0'),
		my_invite_code: 'CAN123',
		status: 0
	}
	rows.splice(0, rows.length, cancelInviter, {
		_id: (cancelBaseId + BigInt(1)).toString(16).padStart(24, '0'),
		inviter_uid: cancelInviter._id,
		invite_time: NOW - 1000,
		register_ip: '203.0.113.100',
		login_ip: ''
	})
	const cancellationHost = createHost()
	relationshipPageGate = createAsyncGate()
	const cancelledRun = cancellationHost.startRiskScan()
	await relationshipPageGate.entered
	cancellationHost.cancelRiskScan()
	assert.strictEqual(cancellationHost.isRiskScanning, false)
	assert.strictEqual(cancellationHost.isQuerying, false)
	assert.ok(cancellationHost.taskEvents.some(event => event.message.startsWith('检测已取消')))
	const staleGate = relationshipPageGate
	relationshipPageGate = null
	const replacementRun = cancellationHost.startRiskScan()
	staleGate.release()
	unexpectedModal = null
	try {
		await Promise.all([cancelledRun, replacementRun])
	} finally {
		relationshipPageGate = null
		rows.splice(0, rows.length, ...rowsBeforeCancellation)
	}
	assert.strictEqual(unexpectedModal, null, 'cancelled in-flight responses must not fail or contaminate the replacement scan')
	assert.strictEqual(cancellationHost.scanResults.length, 1)
	assert.strictEqual(cancellationHost.scanResults[0].invitedCount, 1)
	assert.strictEqual(
		storedBaseline().revision,
		baselineBeforeCancellation.revision + 1,
		'only the replacement scan may commit a baseline revision'
	)
	storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeCancellation)

	const rowsBeforeStableVerification = rows.slice()
	const baselineBeforeStableVerification = clone(storedBaseline())
	const stableInviter = {
		_id: 'stable-verification-inviter',
		my_invite_code: 'STB123',
		status: 0,
		register_ip: '192.0.2.25'
	}
	const stableTimeMs = Math.floor(NOW / 1000) * 1000 - 1000
	const stableInvitees = Array.from({ length: 6 }, (_, index) => ({
		_id: `stable-verification-invitee-${index}`,
		inviter_uid: stableInviter._id,
		invite_time: stableTimeMs - index * 1000,
		register_ip: index === 0 ? '2001:0DB8:0:0:0:0:0:1' : '',
		login_ip: '192.0.2.25',
		status: index === 0 ? 3 : 0
	}))
	rows.splice(0, rows.length, stableInviter, ...stableInvitees)
	const stableVerificationHost = createHost()
	const streamStableSnapshots = stableVerificationHost.streamInvitationSnapshots
	let stableMutationInjected = false
	stableVerificationHost.streamInvitationSnapshots = async function (...args) {
		const result = await streamStableSnapshots.apply(this, args)
		const snapshots = args[0] || []
		const riskStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.login_ip === true)
		if (riskStream && !stableMutationInjected) {
			stableMutationInjected = true
			stableInvitees[0].invite_time = stableTimeMs / 1000
			stableInvitees[0].register_ip = '2001:db8::1'
			stableInvitees[5].login_ip = '192.0.2.99'
		}
		return result
	}
	const stableVerificationQueryStart = queryLog.length
	unexpectedModal = null
	try {
		await stableVerificationHost.startRiskScan()
	} finally {
		rows.splice(0, rows.length, ...rowsBeforeStableVerification)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeStableVerification)
	}
	const stableVerificationQueries = queryLog.slice(stableVerificationQueryStart)
	const stableRiskReads = stableVerificationQueries.filter(isRiskRelationshipRead)
	assert.strictEqual(stableMutationInjected, true)
	assert.strictEqual(unexpectedModal, null, 'volatile login_ip and equivalent timestamp/IP values must not invalidate the scan')
	assert.strictEqual(stableVerificationHost.scanResults.length, 1)
	assert.strictEqual(stableVerificationHost.scanResults[0].invitedCount, 6, 'banned invitees must remain part of relationship evidence')
	assert.strictEqual(stableVerificationHost.scanResults[0].highestIpCount, 7, 'the inviter and banned invitees must both contribute to same-IP risk counts')
	assert.strictEqual(stableVerificationHost.scanResults[0].mediumIpGroupCount, 1)
	assert.strictEqual(
		stableVerificationQueries.some(entry => entry.where && Object.prototype.hasOwnProperty.call(entry.where, 'status')),
		false,
		'the scan must not prefilter or exclude banned invitees'
	)
	assert.strictEqual(stableRiskReads.length, 2)
	assert.strictEqual(stableRiskReads[0].fields.login_ip, true, 'login_ip must be read by the analysis pass')
	assert.strictEqual(stableRiskReads[1].fields.login_ip, undefined, 'login_ip must not be requested by the stable verification pass')
	unexpectedModal = null

	const rowsBeforeInviterProfileVerification = rows.slice()
	const baselineBeforeInviterProfileVerification = clone(storedBaseline())
	const changingProfileInviter = {
		_id: 'changing-profile-inviter',
		my_invite_code: 'CHG123',
		status: 0,
		register_ip: '198.51.100.70',
		login_ip: '198.51.100.71'
	}
	const changingProfileInvitee = {
		_id: 'changing-profile-invitee',
		inviter_uid: changingProfileInviter._id,
		invite_time: stableTimeMs,
		register_ip: '198.51.100.72',
		login_ip: ''
	}
	rows.splice(0, rows.length, changingProfileInviter, changingProfileInvitee)
	const changingProfileHost = createHost()
	const loadChangingProfileMap = changingProfileHost.loadInviterMap
	let profileMutationInjected = false
	changingProfileHost.loadInviterMap = async function (...args) {
		const result = await loadChangingProfileMap.apply(this, args)
		if (args[2] === undefined && !profileMutationInjected) {
			profileMutationInjected = true
			changingProfileInviter.register_ip = '198.51.100.99'
		}
		return result
	}
	const profileBaselineBeforeScan = JSON.stringify(storedBaseline())
	let profileBaselineAfterScan = ''
	const originalProfileFailureConsoleError = console.error
	console.error = () => {}
	try {
		await changingProfileHost.startRiskScan()
		profileBaselineAfterScan = JSON.stringify(storedBaseline())
	} finally {
		console.error = originalProfileFailureConsoleError
		rows.splice(0, rows.length, ...rowsBeforeInviterProfileVerification)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeInviterProfileVerification)
	}
	assert.strictEqual(profileMutationInjected, true)
	assert.strictEqual(unexpectedModal, null, 'a stable localized inviter profile change must be retried')
	assert.strictEqual(changingProfileHost.scanResults.length, 1)
	assert.strictEqual(changingProfileHost.scanResults[0].inviter.register_ip, '198.51.100.99')
	assert.notStrictEqual(profileBaselineAfterScan, profileBaselineBeforeScan, 'the stable local retry may commit its current result')
	assert.strictEqual(changingProfileHost.scanSummary.skippedCount, 0)
	unexpectedModal = null

	const rowsBeforePostRelationInviterCheck = rows.slice()
	const baselineBeforePostRelationInviterCheck = clone(storedBaseline())
	const postRelationInviter = {
		_id: 'post-relation-inviter',
		my_invite_code: 'LATEP1',
		status: 0,
		register_ip: '198.51.100.73'
	}
	const postRelationInvitee = {
		_id: 'post-relation-invitee',
		inviter_uid: postRelationInviter._id,
		invite_time: stableTimeMs,
		register_ip: '198.51.100.74',
		login_ip: ''
	}
	rows.splice(0, rows.length, postRelationInviter, postRelationInvitee)
	const postRelationHost = createHost()
	const verifyBeforePostRelationMutation = postRelationHost.verifyInvitationSnapshots
	let postRelationMutationInjected = false
	postRelationHost.verifyInvitationSnapshots = async function (...args) {
		const verified = await verifyBeforePostRelationMutation.apply(this, args)
		const snapshots = args[0] || []
		const riskVerification = snapshots.some(snapshot => snapshot.verificationFields && snapshot.verificationFields.register_ip === true)
		if (riskVerification && !postRelationMutationInjected) {
			postRelationMutationInjected = true
			postRelationInviter.status = 3
		}
		return verified
	}
	const postRelationBaselineBeforeScan = JSON.stringify(storedBaseline())
	const originalPostRelationConsoleError = console.error
	console.error = () => {}
	try {
		await postRelationHost.startRiskScan()
	} finally {
		console.error = originalPostRelationConsoleError
		rows.splice(0, rows.length, ...rowsBeforePostRelationInviterCheck)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforePostRelationInviterCheck)
	}
	assert.strictEqual(postRelationMutationInjected, true)
	assert.strictEqual(unexpectedModal, null, 'an inviter change after relationship verification must be locally retried')
	assert.strictEqual(postRelationHost.scanResults.length, 1)
	assert.strictEqual(postRelationHost.scanResults[0].inviter.status, 3)
	assert.strictEqual(postRelationHost.scanSummary.skippedCount, 0)
	assert.strictEqual(postRelationBaselineBeforeScan, JSON.stringify(baselineBeforePostRelationInviterCheck))
	unexpectedModal = null

	const rowsBeforeVerificationOrder = rows.slice()
	const baselineBeforeVerificationOrder = clone(storedBaseline())
	const verificationOrderInviter = {
		_id: 'verification-order-inviter',
		my_invite_code: 'ORDER1',
		status: 0,
		register_ip: '198.51.100.75'
	}
	const verificationDay = businessDate(NOW - 24 * 60 * 60 * 1000)
	const verificationDayStart = businessDateStart(verificationDay)
	const inRangeRelationship = {
		_id: 'verification-order-in-range',
		inviter_uid: verificationOrderInviter._id,
		invite_time: verificationDayStart + 1000,
		register_ip: '198.51.100.76',
		login_ip: ''
	}
	const newlyEligibleInviter = {
		_id: 'verification-order-new-inviter',
		my_invite_code: 'ORDER2',
		status: 0,
		register_ip: '198.51.100.78'
	}
	const outOfRangeRelationship = {
		_id: 'verification-order-out-of-range',
		inviter_uid: newlyEligibleInviter._id,
		invite_time: verificationDayStart - 1000,
		register_ip: '198.51.100.77',
		login_ip: ''
	}
	rows.splice(0, rows.length, verificationOrderInviter, newlyEligibleInviter, inRangeRelationship, outOfRangeRelationship)
	const verificationOrderHost = createHost()
	verificationOrderHost.scanScope = 'time'
	verificationOrderHost.scanDateMode = 'manual'
	verificationOrderHost.scanDateRange = [verificationDay, verificationDay]
	const originalOrderedVerification = verificationOrderHost.verifyInvitationSnapshots
	const verificationOrder = []
	let outOfRangeRiskMutationInjected = false
	verificationOrderHost.verifyInvitationSnapshots = async function (...args) {
		const snapshots = args[0] || []
		const isRisk = snapshots.some(snapshot => snapshot.verificationFields && snapshot.verificationFields.register_ip === true)
		verificationOrder.push(isRisk ? 'risk' : 'candidate')
		const verified = await originalOrderedVerification.apply(this, args)
		if (!isRisk && !outOfRangeRiskMutationInjected) {
			outOfRangeRiskMutationInjected = true
			outOfRangeRelationship.invite_time = verificationDayStart + 2000
		}
		return verified
	}
	const verificationOrderBaselineBeforeScan = JSON.stringify(storedBaseline())
	const originalVerificationOrderConsoleError = console.error
	console.error = () => {}
	try {
		await verificationOrderHost.startRiskScan()
	} finally {
		console.error = originalVerificationOrderConsoleError
		rows.splice(0, rows.length, ...rowsBeforeVerificationOrder)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeVerificationOrder)
	}
	assert.deepStrictEqual(verificationOrder.slice(0, 3), ['candidate', 'risk', 'candidate'], 'candidate membership must be checked both before and after the complete risk projection')
	assert.strictEqual(outOfRangeRiskMutationInjected, true)
	assert.strictEqual(unexpectedModal, null, 'a newly eligible inviter must be localized and retried')
	assert.deepStrictEqual(
		verificationOrderHost.scanResults.map(result => result.inviterId).sort(),
		[newlyEligibleInviter._id, verificationOrderInviter._id].sort()
	)
	assert.strictEqual(verificationOrderHost.scanSummary.skippedCount, 0)
	assert.strictEqual(verificationOrderBaselineBeforeScan, JSON.stringify(baselineBeforeVerificationOrder))
	unexpectedModal = null

	const rowsBeforeStrictInviterChecks = rows.slice()
	const baselineBeforeStrictInviterChecks = clone(storedBaseline())
	const strictInviter = { _id: 'strict-inviter', my_invite_code: 'STR123', status: 0 }
	const strictInvitee = {
		_id: 'strict-invitee',
		inviter_uid: strictInviter._id,
		invite_time: stableTimeMs,
		register_ip: '198.51.100.30',
		login_ip: '198.51.100.30',
		status: 0
	}
	rows.splice(0, rows.length, strictInviter, strictInvitee)
	const strictChangeHost = createHost()
	const streamStrictSnapshots = strictChangeHost.streamInvitationSnapshots
	let strictChangeInjected = false
	strictChangeHost.streamInvitationSnapshots = async function (...args) {
		const result = await streamStrictSnapshots.apply(this, args)
		const snapshots = args[0] || []
		const riskStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.login_ip === true)
		if (riskStream && !strictChangeInjected) {
			strictChangeInjected = true
			strictInvitee.inviter_uid = ` ${strictInviter._id} `
		}
		return result
	}
	const strictBaselineBeforeChange = JSON.stringify(storedBaseline())
	const originalStrictChangeConsoleError = console.error
	console.error = () => {}
	try {
		await strictChangeHost.startRiskScan()
	} finally {
		console.error = originalStrictChangeConsoleError
		strictInvitee.inviter_uid = strictInviter._id
	}
	assert.strictEqual(strictChangeInjected, true)
	assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败', 'inviter_uid whitespace changes must fail strict relationship verification')
	assert.strictEqual(JSON.stringify(storedBaseline()), strictBaselineBeforeChange)
	assert.deepStrictEqual(strictChangeHost.scanResults, [], 'a strict inviter_uid mismatch must not publish scan results')

	for (const invalidCase of [
		{ label: 'non-string', value: 123 },
		{ label: 'surrounding whitespace', value: ` ${strictInviter._id} ` },
		{ label: 'blank whitespace', value: '   ' }
	]) {
		strictInvitee.inviter_uid = invalidCase.value
		const invalidInviterHost = createHost()
		unexpectedModal = null
		const originalInvalidInviterConsoleError = console.error
		console.error = () => {}
		try {
			await invalidInviterHost.startRiskScan()
		} finally {
			console.error = originalInvalidInviterConsoleError
		}
		assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败', `${invalidCase.label} inviter_uid must abort the first pass`)
		assert.ok(unexpectedModal.content.includes('inviter_uid 不是无首尾空格的非空字符串'))
		assert.strictEqual(JSON.stringify(storedBaseline()), strictBaselineBeforeChange)
		assert.deepStrictEqual(invalidInviterHost.scanResults, [])
	}
	rows.splice(0, rows.length, ...rowsBeforeStrictInviterChecks)
	storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeStrictInviterChecks)
	unexpectedModal = null

	const rowsBeforeDetailVerification = rows.slice()
	const baselineBeforeDetailVerification = clone(storedBaseline())
	const detailInviter = { _id: 'detail-inviter', my_invite_code: 'DTL123', nickname: 'Detail inviter', status: 0 }
	const detailInvitees = Array.from({ length: 2 }, (_, index) => ({
		_id: `detail-invitee-${index}`,
		inviter_uid: detailInviter._id,
		my_invite_code: `DTL00${index}`,
		nickname: `Detail invitee ${index}`,
		status: 0,
		device_oaid: `detail-device-${index}`,
		invite_time: stableTimeMs - index * 1000,
		register_date: stableTimeMs - index * 1000,
		register_ip: `198.51.100.${40 + index}`,
		login_date: stableTimeMs,
		login_ip: `198.51.100.${40 + index}`
	}))
	rows.splice(0, rows.length, detailInviter, ...detailInvitees)
	const detailVerificationHost = createHost()
	try {
		await detailVerificationHost.startRiskScan()
		assert.strictEqual(unexpectedModal, null)
		const detailItem = detailVerificationHost.scanResults[0]
		const originalDetailStream = detailVerificationHost.streamInvitationSnapshots
		let volatileDetailMutationInjected = false
		detailVerificationHost.streamInvitationSnapshots = async function (...args) {
			const result = await originalDetailStream.apply(this, args)
			const snapshots = args[0] || []
			const detailStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.nickname === true)
			if (detailStream && !volatileDetailMutationInjected) {
				volatileDetailMutationInjected = true
				detailInvitees[0].nickname = 'Updated while loading'
				detailInvitees[0].status = 3
				detailInvitees[0].login_date = stableTimeMs + 10000
				detailInvitees[0].login_ip = '203.0.113.88'
			}
			return result
		}
		const volatileDetailQueryStart = queryLog.length
		await detailVerificationHost.openInviterDetail(detailItem)
		assert.strictEqual(volatileDetailMutationInjected, true)
		assert.strictEqual(detailVerificationHost.queryComplete, true, 'volatile profile/login changes must not invalidate detail loading')
		assert.strictEqual(detailVerificationHost.invitedUsers.length, 2)
		const volatileDetailReads = queryLog.slice(volatileDetailQueryStart).filter(entry => (
			entry.action === 'get' &&
			entry.where &&
			entry.where.inviter_uid === detailInviter._id &&
			entry.fields &&
			entry.fields.register_ip === true
		))
		assert.strictEqual(volatileDetailReads.length, 2)
		assert.strictEqual(volatileDetailReads[0].fields.nickname, true, 'detail analysis must still request the complete invitee projection')
		assert.strictEqual(volatileDetailReads[0].fields.login_ip, true)
		assert.strictEqual(volatileDetailReads[1].fields.nickname, undefined, 'detail verification must omit volatile nickname/profile fields')
		assert.strictEqual(volatileDetailReads[1].fields.status, undefined)
		assert.strictEqual(volatileDetailReads[1].fields.login_date, undefined)
		assert.strictEqual(volatileDetailReads[1].fields.login_ip, undefined)

		detailVerificationHost.streamInvitationSnapshots = originalDetailStream
		await detailVerificationHost.startRiskScan()
		assert.strictEqual(unexpectedModal, null)
		const refreshedDetailItem = detailVerificationHost.scanResults[0]
		detailVerificationHost.inviter = { _id: 'previous-detail-inviter' }
		detailVerificationHost.invitedUsers = [{ _id: 'previous-detail-invitee' }]
		detailVerificationHost.queryComplete = true
		let registerIpMutationInjected = false
		const streamRegisterIpSnapshots = detailVerificationHost.streamInvitationSnapshots
		detailVerificationHost.streamInvitationSnapshots = async function (...args) {
			const result = await streamRegisterIpSnapshots.apply(this, args)
			const snapshots = args[0] || []
			const detailStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.nickname === true)
			if (detailStream && !registerIpMutationInjected) {
				registerIpMutationInjected = true
				detailInvitees[1].register_ip = '203.0.113.99'
			}
			return result
		}
		const originalDetailFailureConsoleError = console.error
		console.error = () => {}
		try {
			await detailVerificationHost.openInviterDetail(refreshedDetailItem)
		} finally {
			console.error = originalDetailFailureConsoleError
		}
		assert.strictEqual(registerIpMutationInjected, true)
		assert.strictEqual(detailVerificationHost.queryComplete, false, 'a changed register_ip must prevent stale details from being published')
		assert.strictEqual(detailVerificationHost.inviter, null, 'switching detail targets must withdraw the previous inviter before loading')
		assert.deepStrictEqual(detailVerificationHost.invitedUsers, [])
		assert.strictEqual(detailVerificationHost.taskStatus.error, true)
		assert.strictEqual(detailVerificationHost.detailLoadTarget.inviterId, detailInviter._id, 'failed detail loading must retain a visible retry target')
		assert.ok(detailVerificationHost.detailLoadError, 'failed detail loading must expose the real error beside the result list')
	} finally {
		detailVerificationHost.disposeDiscovery()
		rows.splice(0, rows.length, ...rowsBeforeDetailVerification)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeDetailVerification)
		unexpectedModal = null
	}

	const added = invitee(1001)
	added._id = 'invitee-new'
	rows.push(added)
	await host.startRiskScan()
	assert.strictEqual(unexpectedModal, null, 'second scan must finish without an error modal')
	assert.strictEqual(host.scanResults.length, 1)
	assert.deepStrictEqual(host.scanResults[0].change.newInviteeIds, ['invitee-new'])
	assert.strictEqual(host.scanResults[0].pendingReview, true)
	assert.strictEqual(host.scanResults[0].pendingChange.newInviteeIds.includes('invitee-new'), true)
	assert.strictEqual(host.scanSummary.newInviteeCount, 1)
	assert.strictEqual(host.scanSummary.hasCurrentChanges, true)

	host.scanScope = 'code'
	host.inviteCodeInput = inviter.my_invite_code
	await host.startRiskScan()
	assert.strictEqual(unexpectedModal, null, 'code-scope scan must use the same bounded scan pipeline')
	assert.strictEqual(host.scanResultScope, 'code')
	assert.strictEqual(host.scanResults[0].scopeMatchedCount, 1002)
	assert.strictEqual(host.scanResults[0].invitedCount, 1002)

	const codeScopeResultBeforeTransfer = JSON.stringify(host.scanResults)
	const codeScopeBaselineBeforeTransfer = JSON.stringify(storedBaseline())
	const resolveCodeScopePlan = host.resolveScanPlan
	host.resolveScanPlan = async function (...args) {
		const plan = await resolveCodeScopePlan.apply(this, args)
		inviter.my_invite_code = 'MOVED1'
		return plan
	}
	const originalCodeTransferConsoleError = console.error
	console.error = () => {}
	try {
		await host.startRiskScan()
	} finally {
		console.error = originalCodeTransferConsoleError
		host.resolveScanPlan = resolveCodeScopePlan
		inviter.my_invite_code = 'ABC123'
	}
	assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败', 'invite-code ownership changes must fail code-scope scans')
	assert.strictEqual(unexpectedModal.content, CONSISTENCY_FAILURE_CONTENT)
	assert.strictEqual(JSON.stringify(host.scanResults), codeScopeResultBeforeTransfer, 'a failed code-scope scan must retain the previous successful result')
	assert.strictEqual(JSON.stringify(storedBaseline()), codeScopeBaselineBeforeTransfer, 'a failed code-scope scan must not replace the baseline')
	unexpectedModal = null

	const resultBeforeLateRelationshipChange = JSON.stringify(host.scanResults)
	const baselineBeforeLateRelationshipChange = JSON.stringify(storedBaseline())
	const lateChangedInvitee = rows.find(row => row._id === 'invitee-0001')
	const originalLateRegisterIp = lateChangedInvitee.register_ip
	const loadBaselineBeforeLateRelationshipChange = host.loadDiscoveryBaseline
	let lateRelationshipMutationInjected = false
	host.loadDiscoveryBaseline = async function (...args) {
		const baseline = await loadBaselineBeforeLateRelationshipChange.apply(this, args)
		if (args[1] === true && !lateRelationshipMutationInjected) {
			lateRelationshipMutationInjected = true
			lateChangedInvitee.register_ip = '203.0.113.199'
		}
		return baseline
	}
	const originalLateRelationshipConsoleError = console.error
	console.error = () => {}
	try {
		await host.startRiskScan()
	} finally {
		console.error = originalLateRelationshipConsoleError
		host.loadDiscoveryBaseline = loadBaselineBeforeLateRelationshipChange
		lateChangedInvitee.register_ip = originalLateRegisterIp
	}
	assert.strictEqual(lateRelationshipMutationInjected, true)
	assert.strictEqual(unexpectedModal, null, 'a localized late risk-field change must be retried before commit')
	assert.strictEqual(host.scanResults.length, 1)
	assert.notStrictEqual(JSON.stringify(storedBaseline()), baselineBeforeLateRelationshipChange)
	assert.strictEqual(host.scanSummary.skippedCount, 0)
	storage[BASELINE_STORAGE_KEY] = JSON.parse(baselineBeforeLateRelationshipChange)
	host._discoveryBaselineCache = clone(storedBaseline())
	host.scanResults = JSON.parse(resultBeforeLateRelationshipChange)
	unexpectedModal = null

	const resultBeforeDuplicateOwner = JSON.stringify(host.scanResults)
	const baselineBeforeDuplicateOwner = JSON.stringify(storedBaseline())
	const duplicateInviteCodeOwner = {
		_id: 'duplicate-code-owner',
		my_invite_code: inviter.my_invite_code,
		status: 0,
		register_ip: '203.0.113.201',
		login_ip: ''
	}
	const loadBaselineBeforeDuplicateOwner = host.loadDiscoveryBaseline
	let duplicateOwnerInjected = false
	host.loadDiscoveryBaseline = async function (...args) {
		const baseline = await loadBaselineBeforeDuplicateOwner.apply(this, args)
		if (args[1] === true && !duplicateOwnerInjected) {
			duplicateOwnerInjected = true
			rows.push(duplicateInviteCodeOwner)
		}
		return baseline
	}
	const originalDuplicateOwnerConsoleError = console.error
	console.error = () => {}
	try {
		await host.startRiskScan()
	} finally {
		console.error = originalDuplicateOwnerConsoleError
		host.loadDiscoveryBaseline = loadBaselineBeforeDuplicateOwner
		const duplicateIndex = rows.findIndex(row => row._id === duplicateInviteCodeOwner._id)
		if (duplicateIndex !== -1) rows.splice(duplicateIndex, 1)
	}
	assert.strictEqual(duplicateOwnerInjected, true)
	assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败', 'a duplicate invite-code owner added during scanning must fail final identity verification')
	assert.strictEqual(unexpectedModal.content, CONSISTENCY_FAILURE_CONTENT)
	assert.strictEqual(JSON.stringify(host.scanResults), resultBeforeDuplicateOwner)
	assert.strictEqual(JSON.stringify(storedBaseline()), baselineBeforeDuplicateOwner)
	unexpectedModal = null

	await host.markInviterReviewed(host.scanResults[0])
	host.scanScope = 'time'
	const manualDate = businessDate(NOW)
	const manualStart = businessDateStart(manualDate)
	host.scanDateMode = 'manual'
	host.scanDateRange = [manualDate, manualDate]
	const expectedManualCandidateCount = rows.filter(row => (
		row &&
		row._id !== inviter._id &&
		row.inviter_uid === inviter._id &&
		Number(row.invite_time) >= manualStart &&
		Number(row.invite_time) <= NOW
	)).length
	assert.ok(expectedManualCandidateCount > 0, 'the manual-date fixture must include at least one current-day candidate')
	const timeQueryStart = queryLog.length
	const timeTaskStart = host.taskEvents.length
	await host.startRiskScan()
	assert.strictEqual(unexpectedModal, null, 'time-scope scan must finish without an error modal')
	assert.strictEqual(host.scanResultScope, 'time')
	assert.deepStrictEqual(host.scanDateRange, [manualDate, manualDate], 'manual time scope must use YYYY-MM-DD strings instead of raw timestamps')
	assert.strictEqual(host.scanResults[0].scopeMatchedCount, expectedManualCandidateCount, 'the selected dates are only used to find candidate inviters')
	assert.strictEqual(host.scanResults[0].invitedCount, 1002, 'candidate risk must use all current invitees')
	assert.strictEqual(host.scanResults[0].riskLevel, 'abnormal', 'full current data must drive the inviter risk level')
	assert.deepStrictEqual(host.scanResults[0].change.newInviteeIds, [])
	assert.deepStrictEqual(host.scanResults[0].change.grownIpGroups, [])
	assert.strictEqual(host.scanResults[0].change.riskUpgraded, false)
	const timeScanQueries = queryLog.slice(timeQueryStart)
	const candidateReads = timeScanQueries.filter(isCandidateRelationshipRead)
	const timeRiskReads = timeScanQueries.filter(isRiskRelationshipRead)
	assert.strictEqual(
		returnedRows(candidateReads),
		expectedManualCandidateCount * 3,
		'time-scope candidates must be transferred once for discovery and twice around complete-risk verification'
	)
	assert.strictEqual(
		returnedRows(timeRiskReads),
		1002 * 2,
		'time-scope risk must transfer every current invitee exactly once for analysis and once for final verification'
	)
	assert.ok(
		timeRiskReads.every(entry => (
			entry.where.inviter_uid &&
			entry.where.inviter_uid.type === 'in' &&
			entry.where.inviter_uid.value.length <= 50
		)),
		'time-scope full-risk reads may batch candidate inviters but must never exceed 50 IDs'
	)
	const timeTaskEvents = host.taskEvents.slice(timeTaskStart)
	assertTruthfulIndeterminateScanProgress(timeTaskEvents, 'manual time-scope scan')
	assertFinalMetric(timeTaskEvents, '正在批量识别时间范围内的邀请人', expectedManualCandidateCount)
	assertFinalMetric(timeTaskEvents, '正在批量读取候选邀请人的全部受邀关系', 1002)
	assertFinalMetric(timeTaskEvents, '正在最终复核邀请关系', 1002 + expectedManualCandidateCount * 2)
	assertMonotonicFinalVerification(timeTaskEvents, 1002 + expectedManualCandidateCount * 2)

	const successfulBaseline = JSON.stringify(storage[BASELINE_STORAGE_KEY])
	const successfulResults = JSON.stringify(host.scanResults)
	const successfulCompletedAt = host.scanCompletedAt

	const readFailureUser = { ...invitee(2), _id: 'baseline-read-failure-user' }
	rows.push(readFailureUser)
	failBaselineReads = true
	unexpectedModal = null
	const originalBaselineReadConsoleError = console.error
	console.error = () => {}
	try {
		await host.startRiskScan()
	} finally {
		console.error = originalBaselineReadConsoleError
		failBaselineReads = false
		rows.splice(rows.findIndex(row => row._id === readFailureUser._id), 1)
	}
	assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败', 'baseline read failures must abort change detection')
	assert.strictEqual(JSON.stringify(storage[BASELINE_STORAGE_KEY]), successfulBaseline, 'baseline read failures must never trigger a replacement write')
	assert.strictEqual(JSON.stringify(host.scanResults), successfulResults, 'baseline read failures must preserve the previous result list')
	assert.strictEqual(host.scanCompletedAt, successfulCompletedAt)
	assert.strictEqual(host.baselineWritable, false)

	const postUiFailureUser = { ...invitee(2), _id: 'post-ui-failure-user' }
	rows.push(postUiFailureUser)
	const originalResetQueryResult = host.resetQueryResult
	host.resetQueryResult = () => {
		throw new Error('simulated UI preparation failure')
	}
	unexpectedModal = null
	const originalConsoleError = console.error
	console.error = () => {}
	try {
		await host.startRiskScan()
	} finally {
		console.error = originalConsoleError
		host.resetQueryResult = originalResetQueryResult
		rows.splice(rows.findIndex(row => row._id === postUiFailureUser._id), 1)
	}
	assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败')
	assert.strictEqual(JSON.stringify(storage[BASELINE_STORAGE_KEY]), successfulBaseline, 'UI preparation failures must happen before baseline commit')
	assert.strictEqual(JSON.stringify(host.scanResults), successfulResults, 'UI preparation failures must keep the last successful result list')
	assert.strictEqual(host.scanCompletedAt, successfulCompletedAt)

	unexpectedModal = null
	failNextPageRead = true
	const originalPageFailureConsoleError = console.error
	console.error = () => {}
	try {
		await host.startRiskScan()
	} finally {
		console.error = originalPageFailureConsoleError
	}
	assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败')
	assert.strictEqual(JSON.stringify(storage[BASELINE_STORAGE_KEY]), successfulBaseline, 'failed scans must not overwrite the last successful baseline')
	assert.strictEqual(JSON.stringify(host.scanResults), successfulResults, 'failed scans must keep the last successful result list')
	assert.strictEqual(host.scanCompletedAt, successfulCompletedAt)

	unexpectedModal = null
	host.scanScope = 'all'
	replaceRecordAfterFirstPage = true
	const originalConsistencyConsoleError = console.error
	console.error = () => {}
	try {
		await host.startRiskScan()
	} finally {
		console.error = originalConsistencyConsoleError
		const replacementIndex = rows.findIndex(row => row._id === 'invitee-0000a')
		if (replacementIndex !== -1) rows.splice(replacementIndex, 1)
		if (removedForReplacement) rows.push(removedForReplacement)
		removedForReplacement = null
	}
	assert.strictEqual(unexpectedModal, null, 'a same-inviter record replacement must be localized and retried')
	assert.strictEqual(host.scanResults.length, 1)
	assert.strictEqual(host.scanSummary.skippedCount, 0)
	storage[BASELINE_STORAGE_KEY] = JSON.parse(successfulBaseline)
	host._discoveryBaselineCache = clone(storedBaseline())
	host.scanResults = JSON.parse(successfulResults)
	host.scanCompletedAt = successfulCompletedAt
	unexpectedModal = null

	const storageRetryUser = { ...invitee(2), _id: 'storage-retry-user' }
	rows.push(storageRetryUser)
	host.scanScope = 'time'
	failStorageWrites = true
	await host.startRiskScan()
	assert.strictEqual(unexpectedModal, null, 'storage quota failure is a completed scan with an explicit baseline warning')
	assert.strictEqual(host.baselineWritable, false)
	assert.strictEqual(host.scanResults[0].change.newInviteeIds.includes(storageRetryUser._id), true)
	assert.strictEqual(JSON.stringify(storage[BASELINE_STORAGE_KEY]), successfulBaseline)

	failStorageWrites = false
	await host.startRiskScan()
	assert.strictEqual(host.scanResults[0].change.newInviteeIds.includes(storageRetryUser._id), true, 'an unpersisted baseline must not advance the in-memory comparison point')
	assert.strictEqual(host.baselineWritable, true)
	await host.markInviterReviewed(host.scanResults[0])

	host.loadInvitationRecords = accumulatingLoader
	relationshipPageGate = createAsyncGate()
	const openingDetail = host.openInviterDetail(host.scanResults[0])
	await relationshipPageGate.entered
	assert.strictEqual(host.isQuerying, true)
	assert.deepStrictEqual(host.detailLoadTarget, {
		inviterId: inviter._id,
		inviteCode: inviter.my_invite_code
	})
	assert.strictEqual(host.detailLoadError, '')
	assert.ok(host.taskStatus.message, 'the in-place detail loader must expose the current real loading stage')
	assert.deepStrictEqual(lastScrollRequest, { selector: '.inviter-detail-feedback-anchor', duration: 250 })
	relationshipPageGate.release()
	await openingDetail
	relationshipPageGate = null
	assert.strictEqual(host.queryComplete, true)
	assert.strictEqual(host.detailLoadTarget, null)
	assert.strictEqual(host.selectedScanInviterId, inviter._id)
	assert.strictEqual(host.invitedUsers.length, 1003, 'opening a result must expose the complete invitee set')
	assert.strictEqual(host.invitedUsers.some(user => user._id === 'invitee-new'), true)
	assert.strictEqual(Boolean(host.selectedNewInviteeIds['invitee-new']), false, 'reviewed changes must no longer be highlighted as pending')
	assert.deepStrictEqual(lastScrollRequest, { selector: '.inviter-detail-anchor', duration: 250 })

	const staleLoadHost = createHost()
	staleLoadHost._discoveryBaselineCache = { version: 1, updatedAt: 1, records: { old: {} } }
	baselineReadGate = createAsyncGate()
	const staleLoad = staleLoadHost.loadDiscoveryBaseline([inviter._id])
	await baselineReadGate.entered
	staleLoadHost.queryRunId++
	const newerHostBaseline = { version: 1, updatedAt: 2, records: { newer: {} } }
	staleLoadHost._discoveryBaselineCache = newerHostBaseline
	baselineReadGate.release()
	await staleLoad
	baselineReadGate = null
	assert.strictEqual(staleLoadHost._discoveryBaselineCache, newerHostBaseline, 'a late baseline read must not overwrite newer instance state')

	const pendingRecord = {
		...storage[BASELINE_STORAGE_KEY].records[inviter._id],
		pendingReview: true,
		pendingChange: { firstDiscovery: true, newInviteeIds: [], newIpGroups: [], grownIpGroups: [] }
	}
	storage[BASELINE_STORAGE_KEY].records[inviter._id] = clone(pendingRecord)
	host._discoveryBaselineCache = {
		version: 1,
		updatedAt: storage[BASELINE_STORAGE_KEY].updatedAt,
		revision: storage[BASELINE_STORAGE_KEY].revision,
		records: { [inviter._id]: clone(pendingRecord) }
	}
	host.scanResults[0] = { ...host.scanResults[0], pendingReview: true, pendingChange: clone(pendingRecord.pendingChange) }
	baselineReviewGate = createAsyncGate()
	const reviewCallsBeforeLockTest = baselineReviewCallCount
	const staleReview = host.markInviterReviewed(host.scanResults[0])
	await baselineReviewGate.entered
	await host.markInviterReviewed(host.scanResults[0])
	assert.strictEqual(
		baselineReviewCallCount,
		reviewCallsBeforeLockTest + 1,
		'a second review click must not start another write while the first review is pending'
	)
	host.queryRunId++
	const newerReviewBaseline = { version: 1, updatedAt: 3, records: { newer: {} } }
	host._discoveryBaselineCache = newerReviewBaseline
	baselineReviewGate.release()
	await staleReview
	baselineReviewGate = null
	assert.strictEqual(host._discoveryBaselineCache, newerReviewBaseline, 'a late review save must not overwrite newer instance state')
	assert.strictEqual(host.scanResults[0].pendingReview, true, 'a stale review callback must not mutate the newer result UI')

	const reviewConflictHost = createHost()
	const visibleReviewBaseline = clone(storedBaseline())
	visibleReviewBaseline.records[inviter._id] = {
		...visibleReviewBaseline.records[inviter._id],
		pendingReview: true,
		pendingChange: { firstDiscovery: false, newInviteeIds: ['change-x'], newIpGroups: [], grownIpGroups: [] }
	}
	storage[BASELINE_STORAGE_KEY] = clone(visibleReviewBaseline)
	reviewConflictHost._discoveryBaselineCache = clone(visibleReviewBaseline)
	reviewConflictHost.scanResults = [{
		inviterId: inviter._id,
		pendingReview: true,
		pendingChange: clone(visibleReviewBaseline.records[inviter._id].pendingChange)
	}]
	reviewConflictHost.scanSummary = { ...reviewConflictHost.scanSummary, pendingCount: 1 }
	baselineReviewGate = createAsyncGate()
	const conflictingReview = reviewConflictHost.markInviterReviewed(reviewConflictHost.scanResults[0])
	await baselineReviewGate.entered
	const concurrentBaseline = clone(storedBaseline())
	concurrentBaseline.updatedAt += 1
	concurrentBaseline.revision += 1
	concurrentBaseline.records[inviter._id] = {
		...concurrentBaseline.records[inviter._id],
		pendingReview: true,
		pendingChange: { firstDiscovery: false, newInviteeIds: ['change-y'], newIpGroups: [], grownIpGroups: [] }
	}
	storage[BASELINE_STORAGE_KEY] = clone(concurrentBaseline)
	baselineReviewGate.release()
	await conflictingReview
	baselineReviewGate = null
	assert.strictEqual(reviewConflictHost.baselineWritable, false, 'a stale review must surface a baseline conflict')
	assert.strictEqual(reviewConflictHost.scanResults[0].pendingReview, true, 'a stale review must stay pending in the current UI')
	assert.deepStrictEqual(
		storedBaseline().records[inviter._id].pendingChange.newInviteeIds,
		['change-y'],
		'a stale review must not clear changes discovered by another tab'
	)

	const recordsBeforeEmptyTimeScope = clone(storedBaseline().records)
	const emptyTimeScopeHost = createHost()
	emptyTimeScopeHost.scanScope = 'time'
	emptyTimeScopeHost.scanDateMode = 'manual'
	emptyTimeScopeHost.scanDateRange = ['2000-01-01', '2000-01-02']
	unexpectedModal = null
	await emptyTimeScopeHost.startRiskScan()
	assert.strictEqual(unexpectedModal, null, 'an empty time scope must still complete normally')
	assert.deepStrictEqual(emptyTimeScopeHost.scanResults, [])
	assert.deepStrictEqual(
		storedBaseline().records,
		recordsBeforeEmptyTimeScope,
		'an empty partial scan must merge zero records and preserve inviters outside that scope'
	)

	const populatedRows = rows.slice()
	const baselineBeforeProtectedEmptyScan = clone(storedBaseline())
	rows.splice(0, rows.length, inviter)
	const emptyAllScopeHost = createHost()
	emptyAllScopeHost.scanScope = 'all'
	unexpectedModal = null
	const originalProtectedEmptyConsoleError = console.error
	console.error = () => {}
	try {
		await emptyAllScopeHost.startRiskScan()
	} finally {
		console.error = originalProtectedEmptyConsoleError
		rows.splice(0, rows.length, ...populatedRows)
	}
	assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败')
	assert.strictEqual(unexpectedModal.content, PROTECTED_EMPTY_FAILURE_CONTENT)
	assert.deepStrictEqual(emptyAllScopeHost.scanResults, [])
	assert.deepStrictEqual(
		storedBaseline(),
		baselineBeforeProtectedEmptyScan,
		'an empty full scan must not clear an existing local baseline automatically'
	)

	delete storage[BASELINE_STORAGE_KEY]
	rows.splice(0, rows.length, inviter)
	const genuinelyEmptyAllScopeHost = createHost()
	genuinelyEmptyAllScopeHost.scanScope = 'all'
	unexpectedModal = null
	try {
		await genuinelyEmptyAllScopeHost.startRiskScan()
	} finally {
		rows.splice(0, rows.length, ...populatedRows)
	}
	assert.strictEqual(unexpectedModal, null, 'a verified empty database with no prior baseline may complete normally')
	assert.deepStrictEqual(genuinelyEmptyAllScopeHost.scanResults, [])
	assert.deepStrictEqual(storedBaseline().records, {})

	delete storage[BASELINE_STORAGE_KEY]
	rows.splice(0, rows.length, inviter, {
		...invitee(0),
		_id: 'post-confirmation-invitee',
		invite_time: Date.now() + 60 * 1000
	})
	const postConfirmationOnlyHost = createHost()
	postConfirmationOnlyHost.scanScope = 'all'
	unexpectedModal = null
	try {
		await postConfirmationOnlyHost.startRiskScan()
	} finally {
		rows.splice(0, rows.length, ...populatedRows)
	}
	assert.strictEqual(unexpectedModal, null, 'a relationship created after the confirmation cutoff must wait for the next scan')
	assert.deepStrictEqual(postConfirmationOnlyHost.scanResults, [])
	assert.deepStrictEqual(storedBaseline().records, {})
	storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeProtectedEmptyScan)

	const rowsBeforeEmptyInsertRace = rows.slice()
	rows.splice(0, rows.length, inviter)
	const seededEmptyRaceBaseline = clone(storedBaseline())
	seededEmptyRaceBaseline.updatedAt = NOW
	seededEmptyRaceBaseline.revision += 1
	seededEmptyRaceBaseline.records = {}
	storage[BASELINE_STORAGE_KEY] = clone(seededEmptyRaceBaseline)
	const emptyInsertRaceHost = createHost()
	const verifyEmptySnapshots = emptyInsertRaceHost.verifyInvitationSnapshots
	let emptySnapshotVerifyCalls = 0
	emptyInsertRaceHost.verifyInvitationSnapshots = async function (...args) {
		emptySnapshotVerifyCalls++
		if (emptySnapshotVerifyCalls === 1) {
			rows.push({ ...invitee(0), _id: 'empty-scope-late-insert' })
		}
		return verifyEmptySnapshots.apply(this, args)
	}
	unexpectedModal = null
	const originalEmptyRaceConsoleError = console.error
	console.error = () => {}
	try {
		await emptyInsertRaceHost.startRiskScan()
	} finally {
		console.error = originalEmptyRaceConsoleError
		rows.splice(0, rows.length, ...rowsBeforeEmptyInsertRace)
	}
	assert.strictEqual(unexpectedModal, null, 'a late relationship for one inviter must be localized and retried')
	assert.strictEqual(emptySnapshotVerifyCalls, 2, 'the late insert must trigger one global verification and one stable local retry')
	assert.strictEqual(emptyInsertRaceHost.scanResults.length, 1)
	assert.strictEqual(emptyInsertRaceHost.scanResults[0].inviterId, inviter._id)
	assert.strictEqual(emptyInsertRaceHost.scanSummary.skippedCount, 0)
	assert.notStrictEqual(JSON.stringify(storedBaseline()), JSON.stringify(seededEmptyRaceBaseline))
	storage[BASELINE_STORAGE_KEY] = clone(seededEmptyRaceBaseline)

	const rowsBeforeProfileConcurrency = rows.slice()
	const concurrencyInviters = Array.from({ length: 201 }, (_, index) => ({
		_id: `concurrency-inviter-${String(index).padStart(3, '0')}`,
		my_invite_code: `C${String(index).padStart(5, '0')}`,
		status: 0
	}))
	rows.splice(0, rows.length, ...concurrencyInviters)
	const profileConcurrencyHost = createHost()
	const profileConcurrencyQueryStart = queryLog.length
	maxActiveInviterProfileQueries = 0
	let loadedConcurrencyInviters
	try {
		loadedConcurrencyInviters = await profileConcurrencyHost.loadInviterMap(
			concurrencyInviters.map(item => item._id),
			profileConcurrencyHost.queryRunId
		)
	} finally {
		rows.splice(0, rows.length, ...rowsBeforeProfileConcurrency)
	}
	const concurrencyProfileReads = queryLog.slice(profileConcurrencyQueryStart).filter(isInviterProfileRead)
	assert.strictEqual(loadedConcurrencyInviters.size, 201)
	assert.strictEqual(concurrencyProfileReads.length, 5, '201 inviter profiles must be split into five bounded _id batches')
	assert.ok(concurrencyProfileReads.every(entry => entry.where._id.value.length <= 50))
	assert.strictEqual(maxActiveInviterProfileQueries, 4, 'inviter profile loading must use four-way bounded concurrency')

	const normalRows = rows.slice()
	const batchInviters = Array.from({ length: 51 }, (_, index) => ({
		_id: `batch-inviter-${String(index).padStart(2, '0')}`,
		my_invite_code: `B${String(index).padStart(5, '0')}`,
		status: 0,
		register_date: NOW - 100000,
		login_date: NOW - 1000
	}))
	const batchInvitees = batchInviters.map((batchInviter, index) => ({
		_id: `batch-invitee-${String(index).padStart(2, '0')}`,
		inviter_uid: batchInviter._id,
		my_invite_code: `U${String(index).padStart(5, '0')}`,
		status: 0,
		invite_time: NOW - index * 1000,
		register_ip: `198.51.100.${index + 1}`,
		login_ip: `198.51.100.${index + 1}`
	}))
	rows.splice(0, rows.length, ...batchInviters, ...batchInvitees)
	const twoBatchProfileHost = createHost()
	const twoBatchProfileQueryStart = queryLog.length
	maxActiveInviterProfileQueries = 0
	const twoBatchProfileMap = await twoBatchProfileHost.loadInviterMap(
		batchInviters.map(item => item._id),
		twoBatchProfileHost.queryRunId
	)
	const twoBatchProfileReads = queryLog.slice(twoBatchProfileQueryStart).filter(isInviterProfileRead)
	assert.strictEqual(twoBatchProfileMap.size, 51)
	assert.strictEqual(twoBatchProfileReads.length, 2, '51 inviter profiles must use exactly two batched _id queries')
	assert.deepStrictEqual(
		twoBatchProfileReads.map(entry => entry.where._id.value.length).sort((left, right) => left - right),
		[1, 50],
		'inviter profile batches must retain the defensive 50-id maximum'
	)
	assert.strictEqual(maxActiveInviterProfileQueries, 2, 'the two inviter profile batches must execute concurrently instead of serially')

	const crossBatchHost = createHost()
	crossBatchHost.scanScope = 'time'
	crossBatchHost.scanDateMode = 'days3'
	const streamCrossBatchSnapshots = crossBatchHost.streamInvitationSnapshots
	let riskSnapshotCount = 0
	let riskStreamInjected = false
	crossBatchHost.streamInvitationSnapshots = async function (...args) {
		const result = await streamCrossBatchSnapshots.apply(this, args)
		const snapshots = args[0] || []
		const riskStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.register_ip === true)
		if (riskStream && !riskStreamInjected) {
			riskStreamInjected = true
			riskSnapshotCount = snapshots.length
			batchInvitees[0].inviter_uid = batchInviters[50]._id
		}
		return result
	}
	const baselineBeforeCrossBatchMove = JSON.stringify(storedBaseline())
	unexpectedModal = null
	const originalCrossBatchConsoleError = console.error
	console.error = () => {}
	try {
		await crossBatchHost.startRiskScan()
	} finally {
		console.error = originalCrossBatchConsoleError
		rows.splice(0, rows.length, ...normalRows)
	}
	assert.strictEqual(riskSnapshotCount, 2, '51 candidate inviters must produce exactly two bounded full-risk snapshots')
	assert.strictEqual(unexpectedModal, null, 'a relationship moving between two inviters must be isolated to those inviters')
	assert.strictEqual(crossBatchHost.scanSummary.skippedCount, 1, 'the inviter that became empty must keep its old baseline and be skipped')
	assert.strictEqual(crossBatchHost.scanResults.some(result => result.inviterId === batchInviters[0]._id), false)
	assert.strictEqual(crossBatchHost.scanResults.find(result => result.inviterId === batchInviters[50]._id).invitedCount, 2)
	storage[BASELINE_STORAGE_KEY] = JSON.parse(baselineBeforeCrossBatchMove)

	const riskFieldRaceHost = createHost()
	riskFieldRaceHost.scanScope = 'time'
	riskFieldRaceHost.scanDateMode = 'manual'
	riskFieldRaceHost.scanDateRange = [manualDate, manualDate]
	const streamRiskFieldSnapshots = riskFieldRaceHost.streamInvitationSnapshots
	const outOfRangeUser = rows.find(row => row._id === 'invitee-0500')
	const originalOutOfRangeIp = outOfRangeUser.register_ip
	const originalOutOfRangeInviteTime = outOfRangeUser.invite_time
	outOfRangeUser.invite_time = manualStart - 1000
	let riskFieldMutationInjected = false
	riskFieldRaceHost.streamInvitationSnapshots = async function (...args) {
		const result = await streamRiskFieldSnapshots.apply(this, args)
		const snapshots = args[0] || []
		const riskStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.register_ip === true)
		if (riskStream && !riskFieldMutationInjected) {
			riskFieldMutationInjected = true
			outOfRangeUser.register_ip = '203.0.113.250'
		}
		return result
	}
	const baselineBeforeRiskFieldChange = JSON.stringify(storedBaseline())
	unexpectedModal = null
	const originalRiskFieldConsoleError = console.error
	console.error = () => {}
	try {
		await riskFieldRaceHost.startRiskScan()
	} finally {
		console.error = originalRiskFieldConsoleError
		outOfRangeUser.register_ip = originalOutOfRangeIp
		outOfRangeUser.invite_time = originalOutOfRangeInviteTime
	}
	assert.strictEqual(unexpectedModal, null, 'a single inviter risk-field change must be locally retried')
	assert.strictEqual(riskFieldMutationInjected, true, 'the risk-field mutation must occur after the complete-risk first pass')
	assert.strictEqual(riskFieldRaceHost.scanSummary.skippedCount, 0)
	assert.strictEqual(riskFieldRaceHost.scanResults.length, 1)
	assert.notStrictEqual(JSON.stringify(storedBaseline()), baselineBeforeRiskFieldChange)
	storage[BASELINE_STORAGE_KEY] = JSON.parse(baselineBeforeRiskFieldChange)

	const rowsBeforeLocalCandidateAba = rows.slice()
	const baselineBeforeLocalCandidateAba = clone(storedBaseline())
	const localCandidateInviter = { _id: 'local-candidate-aba-inviter', my_invite_code: 'ABA123', status: 0 }
	const localCandidateInvitee = {
		_id: 'local-candidate-aba-user',
		inviter_uid: localCandidateInviter._id,
		invite_time: stableTimeMs,
		register_ip: '198.51.100.230',
		login_ip: '198.51.100.230'
	}
	rows.splice(0, rows.length, localCandidateInviter, localCandidateInvitee)
	try {
		const localCandidateAbaHost = createHost()
		localCandidateAbaHost.scanScope = 'time'
		localCandidateAbaHost.scanDateMode = 'manual'
		localCandidateAbaHost.scanDateRange = [manualDate, manualDate]
		const streamLocalCandidateAba = localCandidateAbaHost.streamInvitationSnapshots
		let globalRiskMutationInjected = false
		localCandidateAbaHost.streamInvitationSnapshots = async function (...args) {
			const result = await streamLocalCandidateAba.apply(this, args)
			const snapshots = args[0] || []
			const riskStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.register_ip === true)
			if (riskStream && !globalRiskMutationInjected) {
				globalRiskMutationInjected = true
				localCandidateInvitee.register_ip = '198.51.100.231'
			}
			return result
		}
		const collectLocalCandidateAba = localCandidateAbaHost.collectInvitationRecords
		let localCollectCount = 0
		localCandidateAbaHost.collectInvitationRecords = async function (where, ...args) {
			const result = await collectLocalCandidateAba.call(this, where, ...args)
			if (where && where.inviter_uid === localCandidateInviter._id) {
				localCollectCount++
				if (localCollectCount === 1) localCandidateInvitee.invite_time = stableTimeMs + 500
				if (localCollectCount === 2) localCandidateInvitee.invite_time = stableTimeMs
			}
			return result
		}
		unexpectedModal = null
		await localCandidateAbaHost.startRiskScan()
		assert.strictEqual(unexpectedModal, null, 'candidate T1 -> risk T2 -> candidate T1 must be retried locally')
		assert.strictEqual(globalRiskMutationInjected, true)
		assert.ok(localCollectCount >= 6, 'the candidate-field ABA must exhaust the first local attempt and run a second stable attempt')
		assert.strictEqual(localCandidateAbaHost.scanSummary.skippedCount, 0)
		assert.strictEqual(localCandidateAbaHost.scanResults.length, 1)
	} finally {
		rows.splice(0, rows.length, ...rowsBeforeLocalCandidateAba)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeLocalCandidateAba)
	}

	const rowsBeforeIsolationBudget = rows.slice()
	const baselineBeforeIsolationBudget = clone(storedBaseline())
	const budgetInviters = Array.from({ length: 21 }, (_, index) => ({
		_id: `budget-inviter-${String(index).padStart(2, '0')}`,
		my_invite_code: `Q${String(index).padStart(5, '0')}`,
		status: 0
	}))
	const budgetInvitees = budgetInviters.map((item, index) => ({
		_id: `budget-invitee-${String(index).padStart(2, '0')}`,
		inviter_uid: item._id,
		invite_time: stableTimeMs - index,
		register_ip: `198.51.100.${index + 1}`
	}))
	rows.splice(0, rows.length, ...budgetInviters, ...budgetInvitees)
	try {
		const isolationBudgetSeedHost = createHost()
		unexpectedModal = null
		await isolationBudgetSeedHost.startRiskScan()
		assert.strictEqual(unexpectedModal, null)
		const overflowInviterId = budgetInviters[20]._id
		const preservedOverflowBaseline = clone(storedBaseline().records[overflowInviterId])

		const isolationBudgetHost = createHost()
		const loadIsolationBudgetProfiles = isolationBudgetHost.loadInviterMap
		let fullProfileLoadCount = 0
		isolationBudgetHost.loadInviterMap = async function (ids, ...args) {
			const result = await loadIsolationBudgetProfiles.call(this, ids, ...args)
			if (ids.length === budgetInviters.length && ++fullProfileLoadCount === 1) {
				budgetInviters.forEach(item => { item.status = 1 })
			}
			return result
		}
		unexpectedModal = null
		await isolationBudgetHost.startRiskScan()
		assert.strictEqual(unexpectedModal, null, 'affected inviters beyond the retry budget must not abort the full scan')
		assert.strictEqual(isolationBudgetHost.scanSummary.skippedCount, 1)
		assert.deepStrictEqual(isolationBudgetHost.scanSkippedInviters, [{
			inviterId: overflowInviterId,
			reason: '本轮变化账号超过局部复核预算 20 位，已留待下次检测'
		}])
		assert.strictEqual(isolationBudgetHost.scanResults.length, 20)
		assert.deepStrictEqual(storedBaseline().records[overflowInviterId], preservedOverflowBaseline)
	} finally {
		rows.splice(0, rows.length, ...rowsBeforeIsolationBudget)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeIsolationBudget)
	}

	const rowsBeforePersistentIsolation = rows.slice()
	const baselineBeforePersistentIsolation = clone(storedBaseline())
	const stableIsolationInviter = { _id: 'isolation-stable-inviter', my_invite_code: 'STB123', status: 0 }
	const unstableIsolationInviter = { _id: 'isolation-unstable-inviter', my_invite_code: 'FLP123', status: 0 }
	const stableIsolationInvitee = {
		_id: 'isolation-stable-user',
		inviter_uid: stableIsolationInviter._id,
		invite_time: NOW - 2000,
		register_ip: '198.51.100.210',
		login_ip: ''
	}
	const unstableIsolationInvitee = {
		_id: 'isolation-unstable-user',
		inviter_uid: unstableIsolationInviter._id,
		invite_time: NOW - 1000,
		register_ip: '198.51.100.211',
		login_ip: ''
	}
	rows.splice(
		0,
		rows.length,
		stableIsolationInviter,
		unstableIsolationInviter,
		stableIsolationInvitee,
		unstableIsolationInvitee
	)
	try {
		const isolationSeedHost = createHost()
		unexpectedModal = null
		await isolationSeedHost.startRiskScan()
		assert.strictEqual(unexpectedModal, null)
		const preservedUnstableBaseline = clone(storedBaseline().records[unstableIsolationInviter._id])

		const persistentIsolationHost = createHost()
		const streamPersistentIsolation = persistentIsolationHost.streamInvitationSnapshots
		let persistentMutationCount = 0
		persistentIsolationHost.streamInvitationSnapshots = async function (...args) {
			const result = await streamPersistentIsolation.apply(this, args)
			const snapshots = args[0] || []
			const riskStream = snapshots.length && snapshots.every(snapshot => snapshot.fields && snapshot.fields.register_ip === true)
			if (riskStream) {
				persistentMutationCount++
				unstableIsolationInvitee.register_ip = persistentMutationCount % 2
					? '198.51.100.212'
					: '198.51.100.213'
			}
			return result
		}
		unexpectedModal = null
		await persistentIsolationHost.startRiskScan()
		assert.strictEqual(unexpectedModal, null, 'one continuously changing inviter must not abort stable inviters')
		assert.ok(persistentMutationCount >= 3, 'the unstable inviter must exhaust both local retry attempts')
		assert.strictEqual(persistentIsolationHost.scanSummary.skippedCount, 1)
		assert.deepStrictEqual(persistentIsolationHost.scanSkippedInviters, [{
			inviterId: unstableIsolationInviter._id,
			reason: '扫描期间持续变化，局部复核未稳定'
		}])
		assert.deepStrictEqual(
			persistentIsolationHost.scanResults.map(result => result.inviterId),
			[stableIsolationInviter._id]
		)
		assert.deepStrictEqual(
			storedBaseline().records[unstableIsolationInviter._id],
			preservedUnstableBaseline,
			'a skipped inviter must preserve its previous baseline byte-for-byte'
		)
	} finally {
		rows.splice(0, rows.length, ...rowsBeforePersistentIsolation)
		storage[BASELINE_STORAGE_KEY] = clone(baselineBeforePersistentIsolation)
	}

	const rowsBeforeRangeCapability = rows.slice()
	const baselineBeforeRangeCapability = clone(storedBaseline())
	const rangeBaseId = BigInt('0x720000000000000000000000')
	const rangeInviter = { _id: rangeBaseId.toString(16), my_invite_code: 'RNG123', status: 0 }
	rows.splice(0, rows.length, rangeInviter, {
		_id: (rangeBaseId + 1n).toString(16),
		inviter_uid: rangeInviter._id,
		invite_time: NOW - 2000,
		register_ip: '198.51.100.220'
	}, {
		_id: (rangeBaseId + 1000n).toString(16),
		inviter_uid: rangeInviter._id,
		invite_time: NOW - 1000,
		register_ip: '198.51.100.221'
	})
	const rangeCapabilityHost = createHost()
	rangeCapabilityHost.scanResults = [{ inviterId: 'previous-result' }]
	const originalRangeConsoleError = console.error
	unexpectedModal = null
	failIdRangeQueries = true
	console.error = () => {}
	try {
		await rangeCapabilityHost.startRiskScan()
	} finally {
		console.error = originalRangeConsoleError
		failIdRangeQueries = false
		rows.splice(0, rows.length, ...rowsBeforeRangeCapability)
	}
	assert.strictEqual(unexpectedModal && unexpectedModal.title, '检测失败')
	assert.ok(unexpectedModal.content.includes('ClientDB 未正确执行用户 ID 范围查询'))
	assert.deepStrictEqual(rangeCapabilityHost.scanResults, [{ inviterId: 'previous-result' }])
	assert.deepStrictEqual(storedBaseline(), baselineBeforeRangeCapability)

	const rowsBeforeStringRangeCapability = rows.slice()
	const stringRangeInviters = Array.from({ length: 6 }, (_, index) => ({
		_id: `string-range-owner-${index}`,
		my_invite_code: `S${String(index).padStart(5, '0')}`,
		status: 0
	}))
	const stringRangeInvitees = stringRangeInviters.flatMap((item, index) => ([{
		_id: `string-range-user-${index}-a`,
		inviter_uid: item._id,
		invite_time: stableTimeMs,
		register_ip: '198.51.100.240'
	}, {
		_id: `string-range-user-${index}-z`,
		inviter_uid: item._id,
		invite_time: stableTimeMs + 1,
		register_ip: '198.51.100.241'
	}]))
	rows.splice(0, rows.length, ...stringRangeInviters, ...stringRangeInvitees)
	try {
		const stringRangeHost = createHost()
		const stringRangeWheres = stringRangeInviters.map(item => ({
			inviter_uid: item._id,
			invite_time: command.lt(NOW + 1)
		}))
		failIdGtQueries = true
		await assert.rejects(
			stringRangeHost.prepareParallelInvitationSnapshots(
				[stringRangeWheres[0]],
				{ _id: true, inviter_uid: true, invite_time: true },
				stringRangeHost.queryRunId
			),
			/ClientDB 未正确执行用户 ID 范围查询/,
			'non-hex string IDs must verify the real gt cursor branch'
		)
		await assert.rejects(
			stringRangeHost.prepareParallelInvitationSnapshots(
				stringRangeWheres,
				{ _id: true, inviter_uid: true, invite_time: true },
				stringRangeHost.queryRunId
			),
			/ClientDB 未正确执行用户 ID 范围查询/,
			'six or more base conditions must still run the representative gt probe'
		)
		failIdGtQueries = false
		maxActiveDatabaseGetQueries = 0
		const fiveConditionSnapshots = await stringRangeHost.prepareParallelInvitationSnapshots(
			stringRangeWheres.slice(0, 5),
			{ _id: true, inviter_uid: true, invite_time: true },
			stringRangeHost.queryRunId
		)
		assert.ok(Array.isArray(fiveConditionSnapshots) && fiveConditionSnapshots.length >= 5)
		assert.ok(maxActiveDatabaseGetQueries <= 6, 'range bounds and capability probes must never exceed six in-flight database reads')

		const sequentialRangeHost = createHost()
		failIdGtQueries = true
		await assert.rejects(
			sequentialRangeHost.visitInvitationRecords(
				stringRangeWheres[0],
				sequentialRangeHost.queryRunId,
				{ _id: true, inviter_uid: true, invite_time: true },
				() => {},
				{ parallel: false, silent: true }
			),
			/ClientDB 未正确执行用户 ID 范围查询/,
			'local sequential retries must probe gt before paging'
		)
		assert.strictEqual(sequentialRangeHost._sequentialIdRangeProbeRunId, undefined, 'a failed local gt probe must never be cached')
		failIdGtQueries = false
		const sequentialVisited = await sequentialRangeHost.visitInvitationRecords(
			stringRangeWheres[0],
			sequentialRangeHost.queryRunId,
			{ _id: true, inviter_uid: true, invite_time: true },
			() => {},
			{ parallel: false, silent: true }
		)
		assert.strictEqual(sequentialVisited.total, 2)
		assert.strictEqual(sequentialRangeHost._sequentialIdRangeProbeRunId, sequentialRangeHost.queryRunId)
	} finally {
		failIdGtQueries = false
		rows.splice(0, rows.length, ...rowsBeforeStringRangeCapability)
	}

	const rowsBeforeFalseEmpty = rows.slice()
	const baselineBeforeFalseEmpty = clone(storedBaseline())
	rows.splice(0, rows.length, inviter, invitee(0))
	delete storage[BASELINE_STORAGE_KEY]
	const falseEmptyHost = createHost()
	falseEmptyHost.scanResults = [{ inviterId: 'protected-result' }]
	falseEmptyHost.resolveScanPlan = async confirmedAt => ({
		scope: 'all',
		description: 'simulated broken primary filter',
		where: {
			inviter_uid: command.and([command.exists(true), command.neq(''), command.neq(null)]),
			invite_time: command.gt(confirmedAt + 1)
		},
		forcedInviter: null
	})
	const originalFalseEmptyConsoleError = console.error
	unexpectedModal = null
	console.error = () => {}
	try {
		await falseEmptyHost.startRiskScan()
	} finally {
		console.error = originalFalseEmptyConsoleError
		rows.splice(0, rows.length, ...rowsBeforeFalseEmpty)
	}
	assert.strictEqual(unexpectedModal && unexpectedModal.content, ZERO_RESULT_FAILURE_CONTENT)
	assert.deepStrictEqual(falseEmptyHost.scanResults, [{ inviterId: 'protected-result' }])
	assert.deepStrictEqual(storedBaseline(), { version: 1, updatedAt: 0, revision: 0, records: {} })
	storage[BASELINE_STORAGE_KEY] = clone(baselineBeforeFalseEmpty)

	const immediateAutoHost = createHost()
	const immediateAutoId = 'immediate-auto-banned'
	const immediatePendingChange = {
		firstDiscovery: true,
		newInviter: false,
		newInviteeIds: [],
		newIpGroups: [],
		grownIpGroups: []
	}
	const immediateBaseline = clone(storedBaseline())
	immediateBaseline.records[immediateAutoId] = {
		...clone(pendingRecord),
		pendingReview: true,
		pendingChange: clone(immediatePendingChange)
	}
	storage[BASELINE_STORAGE_KEY] = clone(immediateBaseline)
	immediateAutoHost._discoveryBaselineCache = clone(immediateBaseline)
	immediateAutoHost.scanResults = [{
		inviterId: immediateAutoId,
		inviter: { _id: immediateAutoId, status: 3 },
		pendingReview: true,
		pendingChange: clone(immediatePendingChange),
		riskLevel: 'normal',
		highestIpCount: 1,
		invitedCount: 1
	}]
	immediateAutoHost.scanSummary = { ...immediateAutoHost.scanSummary, pendingCount: 1 }
	const unwritableAutoHost = createHost()
	unwritableAutoHost.baselineWritable = false
	unwritableAutoHost._discoveryBaselineCache = clone(immediateBaseline)
	unwritableAutoHost.scanResults = clone(immediateAutoHost.scanResults)
	const reviewCallsBeforeUnwritableAuto = baselineReviewCallCount
	assert.deepStrictEqual(
		await unwritableAutoHost.autoBaselineBannedInviter(immediateAutoId),
		{ eligible: true, saved: false },
		'a failed scan-baseline commit must not approve an older stored snapshot after banning the inviter'
	)
	assert.strictEqual(baselineReviewCallCount, reviewCallsBeforeUnwritableAuto)
	assert.strictEqual(unwritableAutoHost.scanResults[0].pendingReview, true)
	const immediateAutoResult = await immediateAutoHost.autoBaselineBannedInviter(immediateAutoId)
	assert.deepStrictEqual(immediateAutoResult, { eligible: true, saved: true })
	assert.strictEqual(immediateAutoHost.scanResults[0].pendingReview, false)
	assert.strictEqual(immediateAutoHost.scanResults[0].autoBaselined, true)
	assert.strictEqual(storedBaseline().records[immediateAutoId].pendingReview, false)
	assert.strictEqual(storedBaseline().records[immediateAutoId].pendingChange, null)

	const postBanActivityId = 'post-ban-activity'
	const postBanPendingChange = {
		firstDiscovery: false,
		newInviter: false,
		newInviteeIds: ['late-user'],
		newIpGroups: [],
		grownIpGroups: []
	}
	const postBanBaseline = clone(storedBaseline())
	postBanBaseline.records[postBanActivityId] = {
		...clone(pendingRecord),
		pendingReview: true,
		pendingChange: clone(postBanPendingChange)
	}
	storage[BASELINE_STORAGE_KEY] = clone(postBanBaseline)
	const postBanActivityHost = createHost()
	postBanActivityHost._discoveryBaselineCache = clone(postBanBaseline)
	postBanActivityHost.scanResults = [{
		inviterId: postBanActivityId,
		inviter: { _id: postBanActivityId, status: 3 },
		pendingReview: true,
		pendingChange: clone(postBanPendingChange),
		change: clone(postBanPendingChange),
		riskLevel: 'normal',
		highestIpCount: 1,
		invitedCount: 1
	}]
	postBanActivityHost.scanSummary = { ...postBanActivityHost.scanSummary, pendingCount: 1 }
	assert.deepStrictEqual(
		await postBanActivityHost.autoBaselineBannedInviter(postBanActivityId),
		{ eligible: true, saved: true },
		'new activity must also be marked reviewed immediately after the operator bans the inviter'
	)
	assert.strictEqual(postBanActivityHost.scanResults.length, 1, 'automatic review must never delete the inviter result')
	assert.strictEqual(postBanActivityHost.scanResults[0].pendingReview, false)
	assert.strictEqual(storedBaseline().records[postBanActivityId].pendingReview, false)
	postBanActivityHost.scanReviewFilter = 'all'
	assert.deepStrictEqual(postBanActivityHost.filteredScanResults.map(item => item.inviterId), [postBanActivityId])
	postBanActivityHost.scanReviewFilter = 'reviewed'
	assert.deepStrictEqual(postBanActivityHost.filteredScanResults.map(item => item.inviterId), [postBanActivityId])
	postBanActivityHost.scanReviewFilter = 'pending'
	assert.deepStrictEqual(postBanActivityHost.filteredScanResults, [])

	const missingReviewHost = createHost()
	missingReviewHost._discoveryBaselineCache = {
		version: 1,
		updatedAt: storedBaseline().updatedAt,
		revision: storedBaseline().revision,
		records: {}
	}
	missingReviewHost.scanResults = [{
		inviterId: 'missing-review-record',
		pendingReview: true,
		pendingChange: clone(immediatePendingChange)
	}]
	assert.strictEqual(await missingReviewHost.markInviterReviewed(missingReviewHost.scanResults[0]), false)
	assert.strictEqual(missingReviewHost.baselineWarning, '本地基线中未找到该邀请人，请重新检测。')
	assert.strictEqual(missingReviewHost.scanResults[0].pendingReview, true)

	host.disposeDiscovery()
	console.log('violation invitation V2 discovery flow: ok')
}

run().catch(error => {
	console.error(error)
	process.exitCode = 1
})

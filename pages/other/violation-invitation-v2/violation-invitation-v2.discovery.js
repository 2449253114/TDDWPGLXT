const {
	createInviterScanAccumulator,
	accumulateInviterAccount,
	finalizeInviterScanAccumulator,
	compareAndMergeBaseline,
	emptyBaseline,
	normalizeInviteTime,
	getBusinessDayKey,
	resolveBusinessDateRange,
	formatBusinessTimestamp,
	RISK_RANK
} = require('./violation-invitation-v2.scan.js')
const { chunkArray, normalizeIp } = require('./violation-invitation-v2.utils.js')
const { createBaselineStore } = require('./violation-invitation-v2.baseline-store.js')

const db = uniCloud.database()
const dbCmd = db.command
const userCollection = db.collection('user-accounts')
const QUERY_BATCH_SIZE = 1000
const INVITER_BATCH_SIZE = 50
const INVITER_QUERY_CONCURRENCY = 4
const LOCAL_RETRY_CONCURRENCY = 3
const RELATION_QUERY_CONCURRENCY = 6
const ID_RANGE_PROBE_CONCURRENCY = 3
const RELATION_SHARD_COUNT = 24
const SCAN_READ_MAX_ATTEMPTS = 3
const SCAN_READ_RETRY_DELAYS_MS = [250, 750]
const ALIYUN_AUTO_ID_PATTERN = /^[0-9a-f]{24}$/
const SCAN_CONSISTENCY_MESSAGE = '邀请关系或风险字段在扫描期间发生变化，请重新检测'
const ZERO_RESULT_PROTECTION_MESSAGE = '本轮检测结果异常为 0，已阻止覆盖或清空，请重新检测'
const detailCache = new Map()
const injectedBaselineStore = typeof uni !== 'undefined' && uni.__violationInvitationV2BaselineStore
const baselineStore = injectedBaselineStore || createBaselineStore()

function emptyScanSummary() {
	return {
		inviterCount: 0,
		inviteeCount: 0,
		normalCount: 0,
		mediumCount: 0,
		highCount: 0,
		abnormalCount: 0,
		unknownCount: 0,
		pendingCount: 0,
		highIpGroupCount: 0,
		mediumIpGroupCount: 0,
		maxSharedIpCount: 0,
		firstDiscoveryCount: 0,
		skippedCount: 0,
		newInviterCount: 0,
		newInviteeCount: 0,
		newIpGroupCount: 0,
		grownIpGroupCount: 0,
		riskUpgradeCount: 0,
		hasCurrentChanges: false
	}
}

function emptyScanReadSummary() {
	return {
		relationshipCount: 0,
		discoveredInviterCount: 0,
		stableInviterCount: 0,
		skippedInviterCount: 0
	}
}

async function mapWithConcurrency(items, concurrency, mapper) {
	const source = Array.isArray(items) ? items : []
	if (!source.length) return []
	const results = new Array(source.length)
	let nextIndex = 0
	let firstError = null
	const workerCount = Math.min(Math.max(1, concurrency), source.length)
	const workers = Array.from({ length: workerCount }, async () => {
		while (!firstError && nextIndex < source.length) {
			const index = nextIndex++
			try {
				results[index] = await mapper(source[index], index)
			} catch (error) {
				firstError = firstError || error
			}
		}
	})
	await Promise.all(workers)
	if (firstError) throw firstError
	return results
}

function scanConsistencyError(detail) {
	const error = new Error(detail || SCAN_CONSISTENCY_MESSAGE)
	error.scanConsistency = true
	return error
}

function zeroResultProtectionError(detail) {
	const error = new Error(detail || ZERO_RESULT_PROTECTION_MESSAGE)
	error.zeroResultProtection = true
	return error
}

function scanCancelledError() {
	const error = new Error('检测已取消')
	error.scanCancelled = true
	return error
}

function scanReadErrorText(error) {
	if (typeof error === 'string') return error
	const values = [
		error && error.message,
		error && error.errMsg,
		error && error.code,
		error && error.errCode,
		error && error.cause && error.cause.message,
		error && error.cause && error.cause.errMsg
	]
	return Array.from(new Set(values
		.filter(value => value !== undefined && value !== null && String(value).trim())
		.map(value => String(value).trim())))
		.join('；') || '未知请求错误'
}

function isRetryableScanReadError(error) {
	const detail = scanReadErrorText(error)
	if (/schema|database validation|permission|unauthori[sz]ed|forbidden|字段.*不存在|验证失败|权限|索引|index/i.test(detail)) {
		return false
	}
	return /request\s*:\s*fail|network|timeout|timed out|econn(?:reset|refused|aborted)|socket|fetch failed|connection|abort(?:ed)?/i.test(detail)
}

function formatStreamMetric(processed, total, completedShards, shardCount, noun) {
	if (Number.isSafeInteger(total)) return `${processed} / ${total} ${noun}`
	const completed = Number(completedShards) || 0
	const shards = Number(shardCount) || 0
	return `已读取 ${processed} ${noun}；并行分片 ${completed} / ${shards}`
}

function hasCurrentChange(change) {
	if (!change) return false
	return Boolean(
		change.firstDiscovery ||
		change.newInviter ||
		(change.newInviteeIds && change.newInviteeIds.length) ||
		(change.newIpGroups && change.newIpGroups.length) ||
		(change.grownIpGroups && change.grownIpGroups.length) ||
		change.riskUpgraded ||
		change.reachedHigh
	)
}

function normalizeInviteCode(value) {
	return String(value || '').trim().toUpperCase()
}

function inviterField() {
	return {
		_id: true,
		my_invite_code: true,
		nickname: true,
		status: true,
		register_date: true,
		register_ip: true,
		login_date: true,
		login_ip: true
	}
}

function inviterVerificationField() {
	return {
		_id: true,
		my_invite_code: true,
		status: true,
		register_ip: true
	}
}

function inviteeField() {
	return {
		_id: true,
		inviter_uid: true,
		my_invite_code: true,
		nickname: true,
		status: true,
		device_oaid: true,
		invite_time: true,
		register_date: true,
		register_ip: true,
		login_date: true,
		login_ip: true
	}
}

function candidateField() {
	return {
		_id: true,
		inviter_uid: true,
		invite_time: true
	}
}

function riskScanField() {
	return {
		_id: true,
		inviter_uid: true,
		invite_time: true,
		register_ip: true,
		login_date: true,
		login_ip: true
	}
}

function riskVerificationField() {
	// login_date/login_ip 会随正常登录变化。首遍仅采纳 login_date 不晚于 confirmedAt
	// 的登录 IP；扫描开始后的登录留到下一轮，不能让正常登录持续打断长扫描。
	return {
		_id: true,
		inviter_uid: true,
		invite_time: true,
		register_ip: true
	}
}

function inviterReferenceCondition() {
	return dbCmd.and([
		dbCmd.exists(true),
		dbCmd.neq(''),
		dbCmd.neq(null)
	])
}

function invitationTimeAsOfCondition(confirmedAt) {
	const millisecondsEnd = Number(confirmedAt)
	if (!Number.isSafeInteger(millisecondsEnd) || millisecondsEnd <= 0) {
		throw new TypeError('检测确认时间无效')
	}
	// user-accounts.schema.json 将 invite_time 定义为 timestamp，项目内所有绑定入口也都写入 Date.now()。
	// 使用单一、排他的毫秒边界，避免复合 not/or 在旧版 ClientDB 上被错误序列化为全不匹配。
	return dbCmd.lt(millisecondsEnd)
}

function createProjectedFingerprint() {
	return {
		count: 0,
		serializedLength: 0,
		hashA: 2166136261,
		hashB: 3339675911
	}
}

function normalizeProjectedValue(key, value) {
	if (value === undefined || value === null) return null
	if (key === '_id') return String(value)
	if (key === 'inviter_uid') return value
	if (key === 'invite_time') return normalizeInviteTime(value) || null
	if (key === 'register_ip' || key === 'login_ip') return normalizeIp(value) || null
	if (typeof value === 'string' && !value.trim()) return null
	return value
}

function projectedRecordSignature(record, fields) {
	return JSON.stringify(Object.keys(fields).map(key => [
		key,
		normalizeProjectedValue(key, record ? record[key] : undefined)
	]))
}

function requireRelationshipInviterId(record) {
	const value = record && record.inviter_uid
	if (typeof value !== 'string' || !value || value.trim() !== value) {
		const recordId = record && record._id ? String(record._id) : '未知记录'
		throw new Error(`邀请关系 ${recordId} 的 inviter_uid 不是无首尾空格的非空字符串，请先修复数据`)
	}
	return value
}

function appendProjectedFingerprint(fingerprint, record, fields) {
	const serialized = projectedRecordSignature(record, fields)
	const framed = `${serialized.length}:${serialized};`
	for (let index = 0; index < framed.length; index++) {
		const code = framed.charCodeAt(index)
		fingerprint.hashA = Math.imul(fingerprint.hashA ^ code, 16777619) >>> 0
		fingerprint.hashB = Math.imul(fingerprint.hashB ^ code, 2246822519) >>> 0
		fingerprint.hashB = (fingerprint.hashB ^ (fingerprint.hashB >>> 13)) >>> 0
	}
	fingerprint.count++
	fingerprint.serializedLength += framed.length
}

function appendInviterFingerprint(fingerprints, record, fields) {
	const inviterId = requireRelationshipInviterId(record)
	if (!fingerprints.has(inviterId)) fingerprints.set(inviterId, createProjectedFingerprint())
	appendProjectedFingerprint(fingerprints.get(inviterId), record, fields)
}

function changedFingerprintInviterIds(initialFingerprints, verifiedFingerprints) {
	const affected = new Set()
	const initial = initialFingerprints instanceof Map ? initialFingerprints : new Map()
	const verified = verifiedFingerprints instanceof Map ? verifiedFingerprints : new Map()
	initial.forEach((fingerprint, inviterId) => {
		if (!sameProjectedFingerprint(fingerprint, verified.get(inviterId))) affected.add(inviterId)
	})
	verified.forEach((fingerprint, inviterId) => {
		if (!initial.has(inviterId)) affected.add(inviterId)
	})
	return affected
}

function sameProjectedFingerprint(left, right) {
	return Boolean(
		left &&
		right &&
		left.count === right.count &&
		left.serializedLength === right.serializedLength &&
		left.hashA === right.hashA &&
		left.hashB === right.hashB
	)
}

function withIdRange(where, lowerExclusive, upperInclusive) {
	const conditions = []
	if (where && Object.prototype.hasOwnProperty.call(where, '_id')) conditions.push(where._id)
	if (lowerExclusive) conditions.push(dbCmd.gt(lowerExclusive))
	if (upperInclusive) conditions.push(dbCmd.lte(upperInclusive))
	if (!conditions.length) return { ...(where || {}) }
	return {
		...(where || {}),
		_id: conditions.length === 1 ? conditions[0] : dbCmd.and(conditions)
	}
}

function idOrderingValue(value) {
	return value === undefined || value === null ? '' : String(value)
}

function sameCandidateRecords(leftRows, rightRows) {
	const normalize = rows => (Array.isArray(rows) ? rows : [])
		.filter(row => row && typeof row._id === 'string' && row._id)
		.map(row => projectedRecordSignature(row, candidateField()))
		.sort()
	const leftRecords = normalize(leftRows)
	const rightRecords = normalize(rightRows)
	return leftRecords.length === rightRecords.length && leftRecords.every((record, index) => record === rightRecords[index])
}

function localIsolationLimit(inviterCount) {
	const count = Math.max(0, Number(inviterCount) || 0)
	return Math.min(1000, Math.max(20, Math.ceil(count * 0.01)))
}

function finalizeRawScanResult(accumulator, inviter, scopeMatchedCount) {
	accumulator.inviter = inviter
	const analyzed = finalizeInviterScanAccumulator(accumulator)
	analyzed.scopeMatchedCount = Number(scopeMatchedCount) || 0
	if (inviter.missing) analyzed.riskReasons.unshift('邀请人账号不存在或当前无读取权限')
	const { ipGroups, accountRiskById, riskReasonDetails, changes, ...scanResult } = analyzed
	scanResult.riskReasonCount = analyzed.riskReasons.length
	scanResult.riskReasons = analyzed.riskReasons.slice(0, 3)
	return scanResult
}

function createHexIdShardWheres(
	where,
	minimumId,
	maximumId,
	shardCount = RELATION_SHARD_COUNT,
	fixedUpperBoundary = maximumId
) {
	// 只有 ClientDB 明确返回的 24 位十六进制字符串才能参与人工分片计算。
	// ObjectId-like 对象必须保持原值交回数据库，不能先 String() 成为 [object Object]。
	if (
		typeof minimumId !== 'string' ||
		typeof maximumId !== 'string' ||
		typeof fixedUpperBoundary !== 'string'
	) return [where]
	const minimum = minimumId
	const maximum = maximumId
	const physicalMaximum = fixedUpperBoundary
	if (
		!ALIYUN_AUTO_ID_PATTERN.test(minimum) ||
		!ALIYUN_AUTO_ID_PATTERN.test(maximum) ||
		!ALIYUN_AUTO_ID_PATTERN.test(physicalMaximum) ||
		minimum >= maximum ||
		maximum > physicalMaximum ||
		typeof BigInt !== 'function'
	) {
		return [where]
	}

	const minimumValue = BigInt(`0x${minimum}`)
	const maximumValue = BigInt(`0x${maximum}`)
	const span = maximumValue - minimumValue
	const count = Math.max(2, Number(shardCount) || RELATION_SHARD_COUNT)
	const countValue = BigInt(count)
	const boundaries = []
	let previousValue = minimumValue
	for (let index = 1; index <= count; index++) {
		const boundaryValue = index === count
			? maximumValue
			: minimumValue + (span * BigInt(index)) / countValue
		if (boundaryValue <= previousValue && index !== count) continue
		const boundary = boundaryValue.toString(16).padStart(maximum.length, '0')
		if (!boundaries.length || boundaries[boundaries.length - 1] !== boundary) boundaries.push(boundary)
		previousValue = boundaryValue
	}

	if (boundaries.length < 2) return [where]
	boundaries[boundaries.length - 1] = physicalMaximum
	let lowerExclusive = ''
	return boundaries.map(upperInclusive => {
		const shardWhere = withIdRange(where, lowerExclusive, upperInclusive)
		lowerExclusive = upperInclusive
		return shardWhere
	})
}

module.exports = {
	data() {
		return {
			scanScope: 'all',
			scanDateMode: 'today',
			scanDateRange: [],
			customScanDays: '',
			businessToday: getBusinessDayKey(Date.now()),
			scanDateOptions: [
				{ value: 'today', label: '今天' },
				{ value: 'yesterday', label: '昨天' },
				{ value: 'dayBeforeYesterday', label: '前天' },
				{ value: 'days3', label: '3 天内' },
				{ value: 'days7', label: '7 天内' },
				{ value: 'days15', label: '15 天内' },
				{ value: 'days30', label: '30 天内' },
				{ value: 'custom', label: '自定义天数' },
				{ value: 'manual', label: '手动日期' }
			],
			scanResults: [],
			scanSkippedInviters: [],
			scanSummary: emptyScanSummary(),
			scanCompletedAt: 0,
			scanRiskFilter: 'all',
			scanReviewFilter: 'all',
			scanKeyword: '',
			scanPage: 1,
			scanPageSize: 30,
			scanRiskOptions: [
				{ value: 'all', label: '全部' },
				{ value: 'abnormal', label: '异常中' },
				{ value: 'high', label: '高风险' },
				{ value: 'medium', label: '中风险' },
				{ value: 'normal', label: '正常' },
				{ value: 'unknown', label: '无有效 IP' },
				{ value: 'banned', label: '已封禁' }
			],
			scanReviewOptions: [
				{ value: 'all', label: '全部' },
				{ value: 'pending', label: '待审核' },
				{ value: 'reviewed', label: '已审核' },
				{ value: 'changed', label: '本次新增/升级' }
			],
			baselineWritable: true,
			baselineWarning: '',
			isReviewingBaseline: false,
			isRiskScanning: false,
			isCommittingScan: false,
			scanReadSummary: emptyScanReadSummary(),
			pendingOpenInviteCode: '',
			selectedScanInviterId: '',
			detailLoadTarget: null,
			detailLoadError: '',
			selectedNewInviteeIds: {},
			selectedChangedIpGroups: {},
			scanResultScope: '',
			scanResultScopeDescription: ''
		}
	},
	computed: {
		filteredScanResults() {
			const keyword = String(this.scanKeyword || '').trim().toLowerCase()
			return this.scanResults
				.filter(item => {
					if (this.scanRiskFilter === 'banned') {
						if (!item.inviter || Number(item.inviter.status) !== 3) return false
					} else if (this.scanRiskFilter !== 'all' && item.riskLevel !== this.scanRiskFilter) {
						return false
					}
					if (this.scanReviewFilter === 'pending' && !item.pendingReview) return false
					if (this.scanReviewFilter === 'reviewed' && item.pendingReview) return false
					if (this.scanReviewFilter === 'changed' && !hasCurrentChange(item.change)) return false
					if (!keyword) return true
					return [item.inviterId, item.inviter && item.inviter.my_invite_code]
						.some(value => String(value || '').toLowerCase().includes(keyword))
				})
				.slice()
				.sort((left, right) => {
					if (left.pendingReview !== right.pendingReview) return left.pendingReview ? -1 : 1
					const riskDifference = RISK_RANK[right.riskLevel] - RISK_RANK[left.riskLevel]
					if (riskDifference !== 0) return riskDifference
					if (right.highestIpCount !== left.highestIpCount) return right.highestIpCount - left.highestIpCount
					if (right.invitedCount !== left.invitedCount) return right.invitedCount - left.invitedCount
					return left.inviterId.localeCompare(right.inviterId)
				})
		},
		pagedScanResults() {
			const start = (this.scanPage - 1) * this.scanPageSize
			return this.filteredScanResults.slice(start, start + this.scanPageSize)
		},
		scanSkippedPreview() {
			return this.scanSkippedInviters.slice(0, 20)
		},
		scanSkippedRemainingCount() {
			return Math.max(0, this.scanSkippedInviters.length - this.scanSkippedPreview.length)
		}
	},
	methods: {
		async initializeDiscovery(options) {
			const initializeRunId = this.queryRunId
			this._discoveryBaselineCache = emptyBaseline()
			await this.loadDiscoveryBaseline([])
			if (initializeRunId !== this.queryRunId) return
			if (!options || !options.inviteCode) return

			let inviteCode
			try {
				inviteCode = decodeURIComponent(options.inviteCode)
			} catch (error) {
				inviteCode = String(options.inviteCode)
			}
			this.scanScope = 'code'
			this.inviteCodeInput = normalizeInviteCode(inviteCode)
			this.pendingOpenInviteCode = this.inviteCodeInput
			this.$nextTick(() => this.startRiskScan())
		},
		disposeDiscovery() {
			detailCache.clear()
			this._discoveryBaselineCache = emptyBaseline()
		},
		async loadDiscoveryBaseline(inviterIds = [], strict = false) {
			const loadRunId = this.queryRunId
			try {
				const initialized = await baselineStore.initialize()
				const baseline = await baselineStore.loadRecords(inviterIds)
				if (loadRunId !== this.queryRunId) return baseline
				this.baselineWritable = true
				this.baselineWarning = initialized.warnings && initialized.warnings.length
					? initialized.warnings.map(warning => warning.message).join('；')
					: ''
				return baseline
			} catch (error) {
				if (loadRunId === this.queryRunId) {
					this.baselineWritable = false
					this.baselineWarning = `读取浏览器本地检测基线失败：${this.getErrorMessage(error)}。无法安全生成新增／待审核结果，原基线未被覆盖。`
				}
				if (strict) throw error
				return emptyBaseline()
			}
		},
		async persistDiscoveryBaseline(baseline, replaceAll, expectedRevision) {
			try {
				const result = replaceAll
					? await baselineStore.replaceAll(baseline, expectedRevision)
					: await baselineStore.mergeBaseline(baseline, expectedRevision)
				this.baselineWritable = true
				this.baselineWarning = ''
				return { ...baseline, revision: result.revision }
			} catch (error) {
				this.baselineWritable = false
				this.baselineWarning = error && error.code === 'BASELINE_CONFLICT'
					? '检测期间本地基线已被其他标签页更新，本轮结果未写入基线；请重新检测后再审核。'
					: `检测已完成，但浏览器本地新增基线保存失败：${this.getErrorMessage(error)}。刷新页面后可能重复显示新增提醒。`
				return null
			}
		},
		confirmClearDiscoveryBaseline() {
			if (this.busy) return
			uni.showModal({
				title: '清除本地检测基线',
				content: '清除后无法判断此前已经发现过的邀请人和受邀账号；下一次成功检测会全部显示为“首次发现／待审核”。是否继续？',
				success: async result => {
					if (!result.confirm || this.busy) return
					this.isQuerying = true
					this.setTask('正在清除浏览器本地检测基线', null)
					try {
						const cleared = await baselineStore.clearAll()
						this._discoveryBaselineCache = { ...emptyBaseline(), revision: cleared.revision }
						detailCache.clear()
						this.scanResults = []
						this.scanSkippedInviters = []
						this.scanSummary = emptyScanSummary()
						this.scanReadSummary = emptyScanReadSummary()
						this.scanCompletedAt = 0
						this.scanResultScope = ''
						this.scanResultScopeDescription = ''
						this.baselineWritable = true
						this.baselineWarning = cleared.warnings && cleared.warnings.length
							? cleared.warnings.map(warning => warning.message).join('；')
							: '浏览器本地检测基线已清除；下一次检测将重新建立首次基线。'
						this.resetQueryResult()
						this.setTask('浏览器本地检测基线已清除', { metricText: '已完成' })
					} catch (error) {
						this.baselineWritable = false
						this.baselineWarning = `清除浏览器本地检测基线失败：${this.getErrorMessage(error)}`
						this.setTask(this.baselineWarning, { metricText: '失败' }, true)
					} finally {
						this.isQuerying = false
					}
				}
			})
		},
		setScanScope(scope) {
			if (this.busy || !['all', 'time', 'code'].includes(scope)) return
			this.scanScope = scope
		},
		setScanDateMode(mode) {
			if (this.busy || !this.scanDateOptions.some(option => option.value === mode)) return
			this.scanDateMode = mode
		},
		onManualScanDateChanged() {
			if (this.busy) return
			this.scanDateMode = 'manual'
		},
		setScanRiskFilter(value) {
			this.scanRiskFilter = value
			this.scanPage = 1
		},
		setScanReviewFilter(value) {
			this.scanReviewFilter = value
			this.scanPage = 1
		},
		resetScanResultFilters() {
			this.scanRiskFilter = 'all'
			this.scanReviewFilter = 'all'
			this.scanKeyword = ''
			this.scanPage = 1
		},
		publishScanView({
			results,
			skippedDetails,
			summary,
			plan,
			readSummary,
			completedAt = Date.now()
		}) {
			this.scanResults = results
			this.scanSkippedInviters = skippedDetails
			this.scanSummary = summary
			this.scanCompletedAt = completedAt
			this.scanResultScope = plan.scope
			this.scanResultScopeDescription = plan.description
			this.scanReadSummary = readSummary
			this.resetScanResultFilters()
		},
		onScanFilterChanged() {
			this.scanPage = 1
		},
		changeScanPage(event) {
			this.scanPage = event.current
		},
		waitForScanReadRetry(delayMs) {
			return new Promise(resolve => setTimeout(resolve, delayMs))
		},
		async readClientDbWithRetry(stage, runId, requestFactory) {
			if (typeof requestFactory !== 'function') {
				throw new TypeError('ClientDB 读取请求必须以函数形式提供')
			}
			for (let attempt = 1; attempt <= SCAN_READ_MAX_ATTEMPTS; attempt++) {
				if (runId !== this.queryRunId) throw scanCancelledError()
				try {
					return await requestFactory()
				} catch (error) {
					if (runId !== this.queryRunId) throw scanCancelledError()
					if (!isRetryableScanReadError(error)) throw error
					if (attempt === SCAN_READ_MAX_ATTEMPTS) {
						const exhaustedError = new Error(
							`${stage}连续 ${SCAN_READ_MAX_ATTEMPTS} 次请求失败：${scanReadErrorText(error)}`
						)
						exhaustedError.scanReadFailure = true
						exhaustedError.cause = error
						throw exhaustedError
					}
					this.setTask(`网络请求暂时失败，正在重试：${stage}`, {
						metricText: `第 ${attempt + 1} / ${SCAN_READ_MAX_ATTEMPTS} 次读取`
					})
					await this.waitForScanReadRetry(SCAN_READ_RETRY_DELAYS_MS[attempt - 1])
				}
			}
			throw new Error(`${stage}读取失败`)
		},
		async resolveScanPlan(confirmedAt = Date.now(), runId = this.queryRunId) {
			const asOfCondition = invitationTimeAsOfCondition(confirmedAt)
			if (this.scanScope === 'code') {
				const inviteCode = normalizeInviteCode(this.inviteCodeInput)
				this.inviteCodeInput = inviteCode
				if (!/^[A-Z0-9]{6}$/.test(inviteCode)) {
					throw new Error('指定邀请码必须是 6 位字母或数字')
				}
				const { result: { data } } = await this.readClientDbWithRetry(
					'读取指定邀请码对应的邀请人',
					runId,
					() => userCollection.where({
						my_invite_code: inviteCode
					}).field(inviterField()).limit(2).get()
				)
				if (data.length === 0) throw new Error('未找到该邀请码对应的邀请人')
				if (data.length > 1) throw new Error('邀请码对应多个账号，请先修复重复数据')
				return {
					scope: 'code',
					description: `指定邀请码 ${inviteCode}；风险按截至本次检测确认时刻该邀请人名下的受邀账号计算`,
					where: { inviter_uid: data[0]._id, invite_time: asOfCondition },
					forcedInviter: data[0]
				}
			}

			const inviterCondition = inviterReferenceCondition()
			if (this.scanScope === 'time') {
				const { startMs: start, endMs: end } = resolveBusinessDateRange({
					mode: this.scanDateMode,
					customDays: this.customScanDays,
					dateRange: this.scanDateRange,
					confirmedAt
				})
				const exclusiveEnd = Math.min(confirmedAt, end + 1)
				if (exclusiveEnd <= start) throw new Error('邀请时间范围没有可检测的有效时段')
				return {
					scope: 'time',
					description: `${formatBusinessTimestamp(start)} 至 ${formatBusinessTimestamp(end)}（北京时间）内产生邀请关系的邀请人；风险按截至本次检测确认时刻其名下的受邀账号计算`,
					where: {
						inviter_uid: inviterCondition,
						invite_time: dbCmd.and([dbCmd.gte(start), dbCmd.lt(exclusiveEnd)])
					},
					candidateStart: start,
					candidateEndExclusive: exclusiveEnd,
					forcedInviter: null
				}
			}

			return {
				scope: 'all',
				description: '截至本次检测确认时刻的全部有效邀请关系；风险按每位邀请人名下受邀账号计算',
				where: { inviter_uid: inviterCondition, invite_time: asOfCondition },
				forcedInviter: null
			}
		},
		async readDatasetBounds(where, runId) {
			const fields = { _id: true }
			const [minimumResponse, maximumResponse] = await Promise.all([
				this.readClientDbWithRetry(
					'读取邀请关系最小边界',
					runId,
					() => userCollection.where(where).field(fields).orderBy('_id', 'asc').limit(1).get()
				),
				this.readClientDbWithRetry(
					'读取邀请关系最大边界',
					runId,
					() => userCollection.where(where).field(fields).orderBy('_id', 'desc').limit(1).get()
				)
			])
			if (runId !== this.queryRunId) return null
			const minimumRow = minimumResponse.result.data[0]
			const maximumRow = maximumResponse.result.data[0]
			return {
				minimumId: minimumRow && minimumRow._id ? minimumRow._id : '',
				maximumId: maximumRow && maximumRow._id ? maximumRow._id : ''
			}
		},
		async assertIdRangePagingSupported(where, bounds, runId) {
			if (!bounds || !bounds.maximumId) return true
			const minimumId = bounds.minimumId
			const maximumId = bounds.maximumId
			if (typeof minimumId !== 'string' || typeof maximumId !== 'string') {
				throw new Error('ClientDB 返回了非字符串用户 ID，无法安全执行邀请关系游标分页')
			}

			let lowerWhere = withIdRange(where, '', maximumId)
			let upperWhere = null
			let splitBoundary = ''
			if (
				ALIYUN_AUTO_ID_PATTERN.test(minimumId) &&
				ALIYUN_AUTO_ID_PATTERN.test(maximumId) &&
				minimumId < maximumId &&
				typeof BigInt === 'function'
			) {
				const minimumValue = BigInt(`0x${minimumId}`)
				const maximumValue = BigInt(`0x${maximumId}`)
				const candidateBoundary = ((minimumValue + maximumValue) / 2n).toString(16).padStart(24, '0')
				if (candidateBoundary > minimumId && candidateBoundary < maximumId) {
					splitBoundary = candidateBoundary
					lowerWhere = withIdRange(where, '', candidateBoundary)
					upperWhere = withIdRange(where, candidateBoundary, maximumId)
				}
			}
			if (!splitBoundary && minimumId < maximumId) {
				splitBoundary = minimumId
				lowerWhere = withIdRange(where, '', minimumId)
				upperWhere = withIdRange(where, minimumId, maximumId)
			}

			const requests = [
				this.readClientDbWithRetry(
					'验证邀请关系游标下界',
					runId,
					() => userCollection.where(lowerWhere).field({ _id: true }).orderBy('_id', 'desc').limit(1).get()
				)
			]
			if (upperWhere) {
				requests.push(this.readClientDbWithRetry(
					'验证邀请关系游标上界',
					runId,
					() => userCollection.where(upperWhere).field({ _id: true }).orderBy('_id', 'asc').limit(1).get()
				))
			}
			const responses = await Promise.all(requests)
			if (runId !== this.queryRunId) return false
			const lowerId = responses[0].result.data[0] && responses[0].result.data[0]._id
			const upperId = upperWhere && responses[1].result.data[0] && responses[1].result.data[0]._id
			const lowerValid = typeof lowerId === 'string' && (
				!splitBoundary || idOrderingValue(lowerId) <= splitBoundary
			)
			const upperValid = !upperWhere || (
				typeof upperId === 'string' &&
				idOrderingValue(upperId) > splitBoundary &&
				idOrderingValue(upperId) <= maximumId
			)
			if (!lowerValid || !upperValid) {
				throw new Error('当前 ClientDB 未正确执行用户 ID 范围查询，已停止检测以防止漏数')
			}
			return true
		},
		createParallelScanWheres(where, bounds, shardCount = RELATION_SHARD_COUNT, fixedUpperBoundary = '') {
			if (!bounds || !bounds.maximumId) return [where]
			return createHexIdShardWheres(
				where,
				bounds.minimumId,
				bounds.maximumId,
				shardCount,
				fixedUpperBoundary
			)
		},
		async readDatasetMeta(where, runId, fixedUpperBoundary = '') {
			let upperBoundary = fixedUpperBoundary || ''
			if (!upperBoundary) {
				const { result: { data } } = await this.readClientDbWithRetry(
					'读取邀请关系固定上界',
					runId,
					() => userCollection.where(where)
						.field({ _id: true })
						.orderBy('_id', 'desc')
						.limit(1)
						.get()
				)
				upperBoundary = data[0] && data[0]._id ? data[0]._id : ''
			}
			if (runId !== this.queryRunId) return null
			return { where, upperBoundary, total: null }
		},
		async prepareInvitationSnapshots(wheres, fields, runId, verificationFields = fields, fixedUpperBoundary = '') {
			const snapshots = await mapWithConcurrency(wheres, RELATION_QUERY_CONCURRENCY, async where => {
				const meta = await this.readDatasetMeta(where, runId, fixedUpperBoundary)
				return meta ? { ...meta, fields, verificationFields, fingerprint: null } : null
			})
			if (runId !== this.queryRunId || snapshots.some(snapshot => !snapshot)) return null
			return snapshots
		},
		async prepareParallelInvitationSnapshots(
			wheres,
			fields,
			runId,
			verificationFields = fields,
			sharedUpperBoundary = ''
		) {
			const baseWheres = Array.isArray(wheres) ? wheres : []
			if (!baseWheres.length) return []
			const collectionMeta = await this.readDatasetMeta({}, runId, sharedUpperBoundary)
			if (!collectionMeta || runId !== this.queryRunId) return null
			const fixedUpperBoundary = collectionMeta.upperBoundary
			let scanWheres = baseWheres
			if (fixedUpperBoundary && baseWheres.length < RELATION_QUERY_CONCURRENCY) {
				const shardsPerWhere = Math.max(2, Math.floor(RELATION_SHARD_COUNT / baseWheres.length))
				const relationshipBounds = await mapWithConcurrency(
					baseWheres,
					ID_RANGE_PROBE_CONCURRENCY,
					where => this.readDatasetBounds(where, runId)
				)
				if (runId !== this.queryRunId || relationshipBounds.some(bounds => !bounds)) return null
				const capabilities = await mapWithConcurrency(
					baseWheres,
					ID_RANGE_PROBE_CONCURRENCY,
					(where, index) => this.assertIdRangePagingSupported(where, relationshipBounds[index], runId)
				)
				if (runId !== this.queryRunId || capabilities.some(supported => !supported)) return null
				const shardGroups = baseWheres.map((where, index) => this.createParallelScanWheres(
					where,
					relationshipBounds[index],
					shardsPerWhere,
					fixedUpperBoundary
				))
				scanWheres = shardGroups.reduce((all, group) => all.concat(group), [])
			} else if (fixedUpperBoundary) {
				// 大量基础条件不再逐个拆分，但仍用一个真实条件验证 _id 游标能力，
				// 防止“每遍都稳定只返回第一页”被误判为一致。
				const representativeBounds = await this.readDatasetBounds(baseWheres[0], runId)
				if (!representativeBounds || runId !== this.queryRunId) return null
				const supported = await this.assertIdRangePagingSupported(
					baseWheres[0],
					representativeBounds,
					runId
				)
				if (!supported || runId !== this.queryRunId) return null
			}
			this.setTask('正在建立并行扫描分片', {
				metricText: `${scanWheres.length} 个分片，最多 ${Math.min(RELATION_QUERY_CONCURRENCY, scanWheres.length)} 路并行`
			})
			const snapshots = await this.prepareInvitationSnapshots(
				scanWheres,
				fields,
				runId,
				verificationFields,
				fixedUpperBoundary
			)
			if (!snapshots || runId !== this.queryRunId) return null
			snapshots.baseWheres = baseWheres
			snapshots.fixedUpperBoundary = fixedUpperBoundary
			return snapshots
		},
		async readSnapshotPass(snapshot, runId, consumePage, onPage, fields = snapshot.fields, allowCountChange = false) {
			const fingerprint = createProjectedFingerprint()
			const inviterFingerprints = new Map()
			if (!snapshot.upperBoundary) return { fingerprint, inviterFingerprints, visitedTotal: 0 }
			const expectedTotal = Number.isSafeInteger(snapshot.total) ? snapshot.total : null
			let visitedTotal = 0
			let lastId = ''
			let page = 0
			while (true) {
				if (runId !== this.queryRunId) return null
				const pageWhere = withIdRange(snapshot.where, lastId, snapshot.upperBoundary)
				const { result: { data } } = await this.readClientDbWithRetry(
					`读取邀请关系分片第 ${page + 1} 页`,
					runId,
					() => userCollection.where(pageWhere)
						.field(fields)
						.orderBy('_id', 'asc')
						.limit(QUERY_BATCH_SIZE)
						.get()
				)
				if (runId !== this.queryRunId) return null
				if (!data.length) break
				data.forEach(user => {
					if (!user || typeof user._id !== 'string' || !user._id || (lastId && user._id <= idOrderingValue(lastId))) {
						throw scanConsistencyError('邀请关系游标顺序异常')
					}
					lastId = user._id
					appendProjectedFingerprint(fingerprint, user, snapshot.verificationFields)
					appendInviterFingerprint(inviterFingerprints, user, snapshot.verificationFields)
				})
				visitedTotal += data.length
				if (!allowCountChange && expectedTotal !== null && visitedTotal > expectedTotal) {
					throw scanConsistencyError('邀请关系在固定扫描边界内增加')
				}
				if (typeof consumePage === 'function') await consumePage(data, snapshot, page)
				if (typeof onPage === 'function') onPage(data.length)
				page++
				if (data.length < QUERY_BATCH_SIZE) break
			}
			if (!allowCountChange && expectedTotal !== null && visitedTotal !== expectedTotal) {
				throw scanConsistencyError(`邀请关系读取数量不一致：预期 ${expectedTotal} 条，实际 ${visitedTotal} 条`)
			}
			return { fingerprint, inviterFingerprints, visitedTotal }
		},
		async streamInvitationSnapshots(snapshots, runId, consumePage, onProgress) {
			let processed = 0
			let completedShards = 0
			await mapWithConcurrency(snapshots, RELATION_QUERY_CONCURRENCY, async (snapshot, index) => {
				const pass = await this.readSnapshotPass(
					snapshot,
					runId,
					(data, currentSnapshot, page) => consumePage && consumePage(data, currentSnapshot, index, page),
					delta => {
						processed += delta
						if (onProgress) onProgress(processed, null, completedShards, snapshots.length)
					}
				)
				if (pass) {
					snapshot.fingerprint = pass.fingerprint
					snapshot.inviterFingerprints = pass.inviterFingerprints
					snapshot.total = pass.visitedTotal
					completedShards++
					if (onProgress) onProgress(processed, null, completedShards, snapshots.length)
				}
			})
			if (runId !== this.queryRunId) return null
			const total = snapshots.reduce((sum, snapshot) => sum + (Number(snapshot.total) || 0), 0)
			if (processed !== total) throw scanConsistencyError('邀请关系首遍读取未完整结束')
			if (onProgress) onProgress(processed, total, completedShards, snapshots.length)
			return { total }
		},
		async assertNoPostBoundaryMatches(snapshots, runId, isolateChanges = false) {
			const affectedIds = new Set()
			const postBoundaryGuard = snapshots.postBoundaryGuard
			if (postBoundaryGuard) {
				const upperBoundary = snapshots.fixedUpperBoundary || ''
				let lastId = upperBoundary
				while (true) {
					if (runId !== this.queryRunId) return false
					const { result: { data } } = await this.readClientDbWithRetry(
						'复核候选邀请关系固定边界',
						runId,
						() => userCollection.where(
							withIdRange(postBoundaryGuard.where, lastId, '')
						).field({ _id: true, inviter_uid: true })
							.orderBy('_id', 'asc')
							.limit(QUERY_BATCH_SIZE)
							.get()
					)
					if (runId !== this.queryRunId) return false
					for (const user of data) {
						const currentId = user && typeof user._id === 'string' ? user._id : ''
						if (!currentId || (lastId && currentId <= idOrderingValue(lastId))) {
							throw scanConsistencyError('邀请关系边界复核游标顺序异常')
						}
						lastId = currentId
						const inviterId = requireRelationshipInviterId(user)
						if (postBoundaryGuard.inviterIds.has(inviterId)) {
							if (!isolateChanges) throw scanConsistencyError('检测截止时间内出现了超出固定扫描边界的候选邀请关系')
							affectedIds.add(inviterId)
						}
					}
					if (data.length < QUERY_BATCH_SIZE) break
				}
				return runId === this.queryRunId ? (isolateChanges ? affectedIds : true) : false
			}
			const baseWheres = Array.isArray(snapshots.baseWheres) ? snapshots.baseWheres : []
			if (!baseWheres.length) return isolateChanges ? affectedIds : true
			const upperBoundary = snapshots.fixedUpperBoundary || ''
			await mapWithConcurrency(baseWheres, RELATION_QUERY_CONCURRENCY, async where => {
				if (runId !== this.queryRunId) return
				let lastId = upperBoundary
				while (true) {
					const overflowWhere = lastId ? withIdRange(where, lastId, '') : where
					const { result: { data } } = await this.readClientDbWithRetry(
						'复核邀请关系固定边界',
						runId,
						() => userCollection.where(overflowWhere)
							.field({ _id: true, inviter_uid: true })
							.orderBy('_id', 'asc')
							.limit(isolateChanges ? QUERY_BATCH_SIZE : 1)
							.get()
					)
					if (runId !== this.queryRunId) return
					if (data.length && !isolateChanges) {
						throw scanConsistencyError('检测截止时间内出现了超出固定扫描边界的邀请关系')
					}
					for (const user of data) {
						const currentId = user && typeof user._id === 'string' ? user._id : ''
						if (!currentId || (lastId && currentId <= idOrderingValue(lastId))) {
							throw scanConsistencyError('邀请关系边界复核游标顺序异常')
						}
						lastId = currentId
						affectedIds.add(requireRelationshipInviterId(user))
					}
					if (data.length < QUERY_BATCH_SIZE) break
				}
			})
			return runId === this.queryRunId ? (isolateChanges ? affectedIds : true) : false
		},
		async verifyInvitationSnapshots(snapshots, runId, onProgress, reverse = false, isolateChanges = false) {
			const ordered = reverse ? snapshots.slice().reverse() : snapshots.slice()
			const total = ordered.reduce((sum, snapshot) => sum + snapshot.total, 0)
			let processed = 0
			const affectedIds = new Set()
			await mapWithConcurrency(ordered, RELATION_QUERY_CONCURRENCY, async snapshot => {
				const pass = await this.readSnapshotPass(snapshot, runId, null, delta => {
					processed += delta
					if (onProgress) onProgress(processed, total)
				}, snapshot.verificationFields, isolateChanges)
				if (!pass || runId !== this.queryRunId) return
				if (!sameProjectedFingerprint(pass.fingerprint, snapshot.fingerprint)) {
					if (!isolateChanges) throw scanConsistencyError('邀请关系或风险字段在扫描期间发生变化')
					const localized = changedFingerprintInviterIds(snapshot.inviterFingerprints, pass.inviterFingerprints)
					if (!localized.size) throw scanConsistencyError('邀请关系变化无法定位到具体邀请人')
					localized.forEach(inviterId => affectedIds.add(inviterId))
				}
			})
			if (runId !== this.queryRunId) return false
			const boundaryStable = await this.assertNoPostBoundaryMatches(snapshots, runId, isolateChanges)
			if (!boundaryStable || runId !== this.queryRunId) return false
			if (isolateChanges) boundaryStable.forEach(inviterId => affectedIds.add(inviterId))
			if (!isolateChanges && processed !== total) throw scanConsistencyError('邀请关系最终复核未完整结束')
			if (onProgress && total === 0) onProgress(0, 0)
			return isolateChanges ? affectedIds : true
		},
		async visitInvitationRecords(where, runId, fields = inviteeField(), consumePage, options = {}) {
			const parallel = options.parallel !== false
			const silent = options.silent === true
			let snapshots
			if (parallel) {
				snapshots = await this.prepareParallelInvitationSnapshots([where], fields, runId, riskVerificationField())
			} else {
				if (this._sequentialIdRangeProbeRunId !== runId) {
					const bounds = await this.readDatasetBounds(where, runId)
					if (!bounds || runId !== this.queryRunId) return null
					const supported = await this.assertIdRangePagingSupported(where, bounds, runId)
					if (!supported || runId !== this.queryRunId) return null
					if (bounds.minimumId && bounds.minimumId < bounds.maximumId) {
						this._sequentialIdRangeProbeRunId = runId
					}
				}
				snapshots = await this.prepareInvitationSnapshots([where], fields, runId, riskVerificationField())
			}
			if (!snapshots) return null
			if (!parallel) {
				snapshots.baseWheres = [where]
				snapshots.fixedUpperBoundary = snapshots[0] ? snapshots[0].upperBoundary : ''
			}
			const firstPass = await this.streamInvitationSnapshots(
				snapshots,
				runId,
				consumePage,
				silent ? null : (processed, total, completedShards, shardCount) => {
					this.setTask('正在批量读取邀请关系', {
						metricText: formatStreamMetric(processed, total, completedShards, shardCount, '条')
					})
				}
			)
			if (!firstPass || runId !== this.queryRunId) return null
			const verified = await this.verifyInvitationSnapshots(
				snapshots,
				runId,
				silent ? null : (processed, total) => {
					this.setTask('正在复核邀请关系', {
						current: processed,
						total,
						metricText: `复核 ${processed} / ${total} 条`
					})
				}
			)
			return verified ? { total: firstPass.total, upperBoundary: snapshots[0].upperBoundary } : null
		},
		async collectInvitationRecords(where, runId, fields = inviteeField(), options = {}) {
			const loaded = []
			const visited = await this.visitInvitationRecords(
				where,
				runId,
				fields,
				data => loaded.push(...data),
				options
			)
			if (runId !== this.queryRunId || !visited) return null
			return loaded
		},
		async loadInvitationRecords(where, runId, fields = inviteeField()) {
			return this.collectInvitationRecords(where, runId, fields)
		},
		async loadInviterMap(inviterIds, runId, fields = inviterField(), taskMessage = '正在批量加载邀请人资料') {
			const map = new Map()
			const missingIds = inviterIds.slice()
			const chunks = chunkArray(missingIds, INVITER_BATCH_SIZE)
			let queriedCount = 0
			let returnedCount = 0
			let completedBatches = 0
			await mapWithConcurrency(chunks, INVITER_QUERY_CONCURRENCY, async (ids, index) => {
				if (runId !== this.queryRunId) return
				const expectedIds = new Set(ids)
				const { result: { data } } = await this.readClientDbWithRetry(
					`批量加载邀请人资料第 ${index + 1} 批`,
					runId,
					() => userCollection.where({
						_id: dbCmd.in(ids)
					}).field(fields).limit(ids.length).get()
				)
				if (runId !== this.queryRunId) return
				data.forEach(user => {
					if (!user || !expectedIds.has(String(user._id))) {
						throw new Error('批量加载邀请人资料时返回了范围外账号')
					}
					map.set(String(user._id), user)
				})
				queriedCount += ids.length
				returnedCount += data.length
				completedBatches++
				this.setTask(taskMessage, {
					metricText: `${queriedCount} / ${missingIds.length} 人，${completedBatches} / ${chunks.length} 批（返回 ${returnedCount} 份）`
				})
			})
			return runId === this.queryRunId ? map : null
		},
		assertInviterMapStable(inviterIds, initialMap, verifiedMap, isolateChanges = false) {
			const fields = inviterVerificationField()
			const affectedIds = new Set()
			inviterIds.forEach(inviterId => {
				const initial = initialMap.get(inviterId)
				const verified = verifiedMap.get(inviterId)
				if (Boolean(initial) !== Boolean(verified)) {
					if (!isolateChanges) throw scanConsistencyError('邀请人账号在扫描期间新增、删除或读取权限发生变化')
					affectedIds.add(inviterId)
				}
				if (initial && projectedRecordSignature(initial, fields) !== projectedRecordSignature(verified, fields)) {
					if (!isolateChanges) throw scanConsistencyError('邀请人状态、注册 IP 或邀请码在扫描期间发生变化')
					affectedIds.add(inviterId)
				}
			})
			return affectedIds
		},
		async assertForcedInviterStable(plan, verifiedMap, runId) {
			if (!plan || !plan.forcedInviter) return true
			const inviterId = String(plan.forcedInviter._id)
			const verified = verifiedMap.get(inviterId)
			const fields = inviterVerificationField()
			const inviteCode = normalizeInviteCode(plan.forcedInviter.my_invite_code)
			const { result: { data } } = await this.readClientDbWithRetry(
				'复核指定邀请码对应的邀请人',
				runId,
				() => userCollection.where({
					my_invite_code: inviteCode
				}).field(fields).limit(2).get()
			)
			if (runId !== this.queryRunId) return false
			if (
				data.length !== 1 ||
				String(data[0]._id) !== inviterId ||
				!verified ||
				projectedRecordSignature(plan.forcedInviter, fields) !== projectedRecordSignature(verified, fields) ||
				projectedRecordSignature(verified, fields) !== projectedRecordSignature(data[0], fields)
			) {
				throw scanConsistencyError('指定邀请码对应的邀请人在扫描期间发生变化')
			}
			return true
		},
		async retryAffectedInviter(plan, inviterId, confirmedAt, runId) {
			const maxAttempts = 2
			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				if (runId !== this.queryRunId) return null
				this.setTask('正在局部复核变化中的邀请人', {
					metricText: `${inviterId}，第 ${attempt} / ${maxAttempts} 次`
				})
				try {
					const beforeMap = await this.loadInviterMap(
						[inviterId],
						runId,
						inviterField(),
						'正在局部读取邀请人资料'
					)
					if (!beforeMap || runId !== this.queryRunId) return null

					let scopeMatchedCount = 0
					let initialCandidateRows = []
					if (plan.scope === 'time') {
						const candidateRows = await this.collectInvitationRecords({
							...plan.where,
							inviter_uid: inviterId
						}, runId, riskScanField(), { parallel: false, silent: true })
						if (!candidateRows || runId !== this.queryRunId) return null
						initialCandidateRows = candidateRows.filter(user => user && user._id !== inviterId)
						scopeMatchedCount = initialCandidateRows.length
						if (!scopeMatchedCount) {
							return { skipped: true, reason: '邀请关系已离开本次时间范围' }
						}
					}

					const users = await this.collectInvitationRecords({
						inviter_uid: inviterId,
						invite_time: invitationTimeAsOfCondition(confirmedAt)
					}, runId, riskScanField(), { parallel: false, silent: true })
					if (!users || runId !== this.queryRunId) return null
					const genuineUsers = users.filter(user => user && user._id !== inviterId)
					if (!genuineUsers.length && plan.scope !== 'code') {
						return { skipped: true, reason: '邀请关系在扫描期间变为空' }
					}
					if (plan.scope === 'time') {
						const verifiedCandidateRows = await this.collectInvitationRecords({
							...plan.where,
							inviter_uid: inviterId
						}, runId, riskScanField(), { parallel: false, silent: true })
						if (!verifiedCandidateRows || runId !== this.queryRunId) return null
						const genuineVerifiedCandidates = verifiedCandidateRows.filter(user => user && user._id !== inviterId)
						const verifiedCandidateIds = new Set(genuineVerifiedCandidates.map(user => user._id))
						const riskPassCandidates = genuineUsers.filter(user => verifiedCandidateIds.has(user._id))
						if (
							!sameCandidateRecords(initialCandidateRows, genuineVerifiedCandidates) ||
							!sameCandidateRecords(riskPassCandidates, genuineVerifiedCandidates)
						) {
							throw scanConsistencyError('邀请关系在局部风险读取期间进入或离开本次时间范围')
						}
					}

					const afterMap = await this.loadInviterMap(
						[inviterId],
						runId,
						inviterVerificationField(),
						'正在局部复核邀请人资料'
					)
					if (!afterMap || runId !== this.queryRunId) return null
					const profileChanges = this.assertInviterMapStable([inviterId], beforeMap, afterMap, true)
					if (profileChanges.size) throw scanConsistencyError('邀请人资料在局部复核期间仍在变化')

					const inviter = beforeMap.get(inviterId) || {
						_id: inviterId,
						my_invite_code: '',
						status: null,
						missing: true
					}
					const accumulator = createInviterScanAccumulator({ _id: inviterId }, confirmedAt)
					genuineUsers.forEach(user => accumulateInviterAccount(accumulator, user))
					return {
						skipped: false,
						inviter,
						result: finalizeRawScanResult(
							accumulator,
							inviter,
							plan.scope === 'time' ? scopeMatchedCount : genuineUsers.length
						)
					}
				} catch (error) {
					if (runId !== this.queryRunId) return null
					if (!error || !error.scanConsistency) throw error
					if (attempt === maxAttempts) {
						return { skipped: true, reason: '扫描期间持续变化，局部复核未稳定' }
					}
				}
			}
			return { skipped: true, reason: '局部复核未完成' }
		},
		async hasIndependentInvitationWitness(confirmedAt, runId) {
			let lastId = ''
			let inspected = 0
			while (true) {
				if (runId !== this.queryRunId) return null
				// 独立保护查询故意不复用主扫描的 inviter_uid 复合条件。主条件若被
				// ClientDB 或旧数据错误处理，仍能从原始账号行中发现非空邀请关系。
				const pageWhere = lastId ? withIdRange({}, lastId, '') : {}
				const { result: { data } } = await this.readClientDbWithRetry(
					'独立复核全量邀请关系',
					runId,
					() => userCollection.where(pageWhere)
						.field({ _id: true, inviter_uid: true, invite_time: true })
						.orderBy('_id', 'asc')
						.limit(QUERY_BATCH_SIZE)
						.get()
				)
				if (runId !== this.queryRunId) return null
				if (!Array.isArray(data)) {
					throw zeroResultProtectionError('无法独立复核全量空结果，已阻止覆盖或清空，请重新检测')
				}
				for (const user of data) {
					const currentId = user && typeof user._id === 'string' ? user._id : ''
					if (!currentId || (lastId && currentId <= idOrderingValue(lastId))) {
						throw zeroResultProtectionError('独立复核全量空结果时账号游标顺序异常，已阻止覆盖或清空，请重新检测')
					}
					lastId = currentId
					const inviterId = user && typeof user.inviter_uid === 'string'
						? user.inviter_uid.trim()
						: ''
					const inviteTime = normalizeInviteTime(user && user.invite_time)
					if (inviterId && inviterId !== currentId && inviteTime < confirmedAt) return true
				}
				inspected += data.length
				this.setTask('正在独立复核全量空结果', {
					metricText: `已检查 ${inspected} 个账号；仅在主扫描异常为 0 时执行`
				})
				if (data.length < QUERY_BATCH_SIZE) return false
			}
		},
		async assertEmptyAllScopeSafe(plan, inviterCount, confirmedAt, runId) {
			if (!plan || plan.scope !== 'all' || inviterCount !== 0) return true
			this.setTask('正在复核全量空结果', { metricText: '防止错误清空本地基线' })
			const baselineMetadata = await baselineStore.loadMetadata()
			if (runId !== this.queryRunId) return false
			const recordCount = Number(baselineMetadata && baselineMetadata.recordCount)
			if (!Number.isSafeInteger(recordCount) || recordCount < 0) {
				throw zeroResultProtectionError('无法确认本轮全量空结果是否真实，已阻止覆盖或清空，请重新检测')
			}
			if (recordCount > 0) {
				throw zeroResultProtectionError(
					'本轮全量邀请关系为 0，但本地仍有历史基线；为防止误清空已停止覆盖。若已确认线上邀请关系确实全部删除，请先手动清除本地检测基线后重新检测'
				)
			}
			const hasWitness = await this.hasIndependentInvitationWitness(confirmedAt, runId)
			if (hasWitness === null || runId !== this.queryRunId) return false
			if (hasWitness) throw zeroResultProtectionError()
			return true
		},
		cancelRiskScan() {
			if (!this.isRiskScanning || this.isCommittingScan) return
			this.queryRunId++
			this.isRiskScanning = false
			this.isQuerying = false
			this.setTask(
				'检测已取消；上一次成功结果和本地检测基线均未被覆盖',
				{ metricText: '已取消' }
			)
		},
		async startRiskScan() {
			if (this.busy) return
			const confirmedAt = Date.now()
			const runId = ++this.queryRunId
			let targetToOpen = null
			this.businessToday = getBusinessDayKey(confirmedAt)
			this.isQuerying = true
			this.isRiskScanning = true
			this.isCommittingScan = false
			this.setTask('正在准备批量风险检测', null)

			try {
				const plan = await this.resolveScanPlan(confirmedAt, runId)
				if (runId !== this.queryRunId) return
				const now = confirmedAt
				const candidateCounts = new Map()
				const accumulators = new Map()
				let candidateSnapshots = []
				let riskSnapshots = []
				let candidateRelationshipCount = 0
				let riskRelationshipCount = 0
				let acceptedCandidateRelationshipCount = 0
				let skippedCandidateSelfRelationshipCount = 0
				let acceptedRiskRelationshipCount = 0
				let skippedRiskSelfRelationshipCount = 0
				let unexpectedRiskRelationshipCount = 0
				const ensureAccumulator = inviterId => {
					if (!accumulators.has(inviterId)) {
						accumulators.set(inviterId, createInviterScanAccumulator({ _id: inviterId }, now))
					}
					return accumulators.get(inviterId)
				}
				const consumeRiskRows = data => {
					data.forEach(user => {
						const inviterId = requireRelationshipInviterId(user)
						if (user._id === inviterId) {
							skippedRiskSelfRelationshipCount++
							return
						}
						if (
							(plan.scope === 'time' && !candidateCounts.has(inviterId)) ||
							(plan.scope === 'code' && inviterId !== String(plan.forcedInviter && plan.forcedInviter._id))
						) {
							unexpectedRiskRelationshipCount++
							return
						}
						const inviteTime = normalizeInviteTime(user.invite_time)
						if (inviteTime >= confirmedAt) {
							throw scanConsistencyError('完整关系查询返回了检测确认时刻之后的邀请关系')
						}
						if (!accumulateInviterAccount(ensureAccumulator(inviterId), user)) {
							throw scanConsistencyError('完整关系查询返回了重复或无法归入邀请人的账号')
						}
						acceptedRiskRelationshipCount++
					})
				}

				if (plan.scope === 'time') {
					candidateSnapshots = await this.prepareParallelInvitationSnapshots([plan.where], candidateField(), runId)
					if (!candidateSnapshots) return
					const candidatePass = await this.streamInvitationSnapshots(candidateSnapshots, runId, data => {
						data.forEach(user => {
							const inviterId = requireRelationshipInviterId(user)
							if (user._id === inviterId) {
								skippedCandidateSelfRelationshipCount++
								return
							}
							const inviteTime = normalizeInviteTime(user.invite_time)
							if (inviteTime < plan.candidateStart || inviteTime >= plan.candidateEndExclusive) {
								throw scanConsistencyError('时间范围查询返回了范围外的邀请关系')
							}
							candidateCounts.set(inviterId, (candidateCounts.get(inviterId) || 0) + 1)
							acceptedCandidateRelationshipCount++
						})
					}, (processed, total, completedShards, shardCount) => {
						this.setTask('正在批量识别时间范围内的邀请人', {
							metricText: formatStreamMetric(processed, total, completedShards, shardCount, '条范围记录')
						})
					})
					if (!candidatePass || runId !== this.queryRunId) return
					candidateRelationshipCount = candidatePass.total
					const inviterIds = Array.from(candidateCounts.keys())
					inviterIds.forEach(ensureAccumulator)
					const asOfCondition = invitationTimeAsOfCondition(confirmedAt)
					const riskWheres = chunkArray(inviterIds, INVITER_BATCH_SIZE).map(ids => ({
						inviter_uid: dbCmd.in(ids),
						invite_time: asOfCondition
					}))
					riskSnapshots = await this.prepareParallelInvitationSnapshots(
						riskWheres,
						riskScanField(),
						runId,
						riskVerificationField(),
						candidateSnapshots.fixedUpperBoundary
					)
					if (!riskSnapshots) return
					if (inviterIds.length) {
						riskSnapshots.postBoundaryGuard = {
							where: {
								inviter_uid: inviterReferenceCondition(),
								invite_time: asOfCondition
							},
							inviterIds: new Set(inviterIds)
						}
					}
					const riskPass = await this.streamInvitationSnapshots(riskSnapshots, runId, consumeRiskRows, (processed, total, completedShards, shardCount) => {
						this.setTask('正在批量读取候选邀请人的全部受邀关系', {
							metricText: formatStreamMetric(processed, total, completedShards, shardCount, '条完整关系')
						})
					})
					if (!riskPass || runId !== this.queryRunId) return
					riskRelationshipCount = riskPass.total
				} else {
					riskSnapshots = await this.prepareParallelInvitationSnapshots([plan.where], riskScanField(), runId, riskVerificationField())
					if (!riskSnapshots) return
					const riskPass = await this.streamInvitationSnapshots(riskSnapshots, runId, consumeRiskRows, (processed, total, completedShards, shardCount) => {
						this.setTask('正在批量扫描全部邀请关系', {
							metricText: formatStreamMetric(processed, total, completedShards, shardCount, '条关系')
						})
					})
					if (!riskPass || runId !== this.queryRunId) return
					riskRelationshipCount = riskPass.total
					if (plan.forcedInviter && !accumulators.has(plan.forcedInviter._id)) {
						ensureAccumulator(plan.forcedInviter._id)
					}
				}

				if (
					acceptedCandidateRelationshipCount + skippedCandidateSelfRelationshipCount !== candidateRelationshipCount
				) {
					throw zeroResultProtectionError('时间范围关系读取数与汇总接收数不一致，已阻止发布不完整结果')
				}
				if (
					acceptedRiskRelationshipCount + skippedRiskSelfRelationshipCount + unexpectedRiskRelationshipCount !== riskRelationshipCount
				) {
					throw zeroResultProtectionError('完整关系读取数与汇总接收数不一致，已阻止发布不完整结果')
				}
				if (unexpectedRiskRelationshipCount > 0) {
					throw zeroResultProtectionError('完整关系查询返回了不属于当前检测范围的邀请关系，已阻止发布错误结果')
				}
				if (riskRelationshipCount > 0 && acceptedRiskRelationshipCount === 0) {
					throw zeroResultProtectionError('已读取邀请关系，但没有任何关系通过汇总校验，已阻止发布空结果')
				}
				if (
					plan.scope === 'time' &&
					acceptedRiskRelationshipCount < acceptedCandidateRelationshipCount
				) {
					throw zeroResultProtectionError('候选完整关系少于时间范围内已确认的关系，已阻止发布不完整结果')
				}

				const inviterIds = plan.scope === 'time'
					? Array.from(candidateCounts.keys())
					: Array.from(accumulators.keys())
				if (candidateRelationshipCount > 0 && plan.scope === 'time' && inviterIds.length === 0) {
					throw zeroResultProtectionError('已读取时间范围内的邀请关系，但未能汇总出邀请人，已阻止发布空结果')
				}
				// 首遍关系已完整读完，后续只读 inviteeIds；尽早释放大 Set，降低 37 万关系时的峰值内存。
				accumulators.forEach(accumulator => { accumulator.inviteeIdSet = null })
				const emptyAllScopeSafe = await this.assertEmptyAllScopeSafe(plan, inviterIds.length, confirmedAt, runId)
				if (!emptyAllScopeSafe || runId !== this.queryRunId) return
				const inviterMap = await this.loadInviterMap(inviterIds, runId)
				if (runId !== this.queryRunId || !inviterMap) return
				let rawResults = []
				const nextCache = new Map()
				for (let index = 0; index < inviterIds.length; index++) {
					const inviterId = inviterIds[index]
					const inviter = inviterMap.get(inviterId) || {
						_id: inviterId,
						my_invite_code: '',
						status: null,
						missing: true
					}
					const accumulator = ensureAccumulator(inviterId)
					const scanResult = finalizeRawScanResult(
						accumulator,
						inviter,
						plan.scope === 'time'
							? (candidateCounts.get(inviterId) || 0)
							: accumulator.inviteeIds.length
					)
					accumulators.delete(inviterId)
					if (plan.scope === 'time') candidateCounts.delete(inviterId)
					rawResults.push(scanResult)
					nextCache.set(inviterId, { users: null, complete: false, inviter })
					if ((index + 1) % 250 === 0 || index + 1 === inviterIds.length) {
						this.setTask('正在本地汇总批量风险结果', { metricText: `已汇总 ${index + 1} / ${inviterIds.length} 人` })
						await this.$nextTick()
						if (runId !== this.queryRunId) return
					}
				}
				if (rawResults.length !== inviterIds.length) {
					throw zeroResultProtectionError('邀请关系汇总数量与邀请人数量不一致，已阻止发布不完整结果')
				}
				this.setTask('正在读取浏览器本地检测基线', { metricText: `${inviterIds.length} 位邀请人` })
				let previousBaseline = await this.loadDiscoveryBaseline(inviterIds, true)
				if (runId !== this.queryRunId) return

				// 候选范围决定“查哪些邀请人”，因此在完整风险复核前后各校验一次；
				// 所有读取共用一个真实总数，避免时间范围扫描的百分比倒退。
				const candidateVerificationTotal = candidateSnapshots.reduce((sum, snapshot) => sum + snapshot.total, 0)
				const riskVerificationTotal = riskSnapshots.reduce((sum, snapshot) => sum + snapshot.total, 0)
				const relationshipVerificationTotal = riskVerificationTotal + candidateVerificationTotal * (candidateSnapshots.length ? 2 : 0)
				const reportRelationshipVerification = processed => {
					this.setTask('正在最终复核邀请关系', {
						current: processed,
						total: relationshipVerificationTotal,
						metricText: `已复核 ${processed} / ${relationshipVerificationTotal} 条关系`
					})
				}
				const affectedIds = new Set()
				if (candidateSnapshots.length) {
					const candidateVerified = await this.verifyInvitationSnapshots(candidateSnapshots, runId, processed => {
						reportRelationshipVerification(processed)
					}, false, true)
					if (!candidateVerified || runId !== this.queryRunId) return
					candidateVerified.forEach(inviterId => affectedIds.add(inviterId))
				}
				const riskVerified = await this.verifyInvitationSnapshots(riskSnapshots, runId, processed => {
					reportRelationshipVerification(candidateVerificationTotal + processed)
				}, plan.scope === 'time', true)
				if (!riskVerified || runId !== this.queryRunId) return
				riskVerified.forEach(inviterId => affectedIds.add(inviterId))
				if (candidateSnapshots.length) {
					const candidateReverified = await this.verifyInvitationSnapshots(candidateSnapshots, runId, processed => {
						reportRelationshipVerification(candidateVerificationTotal + riskVerificationTotal + processed)
					}, false, true)
					if (!candidateReverified || runId !== this.queryRunId) return
					candidateReverified.forEach(inviterId => affectedIds.add(inviterId))
				}

				// 邀请人稳定字段最后批量回读，缩短关系复核期间账号状态变化的漏检窗口。
				const verifiedInviterMap = await this.loadInviterMap(
					inviterIds,
					runId,
					inviterVerificationField(),
					'正在最终复核邀请人资料'
				)
				if (runId !== this.queryRunId || !verifiedInviterMap) return
				this.assertInviterMapStable(inviterIds, inviterMap, verifiedInviterMap, true)
					.forEach(inviterId => affectedIds.add(inviterId))
				const forcedInviterStable = await this.assertForcedInviterStable(plan, verifiedInviterMap, runId)
				if (!forcedInviterStable || runId !== this.queryRunId) return

				const isolationLimit = localIsolationLimit(inviterIds.length)
				const affectedList = Array.from(affectedIds)
				const additionalBaselineIds = affectedList.filter(inviterId => !nextCache.has(inviterId))
				if (additionalBaselineIds.length) {
					const additionalBaseline = await this.loadDiscoveryBaseline(additionalBaselineIds, true)
					if (runId !== this.queryRunId) return
					if (additionalBaseline.revision !== previousBaseline.revision) {
						throw scanConsistencyError('局部复核前本地检测基线已被其他页面更新')
					}
					previousBaseline = {
						...previousBaseline,
						records: {
							...(previousBaseline.records || {}),
							...(additionalBaseline.records || {})
						}
					}
				}
				const skippedIds = new Set()
				const skippedDetails = []
				const retriedResults = new Map()
				const skipInviter = (inviterId, reason) => {
					if (!skippedIds.has(inviterId)) {
						skippedIds.add(inviterId)
						skippedDetails.push({ inviterId, reason: reason || '局部复核未稳定' })
					}
					nextCache.delete(inviterId)
				}
				const retryList = affectedList.slice(0, isolationLimit)
				affectedList.slice(isolationLimit).forEach(inviterId => {
					skipInviter(inviterId, `本轮变化账号超过局部复核预算 ${isolationLimit} 位，已留待下次检测`)
				})
				if (retryList.length) {
					const retried = await mapWithConcurrency(retryList, LOCAL_RETRY_CONCURRENCY, inviterId => (
						this.retryAffectedInviter(plan, inviterId, confirmedAt, runId)
					))
					if (runId !== this.queryRunId || retried.some(result => !result)) return
					retried.forEach((retryResult, index) => {
						const inviterId = retryList[index]
						if (retryResult.skipped) {
							skipInviter(inviterId, retryResult.reason)
							return
						}
						retriedResults.set(inviterId, retryResult.result)
						nextCache.set(inviterId, { users: null, complete: false, inviter: retryResult.inviter })
					})
				}
				if (skippedIds.size || retriedResults.size) {
					rawResults = rawResults.reduce((stableResults, result) => {
						if (skippedIds.has(result.inviterId)) return stableResults
						if (retriedResults.has(result.inviterId)) {
							stableResults.push(retriedResults.get(result.inviterId))
							retriedResults.delete(result.inviterId)
						} else {
							stableResults.push(result)
						}
						return stableResults
					}, [])
					retriedResults.forEach(result => rawResults.push(result))
				}

				const compareOptions = {
					completeForInviter: true,
					pruneMissingInviters: plan.scope === 'all'
				}
				let compared = compareAndMergeBaseline(rawResults, previousBaseline, now, compareOptions)
				const toUiResults = results => results.map(result => {
					const { ipGroups, accountRiskById, snapshot, riskReasonDetails, changes, ...summary } = result
					return summary
				})
				let uiResults = toUiResults(compared.results)
				if (rawResults.length > 0 && uiResults.length === 0) {
					throw zeroResultProtectionError('已汇总邀请人，但风险结果转换后异常为 0，已阻止发布空结果')
				}
				let nextSummary = this.buildScanSummary(uiResults, compared.summary)
				nextSummary.skippedCount = skippedIds.size
				let nextBaselineRecords = compared.baseline.records || {}
				if (skippedIds.size) {
					const preservedSkippedRecords = {}
					skippedIds.forEach(inviterId => {
						if (previousBaseline.records && previousBaseline.records[inviterId]) {
							preservedSkippedRecords[inviterId] = previousBaseline.records[inviterId]
						}
					})
					nextBaselineRecords = { ...nextBaselineRecords, ...preservedSkippedRecords }
				}
				const nextBaseline = {
					...compared.baseline,
					revision: previousBaseline.revision,
					records: nextBaselineRecords
				}

				// 先整理详情区，确保组件回调失败时不会提前推进本地基线。
				this.resetQueryResult()
				this.isCommittingScan = true
				const buildReadSummary = currentResults => ({
					relationshipCount: riskRelationshipCount,
					discoveredInviterCount: inviterIds.length,
					stableInviterCount: currentResults.length,
					skippedInviterCount: skippedIds.size
				})
				const resultPublishedAt = Date.now()
				this.publishScanView({
					results: uiResults,
					skippedDetails,
					summary: nextSummary,
					plan,
					readSummary: buildReadSummary(uiResults),
					completedAt: resultPublishedAt
				})
				this.setTask('结果已汇总，正在保存本地检测基线', {
					metricText: `${riskRelationshipCount} 条关系，${uiResults.length} 位稳定邀请人；保存期间不可取消`
				})
				const persisted = await this.persistDiscoveryBaseline(
					nextBaseline,
					plan.scope === 'all',
					previousBaseline.revision
				)
				if (runId !== this.queryRunId) return
				if (persisted) {
					this._discoveryBaselineCache = {
						version: 1,
						updatedAt: persisted.updatedAt,
						revision: persisted.revision,
						records: {}
					}
				} else if (uiResults.some(result => result.autoBaselined)) {
					compared = compareAndMergeBaseline(rawResults, previousBaseline, now, {
						...compareOptions,
						autoBaselineBanned: false
					})
					uiResults = toUiResults(compared.results)
					nextSummary = this.buildScanSummary(uiResults, compared.summary)
					nextSummary.skippedCount = skippedIds.size
					this.publishScanView({
						results: uiResults,
						skippedDetails,
						summary: nextSummary,
						plan,
						readSummary: buildReadSummary(uiResults),
						completedAt: resultPublishedAt
					})
				}

				const pendingCode = this.pendingOpenInviteCode
				const nextTargetToOpen = pendingCode
					? (uiResults.find(item => normalizeInviteCode(item.inviter && item.inviter.my_invite_code) === pendingCode) || null)
					: null
				detailCache.clear()
				nextCache.forEach((value, key) => detailCache.set(key, value))
				this.scanCompletedAt = Date.now()
				this.pendingOpenInviteCode = ''
				targetToOpen = nextTargetToOpen
				this.setTask(
					skippedIds.size
						? `检测完成：稳定处理 ${uiResults.length} 位，跳过 ${skippedIds.size} 位未能取得稳定结果的邀请人`
						: `检测完成：发现 ${uiResults.length} 个邀请人`,
					{ metricText: '已完成' }
				)
			} catch (error) {
				if (runId !== this.queryRunId) return
				console.error('违规邀请范围检测失败:', error)
				const failureMessage = error && error.zeroResultProtection
					? this.getErrorMessage(error)
					: (error && error.scanConsistency ? SCAN_CONSISTENCY_MESSAGE : this.getErrorMessage(error))
				this.setTask(`检测失败：${failureMessage}`, { metricText: '失败' }, true)
				uni.showModal({
					title: '检测失败',
					content: `${failureMessage}。上一次成功结果和本地新增基线均未被覆盖。`,
					showCancel: false
				})
			} finally {
				if (runId === this.queryRunId) {
					this.isCommittingScan = false
					this.isRiskScanning = false
					this.isQuerying = false
					if (this.scanCompletedAt && !this.taskStatus.error) this.clearTask(1500)
				}
			}
			if (targetToOpen && runId === this.queryRunId && !this.isQuerying) {
				await this.openInviterDetail(targetToOpen)
			}
		},
		buildScanSummary(results, changeSummary) {
			const summary = emptyScanSummary()
			summary.inviterCount = results.length
			results.forEach(item => {
				summary.inviteeCount += item.invitedCount
				summary.highIpGroupCount += Number(item.highIpGroupCount) || 0
				summary.mediumIpGroupCount += Number(item.mediumIpGroupCount) || 0
				summary.maxSharedIpCount = Math.max(summary.maxSharedIpCount, Number(item.highestIpCount) || 0)
				const key = `${item.riskLevel}Count`
				if (Object.prototype.hasOwnProperty.call(summary, key)) summary[key]++
				if (item.pendingReview) summary.pendingCount++
			})
			Object.keys(changeSummary || {}).forEach(key => {
				if (Object.prototype.hasOwnProperty.call(summary, key)) summary[key] = changeSummary[key]
			})
			summary.hasCurrentChanges = Boolean(
				(changeSummary && changeSummary.hasCurrentChanges) ||
				summary.newInviterCount ||
				summary.newInviteeCount ||
				summary.newIpGroupCount ||
				summary.grownIpGroupCount ||
				summary.riskUpgradeCount
			)
			return summary
		},
		getChangeBadges(item) {
			const change = item.pendingChange || item.change || {}
			const badges = []
			if (change.firstDiscovery) badges.push(item.pendingReview ? '首次发现／待审核' : (item.autoBaselined ? '首次发现／已自动审核' : '首次发现'))
			if (change.newInviter) badges.push('本次新增邀请人')
			const newInviteeCount = Array.isArray(change.newInviteeIds) ? change.newInviteeIds.length : Number(change.newInviteeCount || 0)
			const newIpGroupCount = Array.isArray(change.newIpGroups) ? change.newIpGroups.length : Number(change.newIpGroupCount || 0)
			if (newInviteeCount) badges.push(`新增受邀 ${newInviteeCount}`)
			if (newIpGroupCount) badges.push(`新增同 IP 组 ${newIpGroupCount}`)
			if (Array.isArray(change.grownIpGroups) && change.grownIpGroups.length) badges.push(`同 IP 数量增加 ${change.grownIpGroups.length} 组`)
			if (change.riskUpgraded) badges.push('风险升级')
			if (change.reachedHigh) badges.push('首次达到高风险')
			if (!badges.length && item.pendingReview) badges.push('待审核')
			return badges
		},
		async markInviterReviewed(item) {
			return this.saveInviterReviewed(item, false)
		},
		async saveInviterReviewed(item, automatic) {
			if (!item || !item.pendingReview || (!automatic && this.busy) || this.isReviewingBaseline) return false
			if (!this.baselineWritable) return false
			const reviewRunId = this.queryRunId
			const currentBaseline = this._discoveryBaselineCache || emptyBaseline()
			let reviewed
			this.isReviewingBaseline = true
			try {
				reviewed = await baselineStore.saveReviewed(item.inviterId, Date.now(), currentBaseline.revision)
				if (reviewRunId !== this.queryRunId) return false
				this.baselineWritable = true
				this.baselineWarning = ''
			} catch (error) {
				if (reviewRunId !== this.queryRunId) return false
				this.baselineWritable = false
				const missingRecord = error && error.code === 'BASELINE_RECORD_NOT_FOUND'
				this.baselineWarning = missingRecord
					? (automatic
						? '邀请人已封禁，但本地检测基线中没有该邀请人，无法自动标记为已审核；请重新检测。'
						: '本地基线中未找到该邀请人，请重新检测。')
					: (automatic
						? `邀请人已封禁，但自动标记已审核失败：${this.getErrorMessage(error)}。请重新检测重试。`
						: `保存审核状态失败：${this.getErrorMessage(error)}`)
				uni.showToast({
					title: missingRecord && !automatic ? '本地基线中未找到该邀请人' : (automatic ? '自动审核失败' : '保存审核状态失败'),
					icon: 'none'
				})
				return false
			} finally {
				this.isReviewingBaseline = false
			}

			this._discoveryBaselineCache = {
				version: 1,
				revision: reviewed.revision,
				updatedAt: reviewed.updatedAt,
				records: {}
			}
			const index = this.scanResults.findIndex(result => result.inviterId === item.inviterId)
			if (index !== -1) {
				this.$set(this.scanResults, index, {
					...this.scanResults[index],
					pendingReview: false,
					pendingChange: null,
					autoBaselined: Boolean(automatic || this.scanResults[index].autoBaselined)
				})
			}
			if (this.selectedScanInviterId === item.inviterId) {
				this.selectedNewInviteeIds = {}
				this.selectedChangedIpGroups = {}
			}
			this.scanSummary = {
				...this.scanSummary,
				pendingCount: Math.max(0, this.scanSummary.pendingCount - 1)
			}
			this.$nextTick(() => {
				const maxPage = Math.max(1, Math.ceil(this.filteredScanResults.length / this.scanPageSize))
				this.scanPage = Math.min(this.scanPage, maxPage)
			})
			return true
		},
		async autoBaselineBannedInviter(inviterId) {
			const item = this.scanResults.find(result => result.inviterId === inviterId)
			const eligible = Boolean(
				item &&
				item.pendingReview &&
				item.inviter &&
				Number(item.inviter.status) === 3
			)
			if (!eligible) return { eligible: false, saved: false }
			return { eligible: true, saved: await this.saveInviterReviewed(item, true) }
		},
		async openInviterDetail(item) {
			if (!item || !item.inviterId || this.busy) return
			const detailConfirmedAt = Date.now()
			let cache = detailCache.get(item.inviterId)
			if (!cache) {
				uni.showToast({ title: '详情缓存不存在，请重新检测', icon: 'none' })
				return
			}

			// 切换目标后先撤下旧详情；新目标读取失败时不能继续操作上一个邀请人。
			this.resetQueryResult()
			this.detailLoadTarget = {
				inviterId: item.inviterId,
				inviteCode: item.inviter && item.inviter.my_invite_code ? item.inviter.my_invite_code : ''
			}
			this.detailLoadError = ''
			const runId = ++this.queryRunId
			this.isQuerying = true
			this.setTask('正在打开邀请人详情', { metricText: `邀请人 ${item.inviterId}` })
			this.$nextTick(() => {
				uni.pageScrollTo({ selector: '.inviter-detail-feedback-anchor', duration: 250 })
			})
			try {
				if (!cache.complete) {
					this.setTask('正在完整加载该邀请人名下全部受邀账号', null)
					const users = await this.loadInvitationRecords({
						inviter_uid: item.inviterId,
						invite_time: invitationTimeAsOfCondition(detailConfirmedAt)
					}, runId)
					if (runId !== this.queryRunId || !users) return
					cache = {
						...cache,
						users: users.filter(user => user._id !== item.inviterId),
						complete: true
					}
					this.cacheCompleteInviterDetail(item.inviterId, cache)
				}

				this.inviter = { ...cache.inviter }
				if (this.inviter.missing) this.dataNotice = '邀请人账号不存在或当前无读取权限，只能查看其残留邀请关系，不能执行“封禁邀请人”。'
				this.inviteCodeInput = this.inviter.my_invite_code || ''
				this.selectedScanInviterId = item.inviterId
				const pendingChange = item.pendingChange || item.change || {}
				const newInviteeLookup = {}
				;(pendingChange.newInviteeIds || []).forEach(id => { newInviteeLookup[id] = true })
				this.selectedNewInviteeIds = newInviteeLookup
				const changedIpLookup = {}
				;(pendingChange.newIpGroups || []).forEach(group => { if (group && group.ip) changedIpLookup[group.ip] = '新增同 IP 组' })
				;(pendingChange.grownIpGroups || []).forEach(group => { if (group && group.ip) changedIpLookup[group.ip] = '同 IP 数量增加' })
				this.selectedChangedIpGroups = changedIpLookup
				this.applyAccountAnalysis(cache.users.filter(user => user._id !== item.inviterId))
				this.queryComplete = true
				this.detailLoadTarget = null
				this.detailLoadError = ''
				this.setTask(`详情加载完成：共 ${this.invitedUsers.length} 个受邀账号`, { metricText: '已完成' })
				this.$nextTick(() => {
					this.syncVisibleSelection()
					uni.pageScrollTo({ selector: '.inviter-detail-anchor', duration: 250 })
				})
			} catch (error) {
				if (runId !== this.queryRunId) return
				console.error('加载邀请人详情失败:', error)
				this.detailLoadError = this.getErrorMessage(error)
				this.setTask(`详情加载失败：${this.detailLoadError}`, { metricText: '失败' }, true)
			} finally {
				if (runId === this.queryRunId) {
					this.isQuerying = false
					if (this.queryComplete && !this.taskStatus.error) this.clearTask(1200)
				}
			}
		},
		retryInviterDetailLoad() {
			if (this.busy || !this.detailLoadTarget || !this.detailLoadTarget.inviterId) return
			const item = this.scanResults.find(result => result.inviterId === this.detailLoadTarget.inviterId)
			if (!item) {
				uni.showToast({ title: '检测结果中已找不到该邀请人', icon: 'none' })
				return
			}
			this.openInviterDetail(item)
		},
		dismissInviterDetailFeedback() {
			if (this.busy) return
			this.detailLoadTarget = null
			this.detailLoadError = ''
		},
		closeInviterDetail() {
			if (this.busy) return
			this.selectedScanInviterId = ''
			this.selectedNewInviteeIds = {}
			this.selectedChangedIpGroups = {}
			this.resetQueryResult()
		},
		cacheCompleteInviterDetail(inviterId, cache) {
			detailCache.forEach((entry, key) => {
				if (key === inviterId || !entry || !entry.complete) return
				detailCache.set(key, { ...entry, users: null, complete: false })
			})
			detailCache.set(inviterId, {
				...cache,
				users: Array.isArray(cache.users) ? cache.users : [],
				complete: true
			})
		},
		updateDiscoveryDetailCache(inviterId, users) {
			if (!inviterId) return
			const existing = detailCache.get(inviterId) || {}
			this.cacheCompleteInviterDetail(inviterId, {
				...existing,
				inviter: this.inviter ? { ...this.inviter } : existing.inviter,
				users: (users || []).filter(user => user && user._id !== inviterId)
			})
		},
		updateDiscoveryInviterStatus(inviterId, status) {
			const index = this.scanResults.findIndex(item => item.inviterId === inviterId)
			if (index !== -1) {
				const inviter = { ...this.scanResults[index].inviter, status }
				this.$set(this.scanResults, index, { ...this.scanResults[index], inviter })
			}
			const cache = detailCache.get(inviterId)
			if (cache) detailCache.set(inviterId, { ...cache, inviter: { ...cache.inviter, status } })
		},
		async refreshSelectedInviterDetail() {
			if (!this.inviter || this.busy) return
			const inviterId = this.inviter._id
			const detailConfirmedAt = Date.now()
			const runId = ++this.queryRunId
			this.queryComplete = false
			this.relationshipVerified = false
			this.isQuerying = true
			this.setTask('正在刷新当前邀请人完整详情', null)
			try {
				const [{ result: { data: inviterData } }, users] = await Promise.all([
					this.readClientDbWithRetry(
						'刷新邀请人资料',
						runId,
						() => userCollection.doc(inviterId).field(inviterField()).get()
					),
					this.loadInvitationRecords({
						inviter_uid: inviterId,
						invite_time: invitationTimeAsOfCondition(detailConfirmedAt)
					}, runId)
				])
				if (runId !== this.queryRunId || !users) return
				if (!inviterData[0]) throw new Error('邀请人账号不存在或已删除')
				this.inviter = inviterData[0]
				const genuineInvitees = users.filter(user => user._id !== inviterId)
				this.applyAccountAnalysis(genuineInvitees)
				this.queryComplete = true
				this.loadWarning = ''
				this.updateDiscoveryDetailCache(inviterId, genuineInvitees)
				this.updateDiscoveryInviterStatus(inviterId, this.inviter.status)
				this.setTask(`刷新完成：共 ${genuineInvitees.length} 个受邀账号`, { metricText: '已完成' })
			} catch (error) {
				if (runId !== this.queryRunId) return
				console.error('刷新邀请人详情失败:', error)
				this.queryComplete = false
				this.loadWarning = '详情刷新失败，当前数据可能已过期，已禁用封禁与解封操作。'
				this.setTask(`刷新失败：${this.getErrorMessage(error)}`, { metricText: '失败' }, true)
			} finally {
				if (runId === this.queryRunId) {
					this.isQuerying = false
					if (this.queryComplete && !this.taskStatus.error) this.clearTask(1200)
				}
			}
		}
	}
}

const {
	analyzeInviterIpAccounts,
	normalizeIp,
	getRiskLevel
} = require('./violation-invitation-v2.utils.js')

const SAME_DAY_RISK_MIN = 10
const RECENT_FIVE_DAY_ABNORMAL_MIN = 50
const SHARED_IP_GROUP_MIN = 2
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000
const BUSINESS_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const QUICK_RANGE_DAYS = Object.freeze({
	today: 1,
	yesterday: 2,
	dayBeforeYesterday: 3,
	days3: 3,
	days7: 7,
	days15: 15,
	days30: 30
})

const RISK_RANK = {
	unknown: 0,
	normal: 1,
	medium: 2,
	high: 3,
	abnormal: 4
}

function normalizeInviteTime(value) {
	if (value instanceof Date) {
		const time = value.getTime()
		return Number.isFinite(time) ? time : 0
	}

	if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, '$date')) {
		return normalizeInviteTime(value.$date)
	}

	if (typeof value === 'string' && value.trim() && !/^[-+]?\d+(?:\.\d+)?$/.test(value.trim())) {
		const parsed = Date.parse(value)
		return Number.isFinite(parsed) ? parsed : 0
	}

	const numeric = Number(value)
	if (!Number.isFinite(numeric) || numeric <= 0) return 0

	// 当前 Unix 秒级时间戳约为 10 位，毫秒级约为 13 位。
	// 使用 1e11 作为分界，可以兼容秒/毫秒且避免依赖当前年份。
	return numeric < 1e11 ? numeric * 1000 : numeric
}

function getBusinessDayKey(timestamp) {
	const normalized = timestamp instanceof Date ? timestamp.getTime() : Number(timestamp)
	if (!Number.isFinite(normalized) || normalized <= 0) return ''
	// 本项目运营口径固定使用北京时间。加 8 小时后取 UTC 日期，避免依赖
	// 操作电脑的系统时区，也避免 00:00-08:00 被归入前一天。
	const date = new Date(normalized + CHINA_TIME_OFFSET_MS)
	return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : ''
}

function getBusinessDateStart(dateKey) {
	const normalized = String(dateKey || '').trim()
	const match = BUSINESS_DATE_PATTERN.exec(normalized)
	if (!match) throw new TypeError('日期必须使用 YYYY-MM-DD 格式')

	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	const utcDate = new Date(0)
	utcDate.setUTCFullYear(year, month - 1, day)
	utcDate.setUTCHours(0, 0, 0, 0)
	if (
		utcDate.getUTCFullYear() !== year ||
		utcDate.getUTCMonth() !== month - 1 ||
		utcDate.getUTCDate() !== day
	) {
		throw new TypeError(`日期 ${normalized} 不存在`)
	}

	const start = utcDate.getTime() - CHINA_TIME_OFFSET_MS
	if (!Number.isSafeInteger(start)) throw new TypeError(`日期 ${normalized} 超出支持范围`)
	return start
}

function resolveBusinessDateRange(options = {}) {
	const confirmedAt = normalizeInviteTime(options.confirmedAt)
	if (!confirmedAt) throw new TypeError('检测确认时间无效')

	const mode = String(options.mode || '').trim()
	const todayDate = getBusinessDayKey(confirmedAt)
	const todayStart = getBusinessDateStart(todayDate)
	let startDate
	let endDate
	let startMs
	let endMs

	if (mode === 'manual') {
		if (!Array.isArray(options.dateRange) || options.dateRange.length !== 2) {
			throw new TypeError('请选择完整的日期范围')
		}
		startDate = String(options.dateRange[0] || '').trim()
		endDate = String(options.dateRange[1] || '').trim()
		startMs = getBusinessDateStart(startDate)
		const endStart = getBusinessDateStart(endDate)
		if (startMs > endStart) throw new TypeError('开始日期不能晚于结束日期')
		if (startMs > todayStart || endStart > todayStart) throw new TypeError('日期范围不能包含未来日期')
		endMs = endStart === todayStart ? confirmedAt : endStart + ONE_DAY_MS - 1
	} else {
		let days = QUICK_RANGE_DAYS[mode]
		if (mode === 'custom') {
			const rawDays = String(options.customDays === undefined ? '' : options.customDays).trim()
			if (!/^\d+$/.test(rawDays)) throw new TypeError('自定义天数必须是正整数')
			days = Number(rawDays)
		}
		if (!Number.isSafeInteger(days) || days < 1) {
			throw new TypeError(mode === 'custom' ? '自定义天数必须是正整数' : '日期快捷范围无效')
		}

		const offset = (days - 1) * ONE_DAY_MS
		startMs = todayStart - offset
		if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(startMs) || startMs <= 0) {
			throw new TypeError('日期范围超出支持范围')
		}
		startDate = getBusinessDayKey(startMs)
		endDate = todayDate
		endMs = confirmedAt
	}

	if (!Number.isSafeInteger(endMs) || endMs < startMs) throw new TypeError('日期范围无效')
	return { startMs, endMs, startDate, endDate }
}

function formatBusinessTimestamp(value) {
	const timestamp = normalizeInviteTime(value)
	if (!timestamp) return ''
	const date = new Date(timestamp + CHINA_TIME_OFFSET_MS)
	if (!Number.isFinite(date.getTime())) return ''
	const pad = part => String(part).padStart(2, '0')
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
}

function getInviterId(inviter, fallbackId) {
	if (typeof inviter === 'string' || typeof inviter === 'number') return String(inviter)
	if (inviter && typeof inviter === 'object') {
		const value = inviter._id || inviter.userId || inviter.inviter_uid
		if (value !== undefined && value !== null && value !== '') return String(value)
	}
	return fallbackId === undefined || fallbackId === null ? '' : String(fallbackId)
}

function normalizeAccountsForInviter(accounts, inviterId) {
	const accountMap = new Map()
	;(Array.isArray(accounts) ? accounts : []).forEach(account => {
		if (!account || !account._id) return
		const accountId = String(account._id)
		if (accountId === inviterId) return
		if (account.inviter_uid !== undefined && account.inviter_uid !== null && String(account.inviter_uid) !== inviterId) return
		accountMap.set(accountId, account)
	})
	return Array.from(accountMap.values())
}

function getNormalizedAccountIps(account, loginAsOf = 0) {
	if (!account || typeof account !== 'object') return new Set()
	const normalizedAsOf = Number(loginAsOf)
	const loginDate = normalizeInviteTime(account.login_date)
	const includeLoginIp = !Number.isFinite(normalizedAsOf) || normalizedAsOf <= 0 || !loginDate || loginDate <= normalizedAsOf
	return new Set([
		normalizeIp(account.register_ip),
		includeLoginIp ? normalizeIp(account.login_ip) : ''
	].filter(Boolean))
}

const COMPACT_COUNTER_PROMOTION_PAIRS = 12
const INVITEE_SET_PROMOTION_SIZE = 24

function incrementCompactCounter(counter, key) {
	if (!key) return counter
	if (counter instanceof Map) {
		counter.set(key, (counter.get(key) || 0) + 1)
		return counter
	}
	const pairs = Array.isArray(counter) ? counter : []
	for (let index = 0; index < pairs.length; index += 2) {
		if (pairs[index] === key) {
			pairs[index + 1]++
			return pairs
		}
	}
	if (pairs.length < COMPACT_COUNTER_PROMOTION_PAIRS * 2) {
		pairs.push(key, 1)
		return pairs
	}
	const promoted = new Map()
	for (let index = 0; index < pairs.length; index += 2) promoted.set(pairs[index], pairs[index + 1])
	promoted.set(key, 1)
	return promoted
}

function compactCounterEntries(counter) {
	if (counter instanceof Map) return Array.from(counter.entries())
	const pairs = Array.isArray(counter) ? counter : []
	const entries = []
	for (let index = 0; index < pairs.length; index += 2) entries.push([pairs[index], pairs[index + 1]])
	return entries
}

function appendUniqueInviteeId(accumulator, accountId) {
	if (accumulator.inviteeIdSet) {
		if (accumulator.inviteeIdSet.has(accountId)) return false
		accumulator.inviteeIdSet.add(accountId)
		accumulator.inviteeIds.push(accountId)
		return true
	}
	if (accumulator.inviteeIds.includes(accountId)) return false
	accumulator.inviteeIds.push(accountId)
	if (accumulator.inviteeIds.length >= INVITEE_SET_PROMOTION_SIZE) {
		accumulator.inviteeIdSet = new Set(accumulator.inviteeIds)
	}
	return true
}

function getHighestIpRisk(groups) {
	return groups.reduce((highest, group) => {
		return RISK_RANK[group.riskLevel] > RISK_RANK[highest] ? group.riskLevel : highest
	}, 'unknown')
}

function analyzeInviteTimes(accounts, now) {
	const dayCounts = Object.create(null)
	let recentFiveDayInviteCount = 0
	const recentStart = now - FIVE_DAYS_MS

	accounts.forEach(account => {
		const timestamp = normalizeInviteTime(account.invite_time)
		if (!timestamp) return

		const dayKey = getBusinessDayKey(timestamp)
		if (dayKey) dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1
		if (timestamp >= recentStart && timestamp <= now) recentFiveDayInviteCount++
	})

	let maxSameDayInviteCount = 0
	let maxSameDayInviteDate = ''
	Object.keys(dayCounts).sort().forEach(dayKey => {
		const count = dayCounts[dayKey]
		if (count > maxSameDayInviteCount) {
			maxSameDayInviteCount = count
			maxSameDayInviteDate = dayKey
		}
	})

	return {
		maxSameDayInviteCount,
		maxSameDayInviteDate,
		recentFiveDayInviteCount
	}
}

function createInviterScanAccumulator(inviter, nowMs) {
	const inviterId = getInviterId(inviter)
	if (!inviterId) throw new TypeError('inviter id is required')
	const now = normalizeInviteTime(nowMs === undefined ? Date.now() : nowMs)
	if (!now) throw new TypeError('nowMs must be a valid timestamp')

	return {
		inviterId,
		inviter: inviter && typeof inviter === 'object' ? inviter : { _id: inviterId },
		now,
		inviteeIds: [],
		inviteeIdSet: null,
		ipCounts: null,
		dayCounts: null,
		recentFiveDayInviteCount: 0,
		finalized: false
	}
}

function accumulateInviterAccount(accumulator, account) {
	if (!accumulator || !Array.isArray(accumulator.inviteeIds)) {
		throw new TypeError('valid inviter scan accumulator is required')
	}
	if (accumulator.finalized) throw new Error('inviter scan accumulator has already been finalized')
	if (!account || !account._id) return false

	const accountId = String(account._id)
	if (accountId === accumulator.inviterId) return false
	if (
		account.inviter_uid !== undefined &&
		account.inviter_uid !== null &&
		String(account.inviter_uid) !== accumulator.inviterId
	) return false
	if (!appendUniqueInviteeId(accumulator, accountId)) return false
	getNormalizedAccountIps(account, accumulator.now).forEach(ip => {
		accumulator.ipCounts = incrementCompactCounter(accumulator.ipCounts, ip)
	})

	const timestamp = normalizeInviteTime(account.invite_time)
	if (!timestamp) return true
	const dayKey = getBusinessDayKey(timestamp)
	if (dayKey) accumulator.dayCounts = incrementCompactCounter(accumulator.dayCounts, dayKey)
	if (timestamp >= accumulator.now - FIVE_DAYS_MS && timestamp <= accumulator.now) {
		accumulator.recentFiveDayInviteCount++
	}
	return true
}

function finalizeInviterScanAccumulator(accumulator) {
	if (!accumulator || !Array.isArray(accumulator.inviteeIds)) {
		throw new TypeError('valid inviter scan accumulator is required')
	}
	if (accumulator.finalized) throw new Error('inviter scan accumulator has already been finalized')

	const ipCounts = new Map(compactCounterEntries(accumulator.ipCounts))
	const inviterMatches = accumulator.inviter &&
		typeof accumulator.inviter === 'object' &&
		!accumulator.inviter.missing &&
		getInviterId(accumulator.inviter) === accumulator.inviterId
	const inviterIps = inviterMatches ? getNormalizedAccountIps(accumulator.inviter, accumulator.now) : new Set()
	inviterIps.forEach(ip => {
		ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1)
	})
	const groups = Array.from(ipCounts.entries()).map(([ip, count]) => ({
		ip,
		count,
		riskLevel: getRiskLevel(count),
		includesInviter: inviterIps.has(ip)
	}))
	groups.sort((left, right) => {
		const rankDifference = RISK_RANK[right.riskLevel] - RISK_RANK[left.riskLevel]
		if (rankDifference !== 0) return rankDifference
		if (right.count !== left.count) return right.count - left.count
		return left.ip.localeCompare(right.ip)
	})

	let maxSameDayInviteCount = 0
	let maxSameDayInviteDate = ''
	compactCounterEntries(accumulator.dayCounts).sort(([left], [right]) => left.localeCompare(right)).forEach(([dayKey, count]) => {
		if (count > maxSameDayInviteCount) {
			maxSameDayInviteCount = count
			maxSameDayInviteDate = dayKey
		}
	})
	const timeStats = {
		maxSameDayInviteCount,
		maxSameDayInviteDate,
		recentFiveDayInviteCount: accumulator.recentFiveDayInviteCount
	}
	const highestIpRisk = getHighestIpRisk(groups)
	const abnormal = timeStats.recentFiveDayInviteCount >= RECENT_FIVE_DAY_ABNORMAL_MIN
	const hasSameDayRisk = timeStats.maxSameDayInviteCount >= SAME_DAY_RISK_MIN
	const overallRisk = abnormal ? 'abnormal' : (hasSameDayRisk ? 'high' : highestIpRisk)
	const highestIpCount = groups.reduce((highest, group) => Math.max(highest, group.count), 0)
	const riskReasonDetails = buildRiskReasons(groups, timeStats)
	accumulator.inviteeIdSet = null
	const inviteeIds = accumulator.inviteeIds.sort()
	const snapshot = {
		version: 1,
		inviterId: accumulator.inviterId,
		inviteeIds,
		ipGroups: groups.map(group => ({
			ip: group.ip,
			count: group.count,
			riskLevel: group.riskLevel
		})),
		overallRisk
	}
	const changes = compareInviterSnapshots(snapshot, undefined, { previousScanExists: false })

	accumulator.finalized = true
	return {
		inviterId: accumulator.inviterId,
		inviter: accumulator.inviter,
		inviteCode: accumulator.inviter.my_invite_code || accumulator.inviter.inviteCode || '',
		inviteeCount: inviteeIds.length,
		invitedCount: inviteeIds.length,
		highestIpRisk,
		highestIpCount,
		highIpGroupCount: groups.filter(group => group.riskLevel === 'high').length,
		mediumIpGroupCount: groups.filter(group => group.riskLevel === 'medium').length,
		maxSameDayInviteCount,
		maxSameDayCount: maxSameDayInviteCount,
		maxSameDayInviteDate,
		recentFiveDayInviteCount: timeStats.recentFiveDayInviteCount,
		recentFiveDayCount: timeStats.recentFiveDayInviteCount,
		abnormal,
		overallRisk,
		riskLevel: overallRisk,
		riskReasons: riskReasonDetails.map(reason => reason.message),
		riskReasonDetails,
		ipGroups: groups,
		snapshot,
		changes
	}
}

function buildRiskReasons(groups, timeStats) {
	const reasons = []
	groups.forEach(group => {
		if (group.riskLevel !== 'high' && group.riskLevel !== 'medium') return
		reasons.push({
			code: `${group.riskLevel}_ip_group`,
			level: group.riskLevel,
			ip: group.ip,
			count: group.count,
			message: group.includesInviter
				? `${group.ip} 关联 ${group.count} 个账号（含邀请人本人）`
				: `${group.ip} 关联 ${group.count} 个受邀账号`
		})
	})

	if (timeStats.maxSameDayInviteCount >= SAME_DAY_RISK_MIN) {
		reasons.push({
			code: 'same_day_invites',
			level: 'high',
			date: timeStats.maxSameDayInviteDate,
			count: timeStats.maxSameDayInviteCount,
			message: `${timeStats.maxSameDayInviteDate} 同日邀请 ${timeStats.maxSameDayInviteCount} 个账号`
		})
	}

	if (timeStats.recentFiveDayInviteCount >= RECENT_FIVE_DAY_ABNORMAL_MIN) {
		reasons.push({
			code: 'recent_five_day_invites',
			level: 'abnormal',
			count: timeStats.recentFiveDayInviteCount,
			message: `最近 5 天邀请 ${timeStats.recentFiveDayInviteCount} 个账号`
		})
	}

	return reasons
}

function buildSnapshot(inviterId, accounts, groups, overallRisk) {
	return {
		version: 1,
		inviterId,
		inviteeIds: accounts.map(account => String(account._id)).sort(),
		ipGroups: groups.map(group => ({
			ip: group.ip,
			count: group.count,
			riskLevel: group.riskLevel
		})),
		overallRisk
	}
}

function unwrapSnapshot(value) {
	if (!value || typeof value !== 'object') return null
	return value.snapshot && typeof value.snapshot === 'object' ? value.snapshot : value
}

function compareInviterSnapshots(currentValue, previousValue, options = {}) {
	const current = unwrapSnapshot(currentValue)
	const previous = unwrapSnapshot(previousValue)
	if (!current) throw new TypeError('current snapshot is required')

	const previousScanExists = Boolean(options.previousScanExists)
	const compareRiskChanges = options.compareRiskChanges !== false
	const riskPrevious = Object.prototype.hasOwnProperty.call(options, 'riskPreviousSnapshot')
		? unwrapSnapshot(options.riskPreviousSnapshot)
		: previous
	const firstBaseline = !previousScanExists && !previous
	const currentInviteeIds = Array.isArray(current.inviteeIds) ? current.inviteeIds : []
	const previousInviteeIds = previous && Array.isArray(previous.inviteeIds) ? previous.inviteeIds : []
	const sortedIds = ids => {
		for (let index = 1; index < ids.length; index++) {
			if (String(ids[index - 1]) > String(ids[index])) return false
		}
		return true
	}
	let newInviteeIds
	if (firstBaseline) {
		newInviteeIds = []
	} else if (sortedIds(currentInviteeIds) && sortedIds(previousInviteeIds)) {
		newInviteeIds = []
		let previousIndex = 0
		currentInviteeIds.forEach(rawId => {
			const id = String(rawId)
			while (
				previousIndex < previousInviteeIds.length &&
				String(previousInviteeIds[previousIndex]) < id
			) previousIndex++
			if (previousIndex >= previousInviteeIds.length || String(previousInviteeIds[previousIndex]) !== id) {
				newInviteeIds.push(id)
			}
		})
	} else {
		const previousIdSet = new Set(previousInviteeIds.map(String))
		newInviteeIds = currentInviteeIds.map(String).filter(id => !previousIdSet.has(id))
	}
	const previousGroups = new Map(
		(previous && Array.isArray(previous.ipGroups) ? previous.ipGroups : [])
			.filter(group => group && group.ip)
			.map(group => [group.ip, group])
	)
	const currentGroups = Array.isArray(current.ipGroups) ? current.ipGroups : []
	const currentRank = RISK_RANK[current.overallRisk] || 0
	const previousRank = riskPrevious ? (RISK_RANK[riskPrevious.overallRisk] || 0) : 0
	const riskPreviousGroups = new Map(
		(riskPrevious && Array.isArray(riskPrevious.ipGroups) ? riskPrevious.ipGroups : [])
			.filter(group => group && group.ip)
			.map(group => [group.ip, group])
	)

	const newIpGroups = firstBaseline
		? []
		: currentGroups
			.filter(group => {
				if (!group || Number(group.count || 0) < SHARED_IP_GROUP_MIN) return false
				const previousGroup = previousGroups.get(group.ip)
				return !previousGroup || Number(previousGroup.count || 0) < SHARED_IP_GROUP_MIN
			})
			.map(group => ({ ...group }))
	const grownIpGroups = compareRiskChanges && riskPrevious
		? currentGroups
		.filter(group => {
			const previousGroup = riskPreviousGroups.get(group.ip)
			const previousCount = Number(previousGroup && previousGroup.count || 0)
			return previousCount >= SHARED_IP_GROUP_MIN && Number(group && group.count || 0) > previousCount
		})
		.map(group => ({
			...group,
			previousCount: Number(riskPreviousGroups.get(group.ip).count || 0)
		}))
		: []

	return {
		firstDiscovery: !previousScanExists,
		newInviter: previousScanExists && !previous,
		newInviteeIds,
		newIpGroups,
		grownIpGroups,
		riskUpgraded: Boolean(compareRiskChanges && riskPrevious && currentRank > previousRank),
		reachedHigh: Boolean(
			compareRiskChanges &&
			previousScanExists &&
			currentRank >= RISK_RANK.high &&
			(!riskPrevious || previousRank < RISK_RANK.high)
		),
		hasChanges: Boolean(
			!previous ||
			newInviteeIds.length ||
			newIpGroups.length ||
			grownIpGroups.length ||
			(compareRiskChanges && riskPrevious && currentRank !== previousRank)
		)
	}
}

function scanInviter(inviter, accounts, previousSnapshot, options = {}) {
	const inviterId = options.inviterId === undefined || options.inviterId === null
		? getInviterId(inviter)
		: String(options.inviterId)
	if (!inviterId) throw new TypeError('inviter id is required')

	const nowValue = options.now === undefined ? Date.now() : normalizeInviteTime(options.now)
	if (!nowValue) throw new TypeError('options.now must be a valid timestamp')

	const normalizedAccounts = normalizeAccountsForInviter(accounts, inviterId)
	const analysis = analyzeInviterIpAccounts(inviter, normalizedAccounts)
	const highestIpRisk = getHighestIpRisk(analysis.groups)
	const timeStats = analyzeInviteTimes(normalizedAccounts, nowValue)
	const abnormal = timeStats.recentFiveDayInviteCount >= RECENT_FIVE_DAY_ABNORMAL_MIN
	const hasSameDayRisk = timeStats.maxSameDayInviteCount >= SAME_DAY_RISK_MIN
	const overallRisk = abnormal ? 'abnormal' : (hasSameDayRisk ? 'high' : highestIpRisk)
	const highestIpCount = analysis.groups.reduce((highest, group) => Math.max(highest, group.count), 0)
	const riskReasonDetails = buildRiskReasons(analysis.groups, timeStats)
	const snapshot = buildSnapshot(inviterId, normalizedAccounts, analysis.groups, overallRisk)
	const changes = compareInviterSnapshots(snapshot, previousSnapshot, {
		previousScanExists: options.previousScanExists
	})

	return {
		inviterId,
		inviter: inviter && typeof inviter === 'object' ? inviter : { _id: inviterId },
		inviteCode: inviter && typeof inviter === 'object' ? (inviter.my_invite_code || inviter.inviteCode || '') : '',
		inviteeCount: normalizedAccounts.length,
		invitedCount: normalizedAccounts.length,
		highestIpRisk,
		highestIpCount,
		highIpGroupCount: analysis.summary.highIpCount,
		mediumIpGroupCount: analysis.summary.mediumIpCount,
		maxSameDayInviteCount: timeStats.maxSameDayInviteCount,
		maxSameDayCount: timeStats.maxSameDayInviteCount,
		maxSameDayInviteDate: timeStats.maxSameDayInviteDate,
		recentFiveDayInviteCount: timeStats.recentFiveDayInviteCount,
		recentFiveDayCount: timeStats.recentFiveDayInviteCount,
		abnormal,
		overallRisk,
		riskLevel: overallRisk,
		riskReasons: riskReasonDetails.map(reason => reason.message),
		riskReasonDetails,
		ipGroups: analysis.groups,
		accountRiskById: analysis.accountRiskById,
		snapshot,
		changes
	}
}

function normalizeTimestamp(value) {
	return normalizeInviteTime(value)
}

function analyzeInviter(inviter, invitees, nowMs) {
	return scanInviter(inviter, invitees, undefined, { now: nowMs })
}

function createSnapshot(result) {
	const source = unwrapSnapshot(result)
	if (!source || !source.inviterId) throw new TypeError('analyzed inviter result is required')
	const groupMap = new Map()
	;(Array.isArray(source.ipGroups) ? source.ipGroups : []).forEach(group => {
		if (!group || !group.ip) return
		const normalized = {
			ip: group.ip,
			count: Number(group.count || 0),
			riskLevel: group.riskLevel || 'unknown'
		}
		const existing = groupMap.get(group.ip)
		if (!existing || normalized.count >= existing.count) groupMap.set(group.ip, normalized)
	})
	return {
		version: 1,
		inviterId: String(source.inviterId),
		inviteeIds: Array.from(new Set(
			(Array.isArray(source.inviteeIds) ? source.inviteeIds : []).map(String)
		)).sort(),
		ipGroups: Array.from(groupMap.values()),
		overallRisk: source.overallRisk || 'unknown'
	}
}

function emptyBaseline() {
	return {
		version: 1,
		updatedAt: 0,
		records: {}
	}
}

function getBaselineInviters(baseline) {
	if (!baseline || typeof baseline !== 'object') return {}
	if (baseline.records && typeof baseline.records === 'object') return baseline.records
	if (baseline.inviters && typeof baseline.inviters === 'object') return baseline.inviters
	if (baseline.snapshots && typeof baseline.snapshots === 'object') return baseline.snapshots
	return {}
}

function copyBaselineEntry(entry, inviterId) {
	const snapshot = createSnapshot(
		entry && entry.snapshot
			? entry.snapshot
			: { ...(entry || {}), inviterId: (entry && entry.inviterId) || inviterId }
	)
	const hasCompleteSnapshot = entry && Object.prototype.hasOwnProperty.call(entry, 'completeSnapshot')
	const hasSnapshotComplete = entry && Object.prototype.hasOwnProperty.call(entry, 'snapshotComplete')
	const snapshotComplete = hasSnapshotComplete ? Boolean(entry.snapshotComplete) : !hasCompleteSnapshot
	const completeSource = snapshotComplete ? null : (entry && entry.completeSnapshot)
	return {
		snapshot,
		snapshotComplete,
		completeSnapshot: completeSource ? createSnapshot(completeSource) : null,
		pendingReview: Boolean(entry && entry.pendingReview),
		pendingChange: entry && entry.pendingChange ? { ...entry.pendingChange } : null,
		firstSeenAt: Number(entry && entry.firstSeenAt) || 0,
		lastSeenAt: Number(entry && entry.lastSeenAt) || 0,
		reviewedAt: Number(entry && entry.reviewedAt) || 0
	}
}

function mergeSnapshots(previousValue, currentValue) {
	const previous = createSnapshot(previousValue)
	const current = createSnapshot(currentValue)
	const inviteeIds = Array.from(new Set(previous.inviteeIds.concat(current.inviteeIds))).sort()
	const groupMap = new Map()
	previous.ipGroups.concat(current.ipGroups).forEach(group => {
		const existing = groupMap.get(group.ip)
		if (!existing) {
			groupMap.set(group.ip, { ...group })
			return
		}
		if (group.count > existing.count) existing.count = group.count
		if ((RISK_RANK[group.riskLevel] || 0) > (RISK_RANK[existing.riskLevel] || 0)) {
			existing.riskLevel = group.riskLevel
		}
	})
	const overallRisk = (RISK_RANK[current.overallRisk] || 0) > (RISK_RANK[previous.overallRisk] || 0)
		? current.overallRisk
		: previous.overallRisk

	return {
		version: 1,
		inviterId: current.inviterId,
		inviteeIds,
		ipGroups: Array.from(groupMap.values()).sort((left, right) => {
			const rankDifference = (RISK_RANK[right.riskLevel] || 0) - (RISK_RANK[left.riskLevel] || 0)
			if (rankDifference !== 0) return rankDifference
			if (right.count !== left.count) return right.count - left.count
			return left.ip.localeCompare(right.ip)
		}),
		overallRisk
	}
}

function hasReviewableChange(change) {
	return Boolean(
		change && (
			change.firstDiscovery ||
			change.newInviter ||
			change.newInviteeIds.length ||
			change.newIpGroups.length ||
			change.grownIpGroups.length ||
			change.riskUpgraded ||
			change.reachedHigh
		)
	)
}

function mergeChange(previousChange, currentChange, detectedAt) {
	if (!previousChange) return { ...currentChange, detectedAt }
	const inviteeIds = Array.from(new Set(
		(previousChange.newInviteeIds || []).concat(currentChange.newInviteeIds || []).map(String)
	))
	const mergeGroups = (left, right, include) => {
		const map = new Map()
		;(left || []).concat(right || []).forEach(group => {
			if (!group || !group.ip || (typeof include === 'function' && !include(group))) return
			const existing = map.get(group.ip)
			if (!existing || Number(group.count || 0) >= Number(existing.count || 0)) map.set(group.ip, { ...group })
		})
		return Array.from(map.values())
	}
	return {
		firstDiscovery: Boolean(previousChange.firstDiscovery || currentChange.firstDiscovery),
		newInviter: Boolean(previousChange.newInviter || currentChange.newInviter),
		newInviteeIds: inviteeIds,
		newIpGroups: mergeGroups(
			previousChange.newIpGroups,
			currentChange.newIpGroups,
			group => Number(group.count || 0) >= SHARED_IP_GROUP_MIN
		),
		grownIpGroups: mergeGroups(
			previousChange.grownIpGroups,
			currentChange.grownIpGroups,
			group => (
				Number(group.count || 0) >= SHARED_IP_GROUP_MIN &&
				Number(group.previousCount || 0) >= SHARED_IP_GROUP_MIN
			)
		),
		riskUpgraded: Boolean(previousChange.riskUpgraded || currentChange.riskUpgraded),
		reachedHigh: Boolean(previousChange.reachedHigh || currentChange.reachedHigh),
		hasChanges: true,
		detectedAt: Number(previousChange.detectedAt) || detectedAt
	}
}

function shouldAutoBaselineBannedInviter(result, pendingReview, pendingChange) {
	if (!pendingReview || !pendingChange || !result || !result.inviter) return false
	if (Number(result.inviter.status) !== 3) return false
	return Boolean(pendingChange.firstDiscovery || pendingChange.newInviter)
}

function compareAndMergeBaseline(results, previousBaseline, nowMs, options = {}) {
	const now = normalizeInviteTime(nowMs === undefined ? Date.now() : nowMs)
	if (!now) throw new TypeError('nowMs must be a valid timestamp')
	const previousInviters = getBaselineInviters(previousBaseline)
	const baselineExists = Boolean(
		previousBaseline &&
		typeof previousBaseline === 'object' &&
		(Number(previousBaseline.updatedAt) > 0 || Object.keys(previousInviters).length > 0)
	)
	const currentResults = Array.isArray(results) ? results : []
	const nextInviters = {}
	if (!options.pruneMissingInviters) {
		Object.keys(previousInviters).forEach(inviterId => {
			nextInviters[inviterId] = copyBaselineEntry(previousInviters[inviterId], inviterId)
		})
	}

	const nextResults = currentResults.map(result => {
		const currentSnapshot = result && result.snapshot && String(result.snapshot.inviterId) === String(result.inviterId)
			? result.snapshot
			: createSnapshot(result)
		const previousEntry = Object.prototype.hasOwnProperty.call(previousInviters, result.inviterId)
			? copyBaselineEntry(previousInviters[result.inviterId], result.inviterId)
			: null
		const completeForInviter = options.completeForInviter !== false
		const riskPreviousSnapshot = previousEntry
			? (previousEntry.snapshotComplete ? previousEntry.snapshot : previousEntry.completeSnapshot)
			: null
		const change = compareInviterSnapshots(
			currentSnapshot,
			previousEntry && previousEntry.snapshot,
			{
				previousScanExists: baselineExists,
				compareRiskChanges: completeForInviter,
				riskPreviousSnapshot
			}
		)
		const currentNeedsReview = hasReviewableChange(change)
		const pendingReviewBeforeAutoBaseline = Boolean((previousEntry && previousEntry.pendingReview) || currentNeedsReview)
		const mergedPendingChange = pendingReviewBeforeAutoBaseline
			? mergeChange(previousEntry && previousEntry.pendingChange, change, now)
			: null
		const autoBaselined = options.autoBaselineBanned !== false && shouldAutoBaselineBannedInviter(
			result,
			pendingReviewBeforeAutoBaseline,
			mergedPendingChange
		)
		const pendingReview = autoBaselined ? false : pendingReviewBeforeAutoBaseline
		const pendingChange = autoBaselined ? null : mergedPendingChange

		nextInviters[result.inviterId] = {
			snapshot: completeForInviter
				? currentSnapshot
				: (previousEntry ? mergeSnapshots(previousEntry.snapshot, currentSnapshot) : currentSnapshot),
			snapshotComplete: completeForInviter,
			completeSnapshot: completeForInviter
				? null
				: (previousEntry
					? (previousEntry.snapshotComplete
						? { ...previousEntry.snapshot, inviteeIds: [] }
						: previousEntry.completeSnapshot)
					: null),
			pendingReview,
			pendingChange,
			firstSeenAt: (previousEntry && previousEntry.firstSeenAt) || now,
			lastSeenAt: now,
			reviewedAt: autoBaselined
				? now
				: (pendingReview ? ((previousEntry && previousEntry.reviewedAt) || 0) : ((previousEntry && previousEntry.reviewedAt) || now))
		}

		return {
			...result,
			change,
			changes: change,
			pendingReview,
			pendingChange,
			autoBaselined
		}
	})

	const summary = {
		inviterCount: nextResults.length,
		inviteeCount: 0,
		abnormalCount: 0,
		highCount: 0,
		mediumCount: 0,
		normalCount: 0,
		unknownCount: 0,
		pendingCount: 0,
		firstDiscoveryCount: 0,
		newInviterCount: 0,
		newInviteeCount: 0,
		newIpGroupCount: 0,
		grownIpGroupCount: 0,
		riskUpgradeCount: 0,
		reachedHighCount: 0,
		hasCurrentChanges: false
	}
	const currentChangeAllowed = baselineExists
	nextResults.forEach(result => {
		summary.inviteeCount += result.inviteeCount
		summary[`${result.overallRisk}Count`]++
		if (result.pendingReview) summary.pendingCount++
		if (result.change.firstDiscovery) summary.firstDiscoveryCount++
		if (!currentChangeAllowed) return
		if (result.change.newInviter) summary.newInviterCount++
		summary.newInviteeCount += result.change.newInviteeIds.length
		summary.newIpGroupCount += result.change.newIpGroups.length
		summary.grownIpGroupCount += result.change.grownIpGroups.length
		if (result.change.riskUpgraded) summary.riskUpgradeCount++
		if (result.change.reachedHigh) summary.reachedHighCount++
		if (hasReviewableChange(result.change)) summary.hasCurrentChanges = true
	})

	return {
		results: nextResults,
		baseline: {
			version: 1,
			updatedAt: now,
			records: nextInviters
		},
		summary
	}
}

module.exports = {
	SAME_DAY_RISK_MIN,
	RECENT_FIVE_DAY_ABNORMAL_MIN,
	FIVE_DAYS_MS,
	ONE_DAY_MS,
	RISK_RANK,
	normalizeTimestamp,
	normalizeInviteTime,
	getBusinessDayKey,
	getBusinessDateStart,
	resolveBusinessDateRange,
	formatBusinessTimestamp,
	analyzeInviteTimes,
	createInviterScanAccumulator,
	accumulateInviterAccount,
	finalizeInviterScanAccumulator,
	buildRiskReasons,
	buildSnapshot,
	compareInviterSnapshots,
	scanInviter,
	analyzeInviter,
	createSnapshot,
	emptyBaseline,
	compareAndMergeBaseline
}

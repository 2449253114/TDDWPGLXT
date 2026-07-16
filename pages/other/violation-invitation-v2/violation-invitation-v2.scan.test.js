const assert = require('assert')
const {
	FIVE_DAYS_MS,
	normalizeTimestamp,
	normalizeInviteTime,
	getBusinessDayKey,
	getBusinessDateStart,
	resolveBusinessDateRange,
	formatBusinessTimestamp,
	compareInviterSnapshots,
	scanInviter,
	analyzeInviter,
	createInviterScanAccumulator,
	accumulateInviterAccount,
	finalizeInviterScanAccumulator,
	createSnapshot,
	emptyBaseline,
	compareAndMergeBaseline
} = require('./violation-invitation-v2.scan.js')

const NOW = Date.UTC(2026, 6, 16, 12, 0, 0)

assert.strictEqual(normalizeInviteTime(NOW / 1000), NOW)
assert.strictEqual(normalizeInviteTime(String(NOW)), NOW)
assert.strictEqual(normalizeInviteTime(new Date(NOW)), NOW)
assert.strictEqual(normalizeInviteTime('invalid'), 0)
assert.strictEqual(normalizeTimestamp(NOW / 1000), NOW)
assert.deepStrictEqual(emptyBaseline(), { version: 1, updatedAt: 0, records: {} })

const RANGE_CONFIRMED_AT = Date.parse('2026-07-16T04:34:56.789Z')
const QUICK_RANGE_EXPECTATIONS = [
	['today', '2026-07-15T16:00:00.000Z'],
	['yesterday', '2026-07-14T16:00:00.000Z'],
	['dayBeforeYesterday', '2026-07-13T16:00:00.000Z'],
	['days3', '2026-07-13T16:00:00.000Z'],
	['days7', '2026-07-09T16:00:00.000Z'],
	['days15', '2026-07-01T16:00:00.000Z'],
	['days30', '2026-06-16T16:00:00.000Z']
]
QUICK_RANGE_EXPECTATIONS.forEach(([mode, expectedStart]) => {
	const range = resolveBusinessDateRange({ mode, confirmedAt: RANGE_CONFIRMED_AT })
	assert.strictEqual(new Date(range.startMs).toISOString(), expectedStart, `${mode} must start at the expected Beijing midnight`)
	assert.strictEqual(range.endMs, RANGE_CONFIRMED_AT, `${mode} must end at confirmation time`)
	assert.strictEqual(range.endDate, '2026-07-16')
})
assert.strictEqual(getBusinessDayKey(Date.parse('2026-07-15T15:59:59.999Z')), '2026-07-15')
assert.strictEqual(getBusinessDayKey(Date.parse('2026-07-15T16:00:00.000Z')), '2026-07-16')
assert.strictEqual(getBusinessDayKey(Date.parse('1971-01-01T16:00:00.000Z')), '1971-01-02', 'known millisecond timestamps must not be reinterpreted as Unix seconds')
assert.strictEqual(new Date(getBusinessDateStart('2026-07-16')).toISOString(), '2026-07-15T16:00:00.000Z')
assert.strictEqual(formatBusinessTimestamp(RANGE_CONFIRMED_AT), '2026-07-16 12:34:56')

const customRange = resolveBusinessDateRange({ mode: 'custom', customDays: '4', confirmedAt: RANGE_CONFIRMED_AT })
assert.strictEqual(new Date(customRange.startMs).toISOString(), '2026-07-12T16:00:00.000Z')
assert.strictEqual(customRange.startDate, '2026-07-13')
assert.strictEqual(customRange.endMs, RANGE_CONFIRMED_AT)

const manualInput = ['2026-07-10', '2026-07-12']
const manualPastRange = resolveBusinessDateRange({ mode: 'manual', dateRange: manualInput, confirmedAt: RANGE_CONFIRMED_AT })
assert.deepStrictEqual(manualInput, ['2026-07-10', '2026-07-12'], 'range parsing must not mutate picker values')
assert.strictEqual(new Date(manualPastRange.startMs).toISOString(), '2026-07-09T16:00:00.000Z')
assert.strictEqual(new Date(manualPastRange.endMs).toISOString(), '2026-07-12T15:59:59.999Z')

const manualTodayRange = resolveBusinessDateRange({
	mode: 'manual',
	dateRange: ['2026-07-10', '2026-07-16'],
	confirmedAt: RANGE_CONFIRMED_AT
})
assert.strictEqual(manualTodayRange.endMs, RANGE_CONFIRMED_AT, 'a manual range ending today must use confirmation time')
const exactMidnight = Date.parse('2026-07-15T16:00:00.000Z')
const midnightRange = resolveBusinessDateRange({ mode: 'today', confirmedAt: exactMidnight })
assert.strictEqual(midnightRange.startMs, exactMidnight)
assert.strictEqual(midnightRange.endMs, exactMidnight, 'today at exact Beijing midnight is a valid one-instant range')
const leapRange = resolveBusinessDateRange({
	mode: 'days3',
	confirmedAt: Date.parse('2024-03-01T02:00:00.000Z')
})
assert.strictEqual(leapRange.startDate, '2024-02-28', 'three Beijing calendar days across leap day must start on February 28')

assert.throws(() => getBusinessDateStart('2026-02-30'), /不存在/)
assert.throws(() => getBusinessDateStart('2026-2-03'), /YYYY-MM-DD/)
assert.throws(() => resolveBusinessDateRange({ mode: 'manual', dateRange: ['2026-07-12'], confirmedAt: RANGE_CONFIRMED_AT }), /完整/)
assert.throws(() => resolveBusinessDateRange({ mode: 'manual', dateRange: ['2026-07-12', '2026-07-10'], confirmedAt: RANGE_CONFIRMED_AT }), /开始日期/)
assert.throws(() => resolveBusinessDateRange({ mode: 'manual', dateRange: ['2026-07-10', '2026-07-17'], confirmedAt: RANGE_CONFIRMED_AT }), /未来/)
assert.throws(() => resolveBusinessDateRange({ mode: 'custom', customDays: '', confirmedAt: RANGE_CONFIRMED_AT }), /正整数/)
assert.throws(() => resolveBusinessDateRange({ mode: 'custom', customDays: 0, confirmedAt: RANGE_CONFIRMED_AT }), /正整数/)
assert.throws(() => resolveBusinessDateRange({ mode: 'custom', customDays: -1, confirmedAt: RANGE_CONFIRMED_AT }), /正整数/)
assert.throws(() => resolveBusinessDateRange({ mode: 'custom', customDays: 1.5, confirmedAt: RANGE_CONFIRMED_AT }), /正整数/)
assert.throws(() => resolveBusinessDateRange({ mode: 'custom', customDays: '1e3', confirmedAt: RANGE_CONFIRMED_AT }), /正整数/)
assert.throws(() => resolveBusinessDateRange({ mode: 'custom', customDays: Number.MAX_SAFE_INTEGER, confirmedAt: RANGE_CONFIRMED_AT }), /超出支持范围/)
assert.throws(() => resolveBusinessDateRange({ mode: 'unknown', confirmedAt: RANGE_CONFIRMED_AT }), /快捷范围/)
assert.throws(() => resolveBusinessDateRange({ mode: 'today', confirmedAt: 0 }), /确认时间/)

function account(id, inviterId, ip, inviteTime, useLoginIp = false) {
	return {
		_id: id,
		inviter_uid: inviterId,
		register_ip: useLoginIp ? '' : ip,
		login_ip: useLoginIp ? ip : '',
		invite_time: inviteTime,
		status: 0
	}
}

const postCutoffLoginInviter = {
	_id: 'post-cutoff-login-inviter',
	register_ip: '',
	login_ip: '203.0.113.250',
	login_date: NOW + 1000
}
const postCutoffLoginAccumulator = createInviterScanAccumulator(postCutoffLoginInviter, NOW)
accumulateInviterAccount(postCutoffLoginAccumulator, {
	...account('post-cutoff-login-invitee', postCutoffLoginInviter._id, '203.0.113.250', NOW - 1000, true),
	login_date: NOW + 1000
})
assert.strictEqual(postCutoffLoginAccumulator.inviteeIdSet, null, 'small inviter groups must avoid one Set allocation per inviter')
assert.strictEqual(postCutoffLoginAccumulator.ipCounts, null, 'empty IP counters must not allocate a Map per inviter')
assert.strictEqual(Array.isArray(postCutoffLoginAccumulator.dayCounts), true, 'small day counters must stay in compact scalar storage')
const postCutoffLoginResult = finalizeInviterScanAccumulator(postCutoffLoginAccumulator)
assert.strictEqual(postCutoffLoginResult.highestIpCount, 0, 'login IP values updated after the scan cutoff must wait for the next scan')

const boundaryAccounts = []
for (let index = 0; index < 5; index++) {
	boundaryAccounts.push(account(`normal-${index}`, 'inviter-1', '10.0.0.5', NOW - index * 1000))
}
for (let index = 0; index < 6; index++) {
	boundaryAccounts.push(account(`medium-6-${index}`, 'inviter-1', '10.0.0.6', NOW - index * 1000))
}
for (let index = 0; index < 14; index++) {
	boundaryAccounts.push(account(`medium-14-${index}`, 'inviter-1', '10.0.0.14', NOW - index * 1000))
}
for (let index = 0; index < 15; index++) {
	boundaryAccounts.push(account(
		`high-${index}`,
		'inviter-1',
		'10.0.0.15',
		index % 2 === 0 ? Math.floor((NOW - index * 1000) / 1000) : NOW - index * 1000,
		index >= 8
	))
}
boundaryAccounts.push(account('inviter-1', 'inviter-1', '10.0.0.15', NOW))
boundaryAccounts.push(account('wrong-inviter', 'inviter-2', '10.0.0.15', NOW))

const boundaryScan = scanInviter(
	{ _id: 'inviter-1', my_invite_code: 'ABC123' },
	boundaryAccounts,
	undefined,
	{ now: NOW }
)
assert.strictEqual(boundaryScan.inviteeCount, 40, 'self invite and mismatched inviter must be excluded')
assert.strictEqual(boundaryScan.highestIpRisk, 'high')
assert.strictEqual(boundaryScan.riskLevel, 'high')
assert.strictEqual(boundaryScan.invitedCount, 40)
assert.strictEqual(boundaryScan.highestIpCount, 15)
assert.strictEqual(boundaryScan.highIpGroupCount, 1)
assert.strictEqual(boundaryScan.mediumIpGroupCount, 2)
assert.strictEqual(boundaryScan.ipGroups.find(group => group.ip === '10.0.0.5').riskLevel, 'normal')
assert.strictEqual(boundaryScan.ipGroups.find(group => group.ip === '10.0.0.6').riskLevel, 'medium')
assert.strictEqual(boundaryScan.ipGroups.find(group => group.ip === '10.0.0.14').riskLevel, 'medium')
assert.strictEqual(boundaryScan.ipGroups.find(group => group.ip === '10.0.0.15').riskLevel, 'high')
assert.strictEqual(boundaryScan.snapshot.inviteeIds.includes('inviter-1'), false)
assert.strictEqual(boundaryScan.riskReasonDetails.some(reason => reason.code === 'high_ip_group'), true)
assert.strictEqual(boundaryScan.riskReasons.some(reason => reason.includes('10.0.0.15')), true)

const sameDayOnlyAccounts = []
for (let index = 0; index < 10; index++) {
	sameDayOnlyAccounts.push(account(`same-day-${index}`, 'same-day-inviter', `100.64.0.${index + 1}`, NOW - index * 1000))
}
const sameDayOnlyScan = scanInviter({ _id: 'same-day-inviter' }, sameDayOnlyAccounts, undefined, { now: NOW })
assert.strictEqual(sameDayOnlyScan.highestIpRisk, 'normal')
assert.strictEqual(sameDayOnlyScan.riskLevel, 'high', '10 same-day invites must promote inviter risk to high')
assert.strictEqual(sameDayOnlyScan.overallRisk, 'high')
assert.strictEqual(sameDayOnlyScan.riskReasonDetails.find(reason => reason.code === 'same_day_invites').level, 'high')

const chinaMidnightAccounts = []
for (let index = 0; index < 5; index++) {
	chinaMidnightAccounts.push(account(
		`before-china-midnight-${index}`,
		'china-day-inviter',
		`192.0.2.${index + 1}`,
		Date.UTC(2026, 6, 16, 15, 30, index)
	))
	chinaMidnightAccounts.push(account(
		`after-china-midnight-${index}`,
		'china-day-inviter',
		`198.51.100.${index + 1}`,
		Date.UTC(2026, 6, 16, 16, 10, index)
	))
}
const chinaMidnightScan = scanInviter(
	{ _id: 'china-day-inviter' },
	chinaMidnightAccounts,
	undefined,
	{ now: Date.UTC(2026, 6, 17, 12, 0, 0) }
)
assert.strictEqual(chinaMidnightScan.maxSameDayInviteCount, 5, 'same-day grouping must use the Asia/Shanghai business date')
assert.strictEqual(chinaMidnightScan.riskLevel, 'normal', 'records across China midnight must not be merged into one high-risk day')

const abnormalAccounts = []
for (let index = 0; index < 50; index++) {
	const dayOffset = Math.floor(index / 10)
	const timestamp = NOW - dayOffset * 24 * 60 * 60 * 1000 - (index % 10) * 60 * 1000
	const ip = `172.16.${Math.floor(index / 250)}.${(index % 250) + 1}`
	abnormalAccounts.push(account(
		`recent-${index}`,
		'inviter-2',
		ip,
		index % 2 === 0 ? Math.floor(timestamp / 1000) : timestamp
	))
}
abnormalAccounts.push(account('exact-five-days', 'inviter-2', '192.0.2.1', NOW - FIVE_DAYS_MS))
abnormalAccounts.push(account('too-old', 'inviter-2', '192.0.2.2', NOW - FIVE_DAYS_MS - 1))

const abnormalScan = scanInviter({ _id: 'inviter-2' }, abnormalAccounts, undefined, { now: NOW })
assert.strictEqual(abnormalScan.maxSameDayInviteCount, 10)
assert.strictEqual(abnormalScan.recentFiveDayInviteCount, 51, 'exact five-day boundary is inclusive')
assert.strictEqual(abnormalScan.abnormal, true)
assert.strictEqual(abnormalScan.overallRisk, 'abnormal')
assert.strictEqual(abnormalScan.riskReasonDetails.some(reason => reason.code === 'same_day_invites'), true)
assert.strictEqual(abnormalScan.riskReasonDetails.some(reason => reason.code === 'recent_five_day_invites'), true)

const streamedInviter = {
	_id: 'streamed-inviter',
	my_invite_code: 'STREAM',
	register_ip: '203.0.113.200',
	login_ip: '203.0.113.200'
}
const streamedAccounts = []
for (let index = 0; index < 1505; index++) {
	const timestamp = NOW - (index % 7) * 24 * 60 * 60 * 1000 - index * 1000
	const user = account(
		`streamed-${String(index).padStart(4, '0')}`,
		streamedInviter._id,
		`198.18.${index % 4}.${(index % 200) + 1}`,
		index % 2 === 0 ? Math.floor(timestamp / 1000) : timestamp
	)
	if (index % 3 === 0) user.login_ip = user.register_ip
	if (index % 5 === 0) user.login_ip = '203.0.113.200'
	streamedAccounts.push(user)
}
streamedAccounts.push(account('streamed-inviter', 'streamed-inviter', '203.0.113.200', NOW))
streamedAccounts.push(account('streamed-wrong-inviter', 'another-inviter', '203.0.113.200', NOW))

const streamedAccumulator = createInviterScanAccumulator(streamedInviter, NOW)
for (let start = 0; start < streamedAccounts.length; start += 137) {
	streamedAccounts.slice(start, start + 137).forEach(user => {
		accumulateInviterAccount(streamedAccumulator, user)
	})
}
assert.strictEqual(Array.isArray(streamedAccumulator.inviteeIds), true)
assert.strictEqual(streamedAccumulator.inviteeIdSet instanceof Set, true, 'large inviter groups should promote duplicate checks to a Set')
assert.strictEqual(streamedAccumulator.ipCounts instanceof Map, true)
assert.strictEqual(Array.isArray(streamedAccumulator.dayCounts) || streamedAccumulator.dayCounts instanceof Map, true)
assert.strictEqual(
	Object.values(streamedAccumulator).filter(Array.isArray).every(values => values.every(value => typeof value !== 'object')),
	true,
	'streaming accumulator must retain only compact scalar arrays, never invitee objects'
)
assert.strictEqual(streamedAccumulator.inviteeIds.every(id => typeof id === 'string'), true)
assert.strictEqual(Array.from(streamedAccumulator.ipCounts.values()).every(count => typeof count === 'number'), true)
assert.strictEqual(
	streamedAccumulator.dayCounts instanceof Map
		? Array.from(streamedAccumulator.dayCounts.values()).every(count => typeof count === 'number')
		: streamedAccumulator.dayCounts.filter((value, index) => index % 2 === 1).every(count => typeof count === 'number'),
	true
)

const streamedScan = finalizeInviterScanAccumulator(streamedAccumulator)
assert.strictEqual(streamedAccumulator.inviteeIdSet, null, 'finalization must release the large duplicate-check Set')
assert.throws(
	() => accumulateInviterAccount(streamedAccumulator, account('streamed-after-finalize', streamedInviter._id, '198.51.100.250', NOW)),
	/already been finalized/,
	'a finalized accumulator must reject writes instead of mutating the returned snapshot by shared reference'
)
const materializedScan = analyzeInviter(streamedInviter, streamedAccounts, NOW)
const inviterInclusiveGroup = streamedScan.ipGroups.find(group => group.ip === '203.0.113.200')
assert.strictEqual(inviterInclusiveGroup.includesInviter, true, 'streaming scans must include the inviter in IP evidence')
assert.strictEqual(streamedScan.snapshot.inviteeIds.includes(streamedInviter._id), false, 'the inviter must not become an invitee')
const equivalentSummaryFields = [
	'inviterId',
	'inviteCode',
	'inviteeCount',
	'invitedCount',
	'highestIpRisk',
	'highestIpCount',
	'highIpGroupCount',
	'mediumIpGroupCount',
	'maxSameDayInviteCount',
	'maxSameDayCount',
	'maxSameDayInviteDate',
	'recentFiveDayInviteCount',
	'recentFiveDayCount',
	'abnormal',
	'overallRisk',
	'riskLevel',
	'riskReasons',
	'riskReasonDetails',
	'snapshot',
	'changes'
]
equivalentSummaryFields.forEach(field => {
	assert.deepStrictEqual(streamedScan[field], materializedScan[field], `streamed ${field} must match materialized analysis`)
})

const previousSnapshot = {
	version: 1,
	inviterId: 'inviter-1',
	inviteeIds: ['normal-0'],
	ipGroups: [
		{ ip: '10.0.0.5', count: 1, riskLevel: 'normal' },
		{ ip: '10.0.0.6', count: 6, riskLevel: 'medium' }
	],
	overallRisk: 'medium'
}
const upgradedScan = scanInviter(
	{ _id: 'inviter-1' },
	boundaryAccounts,
	previousSnapshot,
	{ now: NOW, previousScanExists: true }
)
assert.strictEqual(upgradedScan.changes.firstDiscovery, false)
assert.strictEqual(upgradedScan.changes.newInviter, false)
assert.strictEqual(upgradedScan.changes.newInviteeIds.includes('high-0'), true)
assert.strictEqual(upgradedScan.changes.newIpGroups.some(group => group.ip === '10.0.0.15'), true)
assert.strictEqual(upgradedScan.changes.newIpGroups.some(group => group.ip === '10.0.0.5' && group.count === 5), true, 'an IP changing from one account to a shared group must be reported as newly shared')
assert.strictEqual(upgradedScan.changes.grownIpGroups.some(group => group.ip === '10.0.0.5'), false, 'singleton IP evidence must not be mislabeled as an already-shared group growth')
assert.strictEqual(upgradedScan.changes.riskUpgraded, true)
assert.strictEqual(upgradedScan.changes.reachedHigh, true)

const baselineChanges = compareInviterSnapshots(boundaryScan.snapshot, null, { previousScanExists: false })
assert.strictEqual(baselineChanges.firstDiscovery, true)
assert.strictEqual(baselineChanges.newInviter, false)
assert.strictEqual(baselineChanges.reachedHigh, false, 'initial baseline must not emit a reached-high alert')

const dualIpAccounts = Array.from({ length: 66 }, (_, index) => ({
	_id: `dual-ip-${index}`,
	inviter_uid: 'dual-ip-inviter',
	register_ip: `198.18.0.${index + 1}`,
	login_ip: `198.19.0.${index + 1}`,
	invite_time: NOW - index,
	status: 0
}))
const dualIpNewInviter = scanInviter(
	{ _id: 'dual-ip-inviter' },
	dualIpAccounts,
	undefined,
	{ now: NOW, previousScanExists: true }
)
assert.strictEqual(dualIpNewInviter.invitedCount, 66)
assert.strictEqual(dualIpNewInviter.snapshot.ipGroups.length, 132, 'complete snapshots must retain both register and login IP evidence for future comparison')
assert.strictEqual(dualIpNewInviter.changes.newIpGroups.length, 0, '132 singleton IP values from 66 accounts must not be reported as 132 same-IP groups')

dualIpAccounts[1].register_ip = dualIpAccounts[0].register_ip
const oneSharedIpNewInviter = scanInviter(
	{ _id: 'dual-ip-inviter' },
	dualIpAccounts,
	undefined,
	{ now: NOW, previousScanExists: true }
)
assert.deepStrictEqual(
	oneSharedIpNewInviter.changes.newIpGroups.map(group => ({ ip: group.ip, count: group.count })),
	[{ ip: dualIpAccounts[0].register_ip, count: 2 }],
	'only IP values shared by at least two accounts may enter the new same-IP group count'
)

const sortedIdChanges = compareInviterSnapshots({
	inviterId: 'sorted-diff',
	inviteeIds: ['a', 'b', 'd'],
	ipGroups: [],
	overallRisk: 'normal'
}, {
	inviterId: 'sorted-diff',
	inviteeIds: ['a', 'c'],
	ipGroups: [],
	overallRisk: 'normal'
}, { previousScanExists: true })
assert.deepStrictEqual(sortedIdChanges.newInviteeIds, ['b', 'd'], 'sorted baseline IDs must use the allocation-light diff without changing results')

const unsortedIdChanges = compareInviterSnapshots({
	inviterId: 'unsorted-diff',
	inviteeIds: ['d', 'a', 'b'],
	ipGroups: [],
	overallRisk: 'normal'
}, {
	inviterId: 'unsorted-diff',
	inviteeIds: ['c', 'a'],
	ipGroups: [],
	overallRisk: 'normal'
}, { previousScanExists: true })
assert.deepStrictEqual(unsortedIdChanges.newInviteeIds, ['d', 'b'], 'legacy unsorted snapshots must retain the defensive Set fallback')

const analyzedForBaseline = [
	analyzeInviter(
		{ _id: 'baseline-1', my_invite_code: 'BASE01' },
		[
			account('baseline-a', 'baseline-1', '198.51.100.1', NOW),
			account('baseline-b', 'baseline-1', '198.51.100.1', NOW)
		],
		NOW
	),
	analyzeInviter(
		{ _id: 'baseline-2', my_invite_code: 'BASE02' },
		[account('baseline-z', 'baseline-2', '203.0.113.1', NOW)],
		NOW
	)
]
assert.deepStrictEqual(createSnapshot(analyzedForBaseline[0]), analyzedForBaseline[0].snapshot)

const firstBaselineMerge = compareAndMergeBaseline(analyzedForBaseline, null, NOW)
assert.strictEqual(firstBaselineMerge.summary.firstDiscoveryCount, 2)
assert.strictEqual(firstBaselineMerge.summary.pendingCount, 2)
assert.strictEqual(firstBaselineMerge.summary.hasCurrentChanges, false, 'first baseline uses the dedicated first-discovery summary')
assert.strictEqual(firstBaselineMerge.results.every(result => result.change.firstDiscovery), true)
assert.strictEqual(firstBaselineMerge.results.every(result => result.pendingReview), true)
assert.strictEqual(firstBaselineMerge.results.every(result => result.pendingChange.firstDiscovery), true)
assert.strictEqual(firstBaselineMerge.results.every(result => result.pendingChange.newInviteeIds.length === 0), true)
assert.strictEqual(firstBaselineMerge.baseline.records['baseline-1'].snapshotComplete, true)
assert.strictEqual(firstBaselineMerge.baseline.records['baseline-1'].completeSnapshot, null, 'complete baselines must not duplicate their IP snapshot')
const emptyObjectBaselineMerge = compareAndMergeBaseline(analyzedForBaseline, emptyBaseline(), NOW)
assert.strictEqual(emptyObjectBaselineMerge.summary.hasCurrentChanges, false)
assert.strictEqual(emptyObjectBaselineMerge.summary.firstDiscoveryCount, 2)
assert.strictEqual(emptyObjectBaselineMerge.results.every(result => !result.change.newInviter), true)

const prunedFullBaseline = compareAndMergeBaseline(
	[analyzedForBaseline[0]],
	firstBaselineMerge.baseline,
	NOW + 500,
	{ completeForInviter: true, pruneMissingInviters: true }
)
assert.ok(prunedFullBaseline.baseline.records['baseline-1'])
assert.strictEqual(prunedFullBaseline.baseline.records['baseline-2'], undefined, 'a successful all-scope scan must remove inviters that no longer have invitation relationships')

const reviewedBaseline = JSON.parse(JSON.stringify(firstBaselineMerge.baseline))
reviewedBaseline.records['baseline-1'].pendingReview = false
reviewedBaseline.records['baseline-1'].pendingChange = null
reviewedBaseline.records['baseline-1'].reviewedAt = NOW
const partialResult = analyzeInviter(
	{ _id: 'baseline-1', my_invite_code: 'BASE01' },
	[
		account('baseline-b', 'baseline-1', '198.51.100.1', NOW),
		account('baseline-c', 'baseline-1', '198.51.100.2', NOW)
	],
	NOW
)
const partialMerge = compareAndMergeBaseline([partialResult], reviewedBaseline, NOW + 1000, {
	completeForInviter: false
})
assert.deepStrictEqual(
	partialMerge.baseline.records['baseline-1'].snapshot.inviteeIds,
	['baseline-a', 'baseline-b', 'baseline-c'],
	'baseline must retain all historically seen invitees'
)
assert.ok(partialMerge.baseline.records['baseline-2'], 'partial scans must retain inviters outside the current scan scope')
assert.deepStrictEqual(partialMerge.results[0].change.newInviteeIds, ['baseline-c'])
assert.deepStrictEqual(partialMerge.results[0].pendingChange.newInviteeIds, ['baseline-c'])
assert.strictEqual(partialMerge.results[0].pendingReview, true)
assert.strictEqual(partialMerge.summary.newInviteeCount, 1)
assert.strictEqual(partialMerge.summary.newIpGroupCount, 0, 'a newly observed singleton IP must not inflate the same-IP group summary')
assert.strictEqual(partialMerge.summary.hasCurrentChanges, true)
assert.deepStrictEqual(partialMerge.results[0].change.grownIpGroups, [], 'partial snapshots must not emit IP growth alerts')
assert.strictEqual(partialMerge.results[0].change.riskUpgraded, false, 'partial snapshots must not emit risk upgrades')

const legacySingletonGroupBaseline = JSON.parse(JSON.stringify(reviewedBaseline))
legacySingletonGroupBaseline.records['baseline-1'].pendingReview = true
legacySingletonGroupBaseline.records['baseline-1'].pendingChange = {
	firstDiscovery: false,
	newInviter: false,
	newInviteeIds: [],
	newIpGroups: [
		{ ip: 'legacy-singleton', count: 1, riskLevel: 'normal' },
		{ ip: 'legacy-shared', count: 2, riskLevel: 'normal' }
	],
	grownIpGroups: [
		{ ip: 'legacy-singleton-growth', previousCount: 1, count: 2, riskLevel: 'normal' },
		{ ip: 'legacy-shared-growth', previousCount: 2, count: 3, riskLevel: 'normal' }
	],
	riskUpgraded: false,
	reachedHigh: false,
	hasChanges: true,
	detectedAt: NOW - 1000
}
const sanitizedLegacyPending = compareAndMergeBaseline(
	[analyzedForBaseline[0]],
	legacySingletonGroupBaseline,
	NOW + 1500
)
assert.strictEqual(sanitizedLegacyPending.results[0].pendingReview, true, 'sanitizing old IP statistics must not silently mark the result reviewed')
assert.deepStrictEqual(
	sanitizedLegacyPending.results[0].pendingChange.newIpGroups.map(group => group.ip),
	['legacy-shared'],
	'old local pending changes must drop singleton IP evidence from the same-IP group count'
)
assert.deepStrictEqual(
	sanitizedLegacyPending.results[0].pendingChange.grownIpGroups.map(group => group.ip),
	['legacy-shared-growth'],
	'old local pending changes must drop growth entries whose previous state was not already shared'
)

const newInviterAfterBaseline = compareAndMergeBaseline([
	analyzeInviter(
		{ _id: 'baseline-3' },
		[account('baseline-new', 'baseline-3', '203.0.113.30', NOW)],
		NOW
	)
], firstBaselineMerge.baseline, NOW + 2000)
assert.strictEqual(newInviterAfterBaseline.results[0].change.firstDiscovery, false)
assert.strictEqual(newInviterAfterBaseline.results[0].change.newInviter, true)
assert.strictEqual(newInviterAfterBaseline.summary.firstDiscoveryCount, 0)
assert.strictEqual(newInviterAfterBaseline.summary.newInviterCount, 1)

const mixedFirstDiscovery = compareAndMergeBaseline([
	analyzeInviter(
		{ _id: 'first-active', status: 0 },
		[account('first-active-user', 'first-active', '203.0.113.41', NOW)],
		NOW
	),
	analyzeInviter(
		{ _id: 'first-banned', status: 3 },
		[account('first-banned-user', 'first-banned', '203.0.113.42', NOW)],
		NOW
	)
], emptyBaseline(), NOW + 3000)
const activeFirstResult = mixedFirstDiscovery.results.find(result => result.inviterId === 'first-active')
const bannedFirstResult = mixedFirstDiscovery.results.find(result => result.inviterId === 'first-banned')
assert.strictEqual(activeFirstResult.pendingReview, true, 'an active first discovery must remain pending')
assert.strictEqual(activeFirstResult.autoBaselined, false)
assert.strictEqual(bannedFirstResult.change.firstDiscovery, true)
assert.strictEqual(bannedFirstResult.pendingReview, false, 'a banned first discovery must be accepted into the local baseline')
assert.strictEqual(bannedFirstResult.pendingChange, null)
assert.strictEqual(bannedFirstResult.autoBaselined, true)
assert.strictEqual(mixedFirstDiscovery.baseline.records['first-banned'].pendingReview, false)
assert.strictEqual(mixedFirstDiscovery.baseline.records['first-banned'].pendingChange, null)
assert.strictEqual(mixedFirstDiscovery.baseline.records['first-banned'].reviewedAt, NOW + 3000)
assert.deepStrictEqual(mixedFirstDiscovery.baseline.records['first-banned'].snapshot.inviteeIds, ['first-banned-user'])
assert.strictEqual(mixedFirstDiscovery.summary.firstDiscoveryCount, 2)
assert.strictEqual(mixedFirstDiscovery.summary.pendingCount, 1)

const unpersistedAutoBaselineFallback = compareAndMergeBaseline([
	analyzeInviter(
		{ _id: 'first-banned', status: 3 },
		[account('first-banned-user', 'first-banned', '203.0.113.42', NOW)],
		NOW
	)
], emptyBaseline(), NOW + 3000, { autoBaselineBanned: false })
assert.strictEqual(unpersistedAutoBaselineFallback.results[0].autoBaselined, false)
assert.strictEqual(unpersistedAutoBaselineFallback.results[0].pendingReview, true, 'a failed baseline write must keep a banned first discovery visible as pending')
assert.strictEqual(unpersistedAutoBaselineFallback.baseline.records['first-banned'].pendingReview, true)

const bannedNewInviter = compareAndMergeBaseline([
	analyzeInviter(
		{ _id: 'new-banned-inviter', status: '3' },
		[account('new-banned-user', 'new-banned-inviter', '203.0.113.43', NOW)],
		NOW
	)
], firstBaselineMerge.baseline, NOW + 4000)
assert.strictEqual(bannedNewInviter.results[0].change.newInviter, true)
assert.strictEqual(bannedNewInviter.results[0].autoBaselined, true, 'a numeric-string banned status should be normalized')
assert.strictEqual(bannedNewInviter.results[0].pendingReview, false)
assert.strictEqual(bannedNewInviter.baseline.records['new-banned-inviter'].reviewedAt, NOW + 4000)

const initiallyActivePending = compareAndMergeBaseline([
	analyzeInviter(
		{ _id: 'later-banned', status: 0 },
		[account('later-banned-user', 'later-banned', '203.0.113.44', NOW)],
		NOW
	)
], emptyBaseline(), NOW + 5000)
const firstSeenAtBeforeBan = initiallyActivePending.baseline.records['later-banned'].firstSeenAt
const carriedFirstDiscoveryAfterBan = compareAndMergeBaseline([
	analyzeInviter(
		{ _id: 'later-banned', status: 3 },
		[account('later-banned-user', 'later-banned', '203.0.113.44', NOW)],
		NOW
	)
], initiallyActivePending.baseline, NOW + 6000)
assert.strictEqual(carriedFirstDiscoveryAfterBan.results[0].change.firstDiscovery, false)
assert.strictEqual(carriedFirstDiscoveryAfterBan.results[0].autoBaselined, true, 'a carried first-discovery alert should be accepted after the inviter is banned')
assert.strictEqual(carriedFirstDiscoveryAfterBan.results[0].pendingReview, false)
assert.strictEqual(carriedFirstDiscoveryAfterBan.baseline.records['later-banned'].firstSeenAt, firstSeenAtBeforeBan)
assert.strictEqual(carriedFirstDiscoveryAfterBan.baseline.records['later-banned'].lastSeenAt, NOW + 6000)

const reviewedKnownBaseline = JSON.parse(JSON.stringify(initiallyActivePending.baseline))
reviewedKnownBaseline.records['later-banned'].pendingReview = false
reviewedKnownBaseline.records['later-banned'].pendingChange = null
reviewedKnownBaseline.records['later-banned'].reviewedAt = NOW + 5000
const bannedKnownWithNewInvitee = compareAndMergeBaseline([
	analyzeInviter(
		{ _id: 'later-banned', status: 3 },
		[
			account('later-banned-user', 'later-banned', '203.0.113.44', NOW),
			account('post-ban-user', 'later-banned', '203.0.113.45', NOW)
		],
		NOW
	)
], reviewedKnownBaseline, NOW + 7000)
assert.strictEqual(bannedKnownWithNewInvitee.results[0].autoBaselined, false, 'post-baseline activity on a banned inviter must not be hidden')
assert.strictEqual(bannedKnownWithNewInvitee.results[0].pendingReview, true)
assert.deepStrictEqual(bannedKnownWithNewInvitee.results[0].pendingChange.newInviteeIds, ['post-ban-user'])

const missingStatusFirstDiscovery = compareAndMergeBaseline([
	analyzeInviter(
		{ _id: 'missing-status' },
		[account('missing-status-user', 'missing-status', '203.0.113.46', NOW)],
		NOW
	)
], emptyBaseline(), NOW + 8000)
assert.strictEqual(missingStatusFirstDiscovery.results[0].autoBaselined, false)
assert.strictEqual(missingStatusFirstDiscovery.results[0].pendingReview, true, 'unknown inviter status must never be auto-accepted')

function sameIpAcrossDays(count, inviterId) {
	const users = []
	for (let index = 0; index < count; index++) {
		users.push(account(
			`${inviterId}-account-${index}`,
			inviterId,
			'203.0.113.88',
			NOW - (10 + index) * 24 * 60 * 60 * 1000
		))
	}
	return users
}

const completeInitial = compareAndMergeBaseline([
	analyzeInviter({ _id: 'complete-inviter' }, sameIpAcrossDays(14, 'complete-inviter'), NOW)
], emptyBaseline(), NOW, { completeForInviter: true })
const completeShrink = compareAndMergeBaseline([
	analyzeInviter({ _id: 'complete-inviter' }, sameIpAcrossDays(5, 'complete-inviter'), NOW)
], completeInitial.baseline, NOW + 1000, { completeForInviter: true })
assert.strictEqual(completeShrink.results[0].riskLevel, 'normal')
assert.strictEqual(completeShrink.baseline.records['complete-inviter'].snapshot.inviteeIds.length, 5, 'a complete scan baseline must keep the current snapshot instead of growing forever')
const completeRegrowth = compareAndMergeBaseline([
	analyzeInviter({ _id: 'complete-inviter' }, sameIpAcrossDays(15, 'complete-inviter'), NOW)
], completeShrink.baseline, NOW + 2000, { completeForInviter: true })
assert.strictEqual(completeRegrowth.results[0].change.grownIpGroups[0].previousCount, 5, 'growth must compare with the last complete scan, not the historical maximum')
assert.strictEqual(completeRegrowth.results[0].change.riskUpgraded, true)
assert.strictEqual(completeRegrowth.results[0].change.reachedHigh, true)

console.log('violation invitation V2 scan utils: ok')

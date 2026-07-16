const assert = require('assert')
const {
	buildTimestampDisplay,
	haveSameDisplayedDate,
	normalizeIp,
	analyzeAccounts,
	analyzeInviterIpAccounts,
	chunkArray
} = require('./violation-invitation-v2.utils.js')

const localSameDayTimes = [
	new Date(2025, 2, 23, 18, 23, 51).getTime(),
	new Date(2025, 2, 23, 18, 23, 32).getTime(),
	new Date(2025, 2, 23, 23, 59, 59).getTime()
]
const sameDayDisplays = localSameDayTimes.map(buildTimestampDisplay)
assert.deepStrictEqual(sameDayDisplays[0], {
	valid: true,
	date: '2025-03-23',
	time: '18:23:51',
	text: '2025-03-23 18:23:51'
})
assert.strictEqual(haveSameDisplayedDate(sameDayDisplays), true)
assert.strictEqual(haveSameDisplayedDate([
	sameDayDisplays[0],
	sameDayDisplays[1],
	buildTimestampDisplay(new Date(2025, 2, 24, 0, 0, 0).getTime())
]), false, 'all three displayed dates must match; two matching dates are insufficient')
assert.strictEqual(haveSameDisplayedDate([
	sameDayDisplays[0],
	sameDayDisplays[1],
	buildTimestampDisplay(0)
]), false, 'missing or invalid times must never receive the same-day highlight')
assert.deepStrictEqual(buildTimestampDisplay(0), { valid: false, date: '无', time: '', text: '无' })

assert.strictEqual(normalizeIp(' 192.168.001.010 '), '192.168.1.10')
assert.strictEqual(normalizeIp('未知'), '')
assert.strictEqual(normalizeIp('999.1.1.1'), '')
assert.strictEqual(normalizeIp('2001:0db8:0:0:0:0:0:1'), '2001:db8::1')

const accounts = []
for (let index = 0; index < 15; index++) {
	accounts.push({
		_id: `user-${index}`,
		status: index === 0 ? '3' : (index === 1 ? 1 : 0),
		register_ip: index < 8 ? '1.2.3.4' : '',
		login_ip: index >= 8 ? '1.2.3.4' : ''
	})
}
accounts.push({
	_id: 'same-fields',
	status: 0,
	register_ip: '5.6.7.8',
	login_ip: '5.6.7.8'
})
accounts.push({
	_id: 'invalid-fields',
	status: 0,
	register_ip: '未知',
	login_ip: ''
})
const riskBoundaries = [
	{ count: 5, ip: '10.0.0.5', expectedRisk: 'normal' },
	{ count: 6, ip: '10.0.0.6', expectedRisk: 'medium' },
	{ count: 14, ip: '10.0.0.14', expectedRisk: 'medium' }
]
riskBoundaries.forEach(boundary => {
	for (let index = 0; index < boundary.count; index++) {
		accounts.push({
			_id: `boundary-${boundary.count}-${index}`,
			status: 0,
			register_ip: boundary.ip,
			login_ip: ''
		})
	}
})

const analysis = analyzeAccounts(accounts)
const highRiskGroup = analysis.groups.find(group => group.ip === '1.2.3.4')
const deduplicatedGroup = analysis.groups.find(group => group.ip === '5.6.7.8')

assert.strictEqual(highRiskGroup.count, 15)
assert.strictEqual(highRiskGroup.riskLevel, 'high')
assert.strictEqual(highRiskGroup.selectableIds.length, 13)
assert.strictEqual(highRiskGroup.selectableIds.includes('user-1'), false, 'unused status=1 accounts must not participate in batch bans')
assert.deepStrictEqual(highRiskGroup.bannedIds, ['user-0'])
assert.strictEqual(deduplicatedGroup.count, 1)
assert.strictEqual(analysis.accountRiskById['same-fields'], 'normal')
assert.strictEqual(analysis.accountRiskById['invalid-fields'], 'unknown')
assert.strictEqual(analysis.summary.unknownAccountCount, 1)
riskBoundaries.forEach(boundary => {
	assert.strictEqual(analysis.groups.find(group => group.ip === boundary.ip).riskLevel, boundary.expectedRisk)
})

const inviterIp = '203.0.113.15'
const inviterAndInvitees = analyzeInviterIpAccounts(
	{ _id: 'inviter', status: 0, register_ip: inviterIp, login_ip: inviterIp },
	Array.from({ length: 14 }, (_, index) => ({
		_id: `invitee-${index}`,
		status: index === 0 ? 3 : 0,
		register_ip: inviterIp,
		login_ip: ''
	}))
)
const inviterGroup = inviterAndInvitees.groups.find(group => group.ip === inviterIp)
assert.strictEqual(inviterGroup.count, 15, 'the inviter must participate in same-IP risk counts')
assert.strictEqual(inviterGroup.riskLevel, 'high')
assert.strictEqual(inviterGroup.includesInviter, true)
assert.strictEqual(inviterGroup.allIds.includes('inviter'), true)
assert.strictEqual(inviterGroup.selectableIds.includes('inviter'), false, 'the inviter must stay out of invitee batch-ban selections')
assert.strictEqual(inviterGroup.selectableIds.length, 13, 'already-banned invitees must also stay out of batch-ban selections')
assert.deepStrictEqual(inviterGroup.bannedIds, ['invitee-0'], 'only banned invitees may be preselected for batch unban')
assert.deepStrictEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])

console.log('violation invitation risk utils: ok')

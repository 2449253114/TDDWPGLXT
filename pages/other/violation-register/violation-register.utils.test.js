// 运行：node pages/other/violation-register/violation-register.utils.test.js
const assert = require('assert')
const {
	MIN_GROUP_SIZE,
	NORMAL_MAX,
	HIGH_RISK_MIN,
	RISK_FILTERS,
	buildRegisterIpGroups,
	summarizeGroups,
	filterGroups,
	countGroupInviters,
	paginate,
	getStatusText,
	getRiskText
} = require('./violation-register.utils.js')

const account = (id, ip, extra = {}) => ({
	_id: id,
	register_ip: ip,
	register_date: 1000,
	inviter_uid: '',
	status: 0,
	...extra
})

// 1. 无效 IP 不参与分组；IPv4 / IPv6 的不同写法归为同一组；单独 IP 的账号不保留
{
	const result = buildRegisterIpGroups([
		account('a1', ''),
		account('a2', '未知'),
		account('a3', 'unknown'),
		account('a4', null),
		account('a5', '999.1.1.1'),
		account('a6', 'not-an-ip'),
		account('b1', '1.2.3.4'),
		account('b2', ' 1.2.3.4 '),
		account('c1', '2001:DB8::1'),
		account('c2', '2001:db8:0:0:0:0:0:1'),
		account('d1', '8.8.8.8'),
		null,
		{ register_ip: '1.2.3.4' }
	])
	assert.strictEqual(result.invalidIpCount, 6, '空、未知与非法 IP 必须单独计数，不能被当成同一个 IP 分组')
	assert.strictEqual(result.scannedCount, 11, '缺少 _id 的记录不计入扫描数')
	assert.deepStrictEqual(result.groups.map(group => group.ip).sort(), ['1.2.3.4', '2001:db8::1'])
	assert(!result.accountIndex.has('d1'), '单独一个 IP 的账号不应保留在索引中')
	assert(!result.groups.some(group => group.ip === ''), '不能出现空 IP 分组')
}

// 2. 同一 _id 重复出现只计一次，以最后一次为准
{
	const result = buildRegisterIpGroups([
		account('x1', '5.5.5.5', { status: 0 }),
		account('x2', '5.5.5.5'),
		account('x1', '5.5.5.5', { status: 3 })
	])
	assert.strictEqual(result.groups[0].count, 2)
	assert.strictEqual(result.accountIndex.get('x1').status, 3)
}

// 3. 风险阈值边界与 v2 一致：2–5 低，6–14 中，≥15 高
{
	assert.strictEqual(MIN_GROUP_SIZE, 2)
	assert.strictEqual(NORMAL_MAX, 5)
	assert.strictEqual(HIGH_RISK_MIN, 15)
	const sizes = { '10.0.0.2': 2, '10.0.0.5': 5, '10.0.0.6': 6, '10.0.0.14': 14, '10.0.0.15': 15 }
	const accounts = []
	Object.keys(sizes).forEach(ip => {
		for (let index = 0; index < sizes[ip]; index++) accounts.push(account(`${ip}#${index}`, ip))
	})
	const riskByIp = {}
	buildRegisterIpGroups(accounts).groups.forEach(group => { riskByIp[group.ip] = group.riskLevel })
	assert.deepStrictEqual(riskByIp, {
		'10.0.0.2': 'normal',
		'10.0.0.5': 'normal',
		'10.0.0.6': 'medium',
		'10.0.0.14': 'medium',
		'10.0.0.15': 'high'
	})
}

// 4. 分组排序：风险 → 有邀请人优先 → 账号数 → IP
{
	const make = (ip, count, inviter) => Array.from({ length: count }, (_, index) =>
		account(`${ip}-${index}`, ip, { inviter_uid: inviter && index === 0 ? inviter : '' }))
	const result = buildRegisterIpGroups([
		...make('3.3.3.3', 3, ''),
		...make('3.3.3.4', 3, 'inv'),
		...make('4.4.4.4', 4, ''),
		...make('6.6.6.6', 6, ''),
		...make('15.15.15.15', 15, ''),
		...make('2.2.2.2', 3, '')
	])
	assert.deepStrictEqual(result.groups.map(group => group.ip), [
		'15.15.15.15',
		'6.6.6.6',
		'3.3.3.4',
		'4.4.4.4',
		'2.2.2.2',
		'3.3.3.3'
	])
}

// 5. 组内按注册时间倒序，时间相同按 _id 倒序，无效时间排最后；邀请人 id 统一为字符串
{
	const result = buildRegisterIpGroups([
		account('m1', '7.7.7.7', { register_date: 200, inviter_uid: 12345 }),
		account('m2', '7.7.7.7', { register_date: 300 }),
		account('m3', '7.7.7.7', { register_date: 200 }),
		account('m4', '7.7.7.7', { register_date: 'bad' }),
		account('m5', '7.7.7.7', { register_date: 300, inviter_uid: 'inv-a' })
	])
	const group = result.groups[0]
	assert.deepStrictEqual(group.ids, ['m5', 'm2', 'm3', 'm1', 'm4'])
	assert.deepStrictEqual(group.inviterIds, ['12345', 'inv-a'])
	assert.strictEqual(group.noInviterCount, 3)
	assert.strictEqual(group.hasInviter, true)
	assert.strictEqual(result.accountIndex.get('m1').inviterId, '12345')
}

// 6. 统计：同一邀请人出现在多个中高风险分组只算一次；低风险组的邀请人不计入
{
	const groups = [
		{ ip: 'a', count: 15, riskLevel: 'high', inviterIds: ['i1', 'i2'] },
		{ ip: 'b', count: 6, riskLevel: 'medium', inviterIds: ['i1', 'i3'] },
		{ ip: 'c', count: 2, riskLevel: 'normal', inviterIds: ['i4'] }
	]
	assert.deepStrictEqual(summarizeGroups(groups), {
		groupCount: 3,
		accountCount: 23,
		high: { groupCount: 1, accountCount: 15 },
		medium: { groupCount: 1, accountCount: 6 },
		normal: { groupCount: 1, accountCount: 2 },
		mediumHighInviterCount: 3
	})
	assert.deepStrictEqual(summarizeGroups([]).groupCount, 0)
}

// 7. 筛选项逐项覆盖；新增筛选项未补测试时这里直接失败
{
	const groups = ['high', 'medium', 'normal'].map(riskLevel => ({ ip: riskLevel, riskLevel }))
	const expected = {
		mediumHigh: ['high', 'medium'],
		high: ['high'],
		all: ['high', 'medium', 'normal']
	}
	assert.deepStrictEqual(Object.keys(RISK_FILTERS).sort(), Object.keys(expected).sort())
	Object.keys(expected).forEach(filter => {
		assert.deepStrictEqual(filterGroups(groups, filter).map(group => group.ip), expected[filter], filter)
	})
	assert.throws(() => filterGroups(groups, 'unknown'), /未知的风险筛选/)
}

// 8. 组内邀请人统计：数量倒序，标记邀请人本人也在本组
{
	const { groups, accountIndex } = buildRegisterIpGroups([
		account('owner', '9.9.9.9'),
		account('u1', '9.9.9.9', { inviter_uid: 'owner' }),
		account('u2', '9.9.9.9', { inviter_uid: 'owner' }),
		account('u3', '9.9.9.9', { inviter_uid: 'outsider' }),
		account('u4', '9.9.9.9', { inviter_uid: 'another' })
	])
	assert.deepStrictEqual(countGroupInviters(groups[0].ids, accountIndex), [
		{ inviterId: 'owner', count: 2, inGroup: true },
		{ inviterId: 'another', count: 1, inGroup: false },
		{ inviterId: 'outsider', count: 1, inGroup: false }
	])
}

// 8.1 inviter_uid 等于自身 _id 的异常数据：不算作自己的邀请人，按无邀请人统计
{
	const { groups, accountIndex } = buildRegisterIpGroups([
		account('self', '8.8.4.4', { inviter_uid: 'self' }),
		account('peer', '8.8.4.4')
	])
	assert.strictEqual(accountIndex.get('self').selfInvited, true)
	assert.strictEqual(accountIndex.get('self').inviterId, '')
	assert.strictEqual(accountIndex.get('peer').selfInvited, false)
	assert.strictEqual(groups[0].hasInviter, false)
	assert.strictEqual(groups[0].noInviterCount, 2)
	assert.deepStrictEqual(countGroupInviters(groups[0].ids, accountIndex), [])
}

// 9. 分页页码越界时夹到合法范围
{
	const items = Array.from({ length: 45 }, (_, index) => index)
	assert.deepStrictEqual(paginate(items, 1, 20), items.slice(0, 20))
	assert.deepStrictEqual(paginate(items, 3, 20), items.slice(40))
	assert.deepStrictEqual(paginate(items, 9, 20), items.slice(40), '页码过大时返回最后一页')
	assert.deepStrictEqual(paginate(items, 0, 20), items.slice(0, 20))
	assert.deepStrictEqual(paginate([], 2, 20), [])
}

// 10. 状态与风险文本覆盖全部取值
{
	assert.deepStrictEqual([0, 1, 2, 3].map(getStatusText), ['正常', '禁止购买会员', '审核中', '已封禁'])
	assert.strictEqual(getStatusText(undefined), '状态未知')
	assert.strictEqual(getStatusText(NaN), '状态未知')
	assert.deepStrictEqual(['high', 'medium', 'normal'].map(getRiskText), ['高风险', '中风险', '低风险'])
}

console.log('violation-register.utils tests passed')

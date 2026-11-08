// 运行：node pages/other/zombie-accounts/zombie-accounts.utils.test.js
const assert = require('assert')
const {
	DEFAULT_START_DATE,
	ZOMBIE_CATEGORIES,
	PROTECT_REASONS,
	HIT_FILTERS,
	subtractMonths,
	resolveZombieCriteria,
	evaluateActivity,
	isZombie,
	classifyZombies,
	summarizeZombies,
	filterHits,
	rankBeneficiaries,
	formatDuration,
	buildBanTag
} = require('./zombie-accounts.utils.js')
const { getBusinessDateStart } = require('../violation-invitation-v2/violation-invitation-v2.scan.js')

const DAY = 24 * 60 * 60 * 1000
const bj = (date, hours = 0) => getBusinessDateStart(date) + hours * 3600000
// 固定“当前时刻”：北京时间 2026-11-09 10:00
const NOW = bj('2026-11-09', 10)

// 1. 自然月倒推：月末夹到目标月最后一天，跨年正确
{
	assert.strictEqual(subtractMonths('2026-11-09', 3), '2026-08-09')
	assert.strictEqual(subtractMonths('2026-05-31', 3), '2026-02-28')
	assert.strictEqual(subtractMonths('2024-05-31', 3), '2024-02-29', '闰年取 2 月 29 日')
	assert.strictEqual(subtractMonths('2026-01-15', 1), '2025-12-15')
	assert.strictEqual(subtractMonths('2026-03-31', 13), '2025-02-28')
	assert.throws(() => subtractMonths('2026-02-30', 1), /不存在/)
}

// 2. 检测条件：默认起始 2022-01-01；“3 个月前”截止到 08-08 23:59:59；预筛上界 = 截止 + 间隔
{
	assert.strictEqual(DEFAULT_START_DATE, '2022-01-01')
	const criteria = resolveZombieCriteria({ startDate: '2022-01-01', endMode: 'months', months: '3', gapDays: '3', confirmedAt: NOW })
	assert.strictEqual(criteria.startMs, bj('2022-01-01'))
	assert.strictEqual(criteria.endExclusiveMs, bj('2026-08-09'))
	assert.strictEqual(criteria.endDate, '2026-08-08')
	assert.strictEqual(criteria.gapMs, 3 * DAY)
	assert.strictEqual(criteria.activeBoundMs, bj('2026-08-09') + 3 * DAY)

	const manual = resolveZombieCriteria({ startDate: '2025-01-01', endMode: 'manual', endDate: '2025-06-30', gapDays: 10, confirmedAt: NOW })
	assert.strictEqual(manual.endExclusiveMs, bj('2025-07-01'), '手动截止日期包含当天')
	assert.strictEqual(manual.endDate, '2025-06-30')
}

// 3. 非法条件逐项报错，不静默得到错误范围
{
	const base = { startDate: '2022-01-01', endMode: 'months', months: 3, gapDays: 3, confirmedAt: NOW }
	const cases = [
		[{ startDate: '' }, /请选择注册起始日期/],
		[{ startDate: '2022-13-01' }, /不存在/],
		[{ months: '' }, /截止月数必须是正整数/],
		[{ months: '0' }, /截止月数必须在 1 到 120 之间/],
		[{ months: '2.5' }, /截止月数必须是正整数/],
		[{ gapDays: '0' }, /活跃间隔天数必须在 1 到 365 之间/],
		[{ endMode: 'manual', endDate: '' }, /请选择注册截止日期/],
		[{ endMode: 'manual', endDate: '2021-12-31' }, /必须晚于起始日期/],
		[{ endMode: 'unknown' }, /截止方式无效/],
		[{ endMode: 'manual', endDate: '2026-11-08' }, /观察期/],
		[{ months: 1, gapDays: 40 }, /观察期/]
	]
	cases.forEach(([patch, pattern]) => {
		assert.throws(() => resolveZombieCriteria({ ...base, ...patch }), pattern, JSON.stringify(patch))
	})
}

// 4. 活跃判定：最后活跃取登录与在线的较晚者；边界“等于间隔”命中；注册时间缺失不命中
{
	const criteria = resolveZombieCriteria({ startDate: '2022-01-01', endMode: 'months', months: 3, gapDays: 3, confirmedAt: NOW })
	const reg = bj('2025-01-01', 1)
	const account = extra => ({ register_date: reg, login_date: reg, ...extra })
	assert.strictEqual(isZombie(account({}), criteria), true, '注册后再无活动')
	assert.strictEqual(isZombie(account({ login_date: reg + 3 * DAY }), criteria), true, '恰好等于间隔也命中')
	assert.strictEqual(isZombie(account({ login_date: reg + 3 * DAY + 1 }), criteria), false)
	assert.strictEqual(isZombie(account({ last_online_time: reg + 30 * DAY }), criteria), false, '只看 login_date 会误判：在线时间更晚说明仍在使用')
	assert.strictEqual(isZombie(account({ login_date: reg - 1000 }), criteria), true, '登录早于注册的脏数据按 0 间隔处理')
	assert.strictEqual(isZombie(account({ register_date: 0 }), criteria), false)
	assert.strictEqual(isZombie(account({ register_date: bj('2026-08-09') }), criteria), false, '截止日当天不在范围内')
	assert.strictEqual(isZombie(account({ register_date: bj('2021-12-31', 23) }), criteria), false)
	assert.deepStrictEqual(evaluateActivity({ register_date: reg, login_date: reg + 5, last_online_time: reg + 9 }), {
		registerDate: reg, loginDate: reg + 5, onlineDate: reg + 9, lastActiveAt: reg + 9, activeGapMs: 9
	})
}

// 5. 分类与受保护：付费 > 会员未过期 > 内部用户；本身是邀请人优先于受邀；自邀按无邀请人；重复 id 只算一次
{
	const criteria = resolveZombieCriteria({ startDate: '2022-01-01', endMode: 'months', months: 3, gapDays: 3, confirmedAt: NOW })
	const reg = bj('2025-03-01')
	const make = (id, extra = {}) => ({ _id: id, register_date: reg, login_date: reg, status: 0, inviter_uid: '', vip_expire_date: 0, ...extra })
	const { hits, candidateCount } = classifyZombies([
		make('paid', { vip_expire_date: NOW + DAY }),
		make('vip', { vip_expire_date: NOW + DAY }),
		make('internal', { is_internal_user: true }),
		make('inviter', { inviter_uid: 'someone' }),
		make('invitee', { inviter_uid: 'boss', last_online_time: reg + DAY }),
		make('self', { inviter_uid: 'self' }),
		make('plain'),
		make('active', { last_online_time: NOW - DAY }),
		make('plain'),
		null
	], criteria, { paidUserIds: new Set(['paid']), inviterIds: new Set(['inviter']), now: NOW })
	assert.strictEqual(candidateCount, 8)
	const byId = Object.fromEntries(hits.map(hit => [hit.id, hit]))
	assert(!byId.active, '仍活跃的账号不命中')
	assert.deepStrictEqual(Object.keys(byId).sort(), ['internal', 'invitee', 'inviter', 'paid', 'plain', 'self', 'vip'])
	assert.strictEqual(byId.paid.protectReason, 'paid', '付费优先于会员未过期')
	assert.strictEqual(byId.vip.protectReason, 'vip')
	assert.strictEqual(byId.internal.protectReason, 'internal')
	assert.strictEqual(byId.inviter.category, 'inviter', '本身是邀请人优先于受邀小号')
	assert.strictEqual(byId.invitee.category, 'invitee')
	assert.strictEqual(byId.invitee.hasOnlineField, true)
	assert.strictEqual(byId.plain.hasOnlineField, false)
	assert.strictEqual(byId.self.category, 'none')
	assert.strictEqual(byId.self.selfInvited, true)
	assert.strictEqual(byId.self.inviterId, '')

	assert.deepStrictEqual(summarizeZombies(hits), {
		total: 7,
		protected: { paid: 1, vip: 1, internal: 1, total: 3 },
		actionable: { inviter: 1, invitee: 1, none: 2, total: 4 }
	})
}

// 6. 筛选项逐项覆盖；新增筛选项未补测试时直接失败
{
	const hits = [
		{ id: 'a', category: 'invitee', protectReason: '' },
		{ id: 'b', category: 'inviter', protectReason: '' },
		{ id: 'c', category: 'none', protectReason: '' },
		{ id: 'd', category: 'none', protectReason: 'paid' }
	]
	const expected = { actionable: ['a', 'b', 'c'], invitee: ['a'], inviter: ['b'], none: ['c'], protected: ['d'] }
	assert.deepStrictEqual(Object.keys(HIT_FILTERS).sort(), Object.keys(expected).sort())
	Object.keys(expected).forEach(filter => {
		assert.deepStrictEqual(filterHits(hits, filter).map(hit => hit.id), expected[filter], filter)
	})
	assert.throws(() => filterHits(hits, 'x'), /未知的结果筛选/)
	assert.deepStrictEqual(Object.keys(ZOMBIE_CATEGORIES).sort(), ['invitee', 'inviter', 'none'])
	assert.deepStrictEqual(Object.keys(PROTECT_REASONS).sort(), ['internal', 'paid', 'vip'])
}

// 7. 受益邀请人排行：只统计可处置的命中账号，数量倒序
{
	const ranked = rankBeneficiaries([
		{ inviterId: 'b', protectReason: '' },
		{ inviterId: 'a', protectReason: '' },
		{ inviterId: 'b', protectReason: '' },
		{ inviterId: 'c', protectReason: 'paid' },
		{ inviterId: '', protectReason: '' }
	])
	assert.deepStrictEqual(ranked, [{ inviterId: 'b', count: 2 }, { inviterId: 'a', count: 1 }])
}

// 8. 时长显示与批次标记
{
	assert.strictEqual(formatDuration(0), '0 分钟')
	assert.strictEqual(formatDuration(45 * 60000), '45 分钟')
	assert.strictEqual(formatDuration(5 * 3600000), '5.0 小时')
	assert.strictEqual(formatDuration(2.5 * DAY), '2.5 天')
	const criteria = resolveZombieCriteria({ startDate: '2022-01-01', endMode: 'months', months: 3, gapDays: 3, confirmedAt: NOW })
	assert.strictEqual(buildBanTag(criteria, '2026-11-09 10:00:00'), '僵尸号清理封禁 2026-11-09 10:00:00：注册 2022-01-01~2026-08-08，最后活跃距注册≤3天')
}

console.log('zombie-accounts.utils tests passed')

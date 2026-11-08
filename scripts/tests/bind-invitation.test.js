/**
 * 绑定邀请码（app-user-auth 的 bind-invitation）行为测试，本地 Node 直接运行，不连接数据库：
 *   node scripts/tests/bind-invitation.test.js
 *
 * 用内存假库模拟本接口用到的 uniCloud.database() 子集：where / doc / get / count / update / add 与 command.neq。
 * 与 uniCloud 一致，字段比较不区分字符串 id 与 ObjectId（统一按字符串比较）。
 */
'use strict'

const assert = require('assert')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const BIND_PATH = path.join(PROJECT_ROOT, 'uniCloud-aliyun/cloudfunctions/app-user-auth/module/user/invitation/bind-Invitation.js')

const DAY = 24 * 60 * 60 * 1000
const USERS = 'user-accounts'
const VIP_CHANGES = 'user-vip-changes'
const ORDERS = 'user-payment-orders'
const NOTICES = 'system-app-notice'

/** 模拟扩展库读出的 ObjectId：不是字符串，但 String() 后是 24 位 hex。 */
class FakeObjectId {
	constructor(hex) { this.hex = hex }
	toString() { return this.hex }
}

function createFakeDb() {
	const state = { store: {}, idSeq: 0 }

	function matches(doc, filter) {
		return Object.entries(filter).every(([field, condition]) => {
			if (condition && typeof condition === 'object' && '$ne' in condition) return String(doc[field]) !== String(condition.$ne)
			return field in doc && String(doc[field]) === String(condition)
		})
	}

	class Query {
		constructor(name, filter = {}) {
			this.name = name
			this.filter = filter
		}
		rows() {
			const rows = state.store[this.name]
			if (!rows) throw new Error(`collection ${this.name} not found`)
			return rows.filter((doc) => matches(doc, this.filter))
		}
		where(filter) { return new Query(this.name, filter) }
		doc(id) { return new Query(this.name, { _id: id }) }
		async get() { return { data: this.rows().map((doc) => ({ ...doc })) } }
		async count() { return { total: this.rows().length } }
		async update(data) {
			const rows = this.rows()
			for (const doc of rows) Object.assign(doc, data)
			return { updated: rows.length }
		}
		async add(doc) {
			const _id = 'auto' + String(++state.idSeq).padStart(20, '0')
			state.store[this.name].push({ _id, ...doc })
			return { id: _id }
		}
	}

	return {
		state,
		reset(users) {
			state.store = { [USERS]: users, [VIP_CHANGES]: [], [ORDERS]: [], [NOTICES]: [] }
			state.idSeq = 0
		},
		database() {
			return {
				collection: (name) => new Query(name),
				command: { neq: (value) => ({ $ne: value }) }
			}
		}
	}
}

const fake = createFakeDb()
global.uniCloud = { database: () => fake.database() }
const bindInvitation = require(BIND_PATH)

/** 以 URL 化调用的方式执行接口：请求体为 JSON 字符串。 */
function bind(inviteCode, userId) {
	const context = { getHttpInfo: () => ({ body: JSON.stringify({ inviteCode, userId }), isBase64Encoded: false }) }
	return bindInvitation.call(context)
}

// VIP 都设为未过期，延长天数直接累加在原到期时间上，便于精确断言
const BASE_EXPIRE = Date.now() + 100 * DAY

function user(id, code, extra = {}) {
	return { _id: id, my_invite_code: code, inviter_uid: '', invite_time: 0, vip: true, vip_expire_date: BASE_EXPIRE, ...extra }
}
/** 生成 count 个已绑定到 inviterId 的受邀账号。 */
function invitees(inviterId, count) {
	return Array.from({ length: count }, (_, i) => user(`invitee${String(i).padStart(3, '0')}`, `I${String(i).padStart(5, '0')}`, { inviter_uid: inviterId, invite_time: 1 }))
}
const findUser = (id) => fake.state.store[USERS].find((doc) => String(doc._id) === String(id))
const extraDays = (id) => (findUser(id).vip_expire_date - BASE_EXPIRE) / DAY
const recordsOf = (collection, id) => fake.state.store[collection].filter((doc) => String(doc.user_id) === String(id))
const permanentRecords = (id) => recordsOf(VIP_CHANGES, id).filter((doc) => doc.comment === '邀请赠送永久VIP')

/** 断言请求被拒绝，且数据库没有任何变化。 */
async function assertRejectedWithoutWrites(promise, messagePattern) {
	const before = JSON.stringify(fake.state.store)
	const res = await promise
	assert.strictEqual(res.code, 404, JSON.stringify(res))
	assert.match(res.message, messagePattern)
	assert.strictEqual(JSON.stringify(fake.state.store), before, '被拒绝的请求不应写入任何数据')
}

const tests = []
const test = (name, fn) => tests.push({ name, fn })

test('自邀：填写自己的邀请码被拒绝，不改账号、不发奖励、不写订单和通知', async () => {
	fake.reset([user('u_self', 'SELF01'), user('u_other', 'OTHER1')])
	await assertRejectedWithoutWrites(bind('SELF01', 'u_self'), /不能绑定自己的邀请码/)
})

test('自邀：_id 读出为 ObjectId、userId 为字符串时同样被拒绝', async () => {
	const hex = '67a2f3f6b9fb2371a7255ed3'
	fake.reset([user(new FakeObjectId(hex), 'SELF02')])
	await assertRejectedWithoutWrites(bind('SELF02', hex), /不能绑定自己的邀请码/)
})

test('互相邀请：对方的邀请人是当前用户时拒绝（字符串与 ObjectId 两种存储）', async () => {
	fake.reset([user('u_a', 'AAAAAA'), user('u_b', 'BBBBBB', { inviter_uid: 'u_a', invite_time: 1 })])
	await assertRejectedWithoutWrites(bind('BBBBBB', 'u_a'), /不能互相绑定/)

	fake.reset([user('u_a', 'AAAAAA'), user('u_b', 'BBBBBB', { inviter_uid: new FakeObjectId('u_a'), invite_time: 1 })])
	await assertRejectedWithoutWrites(bind('BBBBBB', 'u_a'), /不能互相绑定/)
})

test('正常绑定：双方各加 3 天并写会员记录、订单与通知', async () => {
	// 邀请人自己也有邀请人（第三方），不应被互相邀请规则误拦
	fake.reset([user('u_new', 'NEW001'), user('u_inviter', 'INV001', { inviter_uid: 'u_third', invite_time: 1 }), user('u_third', 'THIRD1')])
	const res = await bind('INV001', 'u_new')
	assert.strictEqual(res.code, 200, JSON.stringify(res))
	assert.strictEqual(String(findUser('u_new').inviter_uid), 'u_inviter')
	assert.ok(findUser('u_new').invite_time > 0)
	assert.strictEqual(extraDays('u_new'), 3)
	assert.strictEqual(extraDays('u_inviter'), 3)
	assert.deepStrictEqual(recordsOf(VIP_CHANGES, 'u_inviter').map((doc) => doc.comment), ['邀请赠送VIP'])
	assert.deepStrictEqual(recordsOf(VIP_CHANGES, 'u_new').map((doc) => doc.comment), ['受邀赠送VIP'])
	assert.deepStrictEqual(recordsOf(ORDERS, 'u_inviter').map((doc) => doc.body), ['邀请赠送VIP（3天）'])
	assert.deepStrictEqual(recordsOf(ORDERS, 'u_new').map((doc) => doc.body), ['受邀赠送VIP（3天）'])
	assert.deepStrictEqual(recordsOf(NOTICES, 'u_inviter').map((doc) => doc.title), ['邀请成功通知'])
	assert.deepStrictEqual(recordsOf(NOTICES, 'u_new').map((doc) => doc.title), ['激活邀请码通知'])
	assert.strictEqual(findUser('u_third').vip_expire_date, BASE_EXPIRE, '第三方账号不应受影响')
})

test('已有邀请人时拒绝重复绑定', async () => {
	fake.reset([user('u_new', 'NEW001', { inviter_uid: 'u_old', invite_time: 1 }), user('u_old', 'OLD001'), user('u_inviter', 'INV001')])
	await assertRejectedWithoutWrites(bind('INV001', 'u_new'), /已存在邀请关系/)
})

test('邀请码不存在时拒绝', async () => {
	fake.reset([user('u_new', 'NEW001')])
	await assertRejectedWithoutWrites(bind('NOPE00', 'u_new'), /邀请码不存在/)
})

test('50 人：首次达到 50 人时送 9999 天并标记已领取', async () => {
	fake.reset([user('u_inviter', 'INV001'), user('u_new', 'NEW001'), ...invitees('u_inviter', 49)])
	const res = await bind('INV001', 'u_new')
	assert.strictEqual(res.code, 200, JSON.stringify(res))
	assert.strictEqual(findUser('u_inviter').invite_permanent_vip_granted, true)
	assert.strictEqual(extraDays('u_inviter'), 3 + 9999)
	assert.deepStrictEqual(permanentRecords('u_inviter').map((doc) => doc.time_limit_day), [9999])
	assert.deepStrictEqual(recordsOf(NOTICES, 'u_inviter').map((doc) => doc.title), ['邀请成功通知', '永久VIP会员奖励'])
})

test('50 人：已领取过的账号再次达到 50 人只加普通 3 天，不再送 9999 天', async () => {
	fake.reset([user('u_inviter', 'INV001', { invite_permanent_vip_granted: true }), user('u_new', 'NEW001'), ...invitees('u_inviter', 49)])
	const res = await bind('INV001', 'u_new')
	assert.strictEqual(res.code, 200, JSON.stringify(res))
	assert.strictEqual(extraDays('u_inviter'), 3)
	assert.strictEqual(extraDays('u_new'), 3)
	assert.deepStrictEqual(permanentRecords('u_inviter'), [])
	assert.deepStrictEqual(recordsOf(NOTICES, 'u_inviter').map((doc) => doc.title), ['邀请成功通知'])
})

test('50 人：领取后删除一个受邀号、人数回落再补回 50，不重复发放', async () => {
	fake.reset([user('u_inviter', 'INV001'), user('u_new1', 'NEW001'), user('u_new2', 'NEW002'), ...invitees('u_inviter', 49)])
	assert.strictEqual((await bind('INV001', 'u_new1')).code, 200)
	assert.strictEqual(extraDays('u_inviter'), 3 + 9999)

	// 模拟僵尸清理硬删除一个受邀账号，人数回落到 49
	fake.state.store[USERS] = fake.state.store[USERS].filter((doc) => doc._id !== 'invitee000')
	assert.strictEqual((await bind('INV001', 'u_new2')).code, 200)
	assert.strictEqual(extraDays('u_inviter'), 3 + 9999 + 3)
	assert.deepStrictEqual(permanentRecords('u_inviter').map((doc) => doc.time_limit_day), [9999])
})

test('50 人：超过 50 人后每多一人仍加 365 天（保持现状）', async () => {
	for (const granted of [true, undefined]) {
		const extra = granted === undefined ? {} : { invite_permanent_vip_granted: granted }
		fake.reset([user('u_inviter', 'INV001', extra), user('u_new', 'NEW001'), ...invitees('u_inviter', 50)])
		const res = await bind('INV001', 'u_new')
		assert.strictEqual(res.code, 200, JSON.stringify(res))
		assert.strictEqual(extraDays('u_inviter'), 3 + 365, `granted=${granted}`)
		assert.deepStrictEqual(permanentRecords('u_inviter').map((doc) => doc.time_limit_day), [365])
	}
})

;(async () => {
	let failed = 0
	for (const { name, fn } of tests) {
		try {
			await fn()
			console.log(`ok   ${name}`)
		} catch (error) {
			failed++
			console.log(`FAIL ${name}\n     ${error && error.stack ? error.stack.split('\n').slice(0, 3).join('\n     ') : error}`)
		}
	}
	console.log(`\n${tests.length - failed}/${tests.length} 通过`)
	process.exit(failed ? 1 : 0)
})()

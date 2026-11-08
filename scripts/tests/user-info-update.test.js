/**
 * 用户信息接口（app-user-auth 的 info 与 update）行为测试，本地 Node 直接运行，不连接数据库：
 *   node scripts/tests/user-info-update.test.js
 *
 * 用内存假库模拟这两个接口用到的 uniCloud.database() 子集：where / get / updateAndReturn。
 * 重点验证：返回给客户端的 device_oaid 一律打码；update 只能改资料字段，不能改会员、邀请、封禁相关字段；
 * info 不能再按邀请码查询他人资料。
 */
'use strict'

const assert = require('assert')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const MODULE_DIR = path.join(PROJECT_ROOT, 'uniCloud-aliyun/cloudfunctions/app-user-auth/module/user')
const USERS = 'user-accounts'

function createFakeDb() {
	const state = { store: {} }

	class Query {
		constructor(name, filter = {}) {
			this.name = name
			this.filter = filter
		}
		rows() {
			return state.store[this.name].filter((doc) => Object.entries(this.filter).every(([field, value]) => doc[field] === value))
		}
		where(filter) { return new Query(this.name, filter) }
		async get() { return { data: this.rows().map((doc) => ({ ...doc })) } }
		async updateAndReturn(data) {
			const doc = this.rows()[0]
			if (!doc) return { updated: 0, doc: null }
			Object.assign(doc, data)
			return { updated: 1, doc: { ...doc } }
		}
	}

	return {
		state,
		reset(users) { state.store = { [USERS]: users } },
		database() {
			return { collection: (name) => new Query(name), command: {} }
		}
	}
}

const fake = createFakeDb()
global.uniCloud = { database: () => fake.database() }
const getUserInfo = require(path.join(MODULE_DIR, 'get-user-info.js'))
const updateUserInfo = require(path.join(MODULE_DIR, 'update-user-info.js'))

/** 以 URL 化调用的方式执行接口：请求体为 JSON 字符串。 */
function call(fn, params) {
	const context = { getHttpInfo: () => ({ body: JSON.stringify(params), isBase64Encoded: false }) }
	return fn.call(context)
}

const OAID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const MASKED = '012****cdef'

function user(id, extra = {}) {
	return {
		_id: id, device_oaid: OAID, my_invite_code: 'CODE01', inviter_uid: '', invite_time: 0,
		vip: false, vip_expire_date: 0, status: 0, nickname: '旧昵称', avatar: '', introduction: '', ...extra
	}
}
const findUser = (id) => fake.state.store[USERS].find((doc) => doc._id === id)

const tests = []
const test = (name, fn) => tests.push({ name, fn })

test('info：按 _id 返回本人信息，device_oaid 打码，其余字段原样返回并刷新在线时间', async () => {
	fake.reset([user('u1', { vip: true, vip_expire_date: Date.now() - 1000, inviter_uid: 'u0' })])
	const res = await call(getUserInfo, { _id: 'u1' })
	assert.strictEqual(res.code, 200, JSON.stringify(res))
	assert.strictEqual(res.data.device_oaid, MASKED)
	assert.strictEqual(res.data._id, 'u1')
	assert.strictEqual(res.data.my_invite_code, 'CODE01')
	assert.strictEqual(res.data.inviter_uid, 'u0')
	assert.strictEqual(res.data.vip, false, '已过期的 VIP 应被刷新为 false（checkVipStatus 原有行为）')
	assert.ok(res.data.last_online_time > 0)
	assert.strictEqual(findUser('u1').device_oaid, OAID, '打码只影响返回值，不能改库里的值')
})

test('info：只传邀请码不再返回他人资料，也不写库', async () => {
	fake.reset([user('u1')])
	const before = JSON.stringify(fake.state.store)
	const res = await call(getUserInfo, { my_invite_code: 'CODE01' })
	assert.strictEqual(res.code, 1005, JSON.stringify(res))
	assert.strictEqual(res.data, null)
	assert.strictEqual(JSON.stringify(fake.state.store), before)
})

test('info：_id 缺失或不是字符串时拒绝且不写库', async () => {
	fake.reset([user('u1')])
	const before = JSON.stringify(fake.state.store)
	for (const params of [{}, { _id: { $ne: null } }, { _id: 123 }]) {
		const res = await call(getUserInfo, params)
		assert.strictEqual(res.code, 1005, JSON.stringify(params))
		assert.match(res.message, /缺少用户标识信息/)
	}
	assert.strictEqual(JSON.stringify(fake.state.store), before)
})

test('info：用户不存在时返回失败', async () => {
	fake.reset([user('u1')])
	const res = await call(getUserInfo, { _id: 'nobody' })
	assert.strictEqual(res.code, 1005)
	assert.match(res.message, /用户不存在/)
})

test('update：会员、邀请、封禁等字段不会被写入，资料字段正常更新，返回值打码', async () => {
	fake.reset([user('u1')])
	const res = await call(updateUserInfo, {
		_id: 'u1', nickname: '新昵称', vip: true, vip_expire_date: 9999999999999,
		inviter_uid: 'x', status: 3, my_invite_code: 'HACK01', device_oaid: 'other'
	})
	assert.strictEqual(res.code, 200, JSON.stringify(res))
	const stored = findUser('u1')
	assert.strictEqual(stored.nickname, '新昵称')
	assert.deepStrictEqual(
		{ vip: stored.vip, vip_expire_date: stored.vip_expire_date, inviter_uid: stored.inviter_uid, status: stored.status, my_invite_code: stored.my_invite_code, device_oaid: stored.device_oaid },
		{ vip: false, vip_expire_date: 0, inviter_uid: '', status: 0, my_invite_code: 'CODE01', device_oaid: OAID }
	)
	assert.strictEqual(res.data.device_oaid, MASKED)
})

test('update：只有不允许的字段时拒绝且不写库', async () => {
	fake.reset([user('u1')])
	const before = JSON.stringify(fake.state.store)
	const res = await call(updateUserInfo, { _id: 'u1', vip: true, vip_expire_date: 9999999999999 })
	assert.strictEqual(res.code, 1005, JSON.stringify(res))
	assert.match(res.message, /没有可更新的字段/)
	assert.strictEqual(JSON.stringify(fake.state.store), before)
})

test('update：资料字段不是字符串、缺少 _id、请求体无效时拒绝且不写库', async () => {
	fake.reset([user('u1')])
	const before = JSON.stringify(fake.state.store)
	for (const params of [{ _id: 'u1', nickname: { $set: 1 } }, { nickname: '新昵称' }, { _id: 123, nickname: 'x' }, null]) {
		const res = await call(updateUserInfo, params)
		assert.strictEqual(res.code, 1005, JSON.stringify(params))
	}
	const invalid = await updateUserInfo.call({ getHttpInfo: () => ({ body: '{bad json', isBase64Encoded: false }) })
	assert.strictEqual(invalid.code, 1005)
	assert.strictEqual(JSON.stringify(fake.state.store), before)
})

test('update：用户不存在时返回失败', async () => {
	fake.reset([user('u1')])
	const res = await call(updateUserInfo, { _id: 'nobody', nickname: 'x' })
	assert.strictEqual(res.code, 1005)
	assert.match(res.message, /用户不存在/)
})

test('打码：不超过 7 位的 device_oaid 只返回 ****，避免前后段重叠暴露全部内容', async () => {
	for (const [oaid, expected] of [['0', '****'], ['1234567', '****'], ['12345678', '123****5678']]) {
		fake.reset([user('u1', { device_oaid: oaid })])
		const res = await call(getUserInfo, { _id: 'u1' })
		assert.strictEqual(res.data.device_oaid, expected, oaid)
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

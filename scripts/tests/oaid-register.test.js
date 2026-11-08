/**
 * 一键登录注册接口（app-user-auth 的 oaid-login，即 verify-oaid-login-v2）中拦截伪造注册的行为测试，
 * 本地 Node 直接运行，不连接数据库：
 *   node scripts/tests/oaid-register.test.js
 *
 * 用内存假库模拟本接口用到的 uniCloud.database() 子集：where / field / limit / get / count / add / updateAndReturn 与 command.gte。
 * 验证：WithHim 与熊多多共存版不能新注册、同一 IP 24 小时内最多注册 10 个，已有账号登录不受影响，正常注册不受影响。
 */
'use strict'

const assert = require('assert')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const LOGIN_PATH = path.join(PROJECT_ROOT, 'uniCloud-aliyun/cloudfunctions/app-user-auth/module/login/verify-oaid-login-v2.js')

const HOUR = 60 * 60 * 1000
const USERS = 'user-accounts'
const CODES = 'user-invite-codes'
const NOTICES = 'system-app-notice'

function createFakeDb() {
	const state = { store: {}, idSeq: 0, log: [], hooks: {} }

	function matches(doc, filter) {
		return Object.entries(filter).every(([field, condition]) => {
			if (condition && typeof condition === 'object' && '$gte' in condition) return doc[field] >= condition.$gte
			return doc[field] === condition
		})
	}

	class Query {
		constructor(name, filter = {}, limit = 100) {
			this.name = name
			this.filter = filter
			this.limitCount = limit
		}
		rows(operation) {
			state.log.push(`${this.name}.${operation}`)
			if (state.hooks.beforeOperation) state.hooks.beforeOperation(this.name, operation)
			return state.store[this.name].filter((doc) => matches(doc, this.filter))
		}
		where(filter) { return new Query(this.name, filter, this.limitCount) }
		field() { return this }
		limit(count) { return new Query(this.name, this.filter, count) }
		async get() { return { data: this.rows('get').slice(0, this.limitCount).map((doc) => ({ ...doc })) } }
		async count() { return { total: this.rows('count').length } }
		async updateAndReturn(data) {
			const doc = this.rows('updateAndReturn')[0]
			if (!doc) return { updated: 0, doc: null }
			Object.assign(doc, data)
			return { updated: 1, doc: { ...doc } }
		}
		async add(doc) {
			state.log.push(`${this.name}.add`)
			const _id = 'auto' + String(++state.idSeq).padStart(20, '0')
			state.store[this.name].push({ _id, ...doc })
			return { id: _id }
		}
	}

	return {
		state,
		reset(users) {
			state.store = { [USERS]: users, [CODES]: [], [NOTICES]: [] }
			state.idSeq = 0
			state.log = []
			state.hooks = {}
		},
		database() {
			return { collection: (name) => new Query(name), command: { gte: (value) => ({ $gte: value }) } }
		}
	}
}

const fake = createFakeDb()
global.uniCloud = { database: () => fake.database() }
const oaidLogin = require(LOGIN_PATH)

const OAID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

/** 以 URL 化调用的方式执行接口。clientIP 传 null 模拟取不到客户端 IP（传 undefined 会被参数默认值覆盖）。 */
function login({ oaid = OAID, platform = '熊多多', clientIP = '1.2.3.4' } = {}) {
	const body = JSON.stringify({ device_oaid: oaid, app_platform: platform, app_package_name: 'tt.ubear.xyz', app_version: '1.0.6' })
	const context = {
		getClientInfo: () => ({ clientIP }),
		getHttpInfo: () => ({ body, isBase64Encoded: false })
	}
	return oaidLogin.call(context)
}
/** 生成 count 个指定 IP、指定时间注册的已有账号。 */
function registeredFrom(ip, count, registerDate) {
	return Array.from({ length: count }, (_, i) => ({
		_id: `${ip}-${i}`, device_oaid: `${ip}-oaid-${i}`, my_invite_code: `R${i}`, register_ip: ip, register_date: registerDate, status: 0
	}))
}

/** 断言注册被拒：返回统一的失败文案，且没有写入任何数据（不建账号、不占用邀请码、不发通知）。 */
async function assertRegisterRejected(promise) {
	const before = JSON.stringify(fake.state.store)
	const res = await promise
	assert.strictEqual(res.code, 404, JSON.stringify(res))
	assert.strictEqual(res.message, '注册失败，请稍后重试')
	assert.strictEqual(JSON.stringify(fake.state.store), before, '被拒绝的注册不应写入任何数据')
	assert.ok(!fake.state.log.some((op) => op.endsWith('.add')), '被拒绝的注册不应有任何写入')
}

const tests = []
const test = (name, fn) => tests.push({ name, fn })

test('正常注册：熊多多平台新设备注册成功，记录平台与注册 IP，并占用邀请码', async () => {
	fake.reset([])
	const res = await login()
	assert.strictEqual(res.code, 200, JSON.stringify(res))
	assert.strictEqual(res.message, '注册成功')
	const [created] = fake.state.store[USERS]
	assert.strictEqual(created.app_platform, '熊多多')
	assert.strictEqual(created.register_ip, '1.2.3.4')
	assert.deepStrictEqual(fake.state.store[CODES].map((doc) => doc.code), [created.my_invite_code])
	assert.strictEqual(res.data.device_oaid, '012****cdef', '返回的设备号应打码')
})

test('平台拦截：WithHim 与熊多多共存版不能新注册', async () => {
	for (const platform of ['WithHim', '熊多多共存版']) {
		fake.reset([])
		await assertRegisterRejected(login({ platform }))
	}
})

test('平台拦截只针对新注册：已有的 WithHim、共存版账号照常登录', async () => {
	for (const platform of ['WithHim', '熊多多共存版']) {
		fake.reset([{ _id: 'old', device_oaid: OAID, app_platform: platform, status: 0, vip: false, vip_expire_date: 0 }])
		const res = await login({ platform })
		assert.strictEqual(res.code, 200, `${platform} ${JSON.stringify(res)}`)
		assert.match(res.message, /登录成功/)
		assert.strictEqual(fake.state.store[USERS].length, 1, '登录不应新建账号')
	}
})

test('IP 限流：同一 IP 24 小时内已注册 10 个时拒绝，其他 IP 不受影响', async () => {
	fake.reset(registeredFrom('1.2.3.4', 10, Date.now() - HOUR))
	await assertRegisterRejected(login({ clientIP: '1.2.3.4' }))
	const other = await login({ clientIP: '5.6.7.8' })
	assert.strictEqual(other.code, 200, JSON.stringify(other))
})

test('IP 限流边界：24 小时内已有 9 个时第 10 个可以注册；超过 24 小时的注册不计入', async () => {
	fake.reset(registeredFrom('1.2.3.4', 9, Date.now() - HOUR))
	assert.strictEqual((await login()).code, 200, '第 10 个应能注册')

	fake.reset(registeredFrom('1.2.3.4', 10, Date.now() - 25 * HOUR))
	assert.strictEqual((await login()).code, 200, '25 小时前的注册不应计入')
})

test('IP 限流：取不到客户端 IP 时不做限流，照常注册', async () => {
	fake.reset([])
	const res = await login({ clientIP: null })
	assert.strictEqual(res.code, 200, JSON.stringify(res))
	assert.ok(!fake.state.log.includes(`${USERS}.count`), '没有 IP 时不应查询注册数')
})

test('IP 限流：统计注册数失败时拒绝注册，不写入任何数据', async () => {
	fake.reset([])
	fake.state.hooks.beforeOperation = (name, operation) => {
		if (name === USERS && operation === 'count') throw new Error('模拟数据库错误')
	}
	await assertRegisterRejected(login())
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

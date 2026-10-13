/**
 * 邀请码迁移与注册占用的行为测试（本地 Node 直接运行，不连接数据库）：
 *   node scripts/tests/invite-codes.test.js
 *
 * 用内存假库模拟本次代码用到的 uniCloud.database() 子集：where / field / limit / get / count / add 与 command.in。
 * user-invite-codes.code 按唯一索引处理：重复写入抛出与 MongoDB 相同语义的 E11000 错误。
 */
'use strict'

const assert = require('assert')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const MIGRATE_PATH = path.join(PROJECT_ROOT, 'uniCloud-aliyun/cloudfunctions/migrate-invite-codes/index.obj.js')
const FUN_PATH = path.join(PROJECT_ROOT, 'uniCloud-aliyun/cloudfunctions/app-user-auth/common/fun.js')

const UNIQUE_FIELDS = { 'user-invite-codes': 'code' }

function createFakeDb() {
	// log 记录每次数据库操作（集合.方法），用于断言没有访问不该访问的集合
	const state = { store: {}, idSeq: 0, hooks: {}, log: [] }

	function matches(doc, filter) {
		if (!filter) return true
		return Object.entries(filter).every(([field, condition]) => {
			const value = doc[field]
			if (condition && typeof condition === 'object' && '$in' in condition) return condition.$in.includes(value)
			return value === condition
		})
	}

	function project(doc, fields) {
		if (!fields) return { ...doc }
		const result = {}
		for (const key of Object.keys(fields)) if (fields[key] && key in doc) result[key] = doc[key]
		return result
	}

	class Query {
		constructor(name, options = {}) {
			this.name = name
			this.options = { filter: null, fields: null, limit: 100, ...options }
		}
		where(filter) { return new Query(this.name, { ...this.options, filter }) }
		field(fields) { return new Query(this.name, { ...this.options, fields }) }
		limit(limit) { return new Query(this.name, { ...this.options, limit }) }
		rows(operation) {
			state.log.push(`${this.name}.${operation}`)
			const rows = state.store[this.name]
			if (!rows) throw new Error(`collection ${this.name} not found`)
			return rows.filter((doc) => matches(doc, this.options.filter))
		}
		async get() {
			return { data: this.rows('get').slice(0, Math.min(this.options.limit, 1000)).map((doc) => project(doc, this.options.fields)) }
		}
		async count() { return { total: this.rows('count').length } }
		async add(input) {
			state.log.push(`${this.name}.add`)
			if (state.hooks.beforeAdd) state.hooks.beforeAdd(this.name, input)
			const rows = state.store[this.name]
			if (!rows) throw new Error(`collection ${this.name} not found`)
			const docs = Array.isArray(input) ? input : [input]
			const uniqueField = UNIQUE_FIELDS[this.name]
			const ids = []
			for (const doc of docs) {
				if (uniqueField && rows.some((row) => row[uniqueField] === doc[uniqueField])) {
					const error = new Error(`E11000 duplicate key error dup key: { ${uniqueField}: "${doc[uniqueField]}" }`)
					error.code = 11000
					throw error
				}
				const _id = String(++state.idSeq).padStart(24, '0')
				if (!(state.hooks.dropWrites && state.hooks.dropWrites(this.name))) rows.push({ _id, ...doc })
				ids.push(_id)
			}
			return Array.isArray(input) ? { ids } : { id: ids[0] }
		}
	}

	return {
		state,
		reset(data) {
			state.store = JSON.parse(JSON.stringify(data))
			state.idSeq = 1000
			state.hooks = {}
			state.log = []
		},
		database() {
			return {
				collection: (name) => new Query(name),
				command: { in: (values) => ({ $in: values }) }
			}
		}
	}
}

const fake = createFakeDb()
global.uniCloud = { database: () => fake.database() }
const migrateObject = require(MIGRATE_PATH)
const { reserveInviteCode } = require(FUN_PATH)

const MIGRATE = { dryRun: false, confirm: 'YES_MIGRATE' }

function userDocs(codes) {
	return codes.map((code, index) => ({ _id: String(index + 1).padStart(24, '0'), my_invite_code: code }))
}
function legacyCodes(count) {
	return Array.from({ length: count }, (_, i) => 'L' + String(i).padStart(5, '0'))
}
function legacyData(codes, existingTarget = []) {
	return { 'user-all-Invitation-codes': [{ _id: 'legacy1', codes }], 'user-accounts': [], 'user-invite-codes': existingTarget }
}
function targetCodes() {
	return fake.state.store['user-invite-codes'].map((doc) => doc.code)
}
/** 从 dry-run 返回值读取云对象实际使用的批大小，测试不依赖具体常量；同时校验不超过 uniCloud 单次查询上限 1000。 */
async function getBatchSize() {
	fake.reset(legacyData([]))
	const { batchSize } = await migrateObject.run()
	assert.ok(Number.isInteger(batchSize) && batchSize > 0 && batchSize <= 1000, `批大小异常：${batchSize}`)
	return batchSize
}
function assertNoDuplicateCodes() {
	const codes = targetCodes()
	assert.strictEqual(new Set(codes).size, codes.length, '新表出现重复邀请码')
}

const tests = []
const test = (name, fn) => tests.push({ name, fn })

const BASE_DATA = {
	'user-all-Invitation-codes': [{ _id: 'legacy1', codes: ['AAAAAA', 'BBBBBB', 'BBBBBB', '', ' CCCCCC ', 123, 'abc123'] }],
	'user-accounts': userDocs(['AAAAAA', 'DDDDDD', '']),
	'user-invite-codes': []
}

test('迁移：缺少确认口令时拒绝写入且不产生任何写入', async () => {
	fake.reset(BASE_DATA)
	for (const options of [{ dryRun: false }, { confirm: 'yes' }, { dryRun: false, confirm: 'YES_DELETE' }]) {
		const res = await migrateObject.run(options)
		assert.strictEqual(res.errCode, 'CONFIRM_REQUIRED', JSON.stringify(options))
	}
	assert.strictEqual(targetCodes().length, 0)
})

test('迁移：dry-run 只读统计，口径正确，用户表只计数', async () => {
	fake.reset(BASE_DATA)
	const res = await migrateObject.run()
	assert.strictEqual(res.mode, 'dryRun', JSON.stringify(res))
	assert.deepStrictEqual(res.legacy, {
		collection: 'user-all-Invitation-codes', docCount: 1, docsWithoutArray: 0, rawTotal: 7,
		unique: 4, duplicates: 1, invalid: 2, nonStandard: 1, nonStandardSamples: ['abc123']
	})
	assert.deepStrictEqual(res.target, { collection: 'user-invite-codes', total: 0 })
	assert.deepStrictEqual(res.users, { collection: 'user-accounts', total: 3 })
	assert.strictEqual(targetCodes().length, 0, 'dry-run 不应写入')
	assert.ok(!fake.state.log.includes('user-accounts.get'), 'dry-run 不应分页读取用户表')
	assert.ok(!fake.state.log.some((op) => op.endsWith('.add')), 'dry-run 不应有任何写入')
})

test('迁移：正式运行只写入旧数组的码，来源为 legacy_array，不读用户表', async () => {
	fake.reset(BASE_DATA)
	const res = await migrateObject.run(MIGRATE)
	assert.strictEqual(res.errCode, undefined, res.errMsg)
	assert.strictEqual(res.done, true)
	assert.deepStrictEqual(res.progress, { inserted: 4, existed: 0 })
	assert.strictEqual(res.target.total, 4)
	assert.deepStrictEqual(
		fake.state.store['user-invite-codes'].map((doc) => [doc.code, doc.source]),
		[['AAAAAA', 'legacy_array'], ['BBBBBB', 'legacy_array'], ['CCCCCC', 'legacy_array'], ['abc123', 'legacy_array']]
	)
	assert.ok(fake.state.store['user-invite-codes'].every((doc) => typeof doc.create_date === 'number'))
	assert.ok(!fake.state.log.some((op) => op.startsWith('user-accounts.')), '迁移不应访问用户表')
	assert.deepStrictEqual(fake.state.store['user-all-Invitation-codes'], BASE_DATA['user-all-Invitation-codes'], '旧表不应被修改')
})

test('迁移：重复运行幂等，不重复写入', async () => {
	fake.reset(BASE_DATA)
	await migrateObject.run(MIGRATE)
	const res = await migrateObject.run(MIGRATE)
	assert.strictEqual(res.done, true)
	assert.deepStrictEqual(res.progress, { inserted: 0, existed: 4 })
	assert.strictEqual(res.target.total, 4)
	assertNoDuplicateCodes()
})

test('迁移：跨多个批次全部写入，新表已有的码被跳过', async () => {
	const total = (await getBatchSize()) * 2 + 234
	fake.reset(legacyData(legacyCodes(total), [{ _id: 'x1', code: 'L00007', source: 'register', create_date: 1 }]))
	const res = await migrateObject.run({ ...MIGRATE, intervalMs: 0 })
	assert.strictEqual(res.done, true)
	assert.deepStrictEqual(res.progress, { inserted: total - 1, existed: 1 })
	assert.strictEqual(res.target.total, total)
	assertNoDuplicateCodes()
})

test('迁移：时间预算用尽返回 resume，续跑后结果与一次跑完一致', async () => {
	// 8 个批次；假时钟下每次运行约处理 3 批，需要多次续跑
	const total = (await getBatchSize()) * 7 + 300
	fake.reset(legacyData(legacyCodes(total)))
	const realNow = Date.now
	let clock = 0
	Date.now = () => (clock += 10)
	let resume = null
	let calls = 0
	let last
	try {
		do {
			last = await migrateObject.run({ ...MIGRATE, resume, timeBudgetMs: 45, intervalMs: 0 })
			assert.strictEqual(last.errCode, undefined, last.errMsg)
			if (!last.done) {
				assert.deepStrictEqual(Object.keys(last.resume), ['legacyOffset'])
				resume = last.resume
			}
			calls++
			assert.ok(calls < 50, '续跑次数异常，可能没有推进')
		} while (!last.done)
	} finally {
		Date.now = realNow
	}
	assert.ok(calls > 2, '时间预算应触发多次续跑')
	assert.strictEqual(last.target.total, total)
	assertNoDuplicateCodes()
})

test('迁移：写入失败返回 MIGRATE_ABORTED 与 resume，重跑后补齐且不重复', async () => {
	const batchSize = await getBatchSize()
	const total = batchSize * 2 + 200
	fake.reset(legacyData(legacyCodes(total)))
	let addCalls = 0
	fake.state.hooks.beforeAdd = (name) => {
		if (name === 'user-invite-codes' && ++addCalls === 2) throw new Error('模拟网络错误')
	}
	const failed = await migrateObject.run({ ...MIGRATE, intervalMs: 0 })
	assert.strictEqual(failed.errCode, 'MIGRATE_ABORTED')
	assert.deepStrictEqual(failed.resume, { legacyOffset: batchSize })
	assert.ok(failed.hint.includes('Throttling'), '中止时应提示限流的处理方式')
	assert.strictEqual(targetCodes().length, batchSize)

	fake.state.hooks.beforeAdd = null
	const resumed = await migrateObject.run({ ...MIGRATE, resume: failed.resume, intervalMs: 0 })
	assert.strictEqual(resumed.done, true)
	assert.strictEqual(resumed.target.total, total)
	assertNoDuplicateCodes()
})

test('迁移：非法 resume、时间预算与批次间隔被拒绝', async () => {
	fake.reset(BASE_DATA)
	for (const resume of [{ legacyOffset: -1 }, { legacyOffset: 99 }, { legacyOffset: 1.5 }, {}, { phase: 'users' }]) {
		const res = await migrateObject.run({ ...MIGRATE, resume })
		assert.strictEqual(res.errCode, 'INVALID_RESUME', JSON.stringify(resume))
	}
	const invalidOptions = [
		{ timeBudgetMs: 0 }, { timeBudgetMs: Infinity }, { timeBudgetMs: 550001 },
		{ intervalMs: -1 }, { intervalMs: '300' }, { intervalMs: NaN }, { intervalMs: Infinity }, { intervalMs: 60001 }
	]
	for (const options of invalidOptions) {
		const res = await migrateObject.run(options)
		assert.strictEqual(res.errCode, 'INVALID_PARAM', JSON.stringify(options))
	}
	assert.strictEqual(targetCodes().length, 0)
})

/** 拦截 setTimeout，记录每次等待的毫秒数并立即执行，避免测试真实等待。 */
async function recordSleeps(fn) {
	const realSetTimeout = global.setTimeout
	const delays = []
	global.setTimeout = (callback, ms) => {
		delays.push(ms)
		return realSetTimeout(callback, 0)
	}
	try {
		const result = await fn()
		return { result, delays }
	} finally {
		global.setTimeout = realSetTimeout
	}
}

test('限流防护：每批之间按 intervalMs 等待，第一批不等待，默认 300 毫秒', async () => {
	// 分 3 批，后 2 批开始前等待
	const total = (await getBatchSize()) * 2 + 200
	fake.reset(legacyData(legacyCodes(total)))
	const custom = await recordSleeps(() => migrateObject.run({ ...MIGRATE, intervalMs: 40 }))
	assert.strictEqual(custom.result.done, true)
	assert.strictEqual(custom.result.intervalMs, 40)
	assert.deepStrictEqual(custom.delays, [40, 40])

	fake.reset(legacyData(legacyCodes(total)))
	const byDefault = await recordSleeps(() => migrateObject.run(MIGRATE))
	assert.deepStrictEqual(byDefault.delays, [300, 300])

	fake.reset(legacyData(legacyCodes(total)))
	const disabled = await recordSleeps(() => migrateObject.run({ ...MIGRATE, intervalMs: 0 }))
	assert.deepStrictEqual(disabled.delays, [])
	assert.strictEqual(disabled.result.target.total, total)
})

test('迁移：写入“成功”但数据丢失时核对报 VERIFY_FAILED', async () => {
	fake.reset(BASE_DATA)
	fake.state.hooks.dropWrites = (name) => name === 'user-invite-codes'
	const res = await migrateObject.run(MIGRATE)
	assert.strictEqual(res.errCode, 'VERIFY_FAILED')
})

test('迁移：新表不存在时返回 RUN_FAILED 与上传提示', async () => {
	const data = { ...BASE_DATA }
	delete data['user-invite-codes']
	fake.reset(data)
	const res = await migrateObject.run()
	assert.strictEqual(res.errCode, 'RUN_FAILED')
	assert.ok(res.hint.includes('user-invite-codes'))
})

function withRandomSequence(values, fn) {
	const realRandom = Math.random
	let index = 0
	Math.random = () => {
		if (index >= values.length) throw new Error('随机数序列已用完')
		return values[index++]
	}
	return Promise.resolve().then(fn).finally(() => { Math.random = realRandom })
}
// 字符表 0-9A-Z 中某个字符对应的随机数
const charRandom = (char) => ('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(char) + 0.5) / 36
const codeRandoms = (code) => code.split('').map(charRandom)
const reserve = () => {
	const database = fake.database()
	return reserveInviteCode(database.collection('user-invite-codes'), database.collection('user-accounts'))
}

test('注册占用：生成 6 位 0-9A-Z 并写入 register 来源记录', async () => {
	fake.reset({ 'user-invite-codes': [], 'user-accounts': [] })
	const code = await reserve()
	assert.ok(/^[0-9A-Z]{6}$/.test(code), code)
	assert.deepStrictEqual(fake.state.store['user-invite-codes'].map((doc) => [doc.code, doc.source]), [[code, 'register']])
	assert.ok(fake.state.log.includes('user-accounts.get'), '查重应同时查询用户表')
})

test('注册占用：生成的码已在登记表时换码，只写入一次', async () => {
	fake.reset({ 'user-invite-codes': [{ _id: 'e1', code: 'AAAAAA', source: 'legacy_array', create_date: 1 }], 'user-accounts': [] })
	const code = await withRandomSequence([...codeRandoms('AAAAAA'), ...codeRandoms('BBBBBB')], reserve)
	assert.strictEqual(code, 'BBBBBB')
	assert.deepStrictEqual(targetCodes(), ['AAAAAA', 'BBBBBB'])
})

test('注册占用：码不在登记表但已被用户使用（旧数组漏掉）时同样换码', async () => {
	fake.reset({ 'user-invite-codes': [], 'user-accounts': userDocs(['EEEEEE']) })
	const code = await withRandomSequence([...codeRandoms('EEEEEE'), ...codeRandoms('FFFFFF')], reserve)
	assert.strictEqual(code, 'FFFFFF')
	assert.deepStrictEqual(targetCodes(), ['FFFFFF'], '被用户占用的码不应写入登记表，也不应分配')
})

test('注册占用：查重后被并发抢占（唯一索引冲突）时换码重试', async () => {
	fake.reset({ 'user-invite-codes': [], 'user-accounts': [] })
	let first = true
	fake.state.hooks.beforeAdd = (name, doc) => {
		if (first) {
			first = false
			// 模拟另一个注册在查重与写入之间抢先写入同一个码
			fake.state.store[name].push({ _id: 'race', code: doc.code, source: 'register', create_date: 1 })
		}
	}
	const code = await withRandomSequence([...codeRandoms('CCCCCC'), ...codeRandoms('DDDDDD')], reserve)
	assert.strictEqual(code, 'DDDDDD')
	assertNoDuplicateCodes()
})

test('注册占用：连续 5 次都失败时抛错，不返回未占用的码', async () => {
	fake.reset({ 'user-invite-codes': [{ _id: 'e1', code: 'ZZZZZZ', source: 'legacy_array', create_date: 1 }], 'user-accounts': [] })
	const randoms = Array.from({ length: 5 }, () => codeRandoms('ZZZZZZ')).flat()
	await assert.rejects(
		() => withRandomSequence(randoms, reserve),
		/连续 5 次未能占用邀请码/
	)
	assert.deepStrictEqual(targetCodes(), ['ZZZZZZ'])
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

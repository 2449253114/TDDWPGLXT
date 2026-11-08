// 运行：node pages/other/violation-register/violation-register.data.test.js
const assert = require('assert')
const {
	SCAN_FIELDS,
	READ_MAX_ATTEMPTS,
	countRegisteredAccounts,
	scanRegisteredAccounts,
	readAccountsByIds,
	changeAccountStatus
} = require('./violation-register.data.js')

const { dbCmd, createCollection } = require('./violation-register.fake-db.js')

const id = index => String(index).padStart(24, '0')
const range = { startMs: 1000, endMs: 2000 }

async function run() {
	// 1. 游标扫描：只读范围内账号、按 _id 顺序且不重复；读到空页才结束；只读扫描字段
	{
		const rows = []
		for (let index = 1; index <= 2600; index++) {
			rows.push({ _id: id(index), register_date: index % 10 === 0 ? 5000 : 1500, register_ip: '1.1.1.1', nickname: 'n' })
		}
		const { collection, calls } = createCollection(rows)
		const loaded = []
		const accounts = await scanRegisteredAccounts({ collection, dbCmd }, range, { onPage: count => loaded.push(count) })
		const expectedIds = rows.filter(row => row.register_date === 1500).map(row => row._id)
		assert.deepStrictEqual(accounts.map(row => row._id), expectedIds)
		assert.strictEqual(calls.get.length, 4, '2340 条需读 3 页数据加 1 次空页确认')
		assert.deepStrictEqual(loaded, [1000, 2000, 2340])
		assert(calls.get.every(call => call.fields === SCAN_FIELDS))
		assert(!('nickname' in accounts[0]), '扫描阶段不应读取详情字段')
		assert.strictEqual(await countRegisteredAccounts({ collection, dbCmd }, range), 2340)
	}

	// 2. 服务端单次上限小于 1000 时也不能静默漏读
	{
		const rows = Array.from({ length: 1200 }, (_, index) => ({ _id: id(index + 1), register_date: 1500 }))
		const { collection } = createCollection(rows, { maxLimit: 500 })
		const accounts = await scanRegisteredAccounts({ collection, dbCmd }, range)
		assert.strictEqual(accounts.length, 1200)
	}

	// 3. _id 游标条件失效时中止，而不是死循环或重复计数
	{
		const rows = Array.from({ length: 1500 }, (_, index) => ({ _id: id(index + 1), register_date: 1500 }))
		const { collection } = createCollection(rows, { ignoreIdCursor: true })
		await assert.rejects(scanRegisteredAccounts({ collection, dbCmd }, range), /分页游标没有前进/)
	}

	// 4. 单页读取失败自动重试；连续失败达到上限后报错
	{
		const rows = [{ _id: id(1), register_date: 1500 }]
		const retried = []
		const flaky = createCollection(rows, { failGet: count => count <= 2 })
		const accounts = await scanRegisteredAccounts({ collection: flaky.collection, dbCmd }, range, {
			retryDelayMs: 0,
			onRetry: attempt => retried.push(attempt)
		})
		assert.strictEqual(accounts.length, 1)
		assert.deepStrictEqual(retried, [2, 3])

		const broken = createCollection(rows, { failGet: () => true })
		await assert.rejects(
			scanRegisteredAccounts({ collection: broken.collection, dbCmd }, range, { retryDelayMs: 0 }),
			new RegExp(`连续 ${READ_MAX_ATTEMPTS} 次读取失败`)
		)
		assert.strictEqual(broken.calls.get.length, READ_MAX_ATTEMPTS)
	}

	// 5. 取消后立即停止，不再继续读取或重试
	{
		const rows = Array.from({ length: 3000 }, (_, index) => ({ _id: id(index + 1), register_date: 1500 }))
		const { collection, calls } = createCollection(rows)
		let cancelled = false
		await assert.rejects(
			scanRegisteredAccounts({ collection, dbCmd }, range, { onPage: () => { cancelled = true }, isCancelled: () => cancelled }),
			error => error.cancelled === true
		)
		assert.strictEqual(calls.get.length, 1, '第一页回调后取消，不再发起第二页读取')
	}

	// 6. 时间范围与返回结构异常必须报错，不能当作空数据
	{
		const { collection } = createCollection([])
		await assert.rejects(scanRegisteredAccounts({ collection, dbCmd }, { startMs: 3000, endMs: 1000 }), /注册时间范围无效/)
		await assert.rejects(scanRegisteredAccounts({ collection, dbCmd }, { startMs: NaN, endMs: 1000 }), /注册时间范围无效/)
		const badCollection = { where: () => ({ field() { return this }, orderBy() { return this }, limit() { return this }, get: async () => ({ result: {} }), count: async () => ({ result: {} }) }) }
		await assert.rejects(scanRegisteredAccounts({ collection: badCollection, dbCmd }, range, { retryDelayMs: 0 }), /注册账号返回结果无效/)
		await assert.rejects(countRegisteredAccounts({ collection: badCollection, dbCmd }, range, { retryDelayMs: 0 }), /账号总数返回结果无效/)
	}

	// 7. 按 id 批量读取：每批不超过 100 个并显式设置 limit；不存在的 id 不出现在结果中
	{
		const rows = Array.from({ length: 250 }, (_, index) => ({ _id: id(index + 1), status: 0 }))
		const { collection, calls } = createCollection(rows)
		const ids = rows.map(row => row._id).concat(['missing', rows[0]._id, '', null])
		const result = await readAccountsByIds({ collection, dbCmd }, ids, { _id: true, status: true })
		assert.strictEqual(result.size, 250)
		assert.deepStrictEqual(calls.get.map(call => call.limit), [100, 100, 51])
		assert(!result.has('missing'))
	}

	// 8. 封禁：只改 status 0；其它状态不被覆盖；按回读的最终状态归类
	{
		const rows = [
			{ _id: 'normal', status: 0 },
			{ _id: 'restricted', status: 1 },
			{ _id: 'banned', status: 3 }
		]
		const { collection, calls } = createCollection(rows)
		const outcome = await changeAccountStatus({ collection, dbCmd }, ['normal', 'restricted', 'banned', 'gone'], 'ban')
		assert.deepStrictEqual(calls.update[0].where.status, 0, '写入必须带原状态条件')
		assert.deepStrictEqual(calls.update[0].patch, { status: 3 })
		assert.strictEqual(rows[1].status, 1, '禁止购买会员的账号不能被批量封禁覆盖')
		assert.deepStrictEqual(outcome.success.map(item => item.id).sort(), ['banned', 'normal'])
		assert.deepStrictEqual(outcome.skipped.map(item => [item.id, item.status]), [['restricted', 1], ['gone', null]])
		assert.deepStrictEqual(outcome.failed, [])
		assert.deepStrictEqual(outcome.uncertain, [])
	}

	// 9. 解封：只把 3 改回 0
	{
		const rows = [{ _id: 'banned', status: 3 }, { _id: 'restricted', status: 1 }]
		const { collection } = createCollection(rows)
		const outcome = await changeAccountStatus({ collection, dbCmd }, ['banned', 'restricted'], 'unban')
		assert.deepStrictEqual(outcome.success.map(item => [item.id, item.status]), [['banned', 0]])
		assert.deepStrictEqual(outcome.skipped.map(item => item.id), ['restricted'])
		assert.strictEqual(rows[1].status, 1)
	}

	// 10. 写入报错且状态未变 → failed；写入未生效但无报错 → failed；回读失败 → uncertain；未知操作抛错
	{
		const failing = createCollection([{ _id: 'a', status: 0 }], { failUpdate: () => true })
		const failedOutcome = await changeAccountStatus({ collection: failing.collection, dbCmd }, ['a'], 'ban')
		assert.deepStrictEqual(failedOutcome.failed.map(item => item.id), ['a'])
		assert(/写入失败：写入超时/.test(failedOutcome.failed[0].reason))

		const dropped = createCollection([{ _id: 'a', status: 0 }], { dropUpdate: true })
		const droppedOutcome = await changeAccountStatus({ collection: dropped.collection, dbCmd }, ['a'], 'ban')
		assert.deepStrictEqual(droppedOutcome.failed.map(item => item.reason), ['写入后状态未变化'])

		const unreadable = createCollection([{ _id: 'a', status: 0 }], { failGet: () => true })
		const uncertainOutcome = await changeAccountStatus({ collection: unreadable.collection, dbCmd }, ['a'], 'ban')
		assert.deepStrictEqual(uncertainOutcome.uncertain.map(item => item.id), ['a'])
		assert.deepStrictEqual(uncertainOutcome.success, [])

		await assert.rejects(changeAccountStatus({ collection: failing.collection, dbCmd }, ['a'], 'delete'), /未知的状态操作/)
	}

	// 11. 批量处理按 100 个一批，进度回调覆盖全部
	{
		const rows = Array.from({ length: 230 }, (_, index) => ({ _id: id(index + 1), status: 0 }))
		const { collection, calls } = createCollection(rows)
		const progress = []
		const outcome = await changeAccountStatus({ collection, dbCmd }, rows.map(row => row._id), 'ban', {
			onChunk: (done, total) => progress.push([done, total])
		})
		assert.strictEqual(outcome.success.length, 230)
		assert.deepStrictEqual(calls.update.map(call => call.where._id.value.length), [100, 100, 30])
		assert.deepStrictEqual(progress, [[100, 230], [200, 230], [230, 230]])
	}

	console.log('violation-register.data tests passed')
}

run().catch(error => {
	console.error(error)
	process.exit(1)
})

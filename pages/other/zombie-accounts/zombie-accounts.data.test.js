// 运行：node pages/other/zombie-accounts/zombie-accounts.data.test.js
const assert = require('assert')
const { dbCmd, createCollection } = require('../violation-register/violation-register.fake-db.js')
const {
	ACTION_BATCH_SIZE,
	INVITER_CHECK_LIMIT,
	countZombieCandidates,
	scanZombieCandidates,
	loadPaidUserIds,
	findInviterIds,
	banZombieAccounts,
	deleteZombieAccounts
} = require('./zombie-accounts.data.js')

const DAY = 24 * 60 * 60 * 1000
const criteria = {
	startMs: 1000 * DAY,
	endExclusiveMs: 2000 * DAY,
	gapMs: 3 * DAY,
	activeBoundMs: 2003 * DAY,
	startDate: 'S',
	endDate: 'E',
	gapDays: 3
}
const SCAN_AT = 3000 * DAY
const pad = value => String(value).padStart(24, '0')

async function run() {
	// 1. 候选扫描：两组预筛条件合并，排除注册范围外、登录或在线晚于上界的账号
	{
		const rows = [
			{ _id: pad(1), register_date: 1500 * DAY, login_date: 1500 * DAY },
			{ _id: pad(2), register_date: 1500 * DAY, login_date: 1500 * DAY, last_online_time: 1501 * DAY },
			{ _id: pad(3), register_date: 1500 * DAY, login_date: 1500 * DAY, last_online_time: 2500 * DAY },
			{ _id: pad(4), register_date: 1500 * DAY, login_date: 2500 * DAY },
			{ _id: pad(5), register_date: 2000 * DAY, login_date: 2000 * DAY },
			{ _id: pad(6), register_date: 999 * DAY, login_date: 999 * DAY },
			{ _id: pad(7), register_date: 1999 * DAY, login_date: 2003 * DAY, last_online_time: 2003 * DAY }
		]
		const { collection } = createCollection(rows)
		const loaded = []
		const candidates = await scanZombieCandidates({ collection, dbCmd }, criteria, { onPage: count => loaded.push(count) })
		assert.deepStrictEqual(candidates.map(row => row._id).sort(), [pad(1), pad(2), pad(7)])
		assert.strictEqual(await countZombieCandidates({ collection, dbCmd }, criteria), 3)
		assert.deepStrictEqual(loaded, [2, 3], '第二组的进度在第一组基础上累计')
	}

	// 2. 付费用户：金额大于 0 且已支付或已退款
	{
		const orders = [
			{ _id: pad(1), user_id: 'paid', total_fee: 600, status: 1 },
			{ _id: pad(2), user_id: 'refunded', total_fee: 600, status: 2 },
			{ _id: pad(3), user_id: 'unpaid', total_fee: 600, status: 0 },
			{ _id: pad(4), user_id: 'gift', total_fee: 0, status: 1 }
		]
		const { collection } = createCollection(orders)
		const paid = await loadPaidUserIds({ collection, dbCmd })
		assert.deepStrictEqual(Array.from(paid).sort(), ['paid', 'refunded'])
	}

	// 3. 邀请关系核对：读满上限时拆半重查，不会漏掉被大邀请人挤出结果的小邀请人
	{
		const rows = []
		for (let index = 0; index < INVITER_CHECK_LIMIT + 5; index++) rows.push({ _id: pad(index + 10), inviter_uid: 'big' })
		rows.push({ _id: pad(5000), inviter_uid: 'small' })
		rows.push({ _id: pad(5001), inviter_uid: 'outsider' })
		rows.push({ _id: 'self', inviter_uid: 'self' })
		const { collection, calls } = createCollection(rows)
		const progress = []
		const found = await findInviterIds({ collection, dbCmd }, ['big', 'small', 'nobody', null, 'big', 'self'], { onProgress: (done, total) => progress.push([done, total]) })
		assert.deepStrictEqual(Array.from(found).sort(), ['big', 'small'], '自己邀请自己不算是别人的邀请人')
		assert(calls.get.length > 1, '读满上限后必须拆分重查')
		assert(calls.get.every(call => call.limit === INVITER_CHECK_LIMIT))
		assert.deepStrictEqual(progress, [[4, 4]])
	}

	// 4. 封禁：只封禁正常、范围内、扫描后无活动、无备注的账号，并写入批次标记；逐个归类
	{
		const base = { register_date: 1500 * DAY, login_date: 1500 * DAY, status: 0 }
		const rows = [
			{ _id: 'zombie', ...base },
			{ _id: 'zombie-online', ...base, last_online_time: 1501 * DAY },
			{ _id: 'came-back', ...base, last_online_time: SCAN_AT + 1 },
			{ _id: 'logged-in', ...base, login_date: SCAN_AT + 1 },
			{ _id: 'noted', ...base, description: '运营备注' },
			{ _id: 'restricted', ...base, status: 1 },
			{ _id: 'banned', ...base, status: 3, description: '旧封禁' }
		]
		const { collection } = createCollection(rows)
		const hits = ['zombie', 'zombie-online', 'came-back', 'logged-in', 'noted', 'restricted', 'banned', 'gone'].map(id => ({
			id,
			hasOnlineField: ['zombie-online', 'came-back'].includes(id)
		}))
		const outcome = await banZombieAccounts({ collection, dbCmd }, hits, { criteria, scanStartedAt: SCAN_AT, tag: 'TAG' })
		const byId = Object.fromEntries(rows.map(row => [row._id, row]))
		assert.deepStrictEqual(outcome.success.map(item => item.id).sort(), ['zombie', 'zombie-online'])
		assert.strictEqual(byId.zombie.status, 3)
		assert.strictEqual(byId.zombie.description, 'TAG')
		assert.strictEqual(byId['came-back'].status, 0, '扫描后在线过的账号不能被封禁')
		assert.strictEqual(byId['logged-in'].status, 0, '扫描后登录过的账号不能被封禁')
		assert.strictEqual(byId.noted.status, 0, '有备注的账号不覆盖备注、不自动封禁')
		assert.strictEqual(byId.noted.description, '运营备注')
		assert.strictEqual(byId.restricted.status, 1)
		assert.strictEqual(byId.banned.description, '旧封禁')
		const reasons = Object.fromEntries(outcome.skipped.map(item => [item.id, item.reason]))
		assert.deepStrictEqual(Object.keys(reasons).sort(), ['banned', 'came-back', 'gone', 'logged-in', 'noted', 'restricted'])
		assert(/扫描后/.test(reasons['came-back']))
		assert(/扫描后/.test(reasons['logged-in']))
		assert(/备注/.test(reasons.noted))
		assert(/禁止购买会员/.test(reasons.restricted))
		assert(/非本次操作/.test(reasons.banned))
		assert(/不存在/.test(reasons.gone))
		assert.deepStrictEqual(outcome.failed, [])
	}

	// 5. 封禁：写入报错且状态未变 → failed；回读失败 → uncertain；停止后剩余批次记为未处理
	{
		const make = id => ({ _id: id, register_date: 1500 * DAY, login_date: 1500 * DAY, status: 0 })
		const failing = createCollection([make('a')], { failUpdate: () => true })
		const failed = await banZombieAccounts({ collection: failing.collection, dbCmd }, [{ id: 'a', hasOnlineField: false }], { criteria, scanStartedAt: SCAN_AT, tag: 'TAG' })
		assert.deepStrictEqual(failed.failed.map(item => item.id), ['a'])
		assert(/写入失败：写入超时/.test(failed.failed[0].reason))

		const unreadable = createCollection([make('a')], { failGet: () => true })
		const uncertain = await banZombieAccounts({ collection: unreadable.collection, dbCmd }, [{ id: 'a', hasOnlineField: false }], { criteria, scanStartedAt: SCAN_AT, tag: 'TAG' })
		assert.deepStrictEqual(uncertain.uncertain.map(item => item.id), ['a'])
		assert.deepStrictEqual(uncertain.success, [])

		const many = Array.from({ length: ACTION_BATCH_SIZE + 3 }, (_, index) => make(pad(index + 1)))
		const big = createCollection(many)
		let chunks = 0
		const stopped = await banZombieAccounts(
			{ collection: big.collection, dbCmd },
			many.map(row => ({ id: row._id, hasOnlineField: false })),
			{ criteria, scanStartedAt: SCAN_AT, tag: 'TAG' },
			{ onChunk: () => { chunks++ }, isStopped: () => chunks >= 1 }
		)
		assert.strictEqual(stopped.success.length, ACTION_BATCH_SIZE)
		assert.strictEqual(stopped.notProcessed.length, 3)
		assert.strictEqual(many.filter(row => row.status === 3).length, ACTION_BATCH_SIZE)
	}

	// 6. 删除：删除前重新核对邀请关系；扫描后有活动、内部用户不删；成功删除的回读不存在
	{
		const base = { register_date: 1500 * DAY, login_date: 1500 * DAY, status: 0 }
		const rows = [
			{ _id: 'zombie', ...base },
			{ _id: 'zombie-online', ...base, last_online_time: 1501 * DAY },
			{ _id: 'now-inviter', ...base },
			{ _id: 'invitee-of-now-inviter', register_date: SCAN_AT, login_date: SCAN_AT, inviter_uid: 'now-inviter' },
			{ _id: 'came-back', ...base, last_online_time: SCAN_AT + 1 },
			{ _id: 'internal', ...base, is_internal_user: true },
			{ _id: 'banned-zombie', ...base, status: 3 }
		]
		const { collection } = createCollection(rows)
		const hits = ['zombie', 'zombie-online', 'now-inviter', 'came-back', 'internal', 'banned-zombie'].map(id => ({
			id,
			hasOnlineField: ['zombie-online', 'came-back'].includes(id)
		}))
		const outcome = await deleteZombieAccounts({ collection, dbCmd }, hits, { criteria, scanStartedAt: SCAN_AT })
		const remaining = rows.map(row => row._id).sort()
		assert.deepStrictEqual(remaining, ['came-back', 'internal', 'invitee-of-now-inviter', 'now-inviter'])
		assert.deepStrictEqual(outcome.success.map(item => item.id).sort(), ['banned-zombie', 'zombie', 'zombie-online'])
		assert(outcome.success.every(item => item.status === null))
		const skipped = Object.fromEntries(outcome.skipped.map(item => [item.id, item.reason]))
		assert(/邀请人/.test(skipped['now-inviter']))
		assert(/扫描后/.test(skipped['came-back']))
		assert.deepStrictEqual(outcome.failed.map(item => item.id), ['internal'], '内部用户被写入条件拦下，归为失败并保留')
	}

	// 7. 删除：核对邀请关系失败时整批不删；删除报错 → failed；回读失败 → uncertain
	{
		const make = id => ({ _id: id, register_date: 1500 * DAY, login_date: 1500 * DAY, status: 0 })
		const checkFails = createCollection([make('a')], { failGet: () => true })
		const noCheck = await deleteZombieAccounts({ collection: checkFails.collection, dbCmd }, [{ id: 'a', hasOnlineField: false }], { criteria, scanStartedAt: SCAN_AT }, { retryDelayMs: 0 })
		assert.deepStrictEqual(noCheck.failed.map(item => item.id), ['a'])
		assert(/核对失败/.test(noCheck.failed[0].reason))
		assert.strictEqual(checkFails.calls.remove.length, 0, '核对失败时不能发起删除')

		const removeFails = createCollection([make('a')], { failRemove: () => true })
		const failed = await deleteZombieAccounts({ collection: removeFails.collection, dbCmd }, [{ id: 'a', hasOnlineField: false }], { criteria, scanStartedAt: SCAN_AT })
		assert(/删除失败：删除超时/.test(failed.failed[0].reason))

		let reads = 0
		const verifyFails = createCollection([make('a')], { failGet: () => ++reads > 1 })
		const uncertain = await deleteZombieAccounts({ collection: verifyFails.collection, dbCmd }, [{ id: 'a', hasOnlineField: false }], { criteria, scanStartedAt: SCAN_AT }, { retryDelayMs: 0 })
		assert.deepStrictEqual(uncertain.uncertain.map(item => item.id), ['a'])
	}

	console.log('zombie-accounts.data tests passed')
}

run().catch(error => {
	console.error(error)
	process.exit(1)
})

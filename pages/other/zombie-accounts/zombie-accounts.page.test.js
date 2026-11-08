// 运行：node pages/other/zombie-accounts/zombie-accounts.page.test.js
// 页面级测试：模板静态约束 + 用最小实例模拟（data / methods / computed getter）驱动检测、分类、封禁、删除、解封与失败流程。
// 本地没有 Vue 运行时，computed 在这里每次访问都会重新计算，不覆盖 Vue 的响应式缓存；
// 响应式依赖由“计算属性只能通过 statusOf / detailOf 读取 Map”这条静态约束保证。
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { dbCmd, createCollection } = require('../violation-register/violation-register.fake-db.js')
const { HIT_FILTERS } = require('./zombie-accounts.utils.js')
const { getBusinessDateStart } = require('../violation-invitation-v2/violation-invitation-v2.scan.js')

const pagePath = path.join(__dirname, 'zombie-accounts.vue')
const pageSource = fs.readFileSync(pagePath, 'utf8').replace(/\r\n/g, '\n')
const template = pageSource.match(/<template>([\s\S]*)<\/template>/)[1]
const script = pageSource.match(/<script>([\s\S]*?)<\/script>/)[1]

// ---------- 静态约束 ----------
assert(!/:key="\w*[iI]ndex"/.test(template), '列表 key 不能使用下标')
assert(/v-for="row in hitRows"/.test(template) && /v-for="row in beneficiaryRows"/.test(template), '表格只渲染当前页')
const computedBlock = script.match(/computed: \{([\s\S]*?)\n\t\t\},\n\t\tmethods:/)
assert(computedBlock, '无法定位 computed 代码块')
assert(!/statusById\.|detailById\./.test(computedBlock[1]), '计算属性必须通过 statusOf / detailOf 读取非响应式 Map')
assert(/editable: true/.test(script) && /DELETE_CONFIRM_TEXT/.test(script), '批量删除必须要求输入确认文字')
const pagesJson = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'pages.json'), 'utf8')
assert(pagesJson.includes('"pages/other/zombie-accounts/zombie-accounts"'), 'pages.json 未注册页面')
const adminConfig = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'admin.config.js'), 'utf8')
assert(adminConfig.includes("value: '/pages/other/zombie-accounts/zombie-accounts'"), '菜单未注册页面')

function loadPage(collections) {
	const transformed = script.replace(/export\s+default\s*\{/, 'module.exports = {')
	const moduleValue = { exports: {} }
	const uniCalls = { toast: [], modal: [], navigate: [] }
	vm.runInNewContext(transformed, {
		module: moduleValue,
		exports: moduleValue.exports,
		uniCloud: { database: () => ({ collection: name => collections[name], command: dbCmd }) },
		uni: {
			showToast: options => uniCalls.toast.push(options),
			showModal: options => uniCalls.modal.push(options),
			navigateTo: options => uniCalls.navigate.push(options)
		},
		console: { ...console, error: () => {} },
		setTimeout,
		clearTimeout,
		require: request => (request.startsWith('.') ? require(path.resolve(__dirname, request)) : require(request))
	}, { filename: pagePath })
	const component = moduleValue.exports
	const instance = {}
	Object.assign(instance, component.data.call(instance))
	Object.keys(component.methods).forEach(key => { instance[key] = component.methods[key].bind(instance) })
	Object.keys(component.computed).forEach(key => {
		Object.defineProperty(instance, key, { get: () => component.computed[key].call(instance) })
	})
	component.created.call(instance)
	return { instance, uniCalls }
}

const DAY = 24 * 60 * 60 * 1000
const bj = (date, hours = 0) => getBusinessDateStart(date) + hours * 3600000
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const plain = value => JSON.parse(JSON.stringify(value))

function buildUsers() {
	let seq = 0
	const users = []
	const add = (name, extra = {}) => {
		seq++
		const register = bj('2025-03-01', seq % 20)
		const row = {
			_id: String(seq).padStart(20, '0') + name.slice(0, 4).padEnd(4, '_'),
			name,
			register_date: register,
			login_date: register,
			status: 0,
			inviter_uid: '',
			vip_expire_date: register + DAY,
			my_invite_code: `C${String(seq).padStart(5, '0')}`,
			register_ip: `10.0.0.${seq}`,
			...extra
		}
		users.push(row)
		return row
	}
	const boss = add('boss', { register_date: bj('2024-01-01'), login_date: Date.now(), vip_expire_date: Date.now() + 9999 * DAY })
	const invitees = [add('inv1', { inviter_uid: boss._id }), add('inv2', { inviter_uid: boss._id, last_online_time: bj('2025-03-02') })]
	const zombieInviter = add('zinv')
	add('child', { inviter_uid: zombieInviter._id, register_date: bj('2026-10-01'), login_date: Date.now() })
	const none = [add('none1'), add('none2'), add('self', {})]
	none[2].inviter_uid = none[2]._id
	add('paid')
	add('vip', { vip_expire_date: Date.now() + 30 * DAY })
	add('noted', { inviter_uid: boss._id, description: '运营备注' })
	add('active', { last_online_time: Date.now() - DAY })
	add('late', { login_date: bj('2025-03-10') })
	add('old', { register_date: bj('2021-12-31'), login_date: bj('2021-12-31') })
	return { users, boss, invitees, zombieInviter, none }
}

async function scanFixture(options = {}) {
	const data = buildUsers()
	const paidUser = data.users.find(user => user.name === 'paid')
	const users = createCollection(data.users, options.users || {})
	const orders = createCollection([
		{ _id: '1'.padStart(24, '0'), user_id: paidUser._id, total_fee: 1800, status: 1 },
		{ _id: '2'.padStart(24, '0'), user_id: data.none[0]._id, total_fee: 0, status: 1 }
	])
	const page = loadPage({ 'user-accounts': users.collection, 'user-payment-orders': orders.collection })
	page.instance.startDate = '2022-01-01'
	page.instance.endMode = 'manual'
	page.instance.endDate = '2025-12-31'
	page.instance.gapOption = 3
	await page.instance.startScan()
	await flush()
	return { ...page, ...data, usersFake: users }
}

const idOf = (users, name) => users.find(user => user.name === name)._id

async function run() {
	// 1. 默认条件与选项覆盖
	{
		const { instance } = loadPage({ 'user-accounts': createCollection([]).collection, 'user-payment-orders': createCollection([]).collection })
		assert.strictEqual(instance.startDate, '2022-01-01')
		assert.strictEqual(instance.criteriaPreview.error, false, instance.criteriaPreview.text)
		assert(/2022-01-01 00:00:00/.test(instance.criteriaPreview.text))
		assert.deepStrictEqual(plain(instance.hitFilterOptions.map(option => option.value).sort()), Object.keys(HIT_FILTERS).sort())
		instance.setMonthsOption('custom')
		assert.strictEqual(instance.criteriaPreview.error, true, '自定义月数为空时必须提示')
		instance.customMonths = '4'
		assert.strictEqual(instance.criteriaPreview.error, false)
		instance.setGapOption('custom')
		assert.strictEqual(instance.criteriaPreview.error, true, '自定义天数为空时必须提示')
	}

	// 2. 检测：分类、受保护、受益邀请人
	{
		const { instance, users } = await scanFixture()
		assert.strictEqual(instance.task.error, false, instance.task.message)
		const categoryOf = name => instance.hits.find(hit => hit.id === idOf(users, name))
		assert(!categoryOf('boss'), '仍活跃的邀请人不命中')
		assert(!categoryOf('active') && !categoryOf('late') && !categoryOf('old'), '活跃、超出间隔、范围外的账号不命中')
		assert.strictEqual(categoryOf('inv1').category, 'invitee')
		assert.strictEqual(categoryOf('inv2').category, 'invitee')
		assert.strictEqual(categoryOf('zinv').category, 'inviter')
		assert.strictEqual(categoryOf('none1').category, 'none')
		assert.strictEqual(categoryOf('self').category, 'none')
		assert.strictEqual(categoryOf('paid').protectReason, 'paid')
		assert.strictEqual(categoryOf('vip').protectReason, 'vip')
		assert.deepStrictEqual(plain(instance.summary), {
			total: 9,
			protected: { paid: 1, vip: 1, internal: 0, total: 2 },
			actionable: { inviter: 1, invitee: 3, none: 3, total: 7 }
		})
		assert.deepStrictEqual(plain(instance.beneficiaries), [{ inviterId: idOf(users, 'boss'), count: 3 }])
		assert.deepStrictEqual(plain(instance.hitCountByFilter), { actionable: 7, invitee: 3, inviter: 1, none: 3, protected: 2 })

		const rows = instance.hitRows
		const selfRow = rows.find(row => row.id === idOf(users, 'self'))
		assert.strictEqual(selfRow.inviterCodeText, '自己（数据异常）')
		const invRow = rows.find(row => row.id === idOf(users, 'inv1'))
		assert.strictEqual(invRow.inviterCodeText, users.find(user => user.name === 'boss').my_invite_code)
		assert.strictEqual(invRow.canBan, true)
		assert.strictEqual(invRow.canDelete, false, '受邀小号不能删除')
		assert.strictEqual(rows.find(row => row.id === idOf(users, 'zinv')).canDelete, false, '邀请人不能删除')
		assert.strictEqual(rows.find(row => row.id === idOf(users, 'none1')).canDelete, true)
		const paidRow = rows.find(row => row.id === idOf(users, 'paid'))
		assert(paidRow === undefined || (!paidRow.canBan && !paidRow.canDelete))
		const beneficiary = instance.beneficiaryRows[0]
		assert.strictEqual(beneficiary.vipText, '永久会员')
		assert.strictEqual(beneficiary.count, 3)
	}

	// 3. 批量封禁受邀小号：写入批次标记；有备注的跳过；受保护不参与
	{
		const { instance, users, uniCalls } = await scanFixture()
		await instance.setHitFilter('invitee')
		assert.strictEqual(instance.batchBanTargets.length, 3)
		instance.confirmBatchBan()
		uniCalls.modal[uniCalls.modal.length - 1].success({ confirm: true })
		await flush()
		await flush()
		const byName = name => users.find(user => user.name === name)
		assert.strictEqual(byName('inv1').status, 3)
		assert(/^僵尸号清理封禁 .+：注册 2022-01-01~2025-12-31，最后活跃距注册≤3天$/.test(byName('inv1').description), byName('inv1').description)
		assert.strictEqual(byName('noted').status, 0, '有备注的账号不自动封禁')
		assert.strictEqual(byName('noted').description, '运营备注')
		assert.strictEqual(byName('paid').status, 0)
		assert(/成功 2，跳过 1，失败 0，待确认 0/.test(instance.task.message), instance.task.message)
		assert.strictEqual(instance.handledCounts.banned, 2)
		assert.strictEqual(instance.batchBanTargets.length, 1, '剩下有备注的那个仍为正常')
		await instance.setHitFilter('protected')
		assert.strictEqual(instance.batchBanTargets.length, 0, '受保护筛选不提供批量处置')
	}

	// 4. 批量删除：输入不正确不删除；正确后只删无邀请关系的账号
	{
		const { instance, users, uniCalls } = await scanFixture()
		await instance.setHitFilter('invitee')
		instance.confirmBatchDelete()
		assert.strictEqual(uniCalls.modal.length, 0, '非“无邀请关系”筛选不能批量删除')
		await instance.setHitFilter('none')
		assert.strictEqual(instance.batchDeleteTargets.length, 3)
		instance.confirmBatchDelete()
		uniCalls.modal[uniCalls.modal.length - 1].success({ confirm: true, content: '删除' })
		await flush()
		assert.strictEqual(users.length, 14, '输入不正确时不能删除')
		assert(/输入不正确/.test(uniCalls.toast[uniCalls.toast.length - 1].title))
		instance.confirmBatchDelete()
		uniCalls.modal[uniCalls.modal.length - 1].success({ confirm: true, content: ' 确认删除 ' })
		await flush()
		await flush()
		const remainingNames = users.map(user => user.name)
		;['none1', 'none2', 'self'].forEach(name => assert(!remainingNames.includes(name), `${name} 应被删除`))
		assert(remainingNames.includes('zinv') && remainingNames.includes('inv1') && remainingNames.includes('paid'))
		assert.strictEqual(instance.handledCounts.deleted, 3)
		const deletedRow = instance.hitRows.find(row => row.id === instance.filteredHits[0].id)
		assert.strictEqual(deletedRow.statusText, '已删除')
		assert.strictEqual(deletedRow.canDelete, false)
		assert.strictEqual(instance.batchDeleteTargets.length, 0)
	}

	// 5. 单个封禁后解封：备注标记保留作为记录
	{
		const { instance, users, uniCalls } = await scanFixture()
		const target = idOf(users, 'none1')
		await instance.runAction('ban', [instance.hits.find(hit => hit.id === target)])
		await flush()
		assert.strictEqual(users.find(user => user._id === target).status, 3)
		const row = instance.hitRows.find(item => item.id === target)
		assert.strictEqual(row.canUnban, true)
		instance.confirmUnban(target)
		await uniCalls.modal[uniCalls.modal.length - 1].success({ confirm: true })
		await flush()
		assert.strictEqual(users.find(user => user._id === target).status, 0)
		assert(/^僵尸号清理封禁/.test(users.find(user => user._id === target).description))
		assert.strictEqual(instance.hitRows.find(item => item.id === target).statusText, '正常')
	}

	// 6. 执行期间不发起详情读取
	{
		const { instance, usersFake } = await scanFixture()
		instance.acting = true
		const before = usersFake.calls.get.length
		assert.strictEqual(await instance.loadDetails(['x']), false)
		assert.strictEqual(usersFake.calls.get.length, before)
	}

	// 7. 检测失败：显示错误，不展示部分结果
	{
		const { instance } = await scanFixture({ users: { failCount: () => true } })
		assert.strictEqual(instance.task.error, true)
		assert(/检测失败，未展示部分结果/.test(instance.task.message), instance.task.message)
		assert.strictEqual(instance.hits.length, 0)
		assert.strictEqual(instance.scanMeta, null)
		assert.strictEqual(instance.scanning, false)
	}

	// 8. 观察期未满的条件不能开始检测
	{
		const { instance, uniCalls } = loadPage({ 'user-accounts': createCollection([]).collection, 'user-payment-orders': createCollection([]).collection })
		instance.setMonthsOption('custom')
		instance.customMonths = '1'
		instance.setGapOption('custom')
		instance.customGapDays = '60'
		await instance.startScan()
		assert(/观察期/.test(uniCalls.toast[0].title), '1 个月前截止加 60 天间隔一定晚于当前时间，必须拒绝')
		instance.customMonths = '0'
		await instance.startScan()
		assert(/截止月数必须在 1 到 120 之间/.test(uniCalls.toast[1].title))
		assert.strictEqual(instance.scanning, false)
	}

	console.log('zombie-accounts.page tests passed')
}

run().catch(error => {
	console.error(error)
	process.exit(1)
})

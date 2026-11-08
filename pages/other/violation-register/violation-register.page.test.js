// 运行：node pages/other/violation-register/violation-register.page.test.js
// 页面级测试：模板静态约束 + 用最小实例模拟（data / methods / computed getter）驱动检测、展开、封禁、取消与失败流程。
// 本地没有 Vue 运行时，computed 在这里每次访问都会重新计算，因此不覆盖 Vue 的响应式缓存行为；
// 响应式依赖由“计算属性只能通过 statusOf / detailOf 读取 Map”这条静态约束保证。
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { dbCmd, createCollection } = require('./violation-register.fake-db.js')
const { RISK_FILTERS } = require('./violation-register.utils.js')
const {
	resolveBusinessDateRange,
	getBusinessDateStart
} = require('../violation-invitation-v2/violation-invitation-v2.scan.js')

const pagePath = path.join(__dirname, 'violation-register.vue')
const pageSource = fs.readFileSync(pagePath, 'utf8').replace(/\r\n/g, '\n')
const template = pageSource.match(/<template>([\s\S]*)<\/template>/)[1]
const script = pageSource.match(/<script>([\s\S]*?)<\/script>/)[1]

// ---------- 静态约束 ----------
assert(!/uni-collapse/.test(template), '分组不能再用 uni-collapse（收起时仍会渲染全部内容）')
assert(
	/v-for="group in pagedGroups"[\s\S]*?<view v-if="group\.ip === expandedIp && expandedGroup" class="ip-group-body">/.test(template),
	'分组明细必须用 v-if 只渲染当前展开的一组'
)
assert(!/:key="\w*[iI]ndex"/.test(template), '列表 key 不能使用下标')
assert(!/ref="table"/.test(template), '不能在循环里重复声明 ref')
const computedBlock = script.match(/computed: \{([\s\S]*?)\n\t\t\},\n\t\tmethods:/)
assert(computedBlock, '无法定位 computed 代码块')
assert(
	!/statusById\.|detailById\./.test(computedBlock[1]),
	'计算属性必须通过 statusOf / detailOf 读取非响应式 Map，否则版本号变化后不会重新计算'
)
assert(!/this\.\w+Version\s*\/\//.test(script), '不能用单独读取版本号的语句建立依赖，压缩时可能被删除')

function loadComponent(collection) {
	const transformed = script.replace(/export\s+default\s*\{/, 'module.exports = {')
	const moduleValue = { exports: {} }
	const uniCalls = { toast: [], modal: [], navigate: [] }
	const uniMock = {
		showToast: options => uniCalls.toast.push(options),
		showModal: options => uniCalls.modal.push(options),
		navigateTo: options => uniCalls.navigate.push(options)
	}
	vm.runInNewContext(transformed, {
		module: moduleValue,
		exports: moduleValue.exports,
		uniCloud: { database: () => ({ collection: () => collection, command: dbCmd }) },
		uni: uniMock,
		console: { ...console, error: () => {} },
		setTimeout,
		clearTimeout,
		require: request => (request.startsWith('.') ? require(path.resolve(__dirname, request)) : require(request))
	}, { filename: pagePath })
	const component = moduleValue.exports
	const instance = {}
	Object.assign(instance, component.data.call(instance))
	Object.keys(component.methods).forEach(key => {
		instance[key] = component.methods[key].bind(instance)
	})
	Object.keys(component.computed).forEach(key => {
		Object.defineProperty(instance, key, { get: () => component.computed[key].call(instance) })
	})
	component.created.call(instance)
	return { instance, component, uniCalls }
}

const plain = value => JSON.parse(JSON.stringify(value))
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

// 固定使用北京时间 2026-01-15 这一天，避免随运行时刻变化
const DAY = '2026-01-15'
const dayStart = getBusinessDateStart(DAY)
const at = minutes => dayStart + minutes * 60 * 1000

function buildRows() {
	const rows = []
	let seq = 0
	const add = (ip, extra = {}) => {
		seq++
		const row = {
			_id: String(seq).padStart(24, '0'),
			register_ip: ip,
			register_date: at(seq),
			inviter_uid: '',
			status: 0,
			nickname: `用户${seq}`,
			my_invite_code: `C${String(seq).padStart(5, '0')}`,
			invite_time: 0,
			login_date: at(seq + 1),
			login_ip: ip
		}
		Object.assign(row, extra)
		rows.push(row)
		return row
	}
	const owner = add('1.1.1.1') // 邀请人本人也在高风险组
	for (let index = 0; index < 15; index++) add('1.1.1.1', { inviter_uid: owner._id, invite_time: at(100 + index) })
	add('2.2.2.2', { status: 1 })
	add('2.2.2.2', { status: 3 })
	for (let index = 0; index < 4; index++) add('2.2.2.2', { inviter_uid: 'outside-inviter' })
	add('3.3.3.3')
	add('3.3.3.3')
	add('4.4.4.4')
	add('')
	add('未知')
	rows.push({ _id: 'outside-inviter', register_ip: '9.9.9.9', register_date: at(-60 * 24 * 10), status: 0, nickname: '外部邀请人', my_invite_code: 'OUT001' })
	rows.push({ _id: 'x'.repeat(24), register_ip: '1.1.1.1', register_date: at(60 * 24 + 1), status: 0 }) // 范围外，第二天注册
	return rows
}

async function scanFixture(options = {}) {
	const rows = buildRows()
	const fake = createCollection(rows, options)
	const page = loadComponent(fake.collection)
	page.instance.dateMode = 'manual'
	page.instance.manualDateRange = [DAY, DAY]
	await page.instance.startScan()
	return { ...page, rows, fake }
}

async function run() {
	// 1. 日期选项与风险筛选项逐项可用（新增选项漏实现时直接失败）
	{
		const { instance } = loadComponent(createCollection([]).collection)
		instance.dateOptions.forEach(option => {
			assert.doesNotThrow(() => resolveBusinessDateRange({
				mode: option.value,
				customDays: '5',
				dateRange: [DAY, DAY],
				confirmedAt: Date.now()
			}), `日期选项 ${option.value} 必须被 resolveBusinessDateRange 支持`)
		})
		assert.deepStrictEqual(plain(instance.riskFilterOptions.map(option => option.value).sort()), Object.keys(RISK_FILTERS).sort())

		instance.setDateMode('custom')
		assert.strictEqual(instance.rangePreview.error, true, '自定义天数为空时必须提示，不能沿用上一个范围')
		instance.customDays = '3'
		assert.strictEqual(instance.rangePreview.error, false)
		assert(/共 3 个自然日/.test(instance.rangePreview.text), '“3 天内”含今天共 3 个自然日')
	}

	// 2. 检测：只统计范围内注册的账号，按 IP 分组，排除无效 IP 与单独 IP
	{
		const { instance, fake } = await scanFixture()
		assert.strictEqual(instance.scanning, false)
		assert.strictEqual(instance.task.error, false, instance.task.message)
		assert.strictEqual(instance.scanMeta.scannedCount, 27)
		assert.strictEqual(instance.scanMeta.expectedCount, 27)
		assert.strictEqual(instance.scanMeta.invalidIpCount, 2)
		assert.deepStrictEqual(plain(instance.groups.map(group => [group.ip, group.count, group.riskLevel])), [
			['1.1.1.1', 16, 'high'],
			['2.2.2.2', 6, 'medium'],
			['3.3.3.3', 2, 'normal']
		])
		assert.deepStrictEqual(plain(instance.summary), {
			groupCount: 3,
			accountCount: 24,
			high: { groupCount: 1, accountCount: 16 },
			medium: { groupCount: 1, accountCount: 6 },
			normal: { groupCount: 1, accountCount: 2 },
			mediumHighInviterCount: 2
		})
		assert.deepStrictEqual(plain(instance.filteredGroups.map(group => group.ip)), ['1.1.1.1', '2.2.2.2'], '默认只显示中高风险')
		assert.deepStrictEqual(plain(instance.groupCountByFilter), { mediumHigh: 2, high: 1, all: 3 })
		assert.strictEqual(instance.pagedGroups[1].bannedCount, 1)
		assert(fake.calls.get.every(call => !call.fields || !('nickname' in call.fields)), '扫描阶段不读取详情字段')
		instance.setRiskFilter('all')
		assert.strictEqual(instance.filteredGroups.length, 3)
	}

	// 3. 展开分组：只加载当前页账号与邀请人详情；邀请人标记“本人也在本组”
	{
		const { instance, fake } = await scanFixture()
		const getCountBefore = fake.calls.get.length
		await instance.toggleGroup('1.1.1.1')
		assert.strictEqual(instance.expandedIp, '1.1.1.1')
		assert.strictEqual(fake.calls.get.length, getCountBefore + 1, '16 个账号与 1 个邀请人应在一次批量读取中完成')
		const rows = instance.pagedAccountRows
		assert.strictEqual(rows.length, 16)
		assert.strictEqual(rows[0].id, '000000000000000000000016', '默认按注册时间倒序')
		assert.strictEqual(rows[0].inviterCodeText, 'C00001')
		assert.strictEqual(rows[0].canBan, true)
		const inviters = instance.pagedInviterRows
		assert.strictEqual(inviters.length, 1)
		assert.strictEqual(inviters[0].inGroup, true)
		assert.strictEqual(inviters[0].count, 15)
		assert.strictEqual(inviters[0].inviteCode, 'C00001')

		await instance.changeAccountSort({ order: 'ascending' })
		assert.strictEqual(instance.pagedAccountRows[0].id, '000000000000000000000001')
		await instance.changeAccountSort({ order: null })
		assert.strictEqual(instance.pagedAccountRows[0].id, '000000000000000000000016', '取消排序后回到默认倒序')

		await instance.toggleGroup('1.1.1.1')
		assert.strictEqual(instance.expandedIp, '', '再次点击收起')
	}

	// 4. 单个封禁与解封：状态表同步更新到账号行、邀请人行与分组标题
	{
		const { instance, rows } = await scanFixture()
		await instance.toggleGroup('1.1.1.1')
		const ownerId = '000000000000000000000001'

		instance.confirmStatusChange(ownerId, 'ban', '邀请人')
		await flush()
		await instance.runStatusChange([ownerId], 'ban')
		assert.strictEqual(rows[0].status, 3)
		assert.strictEqual(instance.pagedInviterRows[0].statusText, '已封禁')
		assert.strictEqual(instance.pagedInviterRows[0].canUnban, true)
		assert.strictEqual(instance.pagedAccountRows.find(row => row.id === ownerId).statusText, '已封禁')
		assert.strictEqual(instance.pagedGroups[0].bannedCount, 1)

		await instance.runStatusChange([ownerId], 'unban')
		assert.strictEqual(rows[0].status, 0)
		assert.strictEqual(instance.pagedGroups[0].bannedCount, 0)
	}

	// 5. 本组批量封禁只处理“正常”账号；禁止购买会员的账号保持不变
	{
		const { instance, rows, uniCalls } = await scanFixture()
		await instance.toggleGroup('2.2.2.2')
		assert.strictEqual(instance.expandedBannableCount, 4)
		instance.confirmBanGroup()
		const modal = uniCalls.modal[uniCalls.modal.length - 1]
		assert(/4 个状态为“正常”的账号（本组共 6 个/.test(modal.content), modal.content)
		modal.success({ confirm: true })
		await flush()
		await flush()
		const groupRows = rows.filter(row => row.register_ip === '2.2.2.2')
		assert.deepStrictEqual(groupRows.map(row => row.status).sort(), [1, 3, 3, 3, 3, 3])
		assert.strictEqual(instance.pagedGroups.find(group => group.ip === '2.2.2.2').bannedCount, 5)
		assert.strictEqual(instance.expandedBannableCount, 0)
		assert(/成功 4，跳过 0，失败 0，待确认 0/.test(instance.task.message), instance.task.message)
	}

	// 6. 写入后回读失败：结果标记为待确认，不显示成功，也不再提供封禁按钮
	{
		let failReads = false
		const { instance } = await scanFixture({ failGet: () => failReads })
		await instance.toggleGroup('3.3.3.3')
		const targetId = instance.pagedAccountRows[0].id
		failReads = true
		await instance.runStatusChange([targetId], 'ban')
		await flush()
		assert.strictEqual(instance.task.error, true)
		assert(/待确认 1/.test(instance.task.message))
		const row = instance.pagedAccountRows.find(item => item.id === targetId)
		assert.strictEqual(row.canBan, false)
		assert.strictEqual(row.canUnban, false)
		assert(instance.detailError, '补读失败时必须显示错误')
		failReads = false
		await instance.loadVisibleDetails(true)
		assert.strictEqual(instance.pagedAccountRows.find(item => item.id === targetId).statusText, '已封禁')
	}

	// 7. 写入期间不发起详情读取，避免旧状态覆盖新状态
	{
		const { instance, fake } = await scanFixture()
		instance.acting = true
		const before = fake.calls.get.length
		assert.strictEqual(await instance.loadDetails(['000000000000000000000002']), false)
		assert.strictEqual(fake.calls.get.length, before)
	}

	// 8. 修改页保存后刷新该账号
	{
		const { instance, rows, uniCalls } = await scanFixture()
		await instance.toggleGroup('3.3.3.3')
		const targetId = instance.pagedAccountRows[0].id
		instance.editAccount(targetId)
		const navigation = uniCalls.navigate[uniCalls.navigate.length - 1]
		assert.strictEqual(navigation.url, `/pages/member/users/edit?id=${targetId}`)
		rows.find(row => row._id === targetId).status = 1
		navigation.events.refreshData()
		await flush()
		assert.strictEqual(instance.pagedAccountRows.find(row => row.id === targetId).statusText, '禁止购买会员')
	}

	// 9. 取消检测：丢弃部分结果
	{
		let page
		const rows = Array.from({ length: 2500 }, (_, index) => ({
			_id: String(index + 1).padStart(24, '0'),
			register_ip: '5.5.5.5',
			register_date: at(1),
			status: 0
		}))
		const fake = createCollection(rows, { beforeGet: count => { if (count === 1) page.instance.cancelScan() } })
		page = loadComponent(fake.collection)
		page.instance.dateMode = 'manual'
		page.instance.manualDateRange = [DAY, DAY]
		await page.instance.startScan()
		assert.strictEqual(page.instance.scanning, false)
		assert.strictEqual(page.instance.groups.length, 0)
		assert.strictEqual(page.instance.scanMeta, null)
		assert(/检测已取消/.test(page.instance.task.message))
		assert.strictEqual(fake.calls.get.length, 1, '取消后不再读取后续页')
	}

	// 10. 检测失败：显示错误，不展示部分结果；再次检测会清空旧结果
	{
		const { instance, fake } = await scanFixture()
		assert.strictEqual(instance.groups.length, 3)
		await instance.toggleGroup('1.1.1.1')
		fake.options.failCount = () => true
		await instance.startScan()
		assert.strictEqual(instance.task.error, true)
		assert(/检测失败，未展示部分结果：连续 3 次读取失败/.test(instance.task.message), instance.task.message)
		assert.strictEqual(instance.groups.length, 0, '失败后不能保留上一次的结果')
		assert.strictEqual(instance.expandedIp, '')
		assert.strictEqual(instance.scanning, false)
	}

	// 11. 检测进行中再次点击“开始检测”不会并发发起第二次
	{
		const fake = createCollection(buildRows())
		const { instance } = loadComponent(fake.collection)
		instance.dateMode = 'manual'
		instance.manualDateRange = [DAY, DAY]
		const first = instance.startScan()
		await instance.startScan()
		await first
		assert.strictEqual(fake.calls.count, 1)
	}

	console.log('violation-register.page tests passed')
}

run().catch(error => {
	console.error(error)
	process.exit(1)
})

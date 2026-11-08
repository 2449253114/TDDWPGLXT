<template>
	<view class="page-container">
		<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<text class="page-title">僵尸号清理</text>
			<text class="page-subtitle">找出注册后只活跃了很短时间、此后长期不再出现的账号（多为分身或重置设备标识批量注册的小号），按分类封禁或删除</text>
			<view v-if="task.visible" class="task-panel" :class="{ error: task.error }">
				<view class="task-row">
					<text class="task-message">{{ task.message }}</text>
					<text v-if="task.metric" class="task-metric">{{ task.metric }}</text>
				</view>
				<view v-if="task.progress !== null" class="progress-track">
					<view class="progress-value" :style="{ width: task.progress + '%' }"></view>
				</view>
			</view>
		</uni-card>

		<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<text class="section-title">检测条件</text>
			<view class="condition-row">
				<text class="filter-label">注册起始日期</text>
				<uni-datetime-picker v-model="startDate" type="date" :end="businessToday" :clear-icon="false" :disabled="busy" />
			</view>

			<view class="option-row">
				<text class="filter-label">注册截止</text>
				<button
					v-for="months in monthOptions"
					:key="'months-' + months"
					size="mini"
					:class="['option-button', { active: endMode === 'months' && monthsOption === months }]"
					:disabled="busy"
					@click="setMonthsOption(months)"
				>
					{{ months }} 个月前
				</button>
				<button size="mini" :class="['option-button', { active: endMode === 'months' && monthsOption === 'custom' }]" :disabled="busy" @click="setMonthsOption('custom')">自定义月数</button>
				<button size="mini" :class="['option-button', { active: endMode === 'manual' }]" :disabled="busy" @click="setEndMode('manual')">手动日期</button>
			</view>
			<view v-if="endMode === 'months' && monthsOption === 'custom'" class="condition-row">
				<uni-easyinput v-model="customMonths" class="number-input" type="number" :disabled="busy" placeholder="月数" />
				<text>个月前</text>
			</view>
			<view v-if="endMode === 'manual'" class="condition-row">
				<text class="filter-label">截止日期（含当天）</text>
				<uni-datetime-picker v-model="endDate" type="date" :end="businessToday" :disabled="busy" />
			</view>

			<view class="option-row">
				<text class="filter-label">最后活跃距注册不超过</text>
				<button
					v-for="days in gapOptions"
					:key="'gap-' + days"
					size="mini"
					:class="['option-button', { active: gapOption === days }]"
					:disabled="busy"
					@click="setGapOption(days)"
				>
					{{ days }} 天
				</button>
				<button size="mini" :class="['option-button', { active: gapOption === 'custom' }]" :disabled="busy" @click="setGapOption('custom')">自定义天数</button>
			</view>
			<view v-if="gapOption === 'custom'" class="condition-row">
				<uni-easyinput v-model="customGapDays" class="number-input" type="number" :disabled="busy" placeholder="天数" />
				<text>天</text>
			</view>

			<text :class="['range-preview', { error: criteriaPreview.error }]">{{ criteriaPreview.text }}</text>
			<text class="inline-note">最后活跃时间取最后登录与最后在线中较晚者；只看最后登录会把不重新登录、只刷新在线时间的活跃用户误判为僵尸号。所有日期按北京时间计算。</text>
			<view class="button-row">
				<button type="primary" size="mini" :disabled="busy" @click="startScan">开始检测</button>
				<button v-if="scanning" size="mini" :disabled="cancelRequested" @click="cancelScan">{{ cancelRequested ? '正在取消…' : '取消检测' }}</button>
			</view>
		</uni-card>

		<uni-card v-if="scanMeta" :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<view class="section-heading">
				<text class="section-title">检测结果</text>
				<text class="section-subtitle">{{ scanMeta.conditionText }} · 完成于 {{ scanMeta.completedText }}</text>
			</view>
			<view class="stat-grid">
				<view class="stat-item">
					<text class="stat-number">{{ scanMeta.candidateCount }}</text>
					<text class="stat-label">预筛候选账号</text>
				</view>
				<view class="stat-item high">
					<text class="stat-number">{{ summary.total }}</text>
					<text class="stat-label">命中僵尸号</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ summary.actionable.invitee }}</text>
					<text class="stat-label">受邀小号（只封禁）</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ summary.actionable.inviter }}</text>
					<text class="stat-label">本身是邀请人（只封禁）</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ summary.actionable.none }}</text>
					<text class="stat-label">无邀请关系（可删除）</text>
				</view>
				<view class="stat-item normal">
					<text class="stat-number">{{ summary.protected.total }}</text>
					<text class="stat-label">受保护（付费 {{ summary.protected.paid }}，会员 {{ summary.protected.vip }}，内部 {{ summary.protected.internal }}）</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ handledCounts.banned }} / {{ handledCounts.deleted }}</text>
					<text class="stat-label">命中中已封禁 / 已删除</text>
				</view>
			</view>
			<text class="inline-note">处置规则：受邀小号只封禁，删除会让邀请人的受邀人数下降，再补回 50 人会重复触发 9999 天奖励；本身是邀请人的账号只封禁，删除会让其受邀者的邀请人变成“不存在”；无邀请关系的账号可以删除，真实用户日后回来只会注册新号。删除不清理其它表的关联数据。</text>

			<view class="option-row filter-row">
				<text class="filter-label">结果筛选</text>
				<button
					v-for="option in hitFilterOptions"
					:key="option.value"
					size="mini"
					:class="['option-button', { active: hitFilter === option.value }]"
					@click="setHitFilter(option.value)"
				>
					{{ option.label }}（{{ hitCountByFilter[option.value] }}）
				</button>
			</view>

			<view v-if="hitFilter !== 'protected'" class="batch-row">
				<button size="mini" type="warn" :disabled="actionLocked || !batchBanTargets.length" @click="confirmBatchBan">封禁当前筛选中的正常账号（{{ batchBanTargets.length }}）</button>
				<button v-if="hitFilter === 'none'" size="mini" type="warn" :disabled="actionLocked || !batchDeleteTargets.length" @click="confirmBatchDelete">删除当前筛选中的账号（{{ batchDeleteTargets.length }}）</button>
				<button v-if="acting" size="mini" :disabled="stopRequested" @click="stopAction">{{ stopRequested ? '正在停止…' : '处理完当前批次后停止' }}</button>
				<button size="mini" :disabled="actionLocked" @click="loadVisibleDetails(true)">刷新本页数据</button>
			</view>
			<view v-if="detailError" class="load-warning detail-error">
				<text>详情读取失败：{{ detailError }}</text>
				<button size="mini" :disabled="actionLocked" @click="loadVisibleDetails(true)">重试</button>
			</view>

			<view v-if="!filteredHits.length" class="empty-state">{{ hits.length ? '当前筛选下没有账号' : '没有符合条件的僵尸号' }}</view>
			<uni-table v-else border stripe>
				<uni-tr>
					<uni-th align="left">账号</uni-th>
					<uni-th width="130" align="center">分类</uni-th>
					<uni-th width="110" align="center">状态</uni-th>
					<uni-th width="160" align="center">注册时间</uni-th>
					<uni-th width="160" align="center">最后登录</uni-th>
					<uni-th width="160" align="center">最后在线</uni-th>
					<uni-th width="100" align="center">活跃间隔</uni-th>
					<uni-th width="110" align="center">邀请人邀请码</uni-th>
					<uni-th width="140" align="center">注册 IP</uni-th>
					<uni-th width="200" align="center">操作</uni-th>
				</uni-tr>
				<uni-tr v-for="row in hitRows" :key="row.id">
					<uni-td align="left">
						<text class="cell-main">{{ row.inviteCodeText }}</text>
						<text class="cell-sub">{{ row.id }}</text>
					</uni-td>
					<uni-td align="center">
						<text :class="['tag', row.protectReason ? 'safe' : 'category']">{{ row.categoryText }}</text>
					</uni-td>
					<uni-td align="center"><text :class="['status-text', row.statusClass]">{{ row.statusText }}</text></uni-td>
					<uni-td align="center">{{ row.registerTimeText }}</uni-td>
					<uni-td align="center">{{ row.loginTimeText }}</uni-td>
					<uni-td align="center">{{ row.onlineTimeText }}</uni-td>
					<uni-td align="center">{{ row.gapText }}</uni-td>
					<uni-td align="center">{{ row.inviterCodeText }}</uni-td>
					<uni-td align="center">{{ row.registerIp }}</uni-td>
					<uni-td align="center">
						<view class="action-buttons">
							<button v-if="row.canBan" size="mini" type="warn" :disabled="actionLocked" @click="confirmSingleBan(row.id)">封禁</button>
							<button v-if="row.canUnban" size="mini" :disabled="actionLocked" @click="confirmUnban(row.id)">解封</button>
							<button v-if="row.canDelete" size="mini" type="warn" :disabled="actionLocked" @click="confirmSingleDelete(row.id)">删除</button>
							<button v-if="row.exists" size="mini" type="primary" :disabled="busy" @click="editAccount(row.id)">修改</button>
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>
			<view v-if="filteredHits.length > hitPageSize" class="pagination-row">
				<uni-pagination show-icon :page-size="hitPageSize" :current="hitPage" :total="filteredHits.length" @change="changeHitPage" />
			</view>
		</uni-card>

		<uni-card v-if="scanMeta" :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<view class="section-heading">
				<text class="section-title">受益邀请人（{{ beneficiaries.length }} 位）</text>
				<text class="section-subtitle">按名下可处置的命中受邀小号数排序。处理小号不会收回邀请人已获得的会员，需要到违规邀请检测页核实处理</text>
			</view>
			<view v-if="!beneficiaries.length" class="empty-state small">命中账号中没有受邀小号</view>
			<uni-table v-else border stripe>
				<uni-tr>
					<uni-th align="left">邀请人</uni-th>
					<uni-th width="120" align="center">命中受邀小号</uni-th>
					<uni-th width="110" align="center">状态</uni-th>
					<uni-th width="170" align="center">会员到期</uni-th>
					<uni-th width="220" align="center">操作</uni-th>
				</uni-tr>
				<uni-tr v-for="row in beneficiaryRows" :key="row.id">
					<uni-td align="left">
						<text class="cell-main">{{ row.inviteCodeText }}</text>
						<text class="cell-sub">{{ row.id }}</text>
					</uni-td>
					<uni-td align="center">{{ row.count }} 个</uni-td>
					<uni-td align="center"><text :class="['status-text', row.statusClass]">{{ row.statusText }}</text></uni-td>
					<uni-td align="center">{{ row.vipText }}</uni-td>
					<uni-td align="center">
						<view class="action-buttons">
							<button v-if="row.inviteCode" size="mini" :disabled="busy" @click="openInvitationCheck(row.inviteCode)">检测违规邀请</button>
							<button v-if="row.exists" size="mini" type="primary" :disabled="busy" @click="editAccount(row.id)">修改</button>
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>
			<view v-if="beneficiaries.length > beneficiaryPageSize" class="pagination-row">
				<uni-pagination show-icon :page-size="beneficiaryPageSize" :current="beneficiaryPage" :total="beneficiaries.length" @change="changeBeneficiaryPage" />
			</view>
		</uni-card>
	</view>
</template>

<script>
	const {
		DEFAULT_START_DATE,
		PERMANENT_VIP_MS,
		ZOMBIE_CATEGORIES,
		PROTECT_REASONS,
		HIT_FILTERS,
		resolveZombieCriteria,
		isZombie,
		classifyZombies,
		summarizeZombies,
		filterHits,
		rankBeneficiaries,
		formatDuration,
		buildBanTag
	} = require('./zombie-accounts.utils.js')
	const {
		countZombieCandidates,
		scanZombieCandidates,
		loadPaidUserIds,
		findInviterIds,
		banZombieAccounts,
		deleteZombieAccounts
	} = require('./zombie-accounts.data.js')
	const {
		getErrorMessage,
		readAccountsByIds,
		changeAccountStatus
	} = require('../violation-register/violation-register.data.js')
	const { paginate, getStatusText, toIdString } = require('../violation-register/violation-register.utils.js')
	const { formatBusinessTimestamp, getBusinessDayKey } = require('../violation-invitation-v2/violation-invitation-v2.scan.js')

	const db = uniCloud.database()
	const userContext = { collection: db.collection('user-accounts'), dbCmd: db.command }
	const ordersContext = { collection: db.collection('user-payment-orders'), dbCmd: db.command }

	/** 展开当前页时读取的详情字段。 */
	const DETAIL_FIELDS = {
		_id: true,
		my_invite_code: true,
		register_ip: true,
		status: true,
		vip_expire_date: true,
		description: true
	}
	/** 已读取但数据库中不存在的账号（被删除）。 */
	const MISSING_ACCOUNT = Object.freeze({ missing: true })
	const EMPTY_LIST = Object.freeze([])
	const DELETE_CONFIRM_TEXT = '确认删除'
	const STATUS_CLASS = { 0: 'normal', 1: 'restricted', 2: 'reviewing', 3: 'banned' }

	function formatTime(value) {
		return formatBusinessTimestamp(value) || '无'
	}

	export default {
		data() {
			const now = Date.now()
			return {
				startDate: DEFAULT_START_DATE,
				endMode: 'months',
				monthOptions: [3, 4, 5, 6, 12],
				monthsOption: 3,
				customMonths: '',
				endDate: '',
				gapOptions: [1, 3, 10, 30],
				gapOption: 3,
				customGapDays: '',
				businessToday: getBusinessDayKey(now),
				// 条件预览的参考时刻；只用于显示，实际检测以点击“开始检测”的时刻为准
				previewNow: now,
				hitFilterOptions: [
					{ value: 'actionable', label: '全部可处置' },
					{ value: 'invitee', label: ZOMBIE_CATEGORIES.invitee },
					{ value: 'inviter', label: ZOMBIE_CATEGORIES.inviter },
					{ value: 'none', label: ZOMBIE_CATEGORIES.none },
					{ value: 'protected', label: '受保护' }
				],
				hitFilter: 'actionable',
				scanning: false,
				cancelRequested: false,
				acting: false,
				stopRequested: false,
				detailLoading: false,
				detailError: '',
				task: { visible: false, message: '', metric: '', progress: null, error: false },
				scanMeta: null,
				summary: null,
				// 冻结数组：命中账号可达数万条，不让 Vue 2 建立响应式
				hits: EMPTY_LIST,
				beneficiaries: EMPTY_LIST,
				hitPage: 1,
				hitPageSize: 50,
				beneficiaryPage: 1,
				beneficiaryPageSize: 10,
				// 状态与详情存放在非响应式 Map 中，变更后递增版本号触发相关计算属性重新计算
				statusVersion: 0,
				detailVersion: 0
			}
		},
		created() {
			// 以下属性故意不放进 data：数据量大，不能被 Vue 2 深度观察
			this.statusById = new Map() // 账号最新状态：数字为 status，null 表示已删除，缺失表示未知
			this.detailById = new Map() // 已读取的详情；MISSING_ACCOUNT 表示已不存在
			this.scanToken = 0
			this.detailToken = 0
		},
		onShow() {
			this.previewNow = Date.now()
			this.businessToday = getBusinessDayKey(this.previewNow)
		},
		onUnload() {
			// 离开页面时让进行中的扫描与详情读取停止，批量处置在当前批次结束后停止
			this.scanToken++
			this.detailToken++
			this.stopRequested = true
		},
		computed: {
			busy() {
				return this.scanning || this.acting
			},
			/** 处置按钮在详情读取期间也锁定，避免读回的旧状态覆盖刚写入的新状态。 */
			actionLocked() {
				return this.busy || this.detailLoading
			},
			criteriaInput() {
				return {
					startDate: this.startDate,
					endMode: this.endMode,
					months: this.monthsOption === 'custom' ? this.customMonths : this.monthsOption,
					endDate: this.endDate,
					gapDays: this.gapOption === 'custom' ? this.customGapDays : this.gapOption
				}
			},
			criteriaPreview() {
				try {
					const criteria = resolveZombieCriteria({ ...this.criteriaInput, confirmedAt: this.previewNow })
					return { error: false, text: `将检测：${this.describeCriteria(criteria)}` }
				} catch (error) {
					return { error: true, text: getErrorMessage(error) }
				}
			},
			filteredHits() {
				return filterHits(this.hits, this.hitFilter)
			},
			hitCountByFilter() {
				const counts = {}
				Object.keys(HIT_FILTERS).forEach(key => {
					counts[key] = filterHits(this.hits, key).length
				})
				return counts
			},
			pagedHits() {
				return paginate(this.filteredHits, this.hitPage, this.hitPageSize)
			},
			pagedBeneficiaries() {
				return paginate(this.beneficiaries, this.beneficiaryPage, this.beneficiaryPageSize)
			},
			/** 当前筛选中仍为正常状态的账号；受保护筛选下不提供批量处置。 */
			batchBanTargets() {
				if (this.hitFilter === 'protected') return EMPTY_LIST
				return this.filteredHits.filter(hit => this.statusOf(hit.id) === 0)
			},
			/** 只有“无邀请关系”筛选允许批量删除；已删除的不再计入。 */
			batchDeleteTargets() {
				if (this.hitFilter !== 'none') return EMPTY_LIST
				return this.filteredHits.filter(hit => typeof this.statusOf(hit.id) === 'number')
			},
			handledCounts() {
				let banned = 0
				let deleted = 0
				this.hits.forEach(hit => {
					const status = this.statusOf(hit.id)
					if (status === 3) banned++
					else if (status === null) deleted++
				})
				return { banned, deleted }
			},
			hitRows() {
				return this.pagedHits.map(hit => {
					const detail = this.detailOf(hit.id)
					const exists = Boolean(detail && !detail.missing)
					const status = this.statusOf(hit.id)
					const handlable = !hit.protectReason
					return {
						id: hit.id,
						protectReason: hit.protectReason,
						categoryText: hit.protectReason
							? `受保护：${PROTECT_REASONS[hit.protectReason]}`
							: ZOMBIE_CATEGORIES[hit.category] + (hit.selfInvited ? '（自邀异常）' : ''),
						inviteCodeText: this.describeInviteCode(detail),
						registerTimeText: formatTime(hit.registerDate),
						loginTimeText: formatTime(hit.loginDate),
						onlineTimeText: formatTime(hit.onlineDate),
						gapText: formatDuration(hit.activeGapMs),
						inviterCodeText: this.describeInviterCode(hit),
						registerIp: exists ? (detail.register_ip || '无') : '—',
						exists,
						...this.buildStatusView(status, detail),
						canBan: handlable && exists && status === 0,
						canUnban: exists && status === 3,
						canDelete: handlable && exists && hit.category === 'none' && typeof status === 'number'
					}
				})
			},
			beneficiaryRows() {
				const now = this.previewNow
				return this.pagedBeneficiaries.map(entry => {
					const detail = this.detailOf(entry.inviterId)
					const exists = Boolean(detail && !detail.missing)
					const vipExpire = exists ? Number(detail.vip_expire_date) || 0 : 0
					let vipText = '—'
					if (exists) {
						if (vipExpire - now > PERMANENT_VIP_MS) vipText = '永久会员'
						else if (vipExpire > now) vipText = formatTime(vipExpire)
						else vipText = '已过期或无会员'
					}
					return {
						id: entry.inviterId,
						count: entry.count,
						exists,
						inviteCode: exists && detail.my_invite_code ? String(detail.my_invite_code) : '',
						inviteCodeText: this.describeInviteCode(detail),
						vipText,
						...this.buildStatusView(this.statusOf(entry.inviterId), detail)
					}
				})
			}
		},
		methods: {
			/**
			 * 读取状态表与详情缓存。二者是非响应式 Map，先读取对应版本号，
			 * 让调用它的计算属性在版本号递增时重新计算；条件判断保证这次读取不会被压缩工具当作无用代码删除。
			 */
			statusOf(id) {
				return this.statusVersion >= 0 ? this.statusById.get(id) : undefined
			},
			detailOf(id) {
				return this.detailVersion >= 0 ? this.detailById.get(id) : undefined
			},
			setTask(message, options = {}) {
				this.task = {
					visible: true,
					message,
					metric: options.metric || '',
					progress: options.progress === undefined ? null : options.progress,
					error: Boolean(options.error)
				}
			},
			refreshPreviewTime() {
				this.previewNow = Date.now()
				this.businessToday = getBusinessDayKey(this.previewNow)
			},
			setMonthsOption(value) {
				if (this.busy) return
				this.endMode = 'months'
				this.monthsOption = value
				this.refreshPreviewTime()
			},
			setEndMode(mode) {
				if (this.busy) return
				this.endMode = mode
				this.refreshPreviewTime()
			},
			setGapOption(value) {
				if (this.busy) return
				this.gapOption = value
				this.refreshPreviewTime()
			},
			describeCriteria(criteria) {
				return `注册于 ${criteria.startDate} 00:00:00 至 ${criteria.endDate} 23:59:59（北京时间），且最后活跃距注册不超过 ${criteria.gapDays} 天`
			},
			describeInviteCode(detail) {
				if (!detail) return '加载中…'
				if (detail.missing) return '账号已删除'
				return detail.my_invite_code || '未设置邀请码'
			},
			describeInviterCode(hit) {
				if (hit.selfInvited) return '自己（数据异常）'
				if (!hit.inviterId) return '无'
				const detail = this.detailOf(hit.inviterId)
				if (!detail) return '加载中…'
				if (detail.missing) return '邀请人已删除'
				return detail.my_invite_code || '未设置'
			},
			buildStatusView(status, detail) {
				let statusText
				if (status === null) statusText = '已删除'
				else if (status === undefined) statusText = detail ? '状态未知' : '加载中…'
				else statusText = getStatusText(status)
				return {
					statusText,
					statusClass: status === null ? 'banned' : STATUS_CLASS[status] || 'unknown'
				}
			},
			resetResults() {
				this.detailToken++
				this.statusById = new Map()
				this.detailById = new Map()
				this.hits = EMPTY_LIST
				this.beneficiaries = EMPTY_LIST
				this.summary = null
				this.scanMeta = null
				this.hitPage = 1
				this.beneficiaryPage = 1
				this.detailLoading = false
				this.detailError = ''
				this.statusVersion++
				this.detailVersion++
			},
			async startScan() {
				if (this.busy) return
				const scanStartedAt = Date.now()
				this.previewNow = scanStartedAt
				this.businessToday = getBusinessDayKey(scanStartedAt)
				let criteria
				try {
					criteria = resolveZombieCriteria({ ...this.criteriaInput, confirmedAt: scanStartedAt })
				} catch (error) {
					uni.showToast({ title: getErrorMessage(error), icon: 'none' })
					return
				}

				const token = ++this.scanToken
				const isCancelled = () => token !== this.scanToken
				const onRetry = attempt => !isCancelled() && this.setTask(`读取失败，正在第 ${attempt} 次尝试`, { progress: this.task.progress, metric: this.task.metric })
				const readOptions = { isCancelled, onRetry }
				this.resetResults()
				this.scanning = true
				this.cancelRequested = false
				this.setTask('正在统计候选账号数')

				try {
					const expectedCount = await countZombieCandidates(userContext, criteria, readOptions)
					if (isCancelled()) return
					this.setTask('正在读取候选账号', { progress: 0, metric: `0 / ${expectedCount}` })
					const candidates = await scanZombieCandidates(userContext, criteria, {
						...readOptions,
						onPage: loaded => this.setTask('正在读取候选账号', {
							progress: Math.min(99, Math.floor(loaded / Math.max(expectedCount, 1) * 100)),
							metric: `${loaded} / ${expectedCount}`
						})
					})

					this.setTask('正在读取付费订单')
					const paidUserIds = await loadPaidUserIds(ordersContext, readOptions)
					if (isCancelled()) return

					const hitIds = candidates.filter(account => isZombie(account, criteria)).map(account => toIdString(account._id))
					this.setTask('正在核对命中账号是否为邀请人', { progress: 0, metric: `0 / ${hitIds.length}` })
					const inviterIds = await findInviterIds(userContext, hitIds, {
						...readOptions,
						onProgress: (done, total) => !isCancelled() && this.setTask('正在核对命中账号是否为邀请人', {
							progress: Math.floor(done / Math.max(total, 1) * 100),
							metric: `${done} / ${total}`
						})
					})
					if (isCancelled()) return

					const { hits, candidateCount } = classifyZombies(candidates, criteria, { paidUserIds, inviterIds, now: scanStartedAt })
					hits.forEach(hit => this.statusById.set(hit.id, hit.status))
					this.hits = Object.freeze(hits)
					this.beneficiaries = Object.freeze(rankBeneficiaries(hits))
					this.summary = summarizeZombies(hits)
					this.scanMeta = {
						criteria,
						scanStartedAt,
						candidateCount,
						conditionText: this.describeCriteria(criteria),
						completedText: formatBusinessTimestamp(Date.now())
					}
					this.statusVersion++
					this.setTask(`检测完成：命中 ${hits.length} 个，其中可处置 ${this.summary.actionable.total} 个、受保护 ${this.summary.protected.total} 个`, {
						metric: `候选 ${candidateCount} 个`
					})
					this.loadVisibleDetails(false)
				} catch (error) {
					if (error && error.cancelled) return
					console.error('僵尸号检测失败:', error)
					this.resetResults()
					this.setTask(`检测失败，未展示部分结果：${getErrorMessage(error)}`, { error: true })
				} finally {
					if (isCancelled()) {
						// 被取消或页面已卸载：丢弃本次全部数据，不展示部分结果
						this.resetResults()
						this.setTask('检测已取消，未保留部分结果')
					}
					this.scanning = false
					this.cancelRequested = false
				}
			},
			cancelScan() {
				if (!this.scanning || this.cancelRequested) return
				this.cancelRequested = true
				this.scanToken++
				this.setTask('正在取消，等待当前请求结束…', { progress: this.task.progress, metric: this.task.metric })
			},
			setHitFilter(value) {
				this.hitFilter = value
				this.hitPage = 1
				return this.loadVisibleDetails(false)
			},
			changeHitPage(event) {
				this.hitPage = event.current
				return this.loadVisibleDetails(false)
			},
			changeBeneficiaryPage(event) {
				this.beneficiaryPage = event.current
				return this.loadVisibleDetails(false)
			},
			/**
			 * 读取当前页命中账号、它们的邀请人以及当前页受益邀请人的详情。
			 * @param {boolean} force - true 时重新读取全部可见账号；false 时只读取尚未读过的
			 */
			loadVisibleDetails(force) {
				const ids = new Set()
				this.pagedHits.forEach(hit => {
					ids.add(hit.id)
					if (hit.inviterId) ids.add(hit.inviterId)
				})
				this.pagedBeneficiaries.forEach(entry => ids.add(entry.inviterId))
				return this.loadDetails(Array.from(ids).filter(id => force || !this.detailById.has(id)))
			},
			/**
			 * 读取指定账号的详情并更新状态表。
			 * 封禁、删除执行期间不发起读取（返回 false），由执行结束后统一补读，避免读回的旧状态覆盖新状态。
			 * @returns {Promise<boolean>} 是否已读取并应用
			 */
			async loadDetails(ids) {
				if (!ids.length) return true
				if (this.acting) return false
				const token = ++this.detailToken
				this.detailLoading = true
				this.detailError = ''
				try {
					const rows = await readAccountsByIds(userContext, ids, DETAIL_FIELDS)
					if (token !== this.detailToken) return false
					ids.forEach(id => {
						const row = rows.get(id)
						if (row) {
							this.detailById.set(id, row)
							this.statusById.set(id, Number(row.status))
						} else {
							this.detailById.set(id, MISSING_ACCOUNT)
							this.statusById.set(id, null)
						}
					})
					this.detailVersion++
					this.statusVersion++
					return true
				} catch (error) {
					if (token !== this.detailToken) return false
					console.error('读取账号详情失败:', error)
					this.detailError = getErrorMessage(error)
					return false
				} finally {
					if (token === this.detailToken) this.detailLoading = false
				}
			},
			findHit(id) {
				return this.hits.find(hit => hit.id === id)
			},
			confirmSingleBan(id) {
				const hit = this.findHit(id)
				if (!hit || this.actionLocked) return
				uni.showModal({
					title: '确认封禁',
					content: `将封禁账号 ${id}（正常 → 已封禁），并在备注中写入本次清理标记。是否继续？`,
					success: result => {
						if (result && result.confirm) this.runAction('ban', [hit])
					}
				})
			},
			confirmBatchBan() {
				const targets = this.batchBanTargets
				if (!targets.length || this.actionLocked) return
				const label = this.hitFilterOptions.find(option => option.value === this.hitFilter).label
				uni.showModal({
					title: '确认批量封禁',
					content: `将封禁“${label}”中 ${targets.length} 个正常状态的账号，并在备注中写入本次清理标记。扫描后有活动或已有备注的账号会自动跳过。是否继续？`,
					success: result => {
						if (result && result.confirm) this.runAction('ban', targets.slice())
					}
				})
			},
			confirmSingleDelete(id) {
				const hit = this.findHit(id)
				if (!hit || this.actionLocked || hit.category !== 'none' || hit.protectReason) return
				uni.showModal({
					title: '确认删除',
					content: `将永久删除账号 ${id}，无法恢复，也不会清理它在其它表的数据。是否继续？`,
					success: result => {
						if (result && result.confirm) this.runAction('delete', [hit])
					}
				})
			},
			confirmBatchDelete() {
				const targets = this.batchDeleteTargets
				if (!targets.length || this.actionLocked) return
				uni.showModal({
					title: '确认批量删除',
					content: `将永久删除 ${targets.length} 个无邀请关系的僵尸号，无法恢复。请输入“${DELETE_CONFIRM_TEXT}”继续。`,
					editable: true,
					placeholderText: `请输入：${DELETE_CONFIRM_TEXT}`,
					success: result => {
						if (!result || !result.confirm) return
						if (String(result.content || '').trim() !== DELETE_CONFIRM_TEXT) {
							uni.showToast({ title: '输入不正确，已取消删除', icon: 'none' })
							return
						}
						this.runAction('delete', targets.slice())
					}
				})
			},
			confirmUnban(id) {
				if (this.actionLocked) return
				uni.showModal({
					title: '确认解封',
					content: `将解封账号 ${id}（已封禁 → 正常），备注中的清理标记会保留作为记录。是否继续？`,
					success: async result => {
						if (!result || !result.confirm) return
						if (this.actionLocked) {
							uni.showToast({ title: '正在读取或处理数据，请稍后再试', icon: 'none' })
							return
						}
						this.acting = true
						this.setTask('正在解封 1 个账号')
						let outcome
						try {
							outcome = await changeAccountStatus(userContext, [id], 'unban')
						} catch (error) {
							this.setTask(`解封失败：${getErrorMessage(error)}`, { error: true })
							return
						} finally {
							this.acting = false
						}
						this.applyOutcome(outcome)
						this.reportOutcome('解封', outcome)
						this.loadVisibleDetails(false)
					}
				})
			},
			stopAction() {
				if (!this.acting || this.stopRequested) return
				this.stopRequested = true
				this.setTask('将在当前批次处理完后停止…', { progress: this.task.progress, metric: this.task.metric })
			},
			/**
			 * 执行封禁或删除，并把回读结果写回状态表。
			 * @param {'ban'|'delete'} action
			 * @param {Array} hits - 命中账号（需要 id 与 hasOnlineField）
			 */
			async runAction(action, hits) {
				if (!this.scanMeta) {
					uni.showToast({ title: '检测结果已失效，请重新检测', icon: 'none' })
					return
				}
				if (this.actionLocked) {
					uni.showToast({ title: '正在读取或处理数据，请稍后再试', icon: 'none' })
					return
				}
				const label = action === 'ban' ? '封禁' : '删除'
				const guard = {
					criteria: this.scanMeta.criteria,
					scanStartedAt: this.scanMeta.scanStartedAt,
					tag: buildBanTag(this.scanMeta.criteria, formatBusinessTimestamp(Date.now()))
				}
				const execute = action === 'ban' ? banZombieAccounts : deleteZombieAccounts
				this.acting = true
				this.stopRequested = false
				this.setTask(`正在${label} ${hits.length} 个账号`, { progress: 0, metric: `0 / ${hits.length}` })
				let outcome
				try {
					outcome = await execute(userContext, hits, guard, {
						isStopped: () => this.stopRequested,
						onChunk: (done, total) => this.setTask(`正在${label} ${total} 个账号`, {
							progress: Math.floor(done / Math.max(total, 1) * 100),
							metric: `${done} / ${total}`
						})
					})
				} catch (error) {
					console.error(`${label}失败:`, error)
					this.setTask(`${label}失败：${getErrorMessage(error)}`, { error: true })
					return
				} finally {
					this.acting = false
					this.stopRequested = false
				}
				this.applyOutcome(outcome)
				this.reportOutcome(label, outcome)
				// 补读执行期间被推迟的详情，以及结果待确认、需要重新核对的账号
				this.loadVisibleDetails(false)
			},
			/** 把回读结果写回状态表：已删除记为 null；结果待确认的清掉缓存，强制重新读取。 */
			applyOutcome(outcome) {
				;['success', 'skipped', 'failed'].forEach(type => {
					outcome[type].forEach(item => {
						if (item.status === null) {
							this.statusById.set(item.id, null)
							this.detailById.set(item.id, MISSING_ACCOUNT)
						} else if (item.status !== undefined) {
							this.statusById.set(item.id, item.status)
							// 详情里的备注、状态已过时，下次显示时重新读取
							this.detailById.delete(item.id)
						}
					})
				})
				outcome.uncertain.forEach(item => {
					this.statusById.delete(item.id)
					this.detailById.delete(item.id)
				})
				this.statusVersion++
				this.detailVersion++
			},
			reportOutcome(label, outcome) {
				const notProcessed = outcome.notProcessed ? outcome.notProcessed.length : 0
				const counts = `成功 ${outcome.success.length}，跳过 ${outcome.skipped.length}，失败 ${outcome.failed.length}，待确认 ${outcome.uncertain.length}` +
					(notProcessed ? `，停止后未处理 ${notProcessed}` : '')
				const hasError = Boolean(outcome.failed.length || outcome.uncertain.length)
				this.setTask(`${label}完成：${counts}`, { error: hasError })
				const problems = outcome.failed.concat(outcome.uncertain, outcome.skipped)
				const details = problems.slice(0, 5).map(item => `${item.id}：${item.reason}`).join('\n')
				const uncertainTip = outcome.uncertain.length ? '\n结果待确认的账号请稍后点击“刷新本页数据”核对，不要立即重复操作。' : ''
				uni.showModal({
					title: `${label}结果`,
					content: `${counts}${details ? '\n' + details : ''}${problems.length > 5 ? '\n……' : ''}${uncertainTip}`,
					showCancel: false
				})
			},
			editAccount(id) {
				uni.navigateTo({
					url: `/pages/member/users/edit?id=${encodeURIComponent(id)}`,
					events: {
						// 用户编辑页保存成功后会触发 refreshData，此时重新读取该账号的状态与详情
						refreshData: () => {
							this.loadDetails([id]).then(ok => {
								if (!ok) uni.showToast({ title: '账号已修改，但刷新失败，请点击“刷新本页数据”', icon: 'none' })
							})
						}
					}
				})
			},
			openInvitationCheck(inviteCode) {
				uni.navigateTo({
					url: `/pages/other/violation-invitation-v2/violation-invitation-v2?inviteCode=${encodeURIComponent(inviteCode)}`
				})
			}
		}
	}
</script>

<style lang="scss">
	.page-container {
		padding: 12px;
	}

	.section-heading {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.page-title {
		display: block;
		font-size: 18px;
		font-weight: 700;
		color: #303133;
	}

	.page-subtitle,
	.section-subtitle {
		display: block;
		margin-top: 4px;
		font-size: 13px;
		color: #909399;
	}

	.section-title {
		display: block;
		font-size: 15px;
		font-weight: 700;
		color: #303133;
	}

	.filter-label {
		font-size: 13px;
		color: #606266;
	}

	.task-panel {
		margin-top: 14px;
		padding: 10px 12px;
		border-radius: 6px;
		background: #ecf5ff;
		color: #409eff;
	}

	.task-panel.error {
		background: #fef0f0;
		color: #f56c6c;
	}

	.task-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px;
		font-size: 13px;
	}

	.task-metric {
		font-weight: 700;
		white-space: nowrap;
	}

	.progress-track {
		height: 6px;
		margin-top: 8px;
		overflow: hidden;
		border-radius: 3px;
		background: rgba(64, 158, 255, 0.2);
	}

	.progress-value {
		height: 100%;
		background: currentColor;
		transition: width 0.2s ease;
	}

	.option-row,
	.button-row,
	.condition-row,
	.batch-row,
	.action-buttons {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.option-row,
	.condition-row {
		margin-top: 10px;
		font-size: 13px;
		color: #606266;
	}

	.option-button {
		margin: 0;
		border: 1px solid #dcdfe6;
		background: #fff;
		color: #606266;
	}

	.option-button.active {
		border-color: #409eff;
		background: #409eff;
		color: #fff;
	}

	.number-input {
		width: 120px;
		flex: none;
	}

	.range-preview {
		display: block;
		margin-top: 12px;
		font-size: 13px;
		color: #303133;
	}

	.range-preview.error {
		color: #f56c6c;
	}

	.inline-note {
		display: block;
		margin-top: 6px;
		font-size: 12px;
		line-height: 1.6;
		color: #909399;
	}

	.button-row,
	.batch-row {
		margin-top: 12px;
	}

	.action-buttons button,
	.button-row button,
	.batch-row button {
		margin: 0;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 10px;
		margin-top: 12px;
	}

	.stat-item {
		padding: 10px 12px;
		border-radius: 6px;
		background: #f4f4f5;
	}

	.stat-item.high { background: #fef0f0; color: #f56c6c; }
	.stat-item.normal { background: #f0f9eb; color: #67c23a; }

	.stat-number {
		display: block;
		font-size: 22px;
		font-weight: 700;
	}

	.stat-label {
		display: block;
		margin-top: 2px;
		font-size: 12px;
		color: #606266;
	}

	.load-warning {
		margin-top: 10px;
		padding: 8px 12px;
		border-radius: 6px;
		background: #fdf6ec;
		font-size: 13px;
		color: #b88230;
	}

	.detail-error {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		background: #fef0f0;
		color: #f56c6c;
	}

	.filter-row {
		margin: 14px 0 0;
	}

	.empty-state {
		padding: 24px 0;
		text-align: center;
		font-size: 13px;
		color: #909399;
	}

	.empty-state.small {
		padding: 10px 0;
	}

	.cell-main {
		display: block;
		color: #303133;
	}

	.cell-sub {
		display: block;
		font-size: 12px;
		color: #909399;
		word-break: break-all;
	}

	.tag {
		display: inline-block;
		padding: 1px 6px;
		border-radius: 4px;
		font-size: 12px;
	}

	.tag.category {
		background: #fdf6ec;
		color: #e6a23c;
	}

	.tag.safe {
		background: #f0f9eb;
		color: #67c23a;
	}

	.status-text.normal { color: #67c23a; }
	.status-text.restricted { color: #e6a23c; }
	.status-text.reviewing { color: #409eff; }
	.status-text.banned { color: #f56c6c; font-weight: 700; }
	.status-text.unknown { color: #909399; }

	.pagination-row {
		display: flex;
		justify-content: center;
		margin-top: 12px;
	}
</style>

<template>
	<view class="page-container">
		<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<view class="page-heading">
				<view>
					<text class="page-title">违规注册检测</text>
					<text class="page-subtitle">统计时间范围内注册的账号，按注册 IP 分组，找出同一 IP 批量注册的账号</text>
				</view>
				<view class="thresholds">
					<text class="threshold-label">同 IP 账号数</text>
					<text class="risk-pill normal">低风险 2–{{ normalMax }}</text>
					<text class="risk-pill medium">中风险 {{ normalMax + 1 }}–{{ highMin - 1 }}</text>
					<text class="risk-pill high">高风险 ≥{{ highMin }}</text>
				</view>
			</view>

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
			<text class="section-title">注册时间范围</text>
			<view class="option-row">
				<button
					v-for="option in dateOptions"
					:key="option.value"
					size="mini"
					:class="['option-button', { active: dateMode === option.value }]"
					:disabled="busy"
					@click="setDateMode(option.value)"
				>
					{{ option.label }}
				</button>
			</view>
			<view v-if="dateMode === 'custom'" class="condition-row">
				<uni-easyinput
					v-model="customDays"
					class="days-input"
					type="number"
					:disabled="busy"
					placeholder="请输入天数"
					@confirm="startScan"
				/>
				<text>天内（含今天）</text>
			</view>
			<view v-if="dateMode === 'manual'" class="condition-row">
				<uni-datetime-picker
					v-model="manualDateRange"
					type="daterange"
					range-separator="至"
					:end="businessToday"
					:disabled="busy"
				/>
			</view>
			<text :class="['range-preview', { error: rangePreview.error }]">{{ rangePreview.text }}</text>
			<text class="inline-note">按北京时间自然日计算。只统计范围内注册的账号，同一 IP 在范围外注册的账号不计入；只按注册 IP 分组，最后登录 IP 仅作展示。</text>
			<view class="button-row">
				<button type="primary" size="mini" :disabled="busy" @click="startScan">开始检测</button>
				<button v-if="scanning" size="mini" :disabled="cancelRequested" @click="cancelScan">
					{{ cancelRequested ? '正在取消…' : '取消检测' }}
				</button>
			</view>
		</uni-card>

		<uni-card v-if="scanMeta" :is-shadow="false" :is-full="false" :border="true" margin="0 0 12px 0">
			<view class="section-heading">
				<text class="section-title">检测结果</text>
				<text class="section-subtitle">{{ scanMeta.rangeText }} · 完成于 {{ scanMeta.completedText }}</text>
			</view>

			<view class="stat-grid">
				<view class="stat-item">
					<text class="stat-number">{{ scanMeta.scannedCount }}</text>
					<text class="stat-label">范围内注册账号</text>
				</view>
				<view class="stat-item high">
					<text class="stat-number">{{ summary.high.groupCount }}</text>
					<text class="stat-label">高风险 IP（{{ summary.high.accountCount }} 个账号）</text>
				</view>
				<view class="stat-item medium">
					<text class="stat-number">{{ summary.medium.groupCount }}</text>
					<text class="stat-label">中风险 IP（{{ summary.medium.accountCount }} 个账号）</text>
				</view>
				<view class="stat-item normal">
					<text class="stat-number">{{ summary.normal.groupCount }}</text>
					<text class="stat-label">低风险 IP（{{ summary.normal.accountCount }} 个账号）</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ summary.mediumHighInviterCount }}</text>
					<text class="stat-label">中高风险组涉及邀请人（去重）</text>
				</view>
			</view>
			<view v-if="scanMeta.invalidIpCount" class="load-warning">
				{{ scanMeta.invalidIpCount }} 个账号的注册 IP 为空或格式无效，未参与分组。
			</view>
			<view v-if="scanMeta.expectedCount !== scanMeta.scannedCount" class="load-warning">
				开始时统计到 {{ scanMeta.expectedCount }} 个账号，实际读取 {{ scanMeta.scannedCount }} 个，差异通常来自扫描期间账号被删除。
			</view>

			<view class="option-row filter-row">
				<text class="filter-label">风险筛选</text>
				<button
					v-for="option in riskFilterOptions"
					:key="option.value"
					size="mini"
					:class="['option-button', { active: riskFilter === option.value }]"
					@click="setRiskFilter(option.value)"
				>
					{{ option.label }}（{{ groupCountByFilter[option.value] }}）
				</button>
			</view>

			<view v-if="!filteredGroups.length" class="empty-state">
				{{ groups.length ? '当前筛选下没有分组，可切换到“全部”查看低风险分组' : '本次范围内没有多个账号共用同一注册 IP' }}
			</view>

			<view
				v-for="group in pagedGroups"
				:key="group.ip"
				:class="['ip-group', group.riskLevel, { expanded: group.ip === expandedIp }]"
			>
				<view class="ip-group-header" @click="toggleGroup(group.ip)">
					<view class="ip-group-title">
						<text class="ip-text">{{ group.ip }}</text>
						<text :class="['risk-pill', group.riskLevel]">{{ group.riskText }}</text>
					</view>
					<view class="ip-group-meta">
						<text>{{ group.count }} 个账号</text>
						<text :class="{ 'banned-count': group.bannedCount }">已封禁 {{ group.bannedCount }}</text>
						<text>{{ group.inviterCount ? '邀请人 ' + group.inviterCount + ' 位' : '无邀请人' }}</text>
						<text v-if="group.inviterCount && group.noInviterCount">无邀请人账号 {{ group.noInviterCount }}</text>
						<text class="expand-hint">{{ group.ip === expandedIp ? '收起 ▲' : '展开 ▼' }}</text>
					</view>
				</view>

				<!-- 只渲染当前展开的一组，收起即销毁，避免成百上千个分组的表格同时进入 DOM -->
				<view v-if="group.ip === expandedIp && expandedGroup" class="ip-group-body">
					<view class="group-actions">
						<text class="inline-note">本组 {{ expandedBannableCount }} 个“正常”账号可批量封禁，其它状态的账号不参与。修改注册 IP 或邀请人后需重新检测才会重新分组。</text>
						<view class="action-buttons">
							<button size="mini" type="warn" :disabled="actionLocked || !expandedBannableCount" @click="confirmBanGroup">封禁本组正常账号</button>
							<button size="mini" :disabled="actionLocked" @click="loadVisibleDetails(true)">刷新本页数据</button>
						</view>
					</view>
					<view v-if="detailError" class="load-warning detail-error">
						<text>详情读取失败：{{ detailError }}</text>
						<button size="mini" :disabled="actionLocked" @click="loadVisibleDetails(true)">重试</button>
					</view>

					<text class="sub-title">邀请人（{{ expandedInviters.length }} 位；本组无邀请人账号 {{ expandedGroup.noInviterCount }} 个）</text>
					<view v-if="!expandedInviters.length" class="empty-state small">本组账号都没有邀请人</view>
					<uni-table v-else border stripe>
						<uni-tr>
							<uni-th align="left">邀请人</uni-th>
							<uni-th width="100" align="center">邀请码</uni-th>
							<uni-th width="90" align="center">本组受邀</uni-th>
							<uni-th width="110" align="center">状态</uni-th>
							<uni-th width="300" align="center">操作</uni-th>
						</uni-tr>
						<uni-tr v-for="row in pagedInviterRows" :key="row.id">
							<uni-td align="left">
								<text class="cell-main">{{ row.nickname }}</text>
								<text class="cell-sub">{{ row.id }}</text>
								<text v-if="row.inGroup" class="tag danger">本人也在本组</text>
							</uni-td>
							<uni-td align="center">{{ row.inviteCodeText }}</uni-td>
							<uni-td align="center">{{ row.count }} 人</uni-td>
							<uni-td align="center"><text :class="['status-text', row.statusClass]">{{ row.statusText }}</text></uni-td>
							<uni-td align="center">
								<view class="action-buttons">
									<button v-if="row.canBan" size="mini" type="warn" :disabled="actionLocked" @click="confirmStatusChange(row.id, 'ban', '邀请人')">封禁</button>
									<button v-if="row.canUnban" size="mini" :disabled="actionLocked" @click="confirmStatusChange(row.id, 'unban', '邀请人')">解封</button>
									<button v-if="row.exists" size="mini" type="primary" :disabled="busy" @click="editAccount(row.id)">修改</button>
									<button v-if="row.inviteCode" size="mini" :disabled="busy" @click="openInvitationCheck(row.inviteCode)">检测违规邀请</button>
								</view>
							</uni-td>
						</uni-tr>
					</uni-table>
					<view v-if="expandedInviters.length > inviterPageSize" class="pagination-row">
						<uni-pagination show-icon :page-size="inviterPageSize" :current="inviterPage" :total="expandedInviters.length" @change="changeInviterPage" />
					</view>

					<text class="sub-title">账号（{{ expandedGroup.count }} 个）</text>
					<uni-table border stripe>
						<uni-tr>
							<uni-th align="left">账号</uni-th>
							<uni-th width="100" align="center">本人邀请码</uni-th>
							<uni-th width="110" align="center">状态</uni-th>
							<uni-th width="110" align="center">邀请人邀请码</uni-th>
							<uni-th width="160" align="center">受邀时间</uni-th>
							<uni-th width="170" align="center" sortable @sort-change="changeAccountSort">注册时间</uni-th>
							<uni-th width="160" align="center">最后登录</uni-th>
							<uni-th width="140" align="center">最后登录 IP</uni-th>
							<uni-th width="190" align="center">操作</uni-th>
						</uni-tr>
						<uni-tr v-for="row in pagedAccountRows" :key="row.id">
							<uni-td align="left">
								<text class="cell-main">{{ row.nickname }}</text>
								<text class="cell-sub">{{ row.id }}</text>
							</uni-td>
							<uni-td align="center">{{ row.myInviteCode }}</uni-td>
							<uni-td align="center"><text :class="['status-text', row.statusClass]">{{ row.statusText }}</text></uni-td>
							<uni-td align="center">{{ row.inviterCodeText }}</uni-td>
							<uni-td align="center">{{ row.inviteTimeText }}</uni-td>
							<uni-td align="center">{{ row.registerTimeText }}</uni-td>
							<uni-td align="center">{{ row.loginTimeText }}</uni-td>
							<uni-td align="center">{{ row.loginIp }}</uni-td>
							<uni-td align="center">
								<view class="action-buttons">
									<button v-if="row.canBan" size="mini" type="warn" :disabled="actionLocked" @click="confirmStatusChange(row.id, 'ban', '账号')">封禁</button>
									<button v-if="row.canUnban" size="mini" :disabled="actionLocked" @click="confirmStatusChange(row.id, 'unban', '账号')">解封</button>
									<button v-if="row.exists" size="mini" type="primary" :disabled="busy" @click="editAccount(row.id)">修改</button>
								</view>
							</uni-td>
						</uni-tr>
					</uni-table>
					<view v-if="expandedGroup.count > accountPageSize" class="pagination-row">
						<uni-pagination show-icon :page-size="accountPageSize" :current="accountPage" :total="expandedGroup.count" @change="changeAccountPage" />
					</view>
				</view>
			</view>

			<view v-if="filteredGroups.length > groupPageSize" class="pagination-row">
				<uni-pagination show-icon :page-size="groupPageSize" :current="groupPage" :total="filteredGroups.length" @change="changeGroupPage" />
			</view>
		</uni-card>
	</view>
</template>

<script>
	const {
		NORMAL_MAX,
		HIGH_RISK_MIN,
		RISK_FILTERS,
		buildRegisterIpGroups,
		summarizeGroups,
		filterGroups,
		countGroupInviters,
		paginate,
		getStatusText,
		getRiskText
	} = require('./violation-register.utils.js')
	const {
		DETAIL_FIELDS,
		STATUS_ACTIONS,
		getErrorMessage,
		countRegisteredAccounts,
		scanRegisteredAccounts,
		readAccountsByIds,
		changeAccountStatus
	} = require('./violation-register.data.js')
	const {
		ONE_DAY_MS,
		resolveBusinessDateRange,
		formatBusinessTimestamp,
		getBusinessDayKey,
		getBusinessDateStart
	} = require('../violation-invitation-v2/violation-invitation-v2.scan.js')

	const db = uniCloud.database()
	const dbContext = {
		collection: db.collection('user-accounts'),
		dbCmd: db.command
	}

	/** 已读取过但数据库中不存在的账号（扫描后被删除，或邀请人账号已删除）。 */
	const MISSING_ACCOUNT = Object.freeze({ missing: true })
	const EMPTY_GROUPS = Object.freeze([])
	const STATUS_CLASS = {
		0: 'normal',
		1: 'restricted',
		2: 'reviewing',
		3: 'banned'
	}

	function formatTime(value) {
		return formatBusinessTimestamp(value) || '无'
	}

	export default {
		data() {
			return {
				normalMax: NORMAL_MAX,
				highMin: HIGH_RISK_MIN,
				// “昨天”“前天”与违规邀请 v2 一致：从当天 0 点起截止到检测时刻
				dateOptions: [
					{ value: 'today', label: '今天' },
					{ value: 'yesterday', label: '昨天起' },
					{ value: 'dayBeforeYesterday', label: '前天起' },
					{ value: 'days3', label: '3 天内' },
					{ value: 'days7', label: '7 天内' },
					{ value: 'days15', label: '15 天内' },
					{ value: 'days30', label: '30 天内' },
					{ value: 'custom', label: '自定义天数' },
					{ value: 'manual', label: '手动日期' }
				],
				dateMode: 'today',
				customDays: '',
				manualDateRange: [],
				businessToday: getBusinessDayKey(Date.now()),
				// 范围预览的参考时刻；只用于显示，实际检测以点击“开始检测”的时刻为准
				previewNow: Date.now(),
				riskFilterOptions: [
					{ value: 'mediumHigh', label: '中高风险' },
					{ value: 'high', label: '仅高风险' },
					{ value: 'all', label: '全部（≥2 个账号）' }
				],
				riskFilter: 'mediumHigh',
				scanning: false,
				cancelRequested: false,
				acting: false,
				detailLoading: false,
				detailError: '',
				task: { visible: false, message: '', metric: '', progress: null, error: false },
				scanMeta: null,
				summary: null,
				// 冻结数组：Vue 2 不会为数万个分组建立响应式
				groups: EMPTY_GROUPS,
				groupPage: 1,
				groupPageSize: 20,
				expandedIp: '',
				accountPage: 1,
				accountPageSize: 50,
				inviterPage: 1,
				inviterPageSize: 10,
				accountSortOrder: 'desc',
				// 状态与详情存放在非响应式 Map 中，变更后递增版本号触发相关计算属性重新计算
				statusVersion: 0,
				detailVersion: 0
			}
		},
		created() {
			// 以下属性故意不放进 data：数据量可达数十万条，不能被 Vue 2 深度观察
			this.accountIndex = new Map() // 扫描快照：账号 id → { registerDate, inviterId, status }
			this.statusById = new Map() // 账号与邀请人的最新状态，唯一来源
			this.detailById = new Map() // 已读取的账号详情；MISSING_ACCOUNT 表示已不存在
			this.scanToken = 0
			this.detailToken = 0
		},
		onShow() {
			this.previewNow = Date.now()
			this.businessToday = getBusinessDayKey(this.previewNow)
		},
		onUnload() {
			// 离开页面时让进行中的扫描和详情读取在下一步停止
			this.scanToken++
			this.detailToken++
		},
		computed: {
			busy() {
				return this.scanning || this.acting
			},
			/** 封禁、解封按钮在详情读取期间也锁定，避免读回的旧状态覆盖刚写入的新状态。 */
			actionLocked() {
				return this.busy || this.detailLoading
			},
			rangePreview() {
				const now = this.previewNow
				try {
					const range = resolveBusinessDateRange({
						mode: this.dateMode,
						customDays: this.customDays,
						dateRange: this.manualDateRange,
						confirmedAt: now
					})
					const days = Math.round((getBusinessDateStart(range.endDate) - getBusinessDateStart(range.startDate)) / ONE_DAY_MS) + 1
					const endText = range.endDate === getBusinessDayKey(now)
						? `${range.endDate} 点击“开始检测”的时刻`
						: `${range.endDate} 23:59:59`
					return { error: false, text: `检测范围：${range.startDate} 00:00:00 至 ${endText}，共 ${days} 个自然日` }
				} catch (error) {
					return { error: true, text: getErrorMessage(error) }
				}
			},
			filteredGroups() {
				return filterGroups(this.groups, this.riskFilter)
			},
			groupCountByFilter() {
				const counts = {}
				Object.keys(RISK_FILTERS).forEach(key => {
					counts[key] = filterGroups(this.groups, key).length
				})
				return counts
			},
			pagedGroups() {
				return paginate(this.filteredGroups, this.groupPage, this.groupPageSize).map(group => ({
					ip: group.ip,
					count: group.count,
					riskLevel: group.riskLevel,
					riskText: getRiskText(group.riskLevel),
					inviterCount: group.inviterIds.length,
					noInviterCount: group.noInviterCount,
					bannedCount: group.ids.reduce((count, id) => count + (this.statusOf(id) === STATUS_ACTIONS.ban.to ? 1 : 0), 0)
				}))
			},
			expandedGroup() {
				if (!this.expandedIp) return null
				return this.groups.find(group => group.ip === this.expandedIp) || null
			},
			expandedBannableCount() {
				const group = this.expandedGroup
				return group ? group.ids.filter(id => this.statusOf(id) === STATUS_ACTIONS.ban.from).length : 0
			},
			expandedInviters() {
				const group = this.expandedGroup
				return group ? countGroupInviters(group.ids, this.accountIndex) : []
			},
			pagedInviters() {
				return paginate(this.expandedInviters, this.inviterPage, this.inviterPageSize)
			},
			pagedAccountIds() {
				const group = this.expandedGroup
				if (!group) return []
				// group.ids 已按注册时间倒序排好
				const ids = this.accountSortOrder === 'asc' ? group.ids.slice().reverse() : group.ids
				return paginate(ids, this.accountPage, this.accountPageSize)
			},
			pagedInviterRows() {
				return this.pagedInviters.map(entry => {
					const detail = this.detailOf(entry.inviterId)
					const exists = Boolean(detail && !detail.missing)
					const inviteCode = exists && detail.my_invite_code ? String(detail.my_invite_code) : ''
					return {
						id: entry.inviterId,
						count: entry.count,
						inGroup: entry.inGroup,
						exists,
						nickname: this.describeName(detail, '邀请人账号已不存在'),
						inviteCode,
						inviteCodeText: !detail ? '加载中…' : exists ? (inviteCode || '未设置') : '—',
						...this.buildStatusView(entry.inviterId, exists)
					}
				})
			},
			pagedAccountRows() {
				return this.pagedAccountIds.map(id => {
					const snapshot = this.accountIndex.get(id)
					const detail = this.detailOf(id)
					const exists = Boolean(detail && !detail.missing)
					return {
						id,
						exists,
						nickname: this.describeName(detail, '账号已不存在'),
						myInviteCode: exists ? (detail.my_invite_code || '无') : '—',
						inviterCodeText: snapshot.selfInvited ? '自己（数据异常）' : this.describeInviterCode(snapshot.inviterId),
						inviteTimeText: exists ? formatTime(detail.invite_time) : '—',
						registerTimeText: formatTime(snapshot.registerDate),
						loginTimeText: exists ? formatTime(detail.login_date) : '—',
						loginIp: exists ? (detail.login_ip || '无') : '—',
						...this.buildStatusView(id, exists)
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
			setDateMode(mode) {
				if (this.busy) return
				this.dateMode = mode
				this.previewNow = Date.now()
				this.businessToday = getBusinessDayKey(this.previewNow)
			},
			describeName(detail, missingText) {
				if (!detail) return '加载中…'
				if (detail.missing) return missingText
				return detail.nickname || '未设置昵称'
			},
			describeInviterCode(inviterId) {
				if (!inviterId) return '无'
				const detail = this.detailOf(inviterId)
				if (!detail) return '加载中…'
				if (detail.missing) return '邀请人已删除'
				return detail.my_invite_code || '未设置'
			},
			/** 状态展示与可执行操作；状态未知（未加载或结果待确认）时不提供封禁、解封。 */
			buildStatusView(id, exists) {
				const status = this.statusOf(id)
				const loaded = this.detailOf(id) !== undefined
				return {
					statusText: !loaded && status === undefined ? '加载中…' : exists || !loaded ? getStatusText(status) : '—',
					statusClass: STATUS_CLASS[status] || 'unknown',
					canBan: exists && status === STATUS_ACTIONS.ban.from,
					canUnban: exists && status === STATUS_ACTIONS.unban.from
				}
			},
			resetResults() {
				this.detailToken++
				this.accountIndex = new Map()
				this.statusById = new Map()
				this.detailById = new Map()
				this.groups = EMPTY_GROUPS
				this.summary = null
				this.scanMeta = null
				this.groupPage = 1
				this.expandedIp = ''
				this.detailLoading = false
				this.detailError = ''
				this.statusVersion++
				this.detailVersion++
			},
			async startScan() {
				if (this.busy) return
				const confirmedAt = Date.now()
				this.previewNow = confirmedAt
				this.businessToday = getBusinessDayKey(confirmedAt)
				let range
				try {
					range = resolveBusinessDateRange({
						mode: this.dateMode,
						customDays: this.customDays,
						dateRange: this.manualDateRange,
						confirmedAt
					})
				} catch (error) {
					uni.showToast({ title: getErrorMessage(error), icon: 'none' })
					return
				}

				const token = ++this.scanToken
				const isCancelled = () => token !== this.scanToken
				const rangeText = `${formatBusinessTimestamp(range.startMs)} 至 ${formatBusinessTimestamp(range.endMs)}（北京时间）`
				const onRetry = attempt => !isCancelled() && this.setTask(`读取失败，正在第 ${attempt} 次尝试`, { progress: this.task.progress, metric: this.task.metric })
				this.resetResults()
				this.scanning = true
				this.cancelRequested = false
				this.setTask(`正在统计 ${rangeText} 注册的账号数`)

				try {
					const expectedCount = await countRegisteredAccounts(dbContext, range, { isCancelled, onRetry })
					if (isCancelled()) return
					this.setTask('正在读取注册账号', { progress: 0, metric: `0 / ${expectedCount}` })
					const accounts = await scanRegisteredAccounts(dbContext, range, {
						isCancelled,
						onRetry,
						onPage: loaded => this.setTask('正在读取注册账号', {
							progress: Math.min(99, Math.floor(loaded / Math.max(expectedCount, 1) * 100)),
							metric: `${loaded} / ${expectedCount}`
						})
					})

					this.setTask('正在按注册 IP 分组', { progress: 99 })
					const result = buildRegisterIpGroups(accounts)
					if (isCancelled()) return

					this.accountIndex = result.accountIndex
					result.accountIndex.forEach((snapshot, id) => this.statusById.set(id, snapshot.status))
					this.groups = Object.freeze(result.groups)
					this.summary = summarizeGroups(result.groups)
					this.scanMeta = {
						rangeText,
						completedText: formatBusinessTimestamp(Date.now()),
						expectedCount,
						scannedCount: result.scannedCount,
						invalidIpCount: result.invalidIpCount
					}
					this.statusVersion++
					this.setTask(`检测完成：${result.groups.length} 个注册 IP 有多个账号，其中中高风险 ${this.summary.high.groupCount + this.summary.medium.groupCount} 个`, {
						metric: `${result.scannedCount} 个账号`
					})
				} catch (error) {
					if (error && error.cancelled) return
					console.error('违规注册检测失败:', error)
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
			setRiskFilter(value) {
				this.riskFilter = value
				this.groupPage = 1
				this.collapseGroup()
			},
			changeGroupPage(event) {
				this.groupPage = event.current
				this.collapseGroup()
			},
			collapseGroup() {
				this.expandedIp = ''
				this.detailToken++
				this.detailLoading = false
				this.detailError = ''
			},
			toggleGroup(ip) {
				if (this.expandedIp === ip) {
					this.collapseGroup()
					return
				}
				this.collapseGroup()
				this.expandedIp = ip
				this.accountPage = 1
				this.inviterPage = 1
				this.accountSortOrder = 'desc'
				return this.loadVisibleDetails(false)
			},
			changeAccountPage(event) {
				this.accountPage = event.current
				return this.loadVisibleDetails(false)
			},
			changeInviterPage(event) {
				this.inviterPage = event.current
				return this.loadVisibleDetails(false)
			},
			changeAccountSort(event) {
				// uni-th 取消排序时 order 为 null，此时回到默认的注册时间倒序
				this.accountSortOrder = event && event.order === 'ascending' ? 'asc' : 'desc'
				this.accountPage = 1
				return this.loadVisibleDetails(false)
			},
			/**
			 * 读取当前页账号、这些账号的邀请人以及当前页邀请人的详情。
			 * @param {boolean} force - true 时重新读取全部可见账号；false 时只读取尚未读过的
			 */
			loadVisibleDetails(force) {
				const ids = new Set(this.pagedAccountIds)
				this.pagedAccountIds.forEach(id => {
					const inviterId = this.accountIndex.get(id).inviterId
					if (inviterId) ids.add(inviterId)
				})
				this.pagedInviters.forEach(entry => ids.add(entry.inviterId))
				const targetIds = Array.from(ids).filter(id => force || !this.detailById.has(id))
				return this.loadDetails(targetIds)
			},
			/**
			 * 读取指定账号的详情并更新状态表。
			 * 封禁、解封写入期间不发起读取（返回 false），由写入结束后统一补读，
			 * 避免写入前读到的旧状态在写入后才返回，把刚确认的新状态覆盖掉。
			 * @returns {Promise<boolean>} 是否已读取并应用
			 */
			async loadDetails(ids) {
				if (!ids.length) return true
				if (this.acting) return false
				const token = ++this.detailToken
				this.detailLoading = true
				this.detailError = ''
				try {
					const rows = await readAccountsByIds(dbContext, ids, DETAIL_FIELDS)
					if (token !== this.detailToken) return false
					ids.forEach(id => {
						const row = rows.get(id)
						if (row) {
							this.detailById.set(id, row)
							this.statusById.set(id, Number(row.status))
						} else {
							this.detailById.set(id, MISSING_ACCOUNT)
							this.statusById.delete(id)
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
			confirmStatusChange(id, action, roleLabel) {
				if (this.actionLocked) return
				const config = STATUS_ACTIONS[action]
				const status = this.statusById.get(id)
				if (status !== config.from) {
					uni.showToast({ title: `当前状态为“${getStatusText(status)}”，不能${config.label}`, icon: 'none' })
					return
				}
				const detail = this.detailById.get(id)
				const name = detail && !detail.missing && detail.nickname ? `${detail.nickname}（${id}）` : id
				uni.showModal({
					title: `确认${config.label}${roleLabel}`,
					content: `将${config.label}${roleLabel} ${name}：${getStatusText(config.from)} → ${getStatusText(config.to)}。是否继续？`,
					success: result => {
						if (result && result.confirm) this.runStatusChange([id], action)
					}
				})
			},
			confirmBanGroup() {
				const group = this.expandedGroup
				if (!group || this.actionLocked) return
				const ids = group.ids.filter(id => this.statusById.get(id) === STATUS_ACTIONS.ban.from)
				if (!ids.length) {
					uni.showToast({ title: '本组没有状态为“正常”的账号', icon: 'none' })
					return
				}
				uni.showModal({
					title: '确认批量封禁',
					content: `将封禁 IP ${group.ip} 下 ${ids.length} 个状态为“正常”的账号（本组共 ${group.count} 个，其它状态不处理）。操作立即生效，可在本页逐个解封。是否继续？`,
					success: result => {
						if (result && result.confirm) this.runStatusChange(ids, 'ban')
					}
				})
			},
			async runStatusChange(ids, action) {
				if (this.actionLocked) {
					uni.showToast({ title: '正在读取或处理数据，请稍后再试', icon: 'none' })
					return
				}
				const config = STATUS_ACTIONS[action]
				const isBatch = ids.length > 1
				this.acting = true
				this.setTask(`正在${config.label} ${ids.length} 个账号`, isBatch ? { progress: 0, metric: `0 / ${ids.length}` } : {})
				let outcome
				try {
					outcome = await changeAccountStatus(dbContext, ids, action, {
						onChunk: (done, total) => {
							if (isBatch) this.setTask(`正在${config.label} ${total} 个账号`, { progress: Math.floor(done / total * 100), metric: `${done} / ${total}` })
						}
					})
				} catch (error) {
					console.error(`${config.label}失败:`, error)
					this.setTask(`${config.label}失败：${getErrorMessage(error)}`, { error: true })
					uni.showToast({ title: `${config.label}失败`, icon: 'none' })
					return
				} finally {
					this.acting = false
				}
				this.applyStatusOutcome(outcome)
				this.reportStatusOutcome(outcome, config, isBatch)
				// 补读写入期间被推迟的详情，以及结果待确认、需要重新核对的账号
				this.loadVisibleDetails(false)
			},
			/** 把回读结果写回状态表：已确认的状态直接更新；结果待确认的账号清掉缓存，强制下次显示时重新读取。 */
			applyStatusOutcome(outcome) {
				;['success', 'failed', 'skipped'].forEach(type => {
					outcome[type].forEach(item => {
						if (item.status === null) {
							this.statusById.delete(item.id)
							this.detailById.set(item.id, MISSING_ACCOUNT)
						} else {
							this.statusById.set(item.id, item.status)
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
			reportStatusOutcome(outcome, config, isBatch) {
				const counts = `成功 ${outcome.success.length}，跳过 ${outcome.skipped.length}，失败 ${outcome.failed.length}，待确认 ${outcome.uncertain.length}`
				const problems = outcome.failed.concat(outcome.uncertain, outcome.skipped)
				const hasError = Boolean(outcome.failed.length || outcome.uncertain.length)
				this.setTask(`${config.label}完成：${counts}`, { error: hasError })
				if (!isBatch && outcome.success.length) {
					uni.showToast({ title: `${config.label}成功`, icon: 'success' })
					return
				}
				if (!isBatch && outcome.skipped.length && !hasError) {
					uni.showToast({ title: outcome.skipped[0].reason, icon: 'none' })
					return
				}
				const details = problems.slice(0, 3).map(item => `${item.id}：${item.reason}`).join('\n')
				const uncertainTip = outcome.uncertain.length ? '\n结果待确认的账号请稍后点击“刷新本页数据”核对，不要立即重复操作。' : ''
				uni.showModal({
					title: `${config.label}结果`,
					content: `${counts}${details ? '\n' + details : ''}${problems.length > 3 ? '\n……' : ''}${uncertainTip}`,
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

	.page-heading,
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

	.thresholds {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.threshold-label,
	.filter-label {
		font-size: 13px;
		color: #606266;
	}

	.section-title {
		display: block;
		font-size: 15px;
		font-weight: 700;
		color: #303133;
	}

	.sub-title {
		display: block;
		margin: 14px 0 8px;
		font-size: 14px;
		font-weight: 700;
		color: #303133;
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
	.action-buttons {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.option-row {
		margin-top: 10px;
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

	.condition-row {
		margin-top: 10px;
		font-size: 13px;
		color: #606266;
	}

	.days-input {
		width: 140px;
		flex: none;
	}

	.range-preview {
		display: block;
		margin-top: 10px;
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

	.button-row {
		margin-top: 12px;
	}

	.action-buttons button,
	.button-row button {
		margin: 0;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 10px;
		margin-top: 12px;
	}

	.stat-item {
		padding: 10px 12px;
		border-radius: 6px;
		background: #f4f4f5;
	}

	.stat-item.high { background: #fef0f0; color: #f56c6c; }
	.stat-item.medium { background: #fdf6ec; color: #e6a23c; }
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
		margin: 14px 0 10px;
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

	.risk-pill {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 12px;
		white-space: nowrap;
	}

	.risk-pill.high { background: #fef0f0; color: #f56c6c; }
	.risk-pill.medium { background: #fdf6ec; color: #e6a23c; }
	.risk-pill.normal { background: #f0f9eb; color: #67c23a; }

	.ip-group {
		margin-bottom: 8px;
		border: 1px solid #ebeef5;
		border-left-width: 4px;
		border-radius: 6px;
		background: #fff;
	}

	.ip-group.high { border-left-color: #f56c6c; }
	.ip-group.medium { border-left-color: #e6a23c; }
	.ip-group.normal { border-left-color: #67c23a; }
	.ip-group.expanded { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }

	.ip-group-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 12px;
		cursor: pointer;
	}

	.ip-group-title,
	.ip-group-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	.ip-text {
		font-size: 15px;
		font-weight: 700;
		color: #303133;
		word-break: break-all;
	}

	.ip-group-meta {
		font-size: 13px;
		color: #606266;
	}

	.banned-count {
		color: #f56c6c;
	}

	.expand-hint {
		color: #409eff;
	}

	.ip-group-body {
		padding: 0 12px 12px;
		border-top: 1px solid #ebeef5;
	}

	.group-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding-top: 10px;
	}

	.group-actions .inline-note {
		flex: 1;
		min-width: 240px;
		margin-top: 0;
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
		margin-top: 4px;
		padding: 1px 6px;
		border-radius: 4px;
		font-size: 12px;
	}

	.tag.danger {
		background: #fef0f0;
		color: #f56c6c;
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

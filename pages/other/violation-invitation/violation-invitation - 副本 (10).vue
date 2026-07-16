<template>
	<view class="container">
		<uni-card class="card" :is-shadow="false" :is-full="false" :border="true" margin="0 0 10px 0">
			<text class="uni-card-txt">违规邀请检测系统</text>
		</uni-card>

		<!-- 功能按钮区域 -->
		<view class="action-buttons">
			<button type="primary" size="mini" @click="batchCheckViolation">批量检测违规</button>
			<button type="warn" size="mini" @click="banHighRiskUsers">封禁高风险账号</button>
			<!-- 暂时先不禁用 -->
			<button type="default" :disabled="false" size="mini" @click="confirmClearHistory">清除检测历史</button>
		</view>

		<!-- 全局IP风险统计区域 -->
		<uni-collapse>
			<uni-collapse-item title="全局IP风险统计" :open="false">
				<view class="global-ip-section">
					<view v-if="isLoadingGlobalIpStats" class="loading-container">
						<uni-load-more status="loading" :content-text="loadingText"></uni-load-more>
					</view>
					<view v-else>
						<view class="section-title-container">
							<text class="section-title">IP地址风险分布 (共{{globalIpStats.length}}个IP)</text>
							<view class="status-summary">
								<text class="status-count normal">正常: {{normalIpCount}}</text>
								<text class="status-count medium">中风险: {{mediumRiskIpCount}}</text>
								<text class="status-count high">高风险: {{highRiskIpCount}}</text>
							</view>
						</view>
						<view class="action-buttons-container">
							<button type="primary" size="mini" @click="refreshGlobalIpStats">刷新</button>
							<button type="default" size="mini" @click="exportIpBlacklist">导出IP黑名单</button>
						</view>
						<view v-if="globalIpStats.length > 0" class="ip-stats-scroll-container">
							<view class="ip-stats-list">
								<view v-for="(item, index) in globalIpStats" :key="index"
									:class="['ip-stats-item', getRiskClass(item.riskLevel)]">
									<view class="ip-stats-header">
										<text class="ip-address">IP: {{item.ip}}</text>
										<text class="ip-count">{{item.count}}个账号</text>
										<text :class="['risk-level', getRiskLevelClass(item.riskLevel)]">{{item.riskLevel}}</text>
									</view>
									<view class="ip-stats-inviters">
										<text class="inviters-label">关联邀请人({{item.inviters.length}}人):</text>
										<view class="inviters-list">
											<text v-for="(inviter, idx) in item.inviters" :key="idx" class="inviter-code"
												@click="selectInviteCode(inviter.code)">
												{{inviter.code}} ({{inviter.invitedCount}}人)
											</text>
										</view>
									</view>
								</view>
							</view>
						</view>
						<view v-else class="no-data">
							<text>暂无IP风险统计数据</text>
						</view>
					</view>
				</view>
			</uni-collapse-item>
		</uni-collapse>

		<!-- 同一天大量邀请检测区域 -->
		<uni-collapse>
			<uni-collapse-item title="同一天大量邀请检测" :open="false">
				<view class="same-day-invite-section">
					<view v-if="isLoadingSameDayStats" class="loading-container">
						<uni-load-more status="loading" :content-text="loadingText"></uni-load-more>
					</view>
					<view v-else>
						<view class="section-title-container">
							<text class="section-title">同一天大量邀请账号 (共{{sameDayInviteStats.length}}个邀请人)</text>
						</view>
						<view class="action-buttons-container">
							<button type="primary" size="mini" @click="refreshSameDayInviteStats">刷新</button>
						</view>
						<view v-if="sameDayInviteStats.length > 0" class="ip-stats-scroll-container">
							<view class="ip-stats-list">
								<view v-for="(item, index) in sameDayInviteStats" :key="index" class="ip-stats-item high-risk">
									<view class="ip-stats-header">
										<text class="ip-address">邀请码: {{item.inviteCode}}</text>
										<text class="ip-count">{{item.count}}个账号</text>
										<text class="risk-level high">高风险</text>
									</view>
									<view class="same-day-details">
										<text>注册日期: {{formatDate(item.registerDate)}}</text>
										<text>IP数量: {{item.ipCount}}个</text>
									</view>
									<view class="action-buttons-container">
										<button type="warn" size="mini" @click="selectInviteCode(item.inviteCode)">查看详情</button>
									</view>
								</view>
							</view>
						</view>
						<view v-else class="no-data">
							<text>暂无同一天大量邀请数据</text>
						</view>
					</view>
				</view>
			</uni-collapse-item>
		</uni-collapse>

		<!-- 永久会员查询区域 -->
		<uni-collapse>
			<uni-collapse-item title="永久会员查询" :open="false">
				<view class="permanent-vip-section">
					<view v-if="isLoadingPermanentVip" class="loading-container">
						<uni-load-more status="loading" :content-text="loadingText"></uni-load-more>
					</view>
					<view v-else>
						<view class="permanent-vip-header">
							<view class="section-title-container">
								<text class="section-title">永久会员用户 (共{{permanentVipUsers.length}}人)
									<text v-if="newMembersCount > 0" class="new-members-badge">新增{{newMembersCount}}人</text>
								</text>
								<view class="action-buttons-container">
									<button type="primary" size="mini" @click="queryPermanentVipUsers">刷新</button>
									<button v-if="isSelectedUserHighRisk" type="warn" size="mini" @click="banSelectedUser">封禁此账号</button>
								</view>
								<view class="status-summary">
									<text class="status-count normal">正常: {{normalUserCount}}</text>
									<text class="status-count medium">中风险: {{mediumRiskUserCount}}</text>
									<text class="status-count high">高风险: {{highRiskUserCount}}</text>
								</view>
								<!-- 状态过滤单选框 -->
								<view class="status-filter">
									<text class="filter-label">状态过滤：</text>
									<view class="radio-group">
										<view class="radio-item" @click="filterByStatus('all')">
											<view :class="['radio-circle', {'selected': statusFilter === 'all'}]"></view>
											<text>全部</text>
										</view>
										<view class="radio-item" @click="filterByStatus('normal')">
											<view :class="['radio-circle', {'selected': statusFilter === 'normal'}]"></view>
											<text>正常</text>
										</view>
										<view class="radio-item" @click="filterByStatus('medium')">
											<view :class="['radio-circle', {'selected': statusFilter === 'medium'}]"></view>
											<text>中风险</text>
										</view>
										<view class="radio-item" @click="filterByStatus('high')">
											<view :class="['radio-circle', {'selected': statusFilter === 'high'}]"></view>
											<text>高风险</text>
										</view>
										<view class="radio-item" @click="filterByStatus('banned')">
											<view :class="['radio-circle', {'selected': statusFilter === 'banned'}]"></view>
											<text>已封禁</text>
										</view>
									</view>
								</view>
							</view>
						</view>
						<view v-if="filteredPermanentVipUsers.length > 0" class="invite-code-scroll-container">
							<view class="invite-code-flow-list">
								<view v-for="(item, index) in filteredPermanentVipUsers" :key="index"
									:class="['invite-code-item', getStatusClass(item.status), {'selected': item.my_invite_code === myInviteCode}]"
									@click="selectInviteCode(item.my_invite_code)">
									<text>{{item.my_invite_code}}</text>
									<text v-if="item.status"
										:class="['status-badge', getStatusBadgeClass(item.status)]">{{item.status}}</text>
								</view>
							</view>
						</view>
						<view v-else class="no-data">
							<text>暂无符合条件的永久会员数据</text>
						</view>
					</view>
				</view>
			</uni-collapse-item>
		</uni-collapse>

		<uni-forms-item label="账号邀请码" :label-width="85">
			<div class="custom-forms-item">
				<uni-easyinput v-model="myInviteCode" :maxlength="6" placeholder="请输入用户自身账号邀请码" @clear="clearData" />
				<div class="space-10" />
				<button type="primary" size="mini" @click="checkViolation">检测违规</button>
			</div>
		</uni-forms-item>

		<div v-if="userId != ''">
			<uni-forms-item label="邀请人ID" :label-width="85">
				<div class="custom-forms-item">
					<uni-easyinput disabled placeholder="邀请人ID" v-model="userId"></uni-easyinput>
					<div class="space-10" />
					<button class="button" size="mini" type="primary" @click="editUser(userId)">查看详情</button>
				</div>
			</uni-forms-item>
		</div>

		<!-- 违规提示区域 -->
		<view v-if="hasHighRiskIP" class="violation-warning">
			<uni-icons type="error" size="20" color="#ff0000"></uni-icons>
			<text class="warning-text">检测到高风险邀请行为！存在同一IP地址下多个账号（≥ {{ `${HIGH_RISK_THRESHOLD}` }} 个），可能使用了分身软件进行批量注册。</text>
		</view>

		<!-- IP统计区域 -->
		<view v-if="ipSummary.length > 0" class="ip-statistics">
			<text class="section-title">IP地址分布统计</text>
			<view class="ip-list">
				<view v-for="(item, index) in ipSummary" :key="index"
					:class="['ip-item', {'high-risk': item.count >= HIGH_RISK_THRESHOLD, 'medium-risk': item.count >= MEDIUM_RISK_THRESHOLD && item.count < HIGH_RISK_THRESHOLD}]">
					<text class="ip-address">IP: {{item.ip}}</text>
					<text class="ip-count">{{item.count}}个账号</text>
					<text v-if="item.count >= HIGH_RISK_THRESHOLD" class="risk-level high">高风险</text>
					<text v-else-if="item.count >= MEDIUM_RISK_THRESHOLD" class="risk-level medium">中风险</text>
				</view>
			</view>
		</view>

		<!-- 邀请记录表格 -->
		<view v-if="invitedUsers.length > 0" class="table-section">
			<text class="section-title">邀请记录 (共{{invitedUsers.length}}人)</text>

			<uni-table ref="table" :loading="isLoading" emptyText="暂无数据" border stripe>
				<uni-tr>
					<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'device_oaid')">设备号</uni-th>
					<uni-th align="center" filter-type="search"
						@filter-change="filterChange($event, 'my_invite_code')">邀请码</uni-th>
					<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'invite_time')" sortable
						@sort-change="sortChange($event, 'invite_time')">邀请时间</uni-th>
					<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'login_ip')" sortable
						@sort-change="sortChange($event, 'login_ip')">最后登录IP</uni-th>
				</uni-tr>
				<uni-tr v-for="(item, index) in filteredUsers" :key="index"
					:class="{'high-risk-row': isHighRiskIP(item.login_ip)}">
					<uni-td align="center">{{item.device_oaid || '无'}}</uni-td>
					<uni-td align="center">{{item.my_invite_code}}</uni-td>
					<uni-td align="center">
						<uni-dateformat :threshold="[0, 0]" :date="item.invite_time"></uni-dateformat>
					</uni-td>
					<uni-td align="center">
						<view class="ip-cell">
							<text>{{item.login_ip}}</text>
							<uni-tag v-if="getIPCount(item.login_ip) >= HIGH_RISK_THRESHOLD" text="高风险" type="error"
								size="mini"></uni-tag>
							<uni-tag v-else-if="getIPCount(item.login_ip) >= MEDIUM_RISK_THRESHOLD" text="中风险" type="warning"
								size="mini"></uni-tag>
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>
		</view>

		<view v-if="isLoading" class="loading-container">
			<uni-load-more status="loading" :content-text="loadingText"></uni-load-more>
		</view>

		<!-- IP黑名单导出弹窗 -->
		<uni-popup ref="ipBlacklistPopup" type="center">
			<view class="popup-content">
				<view class="popup-title">
					<text class="popup-title-text">IP黑名单导出</text>
					<text class="popup-close" @click="closeIpBlacklistPopup">×</text>
				</view>
				<view class="popup-body">
					<textarea class="ip-blacklist-textarea" v-model="ipBlacklistText" readonly></textarea>
					<button type="primary" @click="copyIpBlacklistToClipboard">复制到剪贴板</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	const db = uniCloud.database();
	const dbCmd = db.command;

	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)

	// 永久会员时间戳（2045-01-01 00:00:01）
	const PERMANENT_VIP_TIMESTAMP = 2366812801000

	// 风险阈值常量配置
	const HIGH_RISK_THRESHOLD = 13 // 高风险阈值：同IP账号数量 >= 13
	const MEDIUM_RISK_THRESHOLD = 6 // 中风险阈值：同IP账号数量 >= 6
	const BAN_THRESHOLD = 15 // 封禁阈值：同IP账号数量 >= 15

	// 本地存储键名
	const STORAGE_KEY = 'violation_detection_history'
	const GLOBAL_IP_STATS_KEY = 'global_ip_stats' // 全局IP统计存储键
	const PERMANENT_VIP_COUNT_KEY = 'permanent_vip_count' // 永久会员数量存储键名
	const SAME_DAY_INVITE_KEY = 'same_day_invite_stats' // 同一天邀请统计存储键

	export default {
		data() {
			return {
				myInviteCode: '', // 用户的账号自身邀请码
				userId: '', // 邀请人ID
				userInfo: {}, // 邀请人信息
				invitedUsers: [], // 被邀请的用户列表
				filteredUsers: [], // 过滤后的用户列表
				ipSummary: [], // IP地址统计
				hasHighRiskIP: false, // 是否存在高风险IP
				isLoading: false, // 加载状态
				isLoadingPermanentVip: false, // 永久会员加载状态
				permanentVipUsers: [], // 永久会员用户列表
				filteredPermanentVipUsers: [], // 过滤后的永久会员用户列表
				statusFilter: 'all', // 状态过滤条件：all, normal, medium, high, banned
				checkedUsers: {}, // 已检测用户记录
				highRiskUsers: [], // 高风险用户列表
				isSelectedUserHighRisk: false, // 当前选中的用户是否为高风险用户
				// 全局IP风险统计
				globalIpStats: [], // IP风险统计数据
				isLoadingGlobalIpStats: false, // 全局IP统计加载状态
				normalIpCount: 0, // 正常IP数量
				mediumRiskIpCount: 0, // 中风险IP数量
				highRiskIpCount: 0, // 高风险IP数量
				ipBlacklistText: '', // IP黑名单文本

				// 同一天大量邀请检测
				sameDayInviteStats: [], // 同一天大量邀请统计
				isLoadingSameDayStats: false, // 加载状态

				previousMembersCount: 0, // 上次查询的永久会员数量
				newMembersCount: 0, // 新增永久会员数量
				// 用户状态统计
				normalUserCount: 0,
				mediumRiskUserCount: 0,
				highRiskUserCount: 0,
				// 将风险阈值常量添加到data中，使其在模板中可用
				HIGH_RISK_THRESHOLD,
				MEDIUM_RISK_THRESHOLD,
				BAN_THRESHOLD,
				loadingText: {
					contentdown: '上拉显示更多',
					contentrefresh: '正在加载...',
					contentnomore: '没有更多数据了'
				},
				// 过滤条件
				filterOptions: {
					device_oaid: '',
					my_invite_code: '',
					invite_time: null,
					login_ip: ''
				},
				// 排序条件
				sortOptions: {
					field: '',
					order: ''
				}
			}
		},
		mounted() {
			// 页面加载时先读取本地存储的检测历史
			this.loadCheckedUsersFromStorage()
			// 读取全局IP统计
			this.loadGlobalIpStatsFromStorage()
			// 读取上次永久会员数量
			this.loadPermanentVipCountFromStorage()
			// 加载同一天大量邀请统计
			this.loadSameDayInviteStatsFromStorage()
			// 然后查询永久会员
			this.queryPermanentVipUsers()
		},
		watch: {
			// 监听永久会员列表变化，更新过滤后的列表
			permanentVipUsers: {
				handler(newVal) {
					this.applyStatusFilter()
				},
				deep: true
			},
			// 监听状态过滤条件变化，更新过滤后的列表
			statusFilter: {
				handler(newVal) {
					this.applyStatusFilter()
				}
			}
		},
		methods: {
			/**
			 * 从本地存储加载已检测用户记录
			 */
			loadCheckedUsersFromStorage() {
				uni.getStorage({
					key: STORAGE_KEY,
					success: (res) => {
						this.checkedUsers = res.data || {}
						console.log('已从本地加载检测历史:', this.checkedUsers)
					},
					fail: () => {
						console.log('未找到本地检测历史记录')
						this.checkedUsers = {}
					}
				})
			},

			/**
			 * 保存已检测用户记录到本地存储
			 */
			saveCheckedUsersToStorage() {
				uni.setStorage({
					key: STORAGE_KEY,
					data: this.checkedUsers,
					success: () => {
						console.log('检测历史已保存到本地')
					},
					fail: (err) => {
						console.error('保存检测历史失败:', err)
					}
				})
			},

			/**
			 * 从本地存储加载全局IP统计
			 */
			loadGlobalIpStatsFromStorage() {
				uni.getStorage({
					key: GLOBAL_IP_STATS_KEY,
					success: (res) => {
						this.globalIpStats = res.data || []
						this.countIpsByRiskLevel()
						console.log('已从本地加载全局IP统计:', this.globalIpStats)
					},
					fail: () => {
						console.log('未找到本地全局IP统计记录')
						this.globalIpStats = []
					}
				})
			},

			/**
			 * 保存全局IP统计到本地存储
			 */
			saveGlobalIpStatsToStorage() {
				uni.setStorage({
					key: GLOBAL_IP_STATS_KEY,
					data: this.globalIpStats,
					success: () => {
						console.log('全局IP统计已保存到本地')
					},
					fail: (err) => {
						console.error('保存全局IP统计失败:', err)
					}
				})
			},

			/**
			 * 从本地存储加载同一天大量邀请统计数据
			 */
			loadSameDayInviteStatsFromStorage() {
				uni.getStorage({
					key: this.SAME_DAY_INVITE_KEY,
					success: (res) => {
						if (res.data) {
							this.sameDayInviteStats = res.data
						}
					},
					fail: () => {
						console.log('未找到同一天大量邀请统计数据')
						this.sameDayInviteStats = []
					}
				})
			},

			/**
			 * 保存同一天大量邀请统计数据到本地存储
			 */
			saveSameDayInviteStatsToStorage() {
				uni.setStorage({
					key: this.SAME_DAY_INVITE_KEY,
					data: this.sameDayInviteStats,
					success: () => {
						console.log('同一天大量邀请统计数据已保存')
					}
				})
			},

			/**
			 * 从本地存储加载上次永久会员数量
			 */
			loadPermanentVipCountFromStorage() {
				uni.getStorage({
					key: PERMANENT_VIP_COUNT_KEY,
					success: (res) => {
						this.previousMembersCount = res.data || 0
						console.log('已从本地加载上次永久会员数量:', this.previousMembersCount)
					},
					fail: () => {
						console.log('未找到本地永久会员数量记录')
						this.previousMembersCount = 0
					}
				})
			},

			/**
			 * 保存永久会员数量到本地存储
			 * @param {Number} count - 永久会员数量
			 */
			savePermanentVipCountToStorage(count) {
				uni.setStorage({
					key: PERMANENT_VIP_COUNT_KEY,
					data: count,
					success: () => {
						console.log('永久会员数量已保存到本地:', count)
					},
					fail: (err) => {
						console.error('保存永久会员数量失败:', err)
					}
				})
			},

			/**
			 * 确认清除检测历史
			 * 添加确认对话框，防止误操作
			 */
			confirmClearHistory() {
				uni.showModal({
					title: '确认清除',
					content: '确定要清除所有检测历史记录吗？此操作不可恢复。',
					success: (res) => {
						if (res.confirm) {
							this.clearCheckedUsersStorage()
						}
					}
				})
			},

			/**
			 * 清除本地存储的检测历史
			 */
			clearCheckedUsersStorage() {
				uni.removeStorage({
					key: STORAGE_KEY,
					success: () => {
						this.checkedUsers = {}
						console.log('检测历史已清除')

						// 同时清除全局IP统计
						uni.removeStorage({
							key: GLOBAL_IP_STATS_KEY,
							success: () => {
								this.globalIpStats = []
								console.log('全局IP统计已清除')
							}
						})

						uni.showToast({
							title: '检测历史已清除',
							icon: 'success'
						})
						// 刷新永久会员列表，清除状态标记
						this.queryPermanentVipUsers()
					}
				})
			},

			/**
			 * 统计不同风险级别的IP数量
			 */
			countIpsByRiskLevel() {
				this.normalIpCount = 0
				this.mediumRiskIpCount = 0
				this.highRiskIpCount = 0

				this.globalIpStats.forEach(ip => {
					if (ip.riskLevel === '正常') {
						this.normalIpCount++
					} else if (ip.riskLevel === '中风险') {
						this.mediumRiskIpCount++
					} else if (ip.riskLevel === '高风险') {
						this.highRiskIpCount++
					}
				})
			},

			/**
			 * 获取风险级别对应的CSS类名
			 * @param {String} riskLevel - 风险级别
			 * @return {String} CSS类名
			 */
			getRiskClass(riskLevel) {
				if (riskLevel === '高风险') {
					return 'high-risk'
				} else if (riskLevel === '中风险') {
					return 'medium-risk'
				}
				return ''
			},

			/**
			 * 获取风险级别标签的CSS类名
			 * @param {String} riskLevel - 风险级别
			 * @return {String} CSS类名
			 */
			getRiskLevelClass(riskLevel) {
				if (riskLevel === '高风险') {
					return 'high'
				} else if (riskLevel === '中风险') {
					return 'medium'
				}
				return ''
			},

			/**
			 * 获取状态对应的CSS类名
			 * @param {String} status - 状态文本
			 * @return {String} CSS类名
			 */
			getStatusClass(status) {
				if (!status) return ''

				switch (status) {
					case '高风险':
					case '已封禁':
						return 'status-high-risk'
					case '中风险':
						return 'status-medium-risk'
					case '正常':
						return 'status-normal'
					default:
						return ''
				}
			},

			/**
			 * 获取状态徽章的CSS类名
			 * @param {String} status - 状态文本
			 * @return {String} CSS类名
			 */
			getStatusBadgeClass(status) {
				if (!status) return ''

				switch (status) {
					case '高风险':
					case '已封禁':
						return 'badge-high-risk'
					case '中风险':
						return 'badge-medium-risk'
					case '正常':
						return 'badge-normal'
					default:
						return ''
				}
			},

			/**
			 * 获取状态徽章的CSS类名
			 * @param {String} status - 状态文本
			 * @return {String} CSS类名
			 */
			getStatusBadgeClass(status) {
				if (!status) return ''

				switch (status) {
					case '高风险':
					case '已封禁':
						return 'badge-high-risk'
					case '中风险':
						return 'badge-medium-risk'
					case '正常':
						return 'badge-normal'
					default:
						return ''
				}
			},

			/**
			 * 刷新全局IP风险统计
			 */
			async refreshGlobalIpStats() {
				this.isLoadingGlobalIpStats = true

				try {
					// 清空现有数据
					this.globalIpStats = []

					// 创建一个Map来存储IP地址和关联的邀请人
					const ipMap = new Map()

					// 遍历所有已检测的用户
					for (const inviteCode in this.checkedUsers) {
						const userData = this.checkedUsers[inviteCode]

						// 查询该用户邀请的所有账号
						if (userData.userId) {
							const {
								result: {
									data
								}
							} = await userCollection.where({
								invite_user_id: userData.userId
							}).field({
								login_ip: true,
								my_invite_code: true
							}).get()

							// 处理IP数据
							if (data && data.length > 0) {
								data.forEach(user => {
									if (user.login_ip) {
										// 如果IP已存在于Map中，更新数据
										if (ipMap.has(user.login_ip)) {
											const ipData = ipMap.get(user.login_ip)
											ipData.count++

											// 检查邀请人是否已存在
											const existingInviter = ipData.inviters.find(inv => inv.code === inviteCode)
											if (existingInviter) {
												existingInviter.invitedCount++
											} else {
												ipData.inviters.push({
													code: inviteCode,
													invitedCount: 1
												})
											}
										} else {
											// 创建新的IP数据
											ipMap.set(user.login_ip, {
												ip: user.login_ip,
												count: 1,
												inviters: [{
													code: inviteCode,
													invitedCount: 1
												}],
												riskLevel: '正常'
											})
										}
									}
								})
							}
						}
					}

					// 将Map转换为数组并设置风险级别
					const ipArray = Array.from(ipMap.values())
					ipArray.forEach(ipData => {
						if (ipData.count >= HIGH_RISK_THRESHOLD) {
							ipData.riskLevel = '高风险'
						} else if (ipData.count >= MEDIUM_RISK_THRESHOLD) {
							ipData.riskLevel = '中风险'
						}
					})

					// 按账号数量降序排序
					this.globalIpStats = ipArray.sort((a, b) => b.count - a.count)

					// 统计不同风险级别的IP数量
					this.countIpsByRiskLevel()

					// 保存到本地存储
					this.saveGlobalIpStatsToStorage()

					uni.showToast({
						title: `共统计${this.globalIpStats.length}个IP地址`,
						icon: 'none'
					})
				} catch (error) {
					console.error('刷新全局IP风险统计出错:', error)
					uni.showToast({
						title: '刷新全局IP风险统计失败',
						icon: 'none'
					})
				} finally {
					this.isLoadingGlobalIpStats = false
				}
			},

			/**
			 * 检测同一天大量邀请情况
			 */
			async refreshSameDayInviteStats() {
				this.isLoadingSameDayStats = true

				try {
					// 清空现有数据
					this.sameDayInviteStats = []

					// 创建一个Map来存储邀请人和同一天邀请的用户
					const inviterMap = new Map()

					// 遍历所有已检测的用户
					for (const inviteCode in this.checkedUsers) {
						const userData = this.checkedUsers[inviteCode]

						// 查询该用户邀请的所有账号
						if (userData.userId) {
							const {
								result: {
									data
								}
							} = await userCollection.where({
								invite_user_id: userData.userId
							}).field({
								login_ip: true,
								my_invite_code: true,
								register_date: true
							}).get()

							// 处理注册日期数据
							if (data && data.length > 0) {
								// 按注册日期分组
								const dateGroups = {}
								const ipSet = new Set()

								data.forEach(user => {
									if (user.register_date) {
										// 将时间戳转换为日期字符串（年-月-日）
										const date = new Date(user.register_date)
										const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

										if (!dateGroups[dateStr]) {
											dateGroups[dateStr] = []
										}

										dateGroups[dateStr].push(user)

										// 记录IP
										if (user.login_ip) {
											ipSet.add(user.login_ip)
										}
									}
								})

								// 检查每个日期组是否达到高风险阈值
								for (const dateStr in dateGroups) {
									const users = dateGroups[dateStr]
									if (users.length >= HIGH_RISK_THRESHOLD) {
										// 添加到同一天大量邀请统计
										this.sameDayInviteStats.push({
											inviteCode: inviteCode,
											registerDate: new Date(dateStr).getTime(),
											count: users.length,
											ipCount: ipSet.size
										})
										break // 只要有一天达到阈值就记录
									}
								}
							}
						}
					}

					// 按邀请数量降序排序
					this.sameDayInviteStats.sort((a, b) => b.count - a.count)

					// 保存到本地存储
					this.saveSameDayInviteStatsToStorage()

					uni.showToast({
						title: `发现${this.sameDayInviteStats.length}个同一天大量邀请账号`,
						icon: 'none'
					})
				} catch (error) {
					console.error('检测同一天大量邀请出错:', error)
					uni.showToast({
						title: '检测同一天大量邀请失败',
						icon: 'none'
					})
				} finally {
					this.isLoadingSameDayStats = false
				}
			},

			/**
			 * 格式化日期
			 * @param {Number} timestamp - 时间戳
			 * @return {String} 格式化后的日期字符串
			 */
			formatDate(timestamp) {
				const date = new Date(timestamp)
				return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
			},


			/**
			 * 清除数据
			 */
			clearData() {
				this.myInviteCode = ''
				this.userId = ''
				this.userInfo = {}
				this.invitedUsers = []
				this.filteredUsers = []
				this.ipSummary = []
				this.hasHighRiskIP = false
				this.isSelectedUserHighRisk = false,
					this.filterOptions = {
						device_oaid: '',
						my_invite_code: '',
						invite_time: null,
						login_ip: ''
					}
				this.sortOptions = {
					field: '',
					order: ''
				}
			},

			/**
			 * 编辑用户数据
			 * @param {String} userId - 用户ID
			 */
			editUser(userId) {
				uni.navigateTo({
					url: `/pages/member/users/edit?id=${userId}`
				})
			},

			/**
			 * 统计不同状态的用户数量
			 */
			countUsersByStatus() {
				// 重置计数
				this.normalUserCount = 0
				this.mediumRiskUserCount = 0
				this.highRiskUserCount = 0

				// 遍历永久会员列表，统计各状态数量
				this.permanentVipUsers.forEach(user => {
					if (!user.status || user.status === '正常') {
						this.normalUserCount++
					} else if (user.status === '中风险') {
						this.mediumRiskUserCount++
					} else if (user.status === '高风险' || user.status === '已封禁') {
						this.highRiskUserCount++
					}
				})
			},

			/**
			 * 按状态过滤永久会员列表
			 * @param {String} status - 状态类型
			 */
			filterByStatus(status) {
				this.statusFilter = status
				this.applyStatusFilter()
			},

			/**
			 * 应用状态过滤
			 */
			applyStatusFilter() {
				// 获取原始数据
				const originalData = [...this.permanentVipUsers]

				// 根据选择的状态进行过滤
				if (this.statusFilter === 'all') {
					// 不过滤，显示全部
					this.filteredPermanentVipUsers = originalData
				} else if (this.statusFilter === 'normal') {
					// 过滤出正常状态的用户
					this.filteredPermanentVipUsers = originalData.filter(user =>
						!user.status || user.status === '正常'
					)
				} else if (this.statusFilter === 'medium') {
					// 过滤出中风险状态的用户
					this.filteredPermanentVipUsers = originalData.filter(user =>
						user.status === '中风险'
					)
				} else if (this.statusFilter === 'high') {
					// 过滤出高风险状态的用户
					this.filteredPermanentVipUsers = originalData.filter(user =>
						user.status === '高风险'
					)
				} else if (this.statusFilter === 'banned') {
					// 过滤出已封禁状态的用户
					this.filteredPermanentVipUsers = originalData.filter(user =>
						user.status === '已封禁'
					)
				}
			},

			/**
			 * 查询永久会员用户
			 */
			async queryPermanentVipUsers() {
				this.isLoadingPermanentVip = true
				this.permanentVipUsers = [] // 清空现有数据

				try {
					// 先查询符合条件的记录总数
					const countResult = await userCollection.where({
						vip_expire_date: dbCmd.gte(PERMANENT_VIP_TIMESTAMP)
					}).count()

					const total = countResult.result.total
					const pageSize = 1000 // 每页最大记录数
					const totalPages = Math.ceil(total / pageSize)

					// 计算新增会员数量
					this.newMembersCount = Math.max(0, total - this.previousMembersCount)

					// 保存当前会员数量到本地存储
					this.savePermanentVipCountToStorage(total)

					// 显示查询开始提示
					if (total > pageSize) {
						uni.showLoading({
							title: `正在查询${total}条数据...`,
							icon: 'none',
							mask: true
						})
					}

					// 查询会员有效期大于等于2045年的用户（永久会员）
					// 循环查询所有页的数据
					for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
						const skipCount = (currentPage - 1) * pageSize

						// 更新加载提示
						if (total > pageSize) {
							uni.showLoading({
								title: `查询第${currentPage}/${totalPages}页...`,
								icon: 'none',
								mask: true
							})
						}

						// 查询当前页的永久会员
						const {
							result: {
								data
							}
						} = await userCollection.where({
							vip_expire_date: dbCmd.gte(PERMANENT_VIP_TIMESTAMP)
						}).field({
							my_invite_code: true,
							_id: true,
							status: true
						}).skip(skipCount).limit(pageSize).get()

						// 将当前页数据添加到结果集之前，先添加状态信息
						const processedData = data.map(item => {
							// 检查是否已被封禁
							if (item.status === 3) {
								return {
									...item,
									status: '已封禁'
								}
							}

							// 检查是否有检测历史
							const checkedInfo = this.checkedUsers[item.my_invite_code]
							if (checkedInfo) {
								return {
									...item,
									status: checkedInfo.status
								}
							}

							return {
								...item,
								status: '正常'
							}
						})

						// 将当前页数据添加到结果集
						this.permanentVipUsers = [...this.permanentVipUsers, ...processedData]
					}

					// 统计不同状态的用户数量
					this.countUsersByStatus()

					// 查询完成后显示结果
					if (total > 0) {
						uni.showToast({
							title: `共查询到${this.permanentVipUsers.length}个永久会员`,
							icon: 'none',
							duration: 3000
						})
					} else {
						uni.showToast({
							title: '暂无永久会员数据',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('查询永久会员出错:', error)
					uni.showToast({
						title: '查询永久会员失败',
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
					this.isLoadingPermanentVip = false
				}
			},

			/**
			 * 选择邀请码并自动执行检测
			 * @param {String} inviteCode - 邀请码
			 */
			selectInviteCode(inviteCode) {
				this.myInviteCode = inviteCode
				this.checkViolation()

				// 检查选中的用户是否为高风险用户
				this.checkSelectedUserRisk()
			},

			/**
			 * 检查当前选中的用户是否为高风险用户
			 */
			checkSelectedUserRisk() {
				// 检查是否有选中的用户
				if (!this.myInviteCode) {
					this.isSelectedUserHighRisk = false
					return
				}

				// 从检测历史中查找用户状态
				const checkedInfo = this.checkedUsers[this.myInviteCode]
				if (checkedInfo && (checkedInfo.status === '高风险' || checkedInfo.ipExceedBanThreshold === true)) {
					this.isSelectedUserHighRisk = true
				} else {
					// 从永久会员列表中查找用户状态
					const selectedUser = this.permanentVipUsers.find(user => user.my_invite_code === this.myInviteCode)
					this.isSelectedUserHighRisk = selectedUser && (selectedUser.status === '高风险' || selectedUser.status ===
						'已封禁')
				}
			},

			/**
			 * 封禁当前选中的用户
			 */
			async banSelectedUser() {
				if (!this.myInviteCode || !this.userId) {
					uni.showToast({
						title: '请先选择要封禁的用户',
						icon: 'none'
					})
					return
				}

				uni.showModal({
					title: '封禁确认',
					content: `确定要封禁邀请码为 ${this.myInviteCode} 的用户吗？操作不可撤销。`,
					success: async (res) => {
						if (res.confirm) {
							this.isLoading = true

							try {
								// 更新用户状态为已封禁(3)
								await userCollection.doc(this.userId).update({
									status: 3
								})

								// 更新本地检测历史
								if (this.checkedUsers[this.myInviteCode]) {
									this.checkedUsers[this.myInviteCode].status = '已封禁'
									this.saveCheckedUsersToStorage()
								}

								// 更新永久会员列表中的状态
								this.permanentVipUsers = this.permanentVipUsers.map(item => {
									if (item.my_invite_code === this.myInviteCode) {
										return {
											...item,
											status: '已封禁'
										}
									}
									return item
								})

								// 更新状态统计
								this.countUsersByStatus()

								uni.showToast({
									title: '用户已成功封禁',
									icon: 'success'
								})
							} catch (error) {
								console.error('封禁用户出错:', error)
								uni.showToast({
									title: '封禁用户失败，请重试',
									icon: 'none'
								})
							} finally {
								this.isLoading = false
							}
						}
					}
				})
			},

			/**
			 * 检测违规邀请
			 */
			async checkViolation() {
				// 验证邀请码
				if (this.myInviteCode == '' || this.myInviteCode.length != 6) {
					uni.showToast({
						title: '无效邀请码',
						icon: 'none'
					})
					return
				}

				this.isLoading = true

				try {
					// 1. 查询邀请人信息
					await this.queryInviter()

					// 2. 查询被邀请的用户列表
					if (this.userId) {
						await this.queryInvitedUsers()

						// 3. 保存检测结果到本地
						this.saveDetectionResult()

						// 4. 检查选中的用户是否为高风险用户
						this.checkSelectedUserRisk()

						// 5. 更新全局IP统计
						this.updateGlobalIpStats()
					}
				} catch (error) {
					console.error('检测违规邀请出错:', error)
					uni.showToast({
						title: '查询失败，请重试',
						icon: 'none'
					})
				} finally {
					this.isLoading = false
				}
			},

			/**
			 * 更新全局IP统计
			 */
			updateGlobalIpStats() {
				if (!this.ipSummary || this.ipSummary.length === 0) return

				// 遍历当前用户的IP统计
				this.ipSummary.forEach(ipItem => {
					// 只处理中风险和高风险IP
					if (ipItem.count < MEDIUM_RISK_THRESHOLD) return

					// 查找全局统计中是否已存在该IP
					const existingIpIndex = this.globalIpStats.findIndex(item => item.ip === ipItem.ip)

					if (existingIpIndex >= 0) {
						// 已存在，更新计数
						const existingIp = this.globalIpStats[existingIpIndex]

						// 检查邀请人是否已存在
						const existingInviterIndex = existingIp.inviters.findIndex(
							inviter => inviter.inviteCode === this.myInviteCode
						)

						if (existingInviterIndex >= 0) {
							// 更新邀请人的计数
							existingIp.inviters[existingInviterIndex].count = ipItem.count
						} else {
							// 添加新邀请人
							existingIp.inviters.push({
								inviteCode: this.myInviteCode,
								count: ipItem.count
							})
						}

						// 更新总计数（所有邀请人的账号总数）
						existingIp.count = existingIp.inviters.reduce((sum, inviter) => sum + inviter.count, 0)
					} else {
						// 不存在，添加新记录
						this.globalIpStats.push({
							ip: ipItem.ip,
							count: ipItem.count,
							inviters: [{
								inviteCode: this.myInviteCode,
								count: ipItem.count
							}]
						})
					}
				})

				// 按照账号数量降序排序
				this.globalIpStats.sort((a, b) => b.count - a.count)

				// 保存到本地存储
				this.saveGlobalIpStatsToStorage()
			},

			/**
			 * 导出IP黑名单
			 */
			exportIpBlacklist() {
				if (this.globalIpStats.length === 0) {
					uni.showToast({
						title: '暂无IP黑名单数据',
						icon: 'none'
					})
					return
				}

				// 生成黑名单文本
				let blacklistText = '# IP黑名单\n# 格式：IP地址 账号数量 风险等级\n\n'

				this.globalIpStats.forEach(item => {
					let riskLevel = '正常'
					if (item.count >= HIGH_RISK_THRESHOLD) {
						riskLevel = '高风险'
					} else if (item.count >= MEDIUM_RISK_THRESHOLD) {
						riskLevel = '中风险'
					}

					blacklistText += `${item.ip} ${item.count} ${riskLevel}\n`
				})

				this.ipBlacklistText = blacklistText

				// 显示弹窗
				this.$refs.ipBlacklistPopup.open()
			},

			/**
			 * 关闭IP黑名单弹窗
			 */
			closeIpBlacklistPopup() {
				this.$refs.ipBlacklistPopup.close()
			},

			/**
			 * 复制IP黑名单到剪贴板
			 */
			copyIpBlacklistToClipboard() {
				uni.setClipboardData({
					data: this.ipBlacklistText,
					success: () => {
						uni.showToast({
							title: '已复制到剪贴板',
							icon: 'success'
						})
					}
				})
			},

			/**
			 * 批量检测违规（检测未检查过的永久会员）
			 * 增加是否检查已封禁账号的选项
			 */
			async batchCheckViolation() {
				// 显示确认对话框，询问是否包含已封禁账号
				uni.showModal({
					title: '批量检测确认',
					content: '是否包含已封禁的账号进行检测？',
					cancelText: '不包含',
					confirmText: '包含',
					success: async (res) => {
						const includeBanned = res.confirm

						// 获取未检测的用户列表
						let usersToCheck = []

						if (includeBanned) {
							// 包含已封禁账号
							usersToCheck = this.permanentVipUsers.filter(user => {
								return !this.checkedUsers[user.my_invite_code] ||
									(this.checkedUsers[user.my_invite_code] &&
										this.checkedUsers[user.my_invite_code].status === '已封禁')
							})
						} else {
							// 不包含已封禁账号
							usersToCheck = this.permanentVipUsers.filter(user => {
								return !this.checkedUsers[user.my_invite_code] && user.status !== '已封禁'
							})
						}

						if (usersToCheck.length === 0) {
							uni.showToast({
								title: '没有未检测的永久会员',
								icon: 'none'
							})
							return
						}

						// 确认是否继续
						uni.showModal({
							title: '批量检测确认',
							content: `将对${usersToCheck.length}个未检测的永久会员进行违规检测，可能需要较长时间，是否继续？`,
							success: async (res) => {
								if (res.confirm) {
									await this.processBatchCheck(usersToCheck)
								}
							}
						})
					}
				})
			},

			/**
			 * 处理批量检测
			 * @param {Array} users - 待检测用户列表
			 */
			async processBatchCheck(users) {
				this.isLoading = true
				const total = users.length
				let processed = 0
				let highRiskCount = 0

				try {
					for (const user of users) {
						processed++

						// 更新进度提示
						uni.showLoading({
							title: `检测中(${processed}/${total})...`,
							icon: 'none',
							mask: true
						})

						// 检测当前用户
						this.myInviteCode = user.my_invite_code

						// 查询邀请人信息
						await this.queryInviter()

						// 如果找到用户ID，查询被邀请用户
						if (this.userId) {
							await this.queryInvitedUsers()

							// 保存检测结果
							this.saveDetectionResult()

							// 统计高风险用户
							if (this.hasHighRiskIP) {
								highRiskCount++
							}

							// 短暂延迟，避免请求过于频繁
							await new Promise(resolve => setTimeout(resolve, 1000))
						}
					}

					// 完成后刷新永久会员列表
					await this.queryPermanentVipUsers()

					uni.showToast({
						title: `检测完成，发现${highRiskCount}个高风险用户`,
						icon: 'none',
						duration: 3000
					})
				} catch (error) {
					console.error('批量检测出错:', error)
					uni.showToast({
						title: '批量检测失败，请重试',
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
					this.isLoading = false
				}
			},

			/**
			 * 封禁高风险用户
			 */
			async banHighRiskUsers() {
				// 从检测历史中筛选出高风险用户和超过封禁阈值的用户
				const highRiskUsers = Object.entries(this.checkedUsers)
					.filter(([_, info]) => {
						// 高风险用户或者IP数量超过封禁阈值的用户
						return info.status === '高风险' || info.ipExceedBanThreshold === true
					})
					.map(([code, info]) => ({
						my_invite_code: code,
						userId: info.userId
					}))

				if (highRiskUsers.length === 0) {
					uni.showToast({
						title: '未发现需要封禁的用户',
						icon: 'none'
					})
					return
				}

				uni.showModal({
					title: '封禁确认',
					content: `将封禁${highRiskUsers.length}个高风险用户，操作不可撤销，是否继续？`,
					success: async (res) => {
						if (res.confirm) {
							await this.processBanUsers(highRiskUsers)
						}
					}
				})
			},

			/**
			 * 处理封禁用户
			 * @param {Array} users - 待封禁用户列表
			 */
			async processBanUsers(users) {
				this.isLoading = true
				const total = users.length
				let processed = 0
				let successCount = 0

				try {
					for (const user of users) {
						processed++

						// 更新进度提示
						uni.showLoading({
							title: `封禁中(${processed}/${total})...`,
							mask: true
						})

						try {
							// 更新用户状态为已封禁(3)
							await userCollection.doc(user.userId).update({
								status: 3
							})

							// 更新本地检测历史
							this.checkedUsers[user.my_invite_code].status = '已封禁'

							successCount++
						} catch (err) {
							console.error(`封禁用户${user.my_invite_code}失败:`, err)
						}

						// 短暂延迟，避免请求过于频繁
						await new Promise(resolve => setTimeout(resolve, 1000))
					}

					// 保存更新后的检测历史
					this.saveCheckedUsersToStorage()

					// 刷新永久会员列表
					await this.queryPermanentVipUsers()

					uni.showToast({
						title: `成功封禁${successCount}个高风险用户`,
						icon: 'success',
						duration: 3000
					})
				} catch (error) {
					console.error('批量封禁出错:', error)
					uni.showToast({
						title: '批量封禁失败，请重试',
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
					this.isLoading = false
				}
			},

			/**
			 * 保存检测结果到本地存储
			 */
			saveDetectionResult() {
				// 确定风险状态
				let status = '正常'
				let ipExceedBanThreshold = false

				// 检查是否有IP超过封禁阈值
				const hasBanThresholdIP = this.ipSummary.some(item => item.count >= BAN_THRESHOLD)

				if (hasBanThresholdIP) {
					status = '高风险'
					ipExceedBanThreshold = true
				} else if (this.hasHighRiskIP) {
					status = '高风险'
				} else if (this.ipSummary.length > 0) {
					status = '中风险'
				}

				// 保存到检测历史
				this.checkedUsers[this.myInviteCode] = {
					userId: this.userId,
					status: status,
					ipExceedBanThreshold: ipExceedBanThreshold,
					checkTime: Date.now()
				}

				// 更新永久会员列表中的状态
				this.permanentVipUsers = this.permanentVipUsers.map(item => {
					if (item.my_invite_code === this.myInviteCode) {
						return {
							...item,
							status: status
						}
					}
					return item
				})

				// 更新状态统计
				this.countUsersByStatus()

				// 如果IP超过封禁阈值，提示用户
				if (ipExceedBanThreshold) {
					uni.showModal({
						title: '严重违规警告',
						content: `检测到该用户邀请的账号中存在同一IP地址下超过${BAN_THRESHOLD}个账号，已标记为需要封禁！`,
						showCancel: false
					})
				}

				// 保存到本地存储
				this.saveCheckedUsersToStorage()
			},

			/**
			 * 查询邀请人信息
			 */
			async queryInviter() {
				uni.showLoading({
					mask: true
				})

				try {
					// 使用嵌套解构赋值获取data属性
					const {
						result: {
							data
						}
					} = await userCollection.where({
						my_invite_code: this.myInviteCode
					}).get();

					if (data.length == 0) {
						uni.showToast({
							title: '用户不存在',
							icon: 'none'
						})
						return
					}

					this.userInfo = data[0]
					this.userId = data[0]._id
				} finally {
					uni.hideLoading()
				}
			},

			/**
			 * 查询被邀请的用户列表
			 * 并按照IP地址分组统计
			 */
			async queryInvitedUsers() {
				uni.showLoading({
					mask: true
				})

				try {
					// 查询被邀请的用户
					const {
						result: {
							data
						}
					} = await userCollection.where({
						inviter_uid: this.userId
					}).get();

					if (data.length === 0) {
						uni.showToast({
							title: '暂无邀请记录',
							icon: 'none'
						})
						return
					}

					// 统计IP地址分布
					const ipMap = new Map()

					data.forEach(user => {
						const ip = user.login_ip || '未知'
						if (ipMap.has(ip)) {
							ipMap.set(ip, ipMap.get(ip) + 1)
						} else {
							ipMap.set(ip, 1)
						}
					})

					// 转换为数组并按数量降序排序
					const ipArray = Array.from(ipMap, ([ip, count]) => ({
						ip,
						count
					}))
					ipArray.sort((a, b) => b.count - a.count)

					// 只保留数量大于等于中风险阈值的IP地址
					this.ipSummary = ipArray.filter(item => item.count >= MEDIUM_RISK_THRESHOLD)

					// 检查是否存在高风险IP（同IP注册 >= 高风险阈值）
					this.hasHighRiskIP = this.ipSummary.some(item => item.count >= HIGH_RISK_THRESHOLD)

					// 按IP地址分组排序
					data.sort((a, b) => {
						// 首先按IP地址出现次数排序（降序）
						const countA = ipMap.get(a.login_ip || '未知')
						const countB = ipMap.get(b.login_ip || '未知')

						if (countB !== countA) {
							return countB - countA
						}

						// 如果次数相同，则按IP地址排序
						return (a.login_ip || '未知').localeCompare(b.login_ip || '未知')
					})

					this.invitedUsers = data
					this.filteredUsers = [...data] // 初始化过滤后的用户列表
				} finally {
					uni.hideLoading()
				}
			},

			/**
			 * 获取指定IP地址的用户数量
			 * @param {String} ip - IP地址
			 * @return {Number} 用户数量
			 */
			getIPCount(ip) {
				const ipItem = this.ipSummary.find(item => item.ip === ip)
				return ipItem ? ipItem.count : 0
			},

			/**
			 * 判断是否为高风险IP
			 * @param {String} ip - IP地址
			 * @return {Boolean} 是否为高风险IP
			 */
			isHighRiskIP(ip) {
				return this.getIPCount(ip) >= HIGH_RISK_THRESHOLD
			},

			/**
			 * 表格过滤条件变化处理
			 * @param {Object} e - 事件对象
			 * @param {String} field - 字段名
			 */
			filterChange(e, field) {
				this.filterOptions[field] = e.value
				this.applyFilters()
			},

			/**
			 * 表格排序条件变化处理
			 * @param {Object} e - 事件对象
			 * @param {String} field - 字段名
			 */
			sortChange(e, field) {
				this.sortOptions.field = field
				this.sortOptions.order = e.order
				this.applyFilters()
			},

			/**
			 * 应用过滤和排序条件
			 */
			applyFilters() {
				// 先复制原始数据
				let result = [...this.invitedUsers]

				// 应用过滤条件
				if (this.filterOptions.device_oaid) {
					result = result.filter(item =>
						(item.device_oaid || '').toLowerCase().includes(this.filterOptions.device_oaid.toLowerCase())
					)
				}

				if (this.filterOptions.my_invite_code) {
					result = result.filter(item =>
						(item.my_invite_code || '').toLowerCase().includes(this.filterOptions.my_invite_code.toLowerCase())
					)
				}

				if (this.filterOptions.invite_time) {
					// 时间戳过滤逻辑
					const timestamp = new Date(this.filterOptions.invite_time).getTime()
					result = result.filter(item => {
						const itemDate = new Date(item.invite_time).setHours(0, 0, 0, 0)
						const filterDate = new Date(timestamp).setHours(0, 0, 0, 0)
						return itemDate === filterDate
					})
				}

				if (this.filterOptions.login_ip) {
					result = result.filter(item =>
						(item.login_ip || '').toLowerCase().includes(this.filterOptions.login_ip.toLowerCase())
					)
				}

				// 应用排序条件
				if (this.sortOptions.field && this.sortOptions.order) {
					result.sort((a, b) => {
						const fieldA = a[this.sortOptions.field]
						const fieldB = b[this.sortOptions.field]

						if (this.sortOptions.order === 'ascending') {
							return fieldA > fieldB ? 1 : -1
						} else {
							return fieldA < fieldB ? 1 : -1
						}
					})
				}

				this.filteredUsers = result
			}
		}
	}
</script>

<style lang="scss">
	.container {
		padding: 10px;
	}

	.card {
		background-color: #333;
	}

	.uni-card-txt {
		color: #fff;
	}

	/* 同一天大量邀请检测样式 */
	.same-day-invite-section {
		padding: 10px;
		background-color: #f8f8f8;
		border-radius: 4px;
	}

	.same-day-details {
		display: flex;
		flex-direction: column;
		margin: 5px 0;
		font-size: 14px;
	}

	/* 功能按钮区域样式 */
	.action-buttons {
		display: flex;
		gap: 10px;
		margin-bottom: 15px;
		flex-wrap: wrap;
	}

	.action-buttons-container {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	/* 新增会员徽章样式 */
	.new-members-badge {
		display: inline-block;
		background-color: #ff4d4f;
		color: white;
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 10px;
		margin-left: 8px;
		font-weight: normal;
	}

	/* 状态过滤单选框样式 */
	.status-filter {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
	}

	.filter-label {
		font-size: 14px;
		margin-bottom: 5px;
	}

	.radio-group {
		display: flex;
		gap: 15px;
	}

	.radio-item {
		display: flex;
		align-items: center;
		cursor: pointer;
	}

	.radio-circle {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 1px solid #ddd;
		margin-right: 5px;
		position: relative;
	}

	.radio-circle.selected {
		border-color: #1890ff;
	}

	.radio-circle.selected:after {
		content: '';
		position: absolute;
		width: 10px;
		height: 10px;
		background-color: #1890ff;
		border-radius: 50%;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	/* 全局IP风险统计样式 */
	.global-ip-section {
		padding: 10px;
		background-color: #f8f8f8;
		border-radius: 4px;
	}

	.ip-stats-scroll-container {
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid #e8e8e8;
		border-radius: 4px;
		padding: 5px;
		background-color: #fff;
		margin-top: 10px;
	}

	.ip-stats-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.ip-stats-item {
		background-color: #f9f9f9;
		border: 1px solid #eee;
		border-radius: 4px;
		padding: 10px;
	}

	.ip-stats-item.high-risk {
		background-color: #fff2f0;
		border-color: #ffccc7;
	}

	.ip-stats-item.medium-risk {
		background-color: #fffbe6;
		border-color: #ffe58f;
	}

	.ip-stats-header {
		display: flex;
		align-items: center;
		margin-bottom: 8px;
	}

	.ip-stats-inviters {
		margin-top: 5px;
	}

	.inviters-label {
		font-size: 14px;
		margin-right: 5px;
	}

	.inviters-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 5px;
	}

	.inviter-code {
		background-color: #e6f7ff;
		border: 1px solid #91d5ff;
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 12px;
		cursor: pointer;
		transition: all 0.3s;
	}

	.inviter-code:hover {
		background-color: #bae7ff;
		transform: translateY(-2px);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
	}

	/* IP黑名单弹窗样式 */
	.popup-content {
		background-color: #fff;
		border-radius: 8px;
		width: 80vw;
		max-width: 600px;
		overflow: hidden;
	}

	.popup-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px;
		border-bottom: 1px solid #eee;
		background-color: #f8f8f8;
	}

	.popup-close {
		font-size: 24px;
		cursor: pointer;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}

	.popup-close:hover {
		background-color: #eee;
	}

	.popup-body {
		padding: 15px;
		display: flex;
		flex-direction: column;
		gap: 15px;
	}

	.ip-blacklist-textarea {
		width: 100%;
		height: 200px;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 10px;
		font-family: monospace;
		resize: none;
	}







	.custom-forms-item {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
	}

	.uni-forms-item {
		margin-bottom: 12px;
		align-items: center;
	}

	.space-10 {
		width: 10px;
		height: 10px;
	}

	.section-title {
		font-size: 16px;
		font-weight: bold;
		margin: 15px 0 10px 0;
		display: block;
	}

	/* 状态统计样式 */
	.section-title-container {
		flex: 1;
	}

	.status-summary {
		display: flex;
		gap: 10px;
		margin-top: 5px;
	}

	.status-count {
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 10px;
	}

	.status-count.normal {
		background-color: #f6ffed;
		color: #52c41a;
	}

	.status-count.medium {
		background-color: #fffbe6;
		color: #faad14;
	}

	.status-count.high {
		background-color: #fff2f0;
		color: #ff4d4f;
	}

	.violation-warning {
		display: flex;
		align-items: center;
		background-color: #ffebeb;
		border: 1px solid #ffb3b3;
		border-radius: 4px;
		padding: 10px;
		margin: 10px 0;
	}

	.warning-text {
		color: #ff0000;
		margin-left: 10px;
		font-size: 14px;
	}

	.ip-statistics {
		margin: 15px 0;
		background-color: #f8f8f8;
		border-radius: 4px;
		padding: 10px;
	}

	.ip-list {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 10px;
	}

	.ip-item {
		display: flex;
		align-items: center;
		background-color: #fff;
		border: 1px solid #eee;
		border-radius: 4px;
		padding: 8px 12px;
		flex: 1;
		min-width: 200px;
	}

	.ip-item.high-risk {
		background-color: #fff2f0;
		border-color: #ffccc7;
	}

	.ip-item.medium-risk {
		background-color: #fffbe6;
		border-color: #ffe58f;
	}

	.ip-address {
		flex: 1;
		font-size: 14px;
	}

	.ip-count {
		margin: 0 10px;
		font-weight: bold;
		font-size: 14px;
	}

	.risk-level {
		padding: 2px 6px;
		border-radius: 10px;
		font-size: 12px;
	}

	.risk-level.high {
		background-color: #ff4d4f;
		color: #fff;
	}

	.risk-level.medium {
		background-color: #faad14;
		color: #fff;
	}

	.table-section {
		margin-top: 15px;
	}

	.high-risk-row {
		background-color: #fff1f0 !important;
	}

	.ip-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
	}

	.loading-container {
		margin: 20px 0;
		display: flex;
		justify-content: center;
	}

	/* 永久会员相关样式 - 水平流式布局 */
	.permanent-vip-section {
		padding: 10px;
		background-color: #f8f8f8;
		border-radius: 4px;
	}

	.permanent-vip-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}

	/* 添加滚动容器 */
	.invite-code-scroll-container {
		max-height: 300px;
		/* 设置最大高度，超出时显示滚动条 */
		overflow-y: auto;
		/* 垂直方向自动显示滚动条 */
		border: 1px solid #e8e8e8;
		border-radius: 4px;
		padding: 5px;
		background-color: #fff;
	}

	.invite-code-flow-list {
		display: flex;
		flex-flow: row wrap;
		gap: 10px;
	}

	.invite-code-item {
		position: relative;
		background-color: #e6f7ff;
		border: 1px solid #91d5ff;
		border-radius: 4px;
		padding: 6px 12px;
		cursor: pointer;
		transition: all 0.3s;
		display: inline-flex;
		align-items: center;
	}

	.invite-code-item:hover {
		background-color: #bae7ff;
		transform: translateY(-2px);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
	}

	/* 选中状态样式 */
	.invite-code-item.selected {
		background-color: #1890ff;
		color: white;
		border: 2px solid #096dd9;
		box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
		transform: translateY(-2px);
	}

	.invite-code-item.selected .status-badge {
		border: 1px solid white;
	}

	.invite-code-item.status-high-risk {
		background-color: #fff2f0;
		border-color: #ffccc7;
	}

	.invite-code-item.status-high-risk.selected {
		background-color: #ff4d4f;
		color: white;
		border: 2px solid #f5222d;
		box-shadow: 0 2px 8px rgba(245, 34, 45, 0.3);
	}

	.invite-code-item.status-medium-risk {
		background-color: #fffbe6;
		border-color: #ffe58f;
	}

	.invite-code-item.status-medium-risk.selected {
		background-color: #faad14;
		color: white;
		border: 2px solid #d48806;
		box-shadow: 0 2px 8px rgba(250, 173, 20, 0.3);
	}

	.invite-code-item.status-normal {
		background-color: #f6ffed;
		border-color: #b7eb8f;
	}

	.invite-code-item.status-normal.selected {
		background-color: #52c41a;
		color: white;
		border: 2px solid #389e0d;
		box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
	}

	.status-badge {
		margin-left: 6px;
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 10px;
		background-color: #e6f7ff;
	}

	.status-high-risk .status-badge {
		background-color: #ff4d4f;
		color: #fff;
	}

	.status-medium-risk .status-badge {
		background-color: #faad14;
		color: #fff;
	}

	.status-normal .status-badge {
		background-color: #52c41a;
		color: #fff;
	}
</style>
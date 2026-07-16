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
			<button type="default" :disabled="false" size="mini" @click="clearCheckedUsersStorage">清除检测历史</button>
		</view>
		
		<!-- 永久会员查询区域 -->
		<uni-collapse>
			<uni-collapse-item title="永久会员查询" :open="false">
				<view class="permanent-vip-section">
					<view v-if="isLoadingPermanentVip" class="loading-container">
						<uni-load-more status="loading" :content-text="loadingText"></uni-load-more>
					</view>
					<view v-else>
						<view class="permanent-vip-header">
							<text class="section-title">永久会员用户 (共{{permanentVipUsers.length}}人)</text>
							<button type="primary" size="mini" @click="queryPermanentVipUsers">刷新</button>
						</view>
						<view v-if="permanentVipUsers.length > 0" class="invite-code-scroll-container">
							<view class="invite-code-flow-list">
								<view 
									v-for="(item, index) in permanentVipUsers" 
									:key="index" 
									:class="['invite-code-item', getStatusClass(item.status)]"
									@click="selectInviteCode(item.my_invite_code)"
								>
									<text>{{item.my_invite_code}}</text>
									<text v-if="item.status" class="status-badge">{{item.status}}</text>
								</view>
							</view>
						</view>
						<view v-else class="no-data">
							<text>暂无永久会员数据</text>
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
			<text class="warning-text">检测到高风险邀请行为！存在同一IP地址下多个账号（≥5个），可能使用了分身软件进行批量注册。</text>
		</view>
		
		<!-- IP统计区域 -->
		<view v-if="ipSummary.length > 0" class="ip-statistics">
			<text class="section-title">IP地址分布统计</text>
			<view class="ip-list">
				<view v-for="(item, index) in ipSummary" :key="index" 
					:class="['ip-item', {'high-risk': item.count >= 5, 'medium-risk': item.count >= 2 && item.count < 5}]">
					<text class="ip-address">IP: {{item.ip}}</text>
					<text class="ip-count">{{item.count}}个账号</text>
					<text v-if="item.count >= 5" class="risk-level high">高风险</text>
					<text v-else-if="item.count >= 2" class="risk-level medium">中风险</text>
				</view>
			</view>
		</view>
		
		<!-- 邀请记录表格 -->
		<view v-if="invitedUsers.length > 0" class="table-section">
			<text class="section-title">邀请记录 (共{{invitedUsers.length}}人)</text>
			
			<uni-table ref="table" :loading="isLoading" emptyText="暂无数据" border stripe>
				<uni-tr>
					<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'device_oaid')">设备号</uni-th>
					<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'my_invite_code')">邀请码</uni-th>
					<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'invite_time')" sortable @sort-change="sortChange($event, 'invite_time')">邀请时间</uni-th>
					<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'login_ip')" sortable @sort-change="sortChange($event, 'login_ip')">最后登录IP</uni-th>
				</uni-tr>
				<uni-tr v-for="(item, index) in filteredUsers" :key="index" :class="{'high-risk-row': isHighRiskIP(item.login_ip)}">
					<uni-td align="center">{{item.device_oaid || '无'}}</uni-td>
					<uni-td align="center">{{item.my_invite_code}}</uni-td>
					<uni-td align="center">
						<uni-dateformat :threshold="[0, 0]" :date="item.invite_time"></uni-dateformat>
					</uni-td>
					<uni-td align="center">
						<view class="ip-cell">
							<text>{{item.login_ip}}</text>
							<uni-tag v-if="getIPCount(item.login_ip) >= 5" text="高风险" type="error" size="mini"></uni-tag>
							<uni-tag v-else-if="getIPCount(item.login_ip) >= 2" text="中风险" type="warning" size="mini"></uni-tag>
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>
		</view>
		
		<view v-if="isLoading" class="loading-container">
			<uni-load-more status="loading" :content-text="loadingText"></uni-load-more>
		</view>
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
	
	// 本地存储键名
	const STORAGE_KEY = 'violation_detection_history'
	
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
				checkedUsers: {}, // 已检测用户记录
				highRiskUsers: [], // 高风险用户列表
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
			// 然后查询永久会员
			this.queryPermanentVipUsers()
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
			 * 清除本地存储的检测历史
			 */
			clearCheckedUsersStorage() {
				uni.removeStorage({
					key: STORAGE_KEY,
					success: () => {
						this.checkedUsers = {}
						console.log('检测历史已清除')
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
							return item
						})
						
						// 将当前页数据添加到结果集
						this.permanentVipUsers = [...this.permanentVipUsers, ...processedData]
					}
					
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
			 * 批量检测违规（检测未检查过的永久会员）
			 */
			async batchCheckViolation() {
				// 筛选出未检测过的永久会员
				const uncheckedUsers = this.permanentVipUsers.filter(user => 
					!this.checkedUsers[user.my_invite_code] && user.status !== '已封禁'
				)
				
				if (uncheckedUsers.length === 0) {
					uni.showToast({
						title: '所有永久会员已检测',
						icon: 'none'
					})
					return
				}
				
				uni.showModal({
					title: '批量检测确认',
					content: `将对${uncheckedUsers.length}个未检测的永久会员进行违规检测，可能需要较长时间，是否继续？`,
					success: async (res) => {
						if (res.confirm) {
							await this.processBatchCheck(uncheckedUsers)
						}
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
				// 从检测历史中筛选出高风险用户
				const highRiskUsers = Object.entries(this.checkedUsers)
					.filter(([_, info]) => info.status === '高风险')
					.map(([code, info]) => ({
						my_invite_code: code,
						userId: info.userId
					}))
				
				if (highRiskUsers.length === 0) {
					uni.showToast({
						title: '未发现高风险用户',
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
				if (this.hasHighRiskIP) {
					status = '高风险'
				} else if (this.ipSummary.length > 0) {
					status = '中风险'
				}
				
				// 保存到检测历史
				this.checkedUsers[this.myInviteCode] = {
					userId: this.userId,
					status: status,
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
					const ipArray = Array.from(ipMap, ([ip, count]) => ({ ip, count }))
					ipArray.sort((a, b) => b.count - a.count)
					
					// 只保留数量大于等于2的IP地址
					this.ipSummary = ipArray.filter(item => item.count >= 2)
					
					// 检查是否存在高风险IP（同IP注册 >= 5个账户）
					this.hasHighRiskIP = this.ipSummary.some(item => item.count >= 5)
					
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
				return this.getIPCount(ip) >= 5
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
			max-height: 300px; /* 设置最大高度，超出时显示滚动条 */
			overflow-y: auto; /* 垂直方向自动显示滚动条 */
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
		
		.invite-code-item.status-high-risk {
			background-color: #fff2f0;
			border-color: #ffccc7;
		}
		
		.invite-code-item.status-medium-risk {
			background-color: #fffbe6;
			border-color: #ffe58f;
		}
		
		.invite-code-item.status-normal {
			background-color: #f6ffed;
			border-color: #b7eb8f;
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
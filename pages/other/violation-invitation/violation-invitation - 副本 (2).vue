<template>
	<view class="container">
		<uni-card class="card" :is-shadow="false" :is-full="false" :border="true" margin="0 0 10px 0">
			<text class="uni-card-txt">违规邀请检测系统</text>
		</uni-card>

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
		methods: {
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
</style>
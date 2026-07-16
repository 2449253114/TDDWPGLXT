<template>
	<view class="fix-top-window">
		<view class="uni-header">
			
		</view>
		<view class="uni-container">
			<view class="uni-stat--x flex">
				<uni-stat-tabs label="日期选择" :current="currentDateTab" mode="date" :today="true" @change="changeTimeRange" />
				<uni-datetime-picker type="datetimerange" :end="new Date().getTime()" v-model="query.start_time" returnType="timestamp" :clearIcon="false" class="uni-stat-datetime-picker" :class="{'uni-stat__actived': currentDateTab < 0 && !!query.start_time.length}" @change="useDatetimePicker" />
			</view>
			<template>
				<uni-card :is-shadow="false" margin="0" style="margin-bottom: 15px;">
					<text class="uni-h6">活跃就是今天登录的意思，所以昨日不精准，因为昨天的人，今天登录了，就不算昨天的了</text>
				</uni-card>
				<uni-stat-panel :items="userPanelData" :contrast="true" />
				<view class="uni-stat--x p-m">
					<uni-collapse ref="collapse">
						<uni-collapse-item title="用户统计 趋势图" :open="true" :border="false">
							<template slot="title">
								<view class="uni-stat-card-header">
									趋势图
								</view>
							</template>
							<uni-stat-tabs type="box" v-model="userChartTab" :tabs="userChartTabs" class="mb-l" @change="userChangeChartTab" />
							<view class="uni-charts-box">
								<qiun-data-charts type="area" :chartData="userChartData" :eopts="userEopts" :opts="opts" />
							</view>
						</uni-collapse-item>
					</uni-collapse>
				</view>
			</template>
		</view>
	</view>
</template>

<script>
	import {
		mapfields,
		getTimeOfSomeDayAgo,
		division,
		formatDate,
		parseDateTime
	} from '@/js_sdk/uni-stat/util.js'
	
	import {
		getTodayTimestamp,
		calculateTodayUsers,
		calculateAndCompareUserStats,
		formatDeviceOaid
	} from './../common/fun.js'
	
	import {
		updateUserFieldValue
	} from './updateFieldUtils.js';
	
	import {
		userFieldsMap,
		orderFieldsGroupMap,
		statPanelTodayOrderFieldsMap
	} from './fieldsMap.js'
	
	const userPanelOption = userFieldsMap.filter(f => f.hasOwnProperty('value'))
	
	const db = uniCloud.database()
	const dbCmd = db.command

	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)

	// 支付订单数据库表
	const payOrdersCollectionName = 'user-payment-orders'
	const payOrdersCollection = db.collection(payOrdersCollectionName)
	
	export default {
		data() {
			return {
				userTableData: [],// 用户数据
				total_users: 0, // 用户总数（必须项）
				// #
				filter_users_by_invite_count: [],// 按邀请计数筛选用户 后的 用户数据
				// #
				loading: false,
				minInviteCount: 5,
				// #
				userFieldsMap,
				query: {
					dimension: 'hour',
					channel_id: ''
				},
				loading: false,
				currentDateTab: 2,
				currentDaysTab: 7,
				userChartTab: 'today_new_user_count',
				userPanelData: userPanelOption,
				userChartData: {},
				userEopts: {
					seriesTemplate: [{
						itemStyle: {
							borderWidth: 2,
							borderColor: '#1890FF',
							color: '#1890FF'
						},
						areaStyle: {
							color: {
								colorStops: [{
									offset: 0,
									color: '#1890FF', // 0% 处的颜色
								}, {
									offset: 1,
									color: '#FFFFFF' // 100% 处的颜色
								}]
							}
						}
					}, {
						// smooth: false,
						lineStyle: {
							color: '#ea7ccc',
							width: 2,
							type: 'dashed'
						},
						itemStyle: {
							borderWidth: 1,
							borderColor: '#ea7ccc',
							color: '#ea7ccc'
						},
						areaStyle: null
					}]
				},
				opts: {
				        color: ["#1890FF","#91CB74","#FAC858","#EE6666","#73C0DE","#3CA272","#FC8452","#9A60B4","#ea7ccc"],
				        padding: [15,15,0,15],
				        enableScroll: false,
				        legend: {},
				        xAxis: {
				          disableGrid: true
				        },
				        yAxis: {
				          gridType: "dash",
				          dashLength: 2
				        },
				        extra: {
				          area: {
				            type: "curve",
				            opacity: 0.2,
				            addLine: true,
				            width: 2,
				            gradient: true,
				            activeType: "hollow"
				          }
				        }
				      },
				tabIndex: 0,
				tabName: '新增用户',
			}
		},
		computed: {
			userChartTabs() {
				const tabs = []
				userFieldsMap.forEach(item => {
					const _id = item.field
					const name = item.title
					// 过滤掉其他项，只保留新增用户、总用户数
					if (_id && name && _id.startsWith('today_new_user_count') || name && _id.startsWith('total_users')) {
						tabs.push({
							_id,
							name
						});
					}
				})
				return tabs
			},
		},
		onReady() {
			this.loadData();
		},
		methods: {
			async loadData() {
				uni.showLoading()
				await this.queryUserCounts()
				await this.fetchUserData()
				//await this.updateVipStatuses()
				// 初始化图表数据
				await this.calculateUserStatsForChart()
				uni.hideLoading()
			},
			async queryUserCounts() {
				const {
					result
				} = await userCollection.count()
				this.total_users = result.total
				// 更新总用户数的值
				updateUserFieldValue(this.userFieldsMap, 'total_users', result.total);
			},
			// 获取用户数据
			async fetchUserData() {
				const totalUsers = this.total_users
				const MAX_LIMIT = 1000; // uniapp的limit最大值
				let allUsers = []
			
				for (let i = 0; i < totalUsers; i += MAX_LIMIT) {
					// 当前第i页的数据
					console.log(`当前第${i / MAX_LIMIT + 1}页`);
					const {
						result
					} = await userCollection.skip(i).limit(MAX_LIMIT).get();
					allUsers = allUsers.concat(result.data);
				}
				console.log('所有用户:', allUsers);
			
				this.userTableData = allUsers;
			
				// 在获取数据后立即计算统计信息并更新字段
				this.updateTableFieldsWithStats();
				
				
				// 更新用户数据，附上邀请人数
				//this.updateUsersWithInviteCounts(allUsers);
				// 更新用户数据，附上未登录天数
				//this.updateUsersWithDaysSinceLastLogin(this.userTableData)
				// 过滤掉邀请人数低于 minInviteCount 的用户
				//this.filterUsersByInviteCount()
			},
			// 更新表格字段以包含统计信息
			updateTableFieldsWithStats() {
				// 计算并比较今日与昨日的用户统计数据
				const {
					todayNewUsers,
					yesterdayNewUsers,
					todayActiveUsers,
					yesterdayActiveUsers,
					todayActiveVipUsers,
					yesterdayActiveVipUsers,
					todayActiveRegularUsers,
					yesterdayActiveRegularUsers,
					lastHourOnlineUsers,
					lastHourOnlineVipUsers,
					lastHourOnlineRegularUsers,
					todayTotalUsers, 
					yesterdayTotalUsers
				} = calculateAndCompareUserStats(this.userTableData, this.userFieldsMap);
				
				// 更新 userFieldsMap 中的数据，同时提供今日和昨日的数据
				updateUserFieldValue(this.userFieldsMap, 'today_new_user_count', todayNewUsers, yesterdayNewUsers);
				updateUserFieldValue(this.userFieldsMap, 'today_active_user_count', todayActiveUsers, yesterdayActiveUsers);
				updateUserFieldValue(this.userFieldsMap, 'today_active_vip_user_count', todayActiveVipUsers, yesterdayActiveVipUsers);
				updateUserFieldValue(this.userFieldsMap, 'today_active_regular_user_count', todayActiveRegularUsers, yesterdayActiveRegularUsers);
				
				updateUserFieldValue(this.userFieldsMap, 'last_hour_online_user_count', lastHourOnlineUsers);
				updateUserFieldValue(this.userFieldsMap, 'last_hour_online_vip_user_count', lastHourOnlineVipUsers);
				updateUserFieldValue(this.userFieldsMap, 'last_hour_online_regular_user_count', lastHourOnlineRegularUsers);
				
				updateUserFieldValue(this.userFieldsMap, 'total_users', todayTotalUsers, yesterdayTotalUsers);
				// 如果需要更新昨日数据，可以继续添加相应的更新逻辑
				
			},
			// 更新用户数据，附上邀请人数
			updateUsersWithInviteCounts(users) {
				let inviteCounts = this.countInvites(users);
			
				this.userTableData = users.map(user => ({
					...user,
					inviteCount: inviteCounts[user._id] || 0
				})).sort((a, b) => b.inviteCount - a.inviteCount); // 添加排序逻辑;
			},
			// 统计每个用户的邀请人数
			countInvites(users) {
				let inviteCounts = {};
				users.forEach(user => {
					if (user.inviter_uid) {
						if (!inviteCounts[user.inviter_uid]) {
							inviteCounts[user.inviter_uid] = 0;
						}
						inviteCounts[user.inviter_uid]++;
					}
				});
				return inviteCounts;
			},
			/**
			 * 根据最小邀请人数阈值过滤用户
			 * 这个方法会更新 userTableData，以包含邀请人数不低于 minInviteCount 的用户
			 */
			filterUsersByInviteCount() {
				// 打印确认操作的信息，说明当前设置的最小邀请人数阈值
				console.log(`确认按钮被点击：邀请人数低于 ${this.minInviteCount} 不显示`);
			
				// 根据最小邀请人数阈值过滤用户数据
				this.filter_users_by_invite_count = this.userTableData.filter(user => user.inviteCount >= this.minInviteCount);
			
				// 这个操作将使 userTableData 只包含邀请人数不低于 minInviteCount 的用户
			},
			// 更新用户数据，附上未登录天数
			updateUsersWithDaysSinceLastLogin(users) {
				let daysSinceLastLogin = this.countDaysSinceLastLogin(users);
			
				this.userTableData = users.map(user => ({
					...user,
					daysSinceLastLogin: daysSinceLastLogin[user._id] || 'Never logged in'
				})).sort((a, b) => b.login_date - a.login_date); // 添加排序逻辑;
			
				// 如果需要，可以在这里添加排序逻辑
			},
			/**
			 * 统计每个用户的未登录天数。
			 * @param {Array} users 用户数组，每个用户对象包含login_date字段。
			 * @returns {Object} 返回一个键为用户ID，值为未登录天数的对象。
			 */
			countDaysSinceLastLogin(users) {
				const currentTimestamp = Date.now();
				const millisecondsPerDay = 1000 * 60 * 60 * 24;
				let daysSinceLastLogin = {};
			
				users.forEach(user => {
					if (user.login_date) {
			
						const lastLoginTimestamp = user.login_date;
						const daysDifference = Math.floor((currentTimestamp - lastLoginTimestamp) /
							millisecondsPerDay);
						daysSinceLastLogin[user._id] = daysDifference;
					} else {
						// 如果用户从未登录过，可以根据业务逻辑自定义处理
						// 例如，可以设置一个默认值或者直接忽略这个用户
						daysSinceLastLogin[user._id] = 'Never logged in'; // 或者其他默认值
					}
				});
			
				return daysSinceLastLogin;
			},
			formatDeviceOaid,
			// 计算未登录天数的方法
			calculateDaysSinceLastLogin(loginDate) {
				if (!loginDate) {
					return '从未登录';
				}
				const currentTimestamp = Date.now();
				const millisecondsPerDay = 1000 * 60 * 60 * 24;
				const daysDifference = Math.floor((currentTimestamp - loginDate) / millisecondsPerDay);
				return daysDifference;
			},
			/**
			 * 更新VIP状态。
			 * 此函数首先调用revokeExpiredVipStatus函数来撤销所有过期的VIP状态，
			 * 然后调用fixAccidentalNonVipStatus函数来修复由于意外标记为非VIP的用户，
			 * 这确保了VIP状态的准确性。
			 * 
			 * @returns {Promise<void>} - 返回一个Promise对象，用于异步操作。
			 */
			async updateVipStatuses() {
				await this.revokeExpiredVipStatus(); // 撤销已过期VIP用户的状态
				await this.fixAccidentalNonVipStatus(); // 修正错误标记的非VIP用户状态
			},
			/**
			 * 撤销过期的VIP状态。
			 * 此函数搜索所有vip_expire_date小于当前时间且vip标记为true的用户，
			 * 并将这些用户的vip状态更新为false，以撤销其VIP状态。
			 * 
			 * @returns {Promise<void>} - 返回一个Promise对象，用于异步操作。
			 */
			async revokeExpiredVipStatus() {
				// 获取当前时间戳
				const currentTime = Date.now();
			
				// 查询所有VIP过期的用户ID
				const {
					result: expiredVipUsersResult
				} = await userCollection.where({
					vip_expire_date: {
						$lt: currentTime
					}, // vip_expire_date < 现在时间
					vip: true // 当前标记为VIP的用户
				}).field({
					_id: true // 只返回需要的字段，即用户ID
				}).get();
			
				console.log('expiredVipUsersResult', expiredVipUsersResult)
			
				// 提取所有过期用户的ID
				const ids = expiredVipUsersResult.data.map(user => user._id);
			
				// 如果没有过期的VIP用户，则不执行更新操作
				if (ids.length === 0) {
					return;
				}
			
				// 批量更新VIP状态为false
				await userCollection.where({
					_id: {
						$in: ids
					}
				}).update({
					vip: false
				});
			
				uni.showToast({
					title: `VIP状态已更新，影响的用户数: ${ids.length}`,
					icon: 'none'
				})
			
				// 返回一个成功的提示信息或进行其他的后续处理
				console.log(`VIP状态已更新，影响的用户数: ${ids.length}`);
			},
			/**
			 * 修复因为特殊意外情况（例如用户在VIP状态更新期间充值）而错误标记为非VIP的用户。
			 * 此函数搜索所有vip_expire_date大于当前时间但vip标记为false的用户，
			 * 并将这些用户的vip状态更新为true。
			 * 
			 * @returns {Promise<void>} - 返回一个Promise对象，用于异步操作。
			 */
			async fixAccidentalNonVipStatus() {
				// 获取当前时间戳
				const currentTime = Date.now();
			
				// 查询所有应该是VIP但被意外标记为非VIP的用户
				const {
					result: accidentalNonVipUsersResult
				} = await userCollection.where({
					vip_expire_date: {
						$gt: currentTime
					}, // vip_expire_date > 现在时间
					vip: false // 错误地标记为非VIP的用户
				}).field({
					_id: true // 只返回需要的字段，即用户ID
				}).get();
			
				console.log('accidentalNonVipUsersResult', accidentalNonVipUsersResult)
			
				// 提取所有被意外标记为非VIP的用户ID
				const ids = accidentalNonVipUsersResult.data.map(user => user._id);
			
				// 如果没有被意外标记为非VIP的用户，则不执行更新操作
				if (ids.length === 0) {
					return;
				}
			
				// 批量更新VIP状态为true
				await userCollection.where({
					_id: {
						$in: ids
					}
				}).update({
					vip: true
				});
			
				uni.showToast({
					title: `VIP状态已修复，影响的用户数: ${ids.length}`,
					icon: 'none'
				})
			
				// 返回一个成功的提示信息或进行其他的后续处理
				console.log(`VIP状态已修复，影响的用户数: ${ids.length}`);
			},
			
			
			
			
			// 计算过去七天每天的统计数据
			calculateUserStatsForChart() {
				// 要判断当前tab选择的类型 
				// ??Type或者？= this.tabIndex（0=新增用户，1=总用户数），然后展示需求还是按照下面的代码逻辑一样
				
			    const daysToDisplay = this.currentDaysTab; // 使用用户选择的时间范围，默认为7天
				
			    let chartData = {
					categories: [],
					series: [{ name: this.tabName, data: [] }]
				};
			
			    // 计算过去几天的日期和统计数据
			    if (daysToDisplay >= 7) {
					// 如果选择的天数大于等于7天，则按天展示数据
					for (let i = daysToDisplay - 1; i >= 0; i--) {
						let timestamp = getTimeOfSomeDayAgo(i);// 获取指定日期当天或 n 天前零点的时间戳，丢弃时分秒
						let dateString = parseDateTime(timestamp);
						chartData.categories.push(dateString);
			
						let dailyNewUsers = 0; // 每日新增用户
						let totalUsersUpToThisDay = 0; // 截至今天的用户总数
						const dayTimestamp = 24 * 60 * 60 * 1000 // 一天的时间戳
						
						this.userTableData.forEach(user => {
							if (user.register_date >= timestamp && user.register_date < timestamp + 86400000) {
								// 新增用户数据
								dailyNewUsers++;
							}
							if (user.register_date < timestamp) {
								// 截止到选择的 过去n天数0点的 总用户数
								totalUsersUpToThisDay++;
							}
						});
			
						// 根据当前选中的标签决定展示何种数据
						let dataCount = this.tabIndex === 0 ? dailyNewUsers : totalUsersUpToThisDay;
						chartData.series[0].data.push(dataCount);
					}
				} else {
					// 如果选择的天数小于7天，则按小时展示当天的数据
					// 获取当天0点时间戳或选择的天数之前的0点时间戳
					let dayTimestamp = getTimeOfSomeDayAgo(daysToDisplay);
					for (let i = 0; i < 24; i++) {
						let timestamp = dayTimestamp + i * 3600000; // 计算每个小时的开始时间戳
						let hourString = `${i < 10 ? '0' + i : i}:00`;
						chartData.categories.push(hourString); // 使用push来确保从0点开始到23点结束的顺序
		
						let hourlyNewUsers = 0;// 小时新用户
						let totalUsersUpToThisHour = 0; // 截至本小时的用户总数
						
						this.userTableData.forEach(user => {
							if (user.register_date >= timestamp && user.register_date < timestamp + 3600000) {
								// 新增用户数据
								hourlyNewUsers++;
							}
							if (user.register_date < timestamp) {
								// 截止到选择的 过去n天数n点的 总用户数
								totalUsersUpToThisHour++;
							}
						});
		
						// 根据当前选中的标签决定展示何种数据
						let dataCount = this.tabIndex === 0 ? hourlyNewUsers : totalUsersUpToThisHour;
						chartData.series[0].data.push(dataCount);
					}
					
				}
				
				console.log("chartData.categories,", chartData.categories)
			    
			    this.userChartData = chartData;
			},
			
			
			changeTimeRange(id, index) {
				this.currentDateTab = index
				this.currentDaysTab = id // 天数
				const day = 24 * 60 * 60 * 1000
				let start, end
				start = getTimeOfSomeDayAgo(id)
				if (!id) {
					end = getTimeOfSomeDayAgo(0) + day - 1
				} else {
					end = getTimeOfSomeDayAgo(0) - 1
				}
				this.query.start_time = [start, end]
				this.calculateUserStatsForChart()
			},
			
			userChangeChartTab(id, index, name) {
				this.tabIndex = index
				this.tabName = name
				//this.getChartData(this.query, id, name)
				// 当标签页改变时，重新计算图表数据
				this.calculateUserStatsForChart();
			},
		}
	}
</script>

<style>
	.uni-stat-card-header {
		display: flex;
		justify-content: space-between;
		color: #555;
		font-size: 14px;
		font-weight: 600;
		padding: 10px 0;
		margin-bottom: 15px;
	}

	.uni-stat-card-header-link {
		cursor: pointer;
	}
</style>

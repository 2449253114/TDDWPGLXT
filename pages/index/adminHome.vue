<template>
	<view class="fix-top-window">
		<view class="uni-header">
			<!-- 统计面包屑 -->
			<!-- <uni-stat-breadcrumb class="uni-stat-breadcrumb-on-phone" /> -->
			<view class="uni-group">
				<view class="uni-sub-title hide-on-phone">
					<button class="uni-button" type="primary" size="mini" @click="loadData">加载数据</button>
				</view>
				<button class="uni-button" type="primary" size="mini" @click="navTo('/pages/index/uni-stat/uni-stat')">前往新统计页面</button>
				
			</view>
		</view>
		<view class="uni-container">
			<view class="uni-stat-card-header">注册用户概览</view>
			<div class="container">
				<div class="card">
					<div class="text-small">今日新增用户</div>
					<div class="text-large">{{ today_new_user_count }}</div>
				</div>
				<div class="card">
					<div class="text-small">今日活跃用户</div>
					<div class="text-large">{{ today_active_user_count }}</div>
				</div>
				<div class="card">
					<div class="text-small">总用户数</div>
					<div class="text-large">{{ total_users }}</div>
				</div>
			</div>
			<div class="container">
				<div class="card">
					<div class="text-small">今日活跃的VIP用户</div>
					<div class="text-large">{{ today_active_vip_user_count }}</div>
				</div>
				<div class="card">
					<div class="text-small">今日活跃的普通用户</div>
					<div class="text-large">{{ today_active_regular_user_count }}</div>
				</div>
			</div>
			<div class="container">
				<div class="card">
					<div class="text-small">近1小时内在线的总用户数</div>
					<div class="text-large">{{ last_hour_online_user_count }}</div>
				</div>
				<div class="card">
					<div class="text-small">近1小时内在线的VIP用户数</div>
					<div class="text-large">{{ last_hour_online_vip_user_count }}</div>
				</div>
				<div class="card">
					<div class="text-small">近1小时内在线的普通用户数</div>
					<div class="text-large">{{ last_hour_online_regular_user_count }}</div>
				</div>
			</div>
			

			<view class="uni-stat-card-header">商品订单概览</view>
			<div class="container">
				<div class="card">
					<div class="text-small">今日订单总数</div>
					<div class="text-large">{{ today_total_pay_orders }}</div>
				</div>
				<div class="card">
					<div class="text-small">今日订单总额</div>
					<div class="text-large">{{ today_total_order_amount }}</div>
				</div>
				<div class="card">
					<div class="text-small">订单总数</div>
					<div class="text-large">{{ total_pay_orders }}</div>
				</div>
				<div class="card">
					<div class="text-small">订单总额</div>
					<div class="text-large">{{ total_order_amount }}</div>
				</div>
				<div class="card">
					<div class="text-small">订单退款总金额</div>
					<div class="text-large">{{ total_refund_amount }}</div>
				</div>
			</div>
			<div class="container">
				<div class="card">
					<div class="text-small">今日注册用户的订单数</div>
					<div class="text-large">{{ today_registered_and_paid_orders_amount }}</div>
				</div>
				<div class="card">
					<div class="text-small">今日注册用户的订单总额</div>
					<div class="text-large">{{ today_registered_user_order_count }}</div>
				</div>
			</div>
			<!-- 表格组件 -->
			<uni-table style="width: 500px;" border stripe>
				<uni-tr>
					<uni-th width="120px" align="left">用户id</uni-th>
					<uni-th width="120px" align="left">注册日期</uni-th>
					<uni-th width="120px" align="left">订单总额</uni-th>
				</uni-tr>
				<uni-tr v-for="(item ,index) in todayOrdersUserInfo" :key="index">
					<uni-td>{{ item.user_id }}</uni-td>
					<uni-td>{{ item.register_date }}</uni-td>
					<uni-td>{{ item.order_amount }}</uni-td>
				</uni-tr>
			</uni-table>
			

			<view class="uni-stat-card-header">从营收日起（第一笔订单）</view>
			<div class="container">
				<div class="card">
					<div class="text-small">第一笔成交日</div>
					<div class="text-large">{{ first_transaction_date }}</div>
				</div>
				<div class="card">
					<div class="text-small">平均每天收益</div>
					<div class="text-large">{{ average_daily_revenue }}</div>
				</div>
				<div class="card">
					<div class="text-small">从营收以来过了多少天</div>
					<div class="text-large">{{ days_since_first_transaction }}</div>
				</div>
			</div>

			<view class="uni-stat-card-header">商品销量统计</view>
			<div class="container">
				<div v-for="(count, fee) in calculateSalesData" :key="fee" class="card">
					<!-- <div class="text-small">高级会员开通</div> -->
					<div class="text-small">单价</div>
					<div class="text-large">{{ fee }}</div>
					<div class="line"><!-- 横线 --></div>
					<div class="text-small text-sales-small">销量</div>
					<div class="text-large xiaoliang-count">{{ count }}</div>
				</div>
			</div>
			
			<view class="uni-stat-card-header" v-if="calculatePurchasesData.length >= 1">用户购买次数统计</view>
			<div class="container">
				<div v-for="(count, userId) in calculatePurchasesData" :key="userId" class="card">
					<div class="text-small">用户ID: {{ userId }}</div>
					<div class="text-large" style="font-size: 1.20rem;">购买次数: {{ count }}</div>
				</div>
			</div>
			
			<div class="container">
				<view class="uni-title">{{`邀请人数低于${minInviteCount}不显示`}}</view>
				<!-- 输入框 -->
				<input class="uni-search" type="text" v-model="minInviteCount" @confirm="filterUsersByInviteCount" />
				<!-- 确认按钮 -->
				<button class="uni-button" type="default" size="mini" @click="filterUsersByInviteCount">确认</button>
			</div>
			<!-- 表格组件 -->
			<uni-table style="width: 500px;" border stripe>
				<uni-tr>
					<uni-th width="120px" align="left">设备号</uni-th>
					<uni-th width="120px" align="left">邀请码</uni-th>
					<uni-th width="120px" align="left">邀请人数</uni-th>
					<uni-th width="120px" align="left">未登录天数</uni-th>
				</uni-tr>
				<uni-tr v-for="(item ,index) in filter_users_by_invite_count" :key="index">
					<uni-td>
						<p>{{ formatDeviceOaid(item.device_oaid) }}</p>
						<p>{{ item._id }}</p>
					</uni-td>
					<uni-td>{{ item.my_invite_code }}</uni-td>
					<uni-td>{{ item.inviteCount }}</uni-td>
					<uni-td>
						<!-- login_date: 1715877393591 -->
						{{ calculateDaysSinceLastLogin(item.login_date) }}
					</uni-td>
				</uni-tr>
			</uni-table>

		</view>
	</view>
</template>

<!-- 
uniCloud资源请求大小限制等（#资源限制差异）：https://doc.dcloud.net.cn/uniCloud/price.html
 -->


<!-- 
https://www.wulihub.com.cn/gc/WjKvoM/


🎉 *《熊多多》独家邀请* 🎉

🎬 圈内的男孩子们，一起看帅哥，这里有超多帅熊和萌猪，等你来探索！

🔗 *立即加入：*
只需一步，用浏览器打开链接：https://photo.baidu.com/photo/wap/albumShare/invite/IzaawNfSb

🌈 *额外好礼：*
1️⃣ 复制我的邀请码：`$你的邀请码$`
2️⃣ 打开【熊多多】App
3️⃣ 点击右上角头像 -> 选择“邀请朋友送VIP” -> 输入邀请码

🎁 我们两个都能获得 *7天VIP* 奖励。让我们一起享受《熊多多》带来的无限欢乐吧！

🏆 *成为VIP的好处：*
- 作为VIP，尽享不限次数的观影体验。
- 不是VIP？没关系！即使没有VIP，你每天依然有3次免费观影的机会。

赶快加入，和我一起畅享精彩内容！🐻 🐷 🐘 🐳 🐒 

-->

<script>
	import {
		calculateTodayUsers,
		formatDeviceOaid
	} from './common/fun.js'

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
				userTableData: [], // 用户数据
				total_users: 0, // 用户总数
				today_new_user_count: 0, // 今日新增用户数
				today_active_user_count: 0, // 今日活跃(登录)用户数
				today_active_vip_user_count: 0, // 今日活跃的VIP用户数
				today_active_regular_user_count: 0,// 今日活跃的普通用户数
				last_hour_online_user_count: 0, // 近1小时内在线的总用户数
				last_hour_online_vip_user_count: 0, // 近1小时内在线的VIP用户数
				last_hour_online_regular_user_count: 0, // 近1小时内在线的普通用户数
				// #
				filter_users_by_invite_count: [],// 按邀请计数筛选用户 后的 用户数据
				// #
				loading: false,
				minInviteCount: 10,
				// #
				payOrdersTableData: [], // 订单数据
				total_pay_orders: 0, // 订单总数
				total_order_amount: 0, // 订单总额
				total_refund_amount: 0, // 订单退款总金额
				today_total_pay_orders: 0, // 今日订单总数
				today_total_order_amount: 0, // 今日订单总额
				todayOrdersUserInfo: [], // 今日订单用户信息列表
				// #
				today_registered_and_paid_orders_amount: 0, // 累加今日注册用户的订单总额
				today_registered_user_order_count: 0, // 增加今日注册用户的订单数
				// #
				first_transaction_date: "", // 第一笔成交日
				average_daily_revenue: 0, // 平均每天收益
				daysSinceFirstTransaction: 0, // 自营业以来过了多少天
				calculateSalesData: [], // 统计销量
				calculatePurchasesData: [], // 统计用户购买次数
				days_since_first_transaction: 0,// 从营收以来过了多少天
			}
		},
		computed: {

		},
		onReady() {
			this.loadData();
		},
		methods: {
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
			navTo(url, id) {
				if (url.indexOf('http') > -1) {
					// 如果url中包含'http'，则在新窗口中打开该链接
					window.open(url);
				} else {
					if (id) {
						// 如果有提供id参数，则将其添加到url中作为查询参数
						url = `${url}?appid=${id}`;
					}
					// 使用uni.navigateTo方法进行页面跳转
					uni.navigateTo({
						url
					});
				}
			},

			toUrl(url) {
				// #ifdef H5
				// 在新窗口中打开url链接（仅适用于H5平台）
				window.open(url, "_blank");
				// #endif
			},
			async loadData() {
				uni.showLoading()
				await this.queryUserCounts()
				await this.fetchUserData()
				await this.updateVipStatuses()
				await this.querPayOrderCounts()
				await this.fetchPayOrderData()
				uni.hideLoading()
			},
			async queryUserCounts() {
				const {
					result
				} = await userCollection.count()
				this.total_users = result.total
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
				this.updateUsersWithInviteCounts(allUsers);
				// 更新用户数据，附上未登录天数
				//this.updateUsersWithDaysSinceLastLogin(this.userTableData)
				// 过滤掉邀请人数低于 minInviteCount 的用户
				this.filterUsersByInviteCount()
			},

			// 更新表格字段以包含统计信息
			updateTableFieldsWithStats() {
				// 这里假设calculateTodayUsers是您计算今日新增和活跃用户的方法
				const {
					todayNewUsers,// 今日新增用户数
					todayActiveUsers,// 今日活跃用户数
					todayActiveVipUsers,// 今日活跃的VIP用户
					todayActiveRegularUsers,// 今日活跃的普通用户
					lastHourOnlineUsers, // 近1小时内在线的总用户数
					lastHourOnlineVipUsers, // 近1小时内在线的VIP用户数
					lastHourOnlineRegularUsers // 近1小时内在线的普通用户数
				} = calculateTodayUsers(this.userTableData);

				// 创建今日新增用户和今日活跃用户的字段信息
				const todayStats = [{
						title: '今日新增用户',
						value: todayNewUsers.toString()
					},
					{
						title: '今日活跃用户',
						value: todayActiveUsers.toString()
					},
					{
						title: '今日活跃的VIP用户',
						value: todayActiveVipUsers.toString()
					},
					{
						title: '今日活跃的普通用户',
						value: todayActiveRegularUsers.toString()
					},
					{
						title: '近1小时内在线的总用户数',
						value: lastHourOnlineUsers.toString()
					},
					{
						title: '近1小时内在线的VIP用户数',
						value: lastHourOnlineVipUsers.toString()
					},
					{
						title: '近1小时内在线的普通用户数',
						value: lastHourOnlineRegularUsers.toString()
					}
				];

				this.today_new_user_count = todayStats[0].value
				this.today_active_user_count = todayStats[1].value
				this.today_active_vip_user_count = todayStats[2].value
				this.today_active_regular_user_count = todayStats[3].value
				this.last_hour_online_user_count = todayStats[4].value // 近1小时内在线的总用户数
				this.last_hour_online_vip_user_count = todayStats[5].value // 近1小时内在线的VIP用户数
				this.last_hour_online_regular_user_count = todayStats[6].value // 近1小时内在线的普通用户数
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
			async querPayOrderCounts() {
				const {
					result
				} = await payOrdersCollection
					.where({
						status: 1, // 已支付
						system_recharge_issuccess: true, // 系统充值成功
						total_fee: {
							$gt: 1
						} // 大于1元
					}).count()
				this.total_pay_orders = result.total
			},
			// 获取订单数据
			async fetchPayOrderData() {
				const totalPayOrders = this.total_pay_orders
				const MAX_LIMIT = 1000; // uniapp的limit最大值
				let allPayOrders = []

				for (let i = 0; i < totalPayOrders; i += MAX_LIMIT) {
					// 当前第i页的数据
					console.log(`当前第${i / MAX_LIMIT + 1}页`);
					const {
						result
					} = await payOrdersCollection
						.where({
							status: 1, // 已支付
							system_recharge_issuccess: true, // 系统充值成功
							total_fee: {
								$gt: 5
							} // 大于1元
						}).skip(i).limit(MAX_LIMIT).get();
					allPayOrders = allPayOrders.concat(result.data);
				}
				await this.fetchRefundOrderData()
				
				console.log('所有订单:', allPayOrders);
				
				this.payOrdersTableData = allPayOrders;

				// 计算订单总额
				this.total_order_amount = allPayOrders.reduce((total, order) => total + order.total_fee, 0);
				
				// 在获取数据后立即计算并更新销量和用户购买次数统计
				this.calculateAndUpdateStatistics(allPayOrders)
				// 更新今日订单统计
				this.updateTodayOrdersStatistics(allPayOrders)
				// 计算平均每天收益
				this.calculateAverageDailyRevenue(allPayOrders)
			},
			// 获取退款订单数据
			async fetchRefundOrderData() {
				const {
					result
				} = await payOrdersCollection
					.where({
						status: 2, // 已支付
						system_recharge_issuccess: true, // 系统充值成功
						total_fee: {
							$gt: 5
						} // 大于1元
					}).get();
				// 订单退款总金额
				this.total_refund_amount = result.data.reduce((total, order) => total + order.total_fee, 0);
			},
			/**
			 * 计算并更新销量和用户购买次数统计
			 * 此方法会调用 calculateSales 和 calculatePurchases 方法来处理数据
			 * 并将结果分别存储在 calculateSalesData 和 calculatePurchasesData 中
			 */
			calculateAndUpdateStatistics(data) {
				// 计算销量统计数据
				this.calculateSalesData = this.calculateSales(data);
				// 计算用户购买次数统计数据
				this.calculatePurchasesData = this.calculatePurchases(data);
			},
			// 统计销量
			calculateSales(data) {
				return data.reduce((acc, item) => {
					acc[item.total_fee] = (acc[item.total_fee] || 0) + 1;
					return acc;
				}, {});
			},
			// 统计用户购买次数
			calculatePurchases(data) {
				const purchases = data.reduce((acc, item) => {
					acc[item.user_id] = (acc[item.user_id] || 0) + 1;
					return acc;
				}, {});

				// 过滤掉只购买了1次的用户
				return Object.keys(purchases).reduce((acc, key) => {
					if (purchases[key] > 1) {
						acc[key] = purchases[key];
					}
					return acc;
				}, {});
			},
			// 更新今日订单统计
			updateTodayOrdersStatistics(data) {
				// 获取今天的日期范围
				const todayStart = new Date();
				todayStart.setHours(0, 0, 0, 0); // 今天的0点
				const todayEnd = new Date();
				todayEnd.setHours(23, 59, 59, 999); // 今天的23:59:59

				// 格式化为与 pay_success_time 相同的格式
				const formatDateTime = date => date.toISOString().replace('T', ' ').substring(0, 19);

				// 筛选出今天的订单
				const todayOrders = data.filter(order => {
					const orderTime = new Date(order.pay_success_time);
					return orderTime >= todayStart && orderTime <= todayEnd;
				});
				
				console.log('筛选出今天的订单', todayOrders)

				// 计算今日订单总数
				this.today_total_pay_orders = todayOrders.length;

				// 计算今日订单总额
				this.today_total_order_amount = todayOrders.reduce((total, order) => total + order.total_fee, 0);
				
				
				// 计算今日注册且今日成交的用户数量及订单总额
				this.today_registered_and_paid_users = 0;// 今日注册的用户
				this.today_registered_and_paid_orders_amount = 0; // 今日注册用户的订单总额
				this.today_registered_user_order_count = 0; // 今日注册用户的订单数
				
				// 今日订单用户信息列表
				this.todayOrdersUserInfo = [];
				
				todayOrders.forEach(order => {
					// 查找对应用户的注册时间
					const user = this.userTableData.find(u => u._id === order.user_id);
					if (user) {
						// 检查用户是否今日注册
						const isRegisteredToday = user.register_date >= todayStart.getTime() && user.register_date <= todayEnd.getTime();
						if (isRegisteredToday) {
							this.today_registered_and_paid_users += 1;
							this.today_registered_and_paid_orders_amount += order.total_fee;
							this.today_registered_user_order_count += 1;
						}
						// 收集用户信息用于渲染
						this.todayOrdersUserInfo.push({
							user_id: user._id, // 用户id
							//register_date: new Date(user.register_date).toISOString(), // 格式化注册日期
							register_date: new Date(user.register_date).toISOString().split('T')[0], // 保留日期部分
							order_amount: order.total_fee // 订单总额
						});
					}
					
				});
				
			},
			// 查找第一笔成交日
			findFirstTransactionDate(data) {
				if (data.length === 0) {
					return null;
				}

				// 假设第一笔订单是列表中的第一个订单
				let firstTransaction = data[0];

				// 遍历所有订单，找到日期最早的订单
				data.forEach(order => {
					if (new Date(order.pay_success_time) < new Date(firstTransaction.pay_success_time)) {
						firstTransaction = order;
					}
				});

				// 设置第一笔成交日
				this.first_transaction_date = firstTransaction.pay_success_time.substring(0, 10); // 截取日期部分
			},
			// 计算平均每天收益
			calculateAverageDailyRevenue(data) {
			    // 如果没有订单数据，则返回
			    if (data.length === 0) {
			        return;
			    }
			
			    // 使用findFirstTransactionDate方法找到第一笔成交日
			    this.findFirstTransactionDate(data);
			
			    // 总收益
			    const totalRevenue = data.reduce((acc, order) => acc + order.total_fee, 0);
			
			    // 当前日期和第一笔成交日之间的天数
			    // 去除时间部分，只保留日期
			    const firstTransactionDate = new Date(this.first_transaction_date + 'T00:00:00Z');
			    const currentDate = new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z'); // 只保留日期部分
			    const millisecondsPerDay = 24 * 60 * 60 * 1000;
			    // 由于我们需要包括起始和结束日期，所以计算天数后需要加1
			    const daysSinceFirstTransaction = Math.ceil((currentDate - firstTransactionDate) / millisecondsPerDay) + 1; // 从第一笔成交日到今天，共过了多少天
				this.days_since_first_transaction = daysSinceFirstTransaction
				
			    console.log('当前日期和第一笔成交日之间的天数 == ', daysSinceFirstTransaction);
			
			    // 计算平均每天收益，并保留一位小数但不四舍五入
			    const rawAverageDailyRevenue = totalRevenue / daysSinceFirstTransaction;
			    this.average_daily_revenue = Math.floor(rawAverageDailyRevenue * 10) / 10;
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

	.uni-table-scroll {
		min-height: auto;
	}

	.link-btn-color {
		color: #007AFF;
		cursor: pointer;
	}

	.uni-stat-text {
		color: #606266;
	}

	.mt10 {
		margin-top: 10px;
	}

	.uni-radio-cell {
		margin: 0 10px;
	}

	.uni-stat-tooltip-s {
		width: 400px;
		white-space: normal;
	}

	.uni-a {
		cursor: pointer;
		text-decoration: underline;
		color: #555;
		font-size: 14px;
	}


	.container {
		display: flex;
		justify-content: flex-start;
		/* padding: 1rem; */
		margin-bottom: 1rem;
		gap: 1rem;
		
		width: 100%;
		flex-direction: row;
		flex-wrap: wrap;
	}

	.card {
		background-color: #fff;
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
		padding: 1rem;
		/* width: 25%; */
		/* 根据您的布局需要调整 */
	}

	.text-small {
		color: #4B5563;
		/* zinc-800 */
		font-size: 0.875rem;
		/* text-sm */
		margin-bottom: 5px;
	}

	.text-large {
		font-size: 1.55rem;
		/* text-xl */
		font-weight: 600;
		/* font-semibold */
	}
	
	.xiaoliang-count {
		font-size: 1.35rem!important;
	}

	.text-red {
		color: #EF4444;
		/* red-500 */
		display: flex;
		align-items: center;
		margin-top: 0.5rem;
	}

	.icon {
		width: 1rem;
		/* w-4 */
		height: 1rem;
		/* h-4 */
		margin-left: 0.25rem;
		/* ml-1 */
		fill: currentColor;
	}
</style>
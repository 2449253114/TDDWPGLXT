<template>
	<view>
		<button class="uni-button" type="primary" size="mini" @click="loadData">开始发放补贴</button>
	</view>
</template>

<script>
	const db = uniCloud.database();
	const dbCmd = db.command;

	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)

	// 用户VIP会员更变数据库表
	const userVipCollectionName = 'user-vip-changes'
	const userVipCollection = db.collection(userVipCollectionName)

	// 支付订单数据库表
	const payOrdersCollectionName = 'user-payment-orders'
	const payOrdersCollection = db.collection(payOrdersCollectionName)

	// APP系统通知数据库表
	const appSystemNoticeCollectionName = 'system-app-notice'
	const appSystemNoticeCollection = db.collection(appSystemNoticeCollectionName)

	export default {
		data() {
			return {
				vipUserList: [],
				userOrderList: []
			}
		},
		onReady() {

		},
		methods: {
			async loadData() {
				uni.showLoading({
					title: '加载中',
					mask: true
				})
				await this.getActiveVips()
				await this.getNewVipRecharges()
				await this.filterMatchingIds()
				uni.hideLoading()
			},
			// 步骤一
			// 获取截止到2024年7月21日0点且未过期的VIP会员用户。（vip_expire_date(毫秒时间戳) > 1721491200000）
			// 函数名，你帮我写
			async getActiveVips() {
				// 截止日期
				const cutoffDate = 1721491200000; // 2024年7月21日0点的时间戳

				// 初始化查询参数
				let page = 0;
				const limit = 1000;
				let activeVips = [];
				let hasMore = true;

				// 循环查询直到没有更多数据
				while (hasMore) {
					// 使用嵌套解构赋值获取data属性
					const {
						result: {
							data
						}
					} = await userCollection.where({
							//vip: true, // 这个不需要，因为人家可能在7月21日前后邀请了人，但人家可能23日过期，但vip标记已经是false了，所以这停机期间，人家VIP也没用上。
							vip_expire_date: dbCmd.gte(cutoffDate)
						})
						.limit(limit)
						.skip(page * limit)
						.field({
							_id: true,
							vip_expire_date: true
						})
						.get();

					// 将查询结果添加到activeVips数组
					activeVips = activeVips.concat(data);

					// 检查是否还有更多数据
					if (data.length < limit) {
						hasMore = false;
						break;
					}

					// 准备下一次查询
					page++;
				}

				console.log('activeVips', activeVips)

				// 返回所有查询到的活跃VIP用户
				this.vipUserList = activeVips;
			},

			// 步骤二
			// 获取从2024年7月21日0点起充值VIP会员的用户。（order_type=1, status=1, system_recharge_issuccess=true, pay_success_time > 1721491200000）
			// 函数名，你帮我写
			async getNewVipRecharges() {
				// 使用嵌套解构赋值获取data属性
				const {
					result: {
						data: orders
					}
				} = await payOrdersCollection.where({
					order_type: 1,
					status: 1,
					system_recharge_issuccess: true,
					pay_success_time: dbCmd.gte("2024-07-21 00:00:00") // 使用日期字符串，因为是字符串日期时间格式，非时间戳格式
				}).limit(1000).field({
					user_id: true
				}).get()

				console.log('orders', orders)

				// 返回所有查询到的充值VIP会员订单
				this.userOrderList = orders
			},



			// 步骤三
			// 从步骤一中的数据找出步骤二中相同的(item._id = item.user_id)，放到新的数组中
			// 函数名，你帮我写
			async filterMatchingIds() {
				const activeVips = this.vipUserList
				const vipOrders = this.userOrderList

				const matchingIds = []; // 维护期间充值VIP的用户
				const nonMatchingIds = []; // 维护期间未充值VIP的用户，但VIP在指定时间内未过期

				activeVips.forEach(vipUser => {
					const recharge = vipOrders.find(order => order.user_id === vipUser._id);
					if (recharge) {
						matchingIds.push(vipUser);
					} else {
						nonMatchingIds.push(vipUser);
					}
				});

				console.log('matchingIds', matchingIds)
				console.log('nonMatchingIds', nonMatchingIds)

				// return {
				// 	matchingIds,
				// 	nonMatchingIds
				// };
				
				
				// 发放补偿已完成，明天开始写 自动请求视频m3u8写入文件，每4、5分钟一次，具体看WPS表格计算的结果。
				
				// const testMatchingIds = [{
				// 	_id: "65be37419755e3283004978c",
				// 	vip_expire_date: 13865482394351
				// }]
				// const testNonMatchingIds = [{
				// 	_id: "65be37419755e3283004978c",
				// 	vip_expire_date: 13865482394351
				// }]
				
				await this.compensateVipUsers(matchingIds, nonMatchingIds)
				
			},


			// 测试期间，只能用 _id = "65be37419755e3283004978c" 来测试（即内部账号）
			// 为所有查询到的VIP用户发放补偿 > 1.增加35天VIP时长、2.发送系统通知、3.添加VIP变更记录（维护期间的系统补偿和维护期间的充值补偿）
			// 函数名，你帮我写
			async compensateVipUsers(matchingIds, nonMatchingIds) {
				// 1. 处理维护期间充值VIP的用户 (matchingIds)
				await this.processCompensationForMatchingIds(matchingIds);

				// 2. 处理维护期间未充值VIP的用户 (nonMatchingIds)
				await this.processCompensationForNonMatchingIds(nonMatchingIds);
			},

			async processCompensationForMatchingIds(users) {
				for (let user of users) {
					// 增加VIP时长
					const newExpireDate = user.vip_expire_date + 35 * 24 * 60 * 60 * 1000; // 35天的毫秒数
					await this.updateUserVipExpireDate(user._id, newExpireDate);

					// 发送系统通知
					await this.sendSystemNotification(user._id, '尊敬的用户，作为对您在7月21日至8月3日维护期间充值的支持，我们为您的VIP会员额外增加了35天时长，作为充值福利。');

					// 添加VIP变更记录
					await this.addVipChangeRecord(user._id, '维护期充值赠送VIP（35天）');
				}
			},

			async processCompensationForNonMatchingIds(users) {
				for (let user of users) {
					// 增加VIP时长
					const newExpireDate = user.vip_expire_date + 35 * 24 * 60 * 60 * 1000; // 35天的毫秒数
					await this.updateUserVipExpireDate(user._id, newExpireDate);

					// 发送系统通知
					await this.sendSystemNotification(user._id, '尊敬的用户，感谢您对我们的支持，我们为您的VIP会员额外增加了35天时长，作为系统补偿福利。');

					// 添加VIP变更记录
					await this.addVipChangeRecord(user._id, '系统补偿赠送VIP（35天）');
				}
			},



			// 更新用户VIP过期日期的逻辑
			async updateUserVipExpireDate(userId, newExpireDate) {
				const { 
					result: { updated }
				} = await userCollection
				.doc(userId)
				.update({
					vip: true, // 是否会员
					vip_expire_date: newExpireDate
				})
				
				// updated	Number	更新成功条数，数据更新前后没变化时会返回0
				console.log(userId, updated)
				
			},

			// 发送系统通知给用户的逻辑
			async sendSystemNotification(userId, message) {
				await appSystemNoticeCollection.add({
				    user_id: userId,
				    title: "会员充值通知",
				    content: message,
					is_read: false, // 通知未读
				    create_date: Date.now() // 添加创建时间
				});
				
			},
			
			// 添加VIP订单记录的逻辑
			async addVipChangeRecord(userId, title) {
				// 当前时间的时间戳：如果你需要一个10位的时间戳（代表以秒为单位的时间戳，而不是以毫秒为单位），你可以将Date.now()的结果除以1000，然后使用Math.floor来舍去小数点后的部分。
				const timestamp = Math.floor(Date.now() / 1000);

				// 默认数据
				const otherParams = {
				    order_type: 1,
				    day_count: 35,
				    out_trade_no: "VIPZS0000011111",
				    total_fee: 0,
				    status: 1,
				    create_time: timestamp
				}

				await payOrdersCollection.add({
					user_id: userId,
					body: title,
					...otherParams
				})
			},


		},

	}
</script>

<style>

</style>
<template>
	<view class="container">
		<uni-card class="card" :is-shadow="false" :is-full="false" :border="true" margin="0 0 10px 0">
			<text class="uni-card-txt">人工充值（客服帮激活VIP）</text>
		</uni-card>

		<uni-forms-item label="账号邀请码" :label-width="85">
			<div class="custom-forms-item">
				<uni-easyinput v-model="myInviteCode" :maxlength="6" placeholder="请输入用户自身账号邀请码" @clear="clearData" />
				<div class="space-10" />
				<button type="primary" size="mini" @click="queryUser">查询用户</button>
			</div>
		</uni-forms-item>
		
		<div v-if="userId != ''">
			<uni-forms-item label="下单用户ID" :label-width="85">
				<div class="custom-forms-item">
					<uni-easyinput disabled placeholder="下单用户ID" v-model="userId"></uni-easyinput>
					<div class="space-10" />
					<button class="button" size="mini" type="primary" @click="editUser(userId)">查看详情</button>
				</div>
			</uni-forms-item>
		</div>

		<div v-if="userExists">
			<!-- 选择开通会员的时长 -->
			<uni-forms-item>
				<div class="vip-buttons">
					<div v-for="(option, index) in goods" :key="index"
						:class="['vip-button', { selected: selectedOption === index }]" @click="selectOption(index)">
						<p><span class="price">{{ option.price }}</span>元</p>
						<p style="color: #757575">{{ option.name }}</p>
					</div>
				</div>
			</uni-forms-item>
			<uni-forms-item label="订单号" :label-width="85">
				<uni-easyinput v-model="payNo" placeholder="请输入订单号" />
			</uni-forms-item>
			<uni-forms-item label="支付渠道" :label-width="85">
				<uni-data-checkbox v-model="payType" :localdata="payTypeData"></uni-data-checkbox>
			</uni-forms-item>
			<button type="primary" @click="submit()">提交</button>
		</div>
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

	// 商品列表
	const shopGoodsCollectionName = 'shop-goods'
	const shopGoodsCollection = db.collection(shopGoodsCollectionName)

	// APP系统通知数据库表
	const appSystemNoticeCollectionName = 'system-app-notice'
	const appSystemNoticeCollection = db.collection(appSystemNoticeCollectionName)

	export default {
		data() {
			return {
				myInviteCode: '', // 用户的账号自身邀请码
				userExists: false, // 用户是否存在
				userId: '', // 用户ID
				userInfo: {}, // 用户信息
				goods: [{ // 开通会员的套餐
					price: '135',
					name: '1个月',
					type: 1, // 商品类型：0 金币充值 、1 会员开通
					day_count: 0, // 开通天数
					giveaway_coin: 0, // 赠送金币
				}],
				selectedOption: null, // 选择开通会员的时长
				payNo: '', // 订单号
				payType: 'alipay', // 支付渠道，默认支付宝-转账码
				payTypeData: [{
					text: '支付宝',
					value: 'alipay'
				}, {
					text: '微信',
					value: 'wxpay'
				}]
			};
		},
		onShow() {
			const timestampInSeconds = Math.floor(Date.now() / 1000);
			const timestampInMilliseconds = Date.now();
			
			const paySuccessTimeFromSeconds = this.formatTimestampToDateTime(timestampInSeconds);
			const paySuccessTimeFromMilliseconds = this.formatTimestampToDateTime(timestampInMilliseconds);
			
			console.log(paySuccessTimeFromSeconds); // 输出格式为 "2024-05-19 00:16:05"
			console.log(paySuccessTimeFromMilliseconds); // 输出格式为 "2024-05-19 00:16:05"
		},
		methods: {
			selectOption(index) {
				this.selectedOption = index;
			},
			clearData() {
				this.userExists = false
				this.myInviteCode = ''
				//this.userId = '' // 这个先不清空，用于在充值成功后，保留显示用户ID和查看用户信息详情页
				this.userInfo = {}
				this.selectedOption = null
				this.payNo = ''
				this.payType = 'alipay'
			},
			/**
			 * 编辑用户数据
			 * @param { String } id
			 */
			editUser(userId) {
				uni.navigateTo({
					url: `/pages/member/users/edit?id=${userId}`
				})
			},
			async queryUser() {
				// 查询用户
				if (this.myInviteCode == '' || this.myInviteCode.length != 6) {
					uni.showToast({
						title: '无效邀请码',
						icon: 'none'
					})
					return
				}

				uni.showLoading({
					mask: true
				})
				// 使用嵌套解构赋值获取data属性
				const {
					result: {
						data
					}
				} = await userCollection.where({
						my_invite_code: this.myInviteCode
					})
					.get();

				if (data.length == 0) {
					uni.showToast({
						title: '用户不存在',
						icon: 'none'
					})
					return
				}

				//console.log('data[0]', data[0])
				await this.queryGoods()

				this.userInfo = data[0]
				this.userId = data[0]._id
				this.userExists = true

				uni.hideLoading()
			},
			async queryGoods() {
				const {
					result: {
						data
					}
				} = await shopGoodsCollection.where({
					type: 1
				}).get() // 会员开通商品
				this.goods = data
			},
			// 提交并开通会员
			async submit() {
				if (this.userExists == false) return
				if (this.selectedOption == null || this.payNo === '' || this.payNo.length < 10) {
					console.log('请确保已选择一个选项，并且订单号不少于10个字符。');
					// alert('请确保已选择一个选项，并且订单号不少于10个字符。');
					uni.showToast({
						title: '参数效验失败',
						icon: 'none'
					})
					return;
				}

				uni.showLoading({
					mask: true
				})

				// 更新用户VIP时长
				await this.updateUserVipExpireDate(this.userId)
				
				// 发送系统通知
				await this.sendSystemNotification(this.userId);
				
				// 添加VIP变更记录
				await this.addVipChangeRecord(this.userId);
				
				// 清除必要数据
				this.clearData()
				
				uni.hideLoading()
				uni.showToast({
					title: '充值成功'
				})
			},

			// 更新用户VIP过期日期的逻辑
			async updateUserVipExpireDate(userId) {
				// 按天数计算时间戳
				const day_count = this.goods[this.selectedOption].day_count // 天数（要开通几天）
				const day_count_timestamp = day_count * 24 * 60 * 60 * 1000 // 天数时间戳（单位：毫秒）

				// 条件：(计算会员有效期至)
				// 1. 如果到期时间不为空且小于当前时间，则从当前时间开始加上续费周期时间。
				// 2. 如果到期时间不为空且大于当前时间，则从到期时间开始加上续费周期时间。

				// 新的过期时间
				let newExpireDate;
				// 获取当前时间的时间戳（毫秒）
				const now = Date.now();

				// 获取用户会员到期时间
				const userVipExpireDate = this.userInfo.vip_expire_date

				// 判断用户会员到期时间是否小于当前时间
				if (userVipExpireDate < now) {
					// 如果小于当前时间，则从当前时间开始加上续费周期时间
					newExpireDate = now + day_count_timestamp
				} else {
					// 如果大于当前时间，则从到期时间开始加上续费周期时间
					newExpireDate = userVipExpireDate + day_count_timestamp
				}

				//console.log('newExpireDate', newExpireDate)

				const {
					result: {
						updated
					}
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
			async sendSystemNotification(userId) {
				await appSystemNoticeCollection.add({
					user_id: userId,
					title: '会员充值通知',
					content: '亲爱的用户，您的会员充值已成功。现在您可以享受所有VIP特权。感谢您的支持，祝您使用愉快。',
					is_read: false, // 通知未读
					create_date: Date.now() // 添加创建时间
				});
			},
			// 添加VIP订单记录的逻辑
			async addVipChangeRecord(userId) {
				const goodName = `人工充值会员（${this.goods[this.selectedOption].name}）`
				const goodPrice = this.goods[this.selectedOption].price
				const dayCount = this.goods[this.selectedOption].price
				// 当前时间的时间戳：如果你需要一个10位的时间戳（代表以秒为单位的时间戳，而不是以毫秒为单位），你可以将Date.now()的结果除以1000，然后使用Math.floor来舍去小数点后的部分。
				const timestamp = Math.floor(Date.now() / 1000);
				
				// 默认数据
				const otherParams = {
					body: goodName, // 商品名称
					pay_type: this.payType, // 支付渠道，wxpay | alipay
					out_trade_no: `GOOD${this.payNo}`,// 自己系统订单号，也叫商户自己生成的订单号
					total_fee: goodPrice,// 订单总金额
					timestamp, // 发起订单时间（秒）
					order_type: 1, // 订单类型 0：金币充值 1：会员开通
					status: 1, // 订单状态 0：未支付 1：已支付 2：已退款
					day_count: dayCount, // 开通会员天数（仅用于充值会员时的会员天数）
					system_recharge_issuccess: true, // 系统充值是否成功（用来记录当给用户充值金币/会员完成时记录true，防止同订单重复充值，带来的bug）
					is_payment_status_checked: true, // 支付状态检查标记（此字段用于标识订单的支付状态是否已经在第三方支付平台进行了查询。当用户完成支付操作后，如果由于应用被重启或其他原因导致本地支付状态未及时更新，这个字段会在重启后用来检查并同步第三方支付平台的支付状态。true 表示已检查并确认了第三方支付平台的支付状态，无论是支付完成还是未完成；false 表示本地数据库状态尚未与第三方支付平台同步。这确保了即使在应用重启后，用户的支付状态也能被准确追踪和处理，以便及时更新数据库并发放相应的奖励。）
					pay_success_time: this.formatTimestampToDateTime(timestamp),
					pay_add_time: this.formatTimestampToDateTime(timestamp),
					pay_no: this.payNo, // 支付渠道的订单号
					create_time: timestamp
				}

				await payOrdersCollection.add({
					user_id: userId,
					...otherParams
				})
			},
			// 将时间戳转换为指定格式的日期时间字符串
			formatTimestampToDateTime(timestamp) {
				// 判断时间戳是秒还是毫秒
				const isMilliseconds = timestamp.toString().length > 10;
				const date = new Date(isMilliseconds ? timestamp : timestamp * 1000);
		
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
				const day = String(date.getDate()).padStart(2, '0');
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				const seconds = String(date.getSeconds()).padStart(2, '0');
		
				return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
				
				// 输出格式为 "2024-05-19 00:16:05"
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

	.vip-buttons {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin-top: 10px;
	}

	.vip-button {
		border: 3px solid #e5e5e5;
		border-radius: 0;
		background-color: white;
		text-align: center;
		padding: 10px;
		cursor: pointer;
	}

	.vip-button.selected {
		border-color: black;
	}

	.price {
		font-size: 18px;
		font-weight: 700;
		color: black;
	}

	@media (min-width: 768px) {
		.vip-buttons {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			/* 自动填充，最小宽度150px */
			gap: 20px;
			/* 固定间距 */
		}

		// .vip-button {
		// 	max-width: 150px; /* 设置最大宽度 */
		// }
	}
</style>
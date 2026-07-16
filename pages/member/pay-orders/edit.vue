<template>
	<view class="uni-container">
		<uni-forms ref="form" :model="formData" validateTrigger="bind">
			<uni-forms-item name="body" label="商品描述">
				<uni-easyinput disabled placeholder="商品描述" v-model="formData.body"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="pay_type" label="支付渠道">
				<uni-easyinput disabled placeholder="支付渠道，wxpay | alipay" v-model="formData.pay_type"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="out_trade_no" label="支付订单号">
				<uni-easyinput disabled placeholder="支付订单号（需控制唯一，不传则由插件自动生成）" v-model="formData.out_trade_no"
					trim="both"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="total_fee" label="订单总金额">
				<uni-easyinput disabled placeholder="订单总金额，单位：元。（只支持int整数型，不支持小数，0.9这样不行）" type="number"
					v-model="formData.total_fee"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="timestamp" label="发起订单时间">
				<uni-datetime-picker disabled return-type="timestamp" v-model="formData.timestamp * 1000"></uni-datetime-picker>
			</uni-forms-item>
			<uni-forms-item name="sign" label="数据签名">
				<uni-easyinput disabled placeholder="签名，数据签名的算法请参考《签名算法》。示例值：4440B462E792B604BD56A37EA41E5B8F"
					v-model="formData.sign"></uni-easyinput>
			</uni-forms-item>
			<!-- 点击跳转到此用户信息编辑页 -->
			<uni-forms-item name="user_id" label="下单用户ID">
				<uni-easyinput disabled placeholder="下单用户ID，uni-id-users表" v-model="formData.user_id"></uni-easyinput>
				<button class="button" size="mini" type="primary" @click="editUser(formData.user_id)">修改用户数据</button>
			</uni-forms-item>
			<uni-forms-item name="client_ip" label="客户端IP">
				<uni-easyinput disabled placeholder="创建支付的客户端ip" v-model="formData.client_ip" trim="both"></uni-easyinput>
			</uni-forms-item>
			<!-- <uni-forms-item name="platform" label="下单平台">
				<undefined disabled v-model="formData.platform"></undefined>
			</uni-forms-item> -->
			<uni-forms-item name="order_type" label="订单类型">
				<uni-data-checkbox disabled v-model="formData.order_type"
					:localdata="formOptions.order_type_localdata"></uni-data-checkbox>
			</uni-forms-item>
			<uni-forms-item name="status" label="订单状态">
				<uni-data-checkbox v-model="formData.status" :localdata="formOptions.status_localdata"></uni-data-checkbox>
			</uni-forms-item>
			<uni-forms-item name="day_count" label="开通会员天数">
				<uni-easyinput disabled placeholder="开通会员天数（仅用于充值会员时的会员天数）" type="number" v-model="formData.day_count"></uni-easyinput>
			</uni-forms-item>
			<!-- <uni-forms-item name="giveaway_coin" label="赠送金币">
				<uni-easyinput placeholder="额外赠送的金币（仅用于充值金币或会员时的赠送金币数）" type="number"
					v-model="formData.giveaway_score"></uni-easyinput>
			</uni-forms-item> -->
			<uni-forms-item name="system_recharge_issuccess" label="系统充值是否成功">
				<switch @change="binddata('system_recharge_issuccess', $event.detail.value)"
					:checked="formData.system_recharge_issuccess"></switch>
			</uni-forms-item>
			<uni-forms-item name="create_time" label="订单创建时间">
				<uni-datetime-picker disabled return-type="timestamp"
					v-model="formData.create_time * 1000"></uni-datetime-picker>
			</uni-forms-item>
			<uni-forms-item name="pay_success_time" label="支付完成时间">
				<uni-easyinput disabled placeholder="订单付款时间（支付完成时间，订单查询API返回参数）"
					v-model="formData.pay_success_time"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="pay_add_time" label="下单时间">
				<uni-easyinput disabled placeholder="下单时间（订单查询API返回参数）" v-model="formData.pay_add_time"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="pay_no" label="微信支付订单号">
				<uni-easyinput disabled placeholder="微信支付订单号，当支付状态为已支付时返回此参数。（订单查询API返回参数）"
					v-model="formData.pay_no"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="cancel_date" label="取消时间">
				<uni-datetime-picker disabled return-type="timestamp" v-model="formData.cancel_date * 1000"></uni-datetime-picker>
			</uni-forms-item>
			<uni-forms-item name="user_order_success" label="回调状态">
				<switch @change="binddata('user_order_success', $event.detail.value)" :checked="formData.user_order_success">
				</switch>
			</uni-forms-item>
			<uni-forms-item name="notify_date" label="异步通知时间">
				<uni-datetime-picker disabled return-type="timestamp" v-model="formData.notify_date * 1000"></uni-datetime-picker>
			</uni-forms-item>
			<!-- <uni-forms-item name="original_data" label="异步通知原始数据">
				<undefined v-model="formData.original_data"></undefined>
			</uni-forms-item> -->
			<view class="uni-button-group">
				<button type="primary" class="uni-button" style="width: 100px;" @click="submit">提交</button>
				<navigator open-type="navigateBack" style="margin-left: 15px;">
					<button class="uni-button" style="width: 100px;">返回</button>
				</navigator>
			</view>
		</uni-forms>
	</view>
</template>

<script>
	import {
		validator
	} from '@/js_sdk/validator/user-payment-orders.js';

	const db = uniCloud.database();
	const dbCmd = db.command;
	const dbCollectionName = 'user-payment-orders';

	function getValidator(fields) {
		let result = {}
		for (let key in validator) {
			if (fields.includes(key)) {
				result[key] = validator[key]
			}
		}
		return result
	}



	export default {
		data() {
			let formData = {
				"body": "",
				"pay_type": "",
				"out_trade_no": "",
				"total_fee": null,
				"timestamp": null,
				"sign": "",
				"user_id": "",
				"client_ip": "",
				"platform": "与他APP",
				"order_type": 0,
				"status": 0,
				"day_count": 0,
				"giveaway_coin": 0,
				"system_recharge_issuccess": false,
				"create_time": null,
				"pay_success_time": "",
				"pay_add_time": "",
				"pay_no": "",
				"cancel_date": null,
				"user_order_success": null,
				"notify_date": null,
				"original_data": null
			}
			return {
				formData,
				formOptions: {
					"order_type_localdata": [{
							"text": "金币充值",
							"value": 0
						},
						{
							"text": "会员开通",
							"value": 1
						}
					],
					"status_localdata": [{
							"text": "未支付",
							"value": 0
						},
						{
							"text": "已支付",
							"value": 1
						},
						{
							"text": "已退款",
							"value": 2
						}
					]
				},
				rules: {
					...getValidator(Object.keys(formData))
				}
			}
		},
		onLoad(e) {
			if (e.id) {
				const id = e.id
				this.formDataId = id
				this.getDetail(id)
			}
		},
		onReady() {
			this.$refs.form.setRules(this.rules)
		},
		methods: {

			/**
			 * 验证表单并提交
			 */
			submit() {
				uni.showLoading({
					mask: true
				})
				this.$refs.form.validate().then((res) => {
					return this.submitForm(res)
				}).catch(() => {}).finally(() => {
					uni.hideLoading()
				})
			},

			/**
			 * 提交表单
			 */
			submitForm(value) {
				// 使用 clientDB 提交数据
				return db.collection(dbCollectionName).doc(this.formDataId).update(value).then((res) => {
					uni.showToast({
						title: '修改成功'
					})
					this.getOpenerEventChannel().emit('refreshData')
					setTimeout(() => uni.navigateBack(), 500)
				}).catch((err) => {
					uni.showModal({
						content: err.message || '请求服务失败',
						showCancel: false
					})
				})
			},

			/**
			 * 获取表单数据
			 * @param {Object} id
			 */
			getDetail(id) {
				uni.showLoading({
					mask: true
				})
				db.collection(dbCollectionName).doc(id).field(
					"body,pay_type,out_trade_no,total_fee,timestamp,sign,user_id,client_ip,platform,order_type,status,day_count,giveaway_coin,system_recharge_issuccess,create_time,pay_success_time,pay_add_time,pay_no,cancel_date,user_order_success,notify_date,original_data"
					).get().then((res) => {
					const data = res.result.data[0]
					if (data) {
						this.formData = data

					}
				}).catch((err) => {
					uni.showModal({
						content: err.message || '请求服务失败',
						showCancel: false
					})
				}).finally(() => {
					uni.hideLoading()
				})
			},

			/**
			 * 编辑用户数据
			 * @param { String } id
			 */
			editUser(userId) {
				uni.navigateTo({
					url: `/pages/member/users/edit?id=${userId}`
				})
			}
		}
	}
</script>
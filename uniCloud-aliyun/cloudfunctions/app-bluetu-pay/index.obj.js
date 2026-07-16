// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const {
	createCoinOrder,
	createVipOrder,
	createVipOrderV2,
	createVipOrderV3,
	notify_url,
	return_url,
	quit_url,
	getAllOrders,
	getPayOrder,
	asyncBlueTuOrderStatus
} = require('./module/pay-orders/index');

module.exports = {
	_before: function () { // 通用预处理器

	},

	/**
	 * H5支付[跳转模式]API
	 * 蓝兔支付后台系统返回支付链接，用户使用微信外部的浏览器或app访问该链接地址唤起微信并调起微信支付中间页。
	 * 接口说明:
	 * - 适用对象：个人、个体户、企业
	 * - 请求URL：https://api.ltzf.cn/api/wxpay/jump_h5
	 * - 请求方式：POST
	 * 
	 * @param {String} mch_id - 商户号
	 *     必填: 是
	 *     示例值: "1230000109"
	 * 
	 * @param {String} out_trade_no - 商户订单号，只能是数字、大小写字母_-且在同一个商户号下唯一
	 *     必填: 是
	 *     示例值: "LTZF2022113023096"
	 * 
	 * @param {String} total_fee - 支付金额
	 *     必填: 是
	 *     示例值: "0.01"
	 * 
	 * @param {String} body - 商品描述
	 *     必填: 是
	 *     示例值: "Image形象店-深圳腾大-QQ公仔"
	 * 
	 * @param {String} timestamp - 当前时间戳
	 *     必填: 是
	 *     示例值: "1669533132"
	 * 
	 * @param {String} notify_url - 支付通知地址，通知URL必须为直接可访问的URL，不允许携带查询串，需为http或https地址
	 *     必填: 是
	 *     示例值: "https://www.weixin.qq.com/wxpay/pay.php"
	 * 
	 * @param {String} [quit_url] - 取消支付自动跳转地址，跳转不会携带任何参数，如需携带参数请自行拼接
	 *     示例值: "https://www.weixin.qq.com/"
	 * 
	 * @param {String} [return_url] - 支付成功后自动跳转地址，跳转不会携带任何参数，如需携带参数请自行拼接
	 *     示例值: "https://www.weixin.qq.com/"
	 * 
	 * @param {String} [attach] - 附加数据，在支付通知中原样返回，可作为自定义参数使用
	 *     示例值: "自定义数据"
	 * 
	 * @param {String} [time_expire] - 订单失效时间，可选值：m (分钟), h (小时)；取值范围：1m～2h
	 *     示例值: "5m"
	 * 
	 * @param {String} sign - 签名，数据签名的算法参考《签名算法》
	 *     必填: 是
	 *     示例值: "B7337098E280841EB5F4D28261B60C07"
	 * 
	 * @returns {Object} 返回值
	 * @param {String} code - 状态码 0：成功 1：失败
	 * @param {String} msg - 信息 示例值：微信H5下单成功
	 * @param {String} data - 支付跳转链接，URL为拉起微信支付的中间页面，可通过访问该URL来拉起微信客户端，完成支付，URL的有效期为5分钟。示例值：https://api.ltzf.cn/template/html/jump_h5?order_no=WX202305091807051373879911
	 * @param {String} request_id - 唯一请求ID，每次请求都会返回，定位问题时需要提供该次请求的request_id。示例值：98758a7c-daea-bc63-b725-52c8998d808c
	 * 
	 * 
	 * 
	 * 
	 * 金币充值[H5支付]API
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/mp_h5_pay_rechargeGoldCoins
	 * 客户端请求Body参数
	 * 
	 * @param {String} user_id - 下单用户ID
	 *     必填: 是
	 *     示例值: "1230000109"
	 * 
	 * @param {String} total_fee - 支付金额（1元1金币）
	 *     必填: 是
	 *     示例值: "0.01"
	 * 
	 * @param {Number} giveaway_score - 赠送金币数（仅用于充值金币或会员时的赠送金币数）
	 *   必填: 否
	 *   示例值: 0
	 * 
	 * @param {String} body - 商品描述
	 *     必填: 是
	 *     示例值: "消费"、"充值"、"与他 VIP会员开通"、"与他 购物卡充值"
	 * 
	 * @param {String} attach - 附加数据，在支付通知中原样返回，可作为自定义参数使用。
	 *     必填: 否
	 *     示例值: "自定义数据"
	 * 
	 * @returns {Object} 返回值
	 * @param {String} code - 状态码 0：成功 1：失败
	 * @param {String} msg - 信息 示例值：微信H5下单成功
	 * @param {Object} data 
	 * @param {String} data.out_trade_no - 订单号
	 * @param {String} data.pay_url - 支付跳转链接，URL为拉起微信支付的中间页面，可通过访问该URL来拉起微信客户端，完成支付，URL的有效期为5分钟。示例值：https://api.ltzf.cn/template/html/jump_h5?order_no=WX202305091807051373879911
	 * @param {String} data.request_id - 唯一请求ID，每次请求都会返回，定位问题时需要提供该次请求的request_id。示例值：98758a7c-daea-bc63-b725-52c8998d808c
	 * 
	 */
	 'orders-coins': createCoinOrder,

	/**
	 * H5支付[跳转模式]API
	 * 蓝兔支付后台系统返回支付链接，用户使用微信外部的浏览器或app访问该链接地址唤起微信并调起微信支付中间页。
	 * 接口说明:
	 * - 适用对象：个人、个体户、企业
	 * - 请求URL：https://api.ltzf.cn/api/wxpay/jump_h5
	 * - 请求方式：POST
	 * 
	 * @param {String} mch_id - 商户号
	 *     必填: 是
	 *     示例值: "1230000109"
	 * 
	 * @param {String} out_trade_no - 商户订单号，只能是数字、大小写字母_-且在同一个商户号下唯一
	 *     必填: 是
	 *     示例值: "LTZF2022113023096"
	 * 
	 * @param {String} total_fee - 支付金额
	 *     必填: 是
	 *     示例值: "0.01"
	 * 
	 * @param {String} body - 商品描述
	 *     必填: 是
	 *     示例值: "Image形象店-深圳腾大-QQ公仔"
	 * 
	 * @param {String} timestamp - 当前时间戳
	 *     必填: 是
	 *     示例值: "1669533132"
	 * 
	 * @param {String} notify_url - 支付通知地址，通知URL必须为直接可访问的URL，不允许携带查询串，需为http或https地址
	 *     必填: 是
	 *     示例值: "https://www.weixin.qq.com/wxpay/pay.php"
	 * 
	 * @param {String} [quit_url] - 取消支付自动跳转地址，跳转不会携带任何参数，如需携带参数请自行拼接
	 *     示例值: "https://www.weixin.qq.com/"
	 * 
	 * @param {String} [return_url] - 支付成功后自动跳转地址，跳转不会携带任何参数，如需携带参数请自行拼接
	 *     示例值: "https://www.weixin.qq.com/"
	 * 
	 * @param {String} [attach] - 附加数据，在支付通知中原样返回，可作为自定义参数使用
	 *     示例值: "自定义数据"
	 * 
	 * @param {String} [time_expire] - 订单失效时间，可选值：m (分钟), h (小时)；取值范围：1m～2h
	 *     示例值: "5m"
	 * 
	 * @param {String} sign - 签名，数据签名的算法参考《签名算法》
	 *     必填: 是
	 *     示例值: "B7337098E280841EB5F4D28261B60C07"
	 * 
	 * @returns {Object} 返回值
	 * @param {String} code - 状态码 0：成功 1：失败
	 * @param {String} msg - 信息 示例值：微信H5下单成功
	 * @param {String} data - 支付跳转链接，URL为拉起微信支付的中间页面，可通过访问该URL来拉起微信客户端，完成支付，URL的有效期为5分钟。示例值：https://api.ltzf.cn/template/html/jump_h5?order_no=WX202305091807051373879911
	 * @param {String} request_id - 唯一请求ID，每次请求都会返回，定位问题时需要提供该次请求的request_id。示例值：98758a7c-daea-bc63-b725-52c8998d808c
	 * 
	 * 
	 * 
	 * 
	 * VIP会员开通[H5支付]API
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/mp_h5_pay_rechargeVIP
	 * 客户端请求Body参数
	 * 
	 * @param {String} user_id - 下单用户ID
	 *     必填: 是
	 *     示例值: "1230000109"
	 * 
	 * @param {String} total_fee - 支付金额
	 *     必填: 是
	 *     示例值: "0.01"
	 * 
	 * *!@param {Number} month* - 月（几个月）已弃用，改用day_count
	 *     必填: 是
	 *     示例值: 1
	 * 
	 * @param {Number} day_count - 天数（几天）
	 *     必填: 是
	 *     示例值: 1
	 * 
	 * @param {Number} giveaway_score - 赠送金币数（仅用于充值金币或会员时的赠送金币数）
	 *   必填: 否
	 *   示例值: 0
	 * 
	 * @param {String} body - 商品描述
	 *     必填: 是
	 *     示例值: "消费"、"充值"、"与他 VIP会员开通"、"与他 购物卡充值"
	 * 
	 * @param {String} attach - 附加数据，在支付通知中原样返回，可作为自定义参数使用。
	 *     必填: 否
	 *     示例值: "自定义数据"
	 * 
	 * @returns {Object} 返回值
	 * @param {String} code - 状态码 0：成功 1：失败
	 * @param {String} msg - 信息 示例值：微信H5下单成功
	 * @param {Object} data 
	 * @param {String} data.out_trade_no - 订单号
	 * @param {String} data.pay_url - 支付跳转链接，URL为拉起微信支付的中间页面，可通过访问该URL来拉起微信客户端，完成支付，URL的有效期为5分钟。示例值：https://api.ltzf.cn/template/html/jump_h5?order_no=WX202305091807051373879911
	 * @param {String} data.request_id - 唯一请求ID，每次请求都会返回，定位问题时需要提供该次请求的request_id。示例值：98758a7c-daea-bc63-b725-52c8998d808c
	 * 
	 */
	'orders-vip': createVipOrderV2,// createVipOrder（原版本）
	'orders-vip-v3': createVipOrderV3,// 2024-1104-2228 新增优化订单请求（3分30秒内只能请求一次订单下单地址）

	/**
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/notify_url
	 * 
	 * 蓝兔支付 - 支付结果回调接口（异步）
	 * 
	 * 适用对象：个人、个体户、企业
	 * 请求方式：POST
	 * 
	 * 回调URL：
	 * 该链接是通过支付接口中的请求参数“notify_url”来设置的，要求必须为http或https地址。
	 * 请确保回调URL是外部可正常访问的，且不能携带后缀参数，否则可能导致商户无法接收到蓝兔支付的回调通知信息。
	 * 示例：“https://pay.weixin.qq.com/wxpay/pay.action”
	 * 
	 * 通知规则：
	 * 用户支付完成后，蓝兔支付会把相关支付结果和用户信息发送给商户，商户需要接收处理该消息，并返回应答。
	 * 对后台通知交互时，如果蓝兔支付收到商户的应答不符合规范或超时，蓝兔支付认为通知失败。
	 * 通知频率为：15s/15s/30s/3m/10m/20m/30m/30m/30m/60m/3h/3h/3h/6h/6h - 总计 24h4m
	 * 
	 * @param {String} code           支付结果枚举值：0-成功, 1-失败
	 * @param {String} timestamp      时间戳
	 * @param {String} mch_id         商户号
	 * @param {String} order_no       系统订单号
	 * @param {String} out_trade_no   商户订单号
	 * @param {String} pay_no         支付宝或微信支付订单号
	 * @param {String} total_fee      支付金额
	 * @param {String} [sign]         签名，签名验证的算法请参考《签名算法》
	 * @param {String} [pay_channel]  支付渠道枚举值：alipay-支付宝, wxpay-微信支付
	 * @param {String} [trade_type]   支付类型枚举值：NATIVE-扫码支付, H5-H5支付, APP-APP支付, JSAPI-公众号支付, MINIPROGRAM-小程序支付
	 * @param {String} [success_time] 支付完成时间
	 * @param {String} [attach]       附加数据，在支付接口中填写的数据，可作为自定义参数使用
	 * @param {String} [openid]       支付者信息
	 * 
	 * 应答：
	 * 接收成功：HTTP应答状态码需返回200，同时应答报文需返回：SUCCESS，必须为大写。
	 * 接收失败：应答报文返回：FAIL。
	 */
	notify_url,

	/**
	 * 同步通知
	 * 接口说明：
	 * 适用对象：个人、个体户、企业
	 * 请求URL：https://api.ltzf.cn/api/wxpay/get_pay_order
	 * 请求方式：POST
	 *
	 * 请求参数：
	 * 
	 * @param {String} mch_id        商户号 (必填)
	 * 示例值：1230000109
	 * 
	 * @param {String} out_trade_no  商户订单号 (必填)
	 * 示例值：LTZF2022112264463
	 * 
	 * @param {String} timestamp     当前时间戳 (必填)
	 * 示例值：1669518774
	 * 
	 * @param {String} sign          签名，数据签名的算法请参考《签名算法》 (必填)
	 * 示例值：4440B462E792B604BD56A37EA41E5B8F
	 * 
	 * @returns {Object} 返回值
	 * @param {String} code - 状态码 0：成功 1：失败
	 * @param {String} msg - 信息 示例值：查询成功
	 * @param {string} request_id - 唯一请求ID，每次请求都会返回，定位问题时需要提供该次请求的request_id。示例值：98758a7c-daea-bc63-b725-52c8998d808c
	 * @param {object} data - 订单信息
	 * @param {string} data.add_time - 下单时间 示例值：2022-11-22 11:55:09
	 * @param {string} data.mch_id - 商户号 示例值：1230000109
	 * @param {string} data.order_no - 系统订单号 示例值：WX202211221155084844072633LTZF2022112264463
	 * @param {string} data.out_trade_no - 商户订单号
	 * @param {string} data.pay_no - 微信支付订单号，当支付状态为已支付时返回此参数。示例值：4200001635202211222291508463
	 * @param {string} data.body - 商品描述 示例值：这是一个测试
	 * @param {string} data.total_fee - 支付金额 示例值：0.01
	 * @param {string} data.trade_type - 支付类型，枚举值：NATIVE：扫码支付、H5：H5支付、APP：APP支付、JSAPI：公众号支付、MINIPROGRAM：小程序支付
	 * @param {string} data.success_time - 支付完成时间，当支付状态为已支付时返回此参数。
	 * @param {string} data.attach - 附加数据，在支付接口中填写的数据，可作为自定义参数使用。示例值：自定义数据
	 * @param {string} data.openid - 支付者信息，当支付状态为已支付时返回此参数。示例值：o5wq46GAKVxVKpsdcI4aU4cBpgT0
	 * @param {string} data.pay_status - 	支付状态，枚举值：0：未支付 1：已支付。示例值：1
	 * 
	 * 
	 * 
	 * 支付成功后自动跳转该地址 [HTTP_GET请求]
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/return_url
	 * 请求Query参数：
	 * @param {String} out_trade_no  商户订单号 (必填)
	 * 
	 * 
	 * 跳转地址
	 * @return {String} url https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/return_url?out_trade_no=JBCZ1697772862597098
	 */
	return_url,

	/**
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/quit_url
	 * 
	 * 取消支付后跳转地址
	 * 请求Query参数：
	 * @param {String} out_trade_no 商户订单号 (必填)
	 * 
	 * 跳转地址
	 * @return {String} url https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/quit_url?out_trade_no=JBCZ1697772862597098
	 */
	quit_url,

	/**
	 * 查询所有订单记录
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/getAllOrderRecords
	 * 客户端请求Body参数
	 * 
	 * @param {String} user_id - 用户ID
	 *     必填: 是
	 *     示例值: "1230000109"
	 * 
	 * @param {String} order_type - 订单类型
	 *     必填: 是
	 *     示例值: 1 // 订单类型 0：金币充值订单 1：会员开通订单
	 * 
	 */
	'orders': getAllOrders,
	
	/**
	 * 查询订单支付状态，用于APP端检查订单支付状态，支付成功则重新获取用户信息
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/getPayOrder
	 * @param {String} out_trade_no   商户订单号
	 */
	'pay-order': getPayOrder,
	
	
	
	/**
	 * 同步支付状态函数
	 * 用于在应用重启或首页或其他情况下，同步并确认第三方支付平台的支付状态，并发放奖励。
	 * 会检查本地数据库中标记为未同步的订单，并更新其状态。
	 * > is_payment_status_checked < 标识订单的支付状态是否已经在第三方支付平台进行了查询。当用户完成支付操作后，如果由于应用被重启或其他原因导致本地支付状态未及时更新，这个字段会在重启后用来检查并同步第三方支付平台的支付状态。true 表示已检查并确认了第三方支付平台的支付状态，无论是支付完成还是未完成；false 表示本地数据库状态尚未与第三方支付平台同步。这确保了即使在应用重启后，用户的支付状态也能被准确追踪和处理，以便及时更新数据库并发放相应的奖励。
	 * @param {string} userId 用户ID
	 * @return {Object} 同步结果
	 */
	'async-ltzf-order-status': asyncBlueTuOrderStatus

	/**
	 * method1方法描述
	 * @param {string} param1 参数1描述
	 * @returns {object} 返回值描述
	 */
	/* 
	method1(param1) {
		// 参数校验，如无参数则不需要
		if (!param1) {
			return {
				errCode: 'PARAM_IS_NULL',
				errMsg: '参数不能为空'
			}
		}
		// 业务逻辑
		
		// 返回结果
		return {
			param1 //请根据实际需要返回值
		}
	}
	*/
}

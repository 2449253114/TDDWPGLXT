const {
	querystring,
    wxPaySign
} = require('../../common/fun')

const {
    payConfig
} = require('../../common/pay-config')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

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
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		bodyParam = Buffer.from(bodyParam, 'base64').toString()
	}
	
	const key = payConfig.mch_key;// 商户密钥
	const mch_id = payConfig.mch_id; // 商户号
	
	// 1. 获取支付通知回调返回的参数
	let sign,// 签名
		code,// 支付结果 
		timestamp, // 时间戳
		order_no,// 蓝兔支付系统订单号
		out_trade_no,// 商户订单号
		pay_no,// [第三方支付单号] 支付宝或微信支付订单号
		total_fee;// 支付金额
	
	// 检查bodyParam是否为JSON格式
	if (bodyParam.trim().startsWith('{') && bodyParam.trim().endsWith('}')) {
		try {
			({sign, code, timestamp, order_no, out_trade_no, pay_no, total_fee} = JSON.parse(bodyParam));
		} catch (error) {
			return createResponse(STATE_CODE.ERROR, "无效的请求数据");
		}
	} else { // 否则，认为它是URL编码的
		//params = querystring.parse(bodyParam);
		({sign, code, timestamp, order_no, out_trade_no, pay_no, total_fee} = querystring.parse(bodyParam));
	}
	
	// 2. 构造参与签名
	const params = {
		code,// 支付结果 
		timestamp,// 时间戳
		mch_id,// 商户号
		order_no,// 蓝兔支付系统订单号
		out_trade_no,// 商户订单号
		pay_no,// [第三方支付单号] 支付宝或微信支付订单号
		total_fee,// 支付金额
	};
	
	// 生成签名
	const signature = wxPaySign(params, key);
	
	// 3. 校验签名
	if (signature == sign) {
		// 业务逻辑处理
		return 'SUCCESS'; // 返回SUCCESS字符串即表示处理成功，系统收到返回SUCCESS后则回调不再进行回调
	}
	
	return 'FAIL'; // 返回FAIL字符串即表示处理失败，系统收到返回FAIL后则回调会再次进行回调
}
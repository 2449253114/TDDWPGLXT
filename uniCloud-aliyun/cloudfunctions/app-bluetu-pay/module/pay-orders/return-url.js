const {
	dbCmd,
	userCollection,
	userScoresCollection,
	userVipCollection,
	payOrdersCollection
} = require('../../common/constants')

const {
    wxPaySign
} = require('../../common/fun')

const {
    payConfig
} = require('../../common/pay-config')

// 设置一个延时函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


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
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	// 获取HTTP请求的Query参数, 如 ?id=123
	const queryParam = httpInfo.queryStringParameters
	
	// 直接返回同步通知成功
	return 'SUCCESS'
}
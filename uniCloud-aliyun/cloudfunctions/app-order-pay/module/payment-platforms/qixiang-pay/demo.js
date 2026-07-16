const qixiangPayConfig = require('../../../common/config/qixiang-pay-config');
const {
	createQixiangPayMD5Sign,
	generateOutTradeNo
} = require('../../../common/utils.js')

/**
 * 调用七相支付接口
 * @param {Object} params 请求参数
 * @returns {Object} 支付接口返回结果
 */
async function callPayApi(params) {
	try {
		// 发起请求
		const result = await uniCloud.request({
			url: `${qixiangPayConfig.api_url}/mapi.php`,
			method: "POST",
			data: params,
			header: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			dataType: "json",
		});

		// 返回结果
		return result.data;
	} catch (error) {
		throw new Error(`七相支付API请求失败: ${error.message}`);
	}
}


async function createOrder() {

	const {
		mch_id: pid,
		mch_key,
		//notify_url,
		//return_url
	} = qixiangPayConfig;

	// 1. 构造请求参数
	const params = {
		pid, // 商户 ID
		type: 'alipay', // 支付方式，默认为支付宝
		out_trade_no: '20200806151343350', //generateOutTradeNo('cs'), // 商户订单号，默认为当前时间戳
		notify_url: 'http://www.pay.com/notify_url.php', // 异步通知地址
		return_url: 'http://www.pay.com/return_url.php', // 跳转通知地址
		sitename: 'MYWEB.COM',
		name: '这是一个测试1111，测试有没有语音提示', // 商品名称
		money: '0.01', // 商品金额，单位：元
		clientip: '192.168.1.100', // 用户 IP 地址
		device: 'jump' // 设备类型，固定为 jump
	};
	
	// 2. 生成签名
	params.sign = createQixiangPayMD5Sign(params, mch_key, false);
	params.sign_type = "MD5"; // 签名类型
	
	//return params
	
	// 3. 调用支付接口
	const payResult = await callPayApi(params);
	
	// 4. 返回支付链接或错误信息
	if (payResult.code === 1) {// 1为成功，其它值为失败
		return {
			code: 0,
			message: '支付链接生成成功',
			data: {
				trade_no: payResult.trade_no, // 支付订单号
				pay_url: payResult.payurl, // 支付跳转链接
				qrcode: payResult.qrcode // 二维码链接（如果有）
			}
		};
	} else {
		return {
			code: -1,
			message: payResult.msg || '支付链接生成失败',
			params
		};
	}
}

module.exports = {
	qixiangPayCreateOrder: createOrder
}
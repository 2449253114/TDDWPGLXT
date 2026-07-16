//const axios = require("axios");
const qixiangPayConfig = require("../../../common/config/qixiang-pay-config");
const {
	createMD5Sign
} = require("../../../common/utils");

/**
 * 七相支付API封装
 */
const qixiangPayApi = {
	/**
	 * 统一下单支付
	 * @param {Object} orderData 订单数据
	 * @returns {Promise<Object>} 支付结果
	 */
	createOrder: async (orderData) => {
		const {
			mch_id: pid,
			mch_key,
			type,
			api_url,
			notify_url,
			return_url
		} = qixiangPayConfig;

		// 构造请求参数
		const params = {
			pid,
			type: type[orderData.paymentType], // 支付方式
			out_trade_no: orderData.outTradeNo, // 商户订单号
			notify_url, // 异步通知地址
			return_url, // 跳转通知地址
			name: orderData.name, // 商品名称
			money: orderData.money, // 商品金额
			clientip: orderData.clientip || "192.168.1.100", // 用户IP地址
			device: "jump", // 设备类型
			param: orderData.param || "购买软件源码", // 业务扩展参数
		};

		// 生成签名
		params.sign = createMD5Sign(params, mch_key, false);
		params.sign_type = "MD5", // 签名类型

		try {
			// 发起请求
			const res = await uniCloud.request({
				url: `${api_url}/mapi.php`,
				method: "POST",
				data: params,
				header: {
					"content-type": "application/x-www-form-urlencoded"
				},
				dataType: "json",
			});

			// 返回结果
			return res.data;
		} catch (error) {
			throw new Error(`七相支付API请求失败: ${error.message}`);
		}
	},
	queryOrder: async (orderId) => {
		// 调用蓝兔支付的API查询订单
		const response = await request.get(`https://api.lantu.com/queryOrder/${orderId}`);
		return response.data;
	},
};

module.exports = qixiangPayApi;
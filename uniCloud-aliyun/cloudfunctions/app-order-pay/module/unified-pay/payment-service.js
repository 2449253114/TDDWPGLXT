const {
	STATE_CODE,
	createResponse
} = require('../../common/response')
const {
	parseBodyFields
} = require('../../common/utils')
const db = require('../../common/db'); // 引入通用数据库方法
const lantuPayService = require('../payment-platforms/lantu-pay/service');
const qixiangPayService = require('../payment-platforms/qixiang-pay/service');
const caihongPayService = require('../payment-platforms/caihong-pay/service');

/**
 * 创建订单
 * @description 该函数用于创建订单，会从HTTP请求信息中提取必要的字段（如用户ID、商品ID、支付方式等），并解析为订单数据。
 * @param {String} user_id 用户ID
 * @param {String} goods_id 商品ID
 * @param {String} pay_type 支付方式，可选值为 alipay（支付宝）或 wxpay（微信支付）
 * @returns {Object} 待定
 */
async function createOrder(paymentType, orderData) {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo();
	// 需要提取的字段名数组
	const fields = ["user_id", "goods_id", "pay_type"];
	const { user_id, goods_id, pay_type } = parseBodyFields(httpInfo, fields);

	// 1. 查询用户信息并检查状态
	const userInfo = await db.getUserInfo(user_id);
	if (!userInfo) {
		return createResponse(STATE_CODE.ERROR, "此用户不存在");
	}
	if (userInfo.status === 1) {
		// 用户状态：0 正常 1 禁止购买会员 3 已封禁
		return createResponse(STATE_CODE.ERROR, "商户异常"); // 禁止购买会员
	}
	
	// 2. 检查27分钟内是否存在未支付订单，如果存在未支付订单，直接返回该订单的支付链接
	const existingOrder = await db.getExistingOrder(user_id);
	if (existingOrder) {
		return {
			code: 0, // 状态码：0 成功 1 失败。这里的状态码需要和蓝兔支付的保持一致性
			message: "您有未支付的订单，请先完成支付或等待30分钟后再试。",
			data: {
				out_trade_no: existingOrder.out_trade_no,
				pay_url: existingOrder.jump_h5_pay_url,
				request_id: '7b80b625-4320-9d63-26cc-00a400af9135'
			}
		};
	}

	// 3. 获取商品信息并继续下单流程
	const goodsInfo = await db.getGoodsInfo(goods_id);
	if (!goodsInfo) {
		return createResponse(STATE_CODE.ERROR, "未找到商品信息");
	}
	
	// 处理商品信息
	const { day_count, price: total_fee, giveaway_coin, type, name } = goodsInfo;
	const body = type === 0 ? `U币充值（${total_fee}）` : `高级会员开通（${name}）`;// 此商品描述仅用于熊多多数据库，不作为微信支付和支付宝支付的商品名称。

	// 继续正常下单流程...


	const orderData = 1
	const paymentType = 2


	if (paymentType === 'wxpay') {
		return lantuPayService.createOrder(orderData);
	} else if (paymentType === 'alipay') {
		return caihongPayService.createOrder(orderData);
	} else {
		throw new Error('Unsupported payment type');
	}
}

/**
 * 创建七相支付订单
 * @param {Object} event 事件对象
 * @returns {Promise<Object>} 创建订单结果
 */
async function createQixiangOrder(event) {
	const orderData = {
		paymentType: event.paymentType, // 支付方式：alipay 或 wxpay
		outTradeNo: event.outTradeNo, // 商户订单号
		name: event.name, // 商品名称
		money: event.money, // 商品金额
		clientip: event.clientip, // 用户IP地址
		param: event.param, // 业务扩展参数
	};

	return qixiangPayService.createOrder(orderData);
}

// 获取客户端IP的方法
function getClientIP() {
	// 调用 getClientInfo 方法获取客户端信息
	const clientInfo = this.getClientInfo();

	// 从客户端信息中提取 clientIP
	const clientIP = clientInfo.clientIP;

	// 返回客户端IP地址
	return clientIP;
}



module.exports = {
	createOrder,
};
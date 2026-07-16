const {
	payOrdersCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

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
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		bodyParam = Buffer.from(bodyParam, 'base64').toString()
	}
	
	let user_id, order_type;// 订单类型  0：金币充值订单  1：会员开通订单  10: 全部类型的订单
	try {({
			user_id, 
			order_type, 
		} = JSON.parse(bodyParam));
	} catch (error) {
		return createResponse(STATE_CODE.ERROR, "无效的请求数据");
	}
	
	// 对order_type进行处理
	let orderTypeList = order_type === 10 ? [0, 1] : [order_type];
	
	// 1. 根据订单类型查询所有订单记录
	let queryPayOrder = await payOrdersCollection.where({
		user_id: user_id,
		order_type: { $in: orderTypeList },
	})
	.orderBy('create_time', 'desc')// 按照创建时间倒序排列
	.limit(1000) // 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
	.get()
	
	// 2. 返回所有订单记录
	if (queryPayOrder['affectedDocs'] == 0) {
		return createResponse(STATE_CODE.ERROR, "暂无订单记录");
	}
	
	return createResponse(STATE_CODE.SUCCESS, "查询成功", queryPayOrder.data);
}
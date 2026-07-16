const {
	shopGoodsCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')



/**
 * 获取商品列表
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-system/getGoodsList
 * 
 * @param {Number} type - 商品类型：0 金币充值 、1 会员开通 
 *     必填: 是
 *     示例值: 1
 * 
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		bodyParam = Buffer.from(bodyParam, 'base64').toString()
	}
	
	let type;
	try {
		({type = 0} = JSON.parse(bodyParam));
	} catch (error) {
		return createResponse(STATE_CODE.ERROR, "无效的请求数据");
	}
	
	// 业务逻辑开始-----------------------------------------------------------
	const goodsResult = await shopGoodsCollection.where({type}).get()
	
	if (goodsResult.affectedDocs === 0) {
		return createResponse(STATE_CODE.ERROR, "没有找到相关商品");
	}
	
	// 返回数据给客户端
	return createResponse(STATE_CODE.SUCCESS, "获取商品列表成功", goodsResult.data);
}
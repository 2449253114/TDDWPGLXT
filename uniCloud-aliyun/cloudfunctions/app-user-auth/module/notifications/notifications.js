const {
	appSystemNoticeCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')


/**
 * 查询当前用户的系统通知
 * @url GET /api/users/notifications
 * @param {Object}  params
 * @param {String} 	params.userId 用户的ID
 * @returns {Object} 返回用户的系统通知列表
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let userId;
	try {
		({
			userId
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	try {
		const noticesResult = await appSystemNoticeCollection.where({
			user_id: userId // 确保这是存储在通知文档中的用户ID字段
		}).orderBy('create_date', 'desc').get(); // 获取最新的通知列表
		
		// 构造空的响应体
		let emptyResponse = {
			total: 0,
			list: []
		}
		
		// 没有更多数据了
		if (noticesResult['affectedDocs'] === 0) {
			return createResponse(STATE_CODE.SUCCESS, '没有更多数据了', emptyResponse)
		}
		
		// 构造响应体
		let response = {
			total: noticesResult['affectedDocs'],// 总记录数
			list: noticesResult.data// 数据列表
		}
		
		return createResponse(STATE_CODE.SUCCESS, "查询成功", response);
	} catch (error) {
		console.error('Error retrieving system notifications:', error);
		return createResponse(STATE_CODE.ERROR, "查询系统通知失败");
	}
}
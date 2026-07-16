const {
	userCollection
} = require('../../../common/constants');

const {
	STATE_CODE,
	createResponse
} = require('../../../common/response');

/**
 * 查询用户的邀请记录
 * @url GET /api/users/invitation-records
 * @param {String} userId 用户的ID
 * @returns {Object} 返回用户的邀请记录列表
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
	
	let invitationRecordsResult;
	try {
		invitationRecordsResult = await userCollection.where({
			inviter_uid: userId // 邀请人ID字段
		})
		.field({
			my_invite_code: true,
			device_oaid: true,
			invite_time: true
		})
		.orderBy('invite_time', 'desc')
		.limit(1000)
		.get(); // 获取最新的邀请列表
	} catch (error) {
		console.error(error);
		return createResponse(STATE_CODE.ERROR, "查询邀请记录失败");
	}
	
	// 构造空的响应体
	let emptyResponse = {
		total: 0,
		list: []
	}

	// 没有更多数据了
	if (invitationRecordsResult['affectedDocs'] === 0) {
		return createResponse(STATE_CODE.FAIL, '没有更多数据了', emptyResponse)
	}
	
	// 处理数据，将device_oaid转换成前三位和后四位显示，中间用*代替，保留11位
	let processedData = invitationRecordsResult.data.map(record => {
	  let processedRecord = { ...record };
	  // oaid加密
	  if (processedRecord.device_oaid) {
		const oaid = processedRecord.device_oaid;
		processedRecord.device_oaid = `${oaid.substring(0, 3)}****${oaid.substring(oaid.length - 4)}`;
	  }
	  // 删除用户id
	  delete processedRecord._id
	  return processedRecord;
	});
	
	// 我的邀请人数
	const my_invite_count = processedData.length

	// 如果数组长度超过50，仅保留前50条数据，这样APP中就不会出现：如53-50=-3，即还差-3人获得永久VIP的错误显示的BUG
	if (processedData.length > 50) {
		processedData = processedData.slice(0, 50);
	}
	
	
	// 构造响应体
	let response = {
		total: invitationRecordsResult['affectedDocs'],// 总记录数
		list: processedData// 数据列表
	}
	
	// 返回结果
	return createResponse(STATE_CODE.SUCCESS, `查询邀请记录成功，你已邀请 ${my_invite_count} 人`, response)

}
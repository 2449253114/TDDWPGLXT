const {
	userCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

const {
	checkVipStatus,
	updateUserLastOnline
} = require('../../common/fun')

/**
 * 获取用户信息（参数：_id和my_invite_code二选一）
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/getUserInfo
 * @param {Object}  params
 * @param {String}  params._id       用户ID
 * @param {String}  params.my_invite_code		用户自己的邀请码
 * @returns
 */
module.exports = async function () {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let _id, my_invite_code;
	try {
		({
			_id,
			my_invite_code
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}
	
	// 获取用户信息
	let queryUserResult;
	if (_id) {
		queryUserResult = await userCollection.where({ _id: _id }).get()
	} else if (my_invite_code) {
		//return createResponse(STATE_CODE.FAIL, `my_invite_code == ${my_invite_code}`);
		queryUserResult = await userCollection.where({ my_invite_code: my_invite_code }).get()
	} else {
		return createResponse(STATE_CODE.FAIL, "缺少用户标识信息");
	}

	// 没有此用户
	if (queryUserResult['affectedDocs'] == 0) {
		return createResponse(STATE_CODE.FAIL, "用户不存在")
	}

	let userInfo;
	if (queryUserResult['affectedDocs'] == 1) {
		userInfo = queryUserResult['data'][0]
	}
	
	// 先更新用户的VIP状态
	let updateUserResult = await userCollection.where({
		_id: userInfo._id
	}).updateAndReturn({
		vip: checkVipStatus(userInfo), // 检查并更新VIP状态
		last_online_time: updateUserLastOnline() // 使用当前时间戳作为最后在线时间
	})
	
	const data = updateUserResult['doc']
	
	return createResponse(STATE_CODE.SUCCESS, "获取用户信息成功", data)
}
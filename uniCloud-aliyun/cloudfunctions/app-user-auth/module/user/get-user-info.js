const {
	userCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

const {
	checkVipStatus,
	updateUserLastOnline,
	maskDeviceOaid
} = require('../../common/fun')

/**
 * 获取用户信息（按 _id 查询），返回的 device_oaid 已打码
 * 原先还支持按 my_invite_code 查询，并返回未打码的整份资料。邀请码本身是公开分享的，
 * 拿到别人的邀请码就能拿到对方的登录凭证 device_oaid。App 只按 _id 查询，所以去掉了这种查询方式
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/getUserInfo
 * @param {Object}  params
 * @param {String}  params._id       用户ID
 * @returns
 */
module.exports = async function () {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let _id;
	try {
		({
			_id
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	// 获取用户信息。_id 必须是字符串，防止传入对象被当成查询条件
	if (!_id || typeof _id !== 'string') {
		return createResponse(STATE_CODE.FAIL, "缺少用户标识信息");
	}
	const queryUserResult = await userCollection.where({ _id: _id }).get()

	// 没有此用户
	if (queryUserResult.data.length == 0) {
		return createResponse(STATE_CODE.FAIL, "用户不存在")
	}

	let userInfo;
	if (queryUserResult.data.length == 1) {
		userInfo = queryUserResult['data'][0]
	}
	
	// 先更新用户的VIP状态
	let updateUserResult = await userCollection.where({
		_id: userInfo._id
	}).updateAndReturn({
		vip: checkVipStatus(userInfo), // 检查并更新VIP状态
		last_online_time: updateUserLastOnline() // 使用当前时间戳作为最后在线时间
	})
	
	const data = maskDeviceOaid(updateUserResult['doc'])

	return createResponse(STATE_CODE.SUCCESS, "获取用户信息成功", data)
}
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
 * 获取用户信息（_id 和 my_invite_code 二选一，同时传时按 _id 查），返回的 device_oaid 已打码
 * App 按 _id 查询；网页版客服入口（uni-im-web-load/pages/index/index.vue）只有用户输入或 App 传入的邀请码，
 * 按 my_invite_code 查询，用返回的 _id 登录客服、用 status 判断是否封禁。
 * 邀请码是公开分享的，按邀请码能查到任何人的资料，所以 device_oaid（登录凭证）必须打码
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/getUserInfo
 * @param {Object}  params
 * @param {String}  params._id       			用户ID
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

	// 获取用户信息。查询值必须是非空字符串，防止传入对象被当成查询条件
	const where = _id ? { _id } : { my_invite_code }
	const value = _id || my_invite_code
	if (!value || typeof value !== 'string') {
		return createResponse(STATE_CODE.FAIL, "缺少用户标识信息");
	}
	const queryUserResult = await userCollection.where(where).get()

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
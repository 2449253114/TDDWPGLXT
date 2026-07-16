const {
	userCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

/**
 * 更新用户信息
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/updateUserInfo
 * @param {Object}  params
 * @param {String}  params._id       用户ID
 * @returns
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let _id, my_invite_code, otherProps;
	try {
		({
			_id,
			my_invite_code,
			...otherProps
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}
	
	// 更新并获取更新后的用户信息
	let updateUserResult = await userCollection.where({
		_id: _id
	}).updateAndReturn({
		...otherProps // 只更新排除_id和my_invite_code字段后的其他所有参数
	})

	
	let result = updateUserResult['doc']
	return createResponse(STATE_CODE.SUCCESS, "更新用户信息成功", result)

}
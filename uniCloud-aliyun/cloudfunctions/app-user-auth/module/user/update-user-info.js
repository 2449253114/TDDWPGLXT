const {
	userCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

const {
	maskDeviceOaid
} = require('../../common/fun')

/**
 * 允许客户端通过本接口修改的资料字段。
 * 本接口没有登录态校验，任何人都能用任意 _id 调用；原先除 _id、my_invite_code 外任何字段都能写，
 * 可以直接改 vip、vip_expire_date 刷会员。现在只放行这些不影响会员、邀请、封禁的资料字段。
 * 当前 App（UBear）不调用本接口；会员只能由支付流程、后台人工充值和邀请奖励发放。
 */
const EDITABLE_FIELDS = ['nickname', 'avatar', 'introduction']

/**
 * 更新用户资料（仅限 EDITABLE_FIELDS 中的字段）
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/updateUserInfo
 * @param {Object}  params
 * @param {String}  params._id            用户ID
 * @param {String}  [params.nickname]     昵称
 * @param {String}  [params.avatar]       头像
 * @param {String}  [params.introduction] 简介
 * @returns 更新后的用户信息，device_oaid 已打码。请求中的其他字段不写入，只在日志中记录字段名，
 *          以兼容可能整份上传用户资料的旧客户端；没有任何可写字段时返回失败
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let params;
	try {
		params = JSON.parse(body);
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}
	if (!params || typeof params._id !== 'string' || !params._id) {
		return createResponse(STATE_CODE.FAIL, "缺少用户ID");
	}

	const data = {}
	for (const field of EDITABLE_FIELDS) {
		if (params[field] === undefined) continue
		if (typeof params[field] !== 'string') {
			return createResponse(STATE_CODE.FAIL, `${field} 必须是字符串`);
		}
		data[field] = params[field]
	}
	const ignoredFields = Object.keys(params).filter(field => field !== '_id' && !EDITABLE_FIELDS.includes(field))
	if (ignoredFields.length > 0) {
		console.warn(`更新用户资料：忽略不允许修改的字段 ${ignoredFields.join(', ')}，_id=${params._id}`)
	}
	if (Object.keys(data).length === 0) {
		return createResponse(STATE_CODE.FAIL, "没有可更新的字段");
	}

	// 更新并获取更新后的用户信息
	const updateUserResult = await userCollection.where({
		_id: params._id
	}).updateAndReturn(data)

	const result = updateUserResult['doc']
	if (!result) {
		return createResponse(STATE_CODE.FAIL, "用户不存在");
	}
	return createResponse(STATE_CODE.SUCCESS, "更新用户信息成功", maskDeviceOaid(result))
}

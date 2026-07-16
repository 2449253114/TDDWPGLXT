const {
	createResponse,
	STATE_CODE
} = require('../../coomon/response');

const {
	dbCmd,
	yikeAccountCookieCollection
} = require('../../coomon/constants')

// 添加CK账号功能函数
async function addCkAccount() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}
	
	let user_name, cookie;
	try {
		({
			user_name,
			cookie
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}
	
	// 查询数据库中是否有user_name记录
	try {
		const existingUser = await yikeAccountCookieCollection.where({ user_name }).get();
		if (existingUser.data.length > 0) {
			return createResponse(STATE_CODE.FAIL, "账号已存在");
		}
	} catch (error) {
		return createResponse(STATE_CODE.ERROR, "查询数据库失败", error.message);
	}
	
	// 尝试插入数据并捕获异常
	try {
		const res = await yikeAccountCookieCollection.add({
			user_name,
			cookie,
			status: 0, // 正常
			create_date: Date.now() // 当前时间戳毫秒
		});
		// 返回成功响应
		return createResponse(STATE_CODE.SUCCESS, "账号添加成功", { id: res.id });
	} catch (error) {
		// 返回失败响应
		return createResponse(STATE_CODE.ERROR, "数据库插入失败", error.message);
	}
}

module.exports = {
	addCkAccount
};
const STATE_CODE = {
	ERROR: 404, // 无效请求或请求失败
	SUCCESS: 200, // 成功
};

// 抽象出重复的返回对象（定义一个用于返回结果的函数）
function createResponse(code, message, data = null) {
	return {
		code,
		message,
		data
	};
}

module.exports = {
	STATE_CODE,
	createResponse
}
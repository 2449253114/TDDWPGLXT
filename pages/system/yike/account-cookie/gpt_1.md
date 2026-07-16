```javascript
const STATE_CODE = {
	FAIL: 1005, // 失败
	ERROR: 404,
	SUCCESS: 200
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
	
	let allData; // [{ user_name, cookie },...]
	try {
		({
			allData
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}
	
	// allData在添加到数据库之前，需要把allData中的所有user_name取出来，然后
	
	// 批量插入ck账号数据
	let res = await yikeAccountCookieCollection.add()
	// 批量插入时
	// 参数	类型	说明
	// ids	Array	批量插入所有记录的id
	
}
```
帮我再
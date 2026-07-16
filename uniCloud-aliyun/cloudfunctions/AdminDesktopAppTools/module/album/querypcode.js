const {
	createResponse,
	STATE_CODE
} = require('../../coomon/response');

// 查询邀请码功能函数
async function queryPCode() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let bdstoken, pcode;
	try {
		({
			bdstoken,
			pcode
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	try {
		const clienttype = '70'; // 客户端类型，70为Web

		// 发起 uniCloud.request 请求
		const response = await uniCloud.request({
			url: `https://photo.baidu.com/youai/album/v1/querypcode?clienttype=${clienttype}&bdstoken=${bdstoken}&pcode=${pcode}&web=1`,
			method: 'GET',
			header: {
				Host: 'photo.baidu.com',
				Referer: `https://photo.baidu.com/photo/web/share?inviteCode=${pcode}`,
				Accept: '*/*',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.112 Safari/537.36',
				Connection: 'keep-alive'
			}
		});

		// 处理响应
		const inviteCode = response.data.pdata.invite_code;
		if (inviteCode) {
			return createResponse(STATE_CODE.SUCCESS, '邀请码获取成功', response.data);
		} else {
			return createResponse(STATE_CODE.FAIL, '邀请码获取失败');
		}
	} catch (error) {
		return createResponse(STATE_CODE.ERROR, '请求失败', error);
	}
}

module.exports = {
	queryPCode
};
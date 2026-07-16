const {
	createResponse,
	STATE_CODE
} = require('../../coomon/response');

// 加入相册功能函数
async function joinAlbum() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let bdstoken, invite_code, pcode, cookie;
	try {
		({
			bdstoken,
			invite_code,
			pcode,
			cookie
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}
	
	try {
		const clienttype = '70'; // 客户端类型，70为Web

		// 发起 uniCloud.request 请求
		const response = await uniCloud.request({
			url: `https://photo.baidu.com/youai/album/v1/join?clienttype=${clienttype}&bdstoken=${bdstoken}&invite_code=${invite_code}`,
			method: 'GET',
			header: {
				Host: 'photo.baidu.com',
				Referer: `https://photo.baidu.com/photo/web/share?inviteCode=${pcode}`,
				Cookie: cookie, // 必填参数
				Accept: '*/*',
				'Accept-Encoding': 'gzip, deflate, br',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.112 Safari/537.36',
				Connection: 'keep-alive'
			}
		});

		// 处理响应
		if (response.data.errno === 0) {
			return createResponse(STATE_CODE.SUCCESS, '成功加入相册', response.data);
		} else if (response.data.errno === 50805) {
			return createResponse(STATE_CODE.FAIL, '你已在共享相册中，请勿重复操作', response.data);
		} else {
			return createResponse(STATE_CODE.FAIL, '加入相册失败', response.data);
		}
		// 50801 你不在此相册
	} catch (error) {
		return createResponse(STATE_CODE.ERROR, '请求失败', error);
	}
}

module.exports = {
	joinAlbum
};
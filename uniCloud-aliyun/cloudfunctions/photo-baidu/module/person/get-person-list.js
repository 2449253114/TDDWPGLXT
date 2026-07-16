const {
    STATE_CODE,
    createResponse
} = require('../../common/response')


/**
 * [一刻相册 > 人物]：获取人物列表
 * @api https://photo.baidu.com/youai/iclass/person/v2/list
 */
module.exports = async function () {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		bodyParam = Buffer.from(bodyParam, 'base64').toString()
	}
		
	console.log("Received Body:", bodyParam);
		
	let querys, headers;
	try {
		({
			querys,
			headers
		} = JSON.parse(bodyParam));
	} catch (error) {
		console.error("Error parsing bodyParam:", error);
		return createResponse(CODE.ERROR, "无效的请求数据");
	}
	
	// 如果querys已经是对象，则不需要再次解析
	if (typeof querys === 'string') {
		try {
			querys = JSON.parse(querys);
		} catch (error) {
			console.error("Error parsing querys:", error);
			return createResponse(CODE.ERROR, "无效的请求参数");
		}
	}
	
	const {// querys参数只能是string类型
		clienttype = "70",// 客户端类型 70为Web
		bdstoken
	} = querys;
	
	
		
	// querys参数只能采用拼接的方式才能请求成功
	const apiUrl = `https://photo.baidu.com/youai/iclass/person/v2/list?clienttype=${clienttype}&bdstoken=${bdstoken}&ishidden=0&isrelation=0`
	
	
	try {
		const res = await uniCloud.httpclient.request(apiUrl, {
			method: 'POST',
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",// 此类型在['https://photo.baidu.com/youai/album/v1/listfile']接口，控制台中看Network > api接口 > Header > Request Headers 中查看
				...headers
			},
			//content: formData,
			dataType: 'json' // 此处指定为json表示将此请求的返回值解析为json
		});
		
		console.log(res);
		return res;
	} catch (error) {
		console.error(error);
		return { error };
	}
	
	console.log(res)
}
const {
    STATE_CODE,
    createResponse
} = require('../../common/response')

/**
 * [一刻相册 > 全部相册]：获取相册列表
 * @api https://photo.baidu.com/youai/album/v1/list
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
		bdstoken,
		cursor, // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
		limit = "30",// 每页30条（Web版默认）
		need_amount = "1",// 默认
		need_member = "1",// 默认
		field ="mtime"// 默认
	} = querys;
		
	const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
		url: `https://photo.baidu.com/youai/album/v1/list?clienttype=${clienttype}&bdstoken=${bdstoken}&cursor=${cursor}&limit=${limit}&need_amount=${need_amount}&need_member=${need_member}&field=${field}`,
		method: "GET",
		header: headers
	})
		
	//console.log(res.statusCode)
	//console.log(res.data)
	console.log(res)
		
	//返回数据给客户端
	return res
}
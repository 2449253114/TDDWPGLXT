const {
    STATE_CODE,
    createResponse
} = require('../../common/response')



/**
 * 一刻相册 - 视频流 请求接口
 * @return  res.data = m3u8文件内容（视频流） String
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
		
	const {
		fsid,// 必须为String类型
		album_id,// 必须为String类型
		uk,// 必须为String类型
		tid// 必须为String类型
	} = querys;
	
	let res;	
	
	// https://pan.baidu.com/youai/album/v1/streaming?devuid=2911FF3B2B7E55FD3132C8438E692F9B%7CVDZ2VFW2O&clienttype=73&channel=android_14_V2301A_bd-youa_1024227w&version=6.9.2&cuid=2911FF3B2B7E55FD3132C8438E692F9B%7CVDZ2VFW2O&c3_aid=A00-KDTIF2D4B5IPTUUF2WAUU5G4Q7FUFS7X-5CMZ73OM&source=M3U8_AUTO_1080&uk=1815907562&fsid=1123911503007559&tid=115694163524307092&album_id=3610054849882613765
	
	res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
		url: `https://photo.baidu.com/youai/album/v1/streaming?fsid=${fsid}&album_id=${album_id}&uk=${uk}&tid=${tid}`,
		method: "GET",
		dataType: "text",
		header: headers
	})
	
	// 首先检查res.data是否为字符串类型
	if (typeof res.data === 'string') {
	    try {
	        // 尝试将字符串res.data解析为JSON对象
	        res.data = JSON.parse(res.data);
	        // 如果解析成功，那么res.data现在是一个对象，可以进行后续的对象处理
	    } catch (e) {
	        // 如果解析过程中抛出异常，说明res.data不是一个有效的JSON字符串
	        // 此时不需要对res.data进行任何操作，因为它仍然是原始的字符串数据
	        // 我们可以直接使用这个字符串进行后续的处理
	    }
	}
		
	//console.log(res.statusCode)
	//console.log(res.data)
	console.log(res)
		
	//返回数据给客户端
	return res
}
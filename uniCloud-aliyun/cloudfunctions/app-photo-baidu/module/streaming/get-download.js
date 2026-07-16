const {
	photoConfig
} = require('../../common/photo-config')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')



module.exports = async function () {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	//let queryStringParameters = httpInfo.queryStringParameters //: {HTTP请求的Query，键值对形式},
	//const fs_id = queryStringParameters.fs_id
	
	
	const headers = photoConfig.headers

	const apiUrl = "https://photo.baidu.com/youai/album/v1/download?album_id=2918279449996957968&uk=1815907562&tid=317083607965371908&fsid=958983419073317"
	// 发送请求并设置不自动跟随重定向
	const response = await uniCloud.httpclient.request(apiUrl, {
		method: 'GET',
		headers: {
			"Cookie": headers.Cookie,
			"Host": headers.Host,
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
			//"Remote Address": "127.0.0.1:17890"
		},
		followRedirect: false,
		//gzip: true,
	});
	
	// 检查状态码是否为302
	if (response.status === 302 || response.res.statusCode === 302 || response.res.status === 302) {
		// 获取重定向的URL
		const redirectUrl = response.headers['location'] || response.headers['Location'] || response.res
			.headers['location'];
			
		return redirectUrl
	}
	
	
	
}
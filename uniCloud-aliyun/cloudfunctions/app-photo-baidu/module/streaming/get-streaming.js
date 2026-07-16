const fs = require('fs');
const os = require('os');
const path = require('path');
//const axios = require('axios');

const {
	photoConfig
} = require('../../common/photo-config')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')


/**
 * 从m3u8内容中提取所有TS文件的URL
 * @param {*} m3u8Content 	m3u8内容
 * @returns 				TS文件的URL数组
 */
function extractTsUrls(m3u8Content) {
	// 使用正则表达式匹配所有TS文件的URL
	const tsUrlRegex = /(?:#EXTINF:.*,\n)(https?.*?)(?=\n|#)/g;
	let match;
	const tsUrls = [];

	while ((match = tsUrlRegex.exec(m3u8Content)) !== null) {
		// 获取匹配到的TS URL
		tsUrls.push(match[1]);
	}

	return tsUrls;
}



/**
 * 手动解析URL查询参数
 * @param {string} url - 需要解析的URL
 * @returns {Object} - 包含所有查询参数的对象
 */
function parseQueryParams(url) {
	// 获取查询字符串部分
	const queryString = url.split('?')[1];
	const params = {};
	// 拆分查询字符串为键值对数组
	const pairs = queryString.split('&');
	for (const pair of pairs) {
		const [key, value] = pair.split('=');
		params[key] = decodeURIComponent(value);
	}
	return params;
}


/**
 * 从TS文件的URL数组中提取所需参数
 * @param {Array} tsUrls - TS文件的URL数组
 * @returns {Array} - 包含所有提取参数的对象数组
 */
function extractRequiredParams(tsUrls) {
	return tsUrls.map((url, index) => {
		// 使用自定义函数解析URL参数
		const urlParams = parseQueryParams(url);

		// 提取所需参数并重新命名键
		const extractedParams = {
			ts_url: url,
			ts_size: urlParams['ts_size'],
			dtime: urlParams['dtime'], // ts切片视频总时长，如10 = 10秒
			original_file_name: urlParams['fn'], // 原始文件名就是完整的MP4文件名字，不是切片ts名
			fsid: urlParams['fsid'],
			original_file_size: urlParams['size'],
			file_type: urlParams['sta_dt'], // 文件类型
			len: urlParams['len'],
			range: urlParams['range'],
			by: urlParams['by'],
			ts_index: index // 索引序号
		};
		return extractedParams;
	});
}



/**
 * 新函数处理TS链接和重定向
 * @param {*} tsUrls		ts链接
 * @param {*} m3u8Content	m3u8内容
 * @returns 				处理结果（成功则返回包含更新后的m3u8内容）
 */
async function handleTsRedirect(tsUrls, m3u8Content) {
	// 使用第一个TS链接（如果存在）发送请求
	if (tsUrls.length > 0) {
		try {
			const firstTsUrl = tsUrls[0];

			// 使用正则表达式提取 URL 的主机名
			const match = firstTsUrl.match(/^https?:\/\/([^\/]+)/i);
			const host = match && match[1];

			// 发送请求并设置不自动跟随重定向
			const response = await uniCloud.httpclient.request(firstTsUrl, {
				method: 'GET',
				headers: {
					Referer: "https://photo.baidu.com",
					Origin: "https://photo.baidu.com",
					Host: host,
					Connection: "keep-alive",
					//Accept-Encoding: "gzip, deflate, br",
					Accept: "*/*",
					//User-Agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
				},
				followRedirect: false,
				//gzip: true,
			});

			// 检查状态码是否为302
			if (response.status === 302 || response.res.statusCode === 302 || response.res.status === 302) {
				// 获取重定向的URL
				const redirectUrl = response.headers['location'] || response.headers['Location'] || response.res
					.headers['location'];
				// 获取请求URL
				const requestUrl = response.res.requestUrls[0] || firstTsUrl;
				// 获取请求URL，并删除 "https://"
				const requestUrlWithoutScheme = requestUrl.replace(/^https?:\/\//, '');
				// 提取重定向基础路径
				const redirectBaseUrl = redirectUrl.replace(requestUrlWithoutScheme, '');
				// 更新tsUrls数组中的每个URL，同时删除 "https://"
				let updatedTsUrls = tsUrls.map(url => {
					const urlWithoutScheme = url.replace(/^https?:\/\//, '');
					return redirectBaseUrl + urlWithoutScheme;
				});

				// 将更新后的URL重新写入m3u8Content
				let updatedM3u8Content = m3u8Content;
				for (let i = 0; i < tsUrls.length; i++) {
					updatedM3u8Content = updatedM3u8Content.replace(tsUrls[i], updatedTsUrls[i]);
				}
				
				// 所有提取的参数对象数组
				const allExtractedParams = extractRequiredParams(updatedTsUrls);
				

				// 这里可以返回更新后的m3u8内容，或者进行其他需要的操作
				return createResponse(STATE_CODE.SUCCESS, '处理重定向成功', {
					m3u8: updatedM3u8Content,  // 更新后的m3u8文件内容
					urls: updatedTsUrls,     // 更新后的所有TS文件链接
					params: allExtractedParams,// 从TS链接中提取的所有参数信息
				});
			} else {
				console.log('Response Data:', response);
				return createResponse(STATE_CODE.FAIL, '重定向处理失败，状态码非302', response);
			}
		} catch (error) {
			console.error('Request failed:', error);
			return createResponse(STATE_CODE.ERROR, '请求失败', error);
		}
	} else {
		return createResponse(STATE_CODE.FAIL, '没有找到TS链接', null);
	}
}



/**
 * https://photo.baidu.com/youai/file/v1/streaming?fs_id=802501495334896
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let queryStringParameters = httpInfo.queryStringParameters //: {HTTP请求的Query，键值对形式},
	const fs_id = queryStringParameters.fs_id

	const headers = photoConfig.headers

	const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
		//url: `https://photo.baidu.com/youai/file/v1/streaming?fs_id=${fs_id}`,
		url: 'https://photo.baidu.com/youai/album/v1/streaming?fsid=879380303928656&album_id=3670888259671190467&uk=1815907562&tid=317080198078930727',
		method: "GET",
		dataType: "text",
		//header: headers,
		header: {
			Cookie: headers.Cookie,
			Host: headers.Host,
			"User-Agent": headers['User-Agent'],
			Referer: 'https://photo.baidu.com/photo/web/album/3670888259671190467'
		}
	})


	//返回数据给客户端
	return res.data

	// 假设m3u8Content是接口返回的M3U8流内容
	const m3u8Content = res.data; // 你的M3U8内容
	
	const tsUrls = extractTsUrls(m3u8Content);

	// 打印所有TS链接
	console.log(tsUrls);

	// 使用新函数处理TS链接和重定向并返回更新后的M3U8内容
	const redirectResponse = await handleTsRedirect(tsUrls, m3u8Content);

	//return redirectResponse


	// 从处理结果中获取更新后的M3U8内容
	const testUpdatedM3u8Content = redirectResponse.data.m3u8.trim();

	//return testUpdatedM3u8Content

	// return {
	// 	mpserverlessComposedResponse: true, // 使用阿里云返回集成响应是需要此字段为true
	// 	statusCode: 200,
	// 	headers: {
	// 		'content-type': 'application/vnd.apple.mpegurl' // m3u8文件的MIME类型
	// 	},
	// 	body: testUpdatedM3u8Content
	// };


	// 创建一个临时文件路径
	const tempDir = os.tmpdir();
	const tempFileName = `stream-${Date.now()}-${fs_id}.m3u8`;
	const tempFilePath = path.join(tempDir, tempFileName);

	// 从处理结果中获取更新后的M3U8内容
	const {
		m3u8
	} = redirectResponse.data

	// 将M3U8内容写入到临时文件
	fs.writeFileSync(tempFilePath, m3u8, 'utf8');

	// 读取刚刚写入的文件并上传到uniCloud云存储
	const cloudPath = `m3u8files/${tempFileName}`; // 你希望存储的云路径

	// 使用uniCloud.uploadFile API上传文件
	let uploadResult;
	try {
		const fileContent = fs.readFileSync(tempFilePath);
		uploadResult = await uniCloud.uploadFile({
			cloudPath: cloudPath,
			fileContent: fileContent,
			cloudPathAsRealPath: true // 是否以cloudPath作为云端文件绝对路径
		});
	} catch (error) {
		// 处理文件上传错误
		//console.error('File upload failed:', error);
		return createResponse(STATE_CODE.FAIL, error.message);
	} finally {
		// 清理临时文件
		fs.unlinkSync(tempFilePath);
	}


	// 构造返回数据
	const data = {
		playUrl: uploadResult.fileID
	}
	return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data); // 获取播放地址成功

	// 返回上传结果
	//return uploadResult.fileID;

}
const fs = require('fs');
const os = require('os');
const path = require('path');
//const axios = require('axios');
const {
	userCollection,
	userPurchasesCollection
} = require('../../common/constants')

const {
	photoConfig
} = require('../../common/photo-config')

const {
	checkIfPurchased
} = require('../../common/fun')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

// 定义请求播放URL的函数
async function requestM3U8PlayUrl(headers, fsid) {
	const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
		url: `https://photo.baidu.com/youai/file/v1/streaming?fs_id=${fsid}`,
		method: "GET",
		dataType: "text",
		header: headers,
	})
	
	
	//返回数据给客户端
	//return res.data
	
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
	const tempFileName = `stream-${Date.now()}-${fsid}.m3u8`;
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
		console.error('File upload failed:', error);
		throw new Error('获取播放地址失败');
		
	} finally {
		// 清理临时文件
		fs.unlinkSync(tempFilePath);
	}
	
	// 返回上传结果
	return uploadResult.fileID;
}






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
 * 获取M3U8视频播放地址（用于Web端和APP端，无需请求头播放）
 * @tutorial url https://photo.baidu.com/youai/file/v1/streaming?fs_id=802501495334896
 * @url /api/yike/play-url-m3u8
 * @param {Object}  params
 * @param {String}  params.user_id       		用户ID
 * @param {String}  params.album_id       	  	相册ID
 * @param {String}  params.fsid       	  		文件ID
 * @returns
 */
module.exports = async function() {
	// 一刻相册的请求头
	const headers = photoConfig.headers
	
	const clientInfo = this.getClientInfo()

	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}
	
	// TODO 这里还需要增加一个 相册是否已购买字段、文件是否已购买字段（或者你更建议怎么做会更好？）
	let user_id, album_id, fsid;
	try {
		({
			user_id,
			album_id,
			fsid
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}
	
	
	// TODO 优先判断相册是否已购买，如果是true，则开始查数据库核实，否则如果文件是否已购买，如果true，则开始核实数据库，如果核实，则不需要扣除次数和VIP效验等步骤（或者你更建议怎么做会更好？）
	// TODO: 检查相册或文件是否已购买
	const hasPurchasedAlbum = await checkIfPurchased(userPurchasesCollection, user_id, album_id, null);
	const hasPurchasedFile = !hasPurchasedAlbum && fsid ? await checkIfPurchased(userPurchasesCollection,
		user_id, null, fsid) : false;
	
	// 如果相册或文件已购买，直接请求播放地址
	if (hasPurchasedAlbum || hasPurchasedFile) {
		try {
			const playUrl = await requestM3U8PlayUrl(headers, fsid);
			// 构造返回数据
			const data = {
				playUrl
			}
			return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data); // 获取播放地址成功
		} catch (error) {
			return createResponse(STATE_CODE.FAIL, error.message);
		}
	}
	// 没有购买相册或文件，则正常走播放次数或VIP逻辑


	// 先查询用户信息，获取是否VIP，VIP到期时间是否已过期，非VIP则获取当日剩余观看次数，== 0 则直接返回意思就是说当日免费观看视频次数已经没有了，大致是这个意思。

	// 查询用户信息
	const userResult = await userCollection.where({
		_id: user_id
	}).get()

	// 检查用户是否存在
	if (userResult.data.length === 0) {
		return createResponse(STATE_CODE.FAIL, "用户不存在");
	}

	// 用户信息
	const userInfo = userResult.data[0]
	
	// 检查请求IP是否与最后一次登录IP一致，不一致就是破解APP，如果被破解，那么不需要登录，但是这个用户id的登录ip是破解人的
	const request_ip  = clientInfo['clientIP']
	const last_login_ip = userInfo['login_ip']
	if (request_ip !== last_login_ip) {
		//return createResponse(STATE_CODE.FAIL, "非法访问：您当前的网络环境与账户登录时不符，请在相同的网络环境下观看视频。");
		
		
		// 带上IP返回
		return {
			request_ip: request_ip,
			last_login_ip: last_login_ip,
			...createResponse(STATE_CODE.FAIL, "非法访问：您当前的网络环境与账户登录时不符，请在相同的网络环境下观看视频。")
		}
	}
		
	// 检查用户是否VIP以及VIP是否已过期
	if (userInfo.vip && userInfo.vip_expire_date > Date.now()) {
		// 如果是VIP且VIP未过期，则直接请求播放地址
		try {
			const playUrl = await requestM3U8PlayUrl(headers, fsid);
			// 构造返回数据
			const data = {
				playUrl,
				//Cookie: headers.Cookie, // 播放m3u8视频不需要带上请求头信息
			}
			//return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data); // 获取播放地址成功

			// 带上IP返回
			return {
				request_ip: request_ip,
				last_login_ip: last_login_ip,
				...createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data) // 获取播放地址成功
			}

		} catch (error) {
			//return createResponse(STATE_CODE.FAIL, error.message);
			
			// 带上IP返回
			return {
				request_ip: request_ip,
				last_login_ip: last_login_ip,
				...createResponse(STATE_CODE.FAIL, error.message)
			}
		}

	} else {
		// 有时候，VIP过期时间已经过了，但是用户VIP状态还是true，这个时候需要更新用户VIP状态为false

		// 如果不是VIP或VIP已过期，则检查当日剩余观看次数
		const surplusMovieCount = userInfo.surplus_movie_count || 0;
		// 检查当日剩余观看次数是否已用完
		if (surplusMovieCount <= 0) {
			return createResponse(STATE_CODE.FAIL, "当日免费观看次数已用完");
		}

		// 请求播放地址，然后更新当日剩余观看次数
		try {
			const playUrl = await requestM3U8PlayUrl(headers, fsid);

			// 更新当日剩余观看次数
			const updateResult = await userCollection.where({
				_id: user_id
			}).update({
				surplus_movie_count: surplusMovieCount - 1,
				vip: false
			})

			// 构造返回数据
			const data = {
				playUrl,
				Cookie: headers.Cookie,
			}
			return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data); // 获取播放地址成功

		} catch (error) {
			return createResponse(STATE_CODE.FAIL, error.message);
		}
	}	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	// 下面是原来的代码
	return
	const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
		url: `https://photo.baidu.com/youai/file/v1/streaming?fs_id=${fsid}`,
		method: "GET",
		dataType: "text",
		header: headers,
	})


	//返回数据给客户端
	//return res.data

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
	const tempFileName = `stream-${Date.now()}-${fsid}.m3u8`;
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
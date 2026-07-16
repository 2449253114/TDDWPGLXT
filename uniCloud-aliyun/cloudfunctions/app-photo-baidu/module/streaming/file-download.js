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
async function requestPlayUrl(headers, album_id, uk, tid, fsid) {
	// 发送请求并设置不自动跟随重定向
	const apiUrl =
		`https://photo.baidu.com/youai/album/v1/download?album_id=${album_id}&uk=${uk}&tid=${tid}&fsid=${fsid}`;
	const response = await uniCloud.httpclient.request(apiUrl, {
		method: 'GET',
		headers: {
			"Cookie": headers.Cookie,
			"Host": headers.Host,
			"User-Agent": headers["User-Agent"]
		},
		followRedirect: false, // 不自动跟随重定向
	});

	// 检查状态码是否为302
	if (response.status === 302 || response.res.statusCode === 302 || response.res.status === 302) {
		// 获取重定向的URL
		const redirectUrl = response.headers['location'] || response.headers['Location'] || response.res
			.headers['location'];

		return redirectUrl
	} else {
		throw new Error('获取播放地址失败');
	}
}

// 定义请求文件下载
async function requestFileDownloadedBytes(url) {
	// 使用正则表达式提取 URL 的主机名
	const match = url.match(/^https?:\/\/([^\/]+)/i);
	const host = match && match[1];
	
	// 一刻相册的请求头
	const headers = photoConfig.headers
	
	const inputStream = await uniCloud.httpclient.request(url, {
		method: 'GET',
		headers: {
			"Cookie": headers.Cookie,
			"Host": host, // 从url中取出（就是kotlin中Uri.parse(test_playUrl).host.toString()）
			"User-Agent": headers["User-Agent"]
		},
		responseType: 'arraybuffer' // 设置响应类型为 'arraybuffer' 以接收二进制数据
	});
	// 检查状态码是否为200
	if (response.status === 200 || response.res.statusCode === 200 || response.res.status === 200) {
		// 返回二进制数据和必要的响应头
		return {
			'mpserverlessComposedResponse': true, // 使用阿里云返回集成响应是需要此字段为true
			'isBase64Encoded': true, // 指示响应是 base64 编码的
			'statusCode': 200,
			'headers': {
				'Content-Type': 'application/octet-stream', // 或者设置为实际的文件类型
				'Content-Disposition': `attachment; filename="${encodeURIComponent('downloaded_file.mp4')}"` // 提示下载并设置文件名
			},
			'body': Buffer.from(response.data).toString('base64') // 将 ArrayBuffer 转换为 base64 编码的字符串
		};
	} else {
		// 处理非200响应
		return {
			'mpserverlessComposedResponse': true, // 使用阿里云返回集成响应是需要此字段为true
			'statusCode': response.status,
			'body': 'Error downloading file'
		};
	}
}




/**
  不行，搞不了，请求超时，因为文件太大了，接口是把文件流下载下来才返回，而不是实时返回字节码
 */
module.exports = async function() {
	// 一刻相册的请求头
	const headers = photoConfig.headers

	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()

	// TODO 这里还需要增加一个 相册是否已购买字段、文件是否已购买字段（或者你更建议怎么做会更好？）
	let { user_id, album_id, uk, tid, fsid } = httpInfo.queryStringParameters
	
	// TODO 优先判断相册是否已购买，如果是true，则开始查数据库核实，否则如果文件是否已购买，如果true，则开始核实数据库，如果核实，则不需要扣除次数和VIP效验等步骤（或者你更建议怎么做会更好？）
	// TODO: 检查相册或文件是否已购买
	const hasPurchasedAlbum = await checkIfPurchased(userPurchasesCollection, user_id, album_id, null);
	const hasPurchasedFile = !hasPurchasedAlbum && fsid ? await checkIfPurchased(userPurchasesCollection,
		user_id, null, fsid) : false;

	// 如果相册或文件已购买，直接请求播放地址
	if (hasPurchasedAlbum || hasPurchasedFile) {
		try {
			const playUrl = await requestPlayUrl(headers, album_id, uk, tid, fsid);
			// 文件下载
			return await requestFileDownloadedBytes(playUrl)
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

	// 检查用户是否VIP以及VIP是否已过期
	if (userInfo.vip && userInfo.vip_expire_date > Date.now()) {
		// 如果是VIP且VIP未过期，则直接请求播放地址
		try {
			const playUrl = await requestPlayUrl(headers, album_id, uk, tid, fsid);
			// 文件下载
			return await requestFileDownloadedBytes(playUrl)

		} catch (error) {
			return createResponse(STATE_CODE.FAIL, error.message);
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
			const playUrl = await requestPlayUrl(headers, album_id, uk, tid, fsid);

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
}
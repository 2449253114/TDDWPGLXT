const fs = require('fs');
const os = require('os');
const path = require('path');

const db = uniCloud.database()
const dbCmd = db.command

// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 相册文件 - m3u8文件
const m3u8FileCollectionName = 'yike-album-files-m3u8file'
const m3u8FileCollection = db.collection(m3u8FileCollectionName)

// uniCloud云储存 - 记录已失效的m3u8文件URL，用于清理
const invalidM3u8FilesCollectionName = "yike-invalid-m3u8-files"
const invalidM3u8FilesCollection = db.collection(invalidM3u8FilesCollectionName)

// 文件ID（fsid）请求日志 (这个表用于追踪fsid的请求情况，记录每个文件请求的详细信息)
const fsidRequestLogCollectionName = "yike-fsid-request-log"
const fsidRequestLogCollection = db.collection(fsidRequestLogCollectionName)

const {
	STATE_CODE,
	createResponse
} = require('./common/response')

const testCookie =
	"csrfToken=joEaOBFGKFwVz4c9MaQGC5MD; BAIDUID=70BBC03735C46C38F1C3E622EE7F5DC1:FG=1; BAIDUID_BFESS=70BBC03735C46C38F1C3E622EE7F5DC1:FG=1; sajssdk_2015_cross_new_user=1; Hm_lvt_829488e8924d8de8d4420f2bbed270ca=1722666565; HMACCOUNT=9AD40BAE3DB17FD7; ppfuid=FOCoIC3q5fKa8fgJnwzbE67EJ49BGJeplOzf+4l4EOvDuu2RXBRv6R3A1AZMa49I27C0gDDLrJyxcIIeAeEhD8JYsoLTpBiaCXhLqvzbzmvy3SeAW17tKgNq/Xx+RgOdb8TWCFe62MVrDTY6lMf2GrfqL8c87KLF2qFER3obJGkHp63bu3czrh/uoEk96H6EGEimjy3MrXEpSuItnI4KD0BW5CBm/htDYIVQwLsy5hUmlsoUVQWEmmE3uQm/4+Z+Jihh7G4sqnvRcPMP8raywRJsVwXkGdF24AsEQ3K5XBbh9EHAWDOg2T1ejpq0s2eFy9ar/j566XqWDobGoNNfmfpaEhZpob9le2b5QIEdiQcF+6iOKqU/r67N8lf+wxW6FCMUN0p4SXVVUMsKNJv2T853C6pt6gzN392hDbJ51RHasmgOrJ40n63OsKSOpoSLBCO7+QldZ72iFUBLi59Hd1ndcYUs1vzTMWgthmyCVR/Q+//wdrn6SUz7a0vEMm7QqGqBJJILGchC/ZM0axiniVRKx4R3cqVpTVNqTP1tWGnGGu/AVLS3NcPF3XemJkZyi6L0BPA661JDj0lmZIgcCHm0lGODoYWzuL7ZDizBm0d8BJIJUS1lUOPNebjg5OCjwkSq16g64gugrO/OhN+XjRMTNne43cKuMDmex1CEngB2QvyTjxXMcJvDDEe3McIycHFbZmbEY9LT3RuWsSjij5HIeKAxeCJRzKQmiJrt2NdLXfu0TJRyXYClb9dslijAZowjTAZI0xYa2R0kRG92GebcFRSw+cp76AMYkH68Ey5/q1uQn9VsBjBmLNQsYnwiX1i39zQE19TGybrzqrM1pDNXcybRETVwM6jql+eIXlewf4jZIONqitUD98U0FeHk4vnOZOyajeVuJqw/hTdAQtApplNnCjhwNPVCEwOM+fjqt1fBnMAfpWpnHre1+RlZHHxUnYx9OEBH0ljzkFSY+Oo6VuGtuVcWQFAbufgkqJnJqWT1fbYVd7Yyx2Kk4cXFJQdKps+jY88nMSivXabqVOFHtiCaV8u3uSe0kPld4zsYRDDc4ujl2xJR5AN3q8OeRvvb9Mxhxs9bjxa5KdKAwMvzbQbq/mwgjd9siXUizBEYRDDc4ujl2xJR5AN3q8Oe1WWULX5oIJzwrbxFaliZTRLbhH0MNlXHePf60sunDcFG4X+UjvIZDl0Se0IQy2dVQs5kL/lku7YbUbPICse0exTllnZC81hhWPgxy+x2ZmXayxvT1iTUpRrGE132K7Dr; BDUSS=GppeGNHUE1EUlBnaWZGNkl1cGtkNmpMWWJxaTRiWnFpNkN2ZjZuSEpWQmNXOVZtSVFBQUFBJCQAAAAAAAAAAAEAAADdr9nAu7WztdL7wv3O2cHcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFzOrWZczq1mc; BDUSS_BFESS=GppeGNHUE1EUlBnaWZGNkl1cGtkNmpMWWJxaTRiWnFpNkN2ZjZuSEpWQmNXOVZtSVFBQUFBJCQAAAAAAAAAAAEAAADdr9nAu7WztdL7wv3O2cHcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFzOrWZczq1mc; STOKEN=821e4c8cc1ed0c034416467dd4aa653f27fc928a7bbe6e6e60ba03e985e2ecc3; PANWEB=1; PANWEB.sig=mEnYrSeaQqssYZire89rFPmLY9htA0FzmyWp6jBsV1U; Hm_lpvt_829488e8924d8de8d4420f2bbed270ca=1722666590; PANPSC=572073321376410038%3ACU2JWesajwCmCr8hUQJ7IXlibiKzYuqjkrg%2Fn0ecmWIzKBZ7XC259Whzj9wyznjMW3tFl1acfrluYkkraRzPeAZuq6kOUHWCc3z0HClkj5WMarfoSXozH8ZIzuhpmLh6wJbjlnKu7AjslFx3Z5GMjdL9vR6DsgcTu1tPRVPr6y4Qy6lu9E5NuEI0NZhR03fFueSOQr2pfpJ9bfFV5UX2VQ%3D%3D; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%222948895494%22%2C%22first_id%22%3A%2219116edb9fa1aec-0de72de7c34b45-26001f51-1440000-19116edb9fb16fa%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22%24device_id%22%3A%2219116edb9fa1aec-0de72de7c34b45-26001f51-1440000-19116edb9fb16fa%22%7D"

// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129
module.exports = {
	_before: function() { // 通用预处理器

	},

	// ### 这个是测试每15秒请求一次（写个定时任务程序），让它一直跑，等到晚上8点在看是否请求正常。

	async requestStreaming() {
		const fileCount = 1 // 每次只请求一个文件，因为是一个账号

		// 获取未请求过的文件记录
		let unrequestedFiles = await fsidRequestLogCollection.where({
			requested: false
		}).limit(fileCount).get();

		// 去除重复的文件记录，只保留每个fsid的一条记录
		const uniqueFiles = [...new Set(unrequestedFiles.data.map(file => file.fsid))].map(fsid =>
			unrequestedFiles.data.find(file => file.fsid === fsid)
		);

		console.log("uniqueFiles", uniqueFiles)

		// 为每个文件分配一个账号Cookie，并准备更新请求日志的数据
		const assignedCookiesData = uniqueFiles.map((file, index) => {
			return {
				album_id: file.album_id,
				fsid: parseInt(file.fsid, 10), // 确保fsid为整数类型
				tid: file.tid,
				uk: file.uk,
				account_id: "（正在测试）一刻相册54", // 分配账号的用户名称
				other_data: {
					cookie: testCookie, // 分配账号的Cookie值
					cookie_id: "112233"
				}
			};
		});

		console.log("分配账号Cookie的数据", assignedCookiesData)

		// 流程三：根据分配的账号Cookie，同步请求队列中的文件

		// 执行请求逻辑（这里需要您根据实际情况编写请求逻辑）
		const file = assignedCookiesData[0]

		try {
			const playUrl = await requestFile(file);
			// 构造返回数据
			const data = {
				playUrl
			}
			return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data); // 获取播放地址成功
		} catch (error) {
			return createResponse(STATE_CODE.FAIL, error.message);
		}

	}
}


/**
 * 请求文件的示例函数，用于根据提供的文件信息发起请求。
 * @param {Object} file - 包含请求所需文件信息和账号认证数据的对象。
 * @param {string} file.album_id - 一刻相册相册id。
 * @param {number} file.fsid - 文件的唯一标识符。
 * @param {string} file.tid - 一刻相册相册tid。
 * @param {number} file.uk - 文件上传者的用户id。
 * @param {string} file.account_id - 发起请求的账号ID。
 * @param {Object} file.other_data - 其他请求所需的数据。
 * @param {string} file.other_data.cookie - 账号相关的cookie信息。
 * @param {string} file.other_data.cookie_id - 账号相关的cookie_id。
 * 
 */
async function requestFile(file) {
	const {
		album_id,
		fsid,
		tid,
		uk,
		account_id,
		other_data: {
			cookie,
			cookie_id
		}
	} = file;

	// 现在您可以使用这些变量了
	//console.log(album_id, fsid, tid, uk, account_id, cookie);

	// 这里编写请求文件的逻辑，例如使用账号Cookie请求m3u8文件等
	console.log(`Requesting file with fsid: ${fsid} and accountId: ${account_id}`);

	//return

	let playUrl = "";
	try {
		playUrl = await requestM3U8PlayUrl(file);

	} catch (error) {

		console.error(`Error requesting file with fsid ${fsid}:`, error);

		// 检查错误消息是否以特定的前缀开始，这通常表示请求失败
		// 这种检查可以帮助我们识别和处理特定的错误类型
		if (error.message.startsWith("请求失败，errno：")) {

			// 请求失败，不处理
			console.log("error.message", error.message)

		}

		throw new Error(error);

	} finally {
		// 不管成功还是失败，都执行的代码

		try {
			// 尝试更新数据库记录
			await fsidRequestLogCollection.where({
					fsid: parseInt(fsid, 10), // 确保fsid为整数类型
				})
				.update({
					account_id,
					request_time: Date.now(),
					requested: true, // 标记为已请求
					m3u8_file_url: playUrl
				});

			console.log("m3u8_file_url：", playUrl)

		} catch (dbError) {
			// 捕获并处理数据库更新过程中的异常
			console.error(`Error updating database record for fsid ${fsid}:`, dbError);
		}

	}

	return playUrl

}



// ###

/**
 * 定义请求播放URL的函数
 * 请求一刻相册视频的M3U8播放URL。
 *
 * @param {Object} file - 包含请求所需文件信息和账号认证数据的对象。
 * @param {string} file.album_id - 一刻相册相册id。
 * @param {number} file.fsid - 文件的唯一标识符。
 * @param {string} file.tid - 一刻相册相册tid。
 * @param {number} file.uk - 文件上传者的用户id。
 * @param {string} file.account_id - 发起请求的账号ID。
 * @param {Object} file.other_data - 其他请求所需的数据。
 * @param {string} file.other_data.cookie - 账号相关的cookie信息。
 * @param {string} file.other_data.cookie_id - 账号相关的cookie_id。
 * @returns {Promise<string>} 返回M3U8文件的URL或抛出错误
 */
async function requestM3U8PlayUrl(file) {

	const {
		album_id,
		fsid,
		tid,
		uk,
		account_id,
		other_data: {
			cookie,
			cookie_id
		}
	} = file;


	/* 	测试期间使用的
		return "https://doc.dcloud.net.cn/uniCloud/cf-functions.html#packagejson"
		throw new Error("请求播放URL失败，请检查网络或稍后再试。");
	 */

	// 当前时间戳
	const currentTime = Date.now();

	// 准备请求头信息
	const headers = {
		Cookie: cookie,
		Host: "photo.baidu.com",
		Referer: `https://photo.baidu.com/photo/web/album/${album_id}`,
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	}

	// 请求m3u8文件
	let res;
	try {
		res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
			url: `https://photo.baidu.com/youai/album/v1/streaming?fsid=${fsid}&album_id=${album_id}&uk=${uk}&tid=${tid}`,
			method: "GET",
			dataType: "text",
			timeout: 12000, // 超时时间设置
			header: headers
		})
	} catch (error) {
		console.error("请求播放URL失败，请检查网络或稍后再试。", error);
		throw new Error("请求播放URL失败，请检查网络或稍后再试。");
	}

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
	// 在这个阶段，res.data要么是解析成功的JSON对象，要么是未解析的原始字符串
	// 我们可以根据res.data的具体内容来执行不同的逻辑处理

	//console.log('res', res)

	// 从数据库查询当前视频的m3u8文件记录
	let m3u8RecordResult = await m3u8FileCollection.where({
		fsid: parseInt(fsid, 10), // 确保fsid为整数类型, // fsid是不会变的，即使是在其他相册有相同的文件，因为fsid是唯一的
		//album_id: album_id
	}).get();
	let m3u8Record = m3u8RecordResult.data && m3u8RecordResult.data[0];

	// 初始化m3u8记录数据
	let m3u8FileData = {
		album_id: album_id,
		fsid: parseInt(fsid, 10), // 确保fsid为整数类型
		m3u8_file_url: "",
		transcoding_status: "",
		read_count: m3u8Record && m3u8Record.read_count ? m3u8Record.read_count + 1 : 0,
		create_time: currentTime,
		expire_time: currentTime + 7.5 * 60 * 60 * 1000 // 设置过期时间为当前时间加7小时半，2024年7月20之前版本是6小时
	};

	// 判断视频转码状态并处理结果
	if (res.data && typeof res.data === 'object' && res.data.errno !== 0 && res
		.statusCode == 400) {

		m3u8FileData.transcoding_status = "transcoding";
		m3u8FileData.expire_time = currentTime + 5 * 60 * 60 * 1000; // 设置过期时间为当前时间加5小时
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);
		// 这是一次失败的请求
		throw new Error(`请求失败，errno：${ res.data.errno }`);
	} else if (res.data && typeof res.data === 'object' && res.data.errmsg.startsWith("be transcoding") && res
		.statusCode == 400) {
		// 需要有5小时的转码时间
		m3u8FileData.transcoding_status = "transcoding";
		m3u8FileData.expire_time = currentTime + 5 * 60 * 60 * 1000; // 设置过期时间为当前时间加5小时
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);

		// 视频正在转码中
		throw new Error('视频飞速转码中，请稍后再来哦。');
	} else if (res.data && typeof res.data === 'string' && res.data.startsWith("#EXTM3U") && !res.data.includes(
			"#EXT-X-ENDLIST")) {
		// 需要有5小时的转码时间
		m3u8FileData.transcoding_status = "partial_available";
		m3u8FileData.expire_time = currentTime + 5 * 60 * 60 * 1000; // 设置过期时间为当前时间加5小时
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);

		// m3u8内容存在但没有结束符，表示视频部分可播放但还在转码中
		throw new Error('视频部分可播放，但仍在转码中，请稍后再来哦。');
	} else if (res.data && typeof res.data === 'string' && res.data.startsWith("#EXTM3U") && res.data.includes(
			"#EXT-X-ENDLIST")) {
		// 视频已经是m3u8，可以播放
		const m3u8Content = res.data; // m3u8内容
		// 处理获取到的m3u8文件内容，并更新数据库
		m3u8FileData.transcoding_status = "available";
		m3u8FileData.m3u8Record && m3u8Record.read_count ? m3u8Record.read_count + 1 : 0;

		try {
			m3u8FileData.m3u8_file_url = await handleM3u8Content(m3u8Content, fsid);
			await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);
			return m3u8FileData.m3u8_file_url;
		} catch (error) {
			// 如果是TS链接处理失败
			throw new Error(error)
		}
		
	} else {
		// 未知响应，返回错误信息

		// 当前账户被封号：账户异常，请稍后再试！
		m3u8FileData.transcoding_status = "账户异常，请稍后再试！";
		m3u8FileData.expire_time = currentTime + 5 * 60 * 60 * 1000; // 设置过期时间为当前时间加5小时
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);

		throw new Error(`请求失败，errno：${res.data.errno}，errmsg：${res.data.errmsg}`);
	}

}

/**
 * 更新或添加m3u8文件记录到数据库
 * @param {object} m3u8FileCollection 数据库集合引用
 * @param {object|null} m3u8Record 当前数据库中的记录
 * @param {object} m3u8FileData 要更新或添加的记录数据
 */
async function updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData) {
	const {
		read_count,
		...otherParams
	} = m3u8FileData

	// 如果之前存在记录，则更新记录，否则创建新记录
	if (m3u8Record) {
		await m3u8FileCollection.doc(m3u8Record._id).update({
			...otherParams,
			read_count: dbCmd.inc(1) // 用自增好点
		});
	} else {
		await m3u8FileCollection.add(m3u8FileData);
	}

	if (m3u8FileData.m3u8_file_url.startsWith("https://mp-")) {
		await addInvalidM3u8FilesUrl(m3u8FileData)
	}
}

/* 添加已过期的m3u8文件URL记录到数据库 */
async function addInvalidM3u8FilesUrl(m3u8FileData) {
	const expire_time = Date.now() + 7 * 60 * 60 * 1000 // 设置过期时间为当前时间加7小时
	await invalidM3u8FilesCollection.add({
		invalid_m3u8_file_url: m3u8FileData.m3u8_file_url,
		create_date: expire_time
	})
}


/**
 * 处理获取到的m3u8文件内容
 * @param {string} m3u8Content m3u8文件内容
 * @param {Number} fsid 文件id
 * @returns {Promise<string>} 返回m3u8文件的云存储URL
 */
async function handleM3u8Content(m3u8Content, fsid) {
	// 处理m3u8文件内容并上传到云存储的逻辑...
	// 省略具体实现，最终返回云存储中m3u8文件的URL


	// 处理TS链接和重定向的代码 ...
	const tsUrls = extractTsUrls(m3u8Content); // 提取TS链接
	// 使用新函数处理TS链接和重定向并返回更新后的M3U8内容
	const redirectResponse = await handleTsRedirect(tsUrls, m3u8Content);
	// 从处理结果中获取更新后的M3U8内容
	//const testUpdatedM3u8Content = redirectResponse.data.m3u8.trim();
	let testUpdatedM3u8Content;
	try {
		testUpdatedM3u8Content = redirectResponse.data.m3u8.trim();
	} catch (error) {
		console.error("处理TS重定向失败 或 访问 redirectResponse.data.m3u8 时发生错误：", error);
		throw new Error('TS链接处理失败');
	}

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
		throw new Error('m3u8文件上传错误');

	} finally {
		// 清理临时文件
		fs.unlinkSync(tempFilePath);
	}

	// 返回上传结果
	return uploadResult.fileID; // 云存储中m3u8文件的URL
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
				timeout: 12000 // 超时时间设置
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
					m3u8: updatedM3u8Content, // 更新后的m3u8文件内容
					urls: updatedTsUrls, // 更新后的所有TS文件链接
					params: allExtractedParams, // 从TS链接中提取的所有参数信息
				});
			} else {
				console.log('重定向处理失败，状态码非302', response);
				return createResponse(STATE_CODE.FAIL, '重定向处理失败，状态码非302', response);
			}
		} catch (error) {
			console.error('请求TS失败', error);
			return createResponse(STATE_CODE.ERROR, '请求TS失败', error);
		}
	} else {
		console.log("没有找到TS链接")
		return createResponse(STATE_CODE.FAIL, '没有找到TS链接', null);
	}
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
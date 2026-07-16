// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

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

// 一刻相册账号cookie（m3u8流请求时需要的cookie）
const accountCookieCollectionName = "yike-account-cookie"
const accountCookieCollection = db.collection(accountCookieCollectionName)

const {
	STATE_CODE,
	createResponse
} = require('./common/response')


// 测试期间使用的
async function removeAll() {
	// 文件ID（fsid）请求日志
	await fsidRequestLogCollection.where({
		_id: dbCmd.exists(true)
	}).remove()

	// m3u8文件URL
	await m3u8FileCollection.where({
		_id: dbCmd.exists(true)
	}).remove()

	// 已失效的m3u8文件URL
	await invalidM3u8FilesCollection.where({
		_id: dbCmd.exists(true)
	}).remove()
}

// # 这个是V2版本的代码，增加了并发请求。
// package.json > cloudfunction-config > "concurrency": 10,// 单个云函数实例最大并发量，不配置的情况下默认是1


module.exports = {
	_before: function() { // 通用预处理器

	},
	_timing: async function(param) {
		console.log('触发时间：', param.Time)
		console.log('triggered by timing')

		// 开始计时，记录autoProcessFileRequestsWorkflow函数的执行时间
		console.time('autoProcessFileRequestsWorkflow');

		let message = await autoProcessFileRequestsWorkflow()

		// 函数执行完毕后，结束计时
		console.timeEnd('autoProcessFileRequestsWorkflow');

		// 打印autoProcessFileRequestsWorkflow函数的执行时间
		console.log('autoProcessFileRequestsWorkflow函数执行完成，用时以上毫秒');

	},
	startTask: async function() {
		// 开始计时，记录autoProcessFileRequestsWorkflow函数的执行时间
		console.time('autoProcessFileRequestsWorkflow');

		await autoProcessFileRequestsWorkflow()

		// 函数执行完毕后，结束计时
		console.timeEnd('autoProcessFileRequestsWorkflow');

		// 打印autoProcessFileRequestsWorkflow函数的执行时间
		console.log('autoProcessFileRequestsWorkflow函数执行完成，用时以上毫秒');
	}
}


/**
 * 执行文件请求处理流程，包括初始化日志、账号Cookie分配和队列请求。
 * 该函数负责整个文件请求处理的流程，确保每项任务按顺序执行。
 * @returns {Promise<string>} 表示任务执行完成的状态消息。
 */
async function autoProcessFileRequestsWorkflow() {
	// 流程一：初始化请求日志，准备文件请求的基础数据
	await initializeRequestLog();

	// 流程二：根据账号Cookie总数，为未请求的文件分配账号Cookie
	const assignedCookiesData = await assignAccountCookies();

	// 流程三：根据分配的账号Cookie，同步请求队列中的文件
	//await queueRequests(assignedCookiesData);// 一个一个的请求，
	await concurrentQueueRequests(assignedCookiesData) // 并发请求队列中的文件，每批次同时请求8个，同时就是并发的意思

	// 任务完成，返回状态消息
	return "每8分钟触发一次的定时任务：文件请求处理流程执行完毕。 每8分钟一次更加安全，只需要增加账号来弥补即可，安全不封号才是长久稳定的赚钱法则";
}


// ### 流程一：初始化请求日志

/**
 * 初始化请求日志，确保相册文件和请求日志记录同步。
 * 如果请求日志为空，初始化记录；如果总数相等，检查并重置请求状态；
 * 如果相册文件多于请求日志，添加缺失的记录；如果请求日志多于相册文件，删除多余的记录。
 */
async function initializeRequestLog() {
	// 查询相册文件总数
	const {
		total: totalFiles
	} = await fileCollection.where({
		category: 1,
		status: 1
	}).count();

	console.log("totalFiles", totalFiles)

	// 查询请求日志中的记录数
	const {
		total: logCount
	} = await fsidRequestLogCollection.count();

	console.log("logCount", logCount)

	// 如果日志记录数为0，初始化日志
	if (logCount === 0) {
		// 计算需要分批请求的次数
		const batchSize = 1000;
		const totalBatches = Math.ceil(totalFiles / batchSize);

		for (let i = 0; i < totalBatches; i++) {
			const page = i;
			const files = await fileCollection.where({
					category: 1,
					status: 1
				})
				.limit(batchSize)
				.skip(page * batchSize)
				.field({
					album_id: true,
					fsid: true,
					tid: true,
					uk: true
				})
				.get();

			// 将分批请求的文件结果写入请求日志
			await fsidRequestLogCollection.add(files.data.map(file => ({
				...file,
				fsid: parseInt(file.fsid, 10), // 确保fsid为整数类型
				account_id: '', // 初始时账号ID为空，待分配
				requested: false,
				request_time: Date.now()
			})));

			console.log("logCount == 0  page =", page + 1)

		}
	} else if (totalFiles == logCount) {
		// 如果相册文件总数和请求日志中的记录数相等，则检查是否存在未请求的记录
		const {
			total: unrequestedCount
		} = await fsidRequestLogCollection.where({
			requested: false
		}).count();

		// 如果不存在未请求的记录（即所有记录都已被请求），则重置所有记录的requested字段为false
		if (unrequestedCount === 0) {
			const resetResult = await fsidRequestLogCollection.where({
				requested: true
			}).update({
				requested: false,
				account_id: "",
				m3u8_file_url: ""
			});
			console.log(`重置了 ${resetResult.updated} 条记录的请求状态。`);

		}
		// 如果存在未请求的记录，则不需要执行任何操作
		else {
			console.log(`存在未请求的记录数：${unrequestedCount}`);
		}

	} else if (totalFiles > logCount) {
		// 如果相册文件总数大于请求日志中的记录数，则新增记录
		await addMissingRecords(totalFiles, logCount);
	} else if (totalFiles < logCount) {
		// 如果相册文件总数小于请求日志中的记录数，则删除多余的记录
		await removeExcessRecords(totalFiles, logCount);
	}
}

/**
 * 找出存在于当前相册文件中但不在请求日志中的记录，并添加这些缺失的记录
 * @description 如果相册文件总数大于请求日志中的记录数，找出缺失的文件记录并添加到请求日志中
 * @param {number} totalFiles - 当前相册文件总数
 * @param {number} logCount - 请求日志中的记录数
 */
async function addMissingRecords(
	totalFiles, 
	logCount
) {
	// 定义分批大小
	const batchSize = 1000;
	let fileData = [];
	let logData = [];

	// 1. 分批查询fileCollection获取所有文件数据
	fileData = await fetchBatches({
		collection: fileCollection,
		query: {
			category: 1,
			status: 1
		},
		field: {
			album_id: true,
			fsid: true,
			tid: true,
			uk: true
		},
		batchSize: batchSize
	});

	// 2. 分批查询fsidRequestLogCollection获取所有日志数据
	logData = await fetchBatches({
		collection: fsidRequestLogCollection,
		query: {
			fsid: dbCmd.neq(0) // 不等于0
		},
		field: {
			fsid: true
		},
		batchSize: batchSize
	});

	//console.log("fileData", fileData)

	//console.log("logData", logData)


	// 3. 找出日志数据中缺失的文件数据
	const allFsidsInLogs = new Set(logData.map(log => log.fsid)); // 日志中的所有Fsid
	const missingFilesData = fileData.filter(file => !allFsidsInLogs.has(file.fsid)); // 缺失的文件数据

	// 4. 将缺失的文件数据添加到请求日志
	if (missingFilesData.length > 0) {
		await fsidRequestLogCollection.add(missingFilesData.map(file => ({
			...file,
			fsid: parseInt(file.fsid, 10), // 确保fsid为整数类型
			account_id: '', // 初始时账号ID为空，待分配
			requested: false,
			request_time: 0, // 初始时请求时间为0，实际使用时可能需要设置为当前时间
			//files_total: totalFiles
		})));

		console.log(`新增缺失的文件请求日志记录数：${missingFilesData.length}`)
	}
}


/**
 * 找出存在于请求日志中但不在当前相册文件中的记录，并删除这些多余的记录
 * @description 如果相册文件总数小于请求日志中的记录数，找出多余的请求日志记录并删除
 * @param {number} totalFiles - 当前相册文件总数
 * @param {number} logCount - 请求日志中的记录数
 */
async function removeExcessRecords(
	totalFiles,
	logCount
) {

	// 定义分批大小
	const batchSize = 1000;
	let fileData = [];
	let logData = [];

	// 1. 分批查询fileCollection获取所有文件数据
	fileData = await fetchBatches({
		collection: fileCollection,
		query: {
			category: 1,
			status: 1
		},
		field: {
			album_id: true,
			fsid: true,
			tid: true,
			uk: true
		},
		batchSize: batchSize
	});

	// 2. 分批查询fsidRequestLogCollection获取所有日志数据
	logData = await fetchBatches({
		collection: fsidRequestLogCollection,
		query: {
			fsid: dbCmd.neq(0) // 不等于0
		},
		field: {
			fsid: true
		},
		batchSize: batchSize
	});

	// 3. 构建存在的fsid集合
	const existingFsids = new Set(fileData.map(file => file.fsid));

	// 4. 找出日志数据中多余的fsid，并确保它们是整数类型
	const excessFsids = logData
		.filter(log => !existingFsids.has(log.fsid)) // 检查是否存在于existingFsids集合
		.map(log => parseInt(log.fsid, 10)); // 将fsid转换为整数

	// 5. 批量删除多余的请求日志记录
	if (excessFsids.length > 0) {
		// 使用parseInt确保excessFsids中的每个fsid都是整数类型
		await fsidRequestLogCollection.where({
			fsid: dbCmd.in(excessFsids.map(fsid => parseInt(fsid, 10)))
		}).remove();

		console.log(`删除多余的请求日志记录数：${excessFsids.length}`)
	}
}

/**
 * 分批从指定集合中获取数据
 * @param {Object} params - 参数对象
 * @param {Object} params.collection - 数据库集合对象
 * @param {Object} params.query - 查询条件
 * @param {Object} params.field - 需要获取的字段
 * @param {number} params.batchSize - 分批大小
 * @returns {Promise<Array>} 返回一个包含所有数据的数组
 */
async function fetchBatches({
	collection,
	query,
	field,
	batchSize,
	totalRecords
}) {
	let data = [];

	let page = 0;
	let hasMore = true;

	while (hasMore) {
		const result = await collection.where(query)
			.limit(batchSize)
			.skip(page * batchSize)
			.field(field)
			.get();

		// 将查询结果添加到data数组
		data = data.concat(result.data);

		// 检查是否还有更多数据
		if (result.data.length < batchSize) {
			hasMore = false;
			break; // 必须跳出循环，否则还会进入hasMore

		} else {
			// 写在else里保险点
			// 准备下一次查询
			page++;
		}
	}

	return data;
}


// ### 流程二：分配账号Cookie

/**
 * 根据账号Cookie总数，获取未请求过的文件记录，并为每个文件分配一个账号Cookie。
 * 此函数首先查询账号Cookie的总数，然后获取所有未请求过的文件记录。
 * 接着，它去除重复的文件记录，确保每个fsid只有一条记录。
 * 最后，为每个唯一的文件记录分配一个账号Cookie，并更新请求日志。
 * @returns {Object[]} 返回一个对象数组，每个对象包含文件信息和分配的账号Cookie数据。
 */
async function assignAccountCookies() {
	// 查询账号Cookie总数
	let {
		total: cookieCount
	} = await accountCookieCollection.count();

	// 获取所有账号Cookie记录
	const cookies = await accountCookieCollection.limit(cookieCount).get();
	// 过滤掉cookie值为空的记录，并存储有效的cookie记录，以便分配
	const allCookies = cookies.data.filter(cookie => cookie.cookie !== "");
	cookieCount = allCookies.length;

	// 获取未请求过的文件记录
	let unrequestedFiles = await fsidRequestLogCollection.where({
		requested: false
	}).limit(cookieCount).get();

	// 去除重复的文件记录，只保留每个fsid的一条记录
	const uniqueFiles = [...new Set(unrequestedFiles.data.map(file => file.fsid))].map(fsid =>
		unrequestedFiles.data.find(file => file.fsid === fsid)
	);

	//console.log("uniqueFiles", uniqueFiles)


	// 为每个文件分配一个账号Cookie，并准备更新请求日志的数据
	const assignedCookiesData = uniqueFiles.map((file, index) => {
		const cookieItem = allCookies[index % allCookies.length]; // 防止index超出allCookies长度
		return {
			album_id: file.album_id,
			fsid: parseInt(file.fsid, 10), // 确保fsid为整数类型
			tid: file.tid,
			uk: file.uk,
			account_id: cookieItem.user_name, // 分配账号的用户名称
			other_data: {
				cookie: cookieItem.cookie, // 分配账号的Cookie值
				cookie_id: cookieItem._id
			}
		};
	});

	console.log("分配账号Cookie的数据", assignedCookiesData)

	// 返回分配账号Cookie的数据
	return assignedCookiesData;

}


// ### 流程三：队列请求

/**
 * 同步请求队列中的文件，并在每个请求后更新数据库信息，然后间隔200毫秒开始下一个请求。
 * @param {Object[]} assignedFiles - 包含账号Cookie分配信息的未请求文件数据数组。
 */
async function queueRequests(assignedFiles) {
	// 获取需要请求的文件记录
	const filesToRequest = assignedFiles

	// 使用 let 声明一个计数器
	let fileIndex = 0;

	// 同步请求队列中的文件
	for (const file of filesToRequest) {
		// 在控制台输出当前是第几个文件
		console.log(`Processing file ${++fileIndex} of ${filesToRequest.length}`);

		try {
			// 执行请求逻辑（这里需要您根据实际情况编写请求逻辑）
			await requestFile(file);
			// 请求成功，继续处理下一个文件
		} catch (error) {
			// 发生错误，记录错误信息
			console.error(`Error processing file ${fileIndex}:`, error);
			// 使用continue跳过当前的迭代，不执行间隔等待，直接处理下一个文件
			continue; // 如果选择跳过
		}

		// 间隔200毫秒，避免对服务器造成过大压力
		await new Promise(resolve => setTimeout(resolve, 200));
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

		// 检查错误消息是否以特定的前缀开始，这通常表示请求失败
		// 这种检查可以帮助我们识别和处理特定的错误类型
		if (error.message.startsWith("请求失败，errno：-6")) {
			
			try {
				await accountCookieCollection.doc(cookie_id)
					.update({
						cookie: "", // cookie过期，需要更换
						status: 1
					})
			} catch (accError) {
			
				console.log("account_id 更新记录失败，-6可能是cookie过期，因为更换cookie可以解决-6问题", account_id)
			}
			
		} else if (error.message.startsWith("请求失败，errno：") && !error.message.includes("账") || error.message.startsWith("TS链接处理失败")) {
			// 这里找出请求失败的账号account_id，然后更新账号cookie为空
			// try {
			// 	await accountCookieCollection.doc(cookie_id)
			// 		.update({
			// 			cookie: "", // cookie过期，需要更换
			// 			status: 1
			// 		})
			// } catch (accError) {

			// 	console.log("account_id 更新记录失败", account_id)
			// }
			
			console.log("account_id 更新记录失败，如果其他多个定时任务里，总是这个任务错误，说明是cookie过期，否则可能是超时导致的，所以这边不处理更新cookie为空的写库操作", account_id)
			
		} else if (error.message.includes("账")) {
			// Error: 请求失败，errno：9019，errmsg：账户异常，稍后重试
			// 账户异常，请稍后重试！说明账号被封禁了
			try {
				await accountCookieCollection.doc(cookie_id)
					.update({
						cookie: "",
						status: 3 // 账户异常
					})
			} catch (accError) {
			
				console.log("account_id 更新记录失败", account_id)
			}
			
		}

		console.error(`Error requesting file with fsid ${fsid}:`, error);
		throw new Error(`Error requesting file with fsid ${fsid}`); // 抛出错误以便在并发任务中捕获错误并统计错误任务数量

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
		console.error("Request failed:", error);
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
		expire_time: currentTime + 6.5 * 60 * 60 * 1000 // 设置过期时间为当前时间加6小时半，6小时左右才是最保守的
	};

	// 判断视频转码状态并处理结果
	if (res.data && typeof res.data === 'object' && res.data.errno !== 0 && res
		.statusCode == 400) {

		m3u8FileData.transcoding_status = "transcoding";
		m3u8FileData.expire_time = currentTime + 5 * 60 * 60 * 1000; // 设置过期时间为当前时间加5小时
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);
		// 这是一次失败的请求

		// 检查 errmsg 属性是否存在
		if (res.data.errmsg) {
			let errorMessage = `请求失败，errno：${res.data.errno}，errmsg：${res.data.errmsg}`;
			// 抛出包含可能的 errmsg 的错误
			throw new Error(errorMessage);
		} else {
			// 如果 res.data.errmsg 不存在，则只使用 errno 抛出错误
			throw new Error(`请求失败，errno：${res.data.errno}`);
		}

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
		m3u8FileData.transcoding_status = "未知响应，返回错误信息";
		m3u8FileData.expire_time = currentTime + 5 * 60 * 60 * 1000; // 设置过期时间为当前时间加5小时
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);

		throw new Error(`请求失败，errno：未知响应，返回错误信息res，${ res }`);
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
	const expire_time = Date.now() + 6.5 * 60 * 60 * 1000 // 设置过期时间为当前时间加6小时半
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










// ### 新增并发请求。--------------------------------------------------------------

// 并发控制函数，能够处理任务失败
async function concurrentTasks(promises, limit) {
	let results = [];
	let errors = []; // 用于存储错误信息

	let batchNumber = 1; // 初始化批次编号

	// 处理任务的批次
	while (promises.length > 0) {
		// 取出limit数量的任务
		let batch = promises.splice(0, limit);

		// 输出当前批次信息
		console.log(`现在是第 ${batchNumber} 批并发请求，批量大小: ${batch.length}`);

		// 存储原始的Promise，稍后将使用它们
		let running = batch.map(promise => {
			return promise().catch(error => {
				// 捕获任务中的错误，并记录
				errors.push({
					error,
					promise: promise.toString() // 存储错误和对应的任务函数的字符串表示
				});
			});
		});

		// 等待这批任务完成
		await Promise.all(running);

		// 每批任务完成后，间隔200毫秒
		await new Promise(resolve => setTimeout(resolve, 200));

		// 增加批次编号
		batchNumber++;

		// 处理这批任务的结果
		// 假设每个promise执行后返回的结果都存储在results数组中
		results.push(...running.map(promise => promise.result));
	}

	// 汇总并返回结果和错误信息
	// 这里假设每个任务成功时返回的是一个特定的结果对象
	return {
		results,
		errors
	};
}

// 修改后的 queueRequests 函数 为 concurrentQueueRequests
// 并发队列请求处理函数
async function concurrentQueueRequests(assignedFiles) {
	// 定义并发数量
	const concurrencyLimit = 8;

	// 创建 requestFile 的任务数组
	const tasks = assignedFiles.map(file => () => requestFile(file));
	// 这个是模拟请求，测试期间用的
	//const tasks = assignedFiles.map(file => () => simulateRequestFile(file));

	// 使用 concurrentTasks 函数来控制并发
	const {
		results,
		errors
	} = await concurrentTasks(tasks, concurrencyLimit);

	// 处理汇总后的结果和错误
	if (errors.length > 0) {
		// 打印错误信息
		console.error(`在处理 ${results.length} 个任务的过程中发生了 ${errors.length} 个错误`);
		// 可以在这里根据errors数组进一步处理错误
	} else {
		// 如果没有错误，打印所有任务成功的消息
		console.log(`所有文件请求任务成功完成`);
	}

	// 所有任务完成后，返回一个汇总的状态消息
	console.log(`所有文件请求任务执行完毕，共处理了 ${results.length} 个任务，遇到 ${errors.length} 个错误。`);
}


// 模拟请求文件的示例函数，随机成功或失败
async function simulateRequestFile(file) {

	const {
		fsid
	} = file

	// 模拟随机请求成功或失败的概率
	const successProbability = 0.7; // 假设有70%的成功率

	// 根据概率决定请求结果
	const isSuccess = Math.random() < successProbability;

	try {
		if (isSuccess) {
			// 模拟请求成功逻辑
			console.log(`Request for file with fsid: ${fsid} was successful.`);
			// 执行请求成功的代码，例如更新数据库等
			// ...
		} else {
			// 模拟请求失败逻辑
			throw new Error(`Request for file with fsid: ${fsid} failed due to random simulation.`);
		}
	} catch (error) {
		// 处理请求过程中的异常
		console.error(error.message);
		// 可以选择重新抛出错误或处理它，例如更新账号Cookie状态等
		throw error; // 重新抛出错误，以便在concurrentTasks中被捕获
	}
}
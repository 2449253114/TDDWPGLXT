const {
	createResponse,
	STATE_CODE
} = require('../../coomon/response');

const {
	dbCmd,
	fileCollection,
	m3u8FileCollection
} = require('../../coomon/constants')

// 获取指定未过期视频（.m3u8）
async function getUnexpiredVideos() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}
	
	// 指定文件fsid
	let fixed_fsids; // 类型：Array<Number> [ 1, 2, 3 ] 
	try {
		({
			fixed_fsids
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	// 当前时间
	const currentTime = Date.now()
	// 当前时间 + 5分钟的时间戳
	const fiveMinutesLater = currentTime + 5 * 60 * 1000;

	const {
		data: m3u8FileResult
	} = await m3u8FileCollection
		.where({
			expire_time: dbCmd.gt(fiveMinutesLater), // 过期时间 > 当前时间
			transcoding_status: 'available', // 转码完成
			fsid: dbCmd.in(fixed_fsids), // 包含。字段值在给定的数组中
		})
		// 不需要排序，就按默认的
		//.orderBy('create_time', 'desc') // 按照创建时间倒序排列
		.get()

	// 没有更多数据了
	if (m3u8FileResult.length === 0) {
		return createResponse(STATE_CODE.FAIL, '没有更多数据了')
	}

	// 最后一条数据的_id
	const last_id_index = m3u8FileResult.length - 1
	const last_m3u8File_id = m3u8FileResult[last_id_index]._id

	// 提取所有 fsid 并存储到一个数组中
	const allFsids = m3u8FileResult.map(item => item.fsid);
	
	// 使用提取出的 fsid 数组来查询 fileCollection
	const {
		data: fileResult
	} = await fileCollection
		.where({
			fsid: dbCmd.in(allFsids),
		})
		.get()

	// 创建一个数组来存储已经出现过的 fsid
	const seenFsids = [];

	// 使用 filter 方法和 find 方法过滤掉重复的 fsid 项
	const uniqueFileResult = fileResult.filter(item => {
		// 检查当前项的 fsid 是否已经出现在 seenFsids 数组中
		const exists = seenFsids.includes(item.fsid);

		// 如果没有出现过，添加到 seenFsids 数组并保留这个项
		if (!exists) {
			seenFsids.push(item.fsid);
			return true; // 保留这个项
		}
		// 如果已经出现过，则返回 false，表示不保留这个项
		return false;
	});

	// uniqueFileResult 现在包含了每个唯一的 fsid 的第一个出现的项
	//console.log("Unique fileResult", uniqueFileResult);

	// 假设 fileResult 是你提供的原始数组格式
	const processedData = uniqueFileResult.map(item => {
		// 复制原始对象，避免直接修改原始数据
		let newItem = {
			...item
		};

		// 相册文件封面(有时效性) 2024-0518-0103 调整为后台配置的文件封面URL类型？一刻 ：uniCLoud，默认为一刻相册的动态封面URL
		newItem.thumburl = item.thumburl[0]

		// 返回修改后的对象
		return newItem;
	});

	// 构造响应体
	let response = {
		last_m3u8_id: last_m3u8File_id,
		total: processedData.length, // 总记录数
		list: processedData // 数据列表
	}

	// 返回处理后的结果
	return createResponse(STATE_CODE.SUCCESS, '获取成功', response)
}

module.exports = {
	getUnexpiredVideos
};

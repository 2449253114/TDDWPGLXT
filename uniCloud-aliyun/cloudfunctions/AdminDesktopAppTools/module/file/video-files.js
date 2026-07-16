const {
	createResponse,
	STATE_CODE
} = require('../../coomon/response');

const {
	dbCmd,
	fileCollection
} = require('../../coomon/constants')

// 获取视频列表
async function getVideoFiles() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let pageSize, pageNum;
	try {
		({
			pageSize,// 每页数量，最大1000
			pageNum,// 当前页码
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	// 分页查询
	const { data } = await fileCollection.where({
		category: 1,
		status: 1
	})
	.field({
		album_id: true,
		fsid: true,
		tid: true,
		uk: true,
		ctime: true,
		extra_info: true,
		path: true,
		bytes: true,
		duration_format: true,
		thumburl: true,
		md5: true
	})
	.skip(pageSize * (pageNum - 1))
	.limit(pageSize)
	//.orderBy('ctime', 'desc')
	.get();
	
	if (data.length === 0) {
		return createResponse(STATE_CODE.SUCCESS, '没有更多了');
	}

	// 将数据进行处理，将thumburl = thumburl[0]
	data.forEach(item => {
		item.thumburl = item.thumburl[0];
	});

	// 构造响应体（所有接口统一规范）
	let response = {
		total: data.length, // 总记录数
		list: data // 数据列表
	}

	return createResponse(STATE_CODE.SUCCESS, '获取成功', response);

}

// 批量获取指定ID的视频
async function getVideoFilesByIds() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let ids;
	try {
		({
			ids
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	// 批量查询
	const { data } = await fileCollection.where({
		fsid: dbCmd.in(ids),
		category: 1,
		status: 1
	})
	.get()
	
	if (data.length === 0) {
		return createResponse(STATE_CODE.SUCCESS, '没有更多了');
	}
	
	// 构造响应体（所有接口统一规范）
	let response = {
		total: data.length, // 总记录数
		list: data // 数据列表
	}

	return createResponse(STATE_CODE.SUCCESS, '获取成功', response);
}

// 获取视频总数
async function getVideoCount() {
	const { total } = await fileCollection.where({
		category: 1,
		status: 1
	}).count();
	return createResponse(STATE_CODE.SUCCESS, '获取成功', { total });
}

module.exports = {
	getVideoFiles,
	getVideoFilesByIds,
	getVideoCount
};
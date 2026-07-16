const {
	fileCollection,
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')


/**
 * 获取指定文件详情
 * @url /api/yike/file-detail
 * @param {Object}   params
 * @param {String}   params.fsid       	  		文件ID
 * @returns
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let fsid;
	try {
		({
			fsid
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	try {
		let fileResult = await fileCollection.where({
				fsid: fsid
			})
			.field({
				album_id: true, // 一刻相册_相册id
				fsid: true, // 一刻相册_文件id
				tid: true, // 一刻相册_相册tid
				uk: true, // 一刻相册_文件上传者用户id
				file_type: true,
				category: true,
				extra_info: true,
				size: true,
				bytes: true,
				duration_format: true,
				thumburl: true,
				desc: true,
				title: true,
				tag: true,
				ctime: true,
			}) // 指定返回的字段
			.get()

		// 检查是否有查询结果
		if (fileResult && fileResult.data && fileResult.data.length > 0) {

			// 取得第一个元素
			let fileDetail = fileResult.data[0];

			// 如果thumburl是数组且有第二个元素，则取第二个元素，否则使用null或者其他默认值
			//fileDetail.thumburl = (fileDetail.thumburl && fileDetail.thumburl[1]) ? fileDetail.thumburl[1] : null;
			
			// 返回封面信息中的第一张图片（一刻相册的封面URL，此时的URL是定时任务获取的，不必担心失效）
			fileDetail.thumburl = (fileDetail.thumburl && fileDetail.thumburl[0]) ? fileDetail.thumburl[0] : null;

			return createResponse(STATE_CODE.SUCCESS, "获取文件详情成功", fileDetail);
		} else {
			return createResponse(STATE_CODE.SUCCESS, "此文件可能已被删除");
		}

	} catch (error) {
		console.error(error);
		return createResponse(STATE_CODE.ERROR, "获取文件详情失败");
	}




}
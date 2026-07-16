const {
	dbCmd,
	fileCollection,
	albumCollectionName
} = require('../../common/constants')

const {
	selectRandomAvatarUrl,
	querySystemAppConfig
} = require('../../common/fun')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

/**
 * 搜索指定fsid的文件
 * @url /api/yike/file-search
 * @param {Object}  params
 * @param {Number}  params.fsid  	一刻相册_文件id
 * @returns
 */
module.exports = async function () {
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
		let fileResult = await fileCollection
			.aggregate()
			.match({
				fsid: fsid
			})
			.lookup({
				from: albumCollectionName, // 关联的表
				localField: 'album_id', // 当前表的字段
				foreignField: 'album_id', // 关联表的字段
				as: 'album_info', // 输出的字段
			})
			.end();


		// 检查是否有查询结果
		if (fileResult && fileResult.data && fileResult.data.length > 0) {
			
			const { app_file_cover_type } = await querySystemAppConfig()
			
			// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
			let processedData = fileResult.data.map(item => {
				// 克隆 item 以避免修改原始对象
				let newItem = { ...item };

				// 将 thumburl 数组转换为字符串
				//newItem.thumburl = item.thumburl[1];
				
				// 相册文件封面(有时效性) 2024-0518-0103 调整为后台配置的文件封面URL类型？一刻 ：uniCLoud，默认为一刻相册的动态封面URL
				newItem.thumburl = item.thumburl[app_file_cover_type]
				// 相册文件封面(无时效，永久性) 2024-0525-1210 新增此字段用于app的历史记录页和收藏页展示封面，仅限APP为1.0.3版本起支持此字段
				newItem.thumburl_persistent = item.thumburl[1] // 1就是阿里云OSS图片地址
				

				// 检查 album_info 是否非空
				if (item.album_info && item.album_info.length > 0) {
					// 克隆 album_info 对象以避免修改原始对象
					let albumInfo = { ...item.album_info[0] };

					// 相册封面
					//albumInfo.thumburl = albumInfo.cover_info.thumburl[1]; // 返回封面信息中的第二张图片（阿里云OSS）
					albumInfo.thumburl = albumInfo.cover_info.thumburl[0]; // 返回封面信息中的第一张图片（一刻相册的封面URL，此时的URL是定时任务获取的，不必担心失效）

					// 构建新的person_info对象，包含avatarurl、description和link字段
					albumInfo.person_info = {
						//avatarurl: albumInfo.person_info && albumInfo.person_info.avatarurl ? albumInfo.person_info.avatarurl : albumInfo.thumburl,
						avatarurl: selectRandomAvatarUrl(albumInfo.person_info, albumInfo.thumburl),
						name: albumInfo.person_info && albumInfo.person_info.link ? albumInfo.person_info.link : albumInfo.title,
						description: albumInfo.person_info && albumInfo.person_info.description ? albumInfo.person_info.description : "",
						link: albumInfo.person_info && albumInfo.person_info.link ? albumInfo.person_info.link.split('\n') : [],// Array<String>  // 如果link是以换行符分割的字符串，则转换为数组
					};

					// 删除不需要转换的 cover_info 字段
					delete albumInfo.cover_info;
					delete albumInfo.bg_info;
					delete albumInfo.status;
					delete albumInfo.creator_user;
					delete albumInfo.album_type;

					// 用新的 album_info 替换 newItem 对象中的原始 album_info
					newItem.album_info = albumInfo;
				} else {
					newItem.album_info = null;
				}

				// 返回转换后的 item
				return newItem;
			});




			return createResponse(STATE_CODE.SUCCESS, "获取文件详情成功", {
				total: fileResult['affectedDocs'],
				list: processedData
			});
		} else {
			return createResponse(STATE_CODE.SUCCESS, "此文件可能已被删除", {
				total: 0,
				list: []
			});
		}

	} catch (error) {
		console.error(error);
		return createResponse(STATE_CODE.ERROR, "获取文件详情失败");
	}

}


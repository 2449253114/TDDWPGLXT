const {
	dbCmd,
	fileCollection,
	albumCollectionName
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

/**
 * 获取指定类别（视频、图片）文件列表（不指定某个相册的文件，直接查询）
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getCategoryFileList
 * @param {Object}  params
 * @param {Number}  params.pageSize       每页显示数量
 * @param {Number}  params.category       文件类别: 1=视频；3=图片
 * @param {Array}   params.ids       	  文件ID数组，用于跳过已经查询过的文件，ids数组中的文件不会被查询出来
 * @param {Number}  params.skipSize       跳过的数量
 * @returns
 */
module.exports = async function() {
    // 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let pageSize = 20, category = 1, ids = [], skipSize = 0;
	try {
		({ pageSize, category, ids, skipSize } = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

    // 对category进行处理
    let categoryList = category === 0 ? [1, 3] : [category];

	// 获取文件列表
	let result = await fileCollection
		.aggregate() // 聚合表达式 https://doc.dcloud.net.cn/uniCloud/cf-database-aggregate.html#aggregate-expression
		.match({
			// _id: {
			// 	$nin: ids // 不包含ids数组中的文件
			// },
			status: 1, // 状态为1的文件,
			// 确保这个 match 只应用于 fileCollection 中的文档
			category: { $in: categoryList } // 文件类别: 1=视频；3=图片
		})
        .lookup({
            from: albumCollectionName, // 关联的表
            localField: 'album_id', // 当前表的字段
            foreignField: 'album_id', // 关联表的字段
            as: 'album_info', // 输出的字段
        })
		.skip(skipSize)// 跳过的数量
		.sample({// 随机取样
		    size: pageSize
		})
		// .field({// 此方法在aggregate聚合表达式中不支持
		// 	album_id: true,// 一刻相册_相册id
		// 	fsid: true,// 一刻相册_文件id
		// 	tid: true,// 一刻相册_相册tid
		// 	uk: true,// 一刻相册_文件上传者用户id
		// 	file_type: true,
		// 	category: true,
		// 	extra_info: true,
		// 	size: true,
		// 	bytes: true,
		// 	duration_format: true,
		// 	thumburl: true,
		// 	desc: true,
		// 	title: true,
		// 	tag: true,
		// 	ctime: true,
		// })// 指定返回的字段
		// .orderBy('ctime', 'desc')// 按照创建时间倒序
		.sort({ctime: -1}) // <排序规则> :1 代表升序排列（从小到大）；-1 代表降序排列（从大到小）
		.limit(pageSize)
		.end()
	
	// 构造空的响应体
	let emptyResponse = {
		total: 0,
		list: []
	}

	// 没有更多数据了
	if (result['affectedDocs'] === 0) {
		return createResponse(STATE_CODE.FAIL, '没有更多数据了', emptyResponse)
	}	

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	// result.data = result.data.map(item => ({
	// 	_id: item._id,
	// 	album_id: item.album_id, // 一刻相册_相册id
	// 	fsid: item.fsid, // 一刻相册_文件id
	// 	tid: item.tid, // 一刻相册_相册tid
	// 	uk: item.uk, // 一刻相册_文件上传者用户id
	// 	file_type: item.file_type,
	// 	category: item.category,
	// 	extra_info: item.extra_info,
	// 	size: item.size,
	// 	bytes: item.bytes,
	// 	duration_format: item.duration_format,
	// 	thumburl: item.thumburl[1], // 转换thumburl为字符串
	// 	desc: item.desc,
	// 	title: item.title,
	// 	tag: item.tag,
	// 	ctime: item.ctime,
	// 	dlink: item.dlink, // 下载链接接口，用于获取mp4视频真实地址并播放
	// 	//album_info: item.album_info[0] // 关联的相册信息
	// 	album_info: item.album_info.length > 0 ? { // 检查album_info数组是否为空
	// 		thumburl: item.album_info[0].cover_info.thumburl[1], // 关联相册的封面图
	// 		title: item.album_info[0].title, // 关联相册的标题
	// 		notice: item.album_info[0].notice ,// 关联相册的提示信息
	// 		// 这里还有许多字段，难道我都要写成xx: item.album_info[0].xx这样吗？如果我还有20个字段呢？我要写20次？有没有更加简单的写法，只写我想替换的部分，不替换的部分保持不变，比如可以参考第一个thumburl替换了，其他的字段内容实际上没变。
	// 	} : null // 如果album_info为空，则设置为null
	// }));
	result.data = result.data.map(item => {
	  // 克隆 item 以避免修改原始对象
	  let newItem = { ...item };
	
	  // 将 thumburl 数组转换为字符串
	  newItem.thumburl = item.thumburl[1];
	
	  // 检查 album_info 是否非空
	  if (item.album_info && item.album_info.length > 0) {
	    // 克隆 album_info 对象以避免修改原始对象
	    let albumInfo = { ...item.album_info[0] };
	
	    // 转换 album_info 中的 thumburl
	    albumInfo.thumburl = albumInfo.cover_info.thumburl[1];
		
		// 构建新的person_info对象，包含avatarurl、description和link字段
		albumInfo.person_info = {
		    avatarurl: albumInfo.person_info && albumInfo.person_info.avatarurl ? albumInfo.person_info.avatarurl : albumInfo.thumburl,
			name: albumInfo.person_info && albumInfo.person_info.link ? albumInfo.person_info.link : albumInfo.title,
		    description: albumInfo.person_info && albumInfo.person_info.description ? albumInfo.person_info.description : "",
		    link: albumInfo.person_info && albumInfo.person_info.link ? albumInfo.person_info.link : [],// Array<String>
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
	

	// 构造响应体
	let response = {
		total: result['affectedDocs'],// 总记录数
		list: result.data// 数据列表
	}

	// 返回结果
	return createResponse(STATE_CODE.SUCCESS, '获取成功', response)
}
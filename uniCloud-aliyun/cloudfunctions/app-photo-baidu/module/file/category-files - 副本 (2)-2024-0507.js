const {
	dbCmd,
	fileCollection,
	albumCollectionName,
	personCollectionName
} = require('../../common/constants')


const {
	selectRandomAvatarUrl,
	getRandomTimestampInRange
} = require('../../common/fun.js')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

/**
 * 获取指定类别（视频、图片）文件列表（不指定某个相册的文件，直接查询）
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getCategoryFileList
 * @param {Object}  params
 * @param {Number}  params.pageSize       		每页显示数量
 * @param {Number}  params.category       		文件类别: 1=视频；3=图片; 0=全部
 * @param {Number}  params.last_create_time  	最后一条数据的创建时间（传0则修改为当前时间戳）
 * @param {String}  params.last_id  			最后一条数据的_id（传0则不进入条件查询）
 * @param {String}  params.fetchMethod			获取数据的方式："randomSample"=随机采样；"createTime"=按创建时间排序; "createTimeGroupStick"=按创建时间排序，分组置顶
 * @returns
 */
module.exports = async function() {
    // 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let pageSize, category, last_create_time, last_id, fetchMethod;
	try {
		({ pageSize, category, last_create_time, last_id, fetchMethod } = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

    // 对category进行处理
    let categoryList = category === 0 ? [1, 3] : [category];

	// 对最后一条记录的创建时间进行处理，如果last_create_time = 0，则默认为当前时间戳
	//last_create_time = last_create_time == 0 ? Math.floor(Date.now() / 1000) : last_create_time; // 兼容ctime（秒）
	//last_create_time = last_create_time == 0 ? Math.floor(Date.now()) : last_create_time; // 兼容create_time（毫秒）
	// 无参数调用，使用默认的时间范围
	last_create_time = last_create_time == 0 ? getRandomTimestampInRange() : last_create_time;

	// 获取文件列表
	// 根据fetchMethod调用不同的数据获取方法
	let result;
	switch (fetchMethod) {
		case "randomSample":
			result = await getRandomSampleFiles(fileCollection, albumCollectionName, categoryList, last_create_time, last_id, pageSize);
			break;
		case "createTime":
			result = await getFilesByCreateTime(fileCollection, categoryList, last_create_time, last_id, pageSize);
			break;
		case "createTimeGroupStick":
			result = await getFilesByCreateTimeGroupStick(fileCollection, categoryList, last_create_time, last_id, pageSize);
			break;
		default:
			return createResponse(STATE_CODE.FAIL, "无效的获取方法");
	}


	// 构造空的响应体
	let emptyResponse = {
		total: 0,
		list: []
	}

	// 没有更多数据了
	if (result['affectedDocs'] === 0) {
		return createResponse(STATE_CODE.FAIL, '没有更多数据了', emptyResponse)
	}	

	// 构造响应体
	let response = {
		total: result['affectedDocs'],// 总记录数
		list: result.data// 数据列表
	}

	// 返回结果
	return createResponse(STATE_CODE.SUCCESS, '获取成功', response)
}


/**
 * 获取随机采样文件列表和关联相册信息，并对结果进行处理。
 * 返回对象包含影响的文档数量和处理后的数据列表。
 * 
 * 注意：此方法在数据量大的集合高频调用时可能会导致响应缓慢
 * 
 * @param {Collection} fileCollection 		文件集合
 * @param {String} albumCollectionName		相册集合名称 
 * @param {Array} categoryList  			文件类别列表
 * @param {String} last_id  				最后一条数据的_id
 * @param {Number} last_create_time  		最后一条数据的创建时间
 * @param {Number} pageSize 				每页显示数量
 * @returns {Object} 一个包含affectedDocs和data的对象
 */
async function getRandomSampleFiles(
	fileCollection, 
	albumCollectionName, 
	categoryList, 
	last_create_time, 
	last_id, 
	pageSize
) {
	
	// 查询文件总数
	const { result } = await fileCollection.count();
	const totalFiles = result.total;
	// 如果没有文件，则直接返回
	if (totalFiles === 0) {
		return {
			message: '没有文件'
			affectedDocs: 0,
			data: []
		};
	}
	
  	let aggregateResult = await fileCollection
		.aggregate()
		.match({
			status: 1,
			_id: { $nin: [last_id]},// 不包含最后一条数据的_id
			category: { $in: categoryList },
			// ctime: { 
			// 	// 用小于等于更好，因为ctime是一刻相册的字段，假设100个文件是一次性批量上传的，那么这100个文件的ctime时间是相同的，所以必须采用 <= 条件
			// 	$lte: last_create_time // 小于等于最后一条数据的创建时间 
			// },
			// TODO 新版本采用create_time来查询，create_time是自己分配的时间，不是一刻相册那边同步过来的
			create_time: {
				// 用小于等于更好，因为ctime是一刻相册的字段，假设100个文件是一次性批量上传的，那么这100个文件的ctime时间是相同的，所以必须采用 <= 条件
				$lte: last_create_time // 小于等于最后一条数据的创建时间 
			}
		})
		.lookup({
			from: albumCollectionName, // 关联的表
			localField: 'album_id', // 当前表的字段
			foreignField: 'album_id', // 关联表的字段
			as: 'album_info', // 输出的字段
		})
		.sample({ size: pageSize })// 随机取样
		.sort({ create_time: -1 }) // <排序规则> :1 代表升序排列（从小到大）；-1 代表降序排列（从大到小）
		.limit(pageSize)
		.end();

	// 如果没有数据，则直接返回
	// if (aggregateResult['affectedDocs'] === 0) {
	// 	return {
	// 		affectedDocs: 0,
	// 		data: []
	// 	};
	// }
	
	// 查询的数量小于pageSize，则重新查询一下，确保app首页hot数据是无限加载的
	if (aggregateResult['affectedDocs'] < pageSize) {
		
	}
	
	

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	let processedData = aggregateResult.data.map(item => {
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
			  	//avatarurl: albumInfo.person_info && albumInfo.person_info.avatarurl ? albumInfo.person_info.avatarurl : albumInfo.thumburl,
			  	avatarurl: selectRandomAvatarUrl(albumInfo.person_info, albumInfo.thumburl),
				name: albumInfo.person_info && albumInfo.person_info.name ? albumInfo.person_info.name : albumInfo.title,
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

	// 返回处理后的结果
	return {
		affectedDocs: aggregateResult['affectedDocs'],
		data: processedData
	};
	
}



/**
 * 按创建时间获取文件列表的方法
 * 返回对象包含影响的文档数量和处理后的数据列表。
 * 
 * @param {Collection} fileCollection 		文件集合
 * @param {Array} categoryList  			文件类别列表
 * @param {String} last_id  				最后一条数据的_id
 * @param {Number} last_create_time  		最后一条数据的创建时间
 * @param {Number} pageSize 				每页显示数量
 * @returns {Object} 一个包含affectedDocs和data的对象
 */
async function getFilesByCreateTime(
	fileCollection, 
	categoryList, 
	last_create_time, 
	last_id, 
	pageSize
) {
    // 实现按创建时间获取数据的逻辑
	let filesResult = await fileCollection
		.where({
			status: 1,
			_id: { $nin: [last_id]},// 不包含最后一条数据的_id
			category: { $in: categoryList },
			ctime: { 
                $lte: last_create_time // 小于等于最后一条数据的创建时间 
            },
		})
		.field({// 此方法在aggregate聚合表达式中不支持
			album_id: true,// 一刻相册_相册id
			fsid: true,// 一刻相册_文件id
			tid: true,// 一刻相册_相册tid
			uk: true,// 一刻相册_文件上传者用户id
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
		})// 指定返回的字段
		.orderBy('ctime', 'desc')// 按照创建时间倒序排列
		.limit(pageSize)
		.get();

	// 如果没有数据，则直接返回
	if (filesResult['affectedDocs'] === 0) {
		return {
			affectedDocs: 0,
			data: []
		};
	}

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	let processedData = filesResult.data.map(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = { ...item };
	
		// 将 thumburl 数组转换为字符串
		newItem.thumburl = item.thumburl[1];
	
		// 返回转换后的 item
		return newItem;
	});

	// 返回处理后的结果
	return {
		affectedDocs: filesResult['affectedDocs'],
		data: processedData
	};
}

/**
 * 按创建时间获取并对数据分组stick的方法
 * 返回对象包含影响的文档数量和处理后的数据列表。
 * 
 * @param {Collection} fileCollection 		文件集合
 * @param {Array} categoryList  			文件类别列表
 * @param {String} last_id  				最后一条数据的_id
 * @param {Number} last_create_time  		最后一条数据的创建时间（传0则为当前系统时间戳）
 * @param {Number} pageSize 				每页显示数量
 * @returns {Object} 一个包含affectedDocs和data的对象
 */
async function getFilesByCreateTimeGroupStick(
	fileCollection, 
	categoryList, 
	last_create_time, 
	last_id, 
	pageSize
) {
    // 实现按创建时间获取并对数据分组stick的逻辑
	let filesResult = await fileCollection
		.where({
			status: 1,
			_id: { $nin: [last_id]},// 不包含最后一条数据的_id
			category: { $in: categoryList },
			ctime: { 
				$lte: last_create_time // 小于等于最后一条数据的创建时间 
			},
		})
		.field({// 此方法在aggregate聚合表达式中不支持
			album_id: true,// 一刻相册_相册id
			fsid: true,// 一刻相册_文件id
			tid: true,// 一刻相册_相册tid
			uk: true,// 一刻相册_文件上传者用户id
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
		})// 指定返回的字段
		.orderBy('ctime', 'desc')// 按照创建时间倒序排列
		.limit(pageSize)
		.get();

	// 如果没有数据，则直接返回
	if (filesResult['affectedDocs'] === 0) {
		return {
			affectedDocs: 0,
			data: []
		};
	}

	// 对获取的数据进行处理并插入stickyHeader项
	let processedData = [];
    let lastCtimeDate = null; // 用来记录上一个数据项的日期部分

	// 如果 last_create_time 是 0，则使用当前系统时间，否则使用传入的时间
	if (last_create_time === 0) {
		lastCtimeDate = new Date(); // 使用当前系统时间
		lastCtimeDate.setHours(0, 0, 0, 0); // 将时间设置为当天的0点
	} else {
		// 使用传入的时间创建 Date 对象
		lastCtimeDate = new Date(last_create_time * 1000);
		lastCtimeDate.setHours(0, 0, 0, 0);
	}

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	filesResult.data.forEach(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = { ...item };

		// 将 thumburl 数组转换为字符串
		newItem.thumburl = item.thumburl[1];

		// 获取当前条目的日期部分，忽略时分秒
		let itemCtimeDate = new Date(item.ctime * 1000);
		itemCtimeDate.setHours(0, 0, 0, 0); // 将时间设置为当天的0点
		
		// 如果当前的日期与上一个条目的日期不同，则插入一个stickyHeader
        if (!lastCtimeDate || itemCtimeDate.getTime() !== lastCtimeDate.getTime()) {
            processedData.push({
				...item,// 其他字段也必须存在，为兼容APP，不然APP会报错
                _id: 'stickyHeader_' + item._id,// 用于前端识别stickyHeader
                ctime: itemCtimeDate.getTime() / 1000, // 使用当前条目的日期时间戳
				file_type: 'stickyHeader',
				category: 999,
				thumburl: item.thumburl[1]
            });
        }
		lastCtimeDate = itemCtimeDate; // 更新上一个数据项的日期部分为当前条目的日期
        processedData.push({
			...item,
			thumburl: item.thumburl[1]
		}); // 插入当前条目

	});

	// 返回处理后的结果
	return {
		affectedDocs: filesResult['affectedDocs'],
		//affectedDocs: processedData.length,
		data: processedData
	};
}





/***
 * 获取相册列表
 * @url GET /youa/album/getAlbumList
 * @param {String} album_type 相册类型
 * @param {Number} page_num 页码
 * @param {Number} page_size 每页数量
 * @returns {Array} 返回相册列表
 * 
 */

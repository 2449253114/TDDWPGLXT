const {
	dbCmd,
	fileCollection,
	albumCollectionName,
	personCollectionName,
	m3u8FileCollection
} = require('../../common/constants')

const {
	selectRandomAvatarUrl,
	getRandomTimestampInRange,
	querySystemAppConfig,
	adjustAspectRatio
} = require('../../common/fun')

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
	
	const last_create_time_GroupStick = 0 ? Math.floor(Date.now() / 1000) : last_create_time;// 兼容ctime（秒）,同时兼容createTimeGroupStick方法

	// 获取文件列表
	// 根据fetchMethod调用不同的数据获取方法
	let result;
	switch (fetchMethod) {
		case "randomSample":
			// 条件采用create_time（自己的字段）
			result = await getRandomSampleFiles(fileCollection, albumCollectionName, categoryList, last_create_time, last_id, pageSize);
			break;
		case "createTime":
			result = await getFilesByCreateTime(fileCollection, categoryList, last_create_time, last_id, pageSize);
			break;
		case "createTimeGroupStick":
			// 条件采用ctime（一刻相册的字段）
			result = await getFilesByCreateTimeGroupStick(fileCollection, categoryList, last_create_time_GroupStick, last_id, pageSize);
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
	
	
	
	// TODO 2024-0721 临时修改数据，在第一个数据中插入《临时公告图片》
	if (last_id == "0") {// 首次
		const currentTime = Date.now()
		
		// 定义接口启用时间的变量，表示2024年8月3日06:00:00的时间戳
		const activationTime = 1722636000000;
		
		// 检查当前时间是否早于接口启用时间
		if ( currentTime < activationTime ) {
			let temporaryData = JSON.parse(JSON.stringify(result.data[0])) // 深度拷贝一个
				temporaryData._id = "00000111112222233333"
				temporaryData.album_id = "0"
				temporaryData.fsid = 00000111112222233333
				// 这里的thumburl已经是处理后的String类型，不是数组类型
				temporaryData.thumburl = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/临时公告5.png"
				temporaryData.thumburl_persistent = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/临时公告5.png"
				temporaryData.category = 3 // 类型为3就不会显示 开始播放按钮 了
				temporaryData.file_type = "image"
				temporaryData.create_time = 1721519081129
				temporaryData.ctime = 1721517693
				if (fetchMethod == "randomSample") {
					temporaryData.album_info.title = "公告（8月3日08:00恢复使用）";
					temporaryData.album_info.person_info.name = "公告（8月3日08:00恢复使用）";
					temporaryData.extra_info.height = "586"
					temporaryData.extra_info.width = "390"
				}
			result.data = [temporaryData, ...result.data]
		}
		
	}
	
	// TODO 2024-0721 临时修改数据，找未失效m3u8记录
	if (fetchMethod == "randomSample") {
		
		// 获取当前时间的时间戳（毫秒）
		//const now = Date.now();
		// 过期时间是7小时，但是查询时，只需要满足6小时就行，还有1小时间的记录不需要，用来用户请求其他文件
		//const oneHourAgo = Date.now() - (1 * 60 * 60 * 1000); // 减去一小时（1小时 = 3600000毫秒）
		
		// 从m3u8FileCollection数据库表中找到所有未失效的记录（135*7=945条记录）
		// const m3u8FileResult = await m3u8FileCollection.where({
		// 	expire_time: dbCmd.gt(now) // 找出过期时间大于当前时间的记录 | 大于，字段大于指定值。
		// }).limit(1000).get()
		
		//const m3u8FileData = m3u8FileResult.data 
		
		// m3u8FileData.item.fsid是String类型，而result.data.item.fsid是Int类型，所以下面需要转同一类型去比较

		// // 遍历result.data中的每一项
		// result.data.forEach(item => {
		// 	// 这样，我先在这里把第一项数据直接过滤掉，就是不进入下面的match = m3u8FileData...条件
			
		//     // 查找3u8FileData中是否有与当前item的fsid相匹配的记录，将item.fsid转换为字符串再进行比较
		//     const match = m3u8FileData.find(fileItem => 
		//     	String(fileItem.fsid) === String(item.fsid)
		//     );
			
		//     if (match) {
		//         // 如果找到了匹配项，更新item的album_info.title和person_info.name
		//         item.album_info.title = "免等待，立即看";
		//         item.album_info.person_info.name = "免等待，立即看";
		//     } else {
		//         // 如果没有找到匹配项，设置默认值
		//         item.album_info.title = "观看人数较多";
		//         item.album_info.person_info.name = "观看人数较多";
		//     }
		// });
		
		
		// // 遍历result.data中的每一项
		// result.data = result.data.filter((item, index) => {
		//     // 查找 m3u8FileData 中是否有与当前 item 的 fsid 相匹配的记录
		//     const match = m3u8FileData.find(fileItem => 
		//         String(fileItem.fsid) === String(item.fsid)
		//     );
		
		//     if (match) {
		//         // 如果找到了匹配项，更新item的album_info.title和person_info.name
		//         item.album_info.title = "免等待，立即看";
		//         item.album_info.person_info.name = "免等待，立即看";
		//         // 返回 true 表示保留这个元素
		//         return true;
		//     } else {
		//         // 如果没有找到匹配项，返回 false 表示跳过（不包括）这个元素
		//         return false;
		//     }
		// });
		
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
 * TODO 2024-0507 
 * 改进为《 尝试获取足够数量的随机采样文件列表，直到满足pageSize要求或没有更多文件 》。
 * 
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
 * @param {Array} accumulatedData 			累积的数据列表
 * @param {Number} attempt                  当前的递归尝试次数
 * @returns {Object} 一个包含affectedDocs和data的对象
 */
async function getRandomSampleFiles(
	fileCollection, 
	albumCollectionName, 
	categoryList, 
	last_create_time, 
	last_id, 
	pageSize,
	accumulatedData = [],
	attempt = 1
) {
	
	// 查询文件总数
	const result = await fileCollection.count();
	const totalFiles = result.total;
	// 如果没有文件，则直接返回
	if (totalFiles === 0) {
		return {
			message: '没有文件',
			affectedDocs: 0,
			data: []
		};
	}
	
	// 限制递归次数，避免无限循环
	const maxAttempts = 3;
	if (attempt >= maxAttempts) {
		return {
			message: '尝试次数达到上限',
			affectedDocs: accumulatedData.length,
			data: accumulatedData
			//data: accumulatedData.slice(0, pageSize) // 截取前pageSize项，以防超出
		};
	}
	
  	let aggregateResult = await fileCollection
		.aggregate()
		.match({
			status: 1,
			_id: { $nin: [last_id]},// 不包含最后一条数据的_id |《 即排除已获取的最后一条数据的_id 》
			category: { $in: categoryList },
			// ctime: { 
			// 	// 用小于等于更好，因为ctime是一刻相册的字段，假设100个文件是一次性批量上传的，那么这100个文件的ctime时间是相同的，所以必须采用 <= 条件
			// 	$lte: last_create_time // 小于等于最后一条数据的创建时间 
			// },
			// TODO 新版本采用create_time来查询，create_time是自己分配的时间，不是一刻相册那边同步过来的
			create_time: {
				// 用小于等于更好，因为ctime是一刻相册的字段，假设100个文件是一次性批量上传的，那么这100个文件的ctime时间是相同的，所以必须采用 <= 条件
				$lte: last_create_time // 小于等于最后一条数据的创建时间 
			},
			// extra_info: {// 测试n中方法，字符串类型无法比较大小
			// 	duration_ms: dbCmd.gte("300000") // 作为字符串比较，因为是字符串类型 gte 大于等于 5分钟
			// }
			duration_ms_long: { $gte: 300000 } // gte 大于等于 5分钟
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

	// 如果没有数据，则重新分配随机时间戳
	if (aggregateResult['affectedDocs'] === 0) {
		// 更新last_create_time为当前累积数据的最后一项的创建时间，准备下一次递归调用
		const newLastCreateTime = getRandomTimestampInRange();
		const newLastId = 0;
			
		// 递归调用，获取更多数据
		return await getRandomSampleFiles(
			fileCollection,
			albumCollectionName,
			categoryList,
			newLastCreateTime,
			newLastId,
			pageSize,
			accumulatedData,
			attempt + 1 // 增加尝试次数
		);
	}
	
	// 累积获取的数据
	accumulatedData.push(...aggregateResult.data);
	
	// 查询的数量小于pageSize，则重新查询一下，确保app首页hot数据是无限加载的
	if (accumulatedData.length < pageSize ) {
		
		// 更新last_create_time为当前累积数据的最后一项的创建时间，准备下一次递归调用
		let newLastCreateTime;
		let newLastId;
		
		if (aggregateResult.data.length < pageSize / 2 ) {
			newLastCreateTime = getRandomTimestampInRange();
			newLastId = 0;
		} else {
			newLastCreateTime = accumulatedData[accumulatedData.length - 1].create_time;
			newLastId = accumulatedData[accumulatedData.length - 1]._id;
		}

		// 递归调用，获取更多数据
		return await getRandomSampleFiles(
			fileCollection,
			albumCollectionName,
			categoryList,
			newLastCreateTime,
			newLastId,
			pageSize,
			accumulatedData,
			attempt + 1 // 增加尝试次数
		);
		
	}
	
	const { app_file_cover_type } = await querySystemAppConfig()
	
	// 如果累积数据已满足pageSize要求，则处理数据并返回结果
	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	let processedData = accumulatedData.map(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = { ...item };
	  
		// 调用 adjustAspectRatio 函数调整宽高比例
		newItem = adjustAspectRatio(newItem, 1.35); // 这里示例以1:1.35作为最大宽高比例
		
		newItem.dlink = "" // 不需要将视频下载链接返回给app
		
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
	  
		  	// 转换 album_info 中的 thumburl
		  	//albumInfo.thumburl = albumInfo.cover_info.thumburl[1];
			
			// 假设custom_title字段存在，修改title字段值
			if (albumInfo.custom_title) {
			    //albumInfo.title = albumInfo.custom_title; // 返回APP相册名称
				// TODO 2024-0719-0046 临时改版，暂时不需要头像和名称。
				albumInfo.title = ""
			}
			
			// 假设cover_info和person_info字段存在
			if (albumInfo.cover_info && albumInfo.cover_info.thumburl) {
				// 相册封面
			    //albumInfo.thumburl = albumInfo.cover_info.thumburl[1]; // 返回封面信息中的第二张图片（阿里云OSS）
				albumInfo.thumburl = albumInfo.cover_info.thumburl[0]; // 返回封面信息中的第一张图片（一刻相册的封面URL，此时的URL是定时任务获取的，不必担心失效）
			}
		  
		  	// 构建新的person_info对象，包含avatarurl、description和link字段
		  	albumInfo.person_info = {
			  	//avatarurl: albumInfo.person_info && albumInfo.person_info.avatarurl ? albumInfo.person_info.avatarurl : albumInfo.thumburl,
			  	//avatarurl: selectRandomAvatarUrl(albumInfo.person_info, albumInfo.thumburl),
				//name: albumInfo.person_info && albumInfo.person_info.name ? albumInfo.person_info.name : albumInfo.title,
			  	
				// TODO 2024-0719-0046 临时改版，暂时不需要头像和名称。
				avatarurl: "",
				name: "",
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
		message: '没有更多文件或已达到pageSize',
		affectedDocs: processedData.length,
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
	
	const { app_file_cover_type } = await querySystemAppConfig()
	
	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	let processedData = filesResult.data.map(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = { ...item };
		
		// 将 thumburl 数组转换为字符串
		//newItem.thumburl = item.thumburl[1];

		// 相册文件封面(有时效性) 2024-0518-0103 调整为后台配置的文件封面URL类型？一刻 ：uniCLoud，默认为一刻相册的动态封面URL
		newItem.thumburl = item.thumburl[app_file_cover_type]
		// 相册文件封面(无时效，永久性) 2024-0525-1210 新增此字段用于app的历史记录页和收藏页展示封面，仅限APP为1.0.3版本起支持此字段
		newItem.thumburl_persistent = item.thumburl[1] // 1就是阿里云OSS图片地址
	
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
	
	const { app_file_cover_type } = await querySystemAppConfig()

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	filesResult.data.forEach(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = { ...item };

		// 将 thumburl 数组转换为字符串
		//newItem.thumburl = item.thumburl[1];
		// 相册文件封面(有时效性) 2024-0518-0103 调整为后台配置的文件封面URL类型？一刻 ：uniCLoud，默认为一刻相册的动态封面URL
		newItem.thumburl = item.thumburl[app_file_cover_type]
		// 相册文件封面(无时效，永久性) 2024-0525-1210 新增此字段用于app的历史记录页和收藏页展示封面，仅限APP为1.0.3版本起支持此字段
		newItem.thumburl_persistent = item.thumburl[1] // 1就是阿里云OSS图片地址


		// 获取当前条目的日期部分，忽略时分秒
		let itemCtimeDate = new Date(item.ctime * 1000);
		itemCtimeDate.setHours(0, 0, 0, 0); // 将时间设置为当天的0点
		
		// 如果当前的日期与上一个条目的日期不同，则插入一个stickyHeader
        if (!lastCtimeDate || itemCtimeDate.getTime() !== lastCtimeDate.getTime()) {
            processedData.push({
				...newItem,// 其他字段也必须存在，为兼容APP，不然APP会报错
                _id: 'stickyHeader_' + item._id,// 用于前端识别stickyHeader
                ctime: itemCtimeDate.getTime() / 1000, // 使用当前条目的日期时间戳
				file_type: 'stickyHeader',
				category: 999
            });
        }
		lastCtimeDate = itemCtimeDate; // 更新上一个数据项的日期部分为当前条目的日期
        processedData.push({
			...newItem
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

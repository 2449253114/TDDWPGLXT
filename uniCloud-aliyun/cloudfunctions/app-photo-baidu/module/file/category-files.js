const {
	dbCmd,
	fileCollection,
	albumCollectionName,
	personCollectionName,
	m3u8FileCollection,
	videoPuzzleCollection
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
		({
			pageSize,
			category,
			last_create_time,
			last_id,
			fetchMethod
		} = JSON.parse(body));
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

	const last_create_time_GroupStick = 0 ? Math.floor(Date.now() / 1000) :
		last_create_time; // 兼容ctime（秒）,同时兼容createTimeGroupStick方法

	// 获取文件列表
	// 根据fetchMethod调用不同的数据获取方法
	let result;
	switch (fetchMethod) {
		case "randomSample":
			// 条件采用create_time（自己的字段）
			//result = await getRandomSampleFiles(fileCollection, albumCollectionName, categoryList,last_create_time, last_id, pageSize);
			
			// TODO 2024-0815 改进 getRandomSampleFiles ，用于优化数据库慢查询日志通知	
			//result = await getNewRandomSampleFiles(pageSize)	
			// TODO 2024-1118 改进 getRandomSampleFiles ，新增查询视频截图作为Home_推荐页的List-Item的封面
			result = await getV2RandomSampleFiles(pageSize)	
			break;
		case "createTime":
			result = await getFilesByCreateTime(fileCollection, categoryList, last_create_time, last_id,
				pageSize);
			break;
		case "createTimeGroupStick":
			// 条件采用ctime（一刻相册的字段）
			result = await getFilesByCreateTimeGroupStick(fileCollection, categoryList,
				last_create_time_GroupStick, last_id, pageSize);
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
	if (last_id == "0") { // 首次
		const currentTime = Date.now()

		// 定义接口启用时间的变量，示例：表示2024年8月3日06:00:00的时间戳
		const activationTime = 1798732799000; // 1739579400000 = 2026-12-31 23:59:59
		
		// 如果当前时间currentTime 大于 接口启用时间activationTime，则不显示公告。
		
		// 检查当前时间是否早于接口启用时间
		if (currentTime < activationTime) {
			// 第一个临时数据：临时公告
			let temporaryData = JSON.parse(JSON.stringify(result.data[0])) // 深度拷贝一个
			temporaryData._id = "00000111112222233333"
			temporaryData.album_id = "0"
			temporaryData.fsid = 00000111112222233333
			// 这里的thumburl已经是处理后的String类型，不是数组类型
			// temporaryData.thumburl =
			// 	"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/临时公告5.png"
			// temporaryData.thumburl_persistent =
			// 	"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/临时公告5.png"
			temporaryData.thumburl =
				"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/manual_recharge_notice_white_2.jpg"
			temporaryData.thumburl_persistent =
				"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/manual_recharge_notice_white_2.jpg"
			temporaryData.category = 3 // 类型为3就不会显示 开始播放按钮 了
			temporaryData.file_type = "image"
			temporaryData.create_time = currentTime
			temporaryData.ctime = Math.floor(currentTime / 1000) 
			if (fetchMethod == "randomSample") {
				temporaryData.album_info.title = "临时公告";
				temporaryData.album_info.person_info.name = "临时公告";
				temporaryData.extra_info.height = "358";
				temporaryData.extra_info.width = "390";
				temporaryData.album_info.person_info.avatarurl = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/810a61c3bcb5f7452b3763d8d1bb6112-180.jpg"
			}
			
			// 第二个临时数据：新版App预告
			let temporaryData2 = JSON.parse(JSON.stringify(result.data[0])) // 深度拷贝一个
			temporaryData2._id = "00000555552222233333"
			temporaryData2.album_id = "0"
			temporaryData2.fsid = 00000555552222233333
			// 这里的thumburl已经是处理后的String类型，不是数组类型
			// temporaryData.thumburl =
			// 	"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/临时公告5.png"
			// temporaryData.thumburl_persistent =
			// 	"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/临时公告5.png"
			temporaryData2.thumburl =
				"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/新版预告_1.jpg"
			temporaryData2.thumburl_persistent =
				"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/新版预告_1.jpg"
			temporaryData2.category = 3 // 类型为3就不会显示 开始播放按钮 了
			temporaryData2.file_type = "image"
			temporaryData2.create_time = currentTime
			temporaryData2.ctime = Math.floor(currentTime / 1000) 
			if (fetchMethod == "randomSample") {
				temporaryData2.album_info.title = "新版App预告（制作中，敬请期待）";
				temporaryData2.album_info.person_info.name = "新版App预告（制作中，敬请期待）";
				temporaryData2.extra_info.height = "560";
				temporaryData2.extra_info.width = "378";
				temporaryData2.album_info.person_info.avatarurl = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/810a61c3bcb5f7452b3763d8d1bb6112-180.jpg"
			}
			
			//result.data = [temporaryData, temporaryData2, ...result.data]
			// 2026-0122-1615 临时去掉 `temporaryData2（新版2.0设计，非3.0设计）`
			result.data = [temporaryData, ...result.data]
		}
		
	}

	// TODO 2024-0721 临时修改数据，找未失效m3u8记录
	if (fetchMethod == "randomSample") {
		/* TODO 2024-0812 已取消“无需等待”的提示
		// 从result.data中提取所有的fsid
		const allFsids = result.data.map(item => item.fsid);
		const pageSize = allFsids.length
		
		const now = Date.now() + (0.35 * 60 * 60 * 1000); // 现在的时间+21分钟
		// 从m3u8FileCollection数据库表中找到所有fsid的记录
		const {
			data: m3u8FileResult
		} = await m3u8FileCollection.where({
				fsid: dbCmd.in(allFsids),
				expire_time: dbCmd.gt(now)
			})
			.limit(pageSize)
			.field({
				fsid: true,
				transcoding_status: true
			})
			.get()

		// 遍历result.data每一项，对比m3u8FileResult，找到相同item.fsid
		// 然后m3u8FileResult[i]item.transcoding_status == "available"
		// 则为这些result.data[i]item.album_info.title = "免等待，立即看";
		// 遍历 result.data 数组
		result.data.forEach((dataItem, dataIndex) => {
			// 从 m3u8FileResult 数组中找到与 dataItem.fsid 相匹配的项
			const fileItem = m3u8FileResult.find(item => item.fsid === dataItem.fsid);

			// 如果找到了匹配的项，并且它的 transcoding_status 属性是 "available"
			if (fileItem && fileItem.transcoding_status === "available") {
				// 更新 result.data 数组中相应项的 album_info.title 属性
				result.data[dataIndex].album_info.title = "免等待，立即看";
				result.data[dataIndex].album_info.person_info.name = "免等待，立即看";
			}
		});
		 */



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
		total: result.data.length, // 总记录数
		list: result.data // 数据列表
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
			_id: {
				$nin: [last_id]
			}, // 不包含最后一条数据的_id |《 即排除已获取的最后一条数据的_id 》
			category: {
				$in: categoryList
			},
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
			duration_ms_long: {
				$gte: 300000
			} // gte 大于等于 5分钟
		})
		.lookup({
			from: albumCollectionName, // 关联的表
			localField: 'album_id', // 当前表的字段
			foreignField: 'album_id', // 关联表的字段
			as: 'album_info', // 输出的字段
		})
		.sample({
			size: pageSize
		}) // 随机取样
		.sort({
			create_time: -1
		}) // <排序规则> :1 代表升序排列（从小到大）；-1 代表降序排列（从大到小）
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
	if (accumulatedData.length < pageSize) {

		// 更新last_create_time为当前累积数据的最后一项的创建时间，准备下一次递归调用
		let newLastCreateTime;
		let newLastId;

		if (aggregateResult.data.length < pageSize / 2) {
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

	const {
		app_file_cover_type
	} = await querySystemAppConfig()

	// 如果累积数据已满足pageSize要求，则处理数据并返回结果
	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	let processedData = accumulatedData.map(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = {
			...item
		};

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
			let albumInfo = {
				...item.album_info[0]
			};

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
				albumInfo.thumburl = albumInfo.cover_info.thumburl[
					0]; // 返回封面信息中的第一张图片（一刻相册的封面URL，此时的URL是定时任务获取的，不必担心失效）
			}

			// 构建新的person_info对象，包含avatarurl、description和link字段
			albumInfo.person_info = {
				//avatarurl: albumInfo.person_info && albumInfo.person_info.avatarurl ? albumInfo.person_info.avatarurl : albumInfo.thumburl,
				//avatarurl: selectRandomAvatarUrl(albumInfo.person_info, albumInfo.thumburl),
				//name: albumInfo.person_info && albumInfo.person_info.name ? albumInfo.person_info.name : albumInfo.title,

				// TODO 2024-0719-0046 临时改版，暂时不需要头像和名称。
				avatarurl: "",
				name: "",
				description: albumInfo.person_info && albumInfo.person_info.description ? albumInfo
					.person_info.description : "",
				link: albumInfo.person_info && albumInfo.person_info.link ? albumInfo.person_info.link
					.split('\n') : [], // Array<String>  // 如果link是以换行符分割的字符串，则转换为数组
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


/* ### TODO 2024-0815 改进 getRandomSampleFiles ，用于优化数据库慢查询日志通知 */
async function getNewRandomSampleFiles (
	pageSize
) {
	// 当前时间
	const currentTime = Date.now()
	// 当前时间 + 5分钟的时间戳
	const fiveMinutesLater = currentTime + 5 * 60 * 1000;
	
	const {
		data: m3u8FileResult
	} = await m3u8FileCollection.aggregate()
		.match({
			expire_time: dbCmd.gt(fiveMinutesLater), // 过期时间 > 当前时间
			transcoding_status: 'available' // 转码完成
		})
		.sample({
			size: pageSize
		}) // 随机取样
		.sort({
			create_time: -1 // 降序排列
		})
		.limit(pageSize)
		.end()
	
	// 提取所有 fsid 并存储到一个数组中
	const allFsids = m3u8FileResult.map(item => item.fsid);
	
	// 使用提取出的 fsid 数组来查询 fileCollection
	const {
		data: fileResult
	} = await fileCollection
		.where({
			fsid: dbCmd.in(allFsids)
		})
		.get()
	
	
	const {
		app_file_cover_type
	} = await querySystemAppConfig()
	
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
	console.log("Unique fileResult", uniqueFileResult);
	
	// 假设 fileResult 是你提供的原始数组格式
	const processedData = uniqueFileResult.map(item => {
		// 复制原始对象，避免直接修改原始数据
		let newItem = {
			...item
		};
	
		// 调用 adjustAspectRatio 函数调整宽高比例
		newItem = adjustAspectRatio(newItem, 1.35); // 这里示例以1:1.35作为最大宽高比例
	
		newItem.dlink = "" // 不需要将视频下载链接返回给app
		
		// 如果duration_format为null或者空字段或“”空字符串，则加上默认值 = "00:00"
		newItem.duration_format = (newItem.duration_format === null || newItem.duration_format === "" || typeof newItem.duration_format === "undefined") ? "00:00" : newItem.duration_format;
	
		// 相册文件封面(有时效性) 2024-0518-0103 调整为后台配置的文件封面URL类型？一刻 ：uniCLoud，默认为一刻相册的动态封面URL
		newItem.thumburl = item.thumburl[app_file_cover_type]
		// 相册文件封面(无时效，永久性) 2024-0525-1210 新增此字段用于app的历史记录页和收藏页展示封面，仅限APP为1.0.3版本起支持此字段
		newItem.thumburl_persistent = item.thumburl[1] // 1就是阿里云OSS图片地址
	
		// 新增 album_info 对象
		newItem.album_info = {
			_id: item._id, // 假设你想要 _id 与 album_id 相同
			album_id: item.album_id,
			pic_count: 0, // 假设初始值为 0
			video_count: 0, // 假设初始值为 0
			total_count: 0, // 假设初始值为 0
			price: 0, // 假设初始价格为 0
			tag: [], // 假设初始标签为空数组
			create_time: 0, // 假设初始创建时间为 0
			notice: "", // 假设初始通知为空字符串
			tid: "0", // 假设初始 tid 为 "0"
			title: "", // 假设初始标题为空字符串
			person_info: {
				avatarurl: "", // 假设初始头像 URL 为空字符串
				name: "", // 假设初始名称为空字符串
				description: "", // 假设初始描述为空字符串
				link: [] // 假设初始链接为空数组
			},
			custom_title: "", // 假设初始自定义标题为空字符串
			top_days: null, // 假设初始 top_days 为 null
			thumburl: item.thumburl[0] // 使用处理后的 thumburl
		};
	
		// 返回修改后的对象
		return newItem;
	});
	
	// 返回处理后的结果
	return {
		message: '没有更多文件或已达到pageSize',
		affectedDocs: processedData.length,
		data: processedData
	};
	
}


/* ### TODO 2024-1118 改进 getRandomSampleFiles ，新增查询视频截图作为Home_推荐页的List-Item的封面 */
async function getV2RandomSampleFiles (
	pageSize
) {
	// 当前时间
	const currentTime = Date.now()
	// 当前时间 + 5分钟的时间戳
	const fiveMinutesLater = currentTime + 5 * 60 * 1000;
	
	const {
		data: m3u8FileResult
	} = await m3u8FileCollection.aggregate()
		.match({
			expire_time: dbCmd.gt(fiveMinutesLater), // 过期时间 > 当前时间
			transcoding_status: 'available' // 转码完成
		})
		.sample({
			size: pageSize
		}) // 随机取样
		.sort({
			create_time: -1 // 降序排列
		})
		.limit(pageSize)
		.end()
	
	// 提取所有 fsid 并去重
	const allFsids = [...new Set(m3u8FileResult.map(item => item.fsid))];
	
	// 使用去重后的 fsid 数组来查询 fileCollection
	const {
		data: fileResult
	} = await fileCollection
		.where({
			fsid: dbCmd.in(allFsids)
		})
		.get()
		
	// 查询视频截图数据
	const {
		data: videoPuzzleResult
	} = await videoPuzzleCollection
		.where({
			video_fsid: dbCmd.in(allFsids)
		})
		.get()
		
	// 创建视频截图映射对象，方便后续查找
	const puzzleUrlMap = videoPuzzleResult.reduce((acc, item) => {
		acc[item.video_fsid] = item.puzzle_url;
		return acc;
	}, {});
	
	// const {
	// 	app_file_cover_type
	// } = await querySystemAppConfig()
	
	const app_file_cover_type = 0 // 减少查库请求
	
	// 假设 fileResult 是你提供的原始数组格式
	const processedData = fileResult.map(item => {
		// 复制原始对象，避免直接修改原始数据
		let newItem = {
			...item
		};
	
		// 调用 adjustAspectRatio 函数调整宽高比例
		newItem = adjustAspectRatio(newItem, 1.35); // 这里示例以1:1.35作为最大宽高比例
	
		newItem.dlink = "" // 不需要将视频下载链接返回给app
		
		// 如果duration_format为null或者空字段或“”空字符串，则加上默认值 = "00:00"
		newItem.duration_format = (newItem.duration_format === null || newItem.duration_format === "" || typeof newItem.duration_format === "undefined") ? "00:00" : newItem.duration_format;
	
		// 相册文件封面(有时效性) 2024-0518-0103 调整为后台配置的文件封面URL类型？一刻 ：uniCLoud，默认为一刻相册的动态封面URL
		//newItem.thumburl = item.thumburl[app_file_cover_type]
		
		// 使用视频截图URL（如果存在），否则使用默认缩略图
		newItem.thumburl = puzzleUrlMap[item.fsid] || item.thumburl[app_file_cover_type]
		// 相册文件封面(无时效，永久性) 2024-0525-1210 新增此字段用于app的历史记录页和收藏页展示封面，仅限APP为1.0.3版本起支持此字段
		newItem.thumburl_persistent = item.thumburl[1] // 1就是阿里云OSS图片地址
	
		// 新增 album_info 对象
		newItem.album_info = {
			_id: item._id, // 假设你想要 _id 与 album_id 相同
			album_id: item.album_id,
			pic_count: 0, // 假设初始值为 0
			video_count: 0, // 假设初始值为 0
			total_count: 0, // 假设初始值为 0
			price: 0, // 假设初始价格为 0
			tag: [], // 假设初始标签为空数组
			create_time: 0, // 假设初始创建时间为 0
			notice: "", // 假设初始通知为空字符串
			tid: "0", // 假设初始 tid 为 "0"
			title: "", // 假设初始标题为空字符串
			person_info: {
				avatarurl: "", // 假设初始头像 URL 为空字符串
				name: "", // 假设初始名称为空字符串
				description: "", // 假设初始描述为空字符串
				link: [] // 假设初始链接为空数组
			},
			custom_title: "", // 假设初始自定义标题为空字符串
			top_days: null, // 假设初始 top_days 为 null
			// 使用视频截图URL（如果存在），否则使用默认缩略图
			thumburl: puzzleUrlMap[item.fsid] || item.thumburl[0]
		};
	
		// 返回修改后的对象
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
			_id: {
				$nin: [last_id]
			}, // 不包含最后一条数据的_id
			category: {
				$in: categoryList
			},
			ctime: {
				$lte: last_create_time // 小于等于最后一条数据的创建时间 
			},
		})
		.field({ // 此方法在aggregate聚合表达式中不支持
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
		.orderBy('ctime', 'desc') // 按照创建时间倒序排列
		.limit(pageSize)
		.get();

	// 如果没有数据，则直接返回
	if (filesResult['affectedDocs'] === 0) {
		return {
			affectedDocs: 0,
			data: []
		};
	}

	const {
		app_file_cover_type
	} = await querySystemAppConfig()

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	let processedData = filesResult.data.map(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = {
			...item
		};

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
			_id: {
				$nin: [last_id]
			}, // 不包含最后一条数据的_id
			category: {
				$in: categoryList
			},
			ctime: {
				$lte: last_create_time // 小于等于最后一条数据的创建时间 
			},
		})
		.field({ // 此方法在aggregate聚合表达式中不支持
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
		.orderBy('ctime', 'desc') // 按照创建时间倒序排列
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

	const {
		app_file_cover_type
	} = await querySystemAppConfig()

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	filesResult.data.forEach(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = {
			...item
		};

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
				...newItem, // 其他字段也必须存在，为兼容APP，不然APP会报错
				_id: 'stickyHeader_' + item._id, // 用于前端识别stickyHeader
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

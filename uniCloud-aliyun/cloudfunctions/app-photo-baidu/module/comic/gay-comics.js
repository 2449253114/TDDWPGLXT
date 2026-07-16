const {
    comicCollection
} = require('../../common/constants')

const {
	comicData
} = require('./dataJson.js')

const {
    STATE_CODE,
    createResponse
} = require('../../common/response')

/**
 * 获取漫画列表（不指定某个漫画，直接查询）
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getComicList
 * @param {Object}  params
 * @param {Number}  params.pageSize       每页显示数量
 * @param {Number}  params.last_create_time  	最后一条数据的创建时间（传0则修改为当前时间戳）
 * @param {String}  params.last_id  			最后一条数据的_id（传0则不进入条件查询）
 * @param {String}  params.fetchMethod			获取数据的方式："randomSample"=随机采样；"createTime"=按创建时间排序; "createTimeGroupStick"=按创建时间排序，分组置顶
 * @returns
 */
module.exports = async function () {
    // 获取url化时的http信息
    const httpInfo = this.getHttpInfo()
    let body = httpInfo.body // 获取客户端传递的数据，如JSON
    if (httpInfo.isBase64Encoded) { // 是否base64格式
        body = Buffer.from(body, 'base64').toString()
    }

    let pageSize, last_create_time, last_id, fetchMethod;
    try {
        ({ pageSize, category, last_create_time, last_id, fetchMethod } = JSON.parse(body));
    } catch (error) {
        return createResponse(STATE_CODE.FAIL, "无效的请求数据");
    }
	
	// 对最后一条记录的创建时间进行处理，如果last_create_time = 0，则默认为当前时间戳
	last_create_time = last_create_time == 0 ? Date.now() : last_create_time; // 这里是毫秒
	
	// 根据fetchMethod调用不同的数据获取方法
	let result;
	
	
	// 2024-0523起 - 漫画系统整改中...
	return comicData; // 临时返回内置数据
	
	switch (fetchMethod) {
		case "randomSample":
			result = await getRandomSampleComics(comicCollection, last_create_time, last_id, pageSize);
			break;
		case "createTime":
			result = await getComicsByCreateTime(comicCollection, last_create_time, last_id, pageSize);
			break;
		case "createTimeGroupStick":
			result = await getComicsByCreateTimeGroupStick(comicCollection, last_create_time, last_id, pageSize);
			break;
		default:
			return createResponse(STATE_CODE.FAIL, "无效的获取方法");
	}

    // // 获取漫画列表
    // let result = await comicCollection
    //     .where({
    //         _id: {
    //             $nin: ids // 不包含ids数组中的漫画
    //         }
    //         //status: 1 // 状态为1的漫画
    //     })
    //     .field({
    //         title: true,// 漫画标题
    //         excerpt: true,// 漫画简介
    //         creator_user: true,// 漫画作者
    //         your_story: true,// 你的故事
    //         thumburl: true,// 漫画封面
    //         create_time: true,// 创建时间
    //         //tag: true,// 漫画标签, 暂时没有此字段
    //     })// 指定返回的字段
    //     .orderBy('create_time', 'desc')// 按照创建时间倒序
    //     .limit(pageSize)
    //     .get()
    
    // 构造空的响应体
    let emptyResponse = {
        total: 0,
        list: []
    }

    // 没有更多数据了
    if (result['affectedDocs'] === 0) {
        return createResponse(STATE_CODE.FAIL, '没有更多数据了', emptyResponse)
    }
        
	// 处理数据, 为了兼容前端，将thumburl字段转换为字符串
	result.data.forEach(item => {
		item.thumburl = item.thumburl[1]
	})
    // 处理数据, 为了兼容前端，将your_story数组中的thumburl字段转换为字符串
    result.data.forEach(item => {
        item.your_story.forEach(yourStoryItem => {
            yourStoryItem.thumburl = yourStoryItem.thumburl[1]
        })
    })


    // 构造响应体
	let response = {
		total: result['affectedDocs'],// 总记录数
		list: result.data// 数据列表
	}

    return createResponse(STATE_CODE.SUCCESS, '获取漫画列表成功', response)
}


/**
 * 获取随机采样文件列表和关联相册信息，并对结果进行处理。
 * 返回对象包含影响的文档数量和处理后的数据列表。
 * 
 * 注意：此方法在数据量大的集合高频调用时可能会导致响应缓慢
 * 
 * @param {Collection} comicCollection 		漫画集合
 * @param {String} last_id  				最后一条数据的_id
 * @param {Number} last_create_time  		最后一条数据的创建时间
 * @param {Number} pageSize 				每页显示数量
 * @returns {Object} 一个包含affectedDocs和data的对象
 */
async function getRandomSampleComics(
	comicCollection, 
	last_create_time, 
	last_id, 
	pageSize
) {
  	let aggregateResult = await comicCollection
		.aggregate()
		.match({
			_id: { $nin: [last_id]},// 不包含最后一条数据的_id
			create_time: { 
				// 用小于等于更好，因为ctime是一刻相册的字段，假设100个文件是一次性批量上传的，那么这100个文件的ctime时间是相同的，所以必须采用 <= 条件
				$lte: last_create_time // 小于等于最后一条数据的创建时间 
			}
		})
		.sample({ size: pageSize })// 随机取样
		.sort({ create_time: -1 }) // <排序规则> :1 代表升序排列（从小到大）；-1 代表降序排列（从大到小）
		.limit(pageSize)
		.end();

	  // 如果没有数据，则直接返回
	if (aggregateResult['affectedDocs'] === 0) {
		return {
			affectedDocs: 0,
			data: []
		};
	}

	
	let processedData = aggregateResult.data

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
 * @param {Collection} comicCollection 		漫画集合
 * @param {String} last_id  				最后一条数据的_id
 * @param {Number} last_create_time  		最后一条数据的创建时间
 * @param {Number} pageSize 				每页显示数量
 * @returns {Object} 一个包含affectedDocs和data的对象
 */
async function getComicsByCreateTime(
	comicCollection, 
	last_create_time, 
	last_id, 
	pageSize
) {
    // 实现按创建时间获取数据的逻辑
	let comicResult = await comicCollection
		.where({
			_id: { $nin: [last_id]},// 不包含最后一条数据的_id
			create_time: { 
                $lte: last_create_time // 小于等于最后一条数据的创建时间 
            }
		})
		.orderBy('create_time', 'desc')// 按照创建时间倒序排列
		.limit(pageSize)
		.get();

	// 如果没有数据，则直接返回
	if (comicResult['affectedDocs'] === 0) {
		return {
			affectedDocs: 0,
			data: []
		};
	}

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	let processedData = comicResult.data

	// 返回处理后的结果
	return {
		affectedDocs: comicResult['affectedDocs'],
		data: processedData
	};
}

/**
 * 按创建时间获取并对数据分组stick的方法
 * 返回对象包含影响的文档数量和处理后的数据列表。
 * 
 * @param {Collection} fileCollection 		文件集合
 * @param {String} last_id  				最后一条数据的_id
 * @param {Number} last_create_time  		最后一条数据的创建时间（传0则为当前系统时间戳）
 * @param {Number} pageSize 				每页显示数量
 * @returns {Object} 一个包含affectedDocs和data的对象
 */
async function getComicsByCreateTimeGroupStick(
	comicCollection, 
	last_create_time, 
	last_id, 
	pageSize
) {
    // 实现按创建时间获取并对数据分组stick的逻辑
	let comicResult = await comicCollection
		.where({
			_id: { $nin: [last_id]},// 不包含最后一条数据的_id
			create_time: { 
				$lte: last_create_time // 小于等于最后一条数据的创建时间 
			},
		})
		.orderBy('create_time', 'desc')// 按照创建时间倒序排列
		.limit(pageSize)
		.get();

	// 如果没有数据，则直接返回
	if (comicResult['affectedDocs'] === 0) {
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
		lastCtimeDate = new Date(last_create_time);
		lastCtimeDate.setHours(0, 0, 0, 0);
	}

	// 处理数据，由于不支持field方法，需要手动过滤字段，为了兼容前端，将thumburl字段转换为字符串
	comicResult.data.forEach(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = { ...item };

		// 获取当前条目的日期部分，忽略时分秒
		let itemCtimeDate = new Date(item.create_time);
		itemCtimeDate.setHours(0, 0, 0, 0); // 将时间设置为当天的0点
		
		// 如果当前的日期与上一个条目的日期不同，则插入一个stickyHeader
        if (!lastCtimeDate || itemCtimeDate.getTime() !== lastCtimeDate.getTime()) {
            processedData.push({
				...item,// 其他字段也必须存在，为兼容APP，不然APP会报错
                _id: 'stickyHeader_' + item._id,// 用于前端识别stickyHeader
                create_time: itemCtimeDate.getTime(), // 使用当前条目的日期时间戳
				title: 'stickyHeader',
            });
        }
		lastCtimeDate = itemCtimeDate; // 更新上一个数据项的日期部分为当前条目的日期
        processedData.push({
			...item
		}); // 插入当前条目

	});

	// 返回处理后的结果
	return {
		affectedDocs: comicResult['affectedDocs'],
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

const {
    albumCollection
} = require('../../common/constants')

const {
	processCoverInformation,
	processTopAlbums
} = require('../../common/fun.js')

const {
    STATE_CODE,
    createResponse
} = require('../../common/response')


/**
 * 获取相册列表（不指定某个相册，直接查询）
 * @uri /api/yike/albums
 * @param {Object}  params
 * @param {Number}  params.pageSize       每页显示数量
 * @param {Array}   params.ids       	  相册ID数组，用于跳过已经查询过的相册，ids数组中的相册不会被查询出来
 * @returns
 */
module.exports = async function () {
    // 获取url化时的http信息
    const httpInfo = this.getHttpInfo()
    let body = httpInfo.body // 获取客户端传递的数据，如JSON
    if (httpInfo.isBase64Encoded) { // 是否base64格式
        body = Buffer.from(body, 'base64').toString()
    }

    let pageSize = 20, ids = [];
    try {
        ({ pageSize, ids } = JSON.parse(body));
    } catch (error) {
        return createResponse(STATE_CODE.FAIL, "无效的请求数据");
    }

    // 获取相册列表
    let result = await albumCollection
        .where({
            _id: {
                $nin: ids // 不包含ids数组中的相册
            },
            status: 1 // 状态为1的相册
        })
        .field({
			album_type: true,
            album_id: true,// 一刻相册_相册id
            cover_info: true,// 封面信息
            create_time: true,// 创建时间
            notice: true,// 相册公告
            tid: true,// 相册ID
            title: true,// 相册标题
			custom_title: true,// APP相册名称
            tag: true,// 相册标签
			price: true,// 相册订阅价格
			pic_count: true,
			video_count: true,
			total_count: true,
			person_info: true,
			top_days: true,// 置顶天数，用于控制相册在列表中的置顶时长，置顶有效期计算方式：create_time + 置顶天数时长 < 现在的时间，则在数据返回前，把当前item项放到数组前面
        })// 指定返回的字段
        //.orderBy('create_time', 'desc')// 按照创建时间倒序
		.orderBy('total_count', 'desc')// 按照总数量倒序
        .limit(pageSize)
        .get()
    
    // 构造空的响应体
    let emptyResponse = {
        total: 0,
        list: []
    }    

    // 没有更多数据了
	if (result['affectedDocs'] === 0) {
		return createResponse(STATE_CODE.FAIL, '没有更多数据了', emptyResponse)
	}
	
    // 处理封面信息，返回封面信息中的第一张图片。（增加thumburl = cover_info.thumburl[1],然后删除cover_info字段）
    result.data.forEach(item => {
        processCoverInformation(item); // 处理每个数据项的封面信息
		// 对特殊项目《album_type=1：网剧相册》处理pic_count=0
		if (item.album_type == 1) {
			item.pic_count = 0
		}
    })
	
	// TODO 2024-0519 新增需求：
	// 在返回数据前置顶（放到数组最前面并按数量倒序）并且需要把名字后面加上 \n【新片30天置顶】"statusCode": 400,
	// 这里重构result.data中数据时的需求在上面的field({top_days注释说明中})
	
	// 获取当前时间
	const now = new Date();
	
	// 然后处理置顶逻辑，并获取排序后的相册数组
	let sortedAlbums = processTopAlbums(result.data, now);
	
	

    // 构造响应体
    let response = {
        total: result['affectedDocs'],// 总记录数
		//list: result.data// 数据列表
		list: sortedAlbums// 数据列表
    }

    // 返回响应结果
    return createResponse(STATE_CODE.SUCCESS, '获取相册列表成功', response)

}
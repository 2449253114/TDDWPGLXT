const {
    fileCollection
} = require('../../common/constants')

const {
	querySystemAppConfig
} = require('../../common/fun')

const {
    STATE_CODE,
    createResponse
} = require('../../common/response')

/**
 * 获取指定相册里的文件列表
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getAlbumFileList
 * @param {Object}  params
 * @param {String}  params.album_id       一刻相册_相册ID，此字段仅在获取指定相册文件列表时有效
 * @param {Number}  params.pageSize       每页显示数量
 * @param {Number}  params.category       文件类别: 1=视频；3=图片；0=全部（$in: [1, 3]）
 * @param {Number}  params.last_create_time  最后一条数据的创建时间（传0则修改为当前时间戳）
 * @returns
 */
module.exports = async function () {
    // 获取url化时的http信息
    const httpInfo = this.getHttpInfo()
    let body = httpInfo.body // 获取客户端传递的数据，如JSON
    if (httpInfo.isBase64Encoded) { // 是否base64格式
        body = Buffer.from(body, 'base64').toString()
    }

    let album_id, pageSize, category, last_create_time;
    try {
        ({ album_id, pageSize, category, last_create_time } = JSON.parse(body));
    } catch (error) {
        return createResponse(STATE_CODE.FAIL, "无效的请求数据");
    }
	
    // 对category进行处理
    let categoryList = category === 0 ? [1, 3] : [category];
    // 对最后一条记录的创建时间进行处理，如果last_create_time = 0，则默认为当前时间戳
    last_create_time = last_create_time == 0 ? Date.now() : last_create_time;
	
	
	const { app_file_cover_type } = await querySystemAppConfig()

    // 获取相册文件列表
    let result = await fileCollection
        .where({
            album_id,
            category: {
                $in: categoryList // 包含的文件类型
            },
            ctime: { 
                $lt: last_create_time // 小于最后一条数据的创建时间 
            },
            status: 1 // 状态为1的相册文件
        })
        .field({
			album_type: true,
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
			//dlink: true,// 后期改为在接口中请求文件直连，不在app中
        })// 指定返回的字段
        .orderBy('ctime', 'desc')// 按照创建时间倒序
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

	// 处理数据, 为了兼容前端，将thumburl字段转换为字符串
	let processedData = result.data
	// 首先，过滤掉不需要的项目《album_type=1：网剧相册；category=3：图片》
	.filter(item => !(item.album_type === 1 && item.category === 3))
	// 然后，针对剩余的每个项目进行处理
	.map(item => {
		// 克隆 item 以避免修改原始对象
		let newItem = { ...item };
		//item.thumburl = item.thumburl[1]
		
		// 相册文件封面(无时效，永久性) 2024-0525-1210 新增此字段用于app的历史记录页和收藏页展示封面，仅限APP为1.0.3版本起支持此字段
		newItem.thumburl_persistent = item.thumburl[1] // 1就是阿里云OSS图片地址
		
		// 相册文件封面(有时效性) 2024-0518-0103 调整为后台配置的文件封面URL类型？一刻 ：uniCLoud，默认为一刻相册的动态封面URL
		newItem.thumburl = item.thumburl[app_file_cover_type];
		
		// 返回转换后的 item
		return newItem;
	})

	// 构造响应体
	let response = {
		//total: result['affectedDocs'],// 总记录数
		// 不建议用result['affectedDocs']，因为大量数据下，它算的不准确
		total: processedData.length,
		list: processedData// 数据列表
	}

	// 返回结果
	return createResponse(STATE_CODE.SUCCESS, '获取成功', response)
}

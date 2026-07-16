const { 
    albumCollection
} = require('../../common/constants')

const {
	processCoverInformation
} = require('../../common/fun.js')

const {
    STATE_CODE,
    createResponse
} = require('../../common/response')


/**
 * 获取相册详情信息（指定相册）
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getAlbumDetail
 * @param {Object} params 
 * @param {String} params.album_id 相册ID
 */
module.exports = async function () {
    // 获取url化时的http信息
    const httpInfo = this.getHttpInfo()
    let body = httpInfo.body // 获取客户端传递的数据，如JSON
    if (httpInfo.isBase64Encoded) { // 是否base64格式
        body = Buffer.from(body, 'base64').toString()
    }

    let album_id;
    try {
        ({ album_id } = JSON.parse(body));
    } catch (error) {
        return createResponse(STATE_CODE.FAIL, "无效的请求数据");
    }

    let albumResult = await albumCollection.where({
			album_id: album_id
		})
		.field({
			album_type: true,
			album_id: true,// 一刻相册_相册id
			cover_info: true,// 封面信息
			create_time: true,// 创建时间
			notice: true,// 相册公告
			tid: true,// 相册ID
			title: true,// 相册标题
			custom_title: true, // 自定义字段
			tag: true,// 相册标签
			price: true,
			pic_count: true,
			video_count: true,
			total_count: true,
            person_info: true
		})// 指定返回的字段
		.get();


    if (albumResult.data.length === 0) {
        return createResponse(STATE_CODE.ERROR, "无效的相册ID");
    }
	
	// 处理封面信息，返回封面信息中的第一张图片。（增加thumburl = cover_info.thumburl[1],然后删除cover_info字段）
	albumResult.data.forEach(item => {
	    processCoverInformation(item); // 处理每个数据项的封面信息
		// 对特殊项目《album_type=1：网剧相册》处理pic_count=0
		if (item.album_type == 1) {
			item.pic_count = 0
		}
	})
	
    // 构造响应体
	let response = albumResult.data[0] // 相册详情

    return createResponse(STATE_CODE.SUCCESS, "获取相册详情成功", response);
}
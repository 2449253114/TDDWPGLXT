const { 
    personCollection
} = require('../../common/constants')

const {
	selectRandomAvatarUrl
} =require('../../common/fun')

const {
    STATE_CODE,
    createResponse
} = require('../../common/response')


/***
 * 获取人物列表（直接获取全部人物列表）
 * @url POST /getPersonList
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getPersonList
 */
module.exports = async function () {
	// 获取人物列表
	let personResult = await personCollection
		.where({
			status: { $in: [1, 2] } // 状态为1和2的文件，1已发布、2待上线
		})
		.orderBy('ctime', 'desc')// 按照创建时间倒序
		.limit(100)
		.get()
	
	// 构造空的响应体
	let emptyResponse = {
		total: 0,
		list: []
	}
	
	// 没有更多数据了
	if (personResult['affectedDocs'] === 0) {
		return createResponse(STATE_CODE.FAIL, '没有更多数据了', emptyResponse)
	}	
	
	console.log("personResult.data", personResult.data)
	
	// 处理数据, 为了兼容前端，将thumburl字段转换为字符串
	personResult.data.forEach(item => {
		//item.thumburl = item.covers[0].thumb
		
		if (item.status == 2) {// 待上线
			item.album_id = "0" // 待上线的人物，需要出来相册ID为0，这样APP中不会进入人物的相册，因为这个人物的相册文件还没采集完和同步过来
		}
		
		// 确保 item.covers 是一个数组且至少有一个元素
		if (Array.isArray(item.covers) && item.covers.length > 0) {
		    //item.thumburl = item.covers[0].thumb;
			
			// 使用selectRandomAvatarUrl函数随机选择一个封面的thumb属性
			item.thumburl = selectRandomAvatarUrl({avatarurl: item.covers}, 'defaultThumb.jpg');
			
		} else {
		    // 如果没有封面，可以设置一个默认的thumb值或者跳过设置
		    item.thumburl = 'defaultThumb.jpg'; // 或者其他您希望设置的默认值
		}
		
		// 删除不需要的字段
		delete item.covers
		delete item.ctime
		delete item.status
	})
	
	// 构造响应体
	let response = {
		total: personResult['affectedDocs'],// 总记录数
		list: personResult.data// 数据列表
	}
	
	// 返回结果
	return createResponse(STATE_CODE.SUCCESS, '获取成功', response)
}
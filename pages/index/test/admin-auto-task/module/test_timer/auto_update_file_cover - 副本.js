const {
	dbCmd,
	fileCollection,
	adminAutoTaskCollection
} = require('../../common/constants')

const {
	photoConfig
} = require('../../common/photo-config')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')


async function queryTaskDetails() {
	const { result: taskResult } = await adminAutoTaskCollection.get()
	const task_details = taskResult[0].task_details
	return task_details
}


async function loadFiles(
	cursor = ""
) {
	// 一刻相册的请求头
	const headers = photoConfig.headers
	// querys参数只能是Sting类型
	const clienttype = "70"; // 客户端类型 70为Web
	const bdstoken = "5b3bda475d3738a44580fff097ee8037"; // 
	// cursor变量已在函数参数中声明，无需再次声明
	//const cursor = cursor; // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
	const need_thumbnail = "1"; // 默认
	const need_filter_hidden = "0"; // 默认
	
	const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
		url: `https://photo.baidu.com/youai/file/v1/list?clienttype=${clienttype}&bdstoken=${bdstoken}&cursor=${cursor}&need_thumbnail=${need_thumbnail}&need_filter_hidden=${need_filter_hidden}`,
		method: "GET",
		header: headers
	})
	
	return res.data
}

async function updateCoverUrls(cursor = "") {
	
	let taskDetails = await queryTaskDetails()
	
	
	
    let res = await loadFiles(cursor);

    if (res.list && res.list.length > 0) {
        for (let item of res.list) {
			// 获取当前时间戳
			const now = Date.now();
			// 更新文件封面URL
            await fileCollection.where({
                fsid: item.fsid
            }).update({
                // 更新thumburl[0]
                ['thumburl.' + 0]: item.thumburl1,
				cover_update_time: now // 新增字段，记录更新时间
            });
        }
		
		return "全部更新完成"
		
  //       if (res.has_more === 1) {
  //           // 如果有更多数据，递归调用并传递cursor
  //           await updateCoverUrls(res.cursor);
  //       } else {
		// 	return "全部更新完成"
		// }
    } else {
        console.error('Failed to load files or no files found.');
		return "Failed to load files or no files found."
    }
}

// 遍历响应数据：首先，我们需要遍历从loadFiles函数获取的响应数据中的list数组，并对每一项进行数据库更新操作。
// 递归更新：我们将使用递归的方式来处理分页数据的更新，如果has_more为1，表示还有更多数据需要处理，我们将继续调用更新函数，并传递新的cursor值。


module.exports = async function () {
	
	let res = await updateCoverUrls()
	
	//let res = await loadFiles()
	// 您可能想要处理响应或返回它
	return res;
}
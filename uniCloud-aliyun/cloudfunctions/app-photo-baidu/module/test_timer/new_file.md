每1小时自动更新一刻相册文件封面的URL





你帮我看看代码，要怎么实现，需求在代码中
```javascript
const {
	dbCmd,
	fileCollection,
} = require('../../common/constants')

const {
	photoConfig
} = require('../../common/photo-config')

const {
	selectRandomAvatarUrl,
	getRandomTimestampInRange
} = require('../../common/fun.js')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

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
    let res = await loadFiles(cursor);

    if (res.list && res.list.length > 0) {
        for (let item of res.list) {
            await fileCollection.where({
                fsid: item.fsid
            }).update({
                // 更新thumburl[0]
                ['thumburl.' + 0]: item.thumburl1
            });
        }

        if (res.has_more === 1) {
            // 如果有更多数据，递归调用并传递cursor
            await updateCoverUrls(res.cursor);
        } else {
			return "全部更新完成"
		}
    } else {
        console.error('Failed to load files or no files found.');
		return "Failed to load files or no files found."
    }
}



// 遍历响应数据：首先，我们需要遍历从loadFiles函数获取的响应数据中的list数组，并对每一项进行数据库更新操作。
// 递归更新：我们将使用递归的方式来处理分页数据的更新，如果has_more为1，表示还有更多数据需要处理，我们将继续调用更新函数，并传递新的cursor值。

module.exports = async function () {
	
	// 1. 加载文件
	//let res = await loadFiles()
	// res的数据体为这样
	// {
	// 	"errno": 0,
	// 	"request_id": 8873009263094521856,
	// 	"list": [
	// 		{
	// 			"fsid": 138226472886646,
	// 			"thumburl": [
	// 				"https://pcsdata.baidu.com/thumbnail/c51930496pf3290e79fc34c53d0e1046?fid=1815907562-16051585-138226472886646&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-3rJNotvTtiMHWbDPIFwjVSdhKgI%3D&expires=2h&chkv=0&chkbd=0&chkpc=&dp-logid=8873009263094521633&dp-callid=0&time=1715616000&bus_no=26&size=c300_u300&quality=100&vuk=-&ft=video",
	// 				"https://pcsdata.baidu.com/thumbnail/c51930496pf3290e79fc34c53d0e1046?fid=1815907562-16051585-138226472886646&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-3rJNotvTtiMHWbDPIFwjVSdhKgI%3D&expires=2h&chkv=0&chkbd=0&chkpc=&dp-logid=8873009263094521633&dp-callid=0&time=1715616000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
	// 			],
	// 			"thumburl1": "https://pcsdata.baidu.com/thumbnail/c51930496pf3290e79fc34c53d0e1046?fid=1815907562-16051585-138226472886646&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-3rJNotvTtiMHWbDPIFwjVSdhKgI%3D&expires=2h&chkv=0&chkbd=0&chkpc=&dp-logid=8873009263094521633&dp-callid=0&time=1715616000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
	// 		}
	// 		...
	// 	],
	// 	"has_more": 1, // 有更多？ 1=有更多，可加载下页。 0=没有更多数据了
	// 	"cursor": "eyJzdGFydCI6MCwibGltaXQiOjEwMH0=" // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
	// }
	
	// 2. 需求是把每次请求页的数据拿过来为云存储相册文件数据库表中更新对应的文件封面URL
	// - 按照res.list中item依次更新对应的文件封面URL
	// const updateResults = await fileCollection
	// .where({
	// 	fsid: item.fsid
	// })
	// .update({
	//   // 更新students[0]
	//   ['thumburl.' + 0]: item.thumburl1
	// })
	
	// 3. 当2完成后，如果res.has_more=0,才终止循环任务，如果等于1，则继续从第一步开始，并且带上res.cursor
	
	
	
	let res = await updateCoverUrls()
	
	
	
	// 您可能想要处理响应或返回它
	return res;
	
}
```
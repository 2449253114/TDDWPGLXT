这是我的代码
```javascript
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
```
然后我现在需要改进需求。
// const allFsids 提取所有 fsid 并去除重复，存储到一个数组中，这样就不需要用fileResult去重了，因为我们在查询之前就已经去重了
// videoPuzzleCollection用allFsids去查询视频截图URL数据（注意，不是所有的fsid都有视频截图记录）
// 下面这是videoPuzzleCollection的一条数据示例
{
    "video_fsid": 178435514649585,
    "puzzle_url": "https://pcsdata.baidu.com/thumbnail/7bdc0d434q606304def55fb55b1cc2f8?fid=1815907562-16051585-993181758245400&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-D5%2Bl9G5WY27b7EH6sDBx7ZkQR0s%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=568325706765267708&dp-callid=0&time=1731924000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video",
}
// 在const processedData 中，我需要把videoPuzzleCollection查询到的视频截图URL数据添加到对应的item中。（原来的方式是这样的：thumburl: item.thumburl[0] // 使用处理后的 thumburl， 现在的方式是：thumburl: 如果有当前fsid的视频截图那就是puzzle_url，否则用原来的item.thumburl[0]），video_fsid对应的是fsid（fileResult）
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
```javascript
// TODO 2024-0721 临时修改数据，在第一个数据中插入《临时公告图片》
if (last_id == "0") { // 首次
	const currentTime = Date.now()

	// 定义接口启用时间的变量，示例：表示2024年8月3日06:00:00的时间戳
	const activationTime = 1798732799000; // 1739579400000 = 2026-12-31 23:59:59
	
	// 如果当前时间currentTime 大于 接口启用时间activationTime，则不显示公告。
	
	// 检查当前时间是否早于接口启用时间
	if (currentTime < activationTime) {
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
		result.data = [temporaryData, ...result.data]
	}
}
```
我想在以上代码中再增加一个temporaryData数据，
且thumburl和thumburl_persistent = https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/新版预告_1.jpg
然后title和name = 新版App预告（开发中，敬请期待）
	
	
	
	
	

	
	
	
	
	
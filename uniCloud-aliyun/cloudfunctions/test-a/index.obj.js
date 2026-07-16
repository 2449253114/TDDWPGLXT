const {
	dbCmd,
	fileCollection,
	albumCollectionName,
	personCollectionName,
	m3u8FileCollection,
	videoPuzzleCollection
} = require('./common/constants')

const {
	selectRandomAvatarUrl,
	getRandomTimestampInRange,
	querySystemAppConfig,
	adjustAspectRatio
} = require('./common/fun')

const {
	STATE_CODE,
	createResponse
} = require('./common/response')


/* ### TODO 2024-1118 改进 getRandomSampleFiles ，新增查询视频截图作为Home_推荐页的List-Item的封面 */
async function getV2RandomSampleFiles (
	pageSize = 30
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
	
	const {
		app_file_cover_type
	} = await querySystemAppConfig()
	
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
		newItem.thumburl = puzzleUrlMap[item.fsid] || item.thumburl[0]
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

module.exports = {
	getV2RandomSampleFiles
}
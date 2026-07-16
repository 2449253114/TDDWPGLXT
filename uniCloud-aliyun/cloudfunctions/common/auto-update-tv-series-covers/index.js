const {
	dbCmd,
	fileCollection,
	albumCollection,
	tvSeriesCollection
} = require('./common/constants')

const {
	photoConfig
} = require('./common/photo-config')

// const {
// 	newTasks
// } = require('./common/fun')

const {
	STATE_CODE,
	createResponse
} = require('./common/response')


async function loadAlbumFiles(
	album_id = "",
	cursor = ""
) {

	// 一刻相册的请求头
	let headers = {
		"Cookie": photoConfig.headers.Cookie,
		"Host": photoConfig.headers.Host,
		"Origin": "https://photo.baidu.com",
		"Referer": `https://photo.baidu.com/photo/web/album/${album_id}`
	}

	// querys参数只能是Sting类型
	const clienttype = "70"; // 客户端类型 70为Web
	const bdstoken = "5b3bda475d3738a44580fff097ee8037"; // 
	// cursor变量已在函数参数中声明，无需再次声明
	//const cursor = cursor; // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
	const need_amount = "1"; // 默认
	const limit = "100"; // 默认
	const passwd = "";

	// 构建 form-data 字符串
	let formData = '';
	formData += `cursor=${encodeURIComponent(cursor)}&`;
	formData += `album_id=${encodeURIComponent(album_id)}&`;
	formData += `need_amount=${encodeURIComponent(need_amount)}&`;
	formData += `limit=${encodeURIComponent(limit)}`;
	formData += `&passwd=${encodeURIComponent(passwd)}`;

	const apiUrl = `https://photo.baidu.com/youai/album/v1/listfile?clienttype=${clienttype}&bdstoken=${bdstoken}`

	try {
		const res = await uniCloud.httpclient.request(apiUrl, {
			method: 'POST',
			headers: {
				"Content-Type": "application/x-www-form-urlencoded", // 此类型在['https://photo.baidu.com/youai/album/v1/listfile']接口，控制台中看Network > api接口 > Header > Request Headers 中查看
				...headers
			},
			content: formData,
			dataType: 'json' // 此处指定为json表示将此请求的返回值解析为json
		});

		//console.log('res', res)
		return createResponse(STATE_CODE.SUCCESS, "请求成功", res.data)

	} catch (error) {

		return createResponse(STATE_CODE.FAIL, "请求失败", error)
	}

}

async function loadAllAlbumFiles(albumId, cursor, allFiles) {
	// 如果是初始调用，allFiles 应该是空数组
	allFiles = allFiles || [];

	// 加载相册文件
	let {
		data: loadData
	} = await loadAlbumFiles(albumId, cursor);
	// console.log('loadData', loadData)
	allFiles = allFiles.concat(loadData.list); // 追加相册文件列表

	if (loadData.has_more === 1) {
		// 等待1到3秒的随机时间
		await waitRandom(1000, 3000);
		// 如果还有更多数据，递归调用自身来加载下一页
		return loadAllAlbumFiles(albumId, loadData.cursor, allFiles);
	} else {
		// 没有更多数据，返回最终的所有相册文件列表
		return allFiles;
	}
}

// 创建一个用于生成随机等待时间的函数
function waitRandom(min, max) {
	return new Promise(resolve => {
		// 生成 min 到 max 之间的随机数
		const time = Math.random() * (max - min) + min;
		setTimeout(resolve, time);
	});
}


async function loadTVSeriesData() {
	const { data: tvSeriesData } = await tvSeriesCollection
	.where({
		status: 1// 已发布
	})
	.field({ album_id: true, show_name: true, episodes: true })
	//.limit(500)
	.get()
	
	return tvSeriesData
	
}


async function loadMomentAlbumFiles(tvSeriesData = []) {
	// 使用 Promise.all 并发加载所有相册文件
	const momentAlbumFilesPromises = tvSeriesData.map(async (series) => {
	    //console.log(`正在加载相册ID: ${series.album_id}的所有文件`);
	    const allFiles = await loadAllAlbumFiles(series.album_id, "", []);
	    
	    // 转换 allFiles 以仅包含需要的字段
	    const filteredFiles = allFiles.map(file => ({
	        album_id: file.album_id,
	        fsid: file.fsid,
	        thumburl: file.thumburl,
			extra_info: file.extra_info
	    }));
	    
	    return filteredFiles;
	});
	
	// 等待所有相册文件加载完成
	const momentAlbumFilesResults = await Promise.all(momentAlbumFilesPromises);
	// 扁平化数组
	const flattenedResults = momentAlbumFilesResults.flat(); // 现在 flattenedResults 是一个包含所有对象的单一数组，而不是一个嵌套数组
		
	const momentAlbumFiles = flattenedResults  // [].concat(...flattenedResults);
	
	return momentAlbumFiles
}

async function loadMyAlbumFiles(tvSeriesData = []) {
	// 从 tvSeriesData 中提取所有的 album_id 形成一个数组
	const albumIds = tvSeriesData.map(item => item.album_id);
	
	
	const { data: myAlbumFilesData } = await fileCollection
	.where({
		album_id: { $in: albumIds }
	})
	.field({ album_id: true, fsid: true, thumburl: true, extra_info: true })
	.limit(500)
	.get()
	
	return myAlbumFilesData
}

async function updateMyAlbumFiles(tvSeriesData, momentAlbumFiles, myAlbumFiles) {
	// 迭代电视剧剧集信息数据的每个剧集
	tvSeriesData.forEach(tvSeries => {
		tvSeries.episodes.forEach(episode => {
			// 对于每个剧集，找到对应的一刻相册中的相册文件数据项
			const coverItem = momentAlbumFiles.find(item => item.fsid === episode.cover_fsid);
			if (coverItem) {
				// 更新我自己的相册文件数据库表中的封面文件thumburl
				const myCoverFile = myAlbumFiles.find(item => item.fsid === episode.cover_fsid);
				if (myCoverFile) {
					myCoverFile.thumburl[0] = coverItem.thumburl[1];// 一刻相册中1是原图，即大图
					myCoverFile.extra_info = coverItem.extra_info
				}
				
				// 更新我自己的相册文件数据库表中的视频文件thumburl
				const myVideoFile = myAlbumFiles.find(item => item.fsid === episode.video_fsid);
				if (myVideoFile) {
					myVideoFile.thumburl[0] = coverItem.thumburl[1];
					myVideoFile.extra_info = coverItem.extra_info
				}
			}
		});
	});
	
	// 返回更新后的我自己的相册文件数据
	return myAlbumFiles;
}

async function autoUpdateTVSeriesCovers() {
	// 假设您已经有了这三个数组的数据
	//const tvSeriesData = [/* 电视剧剧集信息数据 */];
	//const momentAlbumFiles = [/* 一刻相册中的相册文件数据 */];
	//const myAlbumFiles = [/* 我自己的相册文件 数据库表的数据 */];
	
	const tvSeriesData = await loadTVSeriesData()
	const momentAlbumFiles  = await loadMomentAlbumFiles(tvSeriesData)
	const myAlbumFiles = await loadMyAlbumFiles(tvSeriesData)
	
	// 更新
	const updatedMyAlbumFiles = await updateMyAlbumFiles(tvSeriesData, momentAlbumFiles, myAlbumFiles)
	
	// 遍历updatedMyAlbumFiles，更新数据库表中的记录信息
	if (updatedMyAlbumFiles && updatedMyAlbumFiles.length > 0) {
		// 遍历相册文件列表，更新文件封面URL
		for (let item of updatedMyAlbumFiles) {
			// 更新文件封面URL
			await fileCollection.where({
				album_id: item.album_id,
				fsid: item.fsid
			}).update({
				// 更新thumburl[0]
				['thumburl.' + 0]: item.thumburl[0],
				extra_info: item.extra_info,
				album_type: 1, // 网剧相册，必须此类型
			});
		}
	}
	
	return updatedMyAlbumFiles

}


module.exports = async function(e) {
	// 公用模块用法请参考 https://uniapp.dcloud.io/uniCloud/cf-common
	
	let res = await autoUpdateTVSeriesCovers()
	console.log('res-自动更新电视剧剧集封面的执行结果', res)
	return res
}

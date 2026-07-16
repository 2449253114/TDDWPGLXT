const {
	dbCmd,
	personCollection
} = require('./common/constants')

const {
	photoConfig
} = require('./common/photo-config')

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

async function autoUpdatePersonCovers() {
	// 人物头像的相册ID《一刻相册：所有人物头像都上传在这个相册中》
	let currentAlbumId = "2494020321173028889";
	  
	// 加载所有相册文件
	let allAlbumFiles = await loadAllAlbumFiles(currentAlbumId, "");
	// console.log('All album files:', allAlbumFiles);
	
	// 这里是其他业务代码
	// 使用 allAlbumFiles 进行后续处理...
	//return allAlbumFiles
	
	// 获取人物数据
	const result = await personCollection
	.where({
		status: { $in: [1, 2]}
	})
	.get()
	//console.log('result', result)
	const allPersonData = result.data
	
	// 进行自动更新人物封面的逻辑
	// 遍历 allPersonData 中人物的封面
	const updatePersonData = allPersonData.map(personItem => {
	    // 更新每个人物的封面
	    const updatedCovers = personItem.covers.map(cover => {
			// 在相册数据中找到匹配的封面
			const matchedCover = allAlbumFiles.find(albumCover => albumCover.fsid === cover.fsid);
			// 如果找到，更新 thumb，否则保持原来的 thumb
			const updatedThumb = matchedCover ? matchedCover.thumburl[0] : cover.thumb;
			//const updatedThumb = matchedCover?.thumburl?.[0] ?? cover.thumb;
			return {
				...cover,
				work: "测试",
				thumb: updatedThumb
			};
	    });
	
	    // 返回更新后的人物数据对象
	    return {
			...personItem,
			covers: updatedCovers
	    };
	});
	
	//return updatePersonData
	
	
	// 遍历 updatePersonData 数组
	for (const person of updatePersonData) {
		// 使用 person._id 来定位数据库中的记录，并更新 covers 字段
		const updateResult = await personCollection.doc(person._id).update({
			covers: person.covers
		});
	
		// 输出每次更新的结果，以便调试
		//console.log(`更新结果 for ${person._id}:`, updateResult);
	}
	
	return {
		msg: "人物封面更新成功",
		data: updatePersonData
	}
}

module.exports = async function(e) {
	// 公用模块用法请参考 https://uniapp.dcloud.io/uniCloud/cf-common
	let res = await autoUpdatePersonCovers();
	console.log('res-自动更新人物头像封面的执行结果', res)
	return res;
}




```json
// 这是m3u8FileCollection数据库表中的字段
"sub_account_cookie_ids": {// 那个子账号请求的cookie，是个数组，然后每次请求时记录到数组中，记录的是子账号的ID，共5个账号，当5个账号的cookie（ID）都被记录过了，则清空并重新记录，这个字段就是这个作用。所以你帮我起一个名字。
    "bsonType": "array",
	"title": "请求跟踪",
    "description": "记录子账号请求的cookie ID，当记录满5个后自动清空并重新记录。"
},
```

```javascript

const photoConfig = {
	"headers": {
		// 这个Cookie是抓的Web端
		//"Cookie": "BIDUPSID=C6FF1A0FA68F50915CC0E431973FC719; PSTM=1693624019; BAIDUID=40F14108017EB6641D57F1DA67B48673:FG=1; BAIDUID_BFESS=40F14108017EB6641D57F1DA67B48673:FG=1; ZFY=Xp592oYhjmGCZmNwoZBgEk0hCwPwIzAsvxUVTsgAU58:C; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%221815907562%22%2C%22first_id%22%3A%2218c91cebcada6f-009f1d0798fdf2-26031051-1440000-18c91cebcae2589%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22%24device_id%22%3A%2218c91cebcada6f-009f1d0798fdf2-26031051-1440000-18c91cebcae2589%22%7D; H_PS_PSSID=39733_39842_39935_39937_39942_39938_39996_39990_40008_40041; Hm_lvt_829488e8924d8de8d4420f2bbed270ca=1703506069; csrfToken=KmwdLtmt-PXrLKXQ91p1fJKP; BDUSS=ml0WUFvWFRNZWRJSjNjNk90WFdpallNblZnOWppenEzV2gydzFZdGRNVE9XN0psSVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM7OimXOzoplY; BDUSS_BFESS=ml0WUFvWFRNZWRJSjNjNk90WFdpallNblZnOWppenEzV2gydzFZdGRNVE9XN0psSVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM7OimXOzoplY; STOKEN=cc27463179bc702c84f6ab660c54ea667345f5bfc2c5b90056bf05aad88b85f3; PANWEB=1; PANWEB.sig=mEnYrSeaQqssYZire89rFPmLY9htA0FzmyWp6jBsV1U; Hm_lpvt_829488e8924d8de8d4420f2bbed270ca=1703684873; PANPSC=12251217843546114402%3AzzpCDGVh21K4ust%2BbawFFlcS2d9ns3O5PSeaW42QQxD7f3W8srjvRx353onjfJd5COfgdHnp148lc4YfRg60ihYmCLWIjT%2F8Fl7owtXleijihEIzmOtMnRn%2BOGYsIE0xYqZdy9zZ13lsfZ87u8WyL5Uakz0OGYGxy1YK4WK3w7VSq30u3lTLiFE4rv%2BwgXJCRxInW3klfekGH82i2qqYWIh32wT%2B23rM4SrOAfwkSukv2YLFpzeLmb0gRlTm2Fs1",
		// 这个Cookie是抓的App客户端
		"Cookie": "BDUSS=RJLTB1U2FZeWpobXJpWVJIczR0cTA2LUZDblZzZ0h1cnhJTW4zRm1ack1SbTFtRVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMy5RWbMuUVmSF; STOKEN=ed669022ee6f1b7a00632905969ae933556e772d15f8dd9b9b7b1e4d2525a38d;"
		"Host": "photo.baidu.com",
		"Referer": "https://photo.baidu.com/photo/web/home",
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	},
	// 这个数组将存储多个子账号的 Cookie 和 ID
	subAccountCookies: [
		{
			id: "17343209464",
			cookie: "BDUSS=VaWTItQ1pRWTdnMWI5aEJ6QVNFemkyVi1tcXRjZmwxY1NtdzdsUlhEcEF2RUJtRVFBQUFBJCQAAAAAAAAAAAEAAADZS3bwxdbF1k1lbmdUQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAvGWZALxlmZ1; STOKEN=1a1c1e3239cd9b58a2cae9a7264ac47588b2bdc569257c7b649487b9295e705b;"
		},{
			id: "17384203028a1",
			cookie: "BDUSS=msxVG5oOFNWSExOZHZ3UGV5MlY4US16N3RzU2dncS1sRHZ0UjdNdG85b1IyYmxtRVFBQUFBJCQAAAAAAQAAAAEAAACWkgmOMTczODQyMDMwMjhhMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFMkmYRTJJmS; STOKEN=2e8445e77d326da753253eb31c78ec6176b07f6e44b5d3f8d7c2d4aefbd8a04a;"
		},{
			id: "17384203028a2",
			cookie: "BDUSS=mpPLThtSElialA0UFQyb01rejJjeklsdUJja1VBZG1ET2dsQTlwcmVCQUplcjFtRVFBQUFBJCQAAAAAAQAAAAEAAAAXVhWOMTczODQyMDMwMjhhMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAntlWYJ7ZVmT; STOKEN=b5fe34f1ff5e5d21d014b8b765f00b5c605d22f2999a798a93aa5cb1ae83ca28;"
		},{
			id: "19282422641a1",
			cookie: "BDUSS=Gp1UFJpRTA5Nk5FeUI3MWFOVUE4dUdkUmtGT05IUnpZaTBzRmZKMzRrRDZlcjFtRUFBQUFBJCQAAAAAAQAAAAEAAAASGSCOMTkyODI0MjI2NDFhMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPrtlWb67ZVmV; STOKEN=e1c80eaa91fac0429dc4ce463139d71e4fd9587eb9e5de8905993930ceb48870;"
		},{
			id: "19282422641a2",
			cookie: "BDUSS=mpaYjdtWGJJN1dUcXNEMH5TLVB3a29ncGp6RUtPbllqbGlCMGtnQjJINk54NzVtRVFBQUFBJCQAAAAAAQAAAAEAAACchS-OMTkyODI0MjI2NDFhMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI06l2aNOpdmT; STOKEN=bf1494c66865a736dcde06ce10b01c69047ff78e2645a4012a1ba3740c02cc8e;"
		}
	]
}

// 定义请求播放URL的函数
/**
 * 请求一刻相册视频的M3U8播放URL。
 * 如果数据库中存在未过期的M3U8文件记录，则直接返回URL。
 * 如果没有记录或记录已过期，则请求新的播放URL并更新数据库。
 *
 * @param {object} headers 请求头信息
 * @param {string} fsid 一刻相册文件id
 * @param {string} album_id 一刻相册相册id
 * @param {string} tid 一刻相册相册tid
 * @returns {Promise<string>} 返回M3U8文件的URL或抛出错误
 */
async function requestM3U8PlayUrl(headers, fsid, album_id, tid) {
	
	throw new Error('视频正在迁移中，预计需用时72小时，请7月21日再来');
	
	// 当前时间戳
	const currentTime = Date.now(); 
	// 从数据库查询当前视频的m3u8文件记录
	let m3u8RecordResult = await m3u8FileCollection.where({
		fsid: fsid, // fsid是不会变的，即使是在其他相册有相同的文件，因为fsid是唯一的
	    //album_id: album_id
	}).get();
	let m3u8Record = m3u8RecordResult.data && m3u8RecordResult.data[0];
	
	// 如果m3u8记录存在且未过期，并且转码状态为可播放，则直接返回URL
	if (m3u8Record && m3u8Record.expire_time > currentTime && m3u8Record.transcoding_status === "available") {
		// 初始化m3u8记录数据
		const m3u8FileData = {
		    //album_id: album_id,
		    fsid: fsid,
			read_count: m3u8Record.read_count + 1
		};
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData)
		// 如果记录存在且未过期，直接返回记录中的m3u8文件URL
		return m3u8Record.m3u8_file_url;
	} 
	// 如果m3u8记录存在且未过期，并且转码状态为转码中或部分可播放，则直接提示
	else if (m3u8Record && m3u8Record.expire_time > currentTime && (m3u8Record.transcoding_status === "transcoding" || m3u8Record.transcoding_status === "partial_available")) {
		// 视频正在转码中或部分可播放但还在转码中
		throw new Error('视频正在转码中，或部分可播放但仍在转码中，请稍后再来哦。');
	}
	// 如果m3u8记录存在且过期，则将m3u8_file_url记录到m3u8文件已过期的记录中
	else if (m3u8Record && m3u8Record.expire_time < currentTime) {
		// 异步记录
		addInvalidM3u8FilesUrl(m3u8FileData)
	}
	
	// 如果记录不存在或已过期，继续以下逻辑请求m3u8文件
	
	// 一刻相册的老接口不再支持（账户异常）：https://photo.baidu.com/youai/file/v1/streaming?fs_id=${fsid}
	// 一刻相册的备用API接口：https://photo.baidu.com/youai/album/v1/streaming?fsid=879380303928656&album_id=3670888259671190467&uk=1815907562&tid=317080198078930727
	// 请求一刻相册的备用API接口获取m3u8文件
	let res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
		url: `https://photo.baidu.com/youai/album/v1/streaming?fsid=${fsid}&album_id=${album_id}&uk=1815907562&tid=${tid}`,
		method: "GET",
		dataType: "text",
		//header: headers,
		header: {
			Cookie: headers.Cookie,// 需求在这：我现在需要把这里改成从subAccountCookies中随机拿一个子账号的cookie，但是在拿之前，还需要排除掉m3u8Record.sub_account_cookie_ids中记录的id的cookie
			Host: headers.Host,
			"User-Agent": headers['User-Agent'],
			Referer: `https://photo.baidu.com/photo/web/album/${album_id}`
		}
	})
	
	// 首先检查res.data是否为字符串类型
	if (typeof res.data === 'string') {
	    try {
	        // 尝试将字符串res.data解析为JSON对象
	        res.data = JSON.parse(res.data);
	        // 如果解析成功，那么res.data现在是一个对象，可以进行后续的对象处理
	    } catch (e) {
	        // 如果解析过程中抛出异常，说明res.data不是一个有效的JSON字符串
	        // 此时不需要对res.data进行任何操作，因为它仍然是原始的字符串数据
	        // 我们可以直接使用这个字符串进行后续的处理
	    }
	}
	// 在这个阶段，res.data要么是解析成功的JSON对象，要么是未解析的原始字符串
	// 我们可以根据res.data的具体内容来执行不同的逻辑处理
	
	console.log('res', res)

	//返回数据给客户端
	//return res.data
	
	// 测试用
	// res = {
	// 	data: {
	// 		"errno": 31341,
	// 		"request_id": 8722503573939941376,
	// 		"error_code": 31341,
	// 		"errmsg": "be transcoding, please wait and retry"
	// 	}
	// }


	// 初始化m3u8记录数据
	let m3u8FileData = {
	    album_id: album_id,
	    fsid: fsid,
	    m3u8_file_url: "",
	    transcoding_status: "",
		subAccountCookies: "" // 需求在这：这里要在原基础上记录上面uniCloud.request中拿到的那个cookie的id
		//read_count: m3u8Record && m3u8Record.read_count ? m3u8Record.read_count + 1 : 0,
		read_count: 0,// 如果文件过期，则直接重置为0（只需要知道在文件访问有效期内同一文件共读取了多少次）
	    create_time: currentTime,
	    expire_time: currentTime + 6 * 60 * 60 * 1000 // 设置过期时间为当前时间加6小时
	};

	// 判断视频转码状态并处理结果
	if (res.data && typeof res.data === 'object' && res.data.errmsg.startsWith("be transcoding") && res.statusCode == 400) {
		// 需要有5小时的转码时间
		m3u8FileData.transcoding_status = "transcoding";
		m3u8FileData.expire_time = currentTime + 5 * 60 * 60 * 1000; // 设置过期时间为当前时间加5小时
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);
		
		// 视频正在转码中
		throw new Error('视频飞速转码中，请稍后再来哦。');
	} else if (res.data && typeof res.data === 'string' && res.data.startsWith("#EXTM3U") && !res.data.includes("#EXT-X-ENDLIST")) {
		// 需要有5小时的转码时间
		m3u8FileData.transcoding_status = "partial_available";
		m3u8FileData.expire_time = currentTime + 5 * 60 * 60 * 1000; // 设置过期时间为当前时间加5小时
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);
		
		// m3u8内容存在但没有结束符，表示视频部分可播放但还在转码中
		throw new Error('视频部分可播放，但仍在转码中，请稍后再来哦。');
	} else if (res.data && typeof res.data === 'string' && res.data.startsWith("#EXTM3U") && res.data.includes("#EXT-X-ENDLIST")) {
		// 视频已经是m3u8，可以播放
		const m3u8Content = res.data; // m3u8内容
		// 处理获取到的m3u8文件内容，并更新数据库
		m3u8FileData.transcoding_status = "available";
		m3u8FileData.m3u8Record && m3u8Record.read_count ? m3u8Record.read_count + 1 : 0;
		m3u8FileData.m3u8_file_url = await handleM3u8Content(m3u8Content, fsid);
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData);
		
		return m3u8FileData.m3u8_file_url;
	} else {
		// 未知响应，返回错误信息
		//throw new Error('视频飞速转码中，请稍后再来哦。');
		//throw new Error('系统正在升级中，请明日6点后再来');
		//throw new Error('视频正在迁移中，预计需用时168小时，请7日后再来');
		throw new Error('视频正在迁移中，预计需用时72小时，请7月21日再来');
	}
	
}
```













```javascript
// 一小时内，最多可以请求120个视频（5个子账号加起来就这么多，为了减少请求次数压力，避免高频请求导致封号）
// 在下面的请求一刻相册接口逻辑处，增加记录当前时段（取整），如现在是12:33，则找12:00至13:00的记录，没有就新建
// 
```

帮我起一个数据库表名和字段名，主要作用是记录每小时（时段）的请求次数总数，所以有两个字段：每小时（时段）、请求次数总数。
然后：每小时（时段）的记录值是这样的："00:00:00 - 00:59:59" // 01:00:00 - 01:59:59 ....，所以这个数据库表中共有24个记录，应该是吧，一天24个小时








```javascript
// TODO 2024-0721起   改成了一小时内最多可以请求120个视频（5个子账号加起来就这么多，为了减少请求次数压力，避免高频请求导致封号），否则提示换其他的视频看或晚点儿再来看这个视频
let hourlyResult = await hourlyRequestCountCollection.get()
let hourlyData = hourlyResult.data; 
// 检查当前时段的请求次数是否>=120，帮我封装成一个方法直接调用，时段你可以看updateHourlyRequestCount



// 后期增加如果hourlyData.length=0，则先新建24个数据，目前有yike-hourly-request-count.init_data.json直接生成
// 假设这是一次请求，异步更新数据库
updateHourlyRequestCount(hourlyData);





/* 更新请求次数的函数 */
function updateHourlyRequestCount (hourlyData) {
	// 获取当前时间
	const now = new Date();
	const currentHour = now.getHours();
	console.log("currentHour", currentHour)

	// 异步更新数据库记录，当前时段的请求计数+1
	hourlyRequestCountCollection.where({
		current_hour: {
			$eq: currentHour  // eq 等于
		}
	}).update({
		request_count: dbCmd.inc(1) // 自增+1
	})
	
	// 异步更新数据库记录，非当前时段的请求计数重置为0
	hourlyRequestCountCollection.where({
		current_hour: {
			$neq: currentHour // neq 不等于
		}
	}).update({
		request_count: 0
	})

}
```






```javascript
// TODO 2024-0721 临时修改数据，在第一个数据中插入《临时公告图片》
if (last_id == "0") {// 首次
	let temporaryData = { ...result.data[0] } // 解构（浅拷贝）
		temporaryData._id = "669be442e0ec199b18920240721"
		temporaryData.album_id = "0"
		// 这里的thumburl已经是处理后的String类型，不是数组类型
		temporaryData.thumburl = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/临时调整公告.png"
		temporaryData.thumburl_persistent = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/shoudong-uploads/临时调整公告.png"
		temporaryData.category = 3 // 类型为3就不会显示 开始播放按钮 了
		temporaryData.file_type = "image"
		temporaryData.create_time = 1721519081129
		temporaryData.ctime = 1721517693
	result.data = [temporaryData,...result.data]
}


// 获取当前时间的时间戳（毫秒）
const now = Date.now();

// 从m3u8FileCollection数据库表中找到所有未失效的记录（135*7=945条记录）
const m3u8FileResult = await m3u8FileCollection.where({
	expire_time: dbCmd.gt(now) // 找出过期时间大于当前时间的记录 | 大于，字段大于指定值。
}).limit(1000).get()

const m3u8FileData = m3u8FileResult.data

// match总是false的问题在这对不？
// m3u8FileData 数据格式
// {
//     "album_id": "4390134010436377408",
//     "fsid": "512174443986538", // String类型
//     "expire_time": 1721524724863
// }


// result.data 数据格式
// {
// 	"_id": "669be442e0ec199b18920240721",
// 	"album_type": 0,
// 	"album_id": "4139126773801241388",
// 	"fsid": 157681676992474, // Int类型
// 	"album_info": {
// 		"title": "",
// 		"person_info": {
// 			"name": ""
// 		}
// 	}
// }

// 现在的需求就是遍历result.data时，从3u8FileData中找到对应item.fsid的项，
// 然后更新result.data的item的album_info.title和person_info.name="免等待，立即看"，如果没有找到的项，就改成="观看人数较多"

// 遍历result.data中的每一项
result.data.forEach(item => {
    // 查找3u8FileData中是否有与当前item的fsid相匹配的记录，将item.fsid转换为字符串再进行比较
    // 同时排除fsid等于0000011111222的项
	const match = m3u8FileData.find(fileItem => 
		String(fileItem.fsid) === String(item.fsid) && fileItem.fsid !== "0000011111222"
	); 
	// match这段总是false，因为我发现了问题，需要你帮我修复，
    
    if (match) {
        // 如果找到了匹配项，更新item的album_info.title和person_info.name
        item.album_info.title = "免等待，立即看";
        item.album_info.person_info.name = "免等待，立即看";
    } else {
        // 如果没有找到匹配项，设置默认值
        item.album_info.title = "观看人数较多";
        item.album_info.person_info.name = "观看人数较多";
    }
});

// 构造响应体
let response = {
	total: result['affectedDocs'],// 总记录数
	list: result.data// 数据列表
}

```
















# 3

```javascript
// 需求提示：注意看，我把Set替换成了普通的 [] 这样创建数组，不需要用Set搞集合，然后下面还有需要更改的部分，你帮我改正确

// 检查 m3u8Record 是否存在以及是否有 sub_account_cookie_ids 属性
let usedCookieIds = (m3u8Record && m3u8Record.sub_account_cookie_ids) || []

// 先判断是否已经记录了5个不同的 Cookie ID，如果是，则清空数组
if (usedCookieIds.length >= 5) {
	usedCookieIds = []
}

// 从 photoConfig.subAccountCookies 中过滤掉已经使用的 Cookie
const availableCookies = photoConfig.subAccountCookies.filter(cookieObj => !usedCookieIds.includes(cookieObj.id));

// 从过滤后的数组中随机选择一个 Cookie 对象
const randomCookieObj = availableCookies[Math.floor(Math.random() * availableCookies.length)];

// 更新请求头中的 Cookie
//headers.Cookie = randomCookieObj.cookie;
const newCookie = randomCookieObj.cookie;

// 记录新的 Cookie ID，确保不会重复
if (!usedCookieIds.includes(randomCookieObj.id)) {
    usedCookieIds.push(randomCookieObj.id);
}

	// 初始化m3u8记录数据
let m3u8FileData = {
    album_id: album_id,
    fsid: fsid,
    m3u8_file_url: "",
    transcoding_status: "",
	sub_account_cookie_ids: [],
	//read_count: m3u8Record && m3u8Record.read_count ? m3u8Record.read_count + 1 : 0,
	read_count: 0,// 如果文件过期，则直接重置为0（只需要知道在文件访问有效期内同一文件共读取了多少次）
    create_time: currentTime,
    expire_time: currentTime + 7 * 60 * 60 * 1000 // 设置过期时间为当前时间加7小时，2024年7月20之前版本是6小时
};

// 更新 m3u8FileData 的 sub_account_cookie_ids
m3u8FileData.sub_account_cookie_ids = usedCookieIds.slice(), // 直接复制 usedCookieIds 数组

```

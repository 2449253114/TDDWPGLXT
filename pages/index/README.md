我现在有个需求，我需要从URL中提取参数
```javascript
// 比如有这样一个url
const tsURL = "https://d09be1-613813804.antpcdn.com:19001/b/v2-ant.baidu.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=9142068870062810967&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=0&logid=9142068870062810967&mtime=1708361503&ouk=1815907562&r=138170660&size=450828284&sta_cs=1&sta_dt=video&sta_dx=429&time=1712354256&to=vas2&tot=cebeI&uo=any&uva=173034443&vuk=1815907562&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=1073292&range=1077240-2150531&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-Fd5RQ1R3tuKImQ7dD5WKJcxjQnk%3D&xcode=947652474dbf3ef30a3c5150592648c2f8fb2abe3dc9f38a6567850fc2f1689d36b67ccde346b208f1b8acead9799c060b2977702d3e6764&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming"
```
然后tsURL中的参数提取出JSON是这样的
```json
{
	"ts_size": "13571532",
	"app_id": "16051585",
	"csl": "0",
	"dp-logid": "9142068870062810967",
	"esl": "1",
	"fn": "1773153875_758_IMG_0044_1708361503502_39.mp4",
	"from_type": "1",
	"fsid": "296700103461475",
	"isplayer": "1",
	"iv": "0",
	"logid": "9142068870062810967",
	"mtime": "1708361503",
	"ouk": "1815907562",
	"r": "138170660",
	"size": "450828284",
	"sta_cs": "1",
	"sta_dt": "video",
	"sta_dx": "429",
	"time": "1712354256",
	"to": "vas2",
	"tot": "cebeI",
	"uo": "any",
	"uva": "173034443",
	"vuk": "1815907562",
	"dtime": "10",
	"etag": "705deb4186c895f049bdedfa06e97372",
	"fid": "37910c2fdb23889de4903de8a3a2fc97-1815907562",
	"len": "1073292",
	"range": "1077240-2150531",
	"region": "xian",
	"resv4": "",
	"sign": "BOUTRFPQV-F3530edecde9cd71b79378b290804a96-Fd5RQ1R3tuKImQ7dD5WKJcxjQnk=",
	"xcode": "947652474dbf3ef30a3c5150592648c2f8fb2abe3dc9f38a6567850fc2f1689d36b67ccde346b208f1b8acead9799c060b2977702d3e6764",
	"xv": "6",
	"need_suf": "",
	"pmk": "1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc",
	"by": "my-streaming"
}
```
然后我现在要做的是只需要提取我需要的信息，大概的JSON如下
```json
{
	ts_size,
	原始文件名: 同上fn, // 原始文件名就是完整的MP4文件名字，不是切片ts名
	fsid,
	size,
	文件类型：同上sta_dt,
	len,
	range,
	by,
	索引序号：// 参考我接下来给你的代码
}
```
下面是原有的代码
```javascript
const fs = require('fs');
const os = require('os');
const path = require('path');
//const axios = require('axios');

const {
	photoConfig
} = require('../../common/photo-config')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')


/**
 * 从m3u8内容中提取所有TS文件的URL
 * @param {*} m3u8Content 	m3u8内容
 * @returns 				TS文件的URL数组
 */
function extractTsUrls(m3u8Content) {
	// 使用正则表达式匹配所有TS文件的URL
	const tsUrlRegex = /(?:#EXTINF:.*,\n)(https?.*?)(?=\n|#)/g;
	let match;
	const tsUrls = [];

	while ((match = tsUrlRegex.exec(m3u8Content)) !== null) {
		// 获取匹配到的TS URL
		tsUrls.push(match[1]);
	}

	return tsUrls;
}


/**
 * 新函数处理TS链接和重定向
 * @param {*} tsUrls		ts链接
 * @param {*} m3u8Content	m3u8内容
 * @returns 				处理结果（成功则返回包含更新后的m3u8内容）
 */
async function handleTsRedirect(tsUrls, m3u8Content) {
	// 使用第一个TS链接（如果存在）发送请求
	if (tsUrls.length > 0) {
		try {
			const firstTsUrl = tsUrls[0];
			
			// 使用正则表达式提取 URL 的主机名
			const match = firstTsUrl.match(/^https?:\/\/([^\/]+)/i);
			const host = match && match[1];
			
			// 发送请求并设置不自动跟随重定向
			const response = await uniCloud.httpclient.request(firstTsUrl, {
				method: 'GET',
				headers: {
					Referer: "https://photo.baidu.com",
					Origin: "https://photo.baidu.com",
					Host: host,
					Connection: "keep-alive",
					//Accept-Encoding: "gzip, deflate, br",
					Accept: "*/*",
					//User-Agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
				},
				followRedirect: false,
				//gzip: true,
			});

			// 检查状态码是否为302
			if (response.status === 302 || response.res.statusCode === 302 || response.res.status === 302) {
				// 获取重定向的URL
				const redirectUrl = response.headers['location'] || response.headers['Location'] || response.res
					.headers['location'];
				// 获取请求URL
				const requestUrl = response.res.requestUrls[0] || firstTsUrl;
				// 获取请求URL，并删除 "https://"
				const requestUrlWithoutScheme = requestUrl.replace(/^https?:\/\//, '');
				// 提取重定向基础路径
				const redirectBaseUrl = redirectUrl.replace(requestUrlWithoutScheme, '');
				// 更新tsUrls数组中的每个URL，同时删除 "https://"
				let updatedTsUrls = tsUrls.map(url => {
					const urlWithoutScheme = url.replace(/^https?:\/\//, '');
					return redirectBaseUrl + urlWithoutScheme;
				});

				// 将更新后的URL重新写入m3u8Content
				let updatedM3u8Content = m3u8Content;
				for (let i = 0; i < tsUrls.length; i++) {
					updatedM3u8Content = updatedM3u8Content.replace(tsUrls[i], updatedTsUrls[i]);
				}

				// 这里可以返回更新后的m3u8内容，或者进行其他需要的操作
				return createResponse(STATE_CODE.SUCCESS, '处理重定向成功', {
					updatedM3u8Content,
					updatedTsUrls
				});
			} else {
				console.log('Response Data:', response);
				return createResponse(STATE_CODE.FAIL, '重定向处理失败，状态码非302', response);
			}
		} catch (error) {
			console.error('Request failed:', error);
			return createResponse(STATE_CODE.ERROR, '请求失败', error);
		}
	} else {
		return createResponse(STATE_CODE.FAIL, '没有找到TS链接', null);
	}
}



/**
 * https://photo.baidu.com/youai/file/v1/streaming?fs_id=802501495334896
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let queryStringParameters = httpInfo.queryStringParameters //: {HTTP请求的Query，键值对形式},
	const fs_id = queryStringParameters.fs_id

	const headers = photoConfig.headers

	const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
		url: `https://photo.baidu.com/youai/file/v1/streaming?fs_id=${fs_id}`,
		method: "GET",
		dataType: "text",
		header: headers,
	})

	// 假设m3u8Content是接口返回的M3U8流内容
	const m3u8Content = res.data; // 你的M3U8内容
	const tsUrls = extractTsUrls(m3u8Content);

	// 打印所有TS链接
	console.log(tsUrls);

	// 使用新函数处理TS链接和重定向并返回更新后的M3U8内容
	const redirectResponse = await handleTsRedirect(tsUrls, m3u8Content);

	// 如果处理失败则返回错误
	if (redirectResponse.code !== 200) {
		return redirectResponse
	}

	// 从处理结果中获取更新后的M3U8内容
	const testUpdatedM3u8Content = redirectResponse.data.updatedM3u8Content.trim();

	return {
		mpserverlessComposedResponse: true, // 使用阿里云返回集成响应是需要此字段为true
		statusCode: 200,
		headers: {
			'content-type': 'application/vnd.apple.mpegurl' // m3u8文件的MIME类型
		},
		body: testUpdatedM3u8Content
	};

}
```
然后你看我需求的（提取我需要的信息）这部分需要增加在哪？最好用函数调用




其实我可以把extractTsUrls返回的tsUrls给extractRequiredParams，然后内部一次性提取，再返回个所有提取的数组。

```javascript
/**
 * 从m3u8内容中提取所有TS文件的URL
 * @param {*} m3u8Content 	m3u8内容
 * @returns 				TS文件的URL数组
 */
function extractTsUrls(m3u8Content) {
	// 使用正则表达式匹配所有TS文件的URL
	const tsUrlRegex = /(?:#EXTINF:.*,\n)(https?.*?)(?=\n|#)/g;
	let match;
	const tsUrls = [];

	while ((match = tsUrlRegex.exec(m3u8Content)) !== null) {
		// 获取匹配到的TS URL
		tsUrls.push(match[1]);
	}

	return tsUrls;
}


/**
 * 从TS文件的URL中提取所需参数
 * @param {string} url - TS文件的URL
 * @returns {Object} - 包含所需参数的对象
 */
function extractRequiredParams(url, index) {
	// 解析URL参数
	const urlParams = new URLSearchParams(url.split('?')[1]);

	// 提取所需参数并重新命名键
	const params = {
		ts_size: urlParams.get('ts_size'),
		original_file_name: urlParams.get('fn'), // 原始文件名就是完整的MP4文件名字，不是切片ts名
		fsid: urlParams.get('fsid'),
		size: urlParams.get('size'),
		file_type: urlParams.get('sta_dt'), // 文件类型
		len: urlParams.get('len'),
		range: urlParams.get('range'),
		by: urlParams.get('by'),
		ts_index: index // 索引序号的提取逻辑需要您根据实际情况定义
	};
	return params;
}
```



帮我把下面代码加上字段名，要简洁且意思同样

```javascript
// 这里可以返回更新后的m3u8内容，或者进行其他需要的操作
return createResponse(STATE_CODE.SUCCESS, '处理重定向成功', {
	这是m3u8文件内容 : updatedM3u8Content,
	这是所有ts链接 : updatedTsUrls,
	这是所有ts链接中提取的信息 : allExtractedParams
});
```


# App需要用m3u8接口下载所有分片，然后写入本地m3u8文件。（mp4下载不了，但exo可以正常播放）


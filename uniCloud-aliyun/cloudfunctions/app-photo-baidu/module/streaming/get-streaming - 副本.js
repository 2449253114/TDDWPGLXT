const fs = require('fs');
const os = require('os');
const path = require('path');

const {
	photoConfig
} = require('../../common/photo-config')

/**
 * 从m3u8内容中提取所有TS文件的URL
 * @param {*} m3u8Content 
 * @returns 
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


	//返回数据给客户端
	//return res.data

	// 假设m3u8Content是接口返回的M3U8流内容
	const m3u8Content = res.data; // 你的M3U8内容
	const tsUrls = extractTsUrls(m3u8Content);

	// 打印所有TS链接
	console.log(tsUrls);
	//return tsUrls

	// 使用第一个TS链接（如果存在）发送请求
	if (tsUrls.length > 0) {
		try {
			const firstTsUrl = tsUrls[0];
			// 发送请求并设置不自动跟随重定向
			const response = await uniCloud.httpclient.request(firstTsUrl, {
				method: 'GET',
				followRedirect: false,
			});

			// 检查状态码是否为302
			if (response.status === 302 || response.res.statusCode === 302 || response.res.status === 302) {
				// 获取重定向的URL
				const redirectUrl = response.headers['location'] || response.headers['Location'] || response.res
					.headers['location'];
				console.log('Redirect URL:', redirectUrl);

				// 获取请求URL
				const requestUrl = response.res.requestUrls[0] || firstTsUrl

				// 现在我拿到了redirectUrl后，需要对比requestUrl，
				/* 
				需求是这样的：
				假设redirectUrl = "https://rd645n.jomodns.com/b/nv0.baidupcs.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=27928449142402330&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=2&logid=27928449142402330&mtime=1708361503&ouk=1815907562&r=389298796&size=450828284&sta_cs=2&sta_dt=video&sta_dx=429&time=1708466208&to=hsn00&tot=ceix1&uo=cmnet&uva=173034443&vuk=1815907562&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=910860&range=3246196-4157055&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-CRsNYE5ArEUBoQp561Mv5uUQN3g%253D&xcode=7d031be3dc497a766d5b6c85cef6b7beceb7a5b36b4db0c81b6099b35b08b54c11127aa5f8f2114545c0b69a9815fa660b2977702d3e6764&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming"
				假设requestUrl = "https://nv0.baidupcs.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=27928449142402330&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=2&logid=27928449142402330&mtime=1708361503&ouk=1815907562&r=389298796&size=450828284&sta_cs=2&sta_dt=video&sta_dx=429&time=1708466208&to=hsn00&tot=ceix1&uo=cmnet&uva=173034443&vuk=1815907562&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=910860&range=3246196-4157055&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-CRsNYE5ArEUBoQp561Mv5uUQN3g%253D&xcode=7d031be3dc497a766d5b6c85cef6b7beceb7a5b36b4db0c81b6099b35b08b54c11127aa5f8f2114545c0b69a9815fa660b2977702d3e6764&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming"
				然后我要对比的就是redirectUrl和requestUrl，其实这两个URL的区别就是“redirectUrl”多一个路径“https://rd645n.jomodns.com/b/”，这个路径是重定向的，他是动态的路径，所以我要拿到这个路径，然后为我的tsUrls数组里的每个URL更改为前面是“https://rd645n.jomodns.com/b/”，然后再重写到m3u8Content中。
				
				你提取重定向基础路径不严格，重定向路径只有前面“https://rd645n.jomodns.com/b/”不一样，后面“nv0.baidupcs.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=27928449142402330&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=2&logid=27928449142402330&mtime=1708361503&ouk=1815907562&r=389298796&size=450828284&sta_cs=2&sta_dt=video&sta_dx=429&time=1708466208&to=hsn00&tot=ceix1&uo=cmnet&uva=173034443&vuk=1815907562&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=910860&range=3246196-4157055&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-CRsNYE5ArEUBoQp561Mv5uUQN3g%253D&xcode=7d031be3dc497a766d5b6c85cef6b7beceb7a5b36b4db0c81b6099b35b08b54c11127aa5f8f2114545c0b69a9815fa660b2977702d3e6764&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming”是和requestUrl一样的，只不过少了requestUrl开头部分的“https://”，你应该这么做才是最正确的
				你这方法还是不靠谱，如果我的重定向基础路径是“https://rd645n.jomodns.com/b/c/d/f/”呢？你的代码（const redirectBaseUrl = redirectUrl.substring(0, redirectUrl.indexOf('/', redirectUrl.indexOf('//') + 2) + 2);）又如何保证匹配的是正确的呢？
				我现在直接告诉你怎么来保证正确的吧，首先从requestUrl中删掉“https://”，然后再对比requestUrl和redirectUrl，这时对比出来的不一样只有“https://rd645n.jomodns.com/b/”，或者基础路径是“https://rd645n.jomodns.com/b/c/d/f/”也能对比出来，这样可以保证，我基础路径不管怎么变化，我都可以正确的找出来，有个办法，把删除“https://”后的requestUrl作为redirectUrl的剪切指定内容，这样不就可以把剩下不一样的基础路径拿到了吗，你说我这个方法是不是比你的好。
				*/

				//  return {
				// statusCode: 302,
				// redirectUrl: redirectUrl
				//  }

				
				// 获取请求URL，并删除 "https://"
				const requestUrlWithoutScheme = requestUrl.replace(/^https?:\/\//, '');

				// 提取重定向基础路径
				const redirectBaseUrl = redirectUrl.replace(requestUrlWithoutScheme, '');

				// 更新tsUrls数组中的每个URL，同时删除 "https://"
				const updatedTsUrls = tsUrls.map(url => {
					const urlWithoutScheme = url.replace(/^https?:\/\//, '');
					return redirectBaseUrl + urlWithoutScheme;
				});
				
				// 将更新后的URL重新写入m3u8Content
				let updatedM3u8Content = m3u8Content;
				for (let i = 0; i < tsUrls.length; i++) {
					const originalUrlWithoutScheme = tsUrls[i]
					updatedM3u8Content = updatedM3u8Content.replace(tsUrls[i], updatedTsUrls[i]);
				}

				// 这里可以返回更新后的m3u8内容，或者进行其他需要的操作
				return updatedM3u8Content;

			} else {
				// 其他状态码处理
				console.log('Response Data:', response);

				return {
					msg: "其他状态码处理",
					data: response
				}
			}
		} catch (error) {
			// 错误处理
			console.error('Request failed:', error);

			return {
				msg: "error",
				data: error
			}
		}
	}

	return "...."

	// 创建一个临时文件路径
	const tempDir = os.tmpdir();
	const tempFileName = `stream-${Date.now()}-${fs_id}.m3u8`;
	const tempFilePath = path.join(tempDir, tempFileName);

	// 将M3U8内容写入到临时文件
	fs.writeFileSync(tempFilePath, m3u8Content, 'utf8');

	// 读取刚刚写入的文件并上传到uniCloud云存储
	const cloudPath = `m3u8files/${tempFileName}`; // 你希望存储的云路径

	// 使用uniCloud.uploadFile API上传文件
	let uploadResult;
	try {
		const fileContent = fs.readFileSync(tempFilePath);
		uploadResult = await uniCloud.uploadFile({
			cloudPath: cloudPath,
			fileContent: fileContent,
			cloudPathAsRealPath: true // 是否以cloudPath作为云端文件绝对路径
		});
	} catch (error) {
		// 处理文件上传错误
		console.error('File upload failed:', error);
	} finally {
		// 清理临时文件
		fs.unlinkSync(tempFilePath);
	}

	// 返回上传结果
	return uploadResult;
}
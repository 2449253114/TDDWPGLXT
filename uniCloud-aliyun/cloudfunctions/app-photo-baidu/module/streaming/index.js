module.exports = {
	streaming: require('./get-streaming'), // 获取M3U8视频流（一刻相册）
	download: require('./get-download'), // 获取MP4视频下载URL（一刻相册）(仅用于apipost测试)
	getPlayUrlMP4: require('./get-play-url-mp4'), // 获取MP4视频下载URL（一刻相册）(仅用于APP端，因为需要请求头播放)
	//getPlayUrlM3U8: require('./get-play-url-m3u8'), // 获取M3U8视频播放地址（一刻相册）（用于Web端和APP端，无需请求头播放）
	getPlayUrlM3U8New: require('./get-play-url-m3u8-new'), // 新的获取M3U8视频的地址
	getPlayUrlM3U8NewTest: require('./get-play-url-m3u8-new-test'), // 新的获取M3U8视频的地址
	
	getPlayUrlM3U8_V3: require('./get-play-url-m3u8-v3') // TODO 2024-0802-2214 最新V3版本
}
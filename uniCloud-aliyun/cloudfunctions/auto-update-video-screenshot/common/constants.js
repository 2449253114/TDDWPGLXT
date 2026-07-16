const db = uniCloud.database()
const dbCmd = db.command

// 视频封面和视频截帧拼图
const videoPuzzleCollectionName = 'yike-video-puzzle'
const videoPuzzleCollection = db.collection(videoPuzzleCollectionName)

// 视频截帧图相册的光标（光标，用于请求下一页的唯一标识）
const videoShotCursorCollectionName = 'admin-auto-video-screenshot'
const videoShotCursorCollection = db.collection(videoShotCursorCollectionName)

// 一刻相册账号cookie（请求时需要的cookie）
const accountCookieCollectionName = "yike-account-cookie"
const accountCookieCollection = db.collection(accountCookieCollectionName)

// 视频封面和视频截帧拼图的相册ID
const videoPuzzleAlbumId = "2661195838967781205" // String类型

module.exports = {
	dbCmd,
	videoPuzzleAlbumId,
	videoPuzzleCollection,
	videoShotCursorCollection,
	accountCookieCollection
}


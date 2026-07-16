const db = uniCloud.database()
const dbCmd = db.command

// 用户数据库表
const userCollectionName = 'user-accounts'
const userCollection = db.collection(userCollectionName)

// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 全部相册
const albumCollectionName = 'yike-albums'
const albumCollection = db.collection(albumCollectionName)

// 全部人物
const personCollectionName = 'yike-person'
const personCollection = db.collection(personCollectionName)

// 全部同志漫画
const comicCollectionName = 'gay-comics'
const comicCollection = db.collection(comicCollectionName)

// 我的购买
const userPurchasesCollectionName = 'user-purchases-yike'
const userPurchasesCollection = db.collection(userPurchasesCollectionName)

// 相册文件 - m3u8文件
const m3u8FileCollectionName = 'yike-album-files-m3u8file'
const m3u8FileCollection = db.collection(m3u8FileCollectionName)

// uniCloud云储存 - 记录已失效的m3u8文件URL，用于清理
const invalidM3u8FilesCollectionName = "yike-invalid-m3u8-files"
const invalidM3u8FilesCollection = db.collection(invalidM3u8FilesCollectionName)

// 表示每小时的一刻相册的文件请求次数计数
const hourlyRequestCountCollectionName = "yike-hourly-request-count"
const hourlyRequestCountCollection = db.collection(hourlyRequestCountCollectionName)

// 视频封面和视频截帧拼图
const videoPuzzleCollectionName = 'yike-video-puzzle'
const videoPuzzleCollection = db.collection(videoPuzzleCollectionName)

const appConfigCollectionName = 'system-app-config'
const appConfigCollection = db.collection(appConfigCollectionName)

module.exports = {
	dbCmd,
	fileCollection,
	albumCollection,
	albumCollectionName,
	personCollection,
	comicCollection,
	userCollection,
	userPurchasesCollection,
	m3u8FileCollection,
	appConfigCollection,
	invalidM3u8FilesCollection,
	hourlyRequestCountCollection,
	videoPuzzleCollection
}


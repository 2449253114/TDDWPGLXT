const db = uniCloud.database()
const dbCmd = db.command

// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 全部相册
const albumCollectionName = 'yike-albums'
const albumCollection = db.collection(albumCollectionName)

// 同志网剧
const tvSeriesCollectionName = 'yike-tv-series'
const tvSeriesCollection = db.collection(tvSeriesCollectionName)

module.exports = {
	dbCmd,
	fileCollection,
	albumCollection,
	tvSeriesCollection
}


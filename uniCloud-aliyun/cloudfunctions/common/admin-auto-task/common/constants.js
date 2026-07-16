const db = uniCloud.database()
const dbCmd = db.command

// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 全部相册
const albumCollectionName = 'yike-albums'
const albumCollection = db.collection(albumCollectionName)

// 后端自动化任务
const adminAutoTaskCollectionName = 'admin-auto-task'
const adminAutoTaskCollection = db.collection(adminAutoTaskCollectionName)

module.exports = {
	dbCmd,
	fileCollection,
	albumCollection,
	adminAutoTaskCollection
}


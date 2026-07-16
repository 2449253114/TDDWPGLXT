const db = uniCloud.database()
const dbCmd = db.command

// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 全部相册
const albumCollectionName = 'yike-albums'
const albumCollection = db.collection(albumCollectionName)

// 全部人物
const personCollectionName = 'yike-person'
const personCollection = db.collection(personCollectionName)


// 文件与人物关联表
const associationsFilePerson = 'associations_file_person'
const associationsFilePersonCollection = db.collection(associationsFilePerson)


module.exports = {
	dbCmd,
	fileCollection,
	albumCollection,
	personCollection,
	associationsFilePersonCollection
}


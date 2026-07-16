const db = uniCloud.database()
const dbCmd = db.command

// 全部人物
const personCollectionName = 'yike-person'
const personCollection = db.collection(personCollectionName)


module.exports = {
	dbCmd,
	personCollection
}


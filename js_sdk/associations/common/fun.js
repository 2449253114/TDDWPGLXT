const {
	dbCmd,
	fileCollection,
	albumCollection,
	personCollection
} = require('./constants')

// 获取全部人物
exports.getPerson = async function () {
	const res = await personCollection.where({ status: dbCmd.in([1, 2]) }).get()
	return res.result.data
}

// 获取全部相册
exports.getAlbum = async function () {
	const res = await albumCollection.get()
	return res.result.data

}

// 获取全部相册文件
exports.getFile = async function () {
	const res = await fileCollection.get()
	return res.result.data
}




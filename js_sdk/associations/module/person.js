const {
	dbCmd,
	personCollection
} = require('../common/constants')

// 获取全部人物
exports.getPerson = async function () {
	const res = await personCollection.where({ status: dbCmd.in([1, 2]) }).limit(1000).get()
	return res.result.data
}

// 批量查询人物
exports.getPersonByIds = async function (personIds) {
	const res = await personCollection.where({ person_id: dbCmd.in(personIds) }).limit(1000).get()
	return res.result.data
}
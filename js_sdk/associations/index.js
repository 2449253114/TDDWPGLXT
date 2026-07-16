const {
	dbCmd,
	fileCollection,
	albumCollection,
	personCollection,
	associationsFilePersonCollection
} = require('./common/constants')

const {
	getPerson,
	getPersonByIds
} = require('./module/person')


module.exports = {
	getPerson,
	getPersonByIds
}

// 用vs code 写，有豆包ai

/**
 * 批量添加文件与人物关联关系
 * @param {Array<Number>} fileIds 文件fsid数组
 * @param {Array<Number>} personIds 
 * @returns {Number} 成功添加的数量
 */
module.exports.addAssociationsFilePerson = async function (fileIds, personIds) {
	console.log('fileIds', fileIds)
	// [
	// 	133386812224005
	// ]
	console.log('personIds', personIds)
	// [
	// 	130299,
	// 	130298
	// ]


	// 检查是否存在给定文件ID和人员ID的关联记录
	const res = await associationsFilePersonCollection.where({
		file_id: dbCmd.in(fileIds),
		person_id: dbCmd.in(personIds)
	}).limit(1000).get()

	console.log('res', res)
	// {
	// 	"result": {
	// 		"code": 0,
	// 		"errCode": 0,
	// 		"message": "",
	// 		"errMsg": "",
	// 		"systemInfo": [],
	// 		"affectedDocs": 2,
	// 		"data": [
	// 			{
	// 				"_id": "66d1797b7c8de41100bd6c1e",
	// 				"create_date": 1725004155137,
	// 				"file_id": 133386812224005,
	// 				"person_id": 130299
	// 			},
	// 			{
	// 				"_id": "66d1b0768620664def7257aa",
	// 				"create_date": 1725018230295,
	// 				"file_id": 133386812224005,
	// 				"person_id": 130298
	// 			}
	// 		]
	// 	}
	// }


	// 创建一个空对象，用于存储文件ID和对应的数据
	const fileIdsMap = {};

	// 将查询结果中的每个文件 ID 及其对应的数据存储在 map 中
	res.result.data.forEach(item => {
		if (!fileIdsMap[item.file_id]) {
			fileIdsMap[item.file_id] = [];
		}
		fileIdsMap[item.file_id].push(item.person_id);
	});

	console.log('fileIdsMap', fileIdsMap)

	// 存储需要添加的关联关系数据
	const addData = [];

	// 遍历传入的文件 ID 和人员 ID，检查是否需要添加关联关系
	fileIds.forEach(fileId => {
		personIds.forEach(personId => {
			if (!fileIdsMap[fileId] || !fileIdsMap[fileId].includes(personId)) {
				addData.push({
					file_id: fileId,
					person_id: personId
				});
			}
		});
	});
	console.log('addData', addData)

	// 如果有需要添加的文件 ID，则构造完整的添加数据并批量添加
	if (addData.length > 0) {
		const { result: { inserted } } = await associationsFilePersonCollection.add(addData);
		return inserted; // 新增的数量
	} else {
		return 0;
	}
}

/**
 * 批量删除文件与人物关联关系
 * @param {Array<Number>} fileIds 文件fsid数组
 * @param {Array<Number>} personIds 
 * @returns {Number} 成功删除的数量
 */
module.exports.deleteAssociationsFilePerson = async function (fileIds, personIds) {
	const { result: { deleted } } = await associationsFilePersonCollection.where({
		file_id: dbCmd.in(fileIds),
		person_id: dbCmd.in(personIds)
	}).remove()
	return deleted; // 删除的数量
}




/**
 * 批量获取文件与人物关联关系，只用传文件id
 * @param {Array<Number>} fileIds 文件fsid数组
 * @returns {Array<{file_id: Number, person_id: Number}>}
 */
module.exports.getAssociationsFilePerson = async function (fileIds) {
	const res = await associationsFilePersonCollection.where({
		file_id: dbCmd.in(fileIds)
	}).field({ file_id: true, person_id: true }).limit(1000).get()
	return res.result.data
}
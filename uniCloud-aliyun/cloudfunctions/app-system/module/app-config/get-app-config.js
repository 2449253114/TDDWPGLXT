const {
	appConfigCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

module.exports = async function () {
	// 获取配置
	const res = await appConfigCollection.get()
	if (res.data && res.data.length > 0) {
		return createResponse(STATE_CODE.SUCCESS, "获取成功", res.data[0])
	}
	return createResponse(STATE_CODE.ERROR, "获取失败")
}


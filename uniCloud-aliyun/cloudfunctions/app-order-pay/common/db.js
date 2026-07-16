const {
	dbCmd,
	payOrdersCollection,
	shopGoodsCollection,
	userCollection
} = require('./constants')

/**
 * 查询用户信息
 * @param {String} userId 用户ID
 * @returns {Object|null} 用户信息，查询失败返回 null
 */
async function getUserInfo(userId) {
	try {
		const queryUserResult = await userCollection.where({
			_id: userId
		}).get();
		return queryUserResult.data[0] || null;
	} catch (error) {
		console.error("数据库查询失败:", error);
		return null;
	}
}

/**
 * 查询27分钟内的未支付订单
 * @param {String} userId 用户ID
 * @returns {Object|null} 未支付订单，不存在则返回 null
 */
async function getExistingOrder(userId) {
	const timestampNow = Math.floor(Date.now() / 1000); // 秒单位
	const timestampLimitStart = timestampNow - 27 * 60; // 27分钟前的时间戳

	try {
		const existingOrder = await payOrdersCollection
			.where({
				user_id: userId,
				create_time: dbCmd.gt(timestampLimitStart).and(dbCmd.lt(timestampNow)),
				status: 0 // 未支付状态
			})
			.orderBy("create_time", "desc")
			.get();

		return existingOrder.data[0] || null;
	} catch (error) {
		console.error("查询未支付订单失败:", error);
		return null;
	}
}

/**
 * 获取商品信息
 * @param {String} goodsId 商品ID
 * @returns {Object|null} 商品信息，查询失败返回 null
 */
async function getGoodsInfo(goodsId) {
	try {
		const goodsInfo = await shopGoodsCollection.where({
			_id: goodsId
		}).get();
		return goodsInfo.data[0] || null;
	} catch (error) {
		console.error("查询商品信息失败:", error);
		return null;
	}
}

module.exports = {
	getUserInfo,
	getExistingOrder,
	getGoodsInfo
};
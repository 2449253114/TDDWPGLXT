const db = uniCloud.database()
const dbCmd = db.command

// 用户数据库表
const userCollectionName = 'user-accounts'
const userCollection = db.collection(userCollectionName)

// 用户金币变更数据库表
const userCoinCollectionName = 'user-coin-changes'
const userCoinCollection = db.collection(userCoinCollectionName)

// 用户VIP会员更变数据库表
const userVipCollectionName = 'user-vip-changes'
const userVipCollection = db.collection(userVipCollectionName)

// 支付订单数据库表
const payOrdersCollectionName = 'user-payment-orders'
const payOrdersCollection = db.collection(payOrdersCollectionName)

// APP系统通知数据库表
const appSystemNoticeCollectionName = 'system-app-notice'
const appSystemNoticeCollection = db.collection(appSystemNoticeCollectionName)

// 商品列表
const shopGoodsCollectionName = 'shop-goods'
const shopGoodsCollection = db.collection(shopGoodsCollectionName)

module.exports = {
	dbCmd,
	userCollection,
	userCoinCollection,
	userVipCollection,
	payOrdersCollection,
	appSystemNoticeCollection,
	shopGoodsCollection
}


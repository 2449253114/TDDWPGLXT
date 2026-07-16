const db = uniCloud.database()
const dbCmd = db.command

// 商品列表
const shopGoodsCollectionName = 'shop-goods'
const shopGoodsCollection = db.collection(shopGoodsCollectionName)

const appConfigCollectionName = 'system-app-config'
const appConfigCollection = db.collection(appConfigCollectionName)

module.exports = {
	dbCmd,
	shopGoodsCollection,
	appConfigCollection
}


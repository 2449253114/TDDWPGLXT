const db = uniCloud.database()
const dbCmd = db.command

// 用户数据库表
const userCollectionName = 'user-accounts'
const userCollection = db.collection(userCollectionName)

// 用户邀请其他用户数据库表（用户 - 邀请用户表）
const inviteUserCollectionName = 'user-invitations'
const inviteUserCollection = db.collection(inviteUserCollectionName)

// 用户金币变更数据库表
const userScoresCollectionName = 'user-coin-changes'
const userScoresCollection = db.collection(userScoresCollectionName)

// 用户VIP会员更变数据库表
const userVipCollectionName = 'user-vip-changes'
const userVipCollection = db.collection(userVipCollectionName)

// 支付订单数据库表
const payOrdersCollectionName = 'user-payment-orders'
const payOrdersCollection = db.collection(payOrdersCollectionName)

// 全部邀请码数据库表
const allInvitationCodesCollectionName = 'user-all-Invitation-codes'
const allInvitationCodesCollection = db.collection(allInvitationCodesCollectionName)

// APP系统通知数据库表
const appSystemNoticeCollectionName = 'system-app-notice'
const appSystemNoticeCollection = db.collection(appSystemNoticeCollectionName)

// 我的购买
const userPurchasesCollectionName = 'user-purchases-yike'
const userPurchasesCollection = db.collection(userPurchasesCollectionName)

// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 全部相册
const albumCollectionName = 'yike-albums'
const albumCollection = db.collection(albumCollectionName)


module.exports = {
	dbCmd,
	userCollection,
	inviteUserCollection,
	userScoresCollection,
	userVipCollection,
	payOrdersCollection,
	allInvitationCodesCollection,
	appSystemNoticeCollection,
	userPurchasesCollection,
	fileCollectionName,
	fileCollection,
	albumCollectionName,
	albumCollection
	
}


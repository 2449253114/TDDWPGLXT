module.exports = {
	getUserInfo: require('./get-user-info'), // 获取用户信息
    updateUserInfo: require('./update-user-info'), // 更新用户信息
    bindInvitation: require('./invitation/bind-Invitation'), // 绑定邀请关系
    invitationRecords: require('./invitation/invitation-records'), // 获取邀请记录
	myInviterInfo: require('./invitation/my-inviter-info'), // 获取我的邀请人信息
	addPurchase: require('./purchases/add-my-purchases'), // 添加我的购买
	getPurchase: require('./purchases/get-my-purchases') // 获取我的购买
}
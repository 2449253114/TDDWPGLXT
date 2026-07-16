const {
	userCollection,
	userVipCollection,
	payOrdersCollection,
	allInvitationCodesCollection,
	appSystemNoticeCollection
} = require('../../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../../common/response')

const {
	sendSystemNotice,
	extendUserVipExpiration,
	addVipChangeRecord,
	addOrderRecord
} = require('../../../common/fun')

/**
 * 手动绑定邀请关系的函数（用于绑定用户和邀请人的关系）
 * @url POST /api/users/bind-invitation
 * @param {Object}  params
 * @param {String} 	params.inviteCode 用户输入的邀请码（邀请人的邀请码）
 * @param {String} 	params.userId 当前用户的ID
 * @returns {Object} 返回绑定结果
 */
module.exports = async function () {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let inviteCode, userId;
	try {
		({
			inviteCode,
			userId
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	// 查询邀请码是否存在
	let inviterResult;
	try {
		inviterResult = await userCollection.where({
			my_invite_code: inviteCode // 邀请码字段
		}).get();
	} catch (error) {
		console.error(error);
		return createResponse(STATE_CODE.ERROR, "数据库查询失败");
	}

	// 检查查询结果，绑定邀请关系
	if (inviterResult['affectedDocs'] === 1) {
		const inviter = inviterResult['data'][0];

		// 检查用户是否已经被邀请
		let currentUserResult = await userCollection.doc(userId).get();
		if (currentUserResult['affectedDocs'] === 1) {
			const currentUser = currentUserResult['data'][0];

			// 如果当前用户已有邀请人，则不能再次绑定
			if (currentUser.inviter_uid) {
				return createResponse(STATE_CODE.ERROR, "已存在邀请关系，不能重复绑定");
			}

			
			try {
				// 绑定邀请关系
				await userCollection.doc(userId).update({
					inviter_uid: inviter._id, // 邀请人ID
					invite_time: Date.now() // 绑定时间
				});
				
				// 异步发送通知给邀请人和被邀请人
				sendInvitationNotices(appSystemNoticeCollection, inviter._id, userId); // 这个里面已修改为3天
				
				// 延长邀请人和被邀请人的VIP时间
				await extendUserVipExpiration(userCollection, inviter._id, 3);
				await extendUserVipExpiration(userCollection, userId, 3);

				// 添加会员变更记录
  				await addVipChangeRecord(userVipCollection, inviter._id, 3, '邀请赠送VIP');
  				await addVipChangeRecord(userVipCollection, userId, 3, '受邀赠送VIP');
				
				// 添加订单记录
				await addOrderRecord(payOrdersCollection, inviter._id, 3, '邀请赠送VIP（3天）');
				await addOrderRecord(payOrdersCollection, userId, 3, '受邀赠送VIP（3天）');
				
				 // 获取邀请人已邀请的人数
				const inviterCountResult = await userCollection.where({
					inviter_uid: inviter._id
				}).count();
				
				// 如果邀请人已邀请了50人，授予他们永久VIP会员资格
				if (inviterCountResult.total >= 50) {
					let dayCount = 365 // 默认为365
					if (inviterCountResult.total == 50) {
						dayCount = 9999
					}
					
					// 邀请总数
					let inviterCount = inviterCountResult.total
					
					// 延长邀请人的VIP时间
					await extendUserVipExpiration(userCollection, inviter._id, dayCount);
					
					// 添加会员变更记录
					await addVipChangeRecord(userVipCollection, inviter._id, dayCount, '邀请赠送永久VIP'); // 9999天 = 27年多
					
					// 添加订单记录  |  这里的天数要写死，只有首次50才是真实的9999天
					await addOrderRecord(payOrdersCollection, inviter._id, 9999, '邀请赠送永久VIP（9999天）');

					// 给邀请人发送关于永久VIP奖励的系统通知
					sendSystemNotice(appSystemNoticeCollection, {
						user_id: inviter._id,
						title: "永久VIP会员奖励",
						content: `恭喜！您已成功邀请了 ${inviterCount} 位用户，现在您已获得永久VIP会员资格。`
					});
				}
				

				return createResponse(STATE_CODE.SUCCESS, "绑定邀请关系成功");
			} catch (error) {
				console.error(error);
				return createResponse(STATE_CODE.ERROR, `更新邀请关系失败${error.message}`);
			}
		} else {
			return createResponse(STATE_CODE.ERROR, "当前用户不存在");
		}
	} else {
		return createResponse(STATE_CODE.ERROR, "邀请码不存在");
	}
}

/**
 * 给邀请人和被邀请人发送通知
 * @param {Collection} appSystemNoticeCollection 
 * @param {String} inviterId 邀请人的用户ID（邀请者ID）
 * @param {String} invitedId 被邀请人的用户ID（受邀Id）
 */
function sendInvitationNotices(
	appSystemNoticeCollection,
	inviterId, 
	invitedId
) {
    // 发送通知给邀请人
    const inviterNoticeContent = "亲爱的用户，您的朋友已成功使用您的邀请码加入我们！作为感谢，我们已为您的账户赠送3天VIP会员。请注意，我们最近对会员赠送政策进行了一些优化调整。现在您可以享受所有VIP特权！祝您使用愉快。";
    sendSystemNotice(appSystemNoticeCollection,{
        user_id: inviterId,
        title: "邀请成功通知",
        content: inviterNoticeContent
    });

    // 发送通知给被邀请人
    const invitedNoticeContent = "亲爱的用户，恭喜您成功激活邀请码！作为受邀奖励，我们已为您的账户赠送3天VIP会员。请注意，我们最近对会员赠送政策进行了一些优化调整。现在您可以享受所有VIP特权！感谢您的加入。";
    sendSystemNotice(appSystemNoticeCollection,{
        user_id: invitedId,
        title: "激活邀请码通知",
        content: invitedNoticeContent
    });
}


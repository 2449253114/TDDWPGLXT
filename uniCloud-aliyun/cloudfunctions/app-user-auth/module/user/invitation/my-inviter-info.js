const {
    userCollection
} = require('../../../common/constants');

const {
    STATE_CODE,
    createResponse
} = require('../../../common/response');

/**
 * 查询我的邀请人信息
 * @url GET /api/users/my-inviter-info
 * @param {String} userId 用户的ID
 * @returns {Object} 返回我的邀请人信息
 */
module.exports = async function() {
    // 获取url化时的http信息
    const httpInfo = this.getHttpInfo()
    let body = httpInfo.body // 获取客户端传递的数据，如JSON
    if (httpInfo.isBase64Encoded) { // 是否base64格式
        body = Buffer.from(body, 'base64').toString()
    }

    let userId;
    try {
        ({
            userId
        } = JSON.parse(body));
    } catch (error) {
        return createResponse(STATE_CODE.FAIL, "无效的请求数据");
    }

    let myInviterInfoResult;
    try {
        // 查询当前用户信息以获取邀请人ID
        const currentUserResult = await userCollection.doc(userId).get();
        if (currentUserResult.affectedDocs === 1) {
            const currentUser = currentUserResult.data[0];
            // 如果当前用户有邀请人，则查询邀请人信息
            if (currentUser.inviter_uid) {
                const inviterId = currentUser.inviter_uid;
                myInviterInfoResult = await userCollection.doc(inviterId)
				.field({
					device_oaid: true
				}).get();
                if (myInviterInfoResult.affectedDocs === 1) {
					const inviterInfo = myInviterInfoResult.data[0]; // 邀请人信息
                    // 处理数据，将device_oaid转换成前三位和后四位显示，中间用*代替，保留11位
					if (inviterInfo.device_oaid) {
						const oaid = inviterInfo.device_oaid;
						inviterInfo.device_oaid = `${oaid.substring(0, 3)}****${oaid.substring(oaid.length - 4)}`;
						// 删除用户id
						delete inviterInfo._id
					}
					// 构造响应体
					let response = {
						inviterInfo: inviterInfo ,// 处理后的邀请人信息，
						invite_time: currentUser.invite_time // 我受邀的时间
					};
                    return createResponse(STATE_CODE.SUCCESS, "查询邀请人信息成功", response);
                }
            }
            return createResponse(STATE_CODE.FAIL, "没有找到邀请人信息");
        }
        return createResponse(STATE_CODE.FAIL, "当前用户不存在");
    } catch (error) {
        console.error(error);
        return createResponse(STATE_CODE.ERROR, "查询邀请人信息失败");
    }
}
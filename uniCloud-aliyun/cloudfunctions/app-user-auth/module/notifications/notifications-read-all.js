const {
    appSystemNoticeCollection
} = require('../../common/constants')

const {
    STATE_CODE,
    createResponse
} = require('../../common/response')

/**
 * 将当前用户的系统通知全部标记为已读
 * @url POST /api/users/notifications-read-all
 * @param {Object}  params
 * @param {String}  params.userId 用户的ID
 * @returns {Object} 返回操作结果
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

    try {
        await appSystemNoticeCollection.where({
            user_id: userId // 确保这是存储在通知文档中的用户ID字段
        }).update({
            is_read: true, // 更新is_read字段为true
        });

        return createResponse(STATE_CODE.SUCCESS, "全部已读成功");
    } catch (error) {
        console.error('Error marking all system notifications as read:', error);
        return createResponse(STATE_CODE.ERROR, "全部已读失败");
    }
}
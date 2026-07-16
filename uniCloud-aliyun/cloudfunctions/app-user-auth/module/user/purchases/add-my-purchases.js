const {
	dbCmd,
	userCollection,
	userPurchasesCollection,
	userScoresCollection,
	appSystemNoticeCollection,
	fileCollection,
	albumCollection
} = require('../../../common/constants');

const {
	STATE_CODE,
	createResponse
} = require('../../../common/response');

const {
	sendSystemNotice
} = require('../../../common/fun');

/**
 * 添加我的购买
 * @url POST /api/users/add-purchase
 * @param {Object} params
 * @param {String} params.user_id 用户ID
 * @param {String} params.fs_id 文件ID（可选）
 * @param {String} params.album_id 相册ID（可选）
 * @returns {Object} 返回添加结果
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo();
	let body = httpInfo.body; // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString();
	}

	let user_id, fs_id, album_id;
	try {
		({
			user_id,
			fs_id,
			album_id
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	// 检查用户是否存在
	const userResult = await userCollection.doc(user_id).get();
	if (userResult.affectedDocs !== 1) {
		return createResponse(STATE_CODE.FAIL, "用户不存在");
	}

	const userInfo = userResult.data[0];
	
	    // 检查是否已经购买
	    let existingPurchase;
	    if (fs_id) {
	        existingPurchase = await userPurchasesCollection.where({
	            user_id: user_id,
	            purchase_type: 1,
	            file_id: fs_id
	        }).get();
	    } else if (album_id) {
	        existingPurchase = await userPurchasesCollection.where({
	            user_id: user_id,
	            purchase_type: 0,
	            album_id: album_id
	        }).get();
	    }
	    if (existingPurchase && existingPurchase.affectedDocs > 0) {
	        return createResponse(STATE_CODE.FAIL, "您已购买过此内容，无需重复购买");
	    }
	
	// 检查是文件购买还是相册购买，并扣除相应金币
	let price = 0;
	let purchase_type;
	if (fs_id) {
		price = 10; // 文件购买价格
		purchase_type = 1; // 文件类型
	} else if (album_id) {
		// 查询相册价格
		const albumResult = await albumCollection.where({
			album_id: album_id
		}).get();
		if (albumResult.affectedDocs !== 1) {
			return createResponse(STATE_CODE.FAIL, "相册不存在");
		}
		price = albumResult.data[0].price || 0;
		purchase_type = 0; // 相册类型
	} else {
		return createResponse(STATE_CODE.FAIL, "购买类型未指定");
	}

	// 扣除用户金币
	let userCoin = userInfo.coin || 0; // 如果用户的coins字段不存在，使用0作为默认值
	if (userCoin < price) {
		return createResponse(STATE_CODE.FAIL, "金币不足");
	}

	await userCollection.doc(user_id).update({
		coin: userCoin - price
	});

	try {
	  // 添加到我的购买记录
	  await userPurchasesCollection.add({
	    user_id,
	    purchase_type,
	    album_id,
	    file_id: fs_id,
	    purchase_time: Date.now(),
	    price
	  });
	
	  // 发送系统通知
	  const noticeTitle = `购买${purchase_type === 0 ? "相册" : "文件"}成功`;
	  const noticeContent = `您已成功购买${purchase_type === 0 ? "相册" : "文件"}，共消费${price}金币。`;
	  await sendSystemNotice(appSystemNoticeCollection, {
	    user_id,
	    title: noticeTitle,
	    content: noticeContent
	  });
	
	  return createResponse(STATE_CODE.SUCCESS, "购买成功");
	} catch (error) {
	  console.error(error);
	  // 回滚之前的金币扣减操作，确保数据一致性
	  await userCollection.doc(user_id).update({
	    coin: userCoin
	  });
	  return createResponse(STATE_CODE.ERROR, "购买失败，请稍后重试");
	}
	
};
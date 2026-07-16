// 检查用户是否VIP以及VIP是否已过期 
function checkVipStatus(userInfo) {
	const now = Date.now();
	if (userInfo.vip && userInfo.vip_expire_date > now) {
		// VIP用户且VIP未过期
		return true
	} else {
		// 非VIP用户或VIP已过期
		return false
	}
}

/**
 * 更新用户的最后在线时间戳。
 * 当用户回到Home页时，该函数被调用，以记录用户的最新在线状态。
 * 所以不需要再登录注册接口中也使用该函数更新字段
 */
function updateUserLastOnline() {
	// 使用当前时间戳更新用户的最后在线时间戳
	const last_online_timestamp = Date.now();
	return last_online_timestamp
}


/**
 * 发送系统通知到用户
 * @param {Collection} appSystemNoticeCodesCollection
 * @param {Object} noticeData 包含通知数据的对象
 */
function sendSystemNotice(
	appSystemNoticeCollection,
	noticeData
) {
	// 添加通知到系统通知集合
	appSystemNoticeCollection.add({
		title: noticeData.title,
		content: noticeData.content,
		user_id: noticeData.user_id,
		is_read: false, // 通知未读
		create_date: Date.now() // 添加创建时间
	});
}

/**
 * 延长用户的VIP有效期
 * @param {Collection} userCollection
 * @param {String} userId 用户的ID
 * @param {Number} daysToAdd 要增加的VIP天数
 */
async function extendUserVipExpiration(
	userCollection,
	userId,
	daysToAdd
) {
	try {
		// 获取用户当前的VIP到期时间
		const userResult = await userCollection.doc(userId).get();
		if (userResult['affectedDocs'] === 1) {
			const userInfo = userResult['data'][0];
			let newExpireDate;

			// 如果VIP已过期或不存在，从当前时间开始计算新的到期时间
			if (!userInfo.vip || userInfo.vip_expire_date < Date.now()) {
				newExpireDate = Date.now() + daysToAdd * 24 * 60 * 60 * 1000;
			} else {
				// 如果VIP未过期，从现有到期时间开始增加天数
				newExpireDate = userInfo.vip_expire_date + daysToAdd * 24 * 60 * 60 * 1000;
			}

			// 更新用户的VIP状态和到期时间
			await userCollection.doc(userId).update({
				vip: true,
				vip_expire_date: newExpireDate
			});
			return {
				success: true,
				message: "VIP有效期延长成功"
			};
		} else {
			return {
				success: false,
				message: "用户不存在"
			};
		}
	} catch (error) {
		console.error('Error extending VIP expiration:', error);
		return {
			success: false,
			message: "VIP有效期延长失败"
		};
	}
}


/**
 * 新增会员变更记录
 * @param {Collection} userVipCollection 会员变更记录表的Collection
 * @param {String} userId 用户的ID
 * @param {Number} daysAdded 添加的VIP天数
 * @param {String} comment 会员变更的描述
 */
async function addVipChangeRecord(
	userVipCollection,
	userId,
	daysAdded,
	comment
) {
	const now = Date.now();

	try {
		await userVipCollection.add({
			user_id: userId,
			time_limit_day: daysAdded, // 会员开通期限天数（单位：天）
			vip_expire_date: now + daysAdded * 24 * 60 * 60 * 1000, // 会员有效期至
			comment: comment, // 变更原因
			create_date: now,
			out_trade_no: 'VIPZS' + now, // 交易号
			total_fee: 0, // 交易金额
		});
	} catch (error) {
		console.error('Error adding VIP change record:', error);
	}
}

/**
 * 新增订单记录（用于邀请赠送VIP和注册赠送VIP的订单记录标记）
 * @param {Collection} ordersCollection 统一订单记录表的Collection
 * @param {String} userId 用户的ID
 * @param {Number} dayCount 添加的VIP天数
 * @param {String} description 订单的描述
 */
async function addOrderRecord(
	ordersCollection,
	userId,
	dayCount,
	description
) {
	const now = Date.now();
	try {
		await ordersCollection.add({
			order_type: 1,// 订单类型 0：金币充值 1：会员开通
			user_id: userId,
			day_count: dayCount,
			body: description,// 商品描述
			out_trade_no: 'VIPZS' + now, // 交易号
			total_fee: 0,// 支付金额
			status: 1,// 订单状态 0：未支付 1：已支付
			create_time: Math.floor(Date.now() / 1000),// 秒单位
			// 其他需要的字段...
		});
	} catch (error) {
		console.error('添加订单记录失败', error);
	}
}



module.exports = {
	checkVipStatus,
	sendSystemNotice,
	extendUserVipExpiration,
	addVipChangeRecord,
	addOrderRecord,
	updateUserLastOnline
}
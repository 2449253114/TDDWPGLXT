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
		if (userResult.data.length === 1) {
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


// 邀请码沿用历史格式：6 位数字或大写字母。后台客服开通会员、取消邀请人等页面都按这个格式输入
const INVITE_CODE_CHARACTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const INVITE_CODE_LENGTH = 6;
// 36^6 约 21.8 亿种组合，每次碰撞概率约为“已占用数 / 21.8 亿”，连续 5 次失败基本只会是数据库故障
const INVITE_CODE_MAX_ATTEMPTS = 5;

/** 随机生成一个邀请码候选值，不保证未被占用。 */
function generateInviteCodeCandidate() {
	let code = '';
	for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
		code += INVITE_CODE_CHARACTERS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARACTERS.length));
	}
	return code;
}

/**
 * 生成并占用一个未被使用的邀请码（注册时调用）。
 * 流程：随机生成 → 同时查询登记表和用户表是否已有 → 都没有则写入登记表完成占用。
 * - 登记表 user-invite-codes 的历史数据由迁移云对象 migrate-invite-codes 从旧 codes 数组写入，
 *   包含已删除用户的码，这些码也不再分配。
 * - 再查 user-accounts.my_invite_code（唯一索引，单次点查）：旧数组漏掉的在用码、后台手工新增用户的码都不会被分配。
 * - 查重与写入之间若被并发注册抢先写入同一个码，code 唯一索引会让本次写入失败，随后换一个码重试。
 * @param {Collection} inviteCodeCollection user-invite-codes 集合
 * @param {Collection} userCollection user-accounts 集合
 * @returns {Promise<String>} 已写入登记表的邀请码
 * @throws {Error} 连续 INVITE_CODE_MAX_ATTEMPTS 次都没能占用成功时抛出，调用方应按注册失败处理
 */
async function reserveInviteCode(inviteCodeCollection, userCollection) {
	let lastError = null;
	for (let attempt = 1; attempt <= INVITE_CODE_MAX_ATTEMPTS; attempt++) {
		const code = generateInviteCodeCandidate();
		const [registered, ownedByUser] = await Promise.all([
			inviteCodeCollection.where({ code }).limit(1).get(),
			userCollection.where({ my_invite_code: code }).field({ _id: true }).limit(1).get()
		]);
		if (registered.data.length > 0 || ownedByUser.data.length > 0) {
			continue;
		}
		try {
			await inviteCodeCollection.add({
				code,
				source: 'register',
				create_date: Date.now()
			});
			return code;
		} catch (error) {
			lastError = error;
			console.warn(`占用邀请码 ${code} 失败，第 ${attempt} 次`, error);
		}
	}
	throw new Error(`连续 ${INVITE_CODE_MAX_ATTEMPTS} 次未能占用邀请码${lastError ? '：' + lastError.message : ''}`);
}


module.exports = {
	checkVipStatus,
	sendSystemNotice,
	extendUserVipExpiration,
	addVipChangeRecord,
	addOrderRecord,
	updateUserLastOnline,
	reserveInviteCode
}
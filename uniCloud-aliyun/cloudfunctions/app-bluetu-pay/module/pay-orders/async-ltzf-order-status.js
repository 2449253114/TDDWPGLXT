const {
	dbCmd,
	userCollection,
	userCoinCollection,
	userVipCollection,
	payOrdersCollection,
	appSystemNoticeCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

const {
	wxPaySign,
	checkPaymentStatusFromThirdParty,
	sendSystemNotice
} = require('../../common/fun')

const {
	payConfig
} = require('../../common/pay-config')

/**
 * 同步支付状态函数
 * 用于在应用重启或首页或其他情况下，同步并确认第三方支付平台的支付状态，并发放奖励。
 * 会检查本地数据库中标记为未同步的订单，并更新其状态。
 * > is_payment_status_checked < 标识订单的支付状态是否已经在第三方支付平台进行了查询。当用户完成支付操作后，如果由于应用被重启或其他原因导致本地支付状态未及时更新，这个字段会在重启后用来检查并同步第三方支付平台的支付状态。true 表示已检查并确认了第三方支付平台的支付状态，无论是支付完成还是未完成；false 表示本地数据库状态尚未与第三方支付平台同步。这确保了即使在应用重启后，用户的支付状态也能被准确追踪和处理，以便及时更新数据库并发放相应的奖励。
 * @param {string} userId 用户ID
 * @return {Object} 同步结果
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		bodyParam = Buffer.from(bodyParam, 'base64').toString()
	}

	let user_id;
	try {
		({
			user_id
		} = JSON.parse(bodyParam));
	} catch (error) {
		return createResponse(STATE_CODE.ERROR, "无效的请求数据");
	}

	// 查询条件：用户ID和未同步支付状态的订单
	let ordersToSync = await payOrdersCollection.where({
			user_id: user_id,
			is_payment_status_checked: false
		})
		.orderBy('create_time', 'desc') // 按照创建时间倒序排列
		.get()
	
	// 如果没有需要同步的订单，则直接返回
	if (ordersToSync.data.length === 0) {
		return createResponse(STATE_CODE.SUCCESS, "没有需要同步的订单", { sync_count: 0 });
	}
	
	// 取第一个订单进行同步，因为只关心最近的未同步订单（因为如果APP被杀死然后重启后就是刚刚的订单需要检查是否完成了支付并是否发放奖励）
	const order = ordersToSync.data[0];
	const out_trade_no = order.out_trade_no
	const timestamp = Math.floor(Date.now() / 1000);
	const res = await checkPaymentStatusFromThirdParty(out_trade_no, timestamp);
	
	// 这里处理查询结果和之前的逻辑，包括更新订单状态和奖励发放
	// 构造返回数据
	let response = { 
		sync_count: 0 // 订单同步完成数量
	}
	
	if (res.code == 1) {
		//return '查询失败，订单号：' + out_trade_no
		return createResponse(STATE_CODE.ERROR, "查询失败", response);
	}
	
	if (res.data.pay_status == 0) {
		//return '未支付，订单号：' + out_trade_no
		
		// 3. 如果订单未支付，也得更新订单状态为未支付
		const updatePayOrdersResult = await payOrdersCollection.where({
			out_trade_no: out_trade_no
		}).update({
			status: 0,// 订单状态 0：未支付 1：已支付,
			pay_success_time: 0,// 支付完成时间
			pay_add_time: res.data.add_time,// 下单时间
			pay_no: res.data.pay_no,// 微信支付订单号
			system_recharge_issuccess: false ,// 系统充值是否成功（用来记录当给用户充值金币/会员完成时记录true，防止同订单重复充值，带来的bug）
			is_payment_status_checked: true // 支付状态检查标记（蓝兔支付）：此字段用于标识订单的支付状态是否已经在第三方支付平台进行了查询。当用户完成支付操作后，如果由于应用被重启或其他原因导致本地支付状态未及时更新，这个字段会在重启后用来检查并同步第三方支付平台的支付状态。true 表示已检查并确认了第三方支付平台的支付状态，无论是支付完成还是未完成；false 表示本地数据库状态尚未与第三方支付平台同步。这确保了即使在应用重启后，用户的支付状态也能被准确追踪和处理，以便及时更新数据库并发放相应的奖励。
		})
		
		// 更新 sync_count: 1 // 因为只同步了一个订单
		response.sync_count = 1
	
		return createResponse(STATE_CODE.FAIL, "同步完成，订单未支付", response);
	}
		
	
	
	// 效验订单是否已支付
	if (res.data.pay_status == 1) {
		
		// 1. 根据此预支付交易订单号查询数据库中的订单信息记录
		let queryPayOrder = await payOrdersCollection.where({
			out_trade_no: out_trade_no
		}).get()
		
		// 效验此订单是否已经完成系统充值和查询微信订单支付成功完成？<system_recharge_issuccess>
		if (queryPayOrder.data[0].system_recharge_issuccess == true && queryPayOrder.data[0].is_payment_status_checked == true) {
			
			// 更新 sync_count: 1 // 因为只同步了一个订单
			response.sync_count = 1
			
			// 充值成功，此时APP应该显示充值成功，并且重新获取用户信息
			return createResponse(STATE_CODE.SUCCESS, "同步完成，已发放过充值奖励，请勿重复查询", response);
		} 
		
		let wx_pay_no = res.data.pay_no; // 微信支付订单号
		let user_id = queryPayOrder.data[0].user_id // 用户id
		let total_fee = queryPayOrder.data[0].total_fee // 支付总额
		let giveaway_coin = queryPayOrder.data[0].giveaway_coin // 赠送的金币
		
		// 支付成功，但是系统还没发放奖励，开始下发奖励逻辑
		// 3. 如果订单已支付，则更新订单状态为已支付
		const updatePayOrdersResult = await payOrdersCollection.where({
			out_trade_no: out_trade_no
		}).update({
			status: 1,// 订单状态 0：未支付 1：已支付,
			pay_success_time: res.data.success_time,// 支付完成时间
			pay_add_time: res.data.add_time,// 下单时间
			pay_no: res.data.pay_no,// 微信支付订单号
			system_recharge_issuccess: true ,// 系统充值是否成功（用来记录当给用户充值金币/会员完成时记录true，防止同订单重复充值，带来的bug）
			is_payment_status_checked: true // 支付状态检查标记（蓝兔支付）：此字段用于标识订单的支付状态是否已经在第三方支付平台进行了查询。当用户完成支付操作后，如果由于应用被重启或其他原因导致本地支付状态未及时更新，这个字段会在重启后用来检查并同步第三方支付平台的支付状态。true 表示已检查并确认了第三方支付平台的支付状态，无论是支付完成还是未完成；false 表示本地数据库状态尚未与第三方支付平台同步。这确保了即使在应用重启后，用户的支付状态也能被准确追踪和处理，以便及时更新数据库并发放相应的奖励。
		})
		
		// 判断订单类型： 0：金币充值 1：会员开通
		if (queryPayOrder.data[0].order_type == 0) {
			const userColl = userCollection// 用户表
			const userCoinColl = userCoinCollection// 用户金币变更表
			
			// 4. 更新用户金币
			const updateUserCoinResult = await userColl.where({
				_id: user_id // 用户表 _id = 用户id
			}).updateAndReturn({
				coin: dbCmd.inc(total_fee + giveaway_coin) // 金币增加（inc自增），只支持int整数型，不支持小数，不能使用1.99这样的小数
			})
			// 5. 新增用户金币变更记录
			const commentValue = giveaway_coin > 0 ? "充值金币（含赠送金币）" : "充值金币";
			const addUserCoinResult = await userCoinColl.add({
				user_id: user_id,
				coin: total_fee + giveaway_coin,
				balance: updateUserCoinResult.doc.coin,
				type: 1, // 类型 1:收入 2:支出
				comment: commentValue,
				create_date: timestamp
			})
			
			// 发送系统通知
			sendSystemNotice(appSystemNoticeCollection,{
				user_id: user_id,
				title: "金币充值通知",
				content: "亲爱的用户，您的金币充值已成功。现在您可以用金币购买付费内容。感谢您的支持，祝您使用愉快。"
			})
		}
		
		if (queryPayOrder.data[0].order_type == 1) {
			const userColl = userCollection// 用户表
			const userCoinColl = userCoinCollection// 用户金币变更表
			const userHuiyuanColl = userVipCollection // 会员变更记录表
			
			// 要开通的月份时间公式：支付总额（如100） / 月单价（如25） = 要开通的月份时间（4个月）
			// 月份时间戳公式（单位：毫秒）：要开通的月份时间（如4个月） * 30天 * 24小时 * 60分钟 * 60秒 * 1000毫秒 = 10368000000毫秒
			// 会员开通期限公式：会员有效期至 = 当前时间 + (30天/1个月)
			
				
			// 先定义测试数据
			const test_total_fee = 100 // 支付总额
			const test_month_price = 25 // 月单价
			const test_month_time = test_total_fee / test_month_price // 要开通的月份时间（单位：月）
			
			const test_month = 4
			const test_month_timestamp = test_month * 30 * 24 * 60 * 60 * 1000 // 月份时间戳（单位：毫秒）
			
			
			// 正式数据（按月已弃用，改为按天数）
			const month = queryPayOrder.data[0].month // 月份（要开通几个月）
			const month_timestamp = month * 30 * 24 * 60 * 60 * 1000 // 月份时间戳（单位：毫秒）
				
			
			// 按天数计算时间戳
			const day_count = queryPayOrder.data[0].day_count // 天数（要开通几天）
			const day_count_timestamp = day_count * 24 * 60 * 60 * 1000 // 天数时间戳（单位：毫秒）
			
			
			
			
			
			// 条件：(计算会员有效期至)
			// 1. 如果到期时间不为空且小于当前时间，则从当前时间开始加上续费周期时间。
			// 2. 如果到期时间不为空且大于当前时间，则从到期时间开始加上续费周期时间。
				
			// 新的过期时间
			let new_expire_date;
			// 获取当前时间的时间戳（毫秒）
			const now = Date.now();
			
			// 获取用户信息
			const userResult = await userColl.where({
				_id: user_id // 用户表 _id = 用户id
			}).get()
				
			// 获取用户会员到期时间
			const userVipExpireDate = userResult.data[0].vip_expire_date
				
			// 判断用户会员到期时间是否小于当前时间
			if (userVipExpireDate < now) {
				// 如果小于当前时间，则从当前时间开始加上续费周期时间
				new_expire_date = now + day_count_timestamp
			
				//new_expire_date = now + month_timestamp // 已弃用，改为按天数
			
			} else {
				// 如果大于当前时间，则从到期时间开始加上续费周期时间
				new_expire_date = userVipExpireDate + day_count_timestamp
				
				//new_expire_date = userVipExpireDate + month_timestamp
			}
				
				
			// 4. 更新用户会员有效期至
			const updateUserVipResult = await userColl.where({
				_id: user_id // 用户表 _id = 用户id
			}).updateAndReturn({
				vip: true, // 是否会员
				vip_expire_date: new_expire_date ,// 会员有效期至
				coin: dbCmd.inc(giveaway_coin) // 赠送的金币，金币增加（inc自增），只支持int整数型
			})
				
				
			// 5. 新增会员变更记录
			const commentValue = giveaway_coin > 0 ? "会员开通（含赠送金币）" : "会员开通";
			const addUserHuiyuanResult = await userHuiyuanColl.add({
				user_id: user_id,
				//time_limit_day: month * 30, // 会员开通期限天数（单位：天）时间限制天（本次变化的天数，也就是充值的天数）
				time_limit_day: day_count, // 会员开通期限天数（单位：天）时间限制天（本次变化的天数，也就是充值的天数）
				vip_expire_date: new_expire_date, // 会员有效期至
				out_trade_no: out_trade_no, // 支付订单号（商户订单号）
				total_fee: total_fee, // 支付总额
				comment: commentValue,
				create_date: timestamp
			})
			
			// 发送系统通知
			sendSystemNotice(appSystemNoticeCollection,{
				user_id: user_id,
				title: "会员充值通知",
				content: "亲爱的用户，您的会员充值已成功。现在您可以享受所有VIP特权。感谢您的支持，祝您使用愉快。"
			})
			
			if (giveaway_coin !== 0) {
				// 5-1. 新增用户金币变更记录（主要用于新增赠送金币）
				const addUserCoinResult = await userCoinColl.add({
					user_id: user_id,
					coin: giveaway_coin,
					balance: updateUserVipResult.doc.coin,
					type: 1, // 类型 1:收入 2:支出
					comment: commentValue,
					create_date: timestamp
				})
			}
		}
		
		// 构造返回数据
		let result = { 
			sync_count: 1 // 因为只同步了一个订单
		}
		
		// 充值成功，此时APP应该显示充值成功，并且重新获取用户信息
		return createResponse(STATE_CODE.SUCCESS, "同步完成，充值成功", result);
		
	}
}
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
	sendSystemNotice
} = require('../../common/fun')

const {
    payConfig
} = require('../../common/pay-config')

/**
 * 当前方案在app的WebView中拦截return_url（同步通知URL），然后直接打开查询订单弹窗自动查询订单结果，和优酷、腾讯、爱奇艺那样
 * 
 * 查询订单支付状态，用于APP端检查订单支付状态，支付成功则重新获取用户信息
 * 当APP端发起支付请求后，需要查询订单支付状态，以确认用户是否支付成功
 * 此接口用于用户完成支付后跳转到return_url同步通知时，则关闭WebView，并且调用此接口来查询订单支付状态
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/getPayOrder
 * @param {String} out_trade_no   商户订单号
 */
module.exports = async function () {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		bodyParam = Buffer.from(bodyParam, 'base64').toString()
	}
	
	let out_trade_no;
	try {({
			out_trade_no, 
		} = JSON.parse(bodyParam));
	} catch (error) {
		return createResponse(STATE_CODE.ERROR, "无效的请求数据");
	}
	
	// 采用老版本同步充值方案<最后的保险起见>
	// 未完成系统充值记录，开始查询微信订单支付结果和新增充值记录
	// 商户密钥
	const key = payConfig.mch_key;
	// 时间戳：如果你需要一个10位的时间戳（代表以秒为单位的时间戳，而不是以毫秒为单位），你可以将Date.now()的结果除以1000，然后使用Math.floor来舍去小数点后的部分。
	const timestamp = Math.floor(Date.now() / 1000);
	// 参与签名的参数（注意：只有必填参数才参与签名！！！）
	const params = {
		mch_id: payConfig.mch_id,// 商户号
		out_trade_no: out_trade_no,// 订单号
		timestamp: timestamp,// 当前时间戳
	};
	
	// 生成签名
	const signature = wxPaySign(params, key);
	
	// 2. 调用[查询订单API]接口，主动查询订单状态，校验订单是否已支付
	
	// 请求参数
	const payload = {
		...params,// 将参与签名的参数也传递过去
		sign: signature,// 签名
	};
	
	// 发起支付请求
	let res = await uniCloud.request({
		url: 'https://api.ltzf.cn/api/wxpay/get_pay_order',
		method: 'POST',
		data: payload,
		header: {
			'content-type': 'application/x-www-form-urlencoded'
		},
	})
	res = res.data

	// 构造返回数据
	let response = { 
		out_trade_no: out_trade_no,
		pay_status: 3, // 3是自己定义的，用于APP根据wx_pay_no==null&&pay_status==3来确定这是查询失败了
		pay_status_content: "查询失败",
		wx_pay_no: null // 初始化为null
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
			pay_no: res.data.pay_no,// 微信支付订单号，未支付蓝兔这边是没有微信订单的，所以前端APP不能只判断wx_pay_no==null,还要加其他条件
			system_recharge_issuccess: false ,// 系统充值是否成功（用来记录当给用户充值金币/会员完成时记录true，防止同订单重复充值，带来的bug）
			is_payment_status_checked: true // 支付状态检查标记（蓝兔支付）：此字段用于标识订单的支付状态是否已经在第三方支付平台进行了查询。当用户完成支付操作后，如果由于应用被重启或其他原因导致本地支付状态未及时更新，这个字段会在重启后用来检查并同步第三方支付平台的支付状态。true 表示已检查并确认了第三方支付平台的支付状态，无论是支付完成还是未完成；false 表示本地数据库状态尚未与第三方支付平台同步。这确保了即使在应用重启后，用户的支付状态也能被准确追踪和处理，以便及时更新数据库并发放相应的奖励。
		})
		
		// 未支付，更新response中的pay_no字段
		//response.wx_pay_no = res.data.pay_no;
		response.wx_pay_no = "临时订单号123"; // 微信支付订单号，未支付蓝兔这边是没有微信订单的，所以前端APP不能只判断wx_pay_no==null，还要加其他条件。但目前需要兼容APP版本1.0.2以下的，所以这里先写死一个订单号，用于修复APP中H5支付页面查询订单不走wx_pay_no==null卡进死循环
		response.pay_status = res.data.pay_status;
		response.pay_status_content = "未支付"
		
		return createResponse(STATE_CODE.FAIL, "未支付", response);
	}
		
	
	
	// 效验订单是否已支付
	if (res.data.pay_status == 1) {
		
		// 1. 根据此预支付交易订单号查询数据库中的订单信息记录
		let queryPayOrder = await payOrdersCollection.where({
			out_trade_no: out_trade_no
		}).get()
		
		
		
		// 效验此订单是否已经完成系统充值和查询微信订单支付成功完成？<system_recharge_issuccess>
		if (queryPayOrder.data[0].system_recharge_issuccess == true && queryPayOrder.data[0].is_payment_status_checked == true) {
			
			response.pay_status = 1
			response.pay_status_content = "已发放过充值奖励，请勿重复查询"
			response.wx_pay_no = queryPayOrder.data[0].pay_no
			
			// 充值成功，此时APP应该显示充值成功，并且重新获取用户信息
			return createResponse(STATE_CODE.SUCCESS, "已发放过充值奖励，请勿重复查询", response);
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
			out_trade_no,// 商户订单号
			pay_status: res.data.pay_status,
			pay_status_content: "已支付",
			order_type: queryPayOrder.data[0].order_type, // 订单类型
			order_type_content: queryPayOrder.data[0].order_type == 0 ? '金币充值' : '会员开通',
			total_fee,// 支付总额
			wx_pay_no
		}
		
		// 充值成功，此时APP应该显示充值成功，并且重新获取用户信息
		return createResponse(STATE_CODE.SUCCESS, "充值成功", result);
		
	}
	
	
	
}
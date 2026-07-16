const {
	dbCmd,
	userCollection,
	userScoresCollection,
	userVipCollection,
	payOrdersCollection
} = require('../../common/constants')

const {
    wxPaySign
} = require('../../common/fun')

const {
    payConfig
} = require('../../common/pay-config')

// 设置一个延时函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * 同步通知
 * 接口说明：
 * 适用对象：个人、个体户、企业
 * 请求URL：https://api.ltzf.cn/api/wxpay/get_pay_order
 * 请求方式：POST
 *
 * 请求参数：
 * 
 * @param {String} mch_id        商户号 (必填)
 * 示例值：1230000109
 * 
 * @param {String} out_trade_no  商户订单号 (必填)
 * 示例值：LTZF2022112264463
 * 
 * @param {String} timestamp     当前时间戳 (必填)
 * 示例值：1669518774
 * 
 * @param {String} sign          签名，数据签名的算法请参考《签名算法》 (必填)
 * 示例值：4440B462E792B604BD56A37EA41E5B8F
 * 
 * @returns {Object} 返回值
 * @param {String} code - 状态码 0：成功 1：失败
 * @param {String} msg - 信息 示例值：查询成功
 * @param {string} request_id - 唯一请求ID，每次请求都会返回，定位问题时需要提供该次请求的request_id。示例值：98758a7c-daea-bc63-b725-52c8998d808c
 * @param {object} data - 订单信息
 * @param {string} data.add_time - 下单时间 示例值：2022-11-22 11:55:09
 * @param {string} data.mch_id - 商户号 示例值：1230000109
 * @param {string} data.order_no - 系统订单号 示例值：WX202211221155084844072633LTZF2022112264463
 * @param {string} data.out_trade_no - 商户订单号
 * @param {string} data.pay_no - 微信支付订单号，当支付状态为已支付时返回此参数。示例值：4200001635202211222291508463
 * @param {string} data.body - 商品描述 示例值：这是一个测试
 * @param {string} data.total_fee - 支付金额 示例值：0.01
 * @param {string} data.trade_type - 支付类型，枚举值：NATIVE：扫码支付、H5：H5支付、APP：APP支付、JSAPI：公众号支付、MINIPROGRAM：小程序支付
 * @param {string} data.success_time - 支付完成时间，当支付状态为已支付时返回此参数。
 * @param {string} data.attach - 附加数据，在支付接口中填写的数据，可作为自定义参数使用。示例值：自定义数据
 * @param {string} data.openid - 支付者信息，当支付状态为已支付时返回此参数。示例值：o5wq46GAKVxVKpsdcI4aU4cBpgT0
 * @param {string} data.pay_status - 	支付状态，枚举值：0：未支付 1：已支付。示例值：1
 * 
 * 
 * 
 * 支付成功后自动跳转该地址 [HTTP_GET请求]
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/return_url
 * 请求Query参数：
 * @param {String} out_trade_no  商户订单号 (必填)
 * 
 * 
 * 跳转地址
 * @return {String} url https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/return_url?out_trade_no=JBCZ1697772862597098
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	// 获取HTTP请求的Query参数, 如 ?id=123
	const queryParam = httpInfo.queryStringParameters
	
	// 1. 根据此预支付交易订单号查询数据库中的订单信息记录
	let queryPayOrder;// 查询订单信息
	let systemRechargeSuccess = false; // 设置一个标志位，用于判断订单是否已经完成系统充值
	
	// 初始化查询次数限制，可根据需要调整
	const maxQueryAttempts = 5;
	let currentAttempt = 0; // 当前尝试次数
	
	let payStatus; // 支付状态
	let payStatusContent; // 支付状态内容说明
	let orderTypeContent; // 订单类型

	
	let pay_success_time = ""; // 微信支付完成时间 String <2023-10-18 01:23:34>
	
	// 使用while循环持续检查订单充值状态
	while (!systemRechargeSuccess && currentAttempt < maxQueryAttempts) {
		// 查询订单状态
		queryPayOrder = await payOrdersCollection.where({
			out_trade_no: queryParam.out_trade_no
		}).get();

		// 检查订单的充值状态标志
		if (queryPayOrder.data[0].system_recharge_issuccess) {
			// 如果订单已经完成充值
			payStatus = 1;
			payStatusContent = "已支付";
			pay_success_time = queryPayOrder.data[0].pay_success_time; // 微信支付完成时间
			systemRechargeSuccess = true; // 将标志位设置为true，表示充值已完成
			break; // 退出循环
		} else {
			// 如果订单尚未完成充值
			await sleep(3000); // 延时3秒后再次检查
			currentAttempt++; // 增加尝试次数
		}
	}
	
	
	orderTypeContent = queryPayOrder.data[0].order_type == 0 ? '金币充值' : '会员开通'
	
	let user_id = queryPayOrder.data[0].user_id // 用户id
	let total_fee = queryPayOrder.data[0].total_fee // 支付总额
	let giveaway_score = queryPayOrder.data[0].giveaway_score // 赠送的金币
	
	// 检查是否达到最大查询次数
	if (!systemRechargeSuccess) {
		// 如果达到最大查询次数，但充值仍未成功，则设置支付状态为失败
		payStatus = 0;
		payStatusContent = "支付失败";
		// 可以选择返回失败信息或执行其他逻辑
		
		// 采用老版本同步充值方案<最后的保险起见>
		// 未完成系统充值记录，开始查询微信订单支付结果和新增充值记录
		// 商户密钥
		const key = payConfig.mch_key;
		// 时间戳：如果你需要一个10位的时间戳（代表以秒为单位的时间戳，而不是以毫秒为单位），你可以将Date.now()的结果除以1000，然后使用Math.floor来舍去小数点后的部分。
		const timestamp = Math.floor(Date.now() / 1000);
		// 参与签名的参数（注意：只有必填参数才参与签名！！！）
		const params = {
			mch_id: payConfig.mch_id,// 商户号
			out_trade_no: queryParam.out_trade_no,// 订单号
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
		
		if (res.code == 1) {
			//return '查询失败，订单号：' + queryParam.out_trade_no
			payStatus = 4
			payStatusContent = "订单查询失败"
		}
		
		if (res.data.pay_status == 0) {
			//return '未支付，订单号：' + queryParam.out_trade_no
			
			payStatus = 0
			payStatusContent = "未支付"
		}
			
		
		
		// 效验订单是否已支付
		if (res.data.pay_status == 1) {
			payStatus = 1
			payStatusContent = "已支付"
			pay_success_time = res.data.success_time
			// 3. 如果订单已支付，则更新订单状态为已支付
			const updateResult = await payOrdersCollection.where({
				out_trade_no: queryParam.out_trade_no
			}).update({
				status: 1,// 订单状态 0：未支付 1：已支付,
				pay_success_time: res.data.success_time,// 支付完成时间
				pay_add_time: res.data.add_time,// 下单时间
				pay_no: res.data.pay_no,// 微信支付订单号
				system_recharge_issuccess: true // 系统充值是否成功（用来记录当给用户充值金币/会员完成时记录true，防止同订单重复充值，带来的bug）
			})
			
			// 判断订单类型： 0：金币充值 1：会员开通
			if (queryPayOrder.data[0].order_type == 0) {
				const userColl = userCollection// 用户表
				const userScoresColl = userScoresCollection// 用户金币变更表
				
				// 4. 更新用户金币
				const updateUserScoresResult = await userColl.where({
					_id: user_id // 用户表 _id = 用户id
				}).updateAndReturn({
					score: dbCmd.inc(total_fee + giveaway_score) // 金币增加（inc自增），只支持int整数型，不支持小数，不能使用1.99这样的小数
				})
				// 5. 新增用户金币变更记录
				const commentValue = giveaway_score > 0 ? "充值金币（含赠送金币）" : "充值金币";
				const addUserScoresResult = await userScoresColl.add({
					user_id: user_id,
					score: total_fee + giveaway_score,
					balance: updateUserScoresResult.doc.score,
					type: 1, // 类型 1:收入 2:支出
					comment: commentValue,
					create_date: timestamp
				})
			}
			
			if (queryPayOrder.data[0].order_type == 1) {
				const userColl = userCollection// 用户表
				const userScoresColl = userScoresCollection// 用户金币变更表
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
					score: dbCmd.inc(giveaway_score) // 赠送的金币，金币增加（inc自增），只支持int整数型
				})
		
		
				// 5. 新增会员变更记录
				const commentValue = giveaway_score > 0 ? "会员开通（含赠送金币）" : "会员开通";
				const addUserHuiyuanResult = await userHuiyuanColl.add({
					user_id: user_id,
					//time_limit_day: month * 30, // 会员开通期限天数（单位：天）时间限制天（本次变化的天数，也就是充值的天数）
					time_limit_day: day_count, // 会员开通期限天数（单位：天）时间限制天（本次变化的天数，也就是充值的天数）
					vip_expire_date: new_expire_date, // 会员有效期至
					out_trade_no: queryParam.out_trade_no, // 支付订单号（商户订单号）
					total_fee: total_fee, // 支付总额
					comment: commentValue,
					create_date: timestamp
				})
				
				if (giveaway_score == 0) return
				// 5-1. 新增用户金币变更记录（主要用于新增赠送金币）
				const addUserScoresResult = await userScoresColl.add({
					user_id: user_id,
					score: giveaway_score,
					balance: updateUserVipResult.doc.score,
					type: 1, // 类型 1:收入 2:支出
					comment: commentValue,
					create_date: timestamp
				})
			}
		}
	}
	
	

	
	
	//return '支付成功，订单号：' + queryParam.out_trade_no
	
	// 生成HTML内容
	const htmlContent = `
		<!DOCTYPE html>
		<html lang="en">
		  <head>
		    <meta charset="UTF-8" />
		    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
		    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<link rel="stylesheet" href="https://mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.cdn.bspapp.com/withhim/index.css">
			<link rel="stylesheet" href="https://mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.cdn.bspapp.com/withhim/order_details.css">
		    <title>支付结果</title>
		  </head>
		  <body>
		    <div class="xm-flex-col xm-justify-start page">
		      <div class="xm-flex-col section">
		        <div class="xm-flex-col xm-items-center space-y-10">
		          <div class="xm-flex-col xm-justify-start xm-items-center image-wrapper">
		            <img
		              class="image"
		              src="https://mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.cdn.bspapp.com/withhim/withhim-logo.png"
		            />
		          </div>
		          <span class="font_1 text">与他（WithHim）</span>
		        </div>
		        <div class="xm-flex-col group space-y-26">
		          <div class="xm-flex-col space-y-18">
		            <div class="xm-flex-row xm-justify-between">
		              <span class="font_1">订单状态</span>
		              <span class="font_1 text_2">${payStatusContent}</span>
		            </div>
					<div class="xm-flex-row xm-justify-between">
					  <span class="font_1">订单类型</span>
					  <span class="font_1 text_2">${orderTypeContent}</span>
					</div>
		            <div class="xm-flex-row xm-justify-between">
		              <span class="font_1">订单编号</span>
		              <span class="text_3">${queryParam.out_trade_no}</span>
		            </div>
					${pay_success_time ? `
					<div class="xm-flex-row xm-justify-between">
					  <span class="font_1">支付时间</span>
					  <span class="font_1 text_2">${pay_success_time}</span>
					</div>
					` : ''}
		          </div>
		          <div class="divider"></div>
		        </div>
		        <div class="xm-flex-row xm-justify-between group_2">
		          <span class="font_1">支付总额</span>
		          <span class="text_4">￥${total_fee}.00</span>
		        </div>
		      </div>
		    </div>
		  </body>
		</html>
	`;
	
	// 返回html内容
	return {
		//mpserverlessComposedResponse: true, // 使用阿里云返回集成响应是需要此字段为true
		//statusCode: 200,
		// headers: {
		// 	'content-type': 'text/html'
		// },
		data: {
			pay_status: payStatus, // 支付状态
			pay_status_content: payStatusContent, // 支付状态文本
			order_type: queryPayOrder.data[0].order_type, // 订单类型
			order_type_content: orderTypeContent, // 订单类型文本
			out_trade_no: queryParam.out_trade_no,// 商户订单号
			total_fee, // 支付总额
		},
		body: htmlContent
	}	
}
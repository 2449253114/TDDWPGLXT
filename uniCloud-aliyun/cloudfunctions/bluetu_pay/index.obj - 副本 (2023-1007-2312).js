// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

// 对于uniCloud的这种限制，我们可以使用Node.js的内置模块crypto来实现MD5加密。crypto模块提供了加密功能，其中包括了MD5。
const crypto = require('crypto');

/* 以下是如何使用Node.js的crypto模块来实现MD5加密的示例：
 function md5(data) {
     return crypto.createHash('md5').update(data, 'utf8').digest('hex').toUpperCase();
 }
 */

const querystring = require('querystring');

// 定义常量，方便管理和修改
const CODE = {
	ERROR: 404, // 无效请求或请求失败
	SUCCESS: 200, // 成功
};
// 抽象出重复的返回对象（定义一个用于返回结果的函数）
function createResponse(code, message, data = null) {
	return {
		code,
		message,
		data
	};
}

/**
 * 支付配置
 */
const payConfig = {
	// 微信支付商户号（控制台》微信支付》商户管理》商户号）
	mch_id: "1655760955",
	// 微信支付商户密钥（控制台》微信支付》商户管理》商户密钥）
	mch_key: "7e91ba4ed4bcd0ea3f795232497352de",
	// 支付通知地址
	notify_url: "https://fc-mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.next.bspapp.com/api/v1/pay/bluetu_pay/notify_url",
	// 支付成功后自动跳转到该地址
	return_url: "https://fc-mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.next.bspapp.com/api/v1/pay/bluetu_pay/return_url",
	// 取消支付自动跳转到该地址
	quit_url: "https://fc-mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.next.bspapp.com/api/v1/pay/bluetu_pay/quit_url",
	// 订单失效时间
	time_expire: "30m"
}

module.exports = {
	_before: function () { // 通用预处理器

	},
	/**
	 * H5支付[跳转模式]API
	 * 蓝兔支付后台系统返回支付链接，用户使用微信外部的浏览器或app访问该链接地址唤起微信并调起微信支付中间页。
	 * 接口说明:
	 * - 适用对象：个人、个体户、企业
	 * - 请求URL：https://api.ltzf.cn/api/wxpay/jump_h5
	 * - 请求方式：POST
	 * 
	 * @param {String} mch_id - 商户号
	 *     必填: 是
	 *     示例值: "1230000109"
	 * 
	 * @param {String} out_trade_no - 商户订单号，只能是数字、大小写字母_-且在同一个商户号下唯一
	 *     必填: 是
	 *     示例值: "LTZF2022113023096"
	 * 
	 * @param {String} total_fee - 支付金额
	 *     必填: 是
	 *     示例值: "0.01"
	 * 
	 * @param {String} body - 商品描述
	 *     必填: 是
	 *     示例值: "Image形象店-深圳腾大-QQ公仔"
	 * 
	 * @param {String} timestamp - 当前时间戳
	 *     必填: 是
	 *     示例值: "1669533132"
	 * 
	 * @param {String} notify_url - 支付通知地址，通知URL必须为直接可访问的URL，不允许携带查询串，需为http或https地址
	 *     必填: 是
	 *     示例值: "https://www.weixin.qq.com/wxpay/pay.php"
	 * 
	 * @param {String} [quit_url] - 取消支付自动跳转地址，跳转不会携带任何参数，如需携带参数请自行拼接
	 *     示例值: "https://www.weixin.qq.com/"
	 * 
	 * @param {String} [return_url] - 支付成功后自动跳转地址，跳转不会携带任何参数，如需携带参数请自行拼接
	 *     示例值: "https://www.weixin.qq.com/"
	 * 
	 * @param {String} [attach] - 附加数据，在支付通知中原样返回，可作为自定义参数使用
	 *     示例值: "自定义数据"
	 * 
	 * @param {String} [time_expire] - 订单失效时间，可选值：m (分钟), h (小时)；取值范围：1m～2h
	 *     示例值: "5m"
	 * 
	 * @param {String} sign - 签名，数据签名的算法参考《签名算法》
	 *     必填: 是
	 *     示例值: "B7337098E280841EB5F4D28261B60C07"
	 * 
	 * @returns {Object} 返回值
	 * @param {String} code - 状态码 0：成功 1：失败
	 * @param {String} msg - 信息 示例值：微信H5下单成功
	 * @param {String} data - 支付跳转链接，URL为拉起微信支付的中间页面，可通过访问该URL来拉起微信客户端，完成支付，URL的有效期为5分钟。示例值：https://api.ltzf.cn/template/html/jump_h5?order_no=WX202305091807051373879911
	 * @param {String} request_id - 唯一请求ID，每次请求都会返回，定位问题时需要提供该次请求的request_id。示例值：98758a7c-daea-bc63-b725-52c8998d808c
	 * 
	 * 
	 * 
	 * 
	 * 金币充值[H5支付]API
	 * 客户端请求Body参数
	 * 
	 * @param {String} user_id - 下单用户ID
	 *     必填: 是
	 *     示例值: "1230000109"
	 * 
	 * @param {String} total_fee - 支付金额（1元1金币）
	 *     必填: 是
	 *     示例值: "0.01"
	 * 
	 * @param {String} body - 商品描述
	 *     必填: 是
	 *     示例值: "消费"、"充值"、"与他 VIP会员开通"、"与他 购物卡充值"
	 * 
	 * @param {String} attach - 附加数据，在支付通知中原样返回，可作为自定义参数使用。
	 *     必填: 否
	 *     示例值: "自定义数据"
	 * 
	 */
	async mp_h5_pay(){
		const dbJQL = uniCloud.databaseForJQL({clientInfo: this.getClientInfo()})
		dbJQL.setUser({role: ['admin']})
		const payOrdersColl = dbJQL.collection("withhim-pay-orders")

		const clientInfo = this.getClientInfo()

		// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
		if (httpInfo.isBase64Encoded) { // 是否base64格式
			bodyParam = Buffer.from(bodyParam, 'base64').toString()
		}
		
		let user_id, // 下单用户ID
			total_fee, // 支付金额
			body, // 商品描述
			attach;// 附加数据，在支付通知中原样返回，可作为自定义参数使用。
		try {({
				user_id = "0000", 
				total_fee = "0.01", 
				body = "这是一个测试", 
				attach
			} = JSON.parse(bodyParam));
		} catch (error) {
			return createResponse(CODE.ERROR, "无效的请求数据");
		}

		// 1. 构造预支付交易订单
		
		// 商户密钥
		const key = payConfig.mch_key;
		// 订单号
		const orderNumber = generateOutTradeNo('LTZFJBCZ');
		// 时间戳：如果你需要一个10位的时间戳（代表以秒为单位的时间戳，而不是以毫秒为单位），你可以将Date.now()的结果除以1000，然后使用Math.floor来舍去小数点后的部分。
		const timestamp = Math.floor(Date.now() / 1000);
		// 参与签名的参数（注意：只有必填参数才参与签名！！！）
		const params = {
			mch_id: payConfig.mch_id,// 商户号
			out_trade_no: orderNumber,// 订单号
			total_fee: total_fee,// 支付金额
			body: body,// 商品描述
			timestamp: timestamp,// 当前时间戳
			notify_url: payConfig.notify_url,// 支付通知地址
		};
		
		// 生成签名
		const signature = wxPaySign(params, key);
		// 拼接取消支付后跳转地址的携带参数
		const quit_url = payConfig.quit_url + '?' + 'out_trade_no=' + orderNumber;
		// 拼接支付成功后跳转地址的携带参数
		const return_url = payConfig.return_url + '?' + 'out_trade_no=' + orderNumber;
		// 订单失效时间
		const time_expire = payConfig.time_expire;

		// 请求参数
		const payload = {
			...params,// 将参与签名的参数也传递过去
			sign: signature,// 签名
			quit_url,// 取消支付后跳转地址
			return_url,// 支付成功后跳转地址
			time_expire,// 订单失效时间
		};

		// 2. 将预支付交易订单记录到数据库中
		const payResult = await payOrdersColl.add({
			body: body,// 商品描述
			pay_type: "wxpay", // 支付渠道
			out_trade_no: orderNumber,// 订单号
			total_fee: total_fee,// 支付金额
			user_id: user_id,// 下单用户ID
			client_ip: clientInfo.clientIP,// 客户端IP
			platform: "与他APP",// 客户端下单平台
			status: 0,// 订单状态 0：未支付 1：已支付
			create_time: timestamp,// 订单创建时间
			timestamp: timestamp,// 当前时间戳
			sign: signature,// 签名
		})
		
		// 3. 将预支付交易订单发送到微信支付系统

		// 发起支付请求
		const res = await uniCloud.request({
			url: 'https://api.ltzf.cn/api/wxpay/jump_h5',
			method: 'POST',
			data: payload,
			header: {
				'content-type': 'application/x-www-form-urlencoded'
			},
		})
		
		// 4. 返回支付跳转链接
		return res.data
		
	},
	/**
	 * 蓝兔支付 - 支付结果回调接口
	 * 
	 * 适用对象：个人、个体户、企业
	 * 请求方式：POST
	 * 
	 * 回调URL：
	 * 该链接是通过支付接口中的请求参数“notify_url”来设置的，要求必须为http或https地址。
	 * 请确保回调URL是外部可正常访问的，且不能携带后缀参数，否则可能导致商户无法接收到蓝兔支付的回调通知信息。
	 * 示例：“https://pay.weixin.qq.com/wxpay/pay.action”
	 * 
	 * 通知规则：
	 * 用户支付完成后，蓝兔支付会把相关支付结果和用户信息发送给商户，商户需要接收处理该消息，并返回应答。
	 * 对后台通知交互时，如果蓝兔支付收到商户的应答不符合规范或超时，蓝兔支付认为通知失败。
	 * 通知频率为：15s/15s/30s/3m/10m/20m/30m/30m/30m/60m/3h/3h/3h/6h/6h - 总计 24h4m
	 * 
	 * @param {String} code           支付结果枚举值：0-成功, 1-失败
	 * @param {String} timestamp      时间戳
	 * @param {String} mch_id         商户号
	 * @param {String} order_no       系统订单号
	 * @param {String} out_trade_no   商户订单号
	 * @param {String} pay_no         支付宝或微信支付订单号
	 * @param {String} total_fee      支付金额
	 * @param {String} [sign]         签名，签名验证的算法请参考《签名算法》
	 * @param {String} [pay_channel]  支付渠道枚举值：alipay-支付宝, wxpay-微信支付
	 * @param {String} [trade_type]   支付类型枚举值：NATIVE-扫码支付, H5-H5支付, APP-APP支付, JSAPI-公众号支付, MINIPROGRAM-小程序支付
	 * @param {String} [success_time] 支付完成时间
	 * @param {String} [attach]       附加数据，在支付接口中填写的数据，可作为自定义参数使用
	 * @param {String} [openid]       支付者信息
	 * 
	 * 应答：
	 * 接收成功：HTTP应答状态码需返回200，同时应答报文需返回：SUCCESS，必须为大写。
	 * 接收失败：应答报文返回：FAIL。
	 */
	async notify_url() {
		// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
		if (httpInfo.isBase64Encoded) { // 是否base64格式
			bodyParam = Buffer.from(bodyParam, 'base64').toString()
		}

		const key = payConfig.mch_key;// 商户密钥
		const mch_id = payConfig.mch_id; // 商户号
		
		// 1. 获取支付通知回调返回的参数
		let sign,// 签名
			code,// 支付结果 
			timestamp, // 时间戳
			order_no,// 蓝兔支付系统订单号
			out_trade_no,// 商户订单号
			pay_no,// [第三方支付单号] 支付宝或微信支付订单号
			total_fee;// 支付金额

		// 检查bodyParam是否为JSON格式
		if (bodyParam.trim().startsWith('{') && bodyParam.trim().endsWith('}')) {
			try {
				({sign, code, timestamp, order_no, out_trade_no, pay_no, total_fee} = JSON.parse(bodyParam));
			} catch (error) {
				return createResponse(CODE.ERROR, "无效的请求数据");
			}
		} else { // 否则，认为它是URL编码的
			//params = querystring.parse(bodyParam);
			({sign, code, timestamp, order_no, out_trade_no, pay_no, total_fee} = querystring.parse(bodyParam));
		}

		// 2. 构造参与签名
		const params = {
			code,// 支付结果 
			timestamp,// 时间戳
			mch_id,// 商户号
			order_no,// 蓝兔支付系统订单号
			out_trade_no,// 商户订单号
			pay_no,// [第三方支付单号] 支付宝或微信支付订单号
			total_fee,// 支付金额
		};

		// 生成签名
		const signature = wxPaySign(params, key);

		// 3. 校验签名
		if (signature == sign) {
			// 业务逻辑处理
			return 'SUCCESS'; // 返回SUCCESS字符串即表示处理成功，系统收到返回SUCCESS后则回调不再进行回调
		}

		return 'FAIL'; // 返回FAIL字符串即表示处理失败，系统收到返回FAIL后则回调会再次进行回调

	},



	/**
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
	 * 请求Query参数：
	 * @param {String} out_trade_no  商户订单号 (必填)
	 * 
	 */
	async return_url() {
		const dbJQL = uniCloud.databaseForJQL({clientInfo: this.getClientInfo()})
		dbJQL.setUser({role: ['admin']})
		const payOrdersColl = dbJQL.collection('withhim-pay-orders')

	 	// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		// 获取HTTP请求的Query参数, 如 ?id=123
		const queryParam = httpInfo.queryStringParameters
		
		// 1. 根据此预支付交易订单号查询数据库中的订单信息记录
		const payOrder = await payOrdersColl.where({
			out_trade_no: queryParam.out_trade_no
		}).get()


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
			return '查询失败，订单号：' + queryParam.out_trade_no
		}

		if (res.data.pay_status == 0) {
			return '未支付，订单号：' + queryParam.out_trade_no
		}

		// 效验订单是否已支付
		if (res.data.pay_status == 1) {
			// 3. 如果订单已支付，则更新订单状态为已支付
			const updateResult = await payOrdersColl.where({
				out_trade_no: queryParam.out_trade_no
			}).update({
				status: 1,// 订单状态 0：未支付 1：已支付,
				pay_success_time: res.data.success_time,// 支付完成时间
				pay_add_time: res.data.add_time,// 下单时间
				pay_no: res.data.pay_no,// 微信支付订单号
			})
		}

		return '支付成功，订单号：' + queryParam.out_trade_no
	},
	// 取消支付后跳转地址
	async quit_url() {
	 	// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		// 获取HTTP请求的Query参数, 如 ?id=123
		const queryParam = httpInfo.queryStringParameters

		return '取消支付，订单号：' + queryParam.out_trade_no
	},
	
	
	/**
	 * method1方法描述
	 * @param {string} param1 参数1描述
	 * @returns {object} 返回值描述
	 */
	/* 
	method1(param1) {
		// 参数校验，如无参数则不需要
		if (!param1) {
			return {
				errCode: 'PARAM_IS_NULL',
				errMsg: '参数不能为空'
			}
		}
		// 业务逻辑
		
		// 返回结果
		return {
			param1 //请根据实际需要返回值
		}
	}
	*/
}

// 签名生成
function wxPaySign(params, key) {
	const paramsArr = Object.keys(params);
	paramsArr.sort();
	const stringArr = [];
	paramsArr.map(key => {
		stringArr.push(key + '=' + params[key]);
	});
	// 最后加上商户Key
	stringArr.push("key=" + key);
	const string = stringArr.join('&');
	return md5(string).toUpperCase();
}

function md5(data) {
    return crypto.createHash('md5').update(data, 'utf8').digest('hex').toUpperCase();
}

/**
 * 生成订单号的唯一性
 * @param {*} prefix 前缀
 * @returns 订单号字符串
 * 
 * 	// const out_trade_no = generateOutTradeNo();
	// console.log(out_trade_no);  // 输出形如: LTZF16340871953431234567890 的订单号
 */
function generateOutTradeNo(prefix = 'LTZF') {
	// 获取当前时间戳
	const timestamp = Date.now();

	// 生成一个0-99999999之间的随机数，并确保它总是8位数
	const randomSuffix = generateRandomNumberString(8);

	// 将时间戳与随机数结合起来
	const orderId = `${prefix}${timestamp}${randomSuffix}`;

	return orderId;

}
/**
 * prefix: 默认值为 'LTZFJBCZ'，长度为8字符。
 * timestamp: 使用Date.now()获取当前的时间戳。这是从1970年1月1日至今的毫秒数。以2023为例，它是一个13位数。
 * randomSuffix: 固定的8位数字字符串。
 * 因此，拼接的orderId字符串长度为：8（前缀）+13（时间戳）+8（随机后缀）=29
 * 为满足最多32个字符的要求，您目前的实现是有效的。但是需要注意，如果您更改前缀prefix的长度，可能会超过32个字符，需要对此进行检查或调整。
 */


/**
 * 生成随机数字符串
 * @param {*} length 随机数长度
 * @returns 随机数字符串 
 * 
 * const random12Digits = generateRandomNumberString(12);
 * console.log(random12Digits); // 输出一个随机的12位数字字符串
 */
function generateRandomNumberString(length) {
    const min = Math.pow(10, length - 1); // 为指定长度生成最小值
    const max = Math.pow(10, length) - 1; // 为指定长度生成最大值

    const randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
    return randomNumber.toString();
}

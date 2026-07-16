// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

// 对于uniCloud的这种限制，我们可以使用Node.js的内置模块crypto来实现MD5加密。crypto模块提供了加密功能，其中包括了MD5。
const crypto = require('crypto');

/* 以下是如何使用Node.js的crypto模块来实现MD5加密的示例：
 function md5(data) {
     return crypto.createHash('md5').update(data, 'utf8').digest('hex').toUpperCase();
 }
 */

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

module.exports = {
	_before: function () { // 通用预处理器

	},
	/**
	 * H5支付[跳转模式]API
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
	 */
	async mp_h5_pay(){
		// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		let body = httpInfo.body // 获取客户端传递的数据，如JSON
		if (httpInfo.isBase64Encoded) { // 是否base64格式
			body = Buffer.from(body, 'base64').toString()
		}
		
		const mch_id = "1655760955" // 商户号
		const mch_key = "7e91ba4ed4bcd0ea3f795232497352de" // 商户Key（商户密钥）
		// 支付通知地址
		const notify_url = "https://fc-mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.next.bspapp.com/api/v1/pay/bluetu_pay_notify"
		
		const return_url = "https://fc-mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.next.bspapp.com/api/v1/pay/bluetu_pay/return_url"
		
		const time_expire = "5m" // 订单失效时间
		
		// 时间戳：如果你需要一个10位的时间戳（代表以秒为单位的时间戳，而不是以毫秒为单位），你可以将Date.now()的结果除以1000，然后使用Math.floor来舍去小数点后的部分。
		//const timestamp = Math.floor(Date.now() / 1000);
		
		// let out_trade_no,// 商户订单号
		//     total_fee,// 支付金额
		// 	body = "",// 商品描述
		// 	attach = "";// 附加数据
		// try {
		// 	({out_trade_no, total_fee, body, attach} = JSON.parse(body));
		// } catch (error) {
		// 	return createResponse(CODE.ERROR, "无效的请求数据");
		// }
		
		// 订单号
		const orderNumber = generateOutTradeNo();
		//const orderNumber = "LTZF2022113023096"  //this.generateOutTradeNo();
		// 时间戳：如果你需要一个10位的时间戳（代表以秒为单位的时间戳，而不是以毫秒为单位），你可以将Date.now()的结果除以1000，然后使用Math.floor来舍去小数点后的部分。
		const timestamp = Math.floor(Date.now() / 1000);
		// 参与签名的参数（注意：只有必填参数才参与签名！！！）
		const params = {
			mch_id: mch_id,
			out_trade_no: orderNumber,
			total_fee: "0.01",
			body: "这是一个测试",
			timestamp: timestamp,
			notify_url: notify_url,
		};
		const key = mch_key
		// 生成签名
		const signature = wxPaySign(params, key);
		console.log(signature)
		

	
		// 拼接支付成功后跳转地址的携带参数
		const new_return_url = return_url + '?' + generateReturnUrl(params);
		console.log(new_return_url)
		// new_return_url = 

		const payload = {
			...params,
			return_url: new_return_url,
			sign: signature
		};
		
		const res = await uniCloud.request({
			url: 'https://api.ltzf.cn/api/wxpay/jump_h5',
			method: 'POST',
			data: payload,
			header: {
				'content-type': 'application/x-www-form-urlencoded'
			},
		})
		
		console.log(res)
		
		return res
		
		
		
	},
	// 支付成功后跳转地址
	async return_url() {
	 	// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		// 获取HTTP请求的Query参数, 如 ?id=123
		const queryParam = httpInfo.queryStringParameters

		return '支付成功，订单号：' + queryParam.out_trade_no
	}
	
	
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

// 生成订单号的唯一性
function generateOutTradeNo(prefix = 'LTZF') {
	// 获取当前时间戳
	const timestamp = Date.now();

	// 生成一个0-9999之间的随机数，并确保它总是4位数
	const randomSuffix = ("0000" + Math.floor(Math.random() * 10000)).slice(-4);

	// 将时间戳与随机数结合起来
	const orderId = `${prefix}${timestamp}${randomSuffix}`;

	return orderId;
	// const out_trade_no = generateOutTradeNo();
	// console.log(out_trade_no);  // 输出形如: LTZF16340871953431234
}


// 生成支付成功后跳转地址的携带参数
function generateReturnUrl(params) {
	const paramsArr = Object.keys(params);
	paramsArr.sort();
	const stringArr = [];
	paramsArr.map(key => {
		// 过滤掉notify_url
		if (key === 'notify_url') {
			return;
		}
		stringArr.push(key + '=' + params[key]);
	});
	const string = stringArr.join('&');
	return string;
}
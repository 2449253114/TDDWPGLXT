const crypto = require('crypto');

/**
 * 生成MD5签名
 * @description 此签名方法仅适用于 "七相支付" | "彩虹易支付"
 * @param {Object} params 请求参数
 * @param {String} key 商户密钥
 * @returns {String} MD5签名
 */
function createQixiangPayMD5Sign(params, key) {
	// 1. 过滤掉 sign、sign_type 和空值参数
	const filteredParams = {};
	for (const [k, v] of Object.entries(params)) {
			if (k !== 'sign' && k !== 'sign_type' && v !== '' && v !== null && v !== undefined) {
					filteredParams[k] = v;
			}
	}
	
	// 2. 按照参数名的 ASCII 码从小到大排序
	const sortedParams = Object.keys(filteredParams)
			.sort()
			.map(k => `${k}=${filteredParams[k]}`)
			.join('&');
			
  // 3. 拼接商户密钥（直接拼接到末尾，不加 &key=）
  const signString = sortedParams + key;	
	
	// 4. 计算 MD5 签名
	const sign = crypto
			.createHash('md5')
			.update(signString, 'utf8')
			.digest('hex'); // 结果为小写

	return sign;
}


/**
 * 从 httpInfo.body 中提取指定字段的值
 * @param {Object} httpInfo - 包含 body 和 isBase64Encoded 的对象
 * @param {string[]} fields - 需要提取的字段名数组
 * @returns {Object} - 包含提取字段值的对象，如果某个字段提取失败则返回 undefined
 */
function parseBodyFields(httpInfo, fields) {
	let body = httpInfo.body;

	// 如果是 base64 编码，先解码
	if (httpInfo.isBase64Encoded) {
		body = Buffer.from(body, 'base64').toString();
	}

	let parsedBody;
	try {
		parsedBody = JSON.parse(body);
	} catch (error) {
		parsedBody = null;
	}

	const result = {};

	for (const field of fields) {
		let value;

		// 先尝试从解析后的 body 中获取字段值
		if (parsedBody && parsedBody[field] !== undefined) {
			value = parsedBody[field];
		} else {
			// 如果解析失败或字段缺失，使用正则表达式从原始 body 中提取
			const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`);
			const match = body.match(regex);
			if (match && match[1]) {
				value = match[1];
			} else {
				value = undefined;
			}
		}

		// 检查字段值是否有效
		if (value === undefined) {
			value = undefined;
		}

		result[field] = value;
	}

	return result;

	// 示例用法
	// const httpInfo = {
	//     body: '{"device_oaid":"123456", "album_id":"4434760596136153301"}',
	//		 或者"body": "{\"album_id\":\"123456789\",\"user_id\":\"6778ef597ae708a346b6c339\"}"
	//     isBase64Encoded: false
	// };

	//const fields = ["device_oaid", "album_id", "fsid"];
	//const extractedFields = extractFieldsFromHttpInfo(httpInfo, fields);

	//console.log(extractedFields);
	// 输出: { device_oaid: '123456', album_id: '4434760596136153301', fsid: undefined }
}

/**
 * 生成订单号的唯一性
 * @param {*} prefix 前缀
 * @returns {String} 订单号字符串
 */
function generateOutTradeNo(prefix = 'LTZF') {
	// 获取当前时间戳，单位秒
	const timestamp = Math.floor(Date.now() / 1000); // 以秒为单位的时间戳 10位数

	// 生成一个0-99999999之间的随机数，并确保它总是6位数
	const randomSuffix = generateRandomNumberString(6);

	// 将时间戳与随机数结合起来
	const orderId = `${prefix}${timestamp}${randomSuffix}`;

	return orderId;
}

/**
 * 生成随机数字符串
 * @param {*} length 随机数长度
 * @returns 随机数字符串 
 */
function generateRandomNumberString(length) {
	const min = Math.pow(10, length - 1); // 为指定长度生成最小值
	const max = Math.pow(10, length) - 1; // 为指定长度生成最大值

	const randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
	return randomNumber.toString();
}


module.exports = {
	createQixiangPayMD5Sign,
	parseBodyFields,
	generateOutTradeNo
};
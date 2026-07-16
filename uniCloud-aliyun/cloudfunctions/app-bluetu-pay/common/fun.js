// 对于uniCloud的这种限制，我们可以使用Node.js的内置模块crypto来实现MD5加密。crypto模块提供了加密功能，其中包括了MD5。
const crypto = require('crypto');

/* 以下是如何使用Node.js的crypto模块来实现MD5加密的示例：
 function md5(data) {
     return crypto.createHash('md5').update(data, 'utf8').digest('hex').toUpperCase();
 }
 */

const querystring = require('querystring');

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
	// 获取当前时间戳，单位秒
	const timestamp = Math.floor(Date.now() / 1000);// 以秒为单位的时间戳 10位数
	

	// 生成一个0-99999999之间的随机数，并确保它总是8位数
	const randomSuffix = generateRandomNumberString(6);

	// 将时间戳与随机数结合起来
	const orderId = `${prefix}${timestamp}${randomSuffix}`;

	return orderId;

}
/**
 * prefix: 默认值为 'LTZFJBCZ'，长度为8字符。
 * timestamp: 使用Date.now()获取当前的时间戳。这是从1970年1月1日至今的毫秒数。以2023为例，它是一个13位数。
 * randomSuffix: 固定的8位数字字符串。
 * 因此，拼接的orderId字符串长度为：8（前缀）+13（时间戳：毫秒13位，秒10位）+8（随机后缀）=29
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


const { payConfig } = require('./pay-config')
// 封装从第三方支付平台检查支付状态的函数
async function checkPaymentStatusFromThirdParty(out_trade_no, timestamp) {
    // 生成签名
    const key = payConfig.mch_key;
    //const timestamp = Math.floor(Date.now() / 1000);// 从外部传递，因为外面函数也需要
    const params = {
        mch_id: payConfig.mch_id, // 商户号
        out_trade_no: out_trade_no, // 订单号
        timestamp: timestamp, // 当前时间戳
    };
    const signature = wxPaySign(params, key);

    // 请求参数
    const payload = {
        ...params, // 将参与签名的参数也传递过去
        sign: signature, // 签名
    };

    // 发起支付请求
    let res = await uniCloud.request({
        url: 'https://api.ltzf.cn/api/wxpay/get_pay_order',
        method: 'POST',
        data: payload,
        header: {
            'content-type': 'application/x-www-form-urlencoded'
        },
    });
    return res.data; // 返回查询结果
}








/**
 * 发送系统通知到用户
 * @param {Collection} appSystemNoticeCollection
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
 * 获取当前商品信息
 * @param {Collection} shopGoodsCollection
 * @param {String} goodsId 商品ID
 */
async function getGoodsInfo(shopGoodsCollection, goodsId) {
    try {
		const goodsInfo = await shopGoodsCollection.doc(goodsId).get();
		return goodsInfo.data[0];
	} catch (error) {
        console.error('获取商品信息失败:', error);
        return null;
    }
}


module.exports = {
	querystring,
    wxPaySign,
	checkPaymentStatusFromThirdParty,
    generateOutTradeNo,
    generateRandomNumberString,
	sendSystemNotice,
	getGoodsInfo
}
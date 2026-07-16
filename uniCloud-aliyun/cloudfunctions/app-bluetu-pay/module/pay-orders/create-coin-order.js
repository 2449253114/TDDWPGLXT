const {
	payOrdersCollection,
	shopGoodsCollection
} = require('../../common/constants')

const {
    generateOutTradeNo,
    wxPaySign,
    getGoodsInfo
} = require('../../common/fun')

const {
    payConfig
} = require('../../common/pay-config')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

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
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/mp_h5_pay_rechargeGoldCoins
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
 * @param {Number} giveaway_coin - 赠送金币数（仅用于充值金币或会员时的赠送金币数）
 *   必填: 否
 *   示例值: 0
 * 
 * @param {String} body - 商品描述
 *     必填: 是
 *     示例值: "消费"、"充值"、"与他 VIP会员开通"、"与他 购物卡充值"
 * 
 * @param {String} attach - 附加数据，在支付通知中原样返回，可作为自定义参数使用。
 *     必填: 否
 *     示例值: "自定义数据"
 * 
 * @returns {Object} 返回值
 * @param {String} code - 状态码 0：成功 1：失败
 * @param {String} msg - 信息 示例值：微信H5下单成功
 * @param {Object} data 
 * @param {String} data.out_trade_no - 订单号
 * @param {String} data.pay_url - 支付跳转链接，URL为拉起微信支付的中间页面，可通过访问该URL来拉起微信客户端，完成支付，URL的有效期为5分钟。示例值：https://api.ltzf.cn/template/html/jump_h5?order_no=WX202305091807051373879911
 * @param {String} data.request_id - 唯一请求ID，每次请求都会返回，定位问题时需要提供该次请求的request_id。示例值：98758a7c-daea-bc63-b725-52c8998d808c
 * 
 */
module.exports = async function() {
	const clientInfo = this.getClientInfo()

    // 获取url化时的http信息
    const httpInfo = this.getHttpInfo()
    let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
    if (httpInfo.isBase64Encoded) { // 是否base64格式
        bodyParam = Buffer.from(bodyParam, 'base64').toString()
    }
    
    let user_id, // 下单用户ID
		goods_id, // 商品ID
        total_fee, // 支付金额
        giveaway_coin, // 额外赠送的金币
        body, // 商品描述
        attach;// 附加数据，在支付通知中原样返回，可作为自定义参数使用。
    try {({
            user_id, 
			// 注释字段不能从前端传递，会很危险，存在刷数据，这是不可取的
            //total_fee, 
            //giveaway_coin,
            //body, 
            //attach,
            goods_id
        } = JSON.parse(bodyParam));
    } catch (error) {
        return createResponse(STATE_CODE.ERROR, "无效的请求数据");
    }
	
	// 从商品数据库获取商品信息
    const goodsInfo = await getGoodsInfo(shopGoodsCollection, goods_id);
	if (goodsInfo !== null) {
		total_fee = goodsInfo.price
		giveaway_coin = goodsInfo.giveaway_coin
		body = goodsInfo.type == 0 ? `U币充值（${goodsInfo.price}）` : `高级会员开通（${goodsInfo.name}）`
    } else {
        return createResponse(STATE_CODE.ERROR, "未找到商品信息");
    }
	
    // 1. 构造预支付交易订单
    
    // 商户密钥
    const key = payConfig.mch_key;
    // 订单号
    const orderNumber = generateOutTradeNo('JBCZ');
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
    const payResult = await payOrdersCollection.add({
        order_type: 0,// 订单类型 0：金币充值 1：会员开通
        body: body,// 商品描述
        pay_type: "wxpay", // 支付渠道
        out_trade_no: orderNumber,// 订单号
        total_fee: total_fee,// 支付金额
        giveaway_coin: giveaway_coin,// 额外赠送的金币
        user_id: user_id,// 下单用户ID
        client_ip: clientInfo.clientIP,// 客户端IP
        platform: "与他APP",// 客户端下单平台
        status: 0,// 订单状态 0：未支付 1：已支付
        create_time: timestamp,// 订单创建时间
        timestamp: timestamp,// 当前时间戳
        sign: signature,// 签名
		system_recharge_issuccess: false ,// 系统充值是否成功（用来记录当给用户充值金币/会员完成时记录true，防止同订单重复充值，带来的bug）
		is_payment_status_checked: false // 支付状态检查标记（蓝兔支付）：此字段用于标识订单的支付状态是否已经在第三方支付平台进行了查询。当用户完成支付操作后，如果由于应用被重启或其他原因导致本地支付状态未及时更新，这个字段会在重启后用来检查并同步第三方支付平台的支付状态。true 表示已检查并确认了第三方支付平台的支付状态，无论是支付完成还是未完成；false 表示本地数据库状态尚未与第三方支付平台同步。这确保了即使在应用重启后，用户的支付状态也能被准确追踪和处理，以便及时更新数据库并发放相应的奖励。
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

    const pay_code = res.data.code
    const pay_msg = res.data.msg
    const pay_url = res.data.data
    const pay_request_id = res.data.request_id

    
    // 4. 返回预支付交易订单
    let data = {
        out_trade_no: orderNumber,
        pay_url: pay_url,
        request_id: pay_request_id
    }

    return createResponse(pay_code, pay_msg, data);
}
/**
 * 支付配置
 * 蓝兔支付的商户支付配置
 */
const payConfig = {
	// 微信支付商户号（控制台》微信支付》商户管理》商户号）
	//mch_id: "1655760955", // 18827592783-风控冻结
	mch_id: "1703960709", // 17384203028
	// 微信支付商户密钥（控制台》微信支付》商户管理》商户密钥）
	//mch_key: "7e91ba4ed4bcd0ea3f795232497352de", // 18827592783-风控冻结
	mch_key: "5390ee8c6e5ca57af0911c52c753ab0a", // 17384203028
	// 支付通知地址
	notify_url: "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/api/user/payment/notify_url",
	// 支付成功后自动跳转到该地址
	return_url: "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/api/user/payment/return_url",
	//return_url: "https://tcb-634t34mepexy3wb-6cyg21f2ed1b.service.tcloudbase.com/api/v1/pay/bluetu_pay_return/return_url",
	// 取消支付自动跳转到该地址
	quit_url: "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/api/user/payment/quit_url",
	// 订单失效时间
	time_expire: "30m",
	// 支付通知接口的异步接收器，用于系统充值<自定义接口，非蓝兔>
	notify_receiver: "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/api/user/payment/notify_receiver"
}

module.exports = {
	payConfig
}
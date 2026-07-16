/**
 * 七相支付配置
 */
const qixiangPayConfig = {
	// 商户号
	mch_id: 1545,
	// 商户密钥
	mch_key: "nC7725Sjh3CAP3hSo3jZoO3mCYOah75Z",
	// API地址
	api_url: "https://api.payqixiang.cn", // 可配置的API地址
	// 支付方式
	type: {
		alipay: "alipay", // 支付宝
		wxpay: "wxpay", // 微信支付
	},
	// 支付异步通知地址
	notify_url: "http://next.withhim.top/api/user/payment/v2/qixiang_notify",
	// 支付成功后自动跳转地址
	return_url: "http://next.withhim.top/api/user/payment/v2/qixiang_return"
};

module.exports = qixiangPayConfig;
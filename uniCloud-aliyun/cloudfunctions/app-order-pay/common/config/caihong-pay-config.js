/**
 * 彩虹易支付配置
 */
const caihongPayConfig = {
  // 商户号
  mch_id: 28041,
  // 商户密钥
  mch_key: "XXYGkgmu68uX28G7mL8LWlZ6i6UoiyoU",
	// API地址
	api_url: "https://pay.v8jisu.cn", // 可配置的API地址
  // 支付异步通知地址
  notify_url: "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/api/user/payment/v2/caihong_notify",
  // 支付成功后自动跳转地址
  return_url: "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/api/user/payment/v2/caihong_return"
};

module.exports = caihongPayConfig;
const qixiangPayNotify = {
	notifyUrl: async () => {
		// 处理七相支付的异步通知
		return 'SUCCESS'
	},
	returnUrl: async () => {
		// 处理七相支付的同步通知（支付成功跳转）
		return 'SUCCESS'
	},
	quitUrl: async () => {
		// 处理七相支付的取消支付跳转
		return 'SUCCESS'
	},
};

module.exports = qixiangPayNotify;
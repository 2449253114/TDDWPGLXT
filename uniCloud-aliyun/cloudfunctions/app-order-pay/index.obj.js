const { qixiangPayCreateOrder } = require('./module/payment-platforms/qixiang-pay/demo')
const { caihongPayCreateOrder } = require('./module/payment-platforms/caihong-pay/demo')
const qixiangPayNotify = require('./module/payment-platforms/qixiang-pay/notify')

module.exports = {
	_before: function () { // 通用预处理器

	},
	qixiangPayCreateOrder,
	caihongPayCreateOrder,
	'qixiang_notify': qixiangPayNotify.notifyUrl(),
	'qixiang_return': qixiangPayNotify.returnUrl()
}

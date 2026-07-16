module.exports = {
	createCoinOrder: require('./create-coin-order'),
	createVipOrder: require('./create-vip-order'),
	createVipOrderV2: require('./create-vip-order-v2'),
	createVipOrderV3: require('./create-vip-order-v3'),
	notify_url: require('././notify-url'),
	return_url: require('./return-url'),
	quit_url: require('./quit-url'),
	getAllOrders: require('./get-all-orders'),
	getPayOrder: require('./get-pay-order'),
	asyncBlueTuOrderStatus: require('./async-ltzf-order-status')
}
/**
 * 页面上的数据都来自数据库，且多处 ui 消费，页面直接使用字段会造成耦合和冗余，固在此抽出来统一配置（clientdb 查询方法、概念文字提示等）和处理（对值再计算、格式化等）
 * title 显示所使用名称
 * field 数据库字段名
 * computed 计算表达式配置，只支持除法计算（需要 mapfield 函数支持，也可自行扩展）
 * tooltip 对字段解释的提示文字
 * formatter 数字格式化的配置，省缺为 ','
  	* '' 空字符串 则表示不格式化
	* ',' 数字格式，例：1000 格式为 1,000
	* '%' 百分比格式 例：0.1 格式为 10%
	* ':' 时分秒格式 例：90 格式为 00:01:30
	* '-' 日期格式 例：1655196831390(值需为时间戳) 格式为 2022-06-14
 * stat 对字段做 groupField 时需使用的数据库计算方法，省缺为 'sum'
  	* 'sum' 表示对字段做求和运算
  	* 'avg' 表示对字段做平均运算
 * fix 数字保留几位小数，>1 默认不保留小数，<1 默认保留两位小数
 * value 默认值 (仅用于 uni-stat-panel 组件) todo: 可移除
 * contrast 对比值 (仅用于 uni-stat-panel 组件) todo: 可移除
 */

const userFieldsMap = [{
	value: '今天',
	contrast: '昨天'
}, {
	title: '新增用户',
	field: 'today_new_user_count',
	tooltip: '首次访问应用的设备数（以设备为判断标准，去重）',
	value: 0,
	contrast: 0
}, {
	title: '活跃用户',
	field: 'today_active_user_count',
	tooltip: '活跃用户就是今天登录的用户，所以昨日不精准，因为昨天的人，今天登录了，就不算昨天的了',
	value: 0,
	contrast: 0
}, {
	title: '活跃VIP用户',
	field: 'today_active_vip_user_count',
	tooltip: '',
	value: 0,
	contrast: 0
}, {
	title: '活跃普通用户',
	field: 'today_active_regular_user_count',
	tooltip: '',
	value: 0,
	contrast: 0
}, {
	title: '总用户数',
	field: 'total_users',
	tooltip: '',
	value: 0,
	contrast: 0
}, {
	title: '近1小时内在线用户',
	field: 'last_hour_online_user_count',
	tooltip: '',
	value: 0,
	contrast: 0
}, {
	title: '近1小时内在线VIP用户',
	field: 'last_hour_online_vip_user_count',
	tooltip: '',
	value: 0,
	contrast: 0
}, {
	title: '近1小时内在线普通用户',
	field: 'last_hour_online_regular_user_count',
	tooltip: '',
	value: 0,
	contrast: 0
}]




const orderFieldsGroupMap = [
	{
		title: '订单金额', group: "total_amount",
		list:[
			{ title: '下单金额', field: 'create_total_amount', tooltip: '下单：统计时间内，下单金额（包含未支付订单和退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:2, trendChart: true, multiple:0.01 },
			{ title: '收款金额', field: 'pay_total_amount', tooltip: '收款：统计时间内，成功支付的订单金额（包含退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:2, trendChart: true, multiple:0.01 },
			{ title: '退款金额', field: 'refund_total_amount', tooltip: '退款：统计时间内，发生退款的金额。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:2, multiple:0.01 },
		]
	},
	{
		title: '订单数量', group: "order_count",
		list:[
			{ title: '下单数量', field: 'create_order_count', tooltip: '下单：统计时间内，成功下单的订单笔数（包含未支付订单和退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:0, trendChart: true },
			{ title: '收款数量', field: 'pay_order_count', tooltip: '收款：统计时间内，成功支付的订单数（包含退款订单）。', formatter: '', value: "-", contrast: 0, stat: 'sum', fix:0, trendChart: true },
			{ title: '退款数量', field: 'refund_order_count', tooltip: '退款：统计时间内，发生退款的订单数。', formatter: '', value: "-", contrast: 0, stat: 'sum', fix:0 },
		]
	},
	{
		title: '用户数量', group: "user_count",
		list:[
			{ title: '下单用户数', field: 'create_user_count', tooltip: '下单：统计时间内，成功下单的客户数（包含未支付订单和退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:0, trendChart: true },
			{ title: '收款用户数', field: 'pay_user_count', tooltip: '收款：统计时间内，成功支付的用户数（包含退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:0, trendChart: true },
			{ title: '退款用户数', field: 'refund_user_count', tooltip: '退款：统计时间内，发生退款的用户数。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:0 },
		]
	},
	{
		title: '设备数量', group: "device_count",
		list:[
			{ title: '下单设备数', field: 'create_device_count', tooltip: '下单：统计时间内，成功下单的设备数（包含未支付订单和退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:0, trendChart: true },
			{ title: '收款设备数', field: 'pay_device_count', tooltip: '收款：统计时间内，成功支付的设备数（包含退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:0, trendChart: true },
			{ title: '退款设备数', field: 'refund_device_count', tooltip: '退款：统计时间内，发生退款的设备数。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:0 },
		]
	},
];

let orderFieldsMap = [];

orderFieldsGroupMap.map((item1, index1) => {
	item1.list.map((item2, index2) => {
		orderFieldsMap.push(item2);
	});
});


const statPanelTodayOrderFieldsMap = [
	{ title: '下单金额（GMV）', field: 'create_total_amount', tooltip: '统计时间内，下单金额（包含未支付订单和退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:2, trendChart: true, multiple:0.01 },
	{ title: '收款金额（GPV）', field: 'pay_total_amount', tooltip: '统计时间内，成功支付的订单金额（包含退款订单）。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:2, trendChart: true, multiple:0.01 },
	//{ title: '支付订单数量', field: 'pay_order_count', tooltip: '统计时间内，成功支付的订单数（包含退款订单）。', formatter: '', value: "-", contrast: 0, stat: 'sum', fix:0, trendChart: true },
	{ title: '退款金额', field: 'refund_total_amount', tooltip: '统计时间内，发生退款的金额。', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:2, trendChart: true, multiple:0.01 },
	{ title: '实收金额', field: 'actual_total_amount', tooltip: '实收金额=收款金额-退款金额', formatter: ',', value: "-", contrast: 0, stat: 'sum', fix:2, trendChart: true, multiple:0.01 },
];


export {
	userFieldsMap,
	orderFieldsGroupMap,
	statPanelTodayOrderFieldsMap
}

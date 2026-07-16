# 晚上回来：把采集相册文件同步到到云存储时，
# 需要修改ctime为当天的0点-现在的时间的秒时间戳，（随机取（当天的0点至现在的时间）范围内的秒时间戳）
# 这样就可以让app显示今天上传的哪些文件。



你看下的我代码，现在的updateUserInfo是对vip_expire_date（过期时间<现在时间）且vip标记为true的更新信息为vip=false
```javascript
async updateUserInfo() {
	// 获取当前时间戳
	const currentTime = Date.now();

	// 查询所有VIP过期的用户ID
	const {
		result: expiredVipUsersResult
	} = await userCollection.where({
		vip_expire_date: {
			$lt: currentTime
		}, // vip_expire_date < 现在时间
		vip: true // 当前标记为VIP的用户
	}).field({
		_id: true // 只返回需要的字段，即用户ID
	}).get();

	console.log('expiredVipUsersResult', expiredVipUsersResult)

	// 提取所有过期用户的ID
	const ids = expiredVipUsersResult.data.map(user => user._id);

	// 如果没有过期的VIP用户，则不执行更新操作
	if (ids.length === 0) {
		return;
	}

	// 批量更新VIP状态为false
	await userCollection.where({
		_id: {
			$in: ids
		}
	}).update({
		vip: false
	});

	uni.showToast({
		title: `VIP状态已更新，影响的用户数: ${ids.length}`,
		icon: 'none'
	})

	// 返回一个成功的提示信息或进行其他的后续处理
	console.log(`VIP状态已更新，影响的用户数: ${ids.length}`);
}
```
然后上方的代码可能还会存在一些可能特殊的意外问题，因为我这个updateUserInfo方法是在index.vue（仪表盘）页面打开时自动执行的，
如果此时用户充值了，而我这边又正好和用户充值的操作...就是我可能把他的状态更新为了false（可能有这种情况），所以我需要你基于我的方法
再搞一个，查询vip_expire_date > 大于现在时间且vip=false的，这代表我给你说的特殊意外问题，所以需要把这种可能性修复，需要重新更新为vip=true
记住，需要帮我写函数说明，比如我这个意外的可能性。












```javascript
confirmPersonVal() {
	console.log(`确认按钮被点击：邀请人数低于 ${this.personVal} 不显示`);
	// 注释你帮我写
	this.userTableData = 
},
// confirmPersonVal方法你可以参考我下面这两部分的代码
// 更新用户数据，附上邀请人数
updateUsersWithInviteCounts(users) {
	let inviteCounts = this.countInvites(users);

	this.userTableData = users.map(user => ({
		...user,
		inviteCount: inviteCounts[user._id] || 0
	})).sort((a, b) => b.inviteCount - a.inviteCount); // 添加排序逻辑;
},
// 统计每个用户的邀请人数
countInvites(users) {
	let inviteCounts = {};
	users.forEach(user => {
		if (user.inviter_uid) {
			if (!inviteCounts[user.inviter_uid]) {
				inviteCounts[user.inviter_uid] = 0;
			}
			inviteCounts[user.inviter_uid]++;
		}
	});
	return inviteCounts;
},
```












############

我现在有个需求，不过在这之前，你先看我的数据结构
```
[
    {
        "body": "高级会员开通（1个月）",
        "total_fee": 99,
        "user_id": "65be37419755e3283004978c",
        "status": 1,
        "system_recharge_issuccess": true,
        "pay_success_time": "2024-04-21 19:27:03"
    },
    {
        "user_id": "65be37419755e32830049788",
        "body": "高级会员开通（7天）",
        "total_fee": 59,
        "status": 1,
		"system_recharge_issuccess": true,
		"pay_success_time": "2024-04-21 19:27:03"
    },
	{
	    "user_id": "65be37419755e3283004978c",
	    "body": "高级会员开通（7天）",
	    "total_fee": 59,
	    "status": 1,
		"system_recharge_issuccess": true,
		"pay_success_time": "2024-04-21 19:27:03"
	},
    {
        "body": "高级会员开通（1个月）",
        "total_fee": 99,
        "user_id": "65be37419755e3283004978c",
        "status": 1,
        "system_recharge_issuccess": true,
        "pay_success_time": "2024-04-21 19:27:03"
    },
]
```
我想你帮我把这些数据统计起来，具体实现是这样的（统计后的新数据）
total_fee相同的归类统计（就是销量意思）
user_id相同的归类统计（就是同个用户买了多少次商品，商品不限制价格）
然后显示到页面上，注意这是vue2，下面是个模版供你参考
```vue
<view class="uni-stat-card-header">这里帮我写描述，就是对应统计的描述，要简短易懂</view>
各个商品销量的统计
<div class="container">
	<div class="card">
		<div class="text-small">商品名称</div>
		<div class="text-large">商品价格</div>
		<div class="text-large">销量: 111</div>
	</div>
</div>
用户下单数统计，注意最少为2笔的才统计出来，只有1笔的不需要统计
div...
```




```json
[
    {
        "body": "高级会员开通（1个月）",
        "total_fee": 99,
        "user_id": "65be37419755e3283004978c",
        "status": 1,
        "system_recharge_issuccess": true,
        "pay_success_time": "2024-04-21 19:27:03"
    },
    {
        "user_id": "65be37419755e32830049788",
        "body": "高级会员开通（7天）",
        "total_fee": 59,
        "status": 1,
		"system_recharge_issuccess": true,
		"pay_success_time": "2024-04-21 19:27:03"
    },
	{
	    "user_id": "65be37419755e3283004978c",
	    "body": "高级会员开通（7天）",
	    "total_fee": 59,
	    "status": 1,
		"system_recharge_issuccess": true,
		"pay_success_time": "2024-04-21 19:27:03"
	},
    {
        "body": "高级会员开通（1个月）",
        "total_fee": 99,
        "user_id": "65be37419755e3283004978c",
        "status": 1,
        "system_recharge_issuccess": true,
        "pay_success_time": "2024-04-21 19:27:03"
    },
]
```
```javascript
// 统计销量
calculateSales(data) {
	return data.reduce((acc, item) => {
		acc[item.total_fee] = (acc[item.total_fee] || 0) + 1;
		return acc;
	}, {});
},
// 统计用户购买次数
calculatePurchases(data) {
	const purchases = data.reduce((acc, item) => {
		acc[item.user_id] = (acc[item.user_id] || 0) + 1;
		return acc;
	}, {});

	// 过滤掉只购买了1次的用户
	return Object.keys(purchases).reduce((acc, key) => {
		if (purchases[key] > 1) {
			acc[key] = purchases[key];
		}
		return acc;
	}, {});
},
// 这里新增个方法，用来更新下面两个字段，通过匹配pay_success_time为今天0点-23:59:59的数据
//today_total_pay_orders （今日订单总数
//today_total_order_amount（今日订单总额）
```





















#########################


```json
[
    {
        "body": "高级会员开通（1个月）",
        "total_fee": 99,
        "user_id": "65be37419755e3283004978c",
        "status": 1,
        "system_recharge_issuccess": true,
        "pay_success_time": "2024-04-21 19:27:03"
    },
    {
        "user_id": "65be37419755e32830049788",
        "body": "高级会员开通（7天）",
        "total_fee": 59,
        "status": 1,
		"system_recharge_issuccess": true,
		"pay_success_time": "2024-04-21 19:27:03"
    },
	{
	    "user_id": "65be37419755e3283004978c",
	    "body": "高级会员开通（7天）",
	    "total_fee": 59,
	    "status": 1,
		"system_recharge_issuccess": true,
		"pay_success_time": "2024-04-21 19:27:03"
	},
    {
        "body": "高级会员开通（1个月）",
        "total_fee": 99,
        "user_id": "65be37419755e3283004978c",
        "status": 1,
        "system_recharge_issuccess": true,
        "pay_success_time": "2024-04-21 19:27:03"
    },
]
```
```javascript
// 统计销量
calculateSales(data) {
	return data.reduce((acc, item) => {
		acc[item.total_fee] = (acc[item.total_fee] || 0) + 1;
		return acc;
	}, {});
},
// 统计用户购买次数
calculatePurchases(data) {
	const purchases = data.reduce((acc, item) => {
		acc[item.user_id] = (acc[item.user_id] || 0) + 1;
		return acc;
	}, {});

	// 过滤掉只购买了1次的用户
	return Object.keys(purchases).reduce((acc, key) => {
		if (purchases[key] > 1) {
			acc[key] = purchases[key];
		}
		return acc;
	}, {});
},
// 更新今日订单统计
updateTodayOrdersStatistics(data) {
	// 获取今天的日期范围
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0); // 今天的0点
	const todayEnd = new Date();
	todayEnd.setHours(23, 59, 59, 999); // 今天的23:59:59

	// 格式化为与 pay_success_time 相同的格式
	const formatDateTime = date => date.toISOString().replace('T', ' ').substring(0, 19);

	// 筛选出今天的订单
	const todayOrders = data.filter(order => {
		const orderTime = new Date(order.pay_success_time);
		return orderTime >= todayStart && orderTime <= todayEnd;
	});

	// 计算今日订单总数
	this.today_total_pay_orders = todayOrders.length;

	// 计算今日订单总额
	this.today_total_order_amount = todayOrders.reduce((total, order) => total + order.total_fee, 0);
},
这里还需要新增个方法, 来实现下面两个需求
first_transaction_date: "", // 第一笔成交日 （通过匹配pay_success_time为最早的一个）
average_daily_revenue: 0, // 平均每天收益（从第一笔成交日到现在的时间）
```












2024年5月19（第一天，也就是第一笔成交日），现在2024年5月29日，今天是第11天，目前总收益是5883，那么5883/11=534.8(仅保留一位小数，且不要四舍五入)，然而你给我的代码算出的平均每天是568.16，你是怎么算成这样的？这明明就错了啊








我知道为什么你算不准了，这是你给我的代码打印出来的：当前日期和第一笔成交日之间的天数 ==  10.359543495370371
天数怎么可能有10点几天呢？你在想什么呢？天数只能是整数啊，而且你这样算的天数有明显的问题，请按照我教你的方式来统计 第一笔订单成交日 到今天日期，共过去了多少天。
还是以下面的数据为例
```json
[
    {
        "body": "高级会员开通（1个月）",
        "total_fee": 99,
        "user_id": "65be37419755e3283004978c",
        "status": 1,
        "system_recharge_issuccess": true,
        "pay_success_time": "2024-04-21 19:27:03"
    }
]
```
我们通过"pay_success_time": "2024-04-21 19:27:03"来统计天数，从第一笔的日期，注意只要日期，不要时间，如2024-04-21，然后到今天的日期，这之间就是过去了多少天数啊
然后下面是你给我的代码，帮我修复
```javascript
// 计算平均每天收益
calculateAverageDailyRevenue(data) {
	// 如果没有订单数据，则返回
	if (data.length === 0) {
		return;
	}

	// 使用findFirstTransactionDate方法找到第一笔成交日
	this.findFirstTransactionDate(data);

	// 总收益
	const totalRevenue = data.reduce((acc, order) => acc + order.total_fee, 0);

	// 当前日期和第一笔成交日之间的天数
	const firstTransactionDate = new Date(this.first_transaction_date);
	
	const currentDate = new Date();
	const millisecondsPerDay = 24 * 60 * 60 * 1000;
	const daysSinceFirstTransaction = (currentDate - firstTransactionDate) / millisecondsPerDay;

	console.log('当前日期和第一笔成交日之间的天数 == ', daysSinceFirstTransaction)


	// 计算平均每天收益，并保留一位小数但不四舍五入
	const rawAverageDailyRevenue = totalRevenue / daysSinceFirstTransaction;
	this.average_daily_revenue = Math.floor(rawAverageDailyRevenue * 10) / 10;
},
```





这次你算少了一天，应该是这样算的
2024-0519 // 第1天
2024-0520 // 第2天
2024-0521 // 第3天
2024-0522 // 第4天
2024-0523 // 第5天
2024-0524 // 第6天
2024-0525 // 第7天
2024-0525 // 第8天
2024-0525 // 第9天
2024-0525 // 第10天
2024-0529 // 第11天
5883/11=534.8 ，而你算的是588.3，这说明你算少了一天





































安卓Jetpack Compose项目调试运行时APP闪退，并且报错如下
```txt
FATAL EXCEPTION: main
Process: tt.ubear.xyz.demo.debug, PID: 1707
java.lang.StringIndexOutOfBoundsException: begin 0, end 3, length 0
	at java.lang.String.checkBoundsBeginEnd(String.java:3942)
	at java.lang.String.substring(String.java:2467)
	at tt.ubear.xyz.features.screen.auth.login.LoginScreen2Kt.LoginScreen2Content(LoginScreen2.kt:168)
```
然后这是报错部分的源码
```kotlin
// 将oaid显示出来，但只显示前面3位和最后4位，中间用*号代替
val oaidText = remember {
	mutableStateOf(buildAnnotatedString {
		append(oaid.substring(0, 3))
		append("****")
		append(oaid.substring(oaid.length - 4, oaid.length))
	})
}
```
这是完整的代码
```kotlin
@Composable
fun LoginScreen2(
    modifier: Modifier = Modifier,
    localDataSaverViewModel: LocalDataSaverViewModel,
    onNavigate: (String) -> Unit
) {
    val authViewModel = hiltViewModel<AuthViewModel>()
    val context = LocalContext.current
    // 设备唯一标识
    val oaid = authViewModel.getOAID(context)

    LoginScreen2Content(
        oaid = oaid
	)
}

@Composable
private fun LoginScreen2Content(
    oaid: String,
) {

    // 将oaid显示出来，但只显示前面3位和最后4位，中间用*号代替
    val oaidText = remember {
        mutableStateOf(buildAnnotatedString {
            append(oaid.substring(0, 3))
            append("****")
            append(oaid.substring(oaid.length - 4, oaid.length))
        })
    }
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    @ApplicationContext context: Context,
): ViewModel() {
	// 获取oaid
    fun getOAID(context: Context): String = DeviceIdentifier.getOAID(context)
}
```


















```kotlin
val guid by rememberUpdatedState(newValue = authViewModel::getGUID)
    
val safeOaidText = buildAnnotatedString {
	if (!oaid.isNullOrEmpty() && oaid.length >= 7) {
		// 如果oaid不为空且长度足够，按原计划显示
		append(oaid.substring(0, 3))
		append("****")
		append(oaid.substring(oaid.length - 4, oaid.length))
	} else {
		// 如果oaid为空或长度不足，使用guid代替
		append(guid.substring(0, 3))
		append("****")
		append(guid.substring(guid.length - 4, guid.length))
	}
}
```
上面的代码其实还要考虑个问题，oaid或guid长度满足7就行，这样前3位显示 中间****代替 后4位显示




















```javascript

userTableData: [], // 用户数据

// 更新今日订单统计
updateTodayOrdersStatistics(data) {
	// 获取今天的日期范围
	const todayStart = new Date();
	todayStart.setHours(0, 0, 0, 0); // 今天的0点
	const todayEnd = new Date();
	todayEnd.setHours(23, 59, 59, 999); // 今天的23:59:59

	// 格式化为与 pay_success_time 相同的格式
	const formatDateTime = date => date.toISOString().replace('T', ' ').substring(0, 19);

	// 筛选出今天的订单
	const todayOrders = data.filter(order => {
		const orderTime = new Date(order.pay_success_time);
		return orderTime >= todayStart && orderTime <= todayEnd;
	});
	
	console.log('筛选出今天的订单', todayOrders)

	// 计算今日订单总数
	this.today_total_pay_orders = todayOrders.length;

	// 计算今日订单总额
	this.today_total_order_amount = todayOrders.reduce((total, order) => total + order.total_fee, 0);
	
	// 这里计算出 是今日注册的用户且今日成交的用户
	// 数据userTableData  , 判断字段 register_date: 1706964801549
	// 然后再新增个字段储存 今日注册的用户且今日成交的用户的今日订单总额
	
	// 计算今日注册且今日成交的用户数量及订单总额
	this.today_registered_and_paid_users = 0;// 今日注册的用户
	this.today_registered_and_paid_orders_amount = 0; // 今日注册用户的订单总额
	this.today_registered_user_order_count = 0; // 今日注册用户的订单数
	
	
	// 今日订单用户信息列表
	this.todayOrdersUserInfo = [];

	todayOrders.forEach(order => {
		// 查找对应用户的注册时间
		const user = this.userTableData.find(u => u._id === order.user_id);
		if (user) {
			// 检查用户是否今日注册
			const isRegisteredToday = user.register_date >= todayStart.getTime() && user.register_date <= todayEnd.getTime();
			if (isRegisteredToday) {
				this.today_registered_and_paid_users += 1;
				this.today_registered_and_paid_orders_amount += order.total_fee;
				this.today_registered_user_order_count += 1;
			}
			// 收集用户信息用于渲染
			this.todayOrdersUserInfo.push({
				user_id: user._id, // 用户id
				//register_date: new Date(user.register_date).toISOString(), // 格式化注册日期
				register_date: new Date(user.register_date).toISOString().split('T')[0], // 保留日期部分
				order_amount: order.total_fee // 订单总额
			});
		}
		
	});
	
	// 我现在有个新的需求，需要通过今日订单记录用户id、用户注册日期、用户成交金额，然后我渲染到页面上（vue）
	
	
},
```


"register_date": 1706964801549,
"login_date": 1717764251908,
// 我还需要增加个字段，来记录最后一次在线时间戳，就是当用户回到Home页，会调用获取用户信息，这是最新的用户信息状态


我的代码是这样的
```javascript
let userInfo;
if (queryUserResult['affectedDocs'] == 1) {
	userInfo = queryUserResult['data'][0]
}

// 先更新用户的VIP状态
let updateUserResult = await userCollection.where({
	_id: _id
}).updateAndReturn({
	vip: checkVipStatus(userInfo), // 检查并更新VIP状态
	last_online_time: Date.now() // 使用当前时间戳作为最后在线时间
})

const data = updateUserResult['doc']

return createResponse(STATE_CODE.SUCCESS, "获取用户信息成功", data)
```











需求在代码中，主要就是找出近1小时内在线的用户数
```javascript
// 获取今日0点的时间戳
function getTodayTimestamp() {
	const now = new Date();
	// 设置时间为今天的0点0分0秒
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	// 获取时间戳
	const timestamp = today.getTime();
	return timestamp;
}

// 计算今日新增用户和今日活跃用户
function calculateTodayUsers(usersData) {
	const todayTimestamp = getTodayTimestamp();
	let todayNewUsers = 0; // 今日新增用户数
	let todayActiveUsers = 0;// 今日活跃用户数
    let todayActiveVipUsers = 0;     // 今日活跃的VIP用户数
    let todayActiveRegularUsers = 0; // 今日活跃的普通用户数
	
	// 遍历用户数据
	usersData.forEach(user => {
		// 检查注册日期
		if (user.register_date >= todayTimestamp) {
			todayNewUsers += 1;
		}
		// 检查登录日期
		if (user.login_date >= todayTimestamp) {
			todayActiveUsers += 1;
			
			// 如果用户是VIP，并且今天活跃，则增加今日活跃VIP用户的计数
			if (user.vip) {
				todayActiveVipUsers += 1;
			} else {
				// 不是VIP的活跃用户
				todayActiveRegularUsers += 1;
			}
			
			// 我还需要增加找出近1小时内活跃的VIP用户和普通用户及总用户
			// 查询字段就是刚刚问你的上个问题中的（last_online_time: Date.now() // 使用当前时间戳作为最后在线时间）这个字段
		}
	});

	return {
		todayNewUsers,
		todayActiveUsers,
		todayActiveVipUsers,     // 今日活跃的VIP用户
		todayActiveRegularUsers, // 今日活跃的普通用户
	};
}
```













```vue
<view class="uni-container">
	<view class="uni-stat-card-header">注册用户概览</view>
	<div class="container">
		<div class="card">
			<div class="text-small">今日新增用户</div>
			<div class="text-large">{{ today_new_user_count }}</div>
		</div>
		<div class="card">
			<div class="text-small">今日活跃用户</div>
			<div class="text-large">{{ today_active_user_count }}</div>
		</div>
		<div class="card">
			<div class="text-small">总用户数</div>
			<div class="text-large">{{ total_users }}</div>
		</div>
	</div>
	<div class="container">
		<div class="card">
			<div class="text-small">今日活跃的VIP用户</div>
			<div class="text-large">{{ today_active_vip_user_count }}</div>
		</div>
		<div class="card">
			<div class="text-small">今日活跃的普通用户</div>
			<div class="text-large">{{ today_active_regular_user_count }}</div>
		</div>
	</div>
	<div class="container">
		<div class="card">
			<div class="text-small">近1小时内在线的总用户数</div>
			<div class="text-large">{{ last_hour_online_user_count }}</div>
		</div>
		<div class="card">
			<div class="text-small">近1小时内在线的VIP用户数</div>
			<div class="text-large">{{ last_hour_online_vip_user_count }}</div>
		</div>
		<div class="card">
			<div class="text-small">近1小时内在线的普通用户数</div>
			<div class="text-large">{{ last_hour_online_regular_user_count }}</div>
		</div>
	</div>
</div>
```


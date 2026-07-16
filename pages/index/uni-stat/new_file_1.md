```javascript
// ./fieldsMap.js
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
	tooltip: '访问过应用内任意页面的总设备数',
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
	title: '近1小时内在线用户',
	field: 'last_hour_online_user_count',
	formatter: ':',
	tooltip: '',
	value: 0,
	contrast: 0,
	stat: 'avg'
}, {
	title: '近1小时内在线VIP用户',
	field: 'last_hour_online_vip_user_count',
	formatter: ':',
	tooltip: '',
	value: 0,
	contrast: 0,
	stat: 'avg'
}, {
	title: '近1小时内在线普通用户',
	field: 'last_hour_online_regular_user_count',
	formatter: '%',
	tooltip: '',
	value: 0,
	contrast: 0,
	fix: 2
}, {
	title: '总用户数',
	field: 'total_users',
	tooltip: '',
	value: 0,
	contrast: 0
}]


// ./../common/fun.js 
// 计算今日新增用户和今日活跃用户，以及近1小时内在线的用户
function calculateTodayUsers(usersData) {// 给你参考的老版本代码，新的需求里已不适用了，在下面的代码中会有说明
	const todayTimestamp = getTodayTimestamp();
	const oneHourAgoTimestamp = getOneHourAgoTimestamp();
	let todayNewUsers = 0; // 今日新增用户数
	let todayActiveUsers = 0;// 今日活跃用户数
    let todayActiveVipUsers = 0; // 今日活跃的VIP用户数
    let todayActiveRegularUsers = 0; // 今日活跃的普通用户数
	
	// 近1小时内在线的用户数
	let lastHourOnlineUsers = 0; // 近1小时内在线的总用户数
	let lastHourOnlineVipUsers = 0; // 近1小时内在线的VIP用户数
	let lastHourOnlineRegularUsers = 0; // 近1小时内在线的普通用户数

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
		}
		
		// 检查最后在线时间是否在近1小时内
		if (user && user.last_online_time >= oneHourAgoTimestamp) {
			lastHourOnlineUsers += 1;

			// 根据用户是否为VIP，计算近1小时内在线的VIP用户和普通用户
			if (user.vip) {
				lastHourOnlineVipUsers += 1;
			} else {
				lastHourOnlineRegularUsers += 1;
			}
		}
	});

	return {
		todayNewUsers, // 今日新增用户数
		todayActiveUsers, // 今日活跃用户数
		todayActiveVipUsers, // 今日活跃的VIP用户数
		todayActiveRegularUsers, // 今日活跃的普通用户数
		lastHourOnlineUsers, // 近1小时内在线的总用户数
		lastHourOnlineVipUsers, // 近1小时内在线的VIP用户数
		lastHourOnlineRegularUsers // 近1小时内在线的普通用户数
	};
}

// ./updateFieldUtils.js
// 更新userFieldsMap中特定字段的value属性
function updateUserFieldValue(userFieldsMap, fieldToUpdate, newValue) {
    const field = userFieldsMap.find(f => f.field === fieldToUpdate);
    if (field) {
        field.value = newValue;
    }
}

import {
	calculateTodayUsers,
	formatDeviceOaid
} from './../common/fun.js'

import {
	updateUserFieldValue,
} from './updateFieldUtils.js';

import {
	userFieldsMap
} from './fieldsMap.js'
const userPanelOption = userFieldsMap.filter(f => f.hasOwnProperty('value'))
export default {
	data() {
		return {
			userTableData: [],// 用户数据
			userFieldsMap
		}
	},

	methods: {
		async loadData() {
			uni.showLoading()
			await this.queryUserCounts()
			await this.fetchUserData()
			await this.updateVipStatuses()
			
			uni.hideLoading()
		},
		async queryUserCounts() {
			const {
				result
			} = await userCollection.count()
			
			// 更新总用户数的值
			updateUserFieldValue(this.userFieldsMap, 'total_users', result.total);
		},
		// 获取用户数据
		async fetchUserData() {
			const totalUsers = this.total_users
			const MAX_LIMIT = 1000; // uniapp的limit最大值
			let allUsers = []
		
			for (let i = 0; i < totalUsers; i += MAX_LIMIT) {
				// 当前第i页的数据
				console.log(`当前第${i / MAX_LIMIT + 1}页`);
				const {
					result
				} = await userCollection.skip(i).limit(MAX_LIMIT).get();
				allUsers = allUsers.concat(result.data);
			}
			console.log('所有用户:', allUsers);
		
			this.userTableData = allUsers;
		
			// 在获取数据后立即计算统计信息并更新字段
			this.updateTableFieldsWithStats();
			// 更新用户数据，附上邀请人数
			this.updateUsersWithInviteCounts(allUsers);
			// 更新用户数据，附上未登录天数
			//this.updateUsersWithDaysSinceLastLogin(this.userTableData)
			// 过滤掉邀请人数低于 minInviteCount 的用户
			this.filterUsersByInviteCount()
		},
		// 获取用户数据
		async fetchUserData() {
			const totalUsers = this.total_users
			const MAX_LIMIT = 1000; // uniapp的limit最大值
			let allUsers = []

			for (let i = 0; i < totalUsers; i += MAX_LIMIT) {
				// 当前第i页的数据
				console.log(`当前第${i / MAX_LIMIT + 1}页`);
				const {
					result
				} = await userCollection.skip(i).limit(MAX_LIMIT).get();
				allUsers = allUsers.concat(result.data);
			}
			console.log('所有用户:', allUsers);

			this.userTableData = allUsers;

			// 在获取数据后立即计算统计信息并更新字段
			this.updateTableFieldsWithStats();
			// 更新用户数据，附上邀请人数
			this.updateUsersWithInviteCounts(allUsers);
			// 更新用户数据，附上未登录天数
			//this.updateUsersWithDaysSinceLastLogin(this.userTableData)
			// 过滤掉邀请人数低于 minInviteCount 的用户
			this.filterUsersByInviteCount()
		},
		// 更新表格字段以包含统计信息
		updateTableFieldsWithStats() {
			// 这里假设calculateTodayUsers是您计算今日新增和活跃用户的方法
			const {
				todayNewUsers,// 今日新增用户数
				todayActiveUsers,// 今日活跃用户数
				todayActiveVipUsers,// 今日活跃的VIP用户
				todayActiveRegularUsers,// 今日活跃的普通用户
				lastHourOnlineUsers, // 近1小时内在线的总用户数
				lastHourOnlineVipUsers, // 近1小时内在线的VIP用户数
				lastHourOnlineRegularUsers // 近1小时内在线的普通用户数
			} = calculateTodayUsers(this.userTableData); // 这是以前的代码，由于我现在的需求变了，所以需要一个新的函数来计算今日和昨日的数据
			// 你看了我这么多代码，应该知道怎么实现我的需求了吧？
		},
	}
}
```










你给我的代码是错误的啊
```javascript
// 这是我的代码
// 计算今日新增用户和今日活跃用户，以及近1小时内在线的用户
function calculateTodayUsers(usersData) {
	const todayTimestamp = getTodayTimestamp();
	const oneHourAgoTimestamp = getOneHourAgoTimestamp();
	let todayNewUsers = 0; // 今日新增用户数
	let todayActiveUsers = 0;// 今日活跃用户数
    let todayActiveVipUsers = 0; // 今日活跃的VIP用户数
    let todayActiveRegularUsers = 0; // 今日活跃的普通用户数
	
	// 近1小时内在线的用户数
	let lastHourOnlineUsers = 0; // 近1小时内在线的总用户数
	let lastHourOnlineVipUsers = 0; // 近1小时内在线的VIP用户数
	let lastHourOnlineRegularUsers = 0; // 近1小时内在线的普通用户数

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
		}
		
		// 检查最后在线时间是否在近1小时内
		if (user && user.last_online_time >= oneHourAgoTimestamp) {
			lastHourOnlineUsers += 1;

			// 根据用户是否为VIP，计算近1小时内在线的VIP用户和普通用户
			if (user.vip) {
				lastHourOnlineVipUsers += 1;
			} else {
				lastHourOnlineRegularUsers += 1;
			}
		}
	});

	return {
		todayNewUsers, // 今日新增用户数
		todayActiveUsers, // 今日活跃用户数
		todayActiveVipUsers, // 今日活跃的VIP用户数
		todayActiveRegularUsers, // 今日活跃的普通用户数
		lastHourOnlineUsers, // 近1小时内在线的总用户数
		lastHourOnlineVipUsers, // 近1小时内在线的VIP用户数
		lastHourOnlineRegularUsers // 近1小时内在线的普通用户数
	};
}

// // 使用函数
//const { todayNewUsers, todayActiveUsers } = calculateTodayUsers(usersData);
//console.log(`今日新增用户：${todayNewUsers}`);
//console.log(`今日活跃用户：${todayActiveUsers}`);

// 这是你给我的代码
// 计算并比较今日与昨日的用户统计数据
function calculateAndCompareUserStats(usersData, userFieldsMap) {
	const todayTimestamp = getTodayTimestamp();
	const yesterdayTimestamp = getYesterdayTimestamp();
	const oneHourAgoTimestamp = getOneHourAgoTimestamp();

	let todayNewUsers = 0;
	let yesterdayNewUsers = 0;
	let todayActiveUsers = 0;
	let yesterdayActiveUsers = 0;
	let todayActiveVipUsers = 0;
	let yesterdayActiveVipUsers = 0;
	let todayActiveRegularUsers = 0;
	let yesterdayActiveRegularUsers = 0;
	let lastHourOnlineUsers = 0;
	let lastHourOnlineVipUsers = 0;
	let lastHourOnlineRegularUsers = 0;

	usersData.forEach(user => {
		// 你的错误就在下面3个const全部采用了last_online_time去对比，这是错误的啊。
		// 我现在给你说明这些字段的意思
		// register_date = 注册时间
		// login_date = 登录时间
		// last_online_time = 最后在线时间（当用户回到Home页时会实时刷新）
		// 你应该采用上面calculateTodayUsers函数中的3个条件判断啊，那样才是正确的，并且你要帮我同时实现昨日数据，除采用last_online_time更新这3字段外（lastHourOnlineUsers、lastHourOnlineVipUsers、lastHourOnlineRegularUsers）
		const isToday = user.last_online_time >= todayTimestamp;
		const isYesterday = user.last_online_time >= yesterdayTimestamp && user.last_online_time < todayTimestamp;
		const isLastHour = user.last_online_time >= oneHourAgoTimestamp;

		if (isToday) {
			todayActiveUsers += 1;
			if (user.vip) {
				todayActiveVipUsers += 1;
			} else {
				todayActiveRegularUsers += 1;
			}
		}

		if (isYesterday) {
			yesterdayActiveUsers += 1;
			if (user.vip) {
				yesterdayActiveVipUsers += 1;
			} else {
				yesterdayActiveRegularUsers += 1;
			}
		}

		if (isLastHour) {
			lastHourOnlineUsers += 1;
			if (user.vip) {
				lastHourOnlineVipUsers += 1;
			} else {
				lastHourOnlineRegularUsers += 1;
			}
		}
	});
	
	let opts = {
		todayNewUsers,
		yesterdayNewUsers,
		todayActiveUsers,
		yesterdayActiveUsers,
		todayActiveVipUsers,
		yesterdayActiveVipUsers,
		todayActiveRegularUsers,
		yesterdayActiveRegularUsers,
		lastHourOnlineUsers,
		lastHourOnlineVipUsers,
		lastHourOnlineRegularUsers
	}
	
	console.log("opts", opts)
	
	return {
		todayNewUsers,
		yesterdayNewUsers,
		todayActiveUsers,
		yesterdayActiveUsers,
		todayActiveVipUsers,
		yesterdayActiveVipUsers,
		todayActiveRegularUsers,
		yesterdayActiveRegularUsers,
		lastHourOnlineUsers,
		lastHourOnlineVipUsers,
		lastHourOnlineRegularUsers
	}
}
```


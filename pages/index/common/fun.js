// 获取今日0点的时间戳
function getTodayTimestamp() {
	const now = new Date();
	// 设置时间为今天的0点0分0秒
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	// 获取时间戳
	const timestamp = today.getTime();
	return timestamp;
}

// 获取指定日期的0点的时间戳
function getTimestampOfDate(year, month, day) {
    const date = new Date(year, month, day);
    const timestamp = date.getTime();
    return timestamp;
}

// 获取昨日0点的时间戳
function getYesterdayTimestamp() {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const timestamp = yesterday.getTime();
    return timestamp;
}

// 获取当前时间1小时前的时间戳
function getOneHourAgoTimestamp() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000)); // 减去1小时（60分钟*60秒*1000毫秒）
    return oneHourAgo.getTime();
}

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

// 计算并比较今日与昨日的用户统计数据
function calculateAndCompareUserStats(usersData, userFieldsMap) {
	const todayTimestamp = getTodayTimestamp();
	const yesterdayTimestamp = getYesterdayTimestamp();
	const oneHourAgoTimestamp = getOneHourAgoTimestamp();
	
	console.log('todayTimestamp', todayTimestamp)
	console.log('yesterdayTimestamp', yesterdayTimestamp)

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
	let todayTotalUsers = usersData.length; // 今日现在的总用户数，即用户数据的长度
	let yesterdayTotalUsers = todayTotalUsers; // 默认昨天的总用户数与今天相同，下面会减去今日新增的用户数

	usersData.forEach(user => {
		const registeredToday = user.register_date >= todayTimestamp;
		const registeredYesterday = user.register_date >= yesterdayTimestamp && user.register_date < todayTimestamp;
		const loggedToday = user.login_date >= todayTimestamp;
		const loggedYesterday = user.login_date >= yesterdayTimestamp && user.login_date < todayTimestamp;
		const onlineLastHour = user.last_online_time >= oneHourAgoTimestamp;

		if (registeredToday) {
			todayNewUsers += 1;
			yesterdayTotalUsers -= 1; // 从昨天的总用户数中减掉今天新注册的用户数
		}
		if (registeredYesterday) {
			yesterdayNewUsers += 1;
		}
		if (loggedToday) {
			todayActiveUsers += 1;
			if (user.vip) {
				todayActiveVipUsers += 1;
			} else {
				todayActiveRegularUsers += 1;
			}
		}
		if (loggedYesterday) {
			yesterdayActiveUsers += 1;
			if (user.vip) {
				yesterdayActiveVipUsers += 1;
			} else {
				yesterdayActiveRegularUsers += 1;
			}
		}
		if (onlineLastHour) {
			lastHourOnlineUsers += 1;
			if (user.vip) {
				lastHourOnlineVipUsers += 1;
			} else {
				lastHourOnlineRegularUsers += 1;
			}
		}
	});

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
		lastHourOnlineRegularUsers,
		todayTotalUsers, 
		yesterdayTotalUsers
	}
}



// 格式化设备号
function formatDeviceOaid(deviceOaid, prefixToRemove) {
	// 移除指定前缀
	let cleanedOaid = deviceOaid.replace(prefixToRemove, '');

	// 计算保留的长度
	let halfLength = Math.ceil(cleanedOaid.length / 2); // 保留转为*号的数量

	// 获取前三位和后四位
	let firstThree = cleanedOaid.slice(0, 3);
	let lastFour = cleanedOaid.slice(-4);

	// 使用 * 填充中间部分
	let middleStars = '*'.repeat(halfLength);
	// 使用 * 填充中间部分，保留4个*
	    middleStars = '****';

	// 拼接结果
	let formattedOaid = `${firstThree}${middleStars}${lastFour}`;

	return formattedOaid;
}



export {
	getTodayTimestamp,
	calculateTodayUsers,
	calculateAndCompareUserStats,
	formatDeviceOaid
}
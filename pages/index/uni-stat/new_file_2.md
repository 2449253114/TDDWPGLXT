先给你看一个图表的示例
```vue
<template>
  <view class="charts-box">
    <qiun-data-charts 
      type="line"
      :opts="opts"
      :chartData="chartData"
    />
  </view>
</template>

<script>
export default {
  data() {
    return {
      chartData: {},
      //您可以通过修改 config-ucharts.js 文件中下标为 ['line'] 的节点来配置全局默认参数，如都是默认参数，此处可以不传 opts 。实际应用过程中 opts 只需传入与全局默认参数中不一致的【某一个属性】即可实现同类型的图表显示不同的样式，达到页面简洁的需求。
      opts: {
        color: ["#1890FF","#91CB74","#FAC858","#EE6666","#73C0DE","#3CA272","#FC8452","#9A60B4","#ea7ccc"],
        padding: [15,10,0,15],
        dataLabel: false,
        dataPointShape: false,
        enableScroll: false,
        legend: {},
        xAxis: {
          disableGrid: true
        },
        yAxis: {
          gridType: "dash",
          dashLength: 2,
          data: [
            {
              min: 0,
              max: 150
            }
          ]
        },
        extra: {
          line: {
            type: "curve",
            width: 2,
            activeType: "hollow",
            linearType: "custom",
            onShadow: true,
            animation: "horizontal"
          }
        }
      }
    };
  },
  onReady() {
    this.getServerData();
  },
  methods: {
    getServerData() {
      //模拟从服务器获取数据时的延时
      setTimeout(() => {
        //模拟服务器返回数据，如果数据格式和标准格式不同，需自行按下面的格式拼接
        let res = {
            categories: ["2018","2019","2020","2021","2022","2023"],
            series: [
              {
                name: "成交量A",
                linearColor: [
                  [
                    0,
                    "#1890FF"
                  ],
                  [
                    0.25,
                    "#00B5FF"
                  ],
                  [
                    0.5,
                    "#00D1ED"
                  ],
                  [
                    0.75,
                    "#00E6BB"
                  ],
                  [
                    1,
                    "#90F489"
                  ]
                ],
                setShadow: [
                  3,
                  8,
                  10,
                  "#1890FF"
                ],
                data: [15,45,15,45,15,45]
              },
              {
                name: "成交量B",
                data: [55,85,55,85,55,85]
              },
              {
                name: "成交量C",
                linearColor: [
                  [
                    0,
                    "#FAC858"
                  ],
                  [
                    0.33,
                    "#FFC371"
                  ],
                  [
                    0.66,
                    "#FFC2B2"
                  ],
                  [
                    1,
                    "#FA7D8D"
                  ]
                ],
                setShadow: [
                  3,
                  8,
                  10,
                  "#FC8452"
                ],
                data: [95,125,95,125,95,125]
              }
            ]
          };
        this.chartData = JSON.parse(JSON.stringify(res));
      }, 500);
    },
  }
};
</script>
```
然后我需要帮我结合我的需求和我的代码，去实现这个图表数据，下面是我的代码
```vue
<template>
	<view class="uni-stat--x flex">
		<uni-stat-tabs label="日期选择" :current="currentDateTab" mode="date" :today="true" @change="changeTimeRange" />
		<uni-datetime-picker type="datetimerange" :end="new Date().getTime()" v-model="query.start_time" returnType="timestamp" :clearIcon="false" class="uni-stat-datetime-picker" :class="{'uni-stat__actived': currentDateTab < 0 && !!query.start_time.length}" @change="useDatetimePicker" />
	</view>
	<template>
		<uni-card :is-shadow="false" margin="0" style="margin-bottom: 15px;">
			<text class="uni-h6">活跃就是今天登录的意思，所以昨日不精准，因为昨天的人，今天登录了，就不算昨天的了</text>
		</uni-card>
		<uni-stat-panel :items="userPanelData" :contrast="true" />
		<view class="uni-stat--x p-m">
			<uni-collapse ref="collapse">
				<uni-collapse-item title="用户统计 趋势图" :open="true" :border="false">
					<template slot="title">
						<view class="uni-stat-card-header">
							趋势图
						</view>
					</template>
					<uni-stat-tabs type="box" v-model="userChartTab" :tabs="userChartTabs" class="mb-l" @change="changeChartTab" />
					<view class="uni-charts-box">
						<qiun-data-charts type="area" :chartData="userChartData" :eopts="userEopts" echartsH5 echartsApp tooltipFormat="tooltipCustom" />
					</view>
				</uni-collapse-item>
			</uni-collapse>
		</view>
	</template>
</template>

<script>
	// 格式化日期，返回其所在的范围
	function formatDate(date, type) {
		let d = new Date(date)
		if (type === 'hour') {
			let h = d.getHours()
			h = h < 10 ? '0' + h : h
			return `${h}:00 ~ ${h}:59`
		} else if (type === 'week') {
			const first = d.getDate() - d.getDay() + 1; // First day is the day of the month - the day of the week
			const last = first + 6; // last day is the first day + 6
			let firstday = new Date(d.setDate(first));
			firstday = parseDateTime(firstday)
			let lastday = new Date(d.setDate(last));
			lastday = parseDateTime(lastday)
			return `${firstday} ~ ${lastday}`
		} else if (type === 'month') {
			let firstday = new Date(d.getFullYear(), d.getMonth(), 1);
			firstday = parseDateTime(firstday)
			let lastday = new Date(d.getFullYear(), d.getMonth() + 1, 0);
			lastday = parseDateTime(lastday)
			return `${firstday} ~ ${lastday}`
		} else {
			return parseDateTime(d)
		}
	}

	// 格式化日期，返回其 yyyy-mm-dd 格式
	function parseDateTime(datetime, type, splitor = '-') {
		let d = datetime
		if (typeof d !== 'object') {
			d = new Date(d)
		}
		const year = d.getFullYear()
		const month = d.getMonth() + 1
		const day = d.getDate()
		const hour = d.getHours()
		const minute = d.getMinutes()
		const second = d.getSeconds()
		const date = [year, lessTen(month), lessTen(day)].join(splitor)
		const time = [lessTen(hour), lessTen(minute), lessTen(second)].join(':')
		if (type === "dateTime") {
			return date + ' ' + time
		}
		return date
	}

	function lessTen(item) {
		return item < 10 ? '0' + item : item
	}

	// 获取指定日期当天或 n 天前零点的时间戳，丢弃时分秒
	function getTimeOfSomeDayAgo(days = 0, date = Date.now()) {
		const d = new Date(date)
		const oneDayTime = 24 * 60 * 60 * 1000
		let ymd = [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('/')
		ymd = ymd + ' 00:00:00'
		const someDaysAgoTime = new Date(ymd).getTime() - oneDayTime * days
		return someDaysAgoTime
	}

	// 判断时间差值 delta，单位为天
	function maxDeltaDay(times, delta = 2) {
		if (!times.length) return true
		const wunDay = 24 * 60 * 60 * 1000
		const [start, end] = times
		const max = end - start < wunDay * delta
		return max
	}
	
	
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
	
	
	
	// 更新userFieldsMap中特定字段的value属性
	function updateUserFieldValue(userFieldsMap, fieldToUpdate, newValue, newContrast) {
		const field = userFieldsMap.find(f => f.field === fieldToUpdate);
		if (field) {
			field.value = newValue; // 更新今日数据值
			if (typeof newContrast !== 'undefined') { // 检查是否提供了contrast值
				field.contrast = newContrast; // 更新昨日数据值
			}
		}
	}

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
		contrast: 0,
	}, {
		title: '近1小时内在线VIP用户',
		field: 'last_hour_online_vip_user_count',
		tooltip: '',
		value: 0,
		contrast: 0,
	}, {
		title: '近1小时内在线普通用户',
		field: 'last_hour_online_regular_user_count',
		tooltip: '',
		value: 0,
		contrast: 0,
	}]
	
	const userPanelOption = userFieldsMap.filter(f => f.hasOwnProperty('value'))
	export default {
		data() {
			return {
				userTableData: [],// 用户数据
				total_users: 0, // 用户总数（必须项）
				userFieldsMap,
				currentDateTab: 2,
				userChartTab: 'today_new_user_count',
				userPanelData: userPanelOption,
				userChartData: {},
				tabIndex: 0,
				tabName: '新增用户',
			}
		},
		computed: {
			userChartTabs() {
				const tabs = []
				userFieldsMap.forEach(item => {
					// 我需要过滤掉field = last_hour_online开头的item
					const _id = item.field
					const name = item.title
					// 过滤掉field以last_hour_online开头的项
					if (_id && name && !_id.startsWith('last_hour_online')) {
						tabs.push({
							_id,
							name
						});
					}
				})
				return tabs
			},
		},
		onReady() {
			this.loadData();
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
				this.total_users = result.total
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
			},
			// 更新表格字段以包含统计信息
			updateTableFieldsWithStats() {
				// 计算并比较今日与昨日的用户统计数据
				const {
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
				} = calculateAndCompareUserStats(this.userTableData, this.userFieldsMap);
				
				// 更新 userFieldsMap 中的数据，同时提供今日和昨日的数据
				updateUserFieldValue(this.userFieldsMap, 'today_new_user_count', todayNewUsers, yesterdayNewUsers);
				updateUserFieldValue(this.userFieldsMap, 'today_active_user_count', todayActiveUsers, yesterdayActiveUsers);
				updateUserFieldValue(this.userFieldsMap, 'today_active_vip_user_count', todayActiveVipUsers, yesterdayActiveVipUsers);
				updateUserFieldValue(this.userFieldsMap, 'today_active_regular_user_count', todayActiveRegularUsers, yesterdayActiveRegularUsers);
				
				updateUserFieldValue(this.userFieldsMap, 'last_hour_online_user_count', lastHourOnlineUsers);
				updateUserFieldValue(this.userFieldsMap, 'last_hour_online_vip_user_count', lastHourOnlineVipUsers);
				updateUserFieldValue(this.userFieldsMap, 'last_hour_online_regular_user_count', lastHourOnlineRegularUsers);
				
				updateUserFieldValue(this.userFieldsMap, 'total_users', todayTotalUsers, yesterdayTotalUsers);
				// 如果需要更新昨日数据，可以继续添加相应的更新逻辑
				
			},
			changeTimeRange(id, index) {
				this.currentDateTab = index
				const day = 24 * 60 * 60 * 1000
				let start, end
				start = getTimeOfSomeDayAgo(id)
				if (!id) {
					end = getTimeOfSomeDayAgo(0) + day - 1
				} else {
					end = getTimeOfSomeDayAgo(0) - 1
				}
				this.query.start_time = [start, end]
			},

			changeChartTab(id, index, name) {
				this.tabIndex = index
				this.tabName = name
				this.getChartData(this.query, id, name)
			},
		}
	}
</script>
```
```json
// userTableData
[{
    "_id": "65be37419755e3283004978c",
    "register_date": 1706964801549,// 注册时间
    "login_date": 1717764251908,// 最近登录时间
    "vip": true,// 是否VIP
    "last_online_time": 1717829436922 // 最近一小时内在线时间的时间戳
}]
```































你现在给我的是固定7天前的数据，但是我需求是动态的，天数是可以变化的
```javascript
// 计算过去七天每天的统计数据
calculateUserStatsForChart() {
    const daysToDisplay = 7;// daysToDisplay = this.currentDaysTab
    const todayTimestamp = getTodayTimestamp();
	
    let chartData = {
		categories: [],
		series: [
			{ name: '新增用户', data: [] },
			//{ name: '活跃用户', data: [] },
			//{ name: '活跃VIP用户', data: [] }
		]
    };
	
	// 需要判断daysToDisplay是否>=7，才走下面逻辑让图表按照日期去展示每日数据，否则按照当天的时间段去展示每小时时间段的新增用户，比如选择的小于7天可能有这些情况（今天的或昨天的或前天的）每小时新增的数据展示
    // 计算过去七天的日期和统计数据（过去几天，最低就是7）
    for (let i = daysToDisplay - 1; i >= 0; i--) {
		let timestamp = getTimeOfSomeDayAgo(i);
		let dateString = parseDateTime(timestamp);
		chartData.categories.push(dateString);
		
		let dailyNewUsers = 0;
		let dailyActiveUsers = 0;
		let dailyActiveVipUsers = 0;
		
		const dayTimestamp = 24 * 60 * 60 * 1000 // 一天的时间戳
		
		this.userTableData.forEach(user => {
			if (user.register_date >= timestamp && user.register_date < timestamp + 86400000) {
				dailyNewUsers++;
			}
			if (user.login_date >= timestamp && user.login_date < timestamp + 86400000) {
				dailyActiveUsers++;
				if (user.vip) {
					dailyActiveVipUsers++;
				}
			}
		});

		chartData.series[0].data.push(dailyNewUsers);
		//chartData.series[1].data.push(dailyActiveUsers);
		//chartData.series[2].data.push(dailyActiveVipUsers);
    }

    this.userChartData = chartData;
},
```




























# 
现在新增了需求
```javascript
		tabIndex: 0,
		tabName: '新增用户',
	}
},
computed: {
	userChartTabs() {
		const tabs = []
		userFieldsMap.forEach(item => {
			const _id = item.field
			const name = item.title
			// 过滤掉其他项，只保留新增用户、总用户数
			if (_id && name && _id.startsWith('today_new_user_count') || name && _id.startsWith('total_users')) {
				tabs.push({
					_id,
					name
				});
			}
		})
		return tabs
	},
},
changeChartTab(id, index, name) {
	this.tabIndex = index
	this.tabName = name
},
// 计算过去七天每天的统计数据
calculateUserStatsForChart() {
	// 要判断当前tab选择的类型 
	// ??Type或者？= this.tabIndex（0=新增用户，1=总用户数），然后展示需求还是按照下面的代码逻辑一样
	
    const daysToDisplay = this.currentDaysTab;// 使用用户选择的时间范围，默认为7天
    const todayTimestamp = getTodayTimestamp();
	
    let chartData = {
		categories: [],
		series: [{ name: '新增用户', data: [] }]
    };

    // 计算过去七天的日期和统计数据
    if (daysToDisplay >= 7) {
		// 如果选择的天数大于等于7天，则按天展示数据
		for (let i = daysToDisplay - 1; i >= 0; i--) {
			let timestamp = getTimeOfSomeDayAgo(i);
			let dateString = parseDateTime(timestamp);
			chartData.categories.push(dateString);

			let dailyNewUsers = 0;
			const dayTimestamp = 24 * 60 * 60 * 1000 // 一天的时间戳
			
			this.userTableData.forEach(user => {
				if (user.register_date >= timestamp && user.register_date < timestamp + 86400000) {
					dailyNewUsers++;
				}
			});

			chartData.series[0].data.push(dailyNewUsers);
		}
	} else {
		// 如果选择的天数小于7天，则按小时展示当天的数据
		// 获取当天0点时间戳或选择的天数之前的0点时间戳
		let dayTimestamp = getTimeOfSomeDayAgo(daysToDisplay);
		for (let i = 0; i < 24; i++) {
			let timestamp = dayTimestamp + i * 3600000; // 计算每个小时的开始时间戳
			let hourString = `${i < 10 ? '0' + i : i}:00`;
			chartData.categories.push(hourString); // 使用push来确保从0点开始到23点结束的顺序
		
			let hourlyNewUsers = 0;
			
			this.userTableData.forEach(user => {
				if (user.register_date >= timestamp && user.register_date < timestamp + 3600000) {
					hourlyNewUsers++;
				}
			});
		
			chartData.series[0].data.push(hourlyNewUsers); // 使用push来确保顺序
		}
		
	}
	
	console.log("chartData.categories,", chartData.categories)
    
    this.userChartData = chartData;
},
```




















你偷懒了，总用户数数据逻辑你没写
```javascript
calculateUserStatsForChart() {
	const daysToDisplay = this.currentDaysTab; // 使用用户选择的时间范围，默认为7天
	let chartData = {
		categories: [],
		series: [{ name: this.tabName, data: [] }]
	};

	if (daysToDisplay >= 7) {
		for (let i = daysToDisplay - 1; i >= 0; i--) {
			let timestamp = getTimeOfSomeDayAgo(i);
			let dateString = parseDateTime(timestamp);
			chartData.categories.push(dateString);

			let dataCount = 0;
			
			this.userTableData.forEach(user => {
				if (this.tabIndex === 0 && user.register_date >= timestamp && user.register_date < timestamp + 86400000) {
					// 新增用户数据
					dataCount++;
				} else if (this.tabIndex === 1) {
					// 总用户数数据逻辑（示例，需要根据实际逻辑调整）
					// 假设每个用户都有一个状态标记他们是否是总用户
					if (user.is_total_user) {
						dataCount++;
					}
				}
			});

			chartData.series[0].data.push(dataCount);
		}
	} else {
		let dayTimestamp = getTimeOfSomeDayAgo(daysToDisplay);
		for (let i = 0; i < 24; i++) {
			let timestamp = dayTimestamp + i * 3600000;
			let hourString = `${i < 10 ? '0' + i : i}:00`;
			chartData.categories.push(hourString);
			
			let dataCount = 0;
			
			this.userTableData.forEach(user => {
				if (this.tabIndex === 0 && user.register_date >= timestamp && user.register_date < timestamp + 3600000) {
					// 新增用户数据
					dataCount++;
				} else if (this.tabIndex === 1) {
					// 总用户数数据逻辑（示例，需要根据实际逻辑调整）
					if (user.is_total_user) {
						dataCount++;
					}
				}
			});
			
			chartData.series[0].data.push(dataCount);
		}
	}
	
	console.log("chartData.categories,", chartData.categories);
	this.userChartData = chartData;
}
```
总用户数数据逻辑是通过用户注册时间来确定的
```json
// userTableData
[{
    "_id": "65be37419755e3283004978c",
    "register_date": 1706964801549,// 注册时间
    "login_date": 1717764251908,// 最近登录时间
    "vip": true,// 是否VIP
    "last_online_time": 1717829436922 // 最近一小时内在线时间的时间戳
}]
```
比如要找出昨天的数据，也就是截止昨天23:59:59共注册的用户数，最简单的方式是直接用减法，从总用户数中，减掉今天注册的用户，你可以看下面的参考，给你格思路

```javascript
let todayTotalUsers = usersData.length; // 今日现在的总用户数，即用户数据的长度
let yesterdayTotalUsers = todayTotalUsers; // 默认昨天的总用户数与今天相同，下面会减去今日新增的用户数

usersData.forEach(user => {
	const registeredToday = user.register_date >= todayTimestamp;
	const registeredYesterday = user.register_date >= yesterdayTimestamp && user.register_date < todayTimestamp;
	const loggedToday = user.login_date >= todayTimestamp;
	const loggedYesterday = user.login_date >= yesterdayTimestamp && user.login_date < todayTimestamp;


	if (registeredToday) {
		todayNewUsers += 1;
		yesterdayTotalUsers -= 1; // 从昨天的总用户数中减掉今天新注册的用户数
	}
```




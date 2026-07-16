看我代码中的需求
```vue
<template>
	<!-- 表格组件 -->
	<uni-table style="width: 450px;" border stripe>
		<uni-tr>
			<uni-th width="150" align="left">设备号</uni-th>
			<uni-th width="150" align="left">邀请码</uni-th>
			<uni-th width="150" align="left">邀请人数</uni-th>
		</uni-tr>
		<uni-tr v-for="(item ,index) in userTableData" :key="index">
			<uni-td>{{ formatDeviceOaid(item.device_oaid) }}</uni-td>
			<uni-td>{{item.my_invite_code}}</uni-td>
			<uni-td>{{'共邀请10人'}}</uni-td>
		</uni-tr>
	</uni-table>
</template>

<script>	
	import {
		calculateTodayUsers,
		formatDeviceOaid
	} from './common/fun.js'
	
	const db = uniCloud.database()
	const dbCmd = db.command
	
	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)

	export default {
		data() {
			return {
				userTableData: [],
				total_users: 0,
				today_new_user_count: 0,
				today_active_user_count: 0,
				loading: false,
			}
		},
		computed: {
			
		},
		onReady() {
			this.loadData();
		},
		methods: {
			async loadData() {
				uni.showLoading()
				await this.queryUserCounts()
				await this.fetchUserData()
				uni.hideLoading()
			},
			async queryUserCounts() {
				const { result } = await userCollection.count()
				this.total_users = result.total
			},
			
			// 获取用户数据
			async fetchUserData() {
				const totalUsers = this.total_users
				const MAX_LIMIT = 1000; // uniapp的limit最大值
				let allUsers = []
				
				for (let i = 0; i < totalUsers; i += MAX_LIMIT) {
					// 当前第i页的数据
					console.log(`当前第${i / MAX_LIMIT + 1}页`);
					const { result } = await userCollection.skip(i).limit(MAX_LIMIT).get();
					allUsers = allUsers.concat(result.data);
				}
				console.log('所有用户:', allUsers);
				
				this.userTableData = allUsers;
			  
				// 在获取数据后立即计算统计信息并更新字段
				this.updateTableFieldsWithStats();
			},
			
			// 更新表格字段以包含统计信息
			updateTableFieldsWithStats() {
				// 这里假设calculateTodayUsers是您计算今日新增和活跃用户的方法
				const { todayNewUsers, todayActiveUsers } = calculateTodayUsers(this.userTableData);
		
				// 创建今日新增用户和今日活跃用户的字段信息
				const todayStats = [
					{ title: '今日新增用户', value: todayNewUsers.toString() },
					{ title: '今日活跃用户', value: todayActiveUsers.toString() }
				];
		
				this.today_new_user_count = todayStats[0].value
				this.today_active_user_count = todayStats[1].value
			},
			formatDeviceOaid,
		}

	}
</script>
```
然后我现在有个接口是返回所有用户数据，长这个样子
```json
[
    {
        "_id": "65be37419755e3283004978c",
        "register_ip": "223.104.123.170",
        "register_date": 1706964801549,
        "login_date": 1715224735207,
        "login_ip": "112.41.83.100"
	},
    {
        "_id": "6610b5aba09a9b12d7122525",
        "inviter_uid": "65be37419755e3283004978c",
        "invite_time": 1693460595076,
        "register_ip": "111.183.120.76",
        "register_date": 1712371115413,
        "login_ip": "111.183.120.76",
        "login_date": 1712371118606
    },
    {
        "_id": "663c0afd6e5d2ddb51419468",
        "inviter_uid": "",
        "invite_time": 0,
        "register_ip": "112.97.82.155",
        "register_date": 1715211005816,
        "login_ip": "112.97.82.155",
        "login_date": 1715211008821,
    },
    {
        "_id": "663c10bbbd022087df1526b4",
        "inviter_uid": "",
        "invite_time": 0,
        "register_ip": "223.85.187.19",
        "register_date": 1715212475121,
        "login_ip": "223.85.187.19",
        "login_date": 1715223463370,
    },
    {
        "_id": "663c125ee0ec199b187066bf",
        "inviter_uid": "",
        "invite_time": 0,
        "register_ip": "124.160.201.214",
        "register_date": 1715212894890,
        "login_ip": "124.160.201.214",
        "login_date": 1715214648063
    },
    {
        "_id": "663c1c118620667bb4d48e32",
        "inviter_uid": "65be37419755e3283004978c",
        "invite_time": 1715215418188,
        "register_ip": "124.117.120.26",
        "register_date": 1715215377850,
        "login_ip": "124.117.120.26",
        "login_date": 1715217051338,
    },
    {
        "_id": "663c1c250d2b315faf8f95a4",
        "inviter_uid": "65be37419755e3283004978c",
        "invite_time": 1715215441934,
        "register_ip": "183.42.136.40",
        "register_date": 1715215397814,
        "login_ip": "183.42.136.40",
        "login_date": 1715216851113,
    },
    {
        "_id": "663c1c5c8a5c7863b187db2a",
        "inviter_uid": "65be37419755e3283004978c",
        "invite_time": 1715215640088,
        "register_ip": "183.198.29.214",
        "register_date": 1715215452170,
        "login_ip": "183.198.29.214",
        "login_date": 1715224700564,
    },
    {
        "_id": "663c1de7213929f866b10ac1",
        "device_oaid": "96b8907d851528b7",
        "inviter_uid": "",
        "invite_time": 0,
        "register_ip": "117.173.203.114",
        "register_date": 1715215847775,
        "login_ip": "117.173.203.114",
        "login_date": 1715217338127,
    },
    {
        "_id": "663c2655a7c432936b8c8945",
        "device_oaid": "cab6f047-f96d-4d1e-ab5c-dea7b58ab71e",
        "inviter_uid": "",
        "invite_time": 0,
        "register_ip": "223.104.250.27",
        "register_date": 1715218005746,
        "login_ip": "223.104.250.27",
        "login_date": 1715218007726,
    },
    {
        "_id": "663c27123d029c65e9467ac6",
        "inviter_uid": "663c1c5c8a5c7863b187db2a",
        "invite_time": 1715218266092,
        "register_ip": "183.198.29.214",
        "register_date": 1715218194400,
        "login_ip": "183.198.29.214",
        "login_date": 1715218560200,
    },
    {
        "_id": "663c33ddb9fb2360b09faf2a",
        "inviter_uid": "",
        "invite_time": 0,
        "register_ip": "61.163.131.233",
        "register_date": 1715221469621,
        "login_ip": "61.163.131.233",
        "login_date": 1715221480492,
    },
    {
        "_id": "663c38878a5c7863b18ca40e",
        "inviter_uid": "",
        "invite_time": 0,
        "register_ip": "218.12.17.146",
        "register_date": 1715222663482,
        "login_ip": "218.12.17.146",
        "login_date": 1715225333724,
    },
    {
        "_id": "663c39c8ee97ef5896cdda00",
        "inviter_uid": "",
        "invite_time": 0,
        "register_ip": "223.66.138.251",
        "register_date": 1715222984288,
        "login_ip": "223.104.151.138",
        "login_date": 1715224850969,
    },
    {
        "_id": "663c3ced8620667bb4da17ee",
        "inviter_uid": "663c33ddb9fb2360b09faf2a",
        "invite_time": 1715223808927,
        "register_ip": "223.104.107.209",
        "register_date": 1715223789514,
        "login_ip": "223.104.107.209",
        "login_date": 1715223796131,
    },
    {
        "_id": "663c44dc3d029c65e94c2e78",
        "inviter_uid": "65be37419755e3283004978c",
        "invite_time": 1715225922787,
        "register_ip": "36.100.45.195",
        "register_date": 1715225820174,
        "login_ip": "36.100.45.195",
        "login_date": 1715225878637,
    }
]
```
我需要你帮我实现，结合我的数据来显示对应用户邀请了多少人, inviter_uid=我的邀请人的_id


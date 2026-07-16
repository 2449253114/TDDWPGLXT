<template>
	<view class="uni-container">
		<uni-forms ref="form" :model="formData" validateTrigger="bind">
			<uni-forms-item name="title" label="通知标题">
				<uni-easyinput placeholder="通知标题" v-model="formData.title"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="content" label="通知内容">
				<uni-easyinput placeholder="通知内容" type="textarea" v-model="formData.content" :maxlength="-1"
					:auto-height="true"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="user_type" label="通知群体">
				<uni-data-checkbox v-model="formData.user_type" :localdata="formOptions.user_type"></uni-data-checkbox>
				<div>{{ `当前选择用户数量：${ target_user_total }` }}</div>
			</uni-forms-item>
			<uni-forms-item name="create_date" label="创建时间">
				<uni-datetime-picker return-type="timestamp" v-model="formData.create_date"></uni-datetime-picker>
			</uni-forms-item>
			<view class="uni-button-group">
				<button type="primary" class="uni-button" style="width: 100px;" @click="submit">提交</button>
				<navigator open-type="navigateBack" style="margin-left: 15px;">
					<button class="uni-button" style="width: 100px;">返回</button>
				</navigator>
			</view>
		</uni-forms>
	</view>
</template>

<script>
	import {
		validator
	} from '@/js_sdk/validator/system-app-notice.js';

	const db = uniCloud.database();
	const dbCmd = db.command;

	const appNoticeCollectionName = 'system-app-notice';
	const appNoticeCollection = db.collection(appNoticeCollectionName)

	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)

	export default {
		data() {
			let formData = {
				"title": "",
				"content": "",
				"user_type": 0,
				"create_date": null,
				"is_read": false
			}
			return {
				formData,
				formOptions: {
					"user_type": [{
							"value": 0,
							"text": "全部用户"
						},
						{
							"value": 1,
							"text": "VIP用户"
						},
						{
							"value": 2,
							"text": "非VIP用户"
						}
					],
				},
				userTableData: [], // 用户数据
				vipUsers: [], // 存储VIP用户的_id数组
				nonVipUsers: [], // 存储非VIP用户的_id数组
				total_users: 0, // 用户总数
			}
		},
		computed: {
			target_user_total() {
				// 假设我们已经有了total_users和total_vips变量分别保存了全部用户数和VIP用户数
				// 注意这里的实际实现需要根据您的数据库结构进行调整
				switch (this.formData.user_type) {
					case 1: // VIP用户
						return this.vipUsers.length;
					case 2: // 非VIP用户
						return this.nonVipUsers.length;
					default: // 全部用户
						return this.total_users;
				}
			}
		},
		async onReady() {
			await this.loadData()
		},
		methods: {
			async loadData() {
				uni.showLoading({
					title: "加载中"
				})
				await this.queryUserCounts()
				await this.fetchUserData()
				uni.hideLoading()
			},
			async queryUserCounts() {
				const {
					result
				} = await userCollection.count()
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
					const {
						result
					} = await userCollection.field({ vip: true }).skip(i).limit(MAX_LIMIT).get();
					allUsers = allUsers.concat(result.data);
				}
				console.log('所有用户:', allUsers);

				this.userTableData = allUsers;
				this.processUserTypes()
			},
			// 新方法：处理用户类型，收集VIP和非VIP用户的_id
			processUserTypes() {
				let vipIds = [];
				let nonVipIds = [];

				this.userTableData.forEach(user => {
					if (user.vip) {
						vipIds.push(user._id);
					} else {
						nonVipIds.push(user._id);
					}
				});

				this.vipUsers = vipIds;
				this.nonVipUsers = nonVipIds;
			},
			async submit() {
				// 这里构造一个批量通知的数据，然后title、content、create_date、is_read不变，就user_id是根据user_type的值而变的
				/* 下面是表结构，你看了后应该知道我的意思了吧
				"title": {
					"bsonType": "string",
					"title": "通知标题",
					"description": "通知标题", // 邀请码使用通知、新用户注册通知、会员充值通知、金币充值通知
					"maxLength": 100,
					"defaultValue": ""
				},
				"content": {
					"bsonType": "string",
					"title": "通知内容",
					"description": "通知内容",
					"maxLength": 1000,
					"defaultValue": ""
				},
				"user_id": {
					"bsonType": "string",
					"title": "接收通知的用户ID",
					"description": "接收通知的用户ID",
					"foreignKey": "user-accounts._id",
					"defaultValue": ""
				},
				"create_date": {
					"bsonType": "timestamp",
					"title": "创建时间",
					"description": "通知创建时间戳",
					"defaultValue": {
						"$env": "now"
					}
				},
				"is_read": {
					"bsonType": "bool",
					"title": "是否已读",
					"description": "用户是否已读",
					"defaultValue": false
				} */


				//const addResult = await appNoticeCollection.add()




				// 根据用户类型选择目标用户ID数组
				let targetUserIds = [];
				switch (this.formData.user_type) {
					case 0: // 全部用户
						targetUserIds = this.userTableData.map(user => user._id);
						break;
					case 1: // VIP用户
						targetUserIds = this.vipUsers;
						break;
					case 2: // 非VIP用户
						targetUserIds = this.nonVipUsers;
						break;
				}

				// 准备批量添加的数据
				let batchNotices = targetUserIds.map(userId => ({
					title: this.formData.title,
					content: this.formData.content,
					user_id: userId,
					create_date: this.formData.create_date || new Date().getTime(), // 如果未指定，使用当前时间
					is_read: this.formData.is_read
				}));
				
				console.log('batchNotices', batchNotices)
				
				// 分批处理批量添加，以避免超过数据库限制
				const BATCH_SIZE = 500; // 假设数据库一次最多处理500条记录，实际值请根据数据库限制调整
				for (let i = 0; i < batchNotices.length; i += BATCH_SIZE) {
					let batch = batchNotices.slice(i, i + BATCH_SIZE);
					const addResult = await appNoticeCollection.add(batch);
					console.log(`Added ${batch.length} notices, result:`, addResult);
				}

				// 反馈操作结果
				uni.showToast({
					title: '通知发送完成',
					icon: 'success',
					duration: 2000
				});


			}
		}
	}
</script>

<style>

</style>
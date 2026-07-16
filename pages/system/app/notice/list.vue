<template>
	<view>
		<view class="uni-header">
			<view class="uni-group">
				<!-- <view class="uni-title"></view> -->
				<!-- <view class="uni-sub-title"></view> -->
				<button class="uni-button" type="primary" size="mini" @click="navigateTo('./mass')">群发通知</button>
				<button class="uni-button" type="warn" size="mini" @click="cleanDeletedUserNotices">清理已删除用户的通知</button>
				<button class="uni-button" type="warn" size="mini" @click="deleteReadNotices">删除已读通知</button>
			</view>
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="query" @confirm="search" placeholder="请输入搜索内容" />
				<button class="uni-button" type="default" size="mini" @click="search">搜索</button>
				<button class="uni-button" type="default" size="mini" @click="navigateTo('./add')">新增</button>
				<button class="uni-button" type="default" size="mini" :disabled="!selectedIndexs.length"
					@click="delTable">批量删除</button>
				<download-excel class="hide-on-phone" :fields="exportExcel.fields" :data="exportExcelData"
					:type="exportExcel.type" :name="exportExcel.filename">
					<button class="uni-button" type="primary" size="mini">导出 Excel</button>
				</download-excel>
			</view>
		</view>
		<view class="uni-container">
			<unicloud-db ref="udb" :collection="collectionList" field="title,content,user_id,create_date,is_read"
				:where="where" page-data="replace" :orderby="orderby" :getcount="true" :page-size="options.pageSize"
				:page-current="options.pageCurrent" v-slot:default="{data,pagination,loading,error,options}"
				:options="options" loadtime="manual" @load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe
					type="selection" @selection-change="selectionChange">
					<uni-tr>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'title')"
							sortable @sort-change="sortChange($event, 'title')">通知标题</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'content')"
							sortable @sort-change="sortChange($event, 'content')">通知内容</uni-th>
						<uni-th align="center" sortable @sort-change="sortChange($event, 'user_id')">接收通知的用户ID</uni-th>
						<uni-th align="center" filter-type="timestamp"
							@filter-change="filterChange($event, 'create_date')" sortable
							@sort-change="sortChange($event, 'create_date')">创建时间</uni-th>
						<uni-th align="center" sortable @sort-change="sortChange($event, 'is_read')">是否已读</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<uni-td align="center">{{item.title}}</uni-td>
						<uni-td align="center">{{item.content}}</uni-td>
						<uni-td align="center">{{item.user_id}}</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.create_date"></uni-dateformat>
						</uni-td>
						<uni-td align="center">{{item.is_read == true ? '✅' : '❌'}}</uni-td>
						<uni-td align="center">
							<view class="uni-group">
								<button @click="navigateTo('./edit?id='+item._id, false)" class="uni-button" size="mini"
									type="primary">修改</button>
								<button @click="confirmDelete(item._id)" class="uni-button" size="mini"
									type="warn">删除</button>
							</view>
						</uni-td>
					</uni-tr>
				</uni-table>
				<view class="uni-pagination-box">
					<uni-pagination show-icon :page-size="pagination.size" v-model="pagination.current"
						:total="pagination.count" @change="onPageChanged" />
				</view>
			</unicloud-db>
		</view>
	</view>
</template>

<script>
	import {
		enumConverter,
		filterToWhere
	} from '@/js_sdk/validator/system-app-notice.js';

	const db = uniCloud.database()
	const dbCmd = db.command;

	const appNoticeCollectionName = 'system-app-notice';
	const appNoticeCollection = db.collection(appNoticeCollectionName)

	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)


	// 表查询配置
	const dbOrderBy = '' // 排序字段
	const dbSearchFields = [] // 模糊搜索字段，支持模糊搜索的字段列表。联表查询格式: 主表字段名.副表字段名，例如用户表关联角色表 role.role_name
	// 分页配置
	const pageSize = 1000
	const pageCurrent = 1

	const orderByMapping = {
		"ascending": "asc",
		"descending": "desc"
	}

	export default {
		data() {
			return {
				collectionList: "system-app-notice",
				query: '',
				where: '',
				orderby: dbOrderBy,
				orderByFieldName: "",
				selectedIndexs: [],
				options: {
					pageSize,
					pageCurrent,
					filterData: {},
					...enumConverter
				},
				imageStyles: {
					width: 64,
					height: 64
				},
				exportExcel: {
					"filename": "system-app-notice.xls",
					"type": "xls",
					"fields": {
						"通知标题": "title",
						"通知内容": "content",
						"接收通知的用户ID": "user_id",
						"创建时间": "create_date",
						"is_read": "is_read"
					}
				},
				exportExcelData: [],
				userTableData: [], // 用户数据
				total_users: 0, // 用户总数
				total_notices: 0, // 通知总数
				noticeTableData: [], // 通知数据
			}
		},
		onLoad() {
			this._filter = {}
		},
		onReady() {
			this.$refs.udb.loadData()
		},
		methods: {
			onqueryload(data) {
				this.exportExcelData = data
			},
			getWhere() {
				const query = this.query.trim()
				if (!query) {
					return ''
				}
				const queryRe = new RegExp(query, 'i')
				return dbSearchFields.map(name => queryRe + '.test(' + name + ')').join(' || ')
			},
			search() {
				const newWhere = this.getWhere()
				this.where = newWhere
				this.$nextTick(() => {
					this.loadData()
				})
			},
			loadData(clear = true) {
				this.$refs.udb.loadData({
					clear
				})
			},
			onPageChanged(e) {
				this.selectedIndexs.length = 0
				this.$refs.table.clearSelection()
				this.$refs.udb.loadData({
					current: e.current
				})
			},
			navigateTo(url, clear) {
				// clear 表示刷新列表时是否清除页码，true 表示刷新并回到列表第 1 页，默认为 true
				uni.navigateTo({
					url,
					events: {
						refreshData: () => {
							this.loadData(clear)
						}
					}
				})
			},
			// 多选处理
			selectedItems() {
				var dataList = this.$refs.udb.dataList
				return this.selectedIndexs.map(i => dataList[i]._id)
			},
			// 批量删除
			delTable() {
				this.$refs.udb.remove(this.selectedItems(), {
					success: (res) => {
						this.$refs.table.clearSelection()
					}
				})
			},
			// 多选
			selectionChange(e) {
				this.selectedIndexs = e.detail.index
			},
			confirmDelete(id) {
				this.$refs.udb.remove(id, {
					success: (res) => {
						this.$refs.table.clearSelection()
					}
				})
			},
			sortChange(e, name) {
				this.orderByFieldName = name;
				if (e.order) {
					this.orderby = name + ' ' + orderByMapping[e.order]
				} else {
					this.orderby = ''
				}
				this.$refs.table.clearSelection()
				this.$nextTick(() => {
					this.$refs.udb.loadData()
				})
			},
			filterChange(e, name) {
				this._filter[name] = {
					type: e.filterType,
					value: e.filter
				}
				let newWhere = filterToWhere(this._filter, db.command)
				if (Object.keys(newWhere).length) {
					this.where = newWhere
				} else {
					this.where = ''
				}
				this.$nextTick(() => {
					this.$refs.udb.loadData()
				})
			},
			/* 
			 userTableData: [], // 用户数据
			 total_users: 0, // 用户总数
			 total_notices: 0, // 通知总数
			 noticeTableData: [], // 通知数据
			 */
			// 清理已删除用户的通知
			async cleanDeletedUserNotices() {
				// 轮训查询通知，
				await this.loadData()
				// 然后把user_id取出，放到数组中，再把user_id数组去检查userTableData数组中是否有，找到未包含的user_id记录，这些就是已删除用户，放到新的数组中，之后需要用这个数据去删除这些不存在的user_id的通知
				// 你帮我实现
				// 显示加载提示
				uni.showLoading({
					title: "正在清理"
				});

				// 提取通知中的 user_id 并去重
				const noticeUserIds = new Set(this.noticeTableData.map(item => item.user_id));
				console.log("通知中的 user_id 集合:", Array.from(noticeUserIds));

				// 提取用户数据中的 _id 并去重
				const userTableUserIds = new Set(this.userTableData.map(user => user._id));
				console.log("用户数据中的 _id 集合:", Array.from(userTableUserIds));

				// 找出通知中存在但用户数据中不存在的 user_id，即已删除用户的 user_id
				const deletedUserIds = Array.from(noticeUserIds).filter(id => !userTableUserIds.has(id));
				console.log("已删除用户的 user_id 集合:", deletedUserIds, deletedUserIds.length);

				await this.deleteNoticeByUserId(deletedUserIds);

				// 隐藏加载提示
				uni.hideLoading();

			},
			// 以下是一个示例的 deleteNoticeByUserId 函数实现
			// 你需要根据你的数据库 API 来实现这个函数
			async deleteNoticeByUserId(deletedUserIds) {
				// 这里应该是删除操作，使用 userId 来删除通知
				// 例如:
				const { result } = await appNoticeCollection.where({ user_id: dbCmd.in(deletedUserIds) }).remove();
				console.log(`删除了 ${result.deleted} 条用户的通知`);
				
				uni.showToast({
					title: `删除了 ${result.deleted} 条用户的通知`,
					icon: 'none'
				})
			},
			async loadData() {
				uni.showLoading({
					title: "加载中"
				})
				await this.queryUserCounts()
				await this.fetchUserData()
				await this.queryNoticeCounts()
				await this.fetchNoticeData()
				uni.hideLoading()
			},
			async queryUserCounts() {
				const {
					result
				} = await userCollection.count()
				this.total_users = result.total
				console.log("总用户数：", result.total)
			},
			// 获取用户数据
			async fetchUserData() {
				const totalUsers = this.total_users
				const MAX_LIMIT = 1000; // uniapp的limit最大值
				let allUsers = []

				for (let i = 0; i < totalUsers; i += MAX_LIMIT) {
					// 当前第i页的数据
					console.log(`用户：当前第${i / MAX_LIMIT + 1}页`);
					const {
						result
					} = await userCollection.field({
						_id: true
					}).skip(i).limit(MAX_LIMIT).get();
					allUsers = allUsers.concat(result.data);
				}
				console.log('所有用户:', allUsers);

				this.userTableData = allUsers;
			},
			async queryNoticeCounts() {
				const {
					result
				} = await appNoticeCollection.count()
				this.total_notices = result.total
				console.log("总通知数：", result.total)
			},
			// 获取通知数据
			async fetchNoticeData() {
				const totalNotices = this.total_notices
				const MAX_LIMIT = 1000; // uniapp的limit最大值
				let allNotices = []

				for (let i = 0; i < totalNotices; i += MAX_LIMIT) {
					// 当前第i页的数据
					console.log(`通知：当前第${i / MAX_LIMIT + 1}页`);
					const {
						result
					} = await appNoticeCollection.field({
						_id: true,
						user_id: true
					}).skip(i).limit(MAX_LIMIT).get();
					allNotices = allNotices.concat(result.data);
				}
				console.log('所有通知:', allNotices);

				this.noticeTableData = allNotices;
			},
			
			// 删除已读通知
			async deleteReadNotices() {
				uni.showLoading({
					title: '删除中'
				})
			  try {
			    // 查找所有已读通知并删除
			    let {
						result
					} = await appNoticeCollection.where({
			      is_read: true
			    }).remove();
			
			    // 打印删除的记录数量
			    console.log("删除成功，删除条数为: ", result.deleted);
					uni.hideLoading()
					uni.showToast({
						title: `删除 ${result.deleted} 条`,
						icon: 'none'
					})
			  } catch (err) {
			    // 捕获并打印错误信息
			    console.log("删除失败: ", err.message);
					uni.hideLoading()
					uni.showToast({
						title: `删除失败 ${err.message}`,
						icon: 'none'
					})
			  }
			},
		}
	}
</script>

<style>
</style>
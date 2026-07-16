<template>
	<view>
		<view class="uni-header">
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="query_userid" @confirm="searchToEdit" placeholder="请输入用户id" />
				<button class="uni-button" type="primary" size="mini" @click="searchToEdit">搜索并修改</button>
				<button class="uni-button" type="warn" size="mini" :disabled="!selectedIndexs.length"
					@click="delTableAndInviteCode">批量删除并清理邀请码</button>


				<!-- 6647e8e07ad52dfccc7a52f4 第一笔200元充值的用户（也是第一位充值的用户） -->
				<!-- <view class="uni-title"></view> -->
				<!-- <view class="uni-sub-title"></view> -->
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
			<unicloud-db ref="udb" :collection="collectionList"
				field="is_internal_user,username,password,nickname,introduction,daily_movie_count,surplus_movie_count,score,coin,vip,vip_expire_date,vip_level,inviter_uid,invite_time,my_invite_code,device_oaid,app_platform,status,avatar,login_date,login_ip,register_date,register_ip"
				:where="where" page-data="replace" :orderby="orderby" :getcount="true" :page-size="options.pageSize"
				:page-current="options.pageCurrent" v-slot:default="{data,pagination,loading,error,options}" :options="options"
				loadtime="manual" @load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe type="selection"
					@selection-change="selectionChange">
					<uni-tr>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'avatar')" sortable
							@sort-change="sortChange($event, 'avatar')">头像</uni-th>
						<!-- <uni-th align="center" sortable @sort-change="sortChange($event, 'is_internal_user')">内部用户</uni-th> -->
						<uni-th align="center" sortable @sort-change="sortChange($event, 'status')">用户状态</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'my_invite_code')"
							sortablesortChange @sort-change="sortChange($event, 'my_invite_code')">我的邀请码</uni-th>
						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'username')" sortable @sort-change="sortChange($event, 'username')">用户名</uni-th> -->
						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'password')" sortable @sort-change="sortChange($event, 'password')">密码</uni-th> -->

						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'nickname')" sortable @sort-change="sortChange($event, 'nickname')">昵称</uni-th> -->

						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'introduction')" sortable @sort-change="sortChange($event, 'introduction')">个人介绍</uni-th> -->
						<!-- <uni-th align="center" sortable @sort-change="sortChange($event, 'daily_movie_count')">每日观看次数</uni-th> -->
						<uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'surplus_movie_count')"
							sortable @sort-change="sortChange($event, 'surplus_movie_count')">可观看<!-- 当日剩余观看次数 --></uni-th>
						<!-- <uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'score')" sortable @sort-change="sortChange($event, 'score')">积分</uni-th> -->
						<!-- <uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'coin')" sortable @sort-change="sortChange($event, 'coin')">湾币</uni-th> -->
						<uni-th align="center" sortable @sort-change="sortChange($event, 'vip')">会员</uni-th>
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'vip_expire_date')"
							sortable @sort-change="sortChange($event, 'vip_expire_date')">会员有效期至</uni-th>
						<!-- <uni-th align="center" filter-type="select" :filter-data="options.filterData.vip_level_localdata" @filter-change="filterChange($event, 'vip_level')">会员等级</uni-th> -->
						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'inviter_uid')" sortable @sort-change="sortChange($event, 'inviter_uid')">邀请人</uni-th> -->
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'invite_time')" sortable
							@sort-change="sortChange($event, 'invite_time')">受邀时间</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'device_oaid')" sortable @sort-change="sortChange($event, 'device_oaid')">设备oaid</uni-th>
						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'app_platform')" sortable @sort-change="sortChange($event, 'app_platform')">APP平台</uni-th> -->
						<!-- <uni-th align="center" filter-type="select" :filter-data="options.filterData.status_localdata" @filter-change="filterChange($event, 'status')">用户状态</uni-th> -->
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'login_date')" sortable
							@sort-change="sortChange($event, 'login_date')">最后登录时间</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'login_ip')" sortable
							@sort-change="sortChange($event, 'login_ip')">最后登录时 IP 地址</uni-th>
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'register_date')"
							sortable @sort-change="sortChange($event, 'register_date')">注册时间</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'register_ip')" sortable
							@sort-change="sortChange($event, 'register_ip')">注册时 IP 地址</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<uni-td align="center">
							<image :src="item.avatar" style="width: 50px;height: 50px;" mode="aspectFill" />
						</uni-td>
						<!-- <uni-td align="center">{{item.is_internal_user == true ? '✅' : '❌'}}</uni-td> -->
						<uni-td align="center">{{options.status_valuetotext[item.status]}}</uni-td>
						<uni-td align="center">{{item.my_invite_code}}</uni-td>
						<!-- <uni-td align="center">{{item.username}}</uni-td> -->
						<!-- <uni-td align="center">{{item.password}}</uni-td> -->
						<!-- <uni-td align="center">{{item.nickname}}</uni-td> -->
						<!-- <uni-td align="center">{{item.introduction}}</uni-td> -->
						<!-- <uni-td align="center">{{item.daily_movie_count}}</uni-td> -->
						<uni-td align="center">{{item.surplus_movie_count}}</uni-td>
						<!-- <uni-td align="center">{{item.score}}</uni-td> -->
						<!-- <uni-td align="center">{{item.coin}}</uni-td> -->
						<uni-td align="center">{{item.vip == true ? '✅' : '❌'}}</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.vip_expire_date"></uni-dateformat>
						</uni-td>
						<!-- <uni-td align="center">{{options.vip_level_valuetotext[item.vip_level]}}</uni-td> -->
						<!-- <uni-td align="center">{{item.inviter_uid}}</uni-td> -->
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.invite_time"></uni-dateformat>
						</uni-td>
						<uni-td align="center">{{ formatDeviceOaid(item.device_oaid, 'WithHim') }}</uni-td>
						<!-- <uni-td align="center">{{item.app_platform}}</uni-td> -->
						<!-- <uni-td align="center">{{options.status_valuetotext[item.status]}}</uni-td> -->
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.login_date"></uni-dateformat>
						</uni-td>
						<uni-td align="center">{{item.login_ip}}</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.register_date"></uni-dateformat>
						</uni-td>
						<uni-td align="center">{{item.register_ip}}</uni-td>
						<uni-td align="center">
							<view class="uni-group">
								<button @click="navigateTo('./edit?id='+item._id, false)" class="uni-button" size="mini"
									type="primary">修改</button>
								<!-- 防止误点，需要禁用，删除请用批量删除 -->
								<!-- <button @click="confirmDelete(item._id)" class="uni-button" size="mini" :disabled="true" type="warn">删除</button> -->
							</view>
						</uni-td>
					</uni-tr>
				</uni-table>
				<view class="uni-pagination-box">
					<uni-pagination show-icon :page-size="pagination.size" v-model="pagination.current" :total="pagination.count"
						@change="onPageChanged" />
				</view>
			</unicloud-db>
		</view>
	</view>
</template>

<script>
	import {
		enumConverter,
		filterToWhere
	} from '@/js_sdk/validator/user-accounts.js';

	const db = uniCloud.database()
	const dbCmd = db.command

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
				collectionList: "user-accounts",
				query: '',
				query_userid: '',
				where: '',
				orderby: dbOrderBy,
				orderByFieldName: "",
				selectedIndexs: [],
				options: {
					pageSize,
					pageCurrent,
					filterData: {
						"vip_level_localdata": [{
								"text": "会员（VIP）",
								"value": 0
							},
							{
								"text": "大会员（SVIP）",
								"value": 1
							}
						],
						"status_localdata": [{
								"text": "正常",
								"value": 0
							},
							{
								"text": "禁止购买会员",
								"value": 1
							},
							// {
							//   "text": "审核中",// 无用
							//   "value": 2
							// },
							{
								"text": "已被封禁",
								"value": 3
							}
						]
					},
					...enumConverter
				},
				imageStyles: {
					width: 64,
					height: 64
				},
				exportExcel: {
					"filename": "user-accounts.xls",
					"type": "xls",
					"fields": {
						"内部用户": "is_internal_user",
						"用户名": "username",
						"密码": "password",
						"昵称": "nickname",
						"个人介绍": "introduction",
						"每日观看次数": "daily_movie_count",
						"当日剩余观看次数": "surplus_movie_count",
						"积分": "score",
						"湾币": "coin",
						"会员": "vip",
						"会员有效期至": "vip_expire_date",
						"会员等级": "vip_level",
						"邀请人": "inviter_uid",
						"受邀时间": "invite_time",
						"我的邀请码": "my_invite_code",
						"设备oaid": "device_oaid",
						"APP平台": "app_platform",
						"用户状态": "status",
						"头像地址": "avatar",
						"最后登录时间": "login_date",
						"最后登录时 IP 地址": "login_ip",
						"注册时间": "register_date",
						"注册时 IP 地址": "register_ip"
					}
				},
				exportExcelData: [],
				allMyInviteCode: [] // 全部已选中用户的邀请码
			}
		},
		onLoad() {
			this._filter = {}
			this.searchDeviceOAID()
		},
		onReady() {
			this.$refs.udb.loadData()
		},
		methods: {
			// 查找指定前缀的设备号
			async searchDeviceOAID() {
				// 用户数据库表
				const userCollectionName = 'user-accounts'
				const userCollection = db.collection(userCollectionName)
				
				// 示例值：device_oaid："0f503235224d5f23"
				// 使用正则表达式匹配以 '1c0' 开头的 device_oaid
				const query = {
						//device_oaid: new RegExp('^1c0', 'i') // 'i' 表示忽略大小写
						device_oaid: new RegExp('^408') // 去掉 'i' 标志，表示区分大小写
				};
		
				// 执行查询
				const { result: { data } } = await userCollection.where(query).get();
		
				console.log('searchDeviceOAID-data', data)
				
				
				// 从data中找到item.device_oaid是以1c0开头，而结尾是15e7
				
				// 进一步筛选：以 '1c0' 开头且以 '15e7' 结尾的 device_oaid
				const filteredData = data.filter(item => {
						return item.device_oaid.startsWith('408') && item.device_oaid.endsWith('6771');
				});
		
				console.log('filteredData', filteredData);
		
				// 返回筛选后的结果
				return filteredData;
				
				
				
				
				// 下面是官方的示例,用正则
				// // 可以直接使用正则表达式
				// db.collection('articles').where({
				//   version: /^\ds/i
				// })
				
				// // 也可以使用new RegExp
				// db.collection('user').where({
				//   name: new RegExp('^\\ds', 'i')
				// })
				
				// // 或者使用new db.RegExp，这种方式阿里云不支持
				// db.collection('articles').where({
				//   version: new db.RegExp({
				//     regex: '^\\ds',   // 正则表达式为 /^\ds/，转义后变成 '^\\ds'
				//     options: 'i'    // i表示忽略大小写
				//   })
				// })

				 
			},
			onqueryload(data) {
				this.exportExcelData = data
				console.log('data', data)
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

				// TODO 自己新增的
				var dataList = this.$refs.udb.dataList

				// 筛选出 dataList 中 _id 存在且 vip 等于 false 的项，然后返回这些项的 _id 集合
				const filteredIds = this.selectedIndexs
					.map(i => dataList[i])
				// 筛选出 dataList 中的对象，其中 _id 存在且 vip 属性为 false
				//.filter(item => item && item._id && item.vip === false)
				// 提取筛选后对象的 _id 属性，形成一个新的数组
				//.map(item => item._id);

				this.allMyInviteCode = filteredIds
				console.log("邀请码集合：", this.allMyInviteCode)
			},
			// 批量删除并清理邀请码
			async delTableAndInviteCode() {
				// 全部邀请码数据库表
				const allInvitationCodesCollectionName = 'user-all-Invitation-codes'
				const allInvitationCodesCollection = db.collection(allInvitationCodesCollectionName)

				const {
					result: {
						data: allCodes
					}
				} = await allInvitationCodesCollection.get()

				console.log("allCodes", allCodes[0])

				let docId = allCodes[0]._id

				// 把allInvitationCodesData中的第一条记录的codes字段（如果存在）转换成Set
				let allCodesSet = new Set(allCodes.length > 0 && allCodes[0].codes ? allCodes[0].codes : []);

				// 然后把this.allMyInviteCode里的邀请码从allCodesSet中删除
				this.allMyInviteCode.forEach(inviteCode => {
					allCodesSet.delete(inviteCode);
				});

				// 这里假设你已经成功地从allCodesSet中删除了不需要的邀请码
				// 接下来你需要更新数据库中的记录
				// 首先，将Set转换回数组
				const updatedCodes = Array.from(allCodesSet);

				// 然后更新数据库中的第一条记录的codes字段
				if (allCodes.length > 0) {
					const {
						result: {
							updated
						}
					} = await allInvitationCodesCollection.doc(docId).update({
						codes: updatedCodes
					});
					console.log("更新成功条数：", updated);
				}


				// 支付订单数据库表
				const payOrdersCollectionName = 'user-payment-orders'
				const payOrdersCollection = db.collection(payOrdersCollectionName)

				// 查找所有充钱的用户，之后在下面的步骤中排除掉充钱的用户
				const {
					result: {
						data: payUsers
					}
				} = await payOrdersCollection
					.where({
						status: 1, // 已支付
						total_fee: dbCmd.gte(15), // >=15块钱
					})
					.field({
						user_id: true,
						total_fee: true,
						pay_success_time: true
					})
					.limit(1000)
					.get()

				console.log("payUsers", payUsers.length)

				// 假设 payUsers 是一个包含已支付用户信息的数组，并且每个元素都有 user_id 属性
				// 首先，从 payUsers 数组中提取所有 user_id 到一个新数组中
				const payUserIds = payUsers.map(user => user.user_id);
				console.log("payUserIds", payUserIds)


				// 用户数据库表
				const userCollectionName = 'user-accounts'
				const userCollection = db.collection(userCollectionName)

				var dataList = this.$refs.udb.dataList

				// 筛选出 dataList 中 _id 存在且 vip 等于 false 的项，然后返回这些项的 _id 集合
				const filteredIds = this.selectedIndexs
					.map(i => dataList[i])
				// 筛选出 dataList 中的对象，其中 _id 存在且 vip 属性为 false
				//.filter(item => item && item._id && item.vip === false)
				// 提取筛选后对象的 _id 属性，形成一个新的数组
				//.map(item => item._id);

				// 使用 filter 方法从 filteredIds 中排除掉 payUserIds 中的 ID
				// 同时，只保留每个对象的 _id 字段
				const finalFilteredIds = filteredIds.filter(item => {
						// 检查 item 是否存在
						const isValid = item && item._id;
						// 检查当前用户的 _id 是否不在已付费用户的 ID 列表中
						const isNotPaidUser = !payUserIds.some(payUserId => payUserId === item._id);
						// 只有当用户是有效的且未付费时，才包含在最终结果中
						return isValid && isNotPaidUser;
					})
					// 提取过滤后的 _id 值
					.map(item => item._id);

				console.log("排除付费用户后的最终筛选用户ID集合：", finalFilteredIds, finalFilteredIds.length);


				// 批量删除
				this.$refs.udb.remove(finalFilteredIds, {
					success: (res) => {
						console.log("删除成功，删除条数为: ", res.deleted)
						this.$refs.table.clearSelection()
					}
				})


				// const { result: { deleted } } = await userCollection.where({
				// 	_id: dbCmd.in(finalFilteredIds)
				// }).remove()

				// console.log("删除成功，删除条数为: ", deleted)

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
			formatDeviceOaid(deviceOaid, prefixToRemove) {
				// 移除指定前缀
				let cleanedOaid = deviceOaid.replace(prefixToRemove, '');

				// 计算保留的长度
				let halfLength = Math.ceil(cleanedOaid.length / 2); // 保留转为*号的数量

				// 获取前三位和后四位
				let firstThree = cleanedOaid.slice(0, 3);
				let lastFour = cleanedOaid.slice(-4);

				// 使用 * 填充中间部分
				let middleStars = '*'.repeat(halfLength);

				// 拼接结果
				let formattedOaid = `${firstThree}${middleStars}${lastFour}`;

				return formattedOaid;
			},
			searchToEdit() {
				this.navigateTo('./edit?id=' + this.query_userid, false)
			}
		}
	}
</script>

<style>
</style>
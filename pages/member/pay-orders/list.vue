<template>
	<view>
		<view class="uni-header">
			<view class="uni-group">
				<!-- <view class="uni-title"></view> -->
				<!-- <view class="uni-sub-title"></view> -->
				<input class="uni-search" type="text" v-model="wx_order" @confirm="queryWXPayorder" placeholder="请输入微信订单号" />
				<button class="uni-button" type="primary" size="mini" @click="queryWXPayorder">查询微信订单并修改</button>
			</view>
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="system_order" @confirm="querySystemOrder" placeholder="请输入系统订单号" />
				<button class="uni-button" type="primary" size="mini" @click="querySystemOrder">查询系统订单并修改</button>
			</view>
			<view class="uni-group">
				<button class="uni-button" type="primary" size="mini" @click="delNaughtOrder">删除0元订单</button>
				<!-- <input class="uni-search" type="text" v-model="query" @confirm="search" placeholder="请输入搜索内容" />
        <button class="uni-button" type="default" size="mini" @click="search">搜索</button> -->
				<button class="uni-button" type="default" size="mini" @click="navigateTo('./add')">新增</button>
				<button class="uni-button" type="default" size="mini" :disabled="!selectedIndexs.length"
					@click="delTable">批量删除</button>
				<download-excel class="hide-on-phone" :fields="exportExcel.fields" :data="exportExcelData"
					:type="exportExcel.type" :name="exportExcel.filename">
					<button class="uni-button" type="primary" size="mini">导出 Excel</button>
				</download-excel>
			</view>
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="myInviteCode" @confirm="queryUserPayorder"
					placeholder="请输入用户账号邀请码查询订单" />
				<button class="uni-button" type="primary" size="mini" @click="queryUserPayorder">查询用户订单并修改</button>
			</view>
		</view>
		<view class="uni-container">
			<unicloud-db ref="udb" :collection="collectionList"
				field="body,pay_type,out_trade_no,total_fee,user_id,order_type,status,system_recharge_issuccess,pay_success_time,pay_add_time,pay_no"
				:where="where" page-data="replace" :orderby="orderby" :getcount="true" :page-size="options.pageSize"
				:page-current="options.pageCurrent" v-slot:default="{data,pagination,loading,error,options}" :options="options"
				loadtime="manual" @load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe type="selection"
					@selection-change="selectionChange">
					<uni-tr>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'body')" sortable
							@sort-change="sortChange($event, 'body')">商品描述</uni-th>
						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'out_trade_no')" sortable @sort-change="sortChange($event, 'out_trade_no')">支付订单号</uni-th> -->
						<uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'total_fee')" sortable
							@sort-change="sortChange($event, 'total_fee')">订单总金额</uni-th>
						<!-- <uni-th align="center" sortable @sort-change="sortChange($event, 'user_id')">下单用户ID</uni-th> -->
						<uni-th align="center" filter-type="select" :filter-data="options.filterData.order_type_localdata"
							@filter-change="filterChange($event, 'order_type')">订单类型</uni-th>
						<uni-th align="center" filter-type="select" :filter-data="options.filterData.status_localdata"
							@filter-change="filterChange($event, 'status')">订单状态</uni-th>
						<uni-th align="center" sortable
							@sort-change="sortChange($event, 'system_recharge_issuccess')">系统充值成功</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'pay_success_time')"
							sortable @sort-change="sortChange($event, 'pay_success_time')">支付时间</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'pay_add_time')" sortable
							@sort-change="sortChange($event, 'pay_add_time')">下单时间</uni-th>
						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'pay_no')" sortable @sort-change="sortChange($event, 'pay_no')">微信支付订单号</uni-th> -->
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<uni-td align="center">
							<p>{{item.body}}</p>
							<p class="uni-font-size-10">下单用户ID：{{item.user_id}}</p>
							<p class="uni-font-size-10">商户订单号：{{item.out_trade_no}}</p>
							<p class="uni-font-size-10">微信支付宝订单号：{{item.pay_no}}</p>
						</uni-td>
						<!-- <uni-td align="center">{{item.out_trade_no}}</uni-td> -->
						<uni-td align="center">{{item.total_fee}}</uni-td>
						<!-- <uni-td align="center">{{item.user_id}}</uni-td> -->
						<uni-td align="center">{{options.order_type_valuetotext[item.order_type]}}</uni-td>
						<uni-td align="center">
							<p :style="`color: ${options.status_valuetotext[item.status] == '已退款' ? 'red' : 'black' }`">
								{{ options.status_valuetotext[item.status] }}
							</p>
						</uni-td>
						<uni-td align="center">{{item.system_recharge_issuccess == true ? '✅' : '❌'}}</uni-td>
						<uni-td align="center">{{item.pay_success_time}}</uni-td>
						<uni-td align="center">{{item.pay_add_time}}</uni-td>
						<!-- <uni-td align="center">{{item.pay_no}}</uni-td> -->
						<uni-td align="center">
							<view class="uni-group">
								<button @click="navigateTo('./edit?id='+item._id, false)" class="uni-button" size="mini"
									type="primary">修改</button>
								<button @click="confirmDelete(item._id)" class="uni-button" size="mini" type="warn">删除</button>
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
	} from '@/js_sdk/validator/user-payment-orders.js';

	const db = uniCloud.database()
	const dbCmd = db.command
	// 表查询配置
	const dbOrderBy = '' // 排序字段
	const dbSearchFields = [] // 模糊搜索字段，支持模糊搜索的字段列表。联表查询格式: 主表字段名.副表字段名，例如用户表关联角色表 role.role_name
	// 分页配置
	const pageSize = 20
	const pageCurrent = 1

	const orderByMapping = {
		"ascending": "asc",
		"descending": "desc"
	}

	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)

	// 支付订单数据库表
	const payOrdersCollectionName = 'user-payment-orders'
	const payOrdersCollection = db.collection(payOrdersCollectionName)
	export default {
		data() {
			return {
				collectionList: "user-payment-orders",
				query: '',
				myInviteCode: '', // 用户自身账号邀请码
				where: 'total_fee > 5',
				orderby: dbOrderBy,
				orderByFieldName: "",
				selectedIndexs: [],
				options: {
					pageSize,
					pageCurrent,
					filterData: {
						"order_type_localdata": [{
								"text": "金币充值",
								"value": 0
							},
							{
								"text": "会员开通",
								"value": 1
							}
						],
						"status_localdata": [{
								"text": "未支付",
								"value": 0
							},
							{
								"text": "已支付",
								"value": 1
							},
							{
								"text": "已退款",
								"value": 2
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
					"filename": "user-payment-orders.xls",
					"type": "xls",
					"fields": {
						"商品描述": "body",
						"支付渠道": "pay_type",
						"支付订单号": "out_trade_no",
						"订单总金额": "total_fee",
						"下单用户ID": "user_id",
						"订单类型": "order_type",
						"订单状态": "status",
						"系统充值是否成功": "system_recharge_issuccess",
						"支付完成时间": "pay_success_time",
						"下单时间": "pay_add_time",
						"微信支付订单号": "pay_no"
					}
				},
				exportExcelData: [],
				wx_order: "", // 微信订单号
				system_order: "", // 系统订单号
			}
		},
		onLoad() {
			this._filter = {}
		},
		onReady() {
			this.$refs.udb.loadData()
		},
		methods: {
			// 查询微信支付宝订单
			async queryWXPayorder() {
				const {
					result
				} = await payOrdersCollection.where({
					pay_no: this.wx_order
				}).get()

				console.log("查询订单结果", result)
				const payId = result.data[0]._id
				this.navigateTo('./edit?id=' + payId, false)
			},
			// 查询系统订单号
			async querySystemOrder() {
				const {
					result
				} = await payOrdersCollection.where({
					out_trade_no: this.system_order
				}).get()

				console.log("查询系统订单结果", result)
				const payId = result.data[0]._id
				this.navigateTo('./edit?id=' + payId, false)
			},
			// 查询用户订单并修改。（通过用户账号邀请码来查询用户ID，再用user_id查询用户订单）
			async queryUserPayorder() {
				uni.showLoading({
					mask: true
				})
				
				// 使用嵌套解构赋值获取data属性
				const {
					result: {
						data: userData
					}
				} = await userCollection.where({
					my_invite_code: this.myInviteCode
				}).get();

				// 检查用户是否存在
				if (userData.length === 0) {
					uni.showToast({
						title: '用户不存在',
						icon: 'none'
					});
					return;
				}

				// 获取用户ID
				const userId = userData[0]._id;

				// const {
				// 	result: {
				// 		data: orderData
				// 	}
				// } = await payOrdersCollection.where({
				// 	user_id: userId
				// }).get();

				// console.log("查询订单结果", orderData);
				
				this.where = "user_id =='" + userId + "'"
				// 组件上配置了 loadtime = "manual", 这里需要手动加载数据
				this.$nextTick(() => {
					this.$refs.udb.loadData()
				})
				
				uni.hideLoading()
				
			},
			onqueryload(data) {
				console.log(data)
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
				console.log('e', e)
				console.log('name', name)
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
			// 删除金额为0的订单（邀请赠送VIP订单）
			async delNaughtOrder() {
				const {
					result
				} = await payOrdersCollection.where({
					total_fee: dbCmd.gte(0).and(dbCmd.lte(1)) // 大于等于0且小于等于1的订单
				}).remove()

				console.log('result', result)

				uni.showToast({
					title: `删除条数为: ${result.deleted}`
				})
				// 刷新
				this.$nextTick(() => {
					this.$refs.udb.loadData()
				})
			}
		}
	}
</script>

<style>
</style>
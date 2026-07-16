<template>
	<view>
		<view class="uni-header">
			<view class="uni-group">
				<view class="uni-title"></view>
				<view class="uni-sub-title"></view>
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
				field="title,excerpt,source_url,your_story,thumburl,creator_user,create_time" :where="where"
				page-data="replace" :orderby="orderby" :getcount="true" :page-size="options.pageSize"
				:page-current="options.pageCurrent" v-slot:default="{data,pagination,loading,error,options}"
				:options="options" loadtime="manual" @load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe
					type="selection" @selection-change="selectionChange">
					<uni-tr>
						<uni-th width="175px" align="center" sortable
							@sort-change="sortChange($event, 'thumburl')">封面大图</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'title')"
							sortable @sort-change="sortChange($event, 'title')">标题</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'excerpt')"
							sortable @sort-change="sortChange($event, 'excerpt')">摘要</uni-th>
						<uni-th width="175px" align="center" filter-type="search"
							@filter-change="filterChange($event, 'source_url')" sortable
							@sort-change="sortChange($event, 'source_url')">来源地址</uni-th>
						<!-- <uni-th align="center" sortable @sort-change="sortChange($event, 'your_story')">内容</uni-th> -->
						<uni-th align="center" sortable @sort-change="sortChange($event, 'creator_user')">创建者信息</uni-th>
						<uni-th align="center" filter-type="timestamp"
							@filter-change="filterChange($event, 'create_time')" sortable
							@sort-change="sortChange($event, 'create_time')">创建时间</uni-th>
						<uni-th width="280px" align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<uni-td align="center">
							<!-- thumburl [0] 一刻相册缩略图、[1] 原图大图-已上传uniCloud -->
							<image :src="item.thumburl[1]" style="width: 165px;height: 165px;" mode="aspectFill" />
						</uni-td>
						<uni-td align="center">{{item.title}}</uni-td>
						<uni-td align="center">{{item.excerpt}}</uni-td>
						<uni-td align="center">{{item.source_url}}</uni-td>
						<!-- <uni-td align="center">{{item.your_story}}</uni-td> -->
						<uni-td align="center">{{item.creator_user.nickname}}</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.create_time" format="yyyy/MM/dd" />
						</uni-td>
						<uni-td align="center">
							<view class="uni-group">
								<button @click="navigateToH5Reading(item._id)" class="uni-button" size="mini"
									type="default">H5预览</button>
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
	} from '@/js_sdk/validator/yuta-cms-reading.js';

	const db = uniCloud.database()
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

	export default {
		data() {
			return {
				collectionList: "gay-comics",
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
					"filename": "gay-comics.xls",
					"type": "xls",
					"fields": {
						"标题": "title",
						"摘要": "excerpt",
						"来源地址": "source_url",
						"内容": "your_story",
						"封面大图": "thumburl",
						"创建者信息": "creator_user",
						"创建时间": "create_time"
					}
				},
				exportExcelData: []
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
			navigateToH5Reading(id) {
				// 这里不用前端页面托管，用腾讯云云函数，后期弄
				const url = 'https://static-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/h5/#/pages/reading/reading'
				// #ifdef H5
				if (url.indexOf('http') === 0) {
					return window.open(`${url}?id=${id}`)
				}
				// #endif
			}
		}
	}
</script>

<style>
</style>
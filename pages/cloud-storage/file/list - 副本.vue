<template>
	<view>
		<view class="uni-header">
			<view class="uni-group">
				<view class="uni-title"></view>
				<view class="uni-sub-title"></view>
				<input class="uni-search" type="text" v-model="query" placeholder="请输入文件id" />
				<button class="uni-button" type="default" size="mini" @click="searchFile">搜索</button>
				<button class="uni-button" type="warn" :disabled="query == ''" size="mini" @click="removeFile">删除文件</button>
			</view>
			<view class="uni-group">
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
				<input class="uni-search" type="text" v-model="queryAlbumId" placeholder="请输入相册id" />
				<button class="uni-button" type="default" size="mini" @click="searchAlbumIdFile">搜索</button>
				<button class="uni-button" type="warn" :disabled="queryAlbumId == ''" size="mini" @click="removeAlbumIdFile">删除此相册文件</button>
			</view>
		</view>
		<view class="uni-container">
			<unicloud-db ref="udb" :collection="collectionList"
				field="album_id,fsid,album_type,category,ctime,size,bytes,duration_format,thumburl,title,tag,status,extra_info"
				:where="where" page-data="replace" :orderby="orderby" :getcount="true" :page-size="options.pageSize"
				:page-current="options.pageCurrent" v-slot:default="{data,pagination,loading,error,options}"
				:options="options" loadtime="manual" @load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe
					type="selection" @selection-change="selectionChange">
					<uni-tr>
						<uni-th width="175px" align="center" sortable
							@sort-change="sortChange($event, 'thumburl')">文件封面</uni-th>
						<!-- <uni-th width="120px" align="center" sortable
							@sort-change="sortChange($event, 'tag')">标签</uni-th> -->
						<!-- <uni-th width="175px" align="center" filter-type="search"
							@filter-change="filterChange($event, 'title')" sortable
							@sort-change="sortChange($event, 'title')">标题</uni-th> -->
						<uni-th width="120px" align="center" filter-type="select"
							:filter-data="options.filterData.category_localdata"
							@filter-change="filterChange($event, 'category')">文件类别</uni-th>
						<uni-th width="100px" align="center" filter-type="select"
							:filter-data="options.filterData.status_localdata"
							@filter-change="filterChange($event, 'status')">发布状态</uni-th>
						<!-- <uni-th align="center" filter-type="select"
							:filter-data="options.filterData.album_type_localdata"
							@filter-change="filterChange($event, 'album_type')">相册类型</uni-th> -->
						<uni-th align="center" @filter-change="filterChange($event, 'album_id')">相册ID</uni-th>	
						<uni-th align="center" @filter-change="filterChange($event, 'fsid')">文件ID</uni-th>	
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'ctime')"
							sortable @sort-change="sortChange($event, 'ctime')">上传时间</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<uni-td align="center">
							<!-- thumburl [0] 一刻相册缩略图、[1] 原图大图-已上传uniCloud -->
							<image :src="item.thumburl[1]" style="width: 165px;height: 165px;" mode="aspectFill" />
							<!-- category: 1=视频 、3=图片 -->
							<view class="video_extra_info" v-if="item.category == 1">
								<text class="duration_ms">{{ item.duration_format }}</text>
								<view class="gap-5" />
								<text class="file_size">{{ item.bytes }}</text>
							</view>
						</uni-td>
						<!-- <uni-td align="center">{{item.tag}}</uni-td> -->
						<!-- <uni-td align="center">{{item.title}}</uni-td> -->
						<uni-td align="center">{{options.category_valuetotext[item.category]}}</uni-td>
						<uni-td align="center">
							<p>{{ options.status_valuetotext[item.status] }}</p>
							<p>{{ options.status_valuetotext[item.status] == '已发布' ? '✅' : '❌' }}</p>
						
						</uni-td>
						<uni-td align="center">{{item.album_id}}</uni-td>
						<uni-td align="center">{{item.fsid}}</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.ctime*1000"
								format="yyyy/MM/dd"></uni-dateformat>
						</uni-td>
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
	} from '@/js_sdk/validator/photo-baidu-album-listfile.js';

	const db = uniCloud.database()
	// 表查询配置
	const dbOrderBy = '' // 排序字段
	const dbSearchFields = [] // 模糊搜索字段，支持模糊搜索的字段列表。联表查询格式: 主表字段名.副表字段名，例如用户表关联角色表 role.role_name
	// 分页配置
	const pageSize = 200
	const pageCurrent = 1

	const orderByMapping = {
		"ascending": "asc",
		"descending": "desc"
	}

	export default {
		data() {
			return {
				collectionList: "yike-album-files",
				query: '',
				where: '',
				queryAlbumId: '',
				orderby: dbOrderBy,
				orderByFieldName: "",
				selectedIndexs: [],
				options: {
					pageSize,
					pageCurrent,
					filterData: {
						"album_type_localdata": [{
								"text": "一刻相册",
								"value": 0
							},
							{
								"text": "同多多相册",
								"value": 1
							}
						],
						"category_localdata": [{
								"text": "视频",
								"value": 1
							},
							{
								"text": "图片",
								"value": 3
							}
						],
						"status_localdata": [{
								"value": 0,
								"text": "草稿箱"
							},
							{
								"value": 1,
								"text": "已发布"
							},
							{
								"value": 2,
								"text": "审核中"
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
					"filename": "yike-album-files.xls",
					"type": "xls",
					"fields": {
						"相册类型": "album_type",
						"类别": "category",
						"上传时间": "ctime",
						"size": "size",
						"bytes": "bytes",
						"总时长": "duration_format",
						"thumburl": "thumburl",
						"标题": "title",
						"标签": "tag",
						"文章状态": "status",
						"额外信息": "extra_info"
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
			async searchFile() {
				const fileCollectionName = this.collectionList
				const fileCollection = db.collection(fileCollectionName)
				const fsid = Number(this.query) // Int
				
				// 查询文件结果
				const {
					result
				} = await fileCollection.where({
					fsid
				}).get()
				
				console.log('文件结果：', result.data)
				
				uni.showToast({
					title: `文件数量：${result.data.length}`
				})
				
			},
			async removeFile() {
				const fileCollectionName = this.collectionList
				const fileCollection = db.collection(fileCollectionName)
				const fsid = Number(this.query) // Int
				
				// 删除文件
				const {
					result
				} = await fileCollection.where({
					fsid
				}).remove()
				
				await db.collection("yike-collection-album-files").where({
					fsid
				}).remove()
				
				
				// 如果删除成功，输出成功信息
				if (result && result.deleted > 0) {
					console.log(`成功清理 ${result.deleted} 个文件。`);
					
					uni.showToast({
						title: `成功清理 ${result.deleted} 个文件。`
					});
				} else {
					console.log('没有要清理的文件，或清理操作未成功执行。');
				}
			},
			async searchAlbumIdFile() {
				const fileCollectionName = this.collectionList
				const fileCollection = db.collection(fileCollectionName)
				const album_id = this.queryAlbumId // String
				
				// 查询文件结果
				const {
					result
				} = await fileCollection.where({
					album_id
				}).get()
				
				console.log('文件结果：', result.data)
				
				uni.showToast({
					title: `文件数量：${result.data.length}`
				})
			},
			async removeAlbumIdFile() {
				const fileCollectionName = this.collectionList
				const fileCollection = db.collection(fileCollectionName)
				const album_id = this.queryAlbumId // String
				
				// 删除指定相册ID的文件
				const {
					result
				} = await fileCollection.where({
					album_id
				}).remove()
				
				await db.collection("yike-collection-album-files").where({
					album_id
				}).remove()
				
				
				// 如果删除成功，输出成功信息
				if (result && result.deleted > 0) {
					console.log(`成功清理 ${result.deleted} 个文件。`);
					
					uni.showToast({
						title: `成功清理 ${result.deleted} 个文件。`
					});
				} else {
					console.log('没有要清理的文件，或清理操作未成功执行。');
				}
			}
		}
	}
</script>

<style>
</style>
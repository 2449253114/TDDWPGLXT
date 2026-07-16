<template>
	<view>
		<view class="uni-header">
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="queryAlbumId" placeholder="请输入相册id" />
				<button class="uni-button" type="warn" size="mini" @click="deleteAllFilesInAlbum">删除指定相册ID的所有文件</button>
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
		<view class="uni-header">
			<view class="uni-group">
				<button class="uni-button" type="primary" size="mini" @click="navigateToFiles">将采集的相册文件同步到云存储相册文件</button>
			</view>
		</view>	
		<view class="uni-container">
			<unicloud-db ref="udb" :collection="collectionList"
				field="album_type,album_id,category,file_type,ctime,desc,dlink,extra_info,fsid,md5,nickname,path,photo,server_md5,size,bytes,duration_format,thumburl,tid,uk,title,tag,free_video,status"
				:where="where" page-data="replace" :orderby="orderby" :getcount="true" :page-size="options.pageSize"
				:page-current="options.pageCurrent" v-slot:default="{data,pagination,loading,error,options}"
				:options="options" loadtime="manual" @load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe
					type="selection" @selection-change="selectionChange">
					<uni-tr>
						<uni-th width="175px" align="center">文件封面</uni-th>
						<uni-th align="center" sortable @sort-change="sortChange($event, 'album_id')">album_id</uni-th>
						<uni-th align="center" filter-type="select" :filter-data="options.filterData.category_localdata"
							@filter-change="filterChange($event, 'category')">类别</uni-th>
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'ctime')"
							sortable @sort-change="sortChange($event, 'ctime')">上传时间</uni-th>
						<uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'fsid')"
							sortable @sort-change="sortChange($event, 'fsid')">fsid</uni-th>
						<!-- <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'title')"
							sortable @sort-change="sortChange($event, 'title')">标题</uni-th> -->
						<uni-th align="center" filter-type="select" :filter-data="options.filterData.status_localdata"
							@filter-change="filterChange($event, 'status')">发布状态</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<!-- <uni-td align="center">{{item.album_id}}</uni-td> -->
						<uni-td align="center">
							<!-- thumburl [0] 缩略图、[1] 原图大图（uniCloud阿里云空间） -->
							<image :src="item.thumburl[1]" style="width: 165px;height: 165px;" mode="aspectFill" />
							<!-- category: 1=视频 、3=图片 -->
							<view class="video_extra_info" v-if="item.category == 1">
								<text class="duration_ms">{{ toDuration(item.extra_info.duration_ms) }}</text>
								<view class="gap-5" />
								<text class="file_size">{{ toFileSize(item.size) }}</text>
							</view>
						</uni-td>
						<uni-td align="center">{{item.album_id}}</uni-td>
						<uni-td align="center">{{options.category_valuetotext[item.category]}}</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.ctime*1000"></uni-dateformat>
						</uni-td>
						<uni-td align="center">{{item.fsid}}</uni-td>
						<!-- <uni-td align="center">{{item.title}}</uni-td> -->
						<uni-td align="center">
							<p>{{ options.status_valuetotext[item.status] }}</p> 
							<p>{{ options.status_valuetotext[item.status] == '已发布' ? '✅' : '❌' }}</p>
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
	} from '@/js_sdk/validator/yike-collection-album-files.js';

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

	import {
		convertDuration,
		formatFileSize
	} from '@/common/myutils/files/comm.js'

	export default {
		data() {
			return {
				collectionList: "yike-collection-album-files",
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
					"filename": "yike-collection-album-files.xls",
					"type": "xls",
					"fields": {
						"相册类型": "album_type",
						"album_id": "album_id",
						"类别": "category",
						"文件类型": "file_type",
						"上传时间": "ctime",
						"描述": "desc",
						"dlink": "dlink",
						"额外信息": "extra_info",
						"fsid": "fsid",
						"md5": "md5",
						"nickname": "nickname",
						"path": "path",
						"photo": "photo",
						"server_md5": "server_md5",
						"size": "size",
						"bytes": "bytes",
						"总时长": "duration_format",
						"thumburl": "thumburl",
						"tid": "tid",
						"uk": "uk",
						"标题": "title",
						"标签": "tag",
						"限免视频": "free_video",
						"发布状态": "status"
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
			toDuration(durationMs) {
				return convertDuration(durationMs)
			},
			toFileSize(bytes) {
				return formatFileSize(bytes)
			},

			/**
			 * 删除指定相册ID的所有文件
			 * @async
			 * @method deleteAllFilesInAlbum
			 */
			async deleteAllFilesInAlbum() {
				// 全部相册文件集合名称
				const fileCollectionName = 'yike-collection-album-files';
				// 相册文件集合
				const fileCollection = db.collection(fileCollectionName);
				// 用户输入的相册ID
				const albumId = this.queryAlbumId;

				// 如果相册ID为空，则不执行删除操作
				if (!albumId) {
					uni.showToast({
						title: '相册ID不能为空',
						icon: 'none'
					});
					return;
				}

				// 删除指定相册ID的所有文件
				try {
					let { result: res} = await fileCollection.where({
						album_id: albumId
					}).remove();
					
					console.log('res', res)

					console.log("删除成功，删除条数为: ", res.deleted);
					uni.showToast({
						title: `成功删除 ${res.deleted} 条文件`
					});
				} catch (error) {
					console.error("删除失败: ", error);
					uni.showToast({
						title: '删除失败',
						icon: 'none'
					});
				}
			},
			
			
			navigateToFiles() {
				// 获取当前页面栈数组
				let pages = getCurrentPages();
				// 获取当前页面的页面对象
				let currentPage = pages[pages.length - 1];
				// 获取页面的URL
				let currentUrl = currentPage.$page.fullPath;
				
				// 如果需要包括域名等信息，可以使用window.location （完整的URL）
				let fullUrl = window.location.href;
				
				console.log('当前页面的URL:', currentUrl);
				console.log('完整的URL:', fullUrl);
				
				// 目标页面的路径
				const targetPath = '/pages/photo-baidu/collection/async-to-cloud-storage-file/index';
				// 替换当前页面的URL部分为目标页面的路径，构造新的URL
				const targetUrl = fullUrl.replace(currentUrl, targetPath);
				
				// #ifdef H5
				if (targetUrl.indexOf('http') === 0) {
					return window.open(`${targetUrl}?param=`)
				}
				// #endif
			},

		}
	}
</script>

<style>
</style>
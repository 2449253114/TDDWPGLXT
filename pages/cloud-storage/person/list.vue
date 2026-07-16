<template>
	<view>
		<view class="uni-header">
			<view class="uni-group">
				<!-- <view class="uni-title"></view> -->
				<!-- <view class="uni-sub-title"></view> -->
				<button class="uni-button" type="primary" size="mini" @click="toBindCoverFsid">为人物cover绑定fsid</button>
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
				<button class="uni-button" type="warn" size="mini"
					@click="allAsyncToAlbumPersonInfo">一键同步至相册PersonInfo</button>
			</view>
		</view>
		<view class="uni-container">
			<unicloud-db ref="udb" :collection="collectionList"
				field="album_id,person_id,name,covers,description,link,status,ctime" :where="where" page-data="replace"
				:orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
				v-slot:default="{data,pagination,loading,error,options}" :options="options" loadtime="manual"
				@load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe
					type="selection" @selection-change="selectionChange">
					<uni-tr>
						<uni-th align="center" sortable @sort-change="sortChange($event, 'album_id')">album_id</uni-th>
						<uni-th width="175px" align="center" sortable
							@sort-change="sortChange($event, 'covers')">人物头像</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'name')"
							sortable @sort-change="sortChange($event, 'name')">人物名字</uni-th>
						<!-- <uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'person_id')"
							sortable @sort-change="sortChange($event, 'person_id')">人物id</uni-th> -->
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'ctime')" sortable @sort-change="sortChange($event, 'ctime')">创建时间</uni-th>	
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'description')"
							sortable @sort-change="sortChange($event, 'description')">描述</uni-th>
						<uni-th align="center" sortable @sort-change="sortChange($event, 'link')">创作者主页链接</uni-th>
						<uni-th align="center" filter-type="select" :filter-data="options.filterData.status_localdata"
							@filter-change="filterChange($event, 'status')">发布状态</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<uni-td align="center">
							<!-- thumburl [0] 缩略图、[1] 原图大图 -->
							<image v-if="item.album_cover" :src="item.album_cover" style="width: 165px;height: 165px;"
								mode="aspectFill" />
							<p>{{ item.album_id }}</p>
							<p>{{ `_id：${ item._id }` }}</p>
						</uni-td>
						<uni-td align="center">
							<!-- thumburl [0] 缩略图、[1] 原图大图 -->
							<image v-if="item.covers[0]" :src="item.covers[0].thumb" style="width: 165px;height: 165px;"
								mode="aspectFill" />
						</uni-td>
						<uni-td align="center">{{item.name}}</uni-td>
						<!-- <uni-td align="center">{{item.person_id}}</uni-td> -->
						<uni-td align="center">
						  <uni-dateformat :threshold="[0, 0]" :date="item.ctime"></uni-dateformat>
						</uni-td>
						<uni-td align="center">{{item.description}}</uni-td>
						<uni-td align="center">{{item.link}}</uni-td>
						<uni-td align="center">{{options.status_valuetotext[item.status]}}</uni-td>
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
	} from '@/js_sdk/validator/yike-person.js';

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
				collectionList: "yike-person",
				query: '',
				where: '',
				orderby: dbOrderBy,
				orderByFieldName: "",
				selectedIndexs: [],
				options: {
					pageSize,
					pageCurrent,
					filterData: {
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
								"text": "等待上线"
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
					"filename": "photo-baidu-person.xls",
					"type": "xls",
					"fields": {
						"album_id": "album_id",
						"人物id": "person_id",
						"人物名字": "name",
						"人物头像": "covers",
						"描述、介绍下自己": "description",
						"创作者主页链接": "link",
						"发布状态": "status",
						"创建时间": "ctime"
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
			async queryAlbumCover(album_id) {
				// 全部相册
				const albumCollectionName = 'yike-albums'
				const albumCollection = db.collection(albumCollectionName)
				let {
					result
				} = await albumCollection.where({
					album_id
				}).get()
				
				let item = result.data[0]
				
				console.log('result', result)

				// 假设这是异步获取封面图片的方法
				return {
					url: item.cover_info.thumburl[0]
				}
			},
			async loadAlbumCovers(albums) {
				for (let item of albums) {
					if (item.status) {
						const cover = await this.queryAlbumCover(item.album_id);
						this.$set(item, 'album_cover', cover.url); // 使用 Vue.set 来确保响应性
					}
				}
			},
			onqueryload(data) {
				this.exportExcelData = data
				this.loadAlbumCovers(data)
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
			// 一键同步至相册PersonInfo
			async allAsyncToAlbumPersonInfo() {
				// 全部人物
				const personCollectionName = 'yike-person'
				const personCollection = db.collection(personCollectionName)
				// 查询人物结果 | 解构赋值并重命名result为queryPersonResult
				const {
					result: queryPersonResult
				} = await personCollection.where({
					status: 1
				}).get()

				// 如果没有数据，则直接返回
				if (queryPersonResult['affectedDocs'] === 0) {
					uni.showToast({
						title: '人物无数据'
					})
					return
				}
				const personList = queryPersonResult.data

				// 获取所有人物的album_id
				const albumIds = personList.map(person => person.album_id)

				// 全部相册
				const albumCollectionName = 'yike-albums'
				const albumCollection = db.collection(albumCollectionName)
				// 查询相册结果 | 解构赋值并重命名result为queryAlbumResult
				const {
					result: queryAlbumResult
				} = await albumCollection.where({
					album_id: {
						$in: albumIds
					} // 使用$in操作符来匹配所有的album_id
				}).get()

				// 如果没有相册数据，则直接返回
				if (queryAlbumResult['affectedDocs'] === 0) {
					uni.showToast({
						title: '相册无数据'
					})
					return
				}
				const albumList = queryAlbumResult.data

				// 构造album_id到人物信息的映射
				let personMap = {}
				personList.forEach(person => {
					personMap[person.album_id] = {
						person_id: person.person_id,
						avatarurl: person.covers,
						name: person.name,
						description: person.description,
						link: person.link // .split('\n') // 如果link是以换行符分割的字符串，则转换为数组（只在APP数据接口中处理格式）
					};
				});

				// 遍历相册列表，更新每个相册的person_info
				for (const album of albumList) {
					// 获取对应人物的信息
					const personInfo = personMap[album.album_id];

					if (personInfo) {
						console.log('personInfo', personInfo)

						// 更新相册集合中的person_info字段
						await albumCollection.doc(album._id).update({
							person_info: personInfo
						});
					}
				}

				// 显示同步完成提示
				uni.showToast({
					title: '同步完成'
				});


				// 然后更新相册信息逻辑
				// personList中所有item.album_id对应queryAlbumList中所有item.album_id，
				// 然后queryAlbumList中所有item.person_info{
				//  person_id = personList中item.id
				//  avatarurl = personList中item.covers
				//  name = personList中item.name
				//  description = personList中item.description
				//  link = personList中item.link
				// }
			},
			toBindCoverFsid() {
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
				const targetPath = '/pages/cloud-storage/person/bind/bind-cover-fsid';
				// 替换当前页面的URL部分为目标页面的路径，构造新的URL
				const targetUrl = fullUrl.replace(currentUrl, targetPath);
				
				// #ifdef H5
				if (targetUrl.indexOf('http') === 0) {
					return window.open(`${targetUrl}`)
				}
				// #endif
			}
		}
	}
</script>

<style>
</style>
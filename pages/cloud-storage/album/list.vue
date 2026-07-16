<template>
	<view class="page__main">
		<div class="global-top">
			<view class="uni-header handleBar">
				<view class="uni-group">
					<button class="uni-button" type="default" size="mini" @click="navigateTo('./add')">创建相册</button>
					<span>
						<button class="uni-button" type="default" size="mini" @click="toggleSortTool">排序</button>
						<div v-show="showSortTool" id="filter-tooltip" class="yk-popover yk-popper album-popover"
							style="top: 70px; left: 70px;">
							<div class="type-list">
								<div class="type-item">
									<span class="mr-5">创建时间</span>
									<sortData class="mr-5" sortable @sort-change="sortChange($event, 'create_time')" />
									<filterData filterType="timestamp" @change="filterChange($event, 'create_time')" />
								</div>
								<div class="type-item">
									<span class="mr-5">发布状态</span>
									<filterData filter-type="select" :filter-data="options.filterData.status_localdata"
										@change="filterChange($event, 'status')" />
								</div>
								<div class="type-item">
									<span class="mr-5">文件数量</span>
									<sortData class="mr-5" sortable @sort-change="sortChange($event, 'total_count')" />
								</div>
								<div class="type-item current-type-item">
									<span class="mr-5">视频数量</span>
									<sortData class="mr-5" sortable @sort-change="sortChange($event, 'video_count')" />
								</div>
								<div class="type-item">
									<span class="mr-5">图片数量</span>
									<sortData class="mr-5" sortable @sort-change="sortChange($event, 'pic_count')" />
								</div>
							</div>
							<div class="popper__arrow"></div>
						</div>
					</span>

					<input class="uni-search" type="text" v-model="query" @confirm="search" placeholder="搜索相册名称" />
					<button class="uni-button" type="default" size="mini" @click="search">搜索</button>
				</view>
			</view>
			<view class="uni-header handleTab">
				<div class="yk-album__tabs">
					<uni-segmented-control :current="current" :values="tabItems" @clickItem="onTabItem" styleType="text"
						activeColor="#007aff" />
				</div>

				<div class="uni-title m-l-10">
					<span>文件总数：{{ totalCounts.totalFileCount }}</span>
					<span>图片总数：{{ totalCounts.totalPicCount }}</span>
					<span>视频总数：{{ totalCounts.totalVideoCount }}</span>
				</div>

				<div class="container">
					<span class="subtitle">已加载 {{ albumData.length }} 个</span>
				</div>
			</view>

			<!-- delete-header -->
			<div v-if="selectedIndexs.length !== 0" class="uni-header delete-header ">
				<div class="uni-group header-left">
					<uni-icons class="close" type="closeempty" color="#fff" size="26"
						@click="selectedIndexs = []"></uni-icons>
					<span>已选 {{ selectedIndexs.length }} 个相册</span>
					<span class="select-all" @click="toggleAllSelection">
						{{ `${ albumData.length == selectedIndexs.length ? '取消勾选' : '全选'}` }}
					</span>
				</div>
				<div class="uni-group header-right">
					<div class="right-btn">
						<uni-icons class="icon add-person" type="person" color="#fff" size="25"></uni-icons>
						<p>绑定人物</p>
					</div>
					<div class="right-btn">
						<uni-icons class="icon edit-cover" type="image" color="#fff" size="25"></uni-icons>
						<p>修改封面</p>
					</div>
					<div class="right-btn">
						<uni-icons class="icon add-videosegments" type="wallet" color="#fff" size="25"></uni-icons>
						<p>绑定TAG</p>
					</div>
					<div class="right-btn">
						<uni-icons class="icon file-info" type="compose" color="#fff" size="25"></uni-icons>
						<p>详情</p>
						<div>
							<p>查看相册信息</p>
							<!-- <p>Shift + A</p> -->
						</div>
					</div>
					<div class="right-btn">
						<uni-icons class="icon file-remove" type="trash" color="#fff" size="25"></uni-icons>
						<p>删除</p>
					</div>
				</div>
			</div>

		</div>

		<div class="uni-container">
			<unicloud-db ref="udb" :collection="collectionList"
				field="album_type,album_id,create_time,title,custom_title,pic_count,video_count,total_count,status,cover_info"
				:where="where" page-data="replace" :orderby="orderby" :getcount="true" :page-size="options.pageSize"
				:page-current="options.pageCurrent" v-slot:default="{data,pagination,loading,error,options}"
				:options="options" loadtime="manual" @load="onqueryload">

				<div v-if="data.length == 0" class="uni-table-loading">
					<td class="uni-empty-text">没有更多数据</td>
				</div>
				<div v-if="loading" class="uni-table-mask">
					<div class="uni-table--loader"></div>
				</div>

				<div v-for="(item, index) in tabItems" :key="index" v-if="current === index">
					<div class="yk-album__list">
						<div v-for="(item,index) in data" :key="index" class="yk-album__item"
							style="width: 175px; margin-right: 20px;"
							@click.stop="navigateTo('./detail?album_id='+item.album_id+'&title='+item.title+'&create_time='+item.create_time)">
							<span v-if="false">
								<div role="tooltip" id="yk-popover" class="yk-popover yk-popper album-popover"
									style="display: block;">
									<div class="btn-list">
										<div class="btn-item" @click.stop="navigateTo('./edit?id='+item._id, false)">
											修改相册
										</div>
										<!-- <div class="btn-item">分享相册</div> -->
										<!-- <div class="btn-item">离开共享</div> -->
										<!-- <div class="btn-item">下载相册</div> -->
									</div>
									<div class="popper__arrow"></div>
								</div>
								<div class="operation-btn yk-popover__reference" @click.stop="">
									<image src="@/static/yike/album-more.png" alt="更多" class="u-tooltip"
										trigger="hover" />
								</div>
							</span>
							<div class="item-container">
								<image src="@/static/yike/albumBg.png" class="albumBg" mode="aspectFill" />
								<div class="cover-wrap">
									<!-- thumburl [0] 一刻相册缩略图、[1] 原图大图-已上传uniCloud -->
									<div class="yk-album__item--cover nocover">
										<image
											:src="item.cover_info.thumburl[0] ? item.cover_info.thumburl[0] : `/static/yike/default-cover.png`"
											mode="aspectFill" />
									</div>
									<div class="img-mask"></div>
									<!-- 可点击的复选框 -->
									<div :class="{'check-btn':!selectedIndexs.includes(item._id), 'check-btn item-checked checked': selectedIndexs.includes(item._id)}"
										@click.stop="toggleSelection(item._id)">
									</div>
								</div>
								<div class="item-info" @click.stop="navigateTo('./edit?id='+item._id, false)">
									<div class="yk-album__item--name">{{item.title}}</div>
									<div class="yk-album__item--text">{{item.album_id}}</div>
									<!--<div class="yk-album__item--text">
										<span>图片：{{item.pic_count}}</span>
										<span>视频：{{item.video_count}}</span>
										<span>汇总：{{item.total_count}}</span>
									</div> -->
									<div class="yk-album__item--text">{{item.custom_title}}</div>
									<div class="yk-album__item--date">
										<uni-dateformat :threshold="[0, 0]" :date="item.create_time*1000"
											format="yyyy/MM/dd"></uni-dateformat>
									</div>
									<!-- 0 草稿箱 1 已发布 -->
									<uni-tag 
										size="small" :circle="false" :inverted="true"
										:type="item.status == 0 ? 'error' : 'primary'"
										:text="options.status_valuetotext[item.status]">
									</uni-tag>
								</div>
							</div>
						</div>
					</div>
				</div>

				<view class="uni-pagination-box">
					<uni-pagination show-icon :page-size="pagination.size" v-model="pagination.current"
						:total="pagination.count" @change="onPageChanged" />
				</view>
			</unicloud-db>
		</div>
	</view>
</template>

<script>
	import {
		enumConverter,
		filterToWhere
	} from '@/js_sdk/validator/yike-albums.js';

	const db = uniCloud.database()
	// 表查询配置
	const dbOrderBy = '' // 排序字段
	const dbSearchFields = [] // 模糊搜索字段，支持模糊搜索的字段列表。联表查询格式: 主表字段名.副表字段名，例如用户表关联角色表 role.role_name
	// 分页配置
	const pageSize = 100
	const pageCurrent = 1

	const orderByMapping = {
		"ascending": "asc",
		"descending": "desc"
	}

	// #ifdef H5
	import filterData from '@/uni_modules/uni-table/components/uni-th/filter-dropdown.vue';
	import sortData from '@/components/xdd-sort-data/xdd-sort-data.vue';
	// #endif

	export default {
		components: {
			// #ifdef H5
			filterData,
			sortData
			// #endif
		},
		data() {
			return {
				collectionList: "yike-albums",
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
				totalCounts: {
					totalFileCount: 0,
					totalPicCount: 0,
					totalVideoCount: 0
				},
				tabItems: ['全部相册', '一刻相册', '网剧相册', '同多多相册'],
				current: 0,
				showSortTool: false, // 默认排序工具不显示
				albumData: []
			}
		},
		onLoad() {
			this._filter = {}
		},
		onReady() {
			this.$refs.udb.loadData()
			this.getAlbmuFilesTotal()
		},
		methods: {
			onqueryload(data) {
				this.albumData = data
				console.log("data", data)
			},
			toggleSortTool() {
				this.showSortTool = !this.showSortTool;
			},
			onTabItem(e) {
				if (this.current !== e.currentIndex) {
					this.current = e.currentIndex

					// 根据当前索引获取相册类型数组
					const albumTypeArray = getAlbumType(e.currentIndex);

					// 构建查询参数对象
					const param = {
						filter: albumTypeArray,
						filterType: 'select'
					};

					// 筛选出对应相册类型的数据
					this.filterChange(param, 'album_type')

				}
				// 根据当前索引获取相册类型数组的函数
				function getAlbumType(index) {
					// 如果索引为0，则返回空数组，表示“全部相册”
					if (index === 0) {
						return [];
					}
					// 将索引转换为相册类型的值，并返回数组
					const albumType = parseInt(index - 1)
					return [albumType];
				}
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
				//this.$refs.table.clearSelection()
				this.$refs.udb.loadData({
					clear: true,
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
						//this.$refs.table.clearSelection()
					}
				})
			},
			// 多选，uni-table的，现已不需要
			selectionChange(e) {
				this.selectedIndexs = e.detail.index
			},
			// 多选
			toggleSelection(_id) {
				const isSelected = this.selectedIndexs.includes(_id);
				if (isSelected) {
					// 如果已选中，则从选中列表中移除
					this.selectedIndexs = this.selectedIndexs.filter(item => item !== _id);
				} else {
					// 如果未选中，则添加到选中列表
					this.selectedIndexs.push(_id);
				}
			},
			toggleAllSelection() {
				if (this.selectedIndexs.length === this.$refs.udb.dataList.length) {
					// 如果全选了，则清空选中列表实现取消全选
					this.selectedIndexs = [];
				} else {
					// 如果未全选，则将所有索引添加到选中列表实现全选
					var dataList = this.$refs.udb.dataList;
					if (dataList && dataList.length > 0) {
						this.selectedIndexs = dataList.map(item => item._id);
					} else {
						this.selectedIndexs = [];
					}
				}
			},
			confirmDelete(id) {
				this.$refs.udb.remove(id, {
					success: (res) => {
						//this.$refs.table.clearSelection()
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
				//this.$refs.table.clearSelection()
				this.$nextTick(() => {
					this.$refs.udb.loadData()
				})
			},
			filterChange(e, name) {
				console.log("e", e, "name", name)

				// 这里要处理create_time字段值，因为是秒单位，不是毫秒单位，但选择的时间范围值是毫秒的。
				// 检查是否需要将时间单位从毫秒转换为秒
				if (name === 'create_time') {
					// 调整e.filter中的每个时间值，将其从毫秒转换为秒
					e.filter = e.filter.map(time => time / 1000);
				}

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
			// 获取所有相册的文件总数
			async getAlbmuFilesTotal() {

				this.totalCounts = await calculateAlbumCounts()

				/**
				 * 计算相册中文件、图片和视频的总数
				 * 此函数首先从数据库获取相册总数，然后获取相册列表，
				 * 最后使用 reduce 方法计算所有相册的文件、图片和视频的总数。
				 * 
				 * @async
				 * @function calculateAlbumCounts
				 * @returns {Object} 包含文件总数、图片总数和视频总数的对象
				 */
				async function calculateAlbumCounts() {
					// 相册集合名称
					const albumCollectionName = 'yike-albums';
					// 相册集合
					const albumCollection = db.collection(albumCollectionName);

					// 获取相册总数
					const {
						result: albumCountResult
					} = await albumCollection.count();
					const totalAlbums = albumCountResult.total;
					console.log('相册总数:', totalAlbums);

					// 获取相册列表
					const {
						result: albumListResult
					} = await albumCollection.limit(totalAlbums).get();

					console.log('相册列表结果:', albumListResult);

					// 使用 reduce 方法计算文件、图片和视频的总数
					const totalCounts = albumListResult.data.reduce((counts, album) => {
						counts.totalFileCount += album.total_count || 0;
						counts.totalPicCount += album.pic_count || 0;
						counts.totalVideoCount += album.video_count || 0;
						return counts;
					}, {
						totalFileCount: 0,
						totalPicCount: 0,
						totalVideoCount: 0
					});

					console.log('文件总数:', totalCounts.totalFileCount);
					console.log('图片总数:', totalCounts.totalPicCount);
					console.log('视频总数:', totalCounts.totalVideoCount);

					// 返回计算结果
					return totalCounts;
				}
			},

		}
	}
</script>

<style lang="scss" scoped>
	@import './yike-album.css';
	@import './yike-photo.css';
</style>
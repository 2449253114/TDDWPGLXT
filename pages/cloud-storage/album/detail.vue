<template>
	<view class="page__main">
		<div class="global-top">
			<div class="uni-header handleBar">
				<div class="uni-group">
					<button class="uni-button" type="default" size="mini" @click="">重命名相册</button>
					<span>
						<button class="uni-button" type="default" size="mini" @click="toggleSortTool">排序</button>
						<div v-show="showSortTool" id="filter-tooltip" class="yk-popover yk-popper album-popover"
							style="top: 50px; left: 70px;">
							<div class="type-list">
								<div class="type-item">
									<span class="mr-5">创建时间</span>
									<sortData class="mr-5" sortable @sort-change="sortChange($event, 'ctime')" />
									<filterData filterType="timestamp" @change="filterChange($event, 'ctime')" />
								</div>
								<div class="type-item">
									<span class="mr-5">发布状态</span>
									<filterData filter-type="select" :filter-data="options.filterData.status_localdata"
										@change="filterChange($event, 'status')" />
								</div>
								<!-- current-type-item -->
								<div class="type-item">
									<span class="mr-5">文件大小</span>
									<sortData class="mr-5" sortable @sort-change="sortChange($event, 'size')" />
								</div>
								<div class="type-item">
									<span class="mr-5">视频时长</span>
									<sortData class="mr-5" sortable
										@sort-change="sortChange($event, 'duration_ms_long')" />
								</div>
							</div>
							<div class="popper__arrow"></div>
						</div>
					</span>
					<input class="uni-search" type="text" v-model="query" @confirm="search" placeholder="搜索文件fsid" />
					<button class="uni-button" type="default" size="mini" @click="search">搜索</button>
				</div>
			</div>
			<div class="uni-header handleMes">
				<div class="album-box">
					<div class="album-title">
						<navigator open-type="navigateBack">
							<div style="color: rgb(59, 117, 255);">全部相册</div>
						</navigator>
						<div class="album-arrow"></div>
						<div>{{ album_title }}</div>
					</div>
				</div>
				<div class="album-detail">
					<span>共</span>
					<span>{{ imgCount }}张图片</span>
					<span>，</span>
					<span>{{ videoCount }}个视频</span>
					<span>
						<span style="margin: 0px 10px;">|</span>
						<!-- 这里就查询有效的账号Cookies数量 -->
						<span style="color: rgb(59, 117, 255);">70人</span>
						正在共享此相册
					</span>
					<span style="margin-left: 20px;">
						创建于<uni-dateformat :threshold="[0, 0]" :date="album_ctime * 1000" format="yyyy/MM/dd" />
					</span>
				</div>
			</div>
			<div class="uni-header handleTab">
				<div class="yk-album__tabs">
					<uni-segmented-control :current="current" :values="tabItems" @clickItem="onTabItem" styleType="text"
						activeColor="#007aff" />
				</div>

				<div class="container">
					<span class="subtitle">已加载 {{ fileData.length }} 个</span>
				</div>
			</div>

			<!-- delete-header -->
			<div v-if="selectedIndexs.length !== 0" class="uni-header delete-header ">
				<div class="uni-group header-left">
					<uni-icons class="close" type="closeempty" color="#fff" size="26"
						@click="selectedIndexs = []"></uni-icons>
					<span>已选 {{ selectedIndexs.length }} 张照片</span>
					<span class="select-all" @click="toggleAllSelection">
						{{ `${fileData.length == selectedIndexs.length ? '取消勾选' : '全选'}` }}
					</span>
				</div>
				<div class="uni-group header-right">
					<div class="right-btn" @click="togglePersonDialog">
						<uni-icons class="icon add-person" type="person" color="#fff" size="25"></uni-icons>
						<p>绑定人物</p>
					</div>
					<div class="right-btn">
						<uni-icons class="icon add-qqplayerpics" type="camera" color="#fff" size="25"></uni-icons>
						<p>绑定连拍</p>
					</div>
					<div class="right-btn">
						<uni-icons class="icon add-videosegments" type="videocam" color="#fff" size="28"></uni-icons>
						<p>绑定片段</p>
					</div>
					<div class="right-btn">
						<uni-icons class="icon add-videosegments" type="wallet" color="#fff" size="25"></uni-icons>
						<p>绑定TAG</p>
					</div>
					<div class="right-btn">
						<uni-icons class="icon add-other-album" type="folder-add" color="#fff" size="25"></uni-icons>
						<p>添加到</p>
						<div>
							<p>添加到其他相册</p>
							<!-- <p>Shift + A</p> -->
						</div>
					</div>
					<div class="right-btn">
						<uni-icons class="icon file-info" type="compose" color="#fff" size="25"></uni-icons>
						<p>详情</p>
						<div>
							<p>查看文件信息</p>
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
				field="album_id,fsid,album_type,category,ctime,size,bytes,duration_format,duration_ms_long,thumburl,title,tag,status,extra_info"
				:where="where" page-data="replace" :orderby="orderby" :getcount="true" :page-size="options.pageSize"
				:page-current="options.pageCurrent" v-slot:default="{ data, pagination, loading, error, options }"
				:options="options" loadtime="manual" @load="onqueryload">

				<div v-if="data.length == 0" class="uni-table-loading">
					<td class="uni-empty-text">没有更多数据</td>
				</div>
				<div v-if="loading" class="uni-table-mask">
					<div class="uni-table--loader"></div>
				</div>

				<div class="photo-list">
					<div class="photo-item" v-for="(item, index) in fileData" :key="index">
						<div class="img-container">
							<span v-if="false">
								<div role="tooltip" id="yk-popover" class="yk-popover yk-popper album-popover"
									style="display: none;">
									<div class="btn-list">
										<div class="btn-item" @click.stop="">绑定人物</div>
										<div class="btn-item" @click.stop="">绑定连拍</div>
										<div class="btn-item" @click.stop="">绑定片段</div>
										<div class="btn-item" @click.stop="">相册id</div>
										<div class="btn-item" @click.stop="">文件id</div>
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
							<!-- thumburl [0] 一刻相册缩略图、[1] 原图大图-已上传uniCloud -->
							<image class="photo-img" :src="item.thumburl[0]" mode="heightFix" />
							<!-- 仅视频显示 -->
							<div v-if="item.category == 1" class="video-duration">
								<image class="start" src="@/static/yike/icon-play-start.png" mode="aspectFill" />
								<div class="duration">{{ item.duration_format }}</div>
							</div>
							<!-- 仅草稿箱显示❌  发布状态：0 草稿箱 1 已发布 -->
							<div v-if="item.status == 0" class="flie-status">
								{{ options.status_valuetotext[item.status] == '已发布' ? '✅' : '❌' }}
							</div>
						</div>
						<div class="img-mask"></div>
						<!-- 可点击的复选框 -->
						<div class="check-btn"
							:class="{ 'check-btn': !selectedIndexs.includes(index), 'check-btn item-checked checked': selectedIndexs.includes(index) }"
							@click.stop="toggleSelection(index)">
						</div>
						<div class="file-detail">
							<div class="person" v-if="item.person_info && item.person_info.length !== 0">
								<div v-for="person in item.person_info" class="person-container">
									<div class="shadow"></div>
									<image class="img" :src="person.covers[0].thumb" mode="aspectFill" />
									<div class="info name person_name">
										<p>{{ person.name }}</p>
										<!-- <p>Shift + A</p> -->
									</div>
								</div>
								<!-- 点击人物头像 打开换绑人物弹窗 弹窗在最下面 -->
							</div>
							<div class="yk-album__item--text file_size">{{ item.bytes }}</div>
							<div class="yk-album__item--date">
								<uni-dateformat :threshold="[0, 0]" :date="item.ctime * 1000"
									format="yyyy/MM/dd"></uni-dateformat>
							</div>
						</div>
					</div>
				</div>

				<!-- 换绑人物 弹窗遮罩层 -->
				<div v-if="showPersonDialog" class="yk-dialog-container yk-dialog-show"
					style="background: rgba(0, 0, 0, 0.6);">
					<div class="yk-dialog"
						style="width: 620px; height: 485px; background-size: 100%; overflow: hidden;">
						<i class="yk-icons yk-icon-close" @click="togglePersonDialog">❌</i>
						<div class="yk-dialog-content">
							<div class="change-face">
								<div class="title">换绑人物</div>
								<div class="face-list">
									<div class="face-item" v-for="(item, index) in personData" :key="index"
										:class="{ 'check': selectedPersonIndexs.includes(index) }"
										v-if="item.covers[0].thumb" @click="togglePersonSelection(index)">
										<div class="shadow"></div>
										<image :src="item.covers[0].thumb" mode="aspectFill" />
										<div class="name">{{ item.name }}</div>
									</div>
								</div>
							</div>
							<div class="changeFaceBtnList">
								<div :class="`unbind confirm ${selectedPersonIndexs.length == 0 ? '' : 'can-unbind'}`"
									@click="unbindPersons">解绑</div>
								<div :class="`confirm ${selectedPersonIndexs.length == 0 ? '' : 'can-confirm'}`"
									@click="bindPersons">绑定</div>
								<div class="cancel" @click="togglePersonDialog">取消</div>
							</div>
						</div>
						<div class="yk-dialog-footer"></div>
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
} from '@/js_sdk/validator/photo-baidu-album-listfile.js';

import {
	getPerson,
	getPersonByIds,
	addAssociationsFilePerson,
	deleteAssociationsFilePerson,
	getAssociationsFilePerson
} from '@/js_sdk/associations/index.js';


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
			exportExcelData: [],
			tabItems: ['全部', '视频', '图片'],
			current: 0,
			showSortTool: false, // 默认排序工具不显示
			fileData: [],
			personData: [], // 人物列表
			filePersonBindingData: [], // 文件与人物绑定数据
			selectedPersonIndexs: [],
			showPersonDialog: false,
			imgCount: 0,
			videoCount: 0,
			album_title: '', // 相册名称
			album_ctime: 0, // 相册创建时间
		}
	},
	onLoad(e) {
		this._filter = {}
		if (e.album_id) {
			const {
				album_id,
				create_time,
				title
			} = e
			this.album_title = title
			this.album_ctime = create_time
			this.queryAlbumId = album_id
			this.where = `album_id == '${this.queryAlbumId}'`
		}
	},
	onReady() {
		console.log("where", this.where)
		// 组件上配置了 loadtime = "manual", 这里需要手动加载数据
		this.$nextTick(() => {
			this.$refs.udb.loadData()
		})
		this.initCounts()
		this.getPersonList()
	},
	methods: {
		onqueryload(data) {
			this.fileData = data
			console.log("data", data)

			this.getFilePersonBindingList()
		},
		toggleSortTool() {
			this.showSortTool = !this.showSortTool;
		},
		togglePersonDialog() {
			this.showPersonDialog = !this.showPersonDialog;
			this.selectedPersonIndexs = []

			// 获取当前选中的文件列表
			const selectedFiles = this.selectedIndexs.map(i => this.fileData[i])
			console.log('selectedFiles', selectedFiles)
			// 当前选中文件的人物列表
			const currentSelectedPersonList = selectedFiles.reduce((acc, file) => {
				if (file.person_info) {
					return acc.concat(file.person_info.map(item => item.person_id));
				} else {
					return acc;
				}
			}, []);
			console.log('currentSelectedPersonList', currentSelectedPersonList)

			// 从人物列表中找到当前选中文件的人物列表的索引
			this.selectedPersonIndexs = currentSelectedPersonList.reduce((acc, personId) => {
				const index = this.personData.findIndex(item => item.person_id === personId);
				if (index !== -1 && !acc.includes(index)) {
					acc.push(index);
				}
				return acc;
			}, []);
			console.log('selectedPersonIndexs', this.selectedPersonIndexs)
		},
		togglePersonSelection(index) {
			if (this.selectedPersonIndexs.includes(index)) {
				// 如果已选中，则取消选中
				this.selectedPersonIndexs = this.selectedPersonIndexs.filter(item => item !== index);
			} else {
				// 如果未选中，则添加到选中数组
				this.selectedPersonIndexs.push(index);
			}
		},
		async bindPersons() {
			const fileList = this.fileData
			const personList = this.personData

			const fileIds = this.selectedIndexs.map(i => fileList[i].fsid)
			const personIds = this.selectedPersonIndexs.map(i => personList[i].person_id)
			//console.log('fileIds', fileIds, 'personIds', personIds)

			// 在这里实现绑定人物的逻辑
			// 调用 addAssociationsFilePerson 函数
			const result = await addAssociationsFilePerson(fileIds, personIds)
			console.log('新增记录数：', result)

			uni.showToast({
				title: `新增记录数：${result}`,
				icon: 'none'
			})

			this.togglePersonDialog()
			this.$nextTick(() => {
				this.$refs.udb.loadData()
			})
		},
		async unbindPersons() {
			const fileList = this.fileData
			const personList = this.personData

			const fileIds = this.selectedIndexs.map(i => fileList[i].fsid)
			const personIds = this.selectedPersonIndexs.map(i => personList[i].person_id)
			//console.log('fileIds', fileIds, 'personIds', personIds)

			// 在这里实现解除绑定人物的逻辑
			// 调用 deleteAssociationsFilePerson 函数
			const result = await deleteAssociationsFilePerson(fileIds, personIds)
			console.log('删除记录数：', result)

			uni.showToast({
				title: `删除记录数：${result}`,
				icon: 'none'
			})

			this.togglePersonDialog()
			this.$nextTick(() => {
				this.$refs.udb.loadData()
			})
		},
		onTabItem(e) {
			if (this.current !== e.currentIndex) {
				this.current = e.currentIndex

				// 根据当前索引获取文件类型数组
				const fileTypeArray = getFileType(e.currentIndex);

				// 构建查询参数对象
				const param = {
					filter: fileTypeArray,
					filterType: 'select'
				};

				// 筛选出对应文件类型的数据
				this.filterChange(param, 'category')

			}
			// 根据当前索引获取文件类型数组的函数
			function getFileType(index) {
				// 如果索引为0，则返回空数组，表示“全部文件”
				if (index === 0) {
					return [];
				}
				// 将索引转换为文件类型的值，并返回数组
				const flieType = parseInt(index == 1 ? 1 : 3) // 1 视频 3 图片
				return [flieType];
			}
		},
		getWhere() {
			const query = this.query.trim()
			if (!query) {
				return ''
			}
			const dbSearchFields = {
				filter: [parseInt(query)], // 转为数字
				filterType: 'select'
			};
			return dbSearchFields
		},
		search() {
			this._filter = {} // 只在搜索文件的时候清空已存在的条件
			const param = this.getWhere()
			this.filterChange(param, 'fsid')
			// this.$nextTick(() => {
			// 	this.loadData()
			// })
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

				}
			})
		},
		// 多选，uni-table的，现已不需要
		selectionChange(e) {
			this.selectedIndexs = e.detail.index
		},
		// 多选
		toggleSelection(index) {
			const isSelected = this.selectedIndexs.includes(index);
			if (isSelected) {
				// 如果已选中，则从选中列表中移除
				this.selectedIndexs = this.selectedIndexs.filter(item => item !== index);
			} else {
				// 如果未选中，则添加到选中列表
				this.selectedIndexs.push(index);
			}
		},
		toggleAllSelection() {
			const dataList = this.$refs.udb.dataList
			if (this.selectedIndexs.length === dataList.length) {
				// 如果全选了，则清空选中列表实现取消全选
				this.selectedIndexs = [];
			} else {
				// 如果未全选，则将所有索引添加到选中列表实现全选
				this.selectedIndexs = dataList.map((_, index) => index);
			}
		},
		confirmDelete(id) {
			this.$refs.udb.remove(id, {
				success: (res) => {

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

			this.$nextTick(() => {
				this.$refs.udb.loadData()
			})
		},
		filterChange(e, name) {
			this._filter[name] = {
				type: e.filterType,
				value: e.filter
			}
			// 确保 this.queryAlbumId 已经被定义
			if (this.queryAlbumId !== undefined) {
				// 增加 album_id 字段，用于查询当前相册中的文件
				this._filter['album_id'] = {
					type: 'search',
					value: this.queryAlbumId
				};
			} else {
				console.error("queryAlbumId is undefined");
			}
			console.log("_filter", this._filter)

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
		async queryFileCount(category) {
			const fileCollectionName = 'yike-album-files';
			const fileCollection = db.collection(fileCollectionName);
			const {
				result: {
					total
				}
			} = await fileCollection.where({
				album_id: this.queryAlbumId,
				category: category
			}).count();
			return total;
		},
		async initCounts() {
			this.imgCount = await this.queryFileCount(3);
			this.videoCount = await this.queryFileCount(1);
		},
		// 获取人物列表
		async getPersonList() {
			const personList = await getPerson();
			console.log("personList", personList)
			this.personData = personList;
		},
		// 获取文件与人物绑定数据
		async getFilePersonBindingList() {
			// 从文件数据列表中提取文件 ID（fsid）数组
			const fileIds = this.fileData.map(item => item.fsid);
			console.log('fileIds', fileIds);

			// 批量查询文件与人物绑定数据
			const filePersonAssociations = await getAssociationsFilePerson(fileIds);
			console.log('result', filePersonAssociations);

			// 将结果转换为文件与人物绑定数据对象
			const newFilePersonBindingData = filePersonAssociations.map(association => {
				// 在人物列表中查找与当前绑定项的 person_id 匹配的人物数据
				const person = this.personData.find(p => p.person_id === association.person_id);
				// 在文件列表中查找与当前绑定项的 file_id 匹配的文件数据
				const file = this.fileData.find(f => f.fsid === association.file_id);
				// 返回一个新的对象，包含找到的人物数据和对应的文件 ID（fsid），如果未找到文件则 fsid 为 null
				return {
					...person,
					fsid: file ? file.fsid : null
				};
			});

			this.filePersonBindingData = newFilePersonBindingData;
			console.log("newFilePersonBindingData", newFilePersonBindingData);

			// 遍历文件数据列表，将文件与人物绑定数据中的 fsid 项的数据添加到 fileData 中的 fsid 项的新字段中
			const newFileData = this.fileData.map(file => {
				const bindings = this.filePersonBindingData.filter(b => b.fsid === file.fsid);
				return {
					...file,
					person_info: bindings.map(binding => binding)
				};
			});

			this.fileData = newFileData

			console.log("fileData", this.fileData);
		}
	}
}
</script>

<style lang="scss">
@import './yike-album.css';
@import './yike-photo.css';
@import './yike-person.css';
@import './yike-dialog.css';

.photo-item {
	background-color: rgba(0, 0, 0, 0) !important;
}
</style>
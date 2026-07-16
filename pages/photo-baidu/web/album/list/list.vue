<template>
	<view>
		<view class="uni-header">
			<view class="uni-group" style="justify-content: flex-start;">
				<view class="uni-title">全部相册</view>
				<view class="uni-sub-title">采集地址：https://photo.baidu.com/photo/web/album</view>
				<uni-data-select style="margin-left: 20rpx;" v-model="photobaidu.config.selectValue"
					:localdata="photobaidu.config.data" placeholder="请选择一个采集配置" label="采集配置选择" />
				<button class="uni-button" type="primary" size="mini" @click="startCollectData()">采集相册列表</button>
				<button class="uni-button" type="default" :disabled="disabled" size="mini"
					@click="syncSelectedAlbumsToCloud()">批量关联</button>
				<button class="uni-button" type="default" :disabled="disabled" size="mini"
					@click="delTable()">批量删除</button>
				<button class="uni-button" type="warn" :disabled="disabled" size="mini"
					@click="SelectedAlbumsTofilter()">批量过滤</button>
			</view>
			<view class="uni-group">
				<button class="uni-button" type="warn" size="mini" :disabled="photobaidu.album.data.list.length == 0"
					@click="updateAllAlbumCovers">更新所有相册封面</button>
			</view>
			<view class="uni-group">
				<view class="uni-title color-red">相册的类型（用于关联云端）：</view>
				<uni-data-checkbox v-model="formData.album_type" :localdata="formOptions.album_type_localdata"></uni-data-checkbox>
			</view>
		</view>
		<view class="uni-container">
			<uni-table ref="table" :loading="loading" type="selection" emptyText="'没有更多数据'" border stripe
				@selection-change="selectionChange">
				<uni-tr>
					<!-- <uni-th align="center">album_id</uni-th> -->
					<uni-th width="175px" align="center">相册封面</uni-th>
					<uni-th width="175px" align="center">相册名称</uni-th>
					<uni-th width="175px" align="center">文件总数</uni-th>
					<uni-th align="center">创建时间</uni-th>
					<uni-th align="center">上传进度</uni-th>
					<uni-th align="center">关联云端</uni-th>
					<!-- <uni-th align="center">tid</uni-th> -->
					<!-- <uni-th align="center">creator_user</uni-th> -->
					<uni-th align="center">操作</uni-th>
				</uni-tr>
				<uni-tr v-for="(item,index) in photobaidu.album.data.list" :key="index">
					<!-- <uni-td align="center">{{item.album_id}}</uni-td> -->
					<uni-td align="center">
						<!-- thumburl [0] 缩略图、[1] 原图大图 -->
						<image :src="item.cover_info.thumburl[0]" style="width: 165px;height: 165px;"
							mode="aspectFill" />
						<p>{{ item.album_id }}</p>
					</uni-td>
					<uni-td align="center">{{item.title}}</uni-td>
					<uni-td align="center">{{item.file_cnt}}</uni-td>
					<uni-td align="center">
						<uni-dateformat :threshold="[0, 0]" :date="item.create_time*1000"
							format="yyyy/MM/dd"></uni-dateformat>
					</uni-td>
					<uni-td align="center">
						<!-- 上传进度：相册封面上传uniCloud云储存中 -->
						<progress :percent="item.custom_info.cover_upload_progress" active-mode="forwards"
							:active="false" show-info stroke-width="3" />
					</uni-td>
					<uni-td align="center">
						<text :class="item.custom_info.is_bind_cloud ? 'color-green' : 'color-red'">
							{{ item.custom_info.is_bind_cloud ? '已关联' : '未关联' }}
						</text>
					</uni-td>
					<!-- <uni-td align="center">{{item.tid}}</uni-td> -->
					<!-- <uni-td align="center">{{item.creator_user.nickname}}</uni-td> -->
					<uni-td align="center">
						<view class="uni-group">
							<button class="uni-button" size="mini" type="primary"
								@click="navigateTo(item.album_id)">采集此相册全部文件</button>
							<button class="uni-button" size="mini" type="primary"
								@click="syncToCloud(item)">关联云端</button>
							<button @click="confirmDelete(item.album_id)" class="uni-button" size="mini"
								type="warn">删除</button>
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>
			<view class="uni-pagination-box">
				<uni-pagination show-icon="false" showPageSize :pageSizeRange="[pagination.size]"
					:page-size="pagination.size" v-model="pagination.current" :total="pagination.count"
					@change="onPageChanged" />
			</view>
		</view>
	</view>
</template>

<script>
	import {
		handleUploadFiles
	} from '@/common/myutils/files/new-upload-file.js'

	const db = uniCloud.database()
	
	export default {
		data() {
			return {
				loading: false,
				photobaidu: {
					config: { // 一刻相册的采集配置
						collection: "yike-collection-config",
						selectValue: 0,
						data: []
					},
					filter: { // 过滤相册
						collection: "yike-albums-filter",
					},
					album: { // 一刻相册 全部相册
						collection: "yike-albums",
						syncList: [], // 已关联云端的相册 数组中只记录相册id['album_id1', 'album_id2'...]
						data: { // 全部相册数据，接口：https://photo.baidu.com/youai/album/v1/list
							cursor: "",
							has_more: -1, // 有更多？ 1=有更多，可加载下页。 0=没有更多数据了
							list: [
								/* 
								{
									custom_info: {// 自定义属性字段，需要在loadData加载数据完成时为list每个item添加此字段，并且需要在getCloudAlbumList方法中更改此字段的值
										cover_upload_progress: 0, // 封面（图片）文件上传进度
										is_bind_cloud: false, // 已关联云端？
									}
								} 
								 */
							], // 相册列表
							total_count: 0, // 总数量
						}
					}
				},
				pagination: {
					size: 30, // 每页数量
					current: 1, // 当前页
					count: 0 // 总数量
				},
				selectedIndexs: [] ,// 多选
				formData: {
					album_type: 0
				},
				formOptions: {
					"album_type_localdata": [
						{
						  "value": 0,
						  "text": "一刻相册"
						},
						{
						  "value": 1,
						  "text": "网剧相册"
						}
					]
				}
			}
		},
		computed: {
			disabled() {
				return this.selectedIndexs.length == 0
			}
		},
		onLoad() {

		},
		onReady() {
			this.getConfig()

		},
		methods: {
			getConfig() { // 获取 “一刻相册” 采集配置
				const configColl = this.photobaidu.config.collection
				db.collection(configColl)
					.get()
					.then((res) => {
						// res 为数据库查询结果
						//console.log(res.result.data)
						const updatedData = res.result.data.map((item, index) => {
							return {
								...item,
								text: item.notes, // 创建新的 text 字段，赋予 notes 的值
								value: index // 将 value 字段设为 index 索引
							};
						});
						this.photobaidu.config.data = updatedData
						// 这是抓的APP客户端Cookie，测试Web端也可以用
						//this.photobaidu.config.data[0].Cookie = "BDUSS=RJLTB1U2FZeWpobXJpWVJIczR0cTA2LUZDblZzZ0h1cnhJTW4zRm1ack1SbTFtRVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMy5RWbMuUVmSF; STOKEN=ed669022ee6f1b7a00632905969ae933556e772d15f8dd9b9b7b1e4d2525a38d;"
						// uni.showToast({
						// 	title: "cookie替换成功"
						// })
					}).catch((err) => {
						console.log(err.code); // 打印错误码
						console.log(err.message); // 打印错误内容
					})
			},
			async getCloudAlbumList(albumList) { // 批量获取云端相册列表
				// 将 albumList 里每个项目的 album_id 放进 ids 数组中
				const ids = albumList.map(item => item.album_id);
				const albumlistColl = this.photobaidu.album.collection // 获取相册列表集合

				// 先查询云端是否已存在
				let queryResult;
				try {
					queryResult = await db.collection(albumlistColl)
						.where({
							album_type: { $in: [0, 1] }, // 一刻相册、网剧相册
							album_id: {
								$in: ids
							} // 包含ids数组中的相册
						})
						.limit(ids.length) // 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
						.get()

				} catch (error) {
					uni.showToast({
						title: '异常错误',
						icon: 'none'
					})
					return
				}

				let {
					errMsg,
					data
				} = queryResult.result

				// 将 data 里每个 item 的 album_id 追加到 syncList 中
				data.forEach(item => {
					// 检查 syncList 是否已包含该 album_id，如果不包含，则追加
					if (!this.photobaidu.album.syncList.includes(item.album_id)) {
						this.photobaidu.album.syncList.push(item.album_id);
					}
				});
				console.log(data)

				// data 包含云端已存在的项目，用于更新本地列表中的对应项目状态，并同步更新 syncList
				this.photobaidu.album.data.list.forEach(item => {
					// 检查云端数据中是否存在当前项目
					const isItemInCloud = data.some(cloudItem => cloudItem.album_id === item.album_id);

					// 如果存在于云端，更新 custom_info.is_bind_cloud
					if (isItemInCloud) {
						item.custom_info = item.custom_info || {};
						item.custom_info.is_bind_cloud = true; // 已关联云端
					}

					// 检查封面图片 URL 的前缀
					const cloudUrlPrefix = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com";
					if (item.cover_info && item.cover_info.thumburl && item.cover_info.thumburl[1]) {
						const isCloudUrl = item.cover_info.thumburl[1].startsWith(cloudUrlPrefix);
						// 这里根据需要处理 isCloudUrl 的结果
						if (isCloudUrl) {
							item.custom_info.cover_upload_progress = 100; // 封面已上传至uniCloud云储存
							item.custom_info.cover_download_progress = 100; // 一刻相册的文件封面已下载到本地
						}
					}
				});

			},
			async getCloudFilterAlbumList(albumList) { // 获取云端过滤相册列表
				// 将 albumList 里每个项目的 album_id 放进 ids 数组中
				const ids = albumList.map(item => item.album_id);
				const albumfilterColl = this.photobaidu.filter.collection // 获取相册列表集合

				// 先查询云端是否已存在
				let queryResult;
				try {
					queryResult = await db.collection(albumfilterColl)
						.where({
							album_id: {
								$in: ids
							} // 包含ids数组中的相册
						})
						.limit(ids.length) // 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
						.get()

				} catch (error) {
					uni.showToast({
						title: '异常错误',
						icon: 'none'
					})
					return
				}

				let {
					errMsg,
					data
				} = queryResult.result

				console.log(data)


				// 从云端数据库的 '过滤相册表' 中获取已同步相册的 ID 列表
				// syncedAlbumIds 包含那些已经在云端 '过滤相册表' 中记录的相册 ID
				const syncedAlbumIds = data.map(album => album.album_id);

				// 更新本地相册列表，排除那些已经记录在云端 '过滤相册表' 中的相册
				// 对 this.photobaidu.album.data.list 进行过滤，移除其中与云端 '过滤相册表' 中记录相匹配的项目
				this.photobaidu.album.data.list = this.photobaidu.album.data.list.filter(item => {
					// 只保留那些其 album_id 不在云端 '过滤相册表' syncedAlbumIds 列表中的项目
					// 如果 item 的 album_id 不在 syncedAlbumIds 列表中，则保留该项目
					return !syncedAlbumIds.includes(item.album_id);
				});

			},
			isBindCloud(album_id) {
				return this.photobaidu.album.syncList.some(item => item === album_id);
			},
			startCollectData() { // 清空全部相册（相册列表）并开始采集
				this.photobaidu.album.syncList = []
				this.photobaidu.album.data.cursor = ""
				this.photobaidu.album.data.has_more = -1
				this.photobaidu.album.data.total_count = 0
				this.photobaidu.album.data.list = []
				this.pagination.count = 0
				this.pagination.current = 1
				this.loadData()
			},
			async loadData() { // 加载数据，调用一刻相册https://photo.baidu.com/youai/album/v1/list接口
				if (this.photobaidu.config.data.length == 0) return
				if (this.photobaidu.album.data.has_more == 0) {
					uni.showToast({
						title: '没有更多了'
					})
					return
				}
				const BASE_URL = "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com"
				const ROUTE = "/api/v1/photobaidu/"
				const FUN = "getAlbumList"

				// 配置项索引
				let configSelectIndex = this.photobaidu.config.selectValue
				let config = this.photobaidu.config.data[configSelectIndex]

				// 请求下页时的光标，为空获取第一页数据
				let cursor = this.photobaidu.album.data.cursor || ""
				// 构造查询参数
				let querys = {
					clienttype: "70", // 客户端类型 70为Web
					bdstoken: config.bdstoken,
					cursor, // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
					limit: "30", // 每页30条（Web版默认）
					need_amount: "1", // 默认
					need_member: "1", // 默认
					field: "mtime" // 默认
				}
				// 构造请求头
				let headers = {
					"Cookie": config.Cookie,
					"Host": config.Host,
					"Referer": config
						.Referer // https://photo.baidu.com/photo/web/album=全部相册；不加相册id代表获取全部相册，加相册id代表获取指定id相册
				}
				this.loading = true
				uni.request({
					url: `${BASE_URL}${ROUTE}${FUN}`,
					method: 'POST', // 云对象方法，要用POST
					data: {
						querys,
						headers
					},
					success: (res) => {
						console.log(res)

						const {
							cursor,
							has_more,
							total_count,
							list
						} = res.data.data;

						// 为list中的每个项目添加自定义字段
						const updatedList = list.map(item => ({
							...item,
							custom_info: {
								cover_upload_progress: 0, // 封面（图片）文件上传进度，默认为0
								is_bind_cloud: false, // 是否已关联云端，默认为false
							}
						}));

						// 更新相册数据，将新处理的项目添加到现有列表中
						this.photobaidu.album.data = {
							cursor,
							has_more,
							total_count,
							list: [...this.photobaidu.album.data.list, ...updatedList]
						};

						// 更新分页信息
						this.pagination.count = total_count;

						// 获取云端相册列表，并更新相应的自定义信息
						this.getCloudAlbumList(updatedList);

						// 获取云端数据库 "过滤相册" 表记录，并排除掉已添加到过滤相册记录中的项目
						this.getCloudFilterAlbumList(updatedList)

						this.loading = false
					},
					fail: (err) => {
						console.log(err)
						this.loading = false
					}
				})

			},
			onPageChanged(e) {
				console.log(e)
				if (e.type == 'current') {
					// 由于一刻相册，只能通过下拉加载数据（通过上页cursor请求下页数据），所以不能直接点击n页码请求。
					uni.showToast({
						title: '不支持点页码'
					})
					this.pagination.current = e.current - 1
					return
				}

				const total_count = this.photobaidu.album.data.total_count
				const list_length = this.photobaidu.album.data.list.length
				console.log({
					total_count,
					list_length
				})
				// 判断下页数据是否已加载过，没有加载过就请求下页数据
				if ((total_count - list_length) == 0) {
					uni.showToast({
						title: '没有更多了'
					})
					return
				}
				// 请求下页数据
				this.pagination.current = e.current
				this.loadData()

			},
			confirmDelete(album_id) {
				// 删除list中对应album_id的项目
				// 使用 filter 方法删除特定 album_id 的项目
				this.photobaidu.album.data.list = this.photobaidu.album.data.list.filter(item => item.album_id !==
					album_id);
			},
			navigateTo(album_id) {
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
				const targetPath = '/pages/photo-baidu/web/album/listfile/listfile';
				// 替换当前页面的URL部分为目标页面的路径，构造新的URL
				const targetUrl = fullUrl.replace(currentUrl, targetPath);
				
				// 配置项索引
				let configSelectIndex = this.photobaidu.config.selectValue
				const param = {
					config_index: configSelectIndex,
					album_id,
				}
				// #ifdef H5
				if (targetUrl.indexOf('http') === 0) {
					return window.open(`${targetUrl}?param=${encodeURIComponent(JSON.stringify(param))}`)
				}
				// #endif
			},
			async syncToCloud(albumList) { // 关联云端 [支持单个和批量添加]
				// TODO 新版本需增加
				// 先弹出uni.showM..模态框，提示请确认当前所选的相册类型，是否继续执行，因为不然的话，可能有时候忘记了调类型
			
			
				// 确保传入的参数是数组，如果不是数组，则将其转换为数组
				let albums = Array.isArray(albumList) ? albumList : [albumList];
				const ids = albums.map(item => item.album_id); // 从每个相册对象中提取album_id

				const albumlistColl = this.photobaidu.album.collection; // 获取相册列表集合

				// 先查询云端是否已存在
				let queryResult;
				try {
					queryResult = await db.collection(albumlistColl)
						.where({
							album_type: {  $in: [0 , 1] }, // 一刻相册、网剧相册
							album_id: {
								$in: ids
							} // 包含ids数组中的相册
						})
						.get();
				} catch (error) {
					uni.showToast({
						title: '异常错误',
						icon: 'none'
					});
					return;
				}
				
				// TODO 新版本需增加
				// 后期新版本改版时，需要增加同步为一刻相册类型或网剧类型，并且如果云端有记录，还需要再次检查是否有封面信息，因为自己新建的话，是没有封面的
				

				let {
					errMsg,
					data
				} = queryResult.result;
				console.log('data', data); // data仅返回云端中ids中已存在的记录

				// 将data中每个item.album_id从ids或albums中排除掉，这样就可以确定批量关联时，云端中没有的记录。

				// 排除已经存在于云端的相册 [ 只保留data中没有的项 ]
				albums = albums.filter(album =>
					!data.some(existingAlbum => existingAlbum.album_id === album.album_id)
				);

				// 如果没有需要同步的相册，则提前退出
				if (albums.length === 0) {
					uni.showToast({
						title: '没有需要同步的相册',
						icon: 'none'
					});
					return;
				}


				// 批量上传相册文件封面到uniCloud云储存中
				await handleUploadFiles(albums, (index, progress) => {
						console.log(`Album ${index} is ${progress}% uploaded.`);

						// 获取当前正在上传的项目（progressItem）
						const progressItem = albums[index];

						// 查找 list 中与 progressItem 相匹配的项目，并更新其上传进度
						const listIndex = this.photobaidu.album.data.list.findIndex(item => item.album_id ===
							progressItem.album_id);
						if (listIndex !== -1) {
							this.photobaidu.album.data.list[listIndex].custom_info.cover_upload_progress =
							progress;
						}

					})
					.then(updatedList => {
						console.log('All files uploaded');
						console.log('updatedList', updatedList)
						// 处理上传后的操作，例如更新列表

						albums = updatedList

						// 更新List
						updatedList.forEach(updatedItem => {
							// 查找 this.photobaidu.album.data.list 中具有相同 album_id 的索引
							const index = this.photobaidu.album.data.list.findIndex(item => item
								.album_id === updatedItem.album_id);

							// 如果找到匹配的项目，则替换
							if (index !== -1) {
								this.photobaidu.album.data.list.splice(index, 1, updatedItem);
							}
						});

					})
					.catch(error => {
						console.error('Error during file upload:', error);
					});



				// 定义数据库 schema 中存在的字段
				const validFields = [
					'album_type', 'album_id', 'bg_info', 'cover_info', 'create_time',
					'creator_user', 'notice', 'tid', 'title'
				];

				// 准备要添加的对象数组
				let itemsToAdd = albums.map(item => {
					let newItem = {};
					// 筛选出有效的字段
					validFields.forEach(field => {
						if (item.hasOwnProperty(field)) {
							newItem[field] = item[field];
						}
					});
					// 更改相册类型为用户指定的类型
					newItem.album_type = this.formData.album_type
					return newItem;
				});
				
				
				// 向数据库批量添加记录
				let addResult;
				try {
					addResult = await db.collection(albumlistColl).add(itemsToAdd);
					console.log(addResult.result);

					// 更新 this.photobaidu.album.data.list 中的 custom_info.is_bind_cloud 标志
					this.photobaidu.album.data.list.forEach(item => {
						// 检查 item 是否存在于 albums 中
						const isSynced = albums.some(album => album.album_id === item.album_id);

						// 如果存在，则设置 custom_info.is_bind_cloud 为 true
						if (isSynced) {
							item.custom_info = item.custom_info || {}; // 确保 custom_info 存在
							item.custom_info.is_bind_cloud = true; // 关联云端
						}
					});

					// 此时 this.photobaidu.album.data.list 中的相关条目已被更新

					// 记录已同步的相册 id
					this.photobaidu.album.syncList = [...this.photobaidu.album.syncList, ...ids];
					uni.showToast({
						title: '同步完成',
						icon: 'none'
					})
				} catch (error) {
					// 错误处理
					console.error("Error adding to database:", error);
					uni.showToast({
						title: '同步失败',
						icon: 'none'
					});
				}
			},
			/**
			 * 《更新所有相册封面信息，cover_info》
			 * 更新所有相册的is_bind_cloud属性为false，并更新云端中的记录。
			 * 遍历所有相册，将每个相册的custom_info.is_bind_cloud设置为false，
			 */
			async updateAllAlbumCovers() {
				// 使用.map()遍历并更新每个相册的is_bind_cloud属性
				let albums = this.photobaidu.album.data.list.map(item => {
					//item.custom_info.is_bind_cloud = false;
					item.custom_info.cover_upload_progress = 0
					return item;
				});

				// 批量上传相册文件封面到uniCloud云储存中
				await handleUploadFiles(albums, (index, progress) => {
						console.log(`Album ${index} is ${progress}% uploaded.`);

						// 获取当前正在上传的项目（progressItem）
						const progressItem = albums[index];

						// 查找 list 中与 progressItem 相匹配的项目，并更新其上传进度
						const listIndex = this.photobaidu.album.data.list.findIndex(item => item.album_id ===
							progressItem.album_id);
						if (listIndex !== -1) {
							this.photobaidu.album.data.list[listIndex].custom_info.cover_upload_progress =
							progress;
						}

					})
					.then(updatedList => {
						console.log('All files uploaded');
						console.log('updatedList', updatedList)
						// 处理上传后的操作，例如更新列表

						albums = updatedList

						// 更新List
						updatedList.forEach(updatedItem => {
							// 查找 this.photobaidu.album.data.list 中具有相同 album_id 的索引
							const index = this.photobaidu.album.data.list.findIndex(item => item
								.album_id === updatedItem.album_id);

							// 如果找到匹配的项目，则替换
							if (index !== -1) {
								this.photobaidu.album.data.list.splice(index, 1, updatedItem);
							}
						});

					})
					.catch(error => {
						console.error('Error during file upload:', error);
					});

				// 获取相册列表集合
				const albumlistColl = this.photobaidu.album.collection;
				
				console.log("albums", albums)
				
				albums.forEach(async (album, index) => {
					try {
						const updateResult = await db.collection(albumlistColl)
							.where({
								album_id: album.album_id // 使用 album_id 作为更新条件
							})
							.update({
								cover_info: album.cover_info // 更新封面信息
							});

						// 成功更新后打印索引和更新结果
						console.log(`索引 ${index}:`, updateResult);
					} catch (error) {
						// 如果更新失败，则打印错误和相应的索引
						console.error(`索引 ${index} 更新失败:`, error);
					}
				});


			},
			/**
			 * 将用户选中的相册同步到云端相册列表中。
			 * 根据selectedIndexs数组，获取用户选中的相册对象，
			 * 然后使用syncToCloud方法将这些选中的相册同步到云端。
			 */
			async syncSelectedAlbumsToCloud() { // 将所选相册同步到云端相册列表中
				// 根据selectedIndexs数组获取选中的相册对象
				const selectedAlbums = this.selectedIndexs.map(index =>
					this.photobaidu.album.data.list[index]
				);
				await this.syncToCloud(selectedAlbums)

			},
			async SelectedAlbumsTofilter() { // 将所选相册同步到云端过滤相册中
				// 根据selectedIndexs数组获取选中的相册对象
				const selectedAlbums = this.selectedIndexs.map(index =>
					this.photobaidu.album.data.list[index]
				);
				await this.addAlbumsToCloudfilter(selectedAlbums)
			},
			async addAlbumsToCloudfilter(albumList) { // 将相册添加到云端过滤相册数据库中
				// 确保传入的参数是数组，如果不是数组，则将其转换为数组
				let albums = Array.isArray(albumList) ? albumList : [albumList];
				const ids = albums.map(item => item.album_id); // 从每个相册对象中提取album_id

				const albumfilterColl = this.photobaidu.filter.collection; // 获取过滤相册集合

				// 先查询云端是否已存在
				let queryResult;
				try {
					queryResult = await db.collection(albumfilterColl)
						.where({
							//album_type: 0, // 一刻相册
							album_id: {
								$in: ids
							} // 包含ids数组中的相册
						})
						.get();
				} catch (error) {
					uni.showToast({
						title: '异常错误',
						icon: 'none'
					});
					return;
				}

				let {
					errMsg,
					data
				} = queryResult.result;
				console.log('data', data); // data仅返回云端中ids中已存在的记录

				// 将data中每个item.album_id从ids或albums中排除掉，这样就可以确定批量关联时，云端中没有的记录。

				// 排除已经存在于云端的相册 [ 只保留data中没有的项 ]
				albums = albums.filter(album =>
					!data.some(existingAlbum => existingAlbum.album_id === album.album_id)
				);

				// 如果没有需要过过滤的相册，则提前退出
				if (albums.length === 0) {
					uni.showToast({
						title: '没有需要过滤的相册',
						icon: 'none'
					});
					return;
				}

				// 定义数据库 schema 中存在的字段
				const validFields = [
					'album_id', 'cover_info', 'notice', 'tid', 'title'
				];

				// 准备要添加的对象数组
				let itemsToAdd = albums.map(item => {
					let newItem = {};
					// 筛选出有效的字段
					validFields.forEach(field => {
						if (item.hasOwnProperty(field)) {
							newItem[field] = item[field];
						}
					});
					return newItem;
				});

				// 向数据库批量添加记录
				let addResult;
				try {
					addResult = await db.collection(albumfilterColl).add(itemsToAdd);
					console.log('uniCloud.add', addResult.result);

					// 从云端数据库的 '过滤相册表' 中获取已同步相册的 ID 列表
					// syncedAlbumIds 包含那些已经在云端 '过滤相册表' 中记录的相册 ID
					const syncedAlbumIds = albums.map(album => album.album_id);

					// 更新本地相册列表，排除那些已经记录在云端 '过滤相册表' 中的相册
					// 对 this.photobaidu.album.data.list 进行过滤，移除其中与云端 '过滤相册表' 中记录相匹配的项目
					this.photobaidu.album.data.list = this.photobaidu.album.data.list.filter(item => {
						// 只保留那些其 album_id 不在云端 '过滤相册表' syncedAlbumIds 列表中的项目
						// 如果 item 的 album_id 不在 syncedAlbumIds 列表中，则保留该项目
						return !syncedAlbumIds.includes(item.album_id);
					});

					uni.showToast({
						title: '添加过滤成功',
						icon: 'none'
					})

				} catch (error) {
					// 错误处理
					console.error("Error adding to database:", error);
					uni.showToast({
						title: '过滤失败',
						icon: 'none'
					});
				}


			},
			// 多选处理
			selectedItems() {
				return this.selectedIndexs.map(i =>
					this.photobaidu.album.data.list[i]
				)
			},
			// 多选
			selectionChange(e) {
				console.log(e.detail.index) // 返回只包含索引的多选项数组 = [1, 2, 3, 5,...] 
				this.selectedIndexs = e.detail.index
			},
			//批量删除
			delTable() {
				const selectedItems = this.selectedItems();
				console.log(selectedItems);

				// 获取要删除的 album_id 数组
				const idsToDelete = selectedItems.map(item => item.album_id);

				// 从 list 中过滤掉要删除的项目
				this.photobaidu.album.data.list = this.photobaidu.album.data.list.filter(
					item => !idsToDelete.includes(item.album_id)
				);



				// 可以在这里添加代码更新 UI 或给用户反馈
				uni.showToast({
					title: '所选项目已删除',
					icon: 'none'
				});

				this.$refs.table.clearSelection() // 用于多选表格，清空用户的选择
				// 清空已选择的索引
				this.selectedIndexs = [];
			},

		}
	}
</script>

<style>
</style>
<template>
	<view>
		<view class="uni-header">
			<view class="uni-col">
				<view class="uni-group">
					<view class="uni-title">全部相册</view>
					<view class="uni-sub-title">{{ `采集地址：https://photo.baidu.com/photo/web/album/${photobaidu.album.album_id}` }}</view>
					<template v-if="photobaidu.config.data.length !== 0">
						<uni-data-select style="margin-left: 20rpx;"
							v-model="photobaidu.config.selectValue"
							:localdata="photobaidu.config.data"
							:clear="false"
							:disabled="true"
							placeholder="请选择一个采集配置" 
							label="采集配置选择"
						/>
					</template>
					<button class="uni-button" type="primary" size="mini" 
					@click="startCollectData()">采集相册文件</button>
					
					<button class="uni-button" type="primary" size="mini"
					@click="autoSyncAllAlbumFiles()">全自动采集并同步</button>
					
					<button class="uni-button" type="default" :disabled="disabled" size="mini"
					@click="syncSelectedAlbumsToCloud()">批量关联</button>
					
					<button @click="ceshi">测试</button>
				</view>
				<view class="uni-group" style="justify-content: flex-start;">
					<view class="uni-title">
						<!-- <text>当前采集任务</text> -->
						<!-- 当前页 -->
						<!-- <text>{{ photobaidu.task.page.current }}</text> -->
						<!-- <text>/</text> -->
						<!-- 总页数 -->
						<!-- <text class="color-red">{{ photobaidu.task.page.total }}</text> -->
						<!-- <text>页</text> -->
						<!-- 采集任务状态 -->
						<!-- <text class="m-l-10">状态：{{ photobaidu.task.state.run ? '已完成' : '采集中'  }}</text> -->
						
						<text>采集任务状态：</text>
						<!-- 当前页 -->
						<text>第 {{ photobaidu.task.page.current }} / </text>
						<!-- 总页数 -->
						<text class="color-red">{{ photobaidu.task.page.total }}</text>
						<text>页</text>
					</view>
					<view class="uni-sub-title m-l-10">
						<text>| 采集：{{ taskStateText(photobaidu.task.state.collect) }}</text>
						<text>| 转码：{{ taskStateText(photobaidu.task.state.transcode) }}</text>
						<text>| 同步：{{ taskStateText(photobaidu.task.state.sync) }}</text>
						
						<!-- <text>无需更新：</text>
						<text class="color-blue">{{ photobaidu.task.state.need_not }}</text> -->
					</view>
					<view class="uni-title m-l-10">
						<text>总数量：{{ photobaidu.album.data.total_count }}</text>
						<text>图片：{{ photobaidu.album.data.pic_count }}</text>
						<text>视频：{{ photobaidu.album.data.video_count }}</text>
					</view>
					<!-- <view class="uni-sub-title m-l-10">
						<text>采集完成：</text>
						<text class="color-green">{{ photobaidu.task.state.finish }}</text>
					</view>
					<view class="uni-sub-title m-l-10">
						<text>采集失败：</text>
						<text class="color-red">{{ photobaidu.task.state.error }}</text>
					</view> -->
					<!-- <template>
						<view class="uni-title m-l-10">
							<text>视频转码任务</text>
						</view>
						<view class="uni-sub-title m-l-10">
							<text>无需转码：</text>
							<text class="color-blue">{{ photobaidu.task.state.need_not }}</text>
						</view>
						<view class="uni-sub-title m-l-10">
							<text>转码完成：</text>
							<text class="color-green">{{ photobaidu.task.state.finish }}</text>
							<text> / </text>
							<text class="color-red">{{ photobaidu.task.page.total }}</text>
						</view>
					</template> -->
				</view>
				<view class="uni-group">
					<uni-section title="选择时间范围" type="line" />
					<uni-datetime-picker v-model="datetimerange" type="datetimerange" @change="dateTimerAngeChange"
						rangeSeparator="至" />
				</view>
			</view>
		</view>
		<view class="uni-container">
			<uni-table ref="table" :loading="loading" type="selection" @selection-change="selectionChange" emptyText="'没有更多数据'" border stripe >
				<uni-tr>
					<!-- <uni-th align="center">album_id</uni-th> -->
					<uni-th width="175px" align="center">文件封面</uni-th>
					<uni-th align="center">文件类型</uni-th>
					<!-- <uni-th align="center">上传进度</uni-th> -->
					<uni-th align="center">创建时间</uni-th>
					<uni-th align="center">关联云端</uni-th>
					<!-- <uni-th align="center">tid</uni-th> -->
					<!-- <uni-th align="center">creator_user</uni-th> -->
					<uni-th align="center">操作</uni-th>
				</uni-tr>
				<uni-tr v-for="(item,index) in photobaidu.album.data.list" :key="index">
					<!-- <uni-td align="center">{{item.album_id}}</uni-td> -->
					<uni-td align="center">
						<!-- thumburl [0] 缩略图、[1] 原图大图 -->
						<image :src="item.thumburl[0]" style="width: 165px;height: 165px;" mode="aspectFill"/>
						<!-- category: 1=视频 、3=图片 -->
						<view class="video_extra_info" v-if="item.category == 1">
							<text class="duration_ms">{{ toDuration(item.extra_info.duration_ms) }}</text>
							<view class="gap-5" />
							<text class="file_size">{{ toFileSize(item.size) }}</text>
						</view>
					</uni-td>
					<uni-td align="center">{{item.category == 1 ? '视频' : '图片'}}</uni-td>
					<!-- 
					<uni-td align="center">
						<progress :percent="item.custom_info.cover_upload_progress" active-mode="forwards" :active="false" show-info stroke-width="3" />
					</uni-td>
					 -->
					<uni-td align="center">
						<uni-dateformat :threshold="[0, 0]" :date="item.ctime*1000"
							format="yyyy/MM/dd"></uni-dateformat>
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
							<!-- <button class="uni-button" size="mini"
								type="primary" @click="navigateTo(item.album_id)">采集此相册全部文件</button>
							<button @click="confirmDelete(item.album_id)" class="uni-button" size="mini"
								type="warn">删除</button> -->
							<button class="uni-button" size="mini"
								:disabled="item.custom_info.upload_progress == 100 ? true : false"
								type="warn">重试</button>	
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>
			<view class="uni-pagination-box">
				<uni-pagination show-icon="false" showPageSize :pageSizeRange="[pagination.count]" :page-size="pagination.size" :current="pagination.current"
					:total="pagination.count" @change="onPageChanged" />
			</view>
		</view>
	</view>
</template>

<script>
	import { 
		convertDuration,
		formatFileSize
	} from '@/common/myutils/files/comm.js'
	
	import {
		handleUploadFiles
	} from '@/common/myutils/files/new-upload-file.js'
	
	import {
		http
	} from '@/common/myutils/http/index.js'
import error from '../../../../../store/modules/error'
import { onUpdated } from "vue"
	
	const db = uniCloud.database()
	const albumCollectionName = "yike-albums"
	const albumCollection = db.collection(albumCollectionName) // 相册数据库表
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
					album: { // 一刻相册 相册文件
						//collection: "yike-album-files",// 相册文件数据库表
						// TODO 2024-0324-1508 改为将采集的相册文件同步到 "yike-collection-album-files" 已采集的相册文件数据库中，因为之后需要将所有相册文件按照相册id手动打乱顺序后再同步到 "yike-album-files" 相册文件数据库中
						collection: "yike-collection-album-files",// 相册文件数据库表
						album_id: "",// 相册id，用于采集当前相册的所有文件
						syncList: [], // 已关联云端的相册文件 数组中只记录相册文件id['album_id1', 'album_id2'...]
						data: {// 相册全部文件数据，接口：https://photo.baidu.com/youai/album/v1/listfile
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
							], // 相册文件列表
							total_count: 0, // 总数量,
							pic_count: 0, // 图片数量
							video_count: 0, // 视频数量
						}
					},
					task: {// 采集任务
						page: {
							current: 0, // 当前页
							total: 0, // 总页
							data: {// 当前页的数据
								list: []// 相册文件列表
							}
						},
						state: {// 状态
							run: false,// 所有任务进行中？
							// 同时为每个任务设置三种状态：等待中（waiting）、进行中（processing）、已完成（completed）。
							collect: 'waiting', // 采集任务状态
							transcode: 'waiting', // 转码任务状态
							sync: 'waiting' // 同步任务状态
						}
					}
				},
				pagination: {
					size: 100,// 每页数量
					current: 1,// 当前页
					count: 0 // 总数量
				},
				selectedIndexs: [],// 多选
				datetimerange: ["2023-02-08 0:01:10", "2024-05-01 23:59:59"],
			}
		},
		computed: {
			disabled() {
				return this.selectedIndexs.length == 0
			}
		},
		onLoad: function(option) { // 这种方法可以确保你的代码能够灵活处理不同格式的输入，无论它是一个 JSON 字符串还是一个普通字符串。
			// 首先对参数进行解码
			const decodedParam = decodeURIComponent(option.param);

			let param;

			try {
				// 尝试将解码后的字符串解析为JSON
				param = JSON.parse(decodedParam);
			} catch (error) {
				// 如果解析失败，说明不是有效的JSON字符串，使用解码后的原始字符串
				param = decodedParam;
			}

			// 此时param变量会是JSON对象或原始字符串，取决于输入的格式
			console.log(param);// 这里能正常打印：{"config":{"_id":"_photo_baidu_config_preset","notes":"活泼开朗的小灵...
			
			this.photobaidu.config.selectValue = param.config_index
			this.photobaidu.album.album_id = param.album_id
			this.getConfig()
			this.updateEndTimeToCurrent()
			uni.showModal({
				title: "重点提示",
				content: "请选择时间范围！"
			})
		},
		methods: {
			dateTimerAngeChange(e) {
				// e = ["2021-07-08 00:01:10","2021-08-08 23:59:59"]  
				console.log('change事件:', e);
			
				// 将日期时间字符串转换为时间戳（秒）
				const startTime = new Date(e[0]).getTime() / 1000;
				const endTime = new Date(e[1]).getTime() / 1000;
			
				console.log('startTime:', startTime);
				console.log('endTime:', endTime);
			},
			/**
			 * 更新日期时间范围的结束时间为当前时间。
			 * 该方法将 `datetimerange` 数组的第二个元素设置为当前时间，
			 * 时间格式为 "YYYY-MM-DD HH:MM:SS"。
			 */
			updateEndTimeToCurrent() {
				// 获取当前时间的 Date 对象
				const now = new Date();
				// 格式化时间为 "YYYY-MM-DD HH:MM:SS" 格式
				const formattedNow =
					`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
				// 更新 datetimerange 数组的第二个元素为当前时间
				
				// 假设这里是当天的0点
				const startOfDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 00:00:00`;
				
				// 使用新数组来更新datetimerange，以确保Vue能检测到变化
				//this.datetimerange = [this.datetimerange[0], formattedNow];
				this.datetimerange = [startOfDay, formattedNow];
			
				console.log('datetimerange', this.datetimerange)
			},
			getConfig() {// 获取 “一刻相册” 采集配置
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
					}).catch((err) => {
						console.log(err.code); // 打印错误码
						console.log(err.message); // 打印错误内容
					})
			},
			async getCloudAlbumFileList(albumFileList) {// 批量获取云端相册中文件列表《查询是否已关联云端 - 检查列表中的每个文件是否已经关联到云端，并更新相应的自定义信息<为已关联云端item添加自定义字段：item.custom_info.is_bind_cloud = true>》
				// 将 albumFileList 里每个项目的 fsid 放进 ids 数组中
				const fsid_ids = albumFileList.map(item => item.fsid);// 注意是相册中文件id
				const album_ids = albumFileList.map(item => item.album_id) // 注意是相册id
				const albumfilelistColl = this.photobaidu.album.collection // 获取相册文件列表集合
				
				// 先查询云端是否已存在
				let queryResult;// data中仅包含云端已存在的ids数组项的数据
				try {
					queryResult = await db.collection(albumfilelistColl)
						.where({
							//album_type: { $in: [0, 1] }, // 一刻相册、网剧相册
							fsid: {$in: fsid_ids}, // 包含ids数组中的相册文件id
							album_id: {$in: album_ids} // 包含ids数组中的相册id
						})
						.limit(fsid_ids.length)// 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
						.get()
						
				} catch (error) {
					uni.showToast({
						title: '异常错误',
						icon: 'none'
					})
					return
				}
				
				let { errMsg, data } = queryResult.result
				
				// 将 data 里每个 item 的 fsid 追加到 syncList 中
				data.forEach(item => {
				    // 检查 syncList 是否已包含该 fsid，如果不包含，则追加
				    if (!this.photobaidu.album.syncList.includes(item.fsid)) {
				        this.photobaidu.album.syncList.push(item.fsid);
				    }
				});
				console.log(data)
				
				// data 包含云端已存在的相册文件项目，用于更新本地列表中的对应项目状态，并同步更新 syncList
				this.photobaidu.album.data.list.forEach(item => {
				    // 检查云端数据中是否存在当前项目
				    const isItemInCloud = data.some(cloudItem => cloudItem.fsid === item.fsid);
				
				    // 如果存在于云端，更新 custom_info.is_bind_cloud
				    if (isItemInCloud) {
				        item.custom_info = item.custom_info || {};
				        item.custom_info.is_bind_cloud = true;// 已关联云端
				    }
				
				    // 检查封面图片 URL 的前缀
				    const cloudUrlPrefix = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com";
				    if (item && item.thumburl && item.thumburl[1]) {
				        const isCloudUrl = item.thumburl[1].startsWith(cloudUrlPrefix);
				        // 这里根据需要处理 isCloudUrl 的结果
						if (isCloudUrl) {
							item.custom_info.cover_upload_progress = 100; // 封面已上传至uniCloud云储存
							item.custom_info.cover_download_progress = 100; // 一刻相册的文件封面已下载到本地
						}
				    }
				});
			},
			resetParam() {// 重置页面数据
				this.photobaidu.album.syncList = []
				this.photobaidu.album.data.cursor = ""
				this.photobaidu.album.data.has_more = -1
				this.photobaidu.album.data.total_count = 0
				this.photobaidu.album.data.pic_count = 0
				this.photobaidu.album.data.video_count = 0
				this.photobaidu.album.data.list = []
				
				this.photobaidu.task.page.current = 0;
				this.photobaidu.task.page.total = 0;
				this.photobaidu.task.state.run = false;
				this.photobaidu.task.state.collect = 'waiting';
				this.photobaidu.task.state.transcode = 'waiting';
				this.photobaidu.task.state.sync = 'waiting';
				
				this.pagination.count = 0
				this.pagination.current = 1
			},
			async startCollectData() {// 清空全部相册文件（相册文件列表）并开始采集
				if (this.photobaidu.task.state.run == true) {
					uni.showToast({
						title: '采集中，不可操作'
					})
					return
				}
				this.resetParam()
				await this.loadData()
			},
			async autoSyncAllAlbumFiles() {// 自动同步所有相册文件
				// 确保任务未在运行中
				if (this.photobaidu.task.state.run) {
					uni.showToast({
						title: '任务已在进行中',
						icon: 'none'
					});
					return;
				}
				
				// 重置页面数据
				this.resetParam()
				
				// 设置任务为运行状态
				this.photobaidu.task.state.run = true;
			
				do {
					try {
						// 加载当前页数据
						await this.loadData();
			
						// 提取当前页数据进行同步
						// const currentPageData = this.photobaidu.album.data.list.slice(
						// 	(this.photobaidu.task.page.current - 1) * 100, 
						// 	this.photobaidu.task.page.current * 100
						// );
						const currentPageData = this.photobaidu.task.page.data.list
						
						// 同步当前页数据
						await this.syncToCloud(currentPageData);
						
					} catch (error) {
						console.error('Error during sync:', error);
						uni.showToast({
							title: '同步出错',
							icon: 'none'
						});
						this.photobaidu.task.state.run = false;
						return;
					}
				} while (this.photobaidu.album.data.has_more !== 0); // 继续循环直到没有更多数据
			
				// 更新任务状态为完成
				this.photobaidu.task.state.run = false
				
				
				// // 开始遍历任务总页数
				// this.photobaidu.task.page.total
				// // 然后执行n页数次
				// this.loadData()
				// // 当前页数据 = 取出this.photobaidu.album.data.list中对应页的数据，每页100条
				// await this.syncToCloud(当前页数据)
				
				/* 以上只是我目前推理的方案，不知道是否可行，你帮我看看我的需求是否有改进的地方，然后你帮我改进和实现 */
			},
			async loadData() {// 加载数据，调用一刻相册https://photo.baidu.com/youai/album/v1/listfile接口
				if (this.photobaidu.album.data.has_more == 0) {
					uni.showToast({
						title: '没有更多了'
					})
					return
				}
				
				// 采集页+1
				this.photobaidu.task.page.current += 1
				
				// 开始采集
				this.photobaidu.task.state.run = true
				
				const BASE_URL = "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com"
				const ROUTE = "/api/v1/photobaidu/"
				const FUN = "getAlbumListFile"
				
				
				// 配置项索引
				let configSelectIndex = this.photobaidu.config.selectValue
				let config = this.photobaidu.config.data[configSelectIndex]
				
				// 请求下页时的光标，为空获取第一页数据
				let cursor = this.photobaidu.album.data.cursor
				
				// 构造查询参数
				let querys = {
					clienttype: "70",// 客户端类型 70为Web
					bdstoken: config.bdstoken
				}
				
				// 相册id，用于采集当前相册的所有文件
				let album_id = this.photobaidu.album.album_id
				// 构造body<form-data>表单参数
				let formdatas = {
					cursor, // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
					album_id, // string
					need_amount: "1",// 默认 string
					limit: "100",// 每页100条（Web版默认）string
					passwd: ""// 默认 string
				}
				
				
				
				// 构造请求头
				let headers = {
					"Cookie": config.Cookie,
					"Host": config.Host,
					"Origin": config.Origin,
					"Referer": `${config.Referer}/${album_id}` // https://photo.baidu.com/photo/web/album=全部相册；不加相册id代表获取全部相册，加相册id代表获取指定id相册
				}
				
				this.loading = true
				await uni.request({
					url: `${BASE_URL}${ROUTE}${FUN}`,
					method: 'POST',// 云对象方法，要用POST
					data: {
						querys,
						formdatas,
						headers
					},
					success: (res) => {
						console.log("album/v1/listfile：", res)
						
						// 首先检查 res.data.data 是否存在且包含 list 属性
						if (!res.data.data || !res.data.data.list) {
							uni.showToast({
								title: '请求失败'
							})
						    return; // 如果不存在，直接返回
						}
						
						const { cursor, has_more, total_count, pic_count, video_count, list } = res.data.data;
						
						// 为list中的每个项目添加自定义字段
						const updatedList = list.map(item => ({
							...item,
							file_type: item.category == 1 ? 'video' : 'image',
							bytes: formatFileSize(item.size),
							duration_format: item.category == 1 ? convertDuration(item.extra_info.duration_ms) : '',
							custom_info: {
								cover_upload_progress: 0, // 封面（图片）文件上传进度，默认为0
								is_bind_cloud: false, // 是否已关联云端，默认为false
							}
						}));
						
						// 更新相册文件数据，将新处理的项目添加到现有列表中
						this.photobaidu.album.data = {
							cursor,
							has_more,
							total_count,
							pic_count,
							video_count,
							// 将更新后的 list 与原有 list 合并
							list: [...this.photobaidu.album.data.list, ...updatedList],
						};
						
						// 更新分页信息
						this.pagination.count = total_count
						
						// 计算总页数，每页100条。不足100条的部分也算作一整页。（比如201，为3页）
						this.photobaidu.task.page.total = Math.ceil(total_count / 100); // 每页100条
						// 记录需要同步云端的采集当前页数据
						this.photobaidu.task.page.data.list = updatedList;
						
						// 获取云端相册中文件列表，并更新相应的自定义信息
						this.getCloudAlbumFileList(updatedList)
						
						this.loading = false
						// 采集结束
						this.photobaidu.task.state.run = false
					},
					fail: (err) => {
						console.log(err)
						this.loading = false
						// 采集结束
						this.photobaidu.task.state.run = false
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
			async syncToCloud(albumFileList) {// 关联云端 [支持单个和批量添加]
			    // 同步状态 = 进行中
				this.photobaidu.task.state.sync = 'processing'
				
				// 确保传入的参数是数组，如果不是数组，则将其转换为数组
			    let albumFiles = Array.isArray(albumFileList) ? albumFileList : [albumFileList];
				// 注意是相册文件id [fsid]
			    const fsid_ids = albumFiles.map(item => item.fsid); // 从每个相册文件对象中提取fsid
				const album_ids = albumFiles.map(item => item.album_id) // 注意是相册id
				
				console.log("fsid_ids", fsid_ids)
				console.log("album_ids", album_ids)

			    const albumfilelistColl = this.photobaidu.album.collection; // 获取相册列表集合
			
			    // 先查询云端是否已存在
			    let queryResult;
			    try {
			        queryResult = await db.collection(albumfilelistColl)
			            .where({
			                //album_type: { $in: [0, 1] }, // 一刻相册、网剧相册
			                fsid: {$in: fsid_ids}, // 包含ids数组中的相册文件id
							album_id: {$in: album_ids}, // 包含ids数组中的相册id
			            })
						.limit(fsid_ids.length)// 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
			            .get();
			    } catch (error) {
			        uni.showToast({
			            title: '异常错误',
			            icon: 'none'
			        });
			        return;
			    }
			
			    let { errMsg, data } = queryResult.result;
				console.log('云端中已存在待上传的记录data')
			    console.log('data', data);// data仅返回云端中ids中已存在的记录
				
				// 将data中每个item.album_id从ids或albumFiles中排除掉，这样就可以确定批量关联时，云端中没有的记录。
				
				// 排除已经存在于云端的相册文件 [ 只保留data中没有的项 ]
				albumFiles = albumFiles.filter(album => 
					!data.some(existingAlbum => existingAlbum.fsid === album.fsid)
				);
				
				console.log("albumFiles", albumFiles)

				// 如果没有需要同步的相册，则提前退出
				if (albumFiles.length === 0) {
					uni.showToast({
						title: '没有需要同步的相册',
						icon: 'none'
					});
					// 同步状态 = 已完成
					this.photobaidu.task.state.sync = 'completed'
					return;
				}
				
				
				// 批量上传相册文件封面到uniCloud云储存中
				await handleUploadFiles(albumFiles, (index, progress) => {
				    console.log(`Album ${index} is ${progress}% uploaded.`);
					
					// 获取当前正在上传的项目（progressItem）
					const progressItem = albumFiles[index];
					
					// 查找 list 中与 progressItem 相匹配的项目，并更新其上传进度
					const listIndex = this.photobaidu.album.data.list.findIndex(item => item.album_id === progressItem.album_id);
					if (listIndex !== -1) {
						this.photobaidu.album.data.list[listIndex].custom_info.cover_upload_progress = progress;
					}
					
				})
				.then(updatedList => {
				    console.log('All files uploaded');
					console.log('updatedList', updatedList)
				    // 处理上传后的操作，例如更新列表
					
					albumFiles = updatedList
					
					// 更新List
					updatedList.forEach(updatedItem => {
					    // 查找 this.photobaidu.album.data.list 中具有相同 album_id 的索引
					    const index = this.photobaidu.album.data.list.findIndex(item => item.album_id === updatedItem.album_id);
					
					    // 如果找到匹配的项目，则替换
					    if (index !== -1) {
					        this.photobaidu.album.data.list.splice(index, 1, updatedItem);
					    }
					});
					
				})
				.catch(error => {
				    console.error('Error during file upload:', error);
				});
				
				// 当天0点的时间戳
				//let startTimestamp = new Date().setHours(0, 0, 0, 0) / 1000;
				
				// 当前时间的时间戳
				//let endTimestamp = Date.now() / 1000;
				
				// 获取当前日期
				const now = new Date();
				
				// 获取当天0点的日期对象
				const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				
				// 获取前天0点的日期对象
				const startOfPreviousDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
				
				// 将当天0点的日期对象转换为Unix时间戳（秒）
				//const startTimestamp = Math.floor(startOfDay.getTime() / 1000);
				
				// 将前天0点的日期对象转换为Unix时间戳（秒）
				const startTimestamp = Math.floor(startOfPreviousDay.getTime() / 1000);
				
				// 将当前时间转换为Unix时间戳（秒）
				const endTimestamp = Math.floor(now.getTime() / 1000);
				
			    // 定义数据库 schema 中存在的字段
			    const validFields = [
					"album_type", "album_id", "category", "file_type", "ctime",
					"desc", "dlink", "extra_info", "fsid", "md5", "nickname",
					"path", "photo", "server_md5", "size", "bytes", "duration_format",
					"thumburl", "tid", "uk", "title"
			    ];
			
			    // 准备要添加的对象数组
			    let itemsToAdd = albumFiles.map(item => {
			        let newItem = {};
			        // 筛选出有效的字段
			        validFields.forEach(field => {
			            if (item.hasOwnProperty(field)) {
			                newItem[field] = item[field];
			            }
			        });
					
					// TODO 临时方案（后期新版中，会增加：选择时间范围）来自定义控制
					// 为 itemsToAdd 中 item.ctime 赋值随机时间戳 | 随机取（前天0点至今天现在的时间）范围内的秒时间戳
					//newItem.ctime = Math.floor(Math.random() * (endTimestamp - startTimestamp)) + startTimestamp;
					
					// 新版本生成随机范围内时间
					newItem.ctime = this.assignNewItemCTime()
					
					// 新版本补充总时间毫秒
					newItem.duration_ms_long = newItem.category == 1 ? Math.floor(Number(newItem.extra_info.duration_ms)) : null
			        return newItem;
			    });
				
				
				
				
			
			    // 向数据库批量添加记录
			    let addResult;
			    try {
			        addResult = await db.collection(albumfilelistColl).add(itemsToAdd);
			        console.log(addResult.result);
					
					// 更新 this.photobaidu.album.data.list 中的 custom_info.is_bind_cloud 标志
					this.photobaidu.album.data.list.forEach(item => {
					    // 检查 item 是否存在于 albumFiles 中
					    const isSynced = albumFiles.some(album => album.album_id === item.album_id);
					
					    // 如果存在，则设置 custom_info.is_bind_cloud 为 true
					    if (isSynced) {
					        item.custom_info = item.custom_info || {}; // 确保 custom_info 存在
					        item.custom_info.is_bind_cloud = true; // 关联云端
					    }
					});
					
					// 此时 this.photobaidu.album.data.list 中的相关条目已被更新
					
			        // 记录已同步的相册 id
			        this.photobaidu.album.syncList = [...this.photobaidu.album.syncList, ...fsid_ids];
					
					// 同步状态 = 已完成
					this.photobaidu.task.state.sync = 'completed'
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
			// 根据 datetimerange 更新 newItem.ctime
			assignNewItemCTime() {
			    const startTime = new Date(this.datetimerange[0]).getTime() / 1000;
			    const endTime = new Date(this.datetimerange[1]).getTime() / 1000;
				// 计算随机时间戳并返回
			   return Math.floor(Math.random() * (endTime - startTime)) + startTime;
			},
			async syncSelectedAlbumsToCloud() {// 将所选相册文件同步到云端
				// 根据selectedIndexs数组获取选中的相册文件对象
			    const selectedAlbumFiles = this.selectedIndexs.map(index => 
			        this.photobaidu.album.data.list[index]
			    );
				
				await this.syncToCloud(selectedAlbumFiles)
				
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
			toDuration(durationMs) {
				return convertDuration(durationMs)
			},
			toFileSize(bytes) {
				return formatFileSize(bytes)
			},
			taskStateText(state) {
				switch (state) {
					case 'waiting':
						return '等待中';
					case 'processing':
						return '进行中';
					case 'completed':
						return '已完成';
					default:
						return '未知';
				}
			},
			resetData() {
			    this.photobaidu.album.syncList = [];
			    this.photobaidu.album.data.cursor = "";
			    this.photobaidu.album.data.has_more = -1;
			    this.photobaidu.album.data.total_count = 0;
			    this.photobaidu.album.data.list = [];
			    this.pagination.count = 0;
			    this.pagination.current = 1;
			    this.photobaidu.task.state.run = false;
				this.photobaidu.task.state.collect = 'waiting';
				this.photobaidu.task.state.transcode = 'waiting';
				this.photobaidu.task.state.sync = 'waiting';
			    this.photobaidu.task.page.current = 0;
			    // 不重置总页数，以便在之后的逻辑中使用
			},
			// startCollect()
			async ceshi() {
				// 先请求一次，获取基本数据，需要将总页数拿到之后才能走下面的遍历采集任务
				//await this.fetchFileList();
				// 将其他数据重置后，准备遍历采集页次数
				//this.resetData(); // 重置相关数据
				
				
				//this.photobaidu.task.page.total = 0; 不重置，需要遍历总页数
				
				// page.total.遍历次数 》await this.processTasks
				
				/* 
				1. 请求文件列表函数 - 从 "https://photo.baidu.com/youai/album/v1/listfile" 获取文件列表。
				
				2. 查询是否已关联云端函数 - 检查列表中的每个文件是否已经关联到云端。
				
				3. 请求视频转码函数 - 为尚未关联云端的视频文件请求转码。
				
				4. 同步到云端函数 - 将过滤后的文件列表同步到云端。 
				 */
				//await this.processTasks()
				
				
				this.fetchAll()// 测试成功
			},
			async fetchAll() {
				this.resetData(); // 重置相关数据
				
				// 开始采集
				this.photobaidu.task.state.run = true
				
				let hasMore = true;
				while (hasMore) {
					try {
						// 全部任务状态 = 进行中
						this.photobaidu.task.state.collect = 'processing'
						this.photobaidu.task.state.transcode = 'processing'
						this.photobaidu.task.state.sync = 'processing'
						this.loading = true
						
						// 1. 请求文件列表函数 - 从 "https://photo.baidu.com/youai/album/v1/listfile" 获取文件列表。
						let response = await this.fetchFileList();
						
						if (response && response.list) {
							// 处理响应中的数据...
							
							
							// 当前页数据
							let currentPageData = response.list;
							
							// 2. 查询是否已关联云端函数 - 检查列表中的每个文件是否已经关联到云端。
							await this.getCloudAlbumFileList(currentPageData);
							
							// TODO 2024-0801起，不能再用请求转码，因为这是高频的，除非每个请求间隔5分钟，否则容易封号
							// 3. 请求视频转码函数 - 为尚未关联云端的视频文件请求转码。
							//await this.requestVideoTranscoding(5000);
							//await setTimeout(async () => {}, 300000);//间隔5分钟 // 每个请求间隔3000毫秒，3秒是为了更加安全
							// 二次请求
							//await this.requestVideoTranscoding(15000);
							
							// TODO 需增加跳过同步云端
							// 4. 同步到云端函数 - 将过滤后的文件列表同步到云端。 
							await this.syncToCloud(currentPageData)
							
							// 更新状态或数据
							hasMore = this.photobaidu.album.data.has_more == 0 ? false : true;
							
							let task_page_current = this.photobaidu.task.page.current
							console.log(`Task ${task_page_current} page completed`) // 任务完成
							
						} else {// 请求失败 [相册文件列表]
							hasMore = false; // 停止循环
							this.loading = false
							// 采集结束
							this.photobaidu.task.state.run = false
						}
						
					} catch (error) {// 4个步骤任务的某一个异常出错
						hasMore = false; // 停止循环
						this.loading = false
						// 采集结束
						this.photobaidu.task.state.run = false
					    console.error('Error during processing:', error);
					}
				}
				
				// TODO 需增加跳过更新当前id相册详情信息
				// 更新当前id相册详情信息（pic_count、video_count、total_count）
				await this.updateAlbumInfo()
				
				this.loading = false
				console.log('All tasks completed');
			},
			// 更新当前id相册详情信息
			async updateAlbumInfo() {
				const albumID = this.photobaidu.album.album_id
				const { pic_count, video_count, total_count } = this.photobaidu.album.data
				// 第一条数据
				const firstData = this.photobaidu.album.data.list[0]
				let albumResponse = await albumCollection.where({
					album_id: albumID
				}).update({
					pic_count,
					video_count,
					total_count,
					cover_info: {
						uk: firstData.uk,
						fsid: firstData.fsid,
						//['thumburl.' + 0]: firstData.thumburl[0] // 这样写为什么会报错呢？Uncaught (in promise) TypeError: Cannot read properties of undefined (reading '0')
						'thumburl.0': firstData.thumburl[0] // 将数字索引转换为字符串
					}
				})
				console.log("更新当前id相册详情：", albumResponse)
				
				const { result: { updated } } = albumResponse
				// updated	Number	更新成功条数，数据更新前后没变化时会返回0
				
				// 输出更新成功的条数
				console.log(`本次操作更新了 ${updated} 条记录。`);
				
				// 如果需要根据 updated 的值提供不同的反馈，可以添加条件判断
				if (updated === 0) {
				  console.log('没有记录被更新，数据可能已经是最新的。');
				} else if (updated > 0) {
				  console.log(`成功更新了 ${updated} 条记录。`);
				}
				
			},
			
			
		
			async processTasks() {// 开始自动采集
			    try {
					// 1. 请求文件列表函数 - 从 "https://photo.baidu.com/youai/album/v1/listfile" 获取文件列表。
			        const response = await this.fetchFileList();
					
			        // 2. 查询是否已关联云端函数 - 检查列表中的每个文件是否已经关联到云端。
			        await this.getCloudAlbumFileList(response.list);
			        
					// 3. 请求视频转码函数 - 为尚未关联云端的视频文件请求转码。
			        await this.requestVideoTranscoding();
					
					// 4. 同步到云端函数 - 将过滤后的文件列表同步到云端。 
			        await this.syncToCloud(response.list)
					
					
					console.log('Task completed') // 任务完成
			    } catch (error) {
			        console.error('Error during processing:', error);
			    }
			},
			
			
			/**
			 * 请求文件列表。
			 * 从 "https://photo.baidu.com/youai/album/v1/listfile" 获取文件列表。
			 * 
			 * @returns {Promise<Object>} 包含文件列表的 Promise 对象。
			 */
			async fetchFileList() {
				if (this.photobaidu.album.data.has_more == 0) {
					uni.showToast({
						title: '没有更多了'
					})
					return
				}
				
				// 采集页+1
				this.photobaidu.task.page.current += 1
				// <uni-table> 表格翻页 + 1
				this.pagination.current +=1
				
				const BASE_URL = "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com"
				const ROUTE = "/api/v1/photobaidu/"
				const FUN = "getAlbumListFile"
				
				// 配置项索引
				let configSelectIndex = this.photobaidu.config.selectValue
				let config = this.photobaidu.config.data[configSelectIndex]
				
				// 请求下页时的光标，为空获取第一页数据
				let cursor = this.photobaidu.album.data.cursor
				
				// 构造查询参数
				let querys = {
					clienttype: "70",// 客户端类型 70为Web
					bdstoken: config.bdstoken
				}
				
				// 相册id，用于采集当前相册的所有文件
				let album_id = this.photobaidu.album.album_id
				// 构造body<form-data>表单参数
				let formdatas = {
					cursor, // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
					album_id, // string
					need_amount: "1",// 默认 string
					limit: "100",// 每页100条（Web版默认）string
					passwd: ""// 默认 string
				}
				
				// 构造请求头
				let headers = {
					"Cookie": config.Cookie,
					"Host": config.Host,
					"Origin": config.Origin,
					"Referer": `${config.Referer}/${album_id}` // https://photo.baidu.com/photo/web/album=全部相册；不加相册id代表获取全部相册，加相册id代表获取指定id相册
				}
				
				return new Promise((resolve, reject) => {
					http({
						url: `${BASE_URL}${ROUTE}${FUN}`,
						method: 'POST',// 云对象方法，要用POST
						data: {
							querys,
							formdatas,
							headers
						}
					}).then(res => {
						//console.log('res', res)
						//console.log('File list:', res.data.lit);
						
						// 首先检查 res.data.data 是否存在且包含 list 属性
						if (!res.data.data || !res.data.data.list) {
							uni.showToast({
								title: '请求失败'
							})
						    reject(new Error('Request Error'));; // 如果不存在，直接返回
						}
						
						const { cursor, has_more, total_count, pic_count, video_count,  list } = res.data.data;
						
						// 为list中的每个项目添加自定义字段
						const updatedList = list.map(item => ({
							...item,
							file_type: item.category == 1 ? 'video' : 'image',
							bytes: formatFileSize(item.size),
							duration_format: item.category == 1 ? convertDuration(item.extra_info.duration_ms) : '',
							duration_ms_long: item.category == 1 ? Number(item.extra_info.duration_ms) : 0, // 2024-0606新增字段，用于fetchMethod = "randomSample"接口查询大于等于5分钟以上的视频
							custom_info: {
								cover_upload_progress: 0, // 封面（图片）文件上传进度，默认为0
								is_bind_cloud: false, // 是否已关联云端，默认为false
							}
						}));
						
						// 更新相册文件数据，将新处理的项目添加到现有列表中
						this.photobaidu.album.data = {
							cursor,
							has_more,
							total_count,
							pic_count,
							video_count,
							// 将更新后的 list 与原有 list 合并
							list: [...this.photobaidu.album.data.list, ...updatedList],
						};
						
						// 更新分页信息
						this.pagination.count = total_count
						
						// 计算总页数，每页100条。不足100条的部分也算作一整页。（比如201，为3页）
						this.photobaidu.task.page.total = Math.ceil(total_count / 100); // 每页100条
						// 记录需要同步云端的采集当前页数据
						this.photobaidu.task.page.data.list = updatedList;

						// 采集状态 = 已完成
						this.photobaidu.task.state.collect = 'completed'
						
						resolve({
							has_more,
							list: updatedList
						})
						
					}).catch(error => {
						console.error('Error:', error);
						this.loading = false
						// 采集结束
						this.photobaidu.task.state.run = false
						reject(err)
					});
				})
			},
			/**
			 * 请求视频转码。
			 * 对未关联云端的视频文件进行批量转码请求。
			 * 每个请求间隔200毫秒发送。
			 * 第一个请求立即发送，第二个请求在200毫秒后发送，第三个请求在400毫秒后发送，依此类推。
			 * 
			 * @param {Array} fileList 文件列表。
			 * @returns {Promise<Array>} 转码请求结果的 Promise 对象。
			 */
			async requestVideoTranscoding(time = 3000) {
				// 转码状态 = 进行中
				this.photobaidu.task.state.transcode = 'processing'
				
				const fileList = this.photobaidu.album.data.list
				
				// 过滤掉已经关联云端的文件 [要转码的文件] category：1=视频、3=图片
				const filesToTranscode = fileList.filter(file => !file.custom_info.is_bind_cloud && file.category === 1);
				
				// 创建一个处理单个转码请求的函数
				const processTranscodingRequest = async (file, index) => {
					return new Promise((resolve, reject) => {
						setTimeout(async () => {
							try {
								const response = await this.requestTranscoding(file);
								console.log(`File ${index} id ${file.fsid} transcoding completed`);
								resolve(response); // 转码成功
							} catch (error) {
								console.error(`Error in transcoding file ${file.fsid}:`, error);
								reject(error); // 转码失败
							}
						}, time * index); // 每个请求间隔3000毫秒，3秒是为了更加安全
					});
				};
				
				// 批量请求转码
				try {
					const transcodingPromises = filesToTranscode.map((file, index) => processTranscodingRequest(file, index));
					const transcodingResults = await Promise.all(transcodingPromises);
					console.log('Transcoding results:', transcodingResults);// 全部转码完成
					// 转码状态 = 已完成
					this.photobaidu.task.state.transcode = 'completed'
					
				} catch (error) {
					console.error('Error during video transcoding:', error);
				}
				
				
				// 从文件列表中过滤掉"item.custom_info.is_bind_cloud = true;// 已关联云端的文件"
				// 然后开始批量转码
				
				
				// 这里需要实现对未关联云端视频文件的转码请求逻辑
				// 假设我们有一个函数 requestTranscoding() 来请求视频转码
				// 以下为示例实现
				// return Promise.all(fileList.map(file => requestTranscoding(file)));
			},
			/**
			 * 请求视频文件转码。
			 * 
			 * @param {Object} file 文件对象。
			 * @returns {Promise<Object>} 转码请求的 Promise 对象。
			 */
			async requestTranscoding(file) {
				const BASE_URL = "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com"
				const ROUTE = "/api/v1/photobaidu/"
				const FUN = "streaming"
				
				// 配置项索引
				let configSelectIndex = this.photobaidu.config.selectValue
				let config = this.photobaidu.config.data[configSelectIndex]
				
				// 相册id
				let album_id = this.photobaidu.album.album_id || file.album_id
				
				// 构造查询参数
				let querys = {
					fsid: file.fsid.toString(),// 必须string类型
					album_id: file.album_id,// 必须string类型
					uk: file.uk.toString(),// 必须string类型
					tid: file.uk// 必须string类型
				}
				
				// 构造请求头
				let headers = {
					"Cookie": config.Cookie,
					"Host": config.Host,
					"Origin": config.Origin,
					"Referer": `${config.Referer}/${album_id}` // https://photo.baidu.com/photo/web/album=全部相册；不加相册id代表获取全部相册，加相册id代表获取指定id相册
				}
				
			    return new Promise((resolve, reject) => {
					http({
						url: `${BASE_URL}${ROUTE}${FUN}`,
						method: 'POST',// 云对象方法，要用POST
						data: {
							querys,
							headers
						}
					})
					.then((res) => {
						if (res.statusCode === 200) {
							console.log("请求转码：", res.data)
						    resolve(file);
						} else {
						    reject(new Error(`Failed to request transcoding for file ${file.fsid}`));
						}
					})
					.catch((error) => {
						reject(err)
					})
			    });
			}

		}
	}
</script>

<style>

</style>
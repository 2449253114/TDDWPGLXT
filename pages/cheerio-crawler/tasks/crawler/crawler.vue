<template>
	<view class="uni-container">
		<view class="header">
			<view class="back">
				<navigator open-type="navigateBack" style="margin-left: 15px;display: flex;align-items: center">
					<uni-icons type="back" size="24"></uni-icons>
					<text>返回</text>
				</navigator>
			</view>
			<view class="right">
				<button class="uni-button" style="width: 100px;margin-right: 10px;" @click="submit(0)">存为草稿</button>
				<button type="primary" class="uni-button" style="width: 100px;" @click="submit(1)">发布</button>
				
				<button type="default" 
				class="uni-button" 
				style="width: 100px;margin-left: 20rpx;" 
				@click="startTasks()">开始采集</button>
			</view>
		</view>
		<uni-forms ref="form" :model="formData" validateTrigger="bind" label-width="100px">
			<view class="edit-box">
				<uni-forms-item name="creator_user" label="创建者信息" required>
					<uni-easyinput v-model="formData.creator_user.nickname" trim="both" placeholder="创建者的昵称" />
				</uni-forms-item>
				<view class="title">
					<textarea class="uni-input" v-model="formData.title" auto-height placeholder="Title" />
				</view>
				<view style="margin: 10px 0;">
					<!-- 摘要 -->
					<textarea class="excerpt" v-model="formData.excerpt" auto-height placeholder="有什么新鲜事想告诉大家？"
						placeholder-style="color: #999999" />
				</view>
				<view class="your_story">
					<view class="your_story_items" v-for="(item,index) in formData.your_story" :key="index">
						<!-- thumburl [0] 一刻相册缩略图、[1] 原图大图-已上传uniCloud -->
						<image :src="item.thumburl[1]" style="width: 100%" mode="widthFix" />
						<!-- category: 1=视频 、3=图片 -->
						<view class="video_extra_info" v-if="item.category == 1">
							<text class="duration_ms">{{ item.duration_format }}</text>
							<view class="gap-5" />
							<text class="file_size">{{ item.bytes }}</text>
						</view>
					</view>
				</view>
			</view>
		</uni-forms>



		<view class="composable-proview">
			<view class="composable-proview-content">
				<view class="reading-title">
					<text>{{ formData.title ? formData.title : 'Title' }}</text>
					<!-- <text>肉欲同学会</text> -->
				</view>
				<view class="reading-extra">
					<text
						class="reading-extra-author">{{ formData.creator_user.nickname ? formData.creator_user.nickname : 'Your name' }}</text>
					<!-- <text class="reading-extra-author">马栏山汉化组</text> -->
					<uni-dateformat class="reading-extra-ctime" :threshold="[0, 0]" :date="new Date().getTime()"
						format="yyyy/MM/dd"></uni-dateformat>
				</view>
				<view class="reading-excerpt" v-if="formData.excerpt">
					<uni-card :is-shadow="false">
						<text class="uni-body">{{ formData.excerpt }}</text>
					</uni-card>
				</view>
				<view class="reading-page-count">
					<!-- <text>共22页</text> -->
					<text v-if="formData.your_story.length != 0">{{ `共${formData.your_story.length}页` }}</text>
				</view>
				<view class="reading-content-figure" v-for="(item,index) in formData.your_story" :key="index">
					<!-- thumburl [0] 一刻相册缩略图、[1] 原图大图-已上传uniCloud -->
					<image :src="item.thumburl[1]" class="reading-content-figure-image" style="width: 100%"
						mode="widthFix" />
					<text class="editable-text">{{ item.description ? item.description : `第${index + 1}页`}} </text>
				</view>
			</view>
		</view>

		<view class="footer">
			<view class="uni-group">
				<view class="uni-title">
					<!-- 这里的页代表链接，一页代表一个链接 -->
					<text>采集任务状态：</text>
					<!-- 当前页 -->
					<text>第 {{ task.page.current }} / </text>
					<!-- 总页数 -->
					<text class="color-red">{{ task.page.total }}</text>
					<text>页</text>
					<!-- 显示过滤了多少个项目 -->
					<text class="color-red m-l-10">（过滤了 {{ task.filter.count }} 个项目）</text>
				</view>
				<view class="uni-sub-title">
					<view class="wrap">
						<text>采集地址：</text>
						<uni-easyinput :value="`${ task.page.current !== 0 ? task.urlsList[task.page.current - 1].url : '等待中'}`" :disabled="true" placeholder="等待中"></uni-easyinput>
					</view>
				</view>
				<view class="uni-sub-title m-l-10" v-if="task.urlsList.length !== 0">
					<text>采集：{{ taskStateText(task.urlsList[currentPage(task.page.current - 1)].custom_info.state.collect) }}</text>
					<text> | 同步：{{ taskStateText(task.urlsList[currentPage(task.page.current - 1)].custom_info.state.sync) }}</text>
				</view>
			</view>
		</view>

	</view>
</template>

<script>
	// 必须使用1.0.0-rc.5版本，高于这个版本hx不支持
	//import cheerio from 'cheerio';已在./common/crawler.js里引入
	
	import { collectData } from '@/pages/cheerio-crawler/tasks/common/crawler.js'
	
	import {
		http
	} from '@/common/myutils/http/index.js'
	
	import {
		handleUploadFiles
	} from '@/pages/cloud-storage/reading/common/handle-file/upload-file.js'
	
	import {
		processImageDetails
	} from '@/pages/cloud-storage/reading/common/handle-file/choose-file.js'
	
	import {
		formatFileSize
	} from '@/common/myutils/files/comm.js'
	
	import {
		toUrlsList,
		addCustomInfoToUrls,
		convertConfig,
		convertToUploadParam,
		delay,
		clearTimeoutAndSetTimeout,
		urlDecode,
		filterExistingItems
	} from '@/pages/cheerio-crawler/tasks/common/common.js'
	
	
	import {
		validator
	} from '@/js_sdk/validator/yuta-cms-reading.js';

	const db = uniCloud.database();
	const dbCmd = db.command;

	// “采集规则任务设计”数据库表名
	const dbCrawlerTasksColl = 'cheerio-crawler-tasks';
	// “记录已采集过的URL”数据库表名
	const dbCrawlerUrlsColl = 'cheerio-crawler-urls';
	
	// “阅读文”数据库表名
	const dbCmsReadingColl = 'gay-comics'
	// “媒体库”数据库表名
	const dbMediaKuColl = 'yuta-media-library';

	function getValidator(fields) {
		let result = {}
		for (let key in validator) {
			if (fields.includes(key)) {
				result[key] = validator[key]
			}
		}
		return result
	}

	export default {
		data() {
			let formData = {
				"title": "",
				"excerpt": "",
				"your_story": [],
				"thumburl": [],
				"creator_user": {
					"user_id": "0",
					"nickname": ""
				}
			}
			return {
				formData,
				formOptions: {},
				rules: {
					...getValidator(Object.keys(formData))
				},
				task: {
					config: { // 采集规则配置
						_id: "",// 由上个页面传递过来
						urls: "", // 要采集的链接，一行一个URL，采集开始前会取出所有URL链接到urlsList数组中
						source_url: 'address a[rel="author"]',
						title: 'main header.tl_article_header h1',
						creator_user: {
							nickname: 'address a[rel="author"]',
						},
						your_story: {
							selector: 'article figure',
							imgSelector: 'img',
							srcPrefix: 'https://telegra.ph', // src前缀网址
							description: 'figcaption',
						},
					},
					urlsList: [{
						url: '', // 要采集的URL,
						custom_info: {
							state: {
								// 同时为每个任务设置三种状态：等待中（waiting）、进行中（processing）、已完成（completed）。
								collect: 'waiting', // 采集任务状态
								sync: 'waiting' // 同步任务状态
							},
							formData: {}, // 当前采集页的数据
							uploadPictureParam: [],// 记录上传图片到云存储的参数
						}
					}],
					filter: {
						count: 0 // 记录从urlsList中过滤已存在于云端的项目（URL）数量
					},
					state: {
						run: false,// 所有任务进行中？
					},
					page: {
						current: 0, // 当前页，即当前第几个链接
						total: 0, // 总页，即总链接数量
					},
				},
				loading: false,
			}
		},
		onLoad: function(e) {
			if (e.id) {
				this.task.config._id = e.id
				this.getTaskConfig(e.id)
			}
		},
		methods: {
			currentPage(currentPage) {
				return currentPage >= 0 ? currentPage : 0
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
			/**
			 * 获取采集任务配置数据
			 * @param {Object} id
			 */
			async getTaskConfig(id) {
				uni.showLoading({
					mask: true
				})
				
				let queryResult
				try {
					queryResult = await db.collection(dbCrawlerTasksColl).doc(id).field(
						"task_title,urls,source_url_selector,title_selector,nickname_selector,your_story_selector,your_story_img_selector,your_story_src_prefix,your_story_description_selector"
						).get()
				} catch (err) {
					uni.hideLoading()
					uni.showModal({
						content: err.message || '请求服务失败',
						showCancel: false
					})
					return
				}
				let { errMsg, data } = queryResult.result
				if (data) {
					uni.hideLoading()
					const task_id = data[0]._id;
					let urls = toUrlsList(data[0].urls)
					
					// --- start 测试期间，先只保留一个记录
						//urls = urls.slice(0, 1); // 只保留第一个元素
						//console.log('urls', urls)
					// --- end
					
					this.task.config = convertConfig(data[0])
					this.task.page.total = urls.length;
					this.task.urlsList = addCustomInfoToUrls(urls)
					// 下面代码已迁移至“开始采集”方法中
					// 检查现有URL，有哪些已采集过的和未采集的
					await this.checkExistingUrls(task_id, urls)
				}
			},
			async checkExistingUrls(task_id, urls) {// 检查现有的URL链接在云端是否有记录，有记录则说明已采集过了，反之未采集
				uni.showLoading({
					mask: true
				})
				
				// 先查询云端是否已存在
				let queryResult;// data中仅包含云端已存在的urls数组项的数据
				try {
					queryResult = await db.collection(dbCrawlerUrlsColl)
						.where({
							task_id, // 采集任务_id
							url: {$in: urls} // 包含urls数组中的相册
						})
						.limit(urls.length)// 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
						.get()
				} catch (error) {
					uni.hideLoading()
					uni.showModal({
						content: error.message || '请求服务失败',
						showCancel: false
					})
					return
				} 
				uni.hideLoading()
				
				let { errMsg, data } = queryResult.result;
				console.log('云端中已存在的已采集过的URL记录data')
				console.log('data', data);// data仅返回云端中urls中已存在的记录
				
				// 过滤已存在于云端的项目
				const { filteredUrlsList, filteredCount } = filterExistingItems(this.task.urlsList, data);
				// 打印过滤了多少个项目的信息
				console.log(`过滤了 ${filteredCount} 个项目`);
				// 更新this.task.urlsList为过滤后的数组
				this.task.urlsList = filteredUrlsList;
				// 更新总数量为过滤后的数组长度
				this.task.page.total = filteredUrlsList.length;
				// 记录过滤云端已存在的项目（URL）数量
				this.task.filter.count = filteredCount;
				
				console.log('this.task', this.task)
				
			},
			resetData() {
			    this.task.state.run = false;
			    this.task.page.current = 0;
			},
			async startTasks() {// 开始自动采集任务
				const task_id = this.task.config._id
				const urls = toUrlsList(this.task.config.urls)
				// 检查现有URL，有哪些已采集过的和未采集的
				await this.checkExistingUrls(task_id, urls)
				// 开始采集
				this.task.state.run = true
				
				uni.showLoading({
					mask: true
				})
				
				let hasMore = true;
				let timeoutId;
				const delayTime = 1500; // 500耗秒延时，单位是毫秒
				while (hasMore) {
					try {
						this.loading = true
						
						// 1. 请求文件列表函数 - 从 "https://photo.baidu.com/youai/album/v1/listfile" 获取文件列表。
						let response = await this.fetchHtmlContent();
						// 2. 延时等待指定时间后再走第3步
						// 这里帮我实现，当定时器结束时需要取消之前的定时器id
						// 3. 假设是上传
						
						if (response) {
							// 处理响应中的数据...
							// 更新状态或数据
							hasMore = this.task.state.run
							
							// 当前页数据
							let currentPageData = response;
							
							// 4. 同步到云端函数 - 将过滤后的文件列表同步到云端。 
							await this.syncToCloud(currentPageData)
							
							console.log('currentPageData', currentPageData)
							
							let task_page_current = this.task.page.current
							console.log(`Task ${task_page_current} page completed`) // 任务完成
							
							let task_url = response.url
							console.log(`Task URL = ${task_url}`) // 任务链接
						} 
						
						// 2. 延时等待指定时间后再走第3步
						// 使用封装的延时函数
						await delay(delayTime);
						
					} catch (error) {// 4个步骤任务的某一个异常出错
						
						uni.hideLoading()
						hasMore = false; // 停止循环
						this.loading = false
						// 采集结束
						this.task.state.run = false
					    console.error('Error during processing:', error);
						
					} finally { // 无论是否发生异常，都会执行的代码块
						// 取消定时器并设置新的定时器
						timeoutId = clearTimeoutAndSetTimeout(timeoutId, delayTime, () => {
							// 这里可以添加定时器到期后的逻辑
						});
						console.log('timeoutId', timeoutId)
					}
				}
				uni.hideLoading()
				this.loading = false
				console.log('All tasks completed');
				console.log(this.task.urlsList)
			},
			async fetchHtmlContent() {// 获取Html内容
				if (this.task.page.total == 0) {
					uni.showToast({
						title: '没有更多了'
					})
					return
				}
				
				// 当前采集页
				this.task.page.current += 1
				// 当前URL，减1是因为索引从0开始
				const BASE_URL = this.task.urlsList[this.task.page.current - 1].url
				return new Promise((resolve, reject) => {
					http({
						url: `${BASE_URL}`,
						method: 'GET'
					}).then(async res => {
						//console.log(res)
						if (!res.data) {
							uni.showToast({
								title: '请求失败'
							})
						    reject(new Error('Request Error'));; // 如果不存在，直接返回
						}
						
						const html = res.data
						const { config } = this.task 
						// 采集Html数据
						let result = collectData(html, config);
							// 将采集地址也添加到来源地址数组中
							result.source_url.push(urlDecode(BASE_URL))
						this.formData = result
						// 当前页采集数据
						this.task.urlsList[this.task.page.current - 1].custom_info.formData = result
						// 记录当前页上传图片到云存储的参数
						let uploadPictureParam = convertToUploadParam(result);
							// 批量获取图片信息
							uploadPictureParam = await processImageDetails(uploadPictureParam, true);
							console.log('uploadPictureParam', uploadPictureParam)
						//reject('手动return')
							
						this.task.urlsList[this.task.page.current - 1].custom_info.uploadPictureParam = uploadPictureParam
						// 当前页采集状态 = 已完成
						this.task.urlsList[this.task.page.current - 1].custom_info.state.collect = 'completed'
						// 已是最后一页
						if (this.task.page.current == this.task.page.total) {
							// 任务结束
							this.task.state.run = false
						}
						const current_page_data = this.task.urlsList[this.task.page.current - 1]
						resolve({...current_page_data, url: BASE_URL})
						
					}).catch(error => {
						console.error('Error:', error);
						reject(err)
					});
				})
			},
			/**
			 * 将当前项目同步到云端
			 * @param {Object} item - 当前项目对象
			 */
			async syncToCloud(item) {
				console.log('syncToCloud - item', item)
				
				// 1. 批量上传漫画图片到uniCloud云储存中
				await handleUploadFiles(item.custom_info.uploadPictureParam, (index, progress) => {
				    console.log(`Album ${index+1} is ${progress}% uploaded.`);
				})
				.then(updatedList => {
				    console.log('All files uploaded');
					console.log('updatedList', updatedList)
				    // 处理上传后的操作，例如更新列表
					this.task.urlsList[this.task.page.current - 1].custom_info.uploadPictureParam = updatedList
					// 在你的场景中，你可能需要循环处理每个图集的上传结果
					for (let i = 0; i < updatedList.length; i++) {
						// 当前页采集数据
					    this.task.urlsList[this.task.page.current - 1].custom_info.formData.your_story[i].thumburl[1] = updatedList[i].url;
						if (i == 0) {
							// 设置漫画文封面
							this.task.urlsList[this.task.page.current - 1].custom_info.formData.thumburl[1] = updatedList[i].url;
						}
					}
					console.log('updatedURLSList', this.task.urlsList[this.task.page.current - 1])
				})
				.catch(error => {
				    console.error('Error during file upload:', error);
				});
				
				const currentItem = this.task.urlsList[this.task.page.current - 1]
				
				// 准备要添加的对象数组
				let mediaKuItemsToAdd = currentItem.custom_info.uploadPictureParam.map(item => {
					// 构造必要字段
					let newItem = {
						src: item.url,
						type: item.selectFileType,
						description: "",
						original_name: item.name,
						file_type: item.type.split('/')[1],
						size: item.size,
						bytes: "0MB",
						resolution: {
							height: item.height,
							width: item.width
						},
						creator_user: currentItem.creator_user
					};
					return newItem;
				});
				console.log('mediaKuItemsToAdd', mediaKuItemsToAdd)
				
				// 2. 向“媒体库”数据库中批量添加记录
				try {
					const addResult = await db.collection(dbMediaKuColl).add(mediaKuItemsToAdd);
					console.log('addToMediaKuResult', addResult.result);
				
				} catch (error) {
					// 错误处理
					console.error("Error adding to database:", error);
				}
				
				let reading_id; // 记录阅读文id
				// 3. 向“阅读文”数据库中添加记录《发布漫画/文章》
				try {
					const { formData } = this.task.urlsList[this.task.page.current - 1].custom_info
					const addResult = await db.collection(dbCmsReadingColl).add(formData);
					console.log('addToCmsReadingResult', addResult.result);
						  reading_id = addResult.result.id
				} catch (error) {
					// 错误处理
					console.error("Error adding to database:", error);
				}
				
				
				// 记录URL应该是最后一步 const dbCrawlerUrlsColl = 'cheerio-crawler-urls';
				// 4. 将当前项目（URL）上传至“记录已采集过的”数据库表中
				// 向数据库批量添加记录
				try {
					const crawlerUrlItemsToAdd = {
						reading_id,
						task_id: this.task.config._id,
						url: urlDecode(item.url)
					}
				    const addResult = await db.collection(dbCrawlerUrlsColl).add(crawlerUrlItemsToAdd);
				    console.log(addResult.result);
					
					// 同步状态 = 已完成
					this.task.urlsList[this.task.page.current - 1].custom_info.state.sync = 'completed'
					
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
		}
	}
</script>

<style lang="scss">
	@import '@/pages/cloud-storage/reading/common/style/article-detail.scss';
</style>
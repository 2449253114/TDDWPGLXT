<template>
	<view class="uni-container">
		<view class="header">
			<view class="back">
				<navigator open-type="navigateBack" style="margin-left: 15px;display: flex;align-items: center">
					<uni-icons type="back" size="24"></uni-icons>
					<text>返回</text>
				</navigator>
			</view>
		</view>
		<uni-forms ref="form" :model="formData" validateTrigger="bind" label-width="100px">
			<view class="edit-box">
				<uni-forms-item name="creator_user" label="创建者信息" required>
					<!-- <undefined v-model="formData.creator_user"></undefined> -->
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
					<!-- <view style="width: 500px;height: 690px;background-color: #333;">
						
					</view> -->
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
				<view class="syl-toolbar">
					<view class="syl-toolbar-tool" @click="local_file_choose">
						<uni-icons type="camera-filled" size="30" color="#222222"></uni-icons>
						<text class="syl-toolbar-tool-text">本地</text>
					</view>
					<view class="syl-toolbar-tool" @click="">
						<uni-icons type="cloud-upload-filled" size="30" color="#222222"></uni-icons>
						<text class="syl-toolbar-tool-text">云端</text>
					</view>
				</view>
				<view class="settings">
					<uni-forms-item v-if="false" name="thumburl" label="封面大图" required>
						<!-- thumburl [0] 缩略图、[1] 原图大图 -->
						<view class="settings-thumburl">
							<image v-if="formData.thumburl[1]" :src="formData.thumburl[1]" style="width: 100%;"
								mode="aspectFill" />
							<view v-if="!formData.thumburl[1]" class="settings-thumburl-mask"></view>
						</view>
					</uni-forms-item>

					<!-- 
					<uni-forms-item name="creator_user" label="创建者信息" required>
						<uni-easyinput v-model="formData.creator_user.nickname" trim="both" placeholder="创建者的昵称" />
					</uni-forms-item>
					 -->

					<uni-forms-item v-if="false" name="create_time" label="创建时间" required>
						<uni-datetime-picker return-type="timestamp"
							v-model="formData.create_time"></uni-datetime-picker>
					</uni-forms-item>
				</view>

				<view class="uni-button-group m" style="padding-bottom: 50px">
					<button class="uni-button" style="width: 100px;margin-right: 10px;" @click="submit(0)">存为草稿</button>
					<button type="primary" class="uni-button" style="width: 100px;" @click="submit(1)">发布</button>
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
					<!-- category: 1=视频 、3=图片 -->
					<view class="video_extra_info" v-if="item.category == 1">
						<text class="duration_ms">{{ item.duration_format }}</text>
						<view class="gap-5" />
						<text class="file_size">{{ item.bytes }}</text>
					</view>
					<text class="editable-text">{{ item.description ? item.description : `第${index + 1}页`}} </text>
				</view>
			</view>
		</view>

		<view class="footer">
			<view class="wrap">
				<view class="left"></view>
				<view class="right">
					<view class="uni-button-group">
						<button class="uni-button" style="width: 100px;margin-right: 10px;"
							@click="submit(0)">存为草稿</button>
						<button type="primary" class="uni-button" style="width: 100px;" @click="submit(1)">发布</button>
					</view>
				</view>
			</view>
		</view>

	</view>
</template>

<script>
	import {
		validator
	} from '@/js_sdk/validator/yuta-cms-reading.js';

	const db = uniCloud.database();
	const dbCmd = db.command;
	const dbCollectionName = 'gay-comics';


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

	import {
		//selectVideo, // 暂不提供选择本地视频，因为选择本地视频上传uniCloud，当分享“漫画、文章”时，走的是uniCloud的云储存OSS按量计费，成本太高。《选择视频只提供从一刻相册中选择视频，走的是百度云储存，不需要消耗自己的流量，随便白嫖。》
		selectImage
	} from '@/pages/cloud-storage/reading/common/handle-file/choose-file.js'

	import {
		handleUploadFiles
	} from '@/pages/cloud-storage/reading/common/handle-file/upload-file.js'

	import {
		formatFileSize
	} from '@/common/myutils/files/comm.js'

	export default {
		data() {
			let formData = {
				"title": "",
				"excerpt": "",
				"source_url": "",
				"your_story": [],
				"thumburl": [],
				"creator_user": {
					"user_id": 0,
					"nickname": ""
				}
			}
			return {
				formData,
				formOptions: {},
				rules: {
					...getValidator(Object.keys(formData))
				}
			}
		},
		onReady() {
			this.$refs.form.setRules(this.rules)
		},
		methods: {

			/**
			 * 验证表单并提交
			 */
			async submit() {
				// uni.showLoading({
				// 	mask: true
				// })
				// uni.hideLoading()
				console.log('submit')
				console.log('formData', this.formData)

				// 第一步，先设置漫画/文章的封面和现在的时间，在设置之前还需要确保this.formData.your_story[0].thumburl[1]是存在的
				// this.formData.thumburl = ["https://xxx.com", this.formData.your_story[0].thumburl[1]]
				// this.formData.create_time = new Date().getTime()
				// 第二步检查this.formData必填字段 
				// title、creator_user.nickname、your_story.length>=1、thumburl
				// 第三步先上传全部文件到云存储，然后更新tempFileList临时列表里的文件路径和其他信息
				// await handleUploadFiles(this.formData.your_story, (index, progress) => {
				//     console.log(`File ${index} is ${progress}% uploaded.`);
				//     // 这里更新您的进度条，例如：
				// 	//this.tempFileUploadProgress[index].uploadProgress = progress;
				// }).then(updatedList => {
				// 	console.log('updatedList', updatedList)
				//     //this.tempFileList = updatedList; // 更新 tempFileList

				// }).catch(error => {
				//     console.error('Error during file upload:', error);
				// });
				// 第四步，将文件全部关联至“媒体库”数据库表中




				// ai
				// 检查必填字段
				if (!this.formData.title) {
					uni.showToast({
						title: '请输入标题',
						icon: 'none'
					});
					return;
				}
				if (!this.formData.creator_user || !this.formData.creator_user.nickname) {
					uni.showToast({
						title: '请输入创建者昵称',
						icon: 'none'
					});
					return;
				}
				if (!this.formData.your_story || this.formData.your_story.length < 1) {
					uni.showToast({
						title: '请添加至少一个故事',
						icon: 'none'
					});
					return;
				}
				if (!this.formData.your_story[0].thumburl || this.formData.your_story[0].thumburl.length < 2) {
					uni.showToast({
						title: '请确保故事封面有效',
						icon: 'none'
					});
					return;
				}

				// 上传文件
				try {
					let updatedList = await handleUploadFiles(this.formData.your_story, (index, progress) => {
						console.log(`File ${index} is ${progress}% uploaded.`);
						// 更新上传进度
						// this.tempFileUploadProgress[index].uploadProgress = progress;
					});

					console.log('updatedList', updatedList);
					// 更新 tempFileList
					// this.tempFileList = updatedList;

					this.formData.your_story = updatedList

					// 设置《阅读》封面
					this.formData.thumburl = updatedList[0].thumburl;

				} catch (error) {
					console.error('Error during file upload:', error);
				}


				// 准备要添加的对象数组
				let itemsToAdd = this.formData.your_story.map(item => {
					// 构造必要字段
					let newItem = {
						src: item.url,
						type: item.selectFileType,
						description: item.description,
						original_name: item.name,
						file_type: item.type.split('/')[1],
						size: item.size,
						bytes: item.bytes,
						resolution: {
							height: item.height,
							width: item.width
						},
						creator_user: this.formData.creator_user
					};
					return newItem;
				});
				console.log('itemsToAdd', itemsToAdd)
				// 向“媒体库”数据库中批量添加记录
				try {
					const addResult = await db.collection(dbMediaKuColl).add(itemsToAdd);
					console.log('addToMediaKuResult', addResult.result);

				} catch (error) {
					// 错误处理
					console.error("Error adding to database:", error);
				}


				// 向“阅读文”数据库中添加记录《发布漫画/文章》
				try {
					const addResult = await db.collection(dbCmsReadingColl).add(this.formData);
					console.log('addToCmsReadingResult', addResult.result);

				} catch (error) {
					// 错误处理
					console.error("Error adding to database:", error);
				}


			},

			/**
			 * 提交表单
			 */
			submitForm(value) {
				// 使用 clientDB 提交数据
				return db.collection(dbCollectionName).add(value).then((res) => {
					uni.showToast({
						title: '新增成功'
					})
					this.getOpenerEventChannel().emit('refreshData')
					setTimeout(() => uni.navigateBack(), 500)
				}).catch((err) => {
					uni.showModal({
						content: err.message || '请求服务失败',
						showCancel: false
					})
				})
			},
			/**
			 * 从本地选择文件
			 */
			async local_file_choose() {
				// 调用 selectImage 函数并处理结果
				await selectImage().then(imageDetailsArray => {
					if (imageDetailsArray) {
						console.log('imageDetailsArray', imageDetailsArray);
						// 将imageDetailsArray每个item.path先暂时添加到this.formData.your_story[i].thumburl[1]（注意：thumburl[0]是没有的，所以需要提前把0随便补充点内容，比如"https://xxx.com"）

						// 我是要你将imageDetailsArray每个item.path先暂时添加到this.formData.your_story中，你直接push，不需要index，然后thumburl[0]不存在，thumburl[1]=item.path，帮我写的简单易懂，要很简洁


						// 遍历 imageDetailsArray 数组
						imageDetailsArray.forEach(item => {
							// 将每个 item 的 path 添加到 this.formData.your_story 中
							// 创建一个新对象，其中 thumburl 数组的第一个元素是占位符链接
							// 第二个元素是当前 item 的 path
							this.formData.your_story.push({
								category: 3,
								file_type: "image",
								description: "",
								fsid: "0",
								album_id: "0",
								uk: "0",
								tid: "0",
								bytes: formatFileSize(item.size),
								thumburl: ["https://xxx.com", item
								.path], // 第一个元素是占位符，第二个元素是 item 的路径
								...item,
							});
						});

						console.log('your_story', this.formData.your_story)




						//this.tempFileList.push(...imageDetailsArray); // 将所有图片详情添加到 tempFileList

						//console.log(this.tempFileList);

						// 按照imageDetailsArray长度，依次向tempFileUploadProgress添加{uploadProgress: 0}
						// imageDetailsArray.forEach((image) => {
						// 	this.tempFileUploadProgress.push({ uploadProgress: 0 });
						// });

					}
				}).catch(error => {
					console.error("Error in processing images:", error);
				});
			},

		}
	}
</script>

<style lang="scss">
	@import '@/pages/cloud-storage/reading/common/style/article-detail.scss';
</style>
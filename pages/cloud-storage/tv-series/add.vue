<template>
	<view class="uni-container">
		<uni-forms ref="form" :model="formData" validateTrigger="bind">
			<uni-forms-item name="album_id" label="相册ID">
				<uni-easyinput placeholder="关联的相册ID，用于获取文件" v-model="formData.album_id"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="show_name" label="剧名">
				<uni-easyinput placeholder="电视剧剧名" v-model="formData.show_name"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="episodes" label="剧集信息">
				<div class="flex flex-wrap">
					<div class="media-grid">
						<div v-for="(episode, index) in formData.episodes" :key="index" class="media-item">
							<div class="media-image-container" @click="onEpisodeClick(index)">
								<!-- <img class="media-image" :src="item.thumburl[1]" :alt="item.fsid"> -->
								<image class="media-image"
									:style="`width: ${episode.extra_info.width/3}px;height: ${episode.extra_info.height/3}px;`"
									:src="getCoverUrl(episode.cover_fsid)" mode="heightFix" />
							</div>
							<div class="media-info">
								<h6 class="media-name">{{ `${episode.episode_name}` }}</h6>
								<p class="media-created-at">
									{{ `封面文件ID：${episode.cover_fsid}` }}
								</p>
								<p class="media-created-at">
									{{ `视频文件ID：${episode.video_fsid}` }}
								</p>
							</div>
							<!-- 删除按钮 -->
							<button class="delete-episode-btn" @click.stop="deleteEpisode(index)">删除</button>
						</div>
					</div>
				</div>
				<button type="primary" class="uni-button" style="width: 100px;"
					@click="addEpisodeDialogToggle">添加</button>
			</uni-forms-item>
			<uni-forms-item name="description" label="描述">
				<uni-easyinput type="textarea" :maxlength="-1" placeholder="电视剧描述信息" v-model="formData.description" trim="both"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="status" label="发布状态">
				<uni-data-checkbox v-model="formData.status"
					:localdata="formOptions.status_localdata"></uni-data-checkbox>
			</uni-forms-item>
			<view class="uni-button-group">
				<button type="primary" class="uni-button" style="width: 100px;" @click="submit">提交</button>
				<navigator open-type="navigateBack" style="margin-left: 15px;">
					<button class="uni-button" style="width: 100px;">返回</button>
				</navigator>
			</view>
		</uni-forms>

		<div>
			<!-- 选择剧集的视频与封面 -->
			<uni-popup ref="episodeDialog" type="dialog">
				<view class="episode-dialog">
					<view v-if="availableCoverFiles.length === 0 && availableVideoFiles.length === 0" class="no-more">
						没有更多剧集了
					</view>
					<view v-else>
						<view class="file-section">
							<h3>视频文件</h3>
							<div class="file-container">
								<div v-for="video in availableVideoFiles" :key="video._id"
									@click="handleVideoClick(video)"
									:class="['file-item', {'selected': selectedVideoId === video._id}]">
									<image :src="video.thumburl[0]" mode="aspectFit" class="file-image"></image>
									<p class="file-path">{{ video.path }}</p>
								</div>
							</div>
						</view>
						<view v-if="selectedVideoId" class="file-section">
							<h3>封面文件</h3>
							<div class="file-container">
								<div v-for="cover in availableCoverFiles" :key="cover._id"
									@click="handleCoverClick(cover)"
									:class="['file-item', {'selected': selectedCoverId === cover._id}]">
									<image :src="cover.thumburl[0]" mode="aspectFit" class="file-image"></image>
									<p class="file-path">{{ cover.path }}</p>
								</div>
							</div>
						</view>
						<button type="primary" class="uni-button" style="width: 100px;"
							@click="handleFileConfirm">确认</button>
					</view>
				</view>
			</uni-popup>
		</div>

	</view>
</template>

<script>
	import {
		validator
	} from '@/js_sdk/validator/yike-tv-series.js';

	const db = uniCloud.database();
	const dbCmd = db.command;
	const dbCollectionName = 'yike-tv-series';
	const fileCollectionName = 'yike-collection-album-files'
	const fileCollection = db.collection(fileCollectionName)
	const tvSeriesCollection = db.collection(dbCollectionName)

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
				"album_id": "",
				"show_name": "",
				"episodes": [
					// {
					// 	episode_number: 1,
					// 	episode_name: '第一集',
					// 	video_fsid: 'fsid123',
					// 	cover_fsid: 'fsidCover123'
					// }
				],
				"description": "",
				"status": 0
			}
			return {
				formData,
				formOptions: {
					"status_localdata": [{
							"value": 0,
							"text": "草稿箱"
						},
						{
							"value": 1,
							"text": "已发布"
						}
					]
				},
				rules: {
					...getValidator(Object.keys(formData))
				},
				albumFiles: [], // 相册文件
				albumFilesFilter: [], // 过滤后的相册文件
				currentEpisodeNumber: null,
				availableCoverFiles: [],
				availableVideoFiles: [],
				selectedCoverId: null,
				selectedVideoId: null,
			}
		},
		computed: {
			// availableCoverFiles() {
			// 	return this.albumFiles.filter(file => file.category === 3 && !this.formData.episodes.some(episode =>
			// 		episode.cover_fsid === file.fsid));
			// },
			// availableVideoFiles() {
			// 	return this.albumFiles.filter(file => file.category === 1 && !this.formData.episodes.some(episode =>
			// 		episode.video_fsid === file.fsid));
			// },
		},
		onReady() {
			this.$refs.form.setRules(this.rules)
		},
		methods: {

			/**
			 * 验证表单并提交
			 */
			async submit() {
				uni.showLoading({
					mask: true
				})
				await this.updateAllFileInAlbumType()
				this.$refs.form.validate().then((res) => {
					return this.submitForm(res)
				}).catch(() => {}).finally(() => {
					uni.hideLoading()
				})
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


			onEpisodeClick(index) {
				const episode = this.formData.episodes[index];
				// 处理剧集点击事件，例如跳转到播放页面
				console.log(`您点击了 ${episode.episode_name}`);
			},
			getCoverUrl(fsid) {
				// 根据封面文件的fsid获取封面图片的URL
				// 这里需要根据您实际存储封面图片的方式来编写获取URL的逻辑
				if (!fsid) {
					return
				}
				// 在this.albumFiles数组中查找匹配的fsid项
				let episode = this.albumFiles.find(episode => episode.fsid === fsid);
				return episode.thumburl[1] // 这里目前用1
			},

			handleCoverClick(item) {
				this.selectedCoverId = item._id;
				// 这里处理封面文件点击事件的逻辑
				// 获取最后一集的信息
				//const lastEpisode = this.formData.episodes[this.formData.episodes.length - 1] || {};
				//lastEpisode.cover_fsid = item.fsid;
				
				
				// 找到当前选中视频项的索引
				const currentEpisodeIndex = this.formData.episodes.findIndex(episode => episode._id === this.selectedVideoId);
				// 检查是否找到了相应的视频项
				if (currentEpisodeIndex !== -1) {
					// 更新该视频项的封面fsid
					this.formData.episodes[currentEpisodeIndex].cover_fsid = item.fsid;
					this.formData.episodes[currentEpisodeIndex].extra_info = item.extra_info;
				} else {
					console.error('No episode found with the selected video ID:', this.selectedVideoId);
				}
				// 更新视图
				this.$forceUpdate();
			},
			handleVideoClick(item) {
				this.selectedVideoId = item._id;
				// 这里处理视频文件点击事件的逻辑
				const episodeNumber = this.formData.episodes.length + 1;
				const episodeName = item.path.replace('/youa/web/', '').replace('.mp4', '');
				const videoFsid = item.fsid;

				// 添加新剧集
				this.formData.episodes.push({
					_id: item._id, // 视频文件的_id，在添加到数据库表中之前，需要删除掉
					episode_number: episodeNumber,
					episode_name: episodeName,
					video_fsid: videoFsid,
					cover_fsid: '', // 封面fsid需要在选择封面时设置
					extra_info: {}, // 宽高等
				});
			},
			deleteEpisode(index) {
			    // 从formData.episodes数组中删除指定索引的项
			    this.formData.episodes.splice(index, 1);
			},
			handleFileConfirm() {
				// 关闭弹窗
				this.$refs.episodeDialog.close();
			},
			updateAvailableCoverFiles() {
				this.availableCoverFiles = this.albumFilesFilter.filter(file => file.category === 3 && !this.formData.episodes.some(episode =>
					episode.cover_fsid === file.fsid));
			},
			updateAvailableVideoFiles() {
				this.availableVideoFiles = this.albumFilesFilter.filter(file => file.category === 1 && !this.formData.episodes.some(episode =>
					episode.video_fsid === file.fsid));
			},
			async updateAllFileInAlbumType() {
				// 全部相册文件
				const fileCollectionName = 'yike-album-files'
				const fileCollection2 = db.collection(fileCollectionName)
				
				const { album_id } = this.formData
				
				console.log('album_id', album_id)
				
				const { result: result1 } = await fileCollection
				.where({ album_id })
				.update({
					album_type: 1, // 网剧相册
				})
				
				const { result: result2 } = await fileCollection2
				.where({ album_id })
				.update({
					album_type: 1, // 网剧相册
				})
				
				console.log('collection-album-files', result1)
				console.log('yike-album-files', result2)
				
			},
			
			
			
			async addEpisodeDialogToggle() {
				if (!this.formData.album_id) {
					uni.showToast({
						title: "相册ID未填",
						icon: "none"
					})
					return
				}
				await this.loadData()
				this.selectedCoverId = null
				this.selectedVideoId = null
				this.updateAvailableCoverFiles()
				this.updateAvailableVideoFiles()
				this.$refs.episodeDialog.open()
			},
			// 加载必要数据
			async loadData() {
				if (this.albumFiles.length != 0) {
					return
				}
				uni.showLoading({
					mask: true
				})
				await this.loadFlies()
				await this.loadTvSeries()
				uni.hideLoading()
			},
			// 加载相册文件
			async loadFlies() {
				const {
					album_id
				} = this.formData
				const {
					result
				} = await fileCollection
					.where({
						album_id
					})
					.field({
						album_id: true,
						category: true,
						fsid: true,
						path: true,
						thumburl: true,
						extra_info: true
					})
					.get()
				console.log('加载相册文件', result)
				this.albumFiles = result.data
			},
			// 加载电视连续剧 （tvSeriesCollection）
			async loadTvSeries() {
				const {
					album_id
				} = this.formData
				
				const { result } = await tvSeriesCollection.where({album_id}).get()
				const tvData = result.data[0]
				
				// 如果tvData是未定义或tvData.episodes不存在，那么直接返回
				if (!tvData || !tvData.episodes) {
					console.error('没有找到电视剧集数据或剧集数据为空');
					return;
				}
			
				// 提取tvData.episodes中所有的video_fsid和cover_fsid
				const existingFsids = tvData.episodes.reduce((acc, episode) => {
					acc.push(episode.video_fsid);
					acc.push(episode.cover_fsid);
					return acc;
				}, []);
			
				// 过滤掉albumFiles中存在于existingFsids的项
				this.albumFilesFilter = this.albumFiles.filter(file => !existingFsids.includes(file.fsid));
				
			}

		}
	}
</script>

<style lang="scss" scoped>
	.media-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		padding: 20px;
	}

	// .media-item {
	// 	flex: 0 1 calc(100% - 20px);
	// 	/* Default to full width */
	// 	background-color: #fff;
	// 	border-radius: 8px;
	// 	overflow: hidden;
	// 	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	// }

	.media-item {
		/* 初始宽度设置为100%，具体宽度将由JavaScript动态计算 */
		//width: 100%;
		position: relative;
		/* 用于定位图片和视频信息 */
		overflow: hidden;
		/* 保持内容在容器内 */
		background-color: #fff;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	// /* 2 columns for small screens (>=600px) */
	// @media (min-width: 600px) {
	// 	.media-item {
	// 		flex: 0 1 calc(50% - 20px);
	// 	}
	// }

	// /* 3 columns for medium screens (>=900px) */
	// @media (min-width: 900px) {
	// 	.media-item {
	// 		flex: 0 1 calc(33.333% - 20px);
	// 	}
	// }

	// /* 4 columns for large screens (>=1200px) */
	// @media (min-width: 1200px) {
	// 	.media-item {
	// 		flex: 0 1 calc(25% - 20px);
	// 	}
	// }

	.media-image-container {
		position: relative;
		width: 100%;
		/* 16:9 Aspect Ratio */
	}

	// .media-image {
	// 	position: absolute;
	// 	top: 0;
	// 	left: 0;
	// 	width: 100%;
	// 	height: 100%;
	// 	object-fit: cover;
	// }

	.media-image {
		height: 150px;
		/* 设置固定高度 */
		width: auto;
		/* 宽度自适应 ， 因为可能是9:16的竖长图*/
		display: block;
		/* 避免默认的行内元素行为 */
		margin: 0 auto;
		/* 居中图片 */
	}

	.video-info {
		position: absolute;
		bottom: 0;
		left: 0;
		background-color: rgba(0, 0, 0, 0.5);
		color: #fff;
		padding: 4px 8px;
		font-size: 12px;
	}

	.media-info {
		padding: 10px;
	}

	.media-name {
		margin: 0;
		font-size: 16px;
		font-weight: bold;
		max-width: 240px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: wrap;
	}

	.media-created-at {
		margin: 5px 0 0;
		font-size: 12px;
		color: #666;
		max-width: 240px;
		overflow: hidden;
	}


	.episode-dialog {
		background-color: #ffffff;
		border-radius: 10px;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
		padding: 15px;
		max-height: 80vh;
		max-width: 80vw;
		overflow-y: auto;
	}

	.no-more {
		text-align: center;
		padding: 20px;
	}

	.file-section h3 {
		margin-top: 10px;
		margin-bottom: 10px;
		color: #333;
	}

	.file-container {
		display: flex;
		flex-wrap: wrap;
		//justify-content: center;
		justify-content: flex-start;
		/* 修改这里，使元素靠左对齐 */
		gap: 10px;
	}

	.file-item {
		width: calc(25% - 10px);
		/* Adjust the width as needed */
		cursor: pointer;
	}
	
	.file-item.selected {
	  border: 2px solid blue;
	}

	.file-image {
		width: 100%;
		border-radius: 5px;
	}

	.file-path {
		text-align: center;
		margin-top: 5px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: wrap;
	}
</style>
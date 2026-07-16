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
					<view class="syl-toolbar-tool" @click="">
						<uni-icons type="camera-filled" size="30" color="#222222"></uni-icons>
						<text class="syl-toolbar-tool-text">本地</text>
					</view>
					<view class="syl-toolbar-tool" @click="">
						<uni-icons type="cloud-upload-filled" size="30" color="#222222"></uni-icons>
						<text class="syl-toolbar-tool-text">云端</text>
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
						<button type="primary" class="uni-button" style="width: 100px;" @click="submit()">提交</button>
					</view>
				</view>
			</view>
		</view>

		<!-- <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="title" label="标题" required>
        <uni-easyinput placeholder="文章或漫画的标题" v-model="formData.title"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="excerpt" label="摘要">
        <uni-easyinput v-model="formData.excerpt" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="your_story" label="内容" required>
        <uni-data-checkbox :multiple="true" v-model="formData.your_story"></uni-data-checkbox>
      </uni-forms-item>
	  <uni-forms-item name="source_url" label="来源地址" required>
	    <uni-data-checkbox :multiple="true" v-model="formData.source_url"></uni-data-checkbox>
	  </uni-forms-item>
      <uni-forms-item name="thumburl" label="封面大图" required>
        <uni-data-checkbox :multiple="true" v-model="formData.thumburl"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="creator_user" label="创建者信息" required>
        <undefined v-model="formData.creator_user"></undefined>
      </uni-forms-item>
      <uni-forms-item name="create_time" label="创建时间" required>
        <uni-datetime-picker return-type="timestamp" v-model="formData.create_time"></uni-datetime-picker>
      </uni-forms-item>
      <view class="uni-button-group">
        <button type="primary" class="uni-button" style="width: 100px;" @click="submit">提交</button>
        <navigator open-type="navigateBack" style="margin-left: 15px;">
          <button class="uni-button" style="width: 100px;">返回</button>
        </navigator>
      </view>
    </uni-forms> -->
	</view>
</template>

<script>
	import {
		validator
	} from '@/js_sdk/validator/yuta-cms-reading.js';

	const db = uniCloud.database();
	const dbCmd = db.command;
	const dbCollectionName = 'gay-comics';

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
				"source_url": "",
				"your_story": [],
				"thumburl": [],
				"creator_user": {
					"user_id": 0,
					"nickname": ""
				},
				"create_time": null
			}
			return {
				formData,
				formOptions: {},
				rules: {
					...getValidator(Object.keys(formData))
				}
			}
		},
		onLoad(e) {
			if (e.id) {
				const id = e.id
				this.formDataId = id
				this.getDetail(id)
			}
		},
		onReady() {
			this.$refs.form.setRules(this.rules)
		},
		methods: {

			/**
			 * 验证表单并提交
			 */
			submit() {
				uni.showLoading({
					mask: true
				})
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
				return db.collection(dbCollectionName).doc(this.formDataId).update(value).then((res) => {
					uni.showToast({
						title: '修改成功'
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
			 * 获取表单数据
			 * @param {Object} id
			 */
			getDetail(id) {
				uni.showLoading({
					mask: true
				})
				db.collection(dbCollectionName).doc(id).field("title,excerpt,your_story,thumburl,creator_user,create_time")
					.get().then((res) => {
						const data = res.result.data[0]
						if (data) {
							this.formData = data

						}
					}).catch((err) => {
						uni.showModal({
							content: err.message || '请求服务失败',
							showCancel: false
						})
					}).finally(() => {
						uni.hideLoading()
					})
			}
		}
	}
</script>

<style lang="scss">
	@import '@/pages/cloud-storage/reading/common/style/article-detail.scss';
</style>
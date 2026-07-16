<template>
	<view class="uni-container">
		<uni-forms ref="form" :model="formData" validateTrigger="bind">
			<uni-forms-item name="album_id" label="album_id">
				<uni-easyinput placeholder="一刻相册_相册id，和相册列表项关联" v-model="formData.album_id"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="person_id" label="人物id">
				<uni-easyinput placeholder="一刻相册_人物id" type="number" v-model="formData.person_id"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="name" label="人物名字">
				<uni-easyinput v-model="formData.name"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="covers" label="人物头像">
				<view class="covers">
					<view v-for="(item, index) in formData.covers" :key="index">
						<image :src="item.thumb" class="cover-item" mode="aspectFill" />
						<view class="cover-item-close" @click="removeCover(index)">
							❌
						</view>
					</view>
					<view v-if="false" class="update-item">
						<text>上传图像</text>
					</view>
					<uni-file-picker ref="files" :auto-upload="false" limit="9" v-model="imageValue"
						fileMediatype="image" mode="grid" @select="select" @progress="progress" @success="success"
						@fail="fail" />
					<button @click="upload">上传图像</button>
				</view>
			</uni-forms-item>
			<uni-forms-item name="description" label="描述、介绍下自己">
				<uni-easyinput type="textarea" :maxlength="-1" v-model="formData.description"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="link" label="创作者主页链接">
				<uni-easyinput placeholder="存储要采集的地址，一行一个URL" :value="urlDecodeChange(formData.link)"
					@input="updateUrls" :auto-height="false" trim="end" type="textarea" :maxlength="-1"></uni-easyinput>
			</uni-forms-item>
			<uni-forms-item name="ctime" label="">
			  <uni-datetime-picker return-type="timestamp" v-model="formData.ctime"></uni-datetime-picker>
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
	</view>
</template>

<script>
	import {
		urlEncode,
		urlDecode,
	} from '@/pages/cheerio-crawler/tasks/common/common.js'

	import {
		validator
	} from '@/js_sdk/validator/yike-person.js';

	const db = uniCloud.database();
	const dbCmd = db.command;
	const dbCollectionName = 'yike-person';

	function getValidator(fields) {
		let result = {}
		for (let key in validator) {
			if (fields.includes(key)) {
				result[key] = validator[key]
			}
		}
		return result
	}


	import mixin from './common/mixin.js'
	export default {
		mixins: [mixin],
		data() {
			let formData = {
				"album_id": "",
				"person_id": 0,
				"name": "",
				"covers": [],
				"description": "",
				"link": "",
				"status": 1,
				"ctime": null
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
						},
						{
							"value": 2,
							"text": "等待上线"
						}
					]
				},
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
				db.collection(dbCollectionName).doc(id).field("album_id,person_id,name,covers,description,link,status,ctime").get().then((
					res) => {
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
	.covers {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;

		.cover-item,
		.update-item {
			width: 165px;
			height: 165px;
			margin-right: 10px;
			margin-bottom: 10px;
		}

		.update-item {
			display: flex;
			background-color: rgba(0, 0, 0, 0.5);
			justify-content: center;
			align-items: center;
			color: rgba(255, 255, 255, 0.75);
		}
		
		.cover-item {
			position: relative;
		}
		
		.cover-item-close {
			position: absolute;
			top: 0;
			padding: 10px;
			background: rgba(0, 0, 0, 0.75);
		}
	}
</style>
<template>
	<view class="uni-container">
		<unicloud-db ref="udb" v-slot:default="{data, loading, error, options}" :collection="collectionList"
			@load="handleLoad">
			<view v-if="error">{{error.message}}</view>
			<view v-else-if="loading">正在加载...</view>
			<view v-else>
				<uni-forms ref="form" :model="formData" validateTrigger="submit" labelPosition="left"
					labelWidth="120px">
					<uni-row class="uni-row">
						<uni-group title="新用户注册奖励" mode="card">
							<uni-forms-item :name="['register_reward', 'reward_type']" label="奖励类型">
								<uni-data-checkbox v-model="formData.register_reward.reward_type"
									:localdata="formOptions.reward_type"></uni-data-checkbox>
							</uni-forms-item>
							<uni-forms-item :name="['register_reward', 'reward_amount']" label="奖励数量">
								<uni-easyinput type="number" v-model="formData.register_reward.reward_amount"
									placeholder="新用户注册平台后所获得的奖励数量"></uni-easyinput>
							</uni-forms-item>
						</uni-group>

						<uni-group title="每日登录奖励" mode="card">
							<uni-forms-item :name="['daily_login_reward', 'reward_type',]" label="奖励类型">
								<uni-data-checkbox v-model="formData.daily_login_reward.reward_type"
									:localdata="formOptions.reward_type"></uni-data-checkbox>
							</uni-forms-item>
							<uni-forms-item :name="['daily_login_reward', 'reward_amount']" label="奖励数量">
								<uni-easyinput type="number" v-model="formData.daily_login_reward.reward_amount"
									placeholder="用户每日登录App后获得的奖励数量"></uni-easyinput>
							</uni-forms-item>
						</uni-group>

						<uni-group title="周登陆VIP奖励" mode="card">
							<uni-forms-item :name="['weekly_login_vip_reward','login_day']" label="登录日">
								<uni-data-checkbox v-model="formData.weekly_login_vip_reward.login_day"
									:localdata="formOptions.login_day_localdata"></uni-data-checkbox>
							</uni-forms-item>
							<uni-forms-item :name="['weekly_login_vip_reward', 'reward_vip_days']" label="奖励VIP天数">
								<uni-easyinput type="number" v-model="formData.daily_login_reward.reward_amount"
									placeholder="用户在指定日登录后获得的额外VIP体验天数。"></uni-easyinput>
							</uni-forms-item>
						</uni-group>
					</uni-row>

					<uni-row class="uni-row">
						<uni-group title="邀请奖励" mode="card">
							<uni-forms-item :name="['invite_reward', 'reward_type',]" label="奖励类型">
								<uni-data-checkbox v-model="formData.invite_reward.reward_type"
									:localdata="formOptions.reward_type"></uni-data-checkbox>
							</uni-forms-item>
							<uni-forms-item :name="['invite_reward', 'reward_amount']" label="奖励数量">
								<uni-easyinput type="number" v-model="formData.invite_reward.reward_amount"
									placeholder="用户邀请每位新用户所获得的奖励数量"></uni-easyinput>
							</uni-forms-item>
						</uni-group>

						<uni-group title="分享奖励" mode="card">
							<uni-forms-item :name="['share_reward', 'reward_type',]" label="奖励类型">
								<uni-data-checkbox v-model="formData.share_reward.reward_type"
									:localdata="formOptions.reward_type"></uni-data-checkbox>
							</uni-forms-item>
							<uni-forms-item :name="['share_reward', 'reward_amount']" label="奖励数量">
								<uni-easyinput type="number" v-model="formData.share_reward.reward_amount"
									placeholder="用户分享App后获得的奖励数量"></uni-easyinput>
							</uni-forms-item>
						</uni-group>

						<uni-group title="每日免费视频观看次数" mode="card">
							<uni-forms-item :name="['free_video_views_per_day']" label="观看次数">
								<uni-easyinput type="number" v-model="formData.free_video_views_per_day"
									placeholder="用户每日免费观看视频的次数"></uni-easyinput>
							</uni-forms-item>
						</uni-group>

					</uni-row>

					<uni-forms-item name="app_file_cover_type" label="文件封面URL">
						<uni-data-checkbox v-model="formData.app_file_cover_type" :localdata="formOptions.app_file_cover_type_localdata"></uni-data-checkbox>
					</uni-forms-item>
					<uni-forms-item name="app_version" label="APP版本">
						<uni-easyinput placeholder="用于和客户端APP对比版本，如果不一致则提示更新"
							v-model="formData.app_version"></uni-easyinput>
					</uni-forms-item>

					<uni-forms-item name="app_download_link" label="APP下载链接">
						<uni-easyinput v-model="formData.app_download_link"></uni-easyinput>
					</uni-forms-item>

					<uni-forms-item name="app_dwonload_qr_code" label="APP下载二维码">
						<uni-easyinput v-model="formData.app_dwonload_qr_code"></uni-easyinput>
						<image :src="formData.app_dwonload_qr_code" style="width: 165px;height: 165px;"
							mode="aspectFill" />
						<uni-file-picker ref="files" :auto-upload="true" limit="1" v-model="imageValue"
							fileMediatype="image" mode="grid" @select="select" @progress="progress" @success="success"
							@fail="fail" />
					</uni-forms-item>

					<uni-forms-item name="app_share_content" label="APP分享内容">
						<uni-easyinput type="textarea" :auto-height="true" :maxlength="-1"
							v-model="formData.app_share_content"></uni-easyinput>
					</uni-forms-item>

					<uni-forms-item name="app_home_notice" label="APP首页公告">
						<uni-easyinput type="textarea" :auto-height="true" :maxlength="-1"
							v-model="formData.app_home_notice"></uni-easyinput>
					</uni-forms-item>

					<!-- 还需要公告（弹出层）、通知（走马灯文字） -->

					<view class="uni-button-group">
						<button type="primary" class="uni-button" style="width: 100px;" @click="submit">提交</button>
						<navigator open-type="navigateBack" style="margin-left: 15px;">
							<button class="uni-button" style="width: 100px;">返回</button>
						</navigator>
					</view>
				</uni-forms>
			</view>
		</unicloud-db>
	</view>
</template>

<script>
	import {
		validator
	} from '@/js_sdk/validator/system-app-config.js';

	function getValidator(fields) {
		let result = {}
		for (let key in validator) {
			if (fields.includes(key)) {
				result[key] = validator[key]
			}
		}
		return result
	}

	let formData = {
		"_id": "app_config_default", // 数据库记录的唯一标识符
		"register_reward": { // 注册奖励，新用户注册平台时自动获得的奖励
			"reward_type": 1, // 奖励类型，默认为1，代表VIP天数
			"reward_amount": 7 // 新用户注册平台后所获得的奖励数量，默认为7
		},
		"daily_login_reward": { // 每日登录奖励，用户每天登录App获得的金币奖励，默认为1金币
			"reward_type": 0, // 奖励类型，默认为0，代表金币
			"reward_amount": 1 // 用户每日登录App后获得的奖励数量，默认为3
		},
		"weekly_login_vip_reward": { // 周登录VIP奖励配置
			"login_day": 1, // 登录日，以数字表示周几，这里默认为周一
			"reward_vip_days": 1, // 奖励VIP天数，用户在指定日登录后获得的额外VIP体验天数，默认为1天
			"enabled": true // 是否启用该奖励配置，默认为启用
		},
		"invite_reward": { // 邀请奖励配置
			"reward_type": 1, // 奖励类型，默认为1，代表VIP天数
			"reward_amount": 3 // 每次邀请的奖励数量，默认为3
		},
		"share_reward": { // 分享奖励配置
			"enabled": true, // 是否开启分享奖励，默认为开启
			"reward_type": 0, // 分享奖励的类型，默认为0，代表金币
			"reward_amount": 1 // 分享后获得的奖励数量，默认为1
		},
		"free_video_views_per_day": 3, // 用户每日免费观看视频的次数
		"app_file_cover_type": 1,
		"app_download_link": "",
		"app_dwonload_qr_code": "",
		"app_share_content": "",
		"app_home_notice": "",
		"app_version": "1.0.0"
	}

	export default {
		data() {
			return {
				collectionList: "system-app-config",
				isNewRecord: false, // 是新增记录?
				formData,
				formOptions: {
					"login_day_localdata": [{
							"value": 1,
							"text": "周一"
						},
						{
							"value": 2,
							"text": "周二"
						},
						{
							"value": 3,
							"text": "周三"
						},
						{
							"value": 4,
							"text": "周四"
						},
						{
							"value": 5,
							"text": "周五"
						},
						{
							"value": 6,
							"text": "周六"
						},
						{
							"value": 7,
							"text": "周日"
						}
					],
					"reward_type": [{
							"value": 0,
							"text": "金币"
						},
						{
							"value": 1,
							"text": "VIP天数"
						}
					],
					"app_file_cover_type_localdata": [{
							"value": 0,
							"text": "一刻相册"
						},
						{
							"value": 1,
							"text": "uniCloud"
						}
					]
				},
				rules: {
					...getValidator(Object.keys(formData))
				}
			}
		},
		methods: {
			handleLoad(data, ended, pagination) {
				// `data` 当前查询结果
				// `ended` 是否有更多数据
				// `pagination` 分页信息 HBuilderX 3.1.5+ 支持

				// 检查加载的数据是否为空。如果不为空，则将第一条数据赋值给formData；如果为空，则使用默认的表单数据。
				// 设置一个标志位isNewRecord，用于标识当前操作是否为新增配置。当data[0]为空时，标记为新增配置（true），否则为更新配置（false）。
				if (data && data.length > 0) {
					this.formData = data[0];
					this.isNewRecord = false; // 标记为非新记录
				} else {
					this.formData = this.getDefaultFormData(); // 获取默认表单数据
					this.isNewRecord = true; // 标记为新记录
				}
			},
			submit() {
				// 创建一个新的数据对象，其中不包含 _id 字段
				let updateData = {
					...this.formData
				};
				delete updateData._id; // 删除 _id字段
				updateData.free_video_views_per_day = Number(updateData.free_video_views_per_day)

				// 判断是更新配置还是新增配置
				if (this.isNewRecord) {
					// 新增配置
					this.$refs.udb.add(updateData, {
						//showToast: true,
						toastTitle: '新增成功',
						success: (res) => {
							console.log('新增成功', res);
						},
						fail: (err) => {
							console.error('新增失败', err);
						}
					});
				} else {
					// 更新配置
					this.$refs.udb.update(this.formData._id, updateData, {
						//showToast: true,
						toastTitle: '修改成功',
						success: (res) => {
							console.log('修改成功', res);
						},
						fail: (err) => {
							console.error('修改失败', err);
						}
					});
				}
			},
			getDefaultFormData() {
				// 返回表单的默认数据结构
				return formData
			},
			// 获取上传状态
			select(e) {
				console.log('选择文件：', e)
			},
			// 获取上传进度
			progress(e) {
				console.log('上传进度：', e)
			},

			// 上传成功
			success(e) {
				console.log('上传成功', e)


				// 从响应对象中提取tempFiles数组，假设e是一个包含tempFiles的对象
				let tempFiles = e.tempFiles;

				// 遍历tempFiles数组
				tempFiles.forEach(file => {
					// 构造新的图片项对象
					let imageItem = {
						size: file.size, // 图片大小
						width: file.image.width, // 图片宽度
						height: file.image.height, // 图片高度
						thumb: file.fileID, // 缩略图，使用fileID作为值
						path: "cloudstorage/" + file.cloudPath, // 路径，使用"cloudstorage/"加上cloudPath的值
					};

					// 将新的图片项对象追加到formData.covers数组中
					this.formData.app_dwonload_qr_code = file.fileID;
				});
			},

			// 上传失败
			fail(e) {
				console.log('上传失败：', e)
			},
		}
	}
</script>

<style lang="scss">
	.uni-row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
	}

	.uni-group {
		display: block !important;
		max-width: 670rpx !important;
	}

	.uni-group--card {
		margin: 0 !important;
		margin-bottom: 60rpx !important;
		margin-right: 60rpx !important;
	}

	.uni-app--showleftwindow .uni-container .uni-forms {
		max-width: 100% !important;
	}
</style>
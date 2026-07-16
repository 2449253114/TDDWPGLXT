<template>
	<view class="container">
		<uni-card class="card" :is-shadow="false" :is-full="false" :border="true" margin="0 0 10px 0">
			<text class="uni-card-txt">取消指定账号的邀请人</text>
		</uni-card>

		<view class="warning-box">
			<uni-icons type="info-filled" size="20" color="#e6a23c"></uni-icons>
			<text class="warning-text">
				此操作会清空该账号名下所有受邀账号的邀请关系，并立即取消该账号的VIP，请先查询并核对影响范围。
			</text>
		</view>

		<uni-forms-item label="账号邀请码" :label-width="85">
			<view class="form-row">
				<uni-easyinput
					v-model="myInviteCode"
					:maxlength="6"
					:disabled="querying || processing"
					placeholder="请输入用户自身账号邀请码"
					@input="handleInviteCodeInput"
					@clear="clearPreview"
				/>
				<view class="space-10"></view>
				<button
					type="primary"
					size="mini"
					:loading="querying"
					:disabled="querying || processing"
					@click="queryAccount"
				>
					查询账号
				</button>
			</view>
		</uni-forms-item>

		<view v-if="targetUser" class="preview-section">
			<view class="section-title">执行前确认</view>
			<view class="detail-list">
				<view class="detail-row">
					<text class="detail-label">账号邀请码</text>
					<text class="detail-value">{{ targetUser.my_invite_code }}</text>
				</view>
				<view class="detail-row">
					<text class="detail-label">用户ID</text>
					<text class="detail-value user-id">{{ targetUser._id }}</text>
				</view>
				<view class="detail-row">
					<text class="detail-label">昵称</text>
					<text class="detail-value">{{ targetUser.nickname || '未设置' }}</text>
				</view>
				<view class="detail-row">
					<text class="detail-label">当前VIP状态</text>
					<text class="detail-value">{{ targetUser.vip ? 'VIP' : '非VIP' }}</text>
				</view>
				<view class="detail-row">
					<text class="detail-label">当前VIP到期时间</text>
					<text class="detail-value">{{ formatTimestamp(targetUser.vip_expire_date) }}</text>
				</view>
				<view class="detail-row affected-row">
					<text class="detail-label">将取消邀请关系</text>
					<text class="affected-count">{{ affectedCount }} 个账号</text>
				</view>
			</view>

			<view class="change-summary">
				<text>受邀账号：invite_time = 0，inviter_uid = ""</text>
				<text>当前账号：vip = false，vip_expire_date = 执行时间减24小时（毫秒）</text>
			</view>

			<button
				type="warn"
				:loading="processing"
				:disabled="querying || processing"
				@click="confirmCancelInviter"
			>
				确认取消邀请人
			</button>
		</view>

		<view v-if="lastResult" :class="['result-box', lastResult.type]">
			<text class="result-title">{{ lastResult.title }}</text>
			<text>{{ lastResult.message }}</text>
		</view>
	</view>
</template>

<script>
	const db = uniCloud.database()
	const userCollection = db.collection('user-accounts')
	const DEFAULT_INVITE_CODE = 'O0QCWI'
	const ONE_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

	export default {
		data() {
			return {
				myInviteCode: DEFAULT_INVITE_CODE,
				targetUser: null,
				affectedCount: 0,
				querying: false,
				processing: false,
				lastResult: null
			}
		},
		methods: {
			handleInviteCodeInput(value) {
				this.myInviteCode = value
				this.clearPreview()
			},
			clearPreview() {
				if (this.querying || this.processing) return

				this.targetUser = null
				this.affectedCount = 0
				this.lastResult = null
			},
			normalizeInviteCode() {
				return String(this.myInviteCode || '').trim().toUpperCase()
			},
			isValidInviteCode(inviteCode) {
				return /^[A-Z0-9]{6}$/.test(inviteCode)
			},
			async fetchAccountPreview(inviteCode) {
				const userResult = await userCollection.where({
					my_invite_code: inviteCode
				}).field({
					_id: true,
					my_invite_code: true,
					nickname: true,
					vip: true,
					vip_expire_date: true
				}).limit(2).get()
				const users = userResult.result.data

				if (users.length === 0) {
					throw new Error('没有查到该邀请码对应的账号')
				}
				if (users.length > 1) {
					throw new Error('该邀请码对应多个账号，数据异常，已停止操作')
				}

				const targetUser = users[0]
				const countResult = await userCollection.where({
					inviter_uid: targetUser._id
				}).count()

				return {
					targetUser,
					affectedCount: countResult.result.total
				}
			},
			async queryAccount() {
				if (this.querying || this.processing) return

				const inviteCode = this.normalizeInviteCode()
				this.myInviteCode = inviteCode
				this.clearPreview()

				if (!this.isValidInviteCode(inviteCode)) {
					uni.showToast({
						title: '邀请码必须是6位字母或数字',
						icon: 'none'
					})
					return
				}

				this.querying = true
				uni.showLoading({
					title: '正在查询...',
					mask: true
				})

				try {
					const preview = await this.fetchAccountPreview(inviteCode)
					this.targetUser = preview.targetUser
					this.affectedCount = preview.affectedCount
				} catch (error) {
					console.error('查询取消邀请人信息失败:', error)
					uni.showModal({
						title: '查询失败',
						content: error.message || '查询账号失败，请稍后重试',
						showCancel: false
					})
				} finally {
					this.querying = false
					uni.hideLoading()
				}
			},
			showConfirmModal(content) {
				return new Promise(resolve => {
					uni.showModal({
						title: '危险操作确认',
						content,
						confirmText: '确认执行',
						confirmColor: '#dd524d',
						success: result => resolve(result.confirm),
						fail: () => resolve(false)
					})
				})
			},
			async confirmCancelInviter() {
				if (!this.targetUser || this.querying || this.processing) return

				const inviteCode = this.normalizeInviteCode()
				if (inviteCode !== this.targetUser.my_invite_code) {
					this.clearPreview()
					uni.showToast({
						title: '邀请码已变化，请重新查询',
						icon: 'none'
					})
					return
				}

				let confirmed = false
				this.querying = true
				try {
					const latestPreview = await this.fetchAccountPreview(inviteCode)
					if (latestPreview.targetUser._id !== this.targetUser._id) {
						throw new Error('邀请码对应的用户已变化，请重新核对')
					}
					this.targetUser = latestPreview.targetUser
					this.affectedCount = latestPreview.affectedCount
					confirmed = await this.showConfirmModal(
						`邀请码：${inviteCode}\n用户ID：${this.targetUser._id}\n将清除 ${this.affectedCount} 个账号的邀请关系，并取消该账号的VIP。是否继续？`
					)
				} catch (error) {
					console.error('执行前复核账号失败:', error)
					uni.showModal({
						title: '复核失败',
						content: error.message || '无法复核账号，请稍后重试',
						showCancel: false
					})
					return
				} finally {
					this.querying = false
				}

				if (!confirmed) return

				await this.cancelInviter()
			},
			async cancelInviter() {
				const targetUserId = this.targetUser._id
				const inviteCode = this.targetUser.my_invite_code
				let relationsCleared = false
				let clearedCount = 0

				this.processing = true
				this.lastResult = null
				uni.showLoading({
					title: '正在处理...',
					mask: true
				})

				try {
					const relationUpdateResult = await userCollection.where({
						inviter_uid: targetUserId
					}).update({
						invite_time: 0,
						inviter_uid: ''
					})
					clearedCount = relationUpdateResult.result.updated

					const remainingResult = await userCollection.where({
						inviter_uid: targetUserId
					}).count()
					if (remainingResult.result.total !== 0) {
						throw new Error(`仍有 ${remainingResult.result.total} 个账号未清除邀请关系，目标账号VIP未修改`)
					}
					relationsCleared = true

					const vipExpireDate = Date.now() - ONE_DAY_IN_MILLISECONDS
					const vipUpdateResult = await userCollection.doc(targetUserId).update({
						vip: false,
						vip_expire_date: vipExpireDate
					})
					if (vipUpdateResult.result.updated !== 1) {
						throw new Error('目标账号VIP状态未能更新，请确认账号是否仍然存在')
					}

					this.affectedCount = 0
					this.targetUser = {
						...this.targetUser,
						vip: false,
						vip_expire_date: vipExpireDate
					}
					this.lastResult = {
						type: 'success',
						title: '处理成功',
						message: `已清除 ${clearedCount} 个账号的邀请关系，并取消邀请码 ${inviteCode} 对应账号的VIP。`
					}
					uni.showToast({
						title: '处理成功',
						icon: 'success'
					})
				} catch (error) {
					console.error('取消邀请人失败:', error)
					const partialFailure = relationsCleared
					if (partialFailure) {
						this.affectedCount = 0
					}
					this.lastResult = {
						type: 'error',
						title: partialFailure ? '邀请关系已清除，VIP更新失败' : '处理失败',
						message: `${error.message || '操作失败，请稍后重试'}。此操作可以安全重试。`
					}
					uni.showModal({
						title: partialFailure ? '部分处理完成' : '处理失败',
						content: this.lastResult.message,
						showCancel: false
					})
				} finally {
					this.processing = false
					uni.hideLoading()
				}
			},
			formatTimestamp(timestamp) {
				if (!timestamp) return '无'

				const date = new Date(timestamp)
				if (Number.isNaN(date.getTime())) return '无效时间'

				const pad = value => String(value).padStart(2, '0')
				return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
			}
		}
	}
</script>

<style lang="scss">
	.container {
		padding: 10px;
	}

	.card {
		background-color: #333;
	}

	.uni-card-txt {
		color: #fff;
	}

	.warning-box {
		display: flex;
		align-items: flex-start;
		padding: 12px;
		margin-bottom: 18px;
		background-color: #fdf6ec;
		border: 1px solid #faecd8;
		border-radius: 4px;
	}

	.warning-text {
		flex: 1;
		margin-left: 8px;
		color: #b88230;
		line-height: 1.6;
	}

	.form-row {
		display: flex;
		align-items: center;
	}

	.space-10 {
		flex: 0 0 10px;
		height: 10px;
	}

	.preview-section {
		padding: 16px;
		margin-top: 18px;
		background-color: #fff;
		border: 1px solid #ebeef5;
		border-radius: 4px;
	}

	.section-title {
		padding-bottom: 12px;
		font-size: 16px;
		font-weight: 600;
		color: #303133;
		border-bottom: 1px solid #ebeef5;
	}

	.detail-list {
		padding: 8px 0;
	}

	.detail-row {
		display: flex;
		align-items: flex-start;
		padding: 8px 0;
	}

	.detail-label {
		flex: 0 0 140px;
		color: #909399;
	}

	.detail-value {
		flex: 1;
		color: #303133;
	}

	.user-id {
		word-break: break-all;
	}

	.affected-row {
		margin-top: 4px;
		padding: 12px 8px;
		background-color: #fef0f0;
	}

	.affected-count {
		font-size: 18px;
		font-weight: 600;
		color: #f56c6c;
	}

	.change-summary {
		display: flex;
		flex-direction: column;
		padding: 12px;
		margin: 8px 0 18px;
		color: #606266;
		line-height: 1.8;
		background-color: #f4f4f5;
		border-radius: 4px;
	}

	.result-box {
		display: flex;
		flex-direction: column;
		padding: 14px;
		margin-top: 16px;
		line-height: 1.6;
		border-radius: 4px;
	}

	.result-box.success {
		color: #529b2e;
		background-color: #f0f9eb;
		border: 1px solid #e1f3d8;
	}

	.result-box.error {
		color: #c45656;
		background-color: #fef0f0;
		border: 1px solid #fde2e2;
	}

	.result-title {
		margin-bottom: 4px;
		font-weight: 600;
	}

	@media screen and (max-width: 600px) {
		.form-row {
			align-items: stretch;
			flex-direction: column;
		}

		.space-10 {
			flex-basis: 10px;
		}

		.detail-label {
			flex-basis: 115px;
		}
	}
</style>

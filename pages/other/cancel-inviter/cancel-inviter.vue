<template>
	<view class="container">
		<uni-card class="card" :is-shadow="false" :is-full="false" :border="true" margin="0 0 10px 0">
			<text class="uni-card-txt">取消指定账号的邀请人</text>
		</uni-card>

		<view class="warning-box">
			<uni-icons type="info-filled" size="20" color="#e6a23c"></uni-icons>
			<text class="warning-text">
				此操作会清空该账号名下所有受邀账号的邀请关系、立即取消该账号的VIP，并删除该用户两张订单表中金额严格等于数字0的记录。正数、负数、空值、缺失值和字符串“0”均不会删除，请先查询并核对影响范围。
			</text>
		</view>
		<view v-if="hasPendingCleanupNotices" class="recovery-box">
			<text class="recovery-title">待恢复的0元记录清理</text>
			<view v-for="item in pendingCleanupRecoveries" :key="item.targetUserId" class="recovery-row">
				<text>原邀请码 {{ item.inviteCode }}（仅供识别），原用户ID：{{ item.targetUserId }}</text>
				<button type="warn" size="mini" :disabled="querying || processing" @click="recoverPendingCleanup(item)">
					按原用户ID继续清理
				</button>
			</view>
			<view v-for="item in blockedCleanupRecoveries" :key="`blocked-${item.targetUserId}`" class="recovery-row invalid">
				<text>原用户ID {{ item.targetUserId }}：{{ item.message }}</text>
			</view>
			<view v-for="(message, index) in pendingCleanupIssues" :key="`issue-${index}`" class="recovery-row invalid">
				<text>本地待恢复记录损坏：{{ message }}。该记录不会生成可操作入口，请人工核对浏览器本地数据。</text>
			</view>
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
				<view class="detail-row cleanup-row">
					<text class="detail-label">会员变更0元记录</text>
					<text class="cleanup-count">{{ zeroAmountCounts.vipChanges }} 条</text>
				</view>
				<view class="detail-row cleanup-row">
					<text class="detail-label">支付订单0元记录</text>
					<text class="cleanup-count">{{ zeroAmountCounts.paymentOrders }} 条</text>
				</view>
			</view>

			<view class="change-summary">
				<text>受邀账号：invite_time = 0，inviter_uid = ""</text>
				<text>当前账号：vip = false，vip_expire_date = 执行时间减24小时（毫秒）</text>
				<text>0元记录：仅删除 user_id 为当前用户且 total_fee 严格等于数字0的记录</text>
			</view>

			<view v-if="isCoreOperationLocked(targetUser._id)" class="operation-lock">
				<text>{{ getCoreOperationLockMessage(targetUser._id) }}</text>
				<button
					v-if="canRetryCleanup"
					class="retry-cleanup-button"
					type="warn"
					size="mini"
					:loading="processing"
					:disabled="querying || processing"
					@click="retryZeroAmountCleanup"
				>
					仅重试0元记录清理
				</button>
			</view>
			<button
				v-else
				type="warn"
				size="mini"
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
			<view v-if="lastResult.cleanupItems && lastResult.cleanupItems.length" class="cleanup-results">
				<view
					v-for="item in lastResult.cleanupItems"
					:key="item.key"
					:class="['cleanup-result-row', item.success ? 'success' : 'error']"
				>
					<text class="cleanup-result-title">{{ item.label }}：{{ item.success ? '完成' : '未完成' }}</text>
					<text>{{ formatCleanupResult(item) }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	const db = uniCloud.database()
	const dbCmd = db.command
	const userCollection = db.collection('user-accounts')
	const vipChangesCollection = db.collection('user-vip-changes')
	const paymentOrdersCollection = db.collection('user-payment-orders')
	const {
		CLEANUP_KEYS,
		createZeroAmountWhere,
		countImpact,
		cleanupZeroAmountRecords,
		runCancellationWorkflow,
		normalizePendingCleanupState,
		OPERATION_PHASES,
		normalizeOperationRecord,
		serializeOperationRecord,
		createOperationRecord,
		transitionOperationRecord,
		canReleaseOperationLockAfterCoreFailure
	} = require('./cancel-inviter.workflow.js')
	const DEFAULT_INVITE_CODE = 'O0QCWI'
	const LEGACY_PENDING_CLEANUP_STORAGE_KEY = 'cancel-inviter-pending-cleanup-v1'
	const OPERATION_STORAGE_PREFIX = 'cancel-inviter-phase-v2:'

	export default {
		data() {
			return {
				myInviteCode: DEFAULT_INVITE_CODE,
				targetUser: null,
				affectedCount: 0,
				zeroAmountCounts: {
					vipChanges: 0,
					paymentOrders: 0
				},
				querying: false,
				processing: false,
				lastResult: null,
				completedCoreUsers: {},
				blockedCoreUsers: {},
				pendingCleanupIssues: [],
				operationStorageReady: true,
				operationStorageError: ''
			}
		},
		computed: {
			pendingCleanupRecoveries() {
				return Object.keys(this.completedCoreUsers)
					.map(targetUserId => this.completedCoreUsers[targetUserId])
					.filter(item => item && item.recovered && !item.expired && item.cleanup && !item.cleanup.success)
			},
			blockedCleanupRecoveries() {
				return Object.keys(this.blockedCoreUsers).map(targetUserId => ({
					targetUserId,
					message: this.blockedCoreUsers[targetUserId]
				}))
			},
			hasPendingCleanupNotices() {
				return this.pendingCleanupRecoveries.length > 0 ||
					this.blockedCleanupRecoveries.length > 0 ||
					this.pendingCleanupIssues.length > 0
			},
			canRetryCleanup() {
				if (!this.targetUser) return false
				const completed = this.completedCoreUsers[this.targetUser._id]
				return Boolean(completed && !completed.expired && completed.cleanup && !completed.cleanup.success)
			}
		},
		onLoad() {
			this.restorePendingCleanups()
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
				this.zeroAmountCounts = {
					vipChanges: 0,
					paymentOrders: 0
				}
				this.lastResult = null
			},
			normalizeInviteCode() {
				return String(this.myInviteCode || '').trim().toUpperCase()
			},
			isValidInviteCode(inviteCode) {
				return /^[A-Z0-9]{6}$/.test(inviteCode)
			},
			async fetchAccount(inviteCode) {
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
				if (typeof targetUser.vip !== 'boolean') {
					throw new Error('目标账号VIP状态字段异常，无法安全执行条件更新')
				}
				return targetUser
			},
			async fetchAccountPreview(inviteCode) {
				const targetUser = await this.fetchAccount(inviteCode)
				const impact = await countImpact(this.createWorkflowOperations(), targetUser._id)

				return {
					targetUser,
					impact
				}
			},
			applyPreview(preview) {
				this.targetUser = preview.targetUser
				this.affectedCount = preview.impact.relations
				this.zeroAmountCounts = {
					vipChanges: preview.impact.vipChanges,
					paymentOrders: preview.impact.paymentOrders
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
					this.applyPreview(preview)
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
				if (this.isCoreOperationLocked(this.targetUser._id)) {
					uni.showToast({
						title: '核心操作已执行，不能重复取消VIP',
						icon: 'none'
					})
					return
				}

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
					this.applyPreview(latestPreview)
					confirmed = await this.showConfirmModal(
						`邀请码：${inviteCode}\n用户ID：${this.targetUser._id}\n将清除 ${this.affectedCount} 个账号的邀请关系、取消该账号的VIP，并删除会员变更表 ${this.zeroAmountCounts.vipChanges} 条及支付订单表 ${this.zeroAmountCounts.paymentOrders} 条数字0元记录。是否继续？`
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
			getDatabaseResultValue(response, key) {
				if (!response || !response.result) return undefined
				return response.result[key]
			},
			async countCollection(collection, where) {
				const response = await collection.where(where).count()
				return this.getDatabaseResultValue(response, 'total')
			},
			createCleanupOperations() {
				return {
					countVipChanges: targetUserId => this.countCollection(
						vipChangesCollection,
						createZeroAmountWhere(targetUserId)
					),
					countPaymentOrders: targetUserId => this.countCollection(
						paymentOrdersCollection,
						createZeroAmountWhere(targetUserId)
					),
					removeVipChanges: async targetUserId => {
						const response = await vipChangesCollection.where(
							createZeroAmountWhere(targetUserId)
						).remove()
						return this.getDatabaseResultValue(response, 'deleted')
					},
					removePaymentOrders: async targetUserId => {
						const response = await paymentOrdersCollection.where(
							createZeroAmountWhere(targetUserId)
						).remove()
						return this.getDatabaseResultValue(response, 'deleted')
					}
				}
			},
			createWorkflowOperations(operationContext) {
				return Object.assign(this.createCleanupOperations(), {
					assertOperationLock: (targetUserId, phase) => {
						if (!operationContext || !operationContext.record || operationContext.record.targetUserId !== targetUserId) {
							throw new Error('当前操作缺少匹配的本地安全状态')
						}
						this.assertOperationContext(operationContext, phase)
					},
					countRelations: targetUserId => this.countCollection(userCollection, {
						inviter_uid: targetUserId
					}),
					clearRelations: async targetUserId => {
						const response = await userCollection.where({
							inviter_uid: targetUserId
						}).update({
							invite_time: 0,
							inviter_uid: ''
						})
						return this.getDatabaseResultValue(response, 'updated')
					},
					cancelVip: async (targetSnapshot, vipExpireDate) => {
						const where = {
							_id: targetSnapshot._id,
							my_invite_code: targetSnapshot.my_invite_code,
							vip: targetSnapshot.vip
						}
						where.vip_expire_date = Object.prototype.hasOwnProperty.call(targetSnapshot, 'vip_expire_date')
							? targetSnapshot.vip_expire_date
							: dbCmd.exists(false)
						const response = await userCollection.where(where).update({
							vip: false,
							vip_expire_date: vipExpireDate
						})
						return this.getDatabaseResultValue(response, 'updated')
					},
					readTargetUser: async targetUserId => {
						const response = await userCollection.doc(targetUserId).field({
							_id: true,
							my_invite_code: true,
							vip: true,
							vip_expire_date: true
						}).get()
						const rows = response && response.result && Array.isArray(response.result.data)
							? response.result.data
							: []
						return rows.length === 1 ? rows[0] : null
					},
					markCoreSucceeded: core => {
						if (!operationContext || !operationContext.record || operationContext.record.targetUserId !== core.targetUserId) {
							throw new Error('核心操作完成后找不到匹配的本地安全状态')
						}
						this.transitionOperationContext(operationContext, OPERATION_PHASES.cleanupOnly)
					}
				})
			},
			createOperationId() {
				return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
			},
			getOperationStorageKey(targetUserId) {
				return `${OPERATION_STORAGE_PREFIX}${encodeURIComponent(String(targetUserId || ''))}`
			},
			getOperationTargetFromKey(key) {
				if (typeof key !== 'string' || !key.startsWith(OPERATION_STORAGE_PREFIX)) return ''
				try {
					return decodeURIComponent(key.slice(OPERATION_STORAGE_PREFIX.length))
				} catch (error) {
					return ''
				}
			},
			storageValueExists(value) {
				return value !== undefined && value !== null && value !== ''
			},
			getStorageKeys() {
				if (typeof uni.getStorageInfoSync !== 'function') throw new Error('当前运行环境不支持枚举本地安全状态')
				const info = uni.getStorageInfoSync()
				if (!info || !Array.isArray(info.keys)) throw new Error('无法读取本地安全状态键列表')
				return info.keys.map(String)
			},
			readOperationState(targetUserId) {
				const raw = uni.getStorageSync(this.getOperationStorageKey(targetUserId))
				if (!this.storageValueExists(raw)) return { exists: false, record: null, issue: '' }
				const normalized = normalizeOperationRecord(raw, targetUserId, Date.now())
				return {
					exists: true,
					record: normalized.record,
					issue: normalized.issue
				}
			},
			writeAndVerifyOperationRecord(record) {
				const key = this.getOperationStorageKey(record.targetUserId)
				const serialized = serializeOperationRecord(record)
				uni.setStorageSync(key, serialized)
				const verified = this.readOperationState(record.targetUserId)
				if (!verified.record ||
					verified.record.operationId !== record.operationId ||
					verified.record.phase !== record.phase ||
					verified.record.inviteCode !== record.inviteCode ||
					verified.record.createdAt !== record.createdAt ||
					verified.record.updatedAt !== record.updatedAt ||
					verified.record.reason !== (record.reason || '')) {
					throw new Error(verified.issue || '本地安全状态写入后回读不一致')
				}
				return verified.record
			},
			beginCoreOperation(targetUser) {
				if (!this.operationStorageReady) throw new Error(this.operationStorageError || '本地安全状态不可用')
				const existing = this.readOperationState(targetUser._id)
				if (existing.exists) throw new Error(existing.issue || '该账号已有未完成或待人工核对的操作')
				const record = createOperationRecord({
					targetUserId: targetUser._id,
					inviteCode: targetUser.my_invite_code,
					operationId: this.createOperationId(),
					phase: OPERATION_PHASES.blockedOnly
				}, Date.now())
				return { record: this.writeAndVerifyOperationRecord(record) }
			},
			assertOperationContext(context, expectedPhase) {
				if (!context || !context.record) throw new Error('当前操作上下文不存在')
				const current = this.readOperationState(context.record.targetUserId)
				if (!current.record || current.record.operationId !== context.record.operationId) {
					throw new Error(current.issue || '本地安全状态已被其他页面替换或删除')
				}
				if (current.record.phase !== expectedPhase) throw new Error(`本地安全状态阶段不是 ${expectedPhase}`)
				context.record = current.record
				return current.record
			},
			transitionOperationContext(context, nextPhase, reason) {
				this.assertOperationContext(context, context.record.phase)
				const transitioned = transitionOperationRecord(context.record, nextPhase, Date.now(), reason)
				context.record = this.writeAndVerifyOperationRecord(transitioned)
				return context.record
			},
			removeAndVerifyOperationRecord(record, expectedPhase) {
				const current = this.readOperationState(record.targetUserId)
				if (!current.record || current.record.operationId !== record.operationId) {
					throw new Error(current.issue || '不能删除其他页面创建的本地安全状态')
				}
				if (expectedPhase && current.record.phase !== expectedPhase) {
					throw new Error(`本地安全状态阶段不是 ${expectedPhase}，不能移除`)
				}
				uni.removeStorageSync(this.getOperationStorageKey(record.targetUserId))
				if (this.getStorageKeys().includes(this.getOperationStorageKey(record.targetUserId))) {
					throw new Error('本地安全状态删除后仍然存在')
				}
			},
			migrateLegacyPendingCleanups(existingKeys) {
				const raw = uni.getStorageSync(LEGACY_PENDING_CLEANUP_STORAGE_KEY)
				if (!this.storageValueExists(raw)) return { issues: [], unsafe: false }
				const state = normalizePendingCleanupState(raw, Date.now())
				const issues = state.issues.slice()
				const blockedIds = new Set(state.blockedTargetUserIds)
				const targetIds = new Set(Object.keys(state.records).concat(state.blockedTargetUserIds))
				let migrationFailed = false
				let index = 0
				targetIds.forEach(targetUserId => {
					const key = this.getOperationStorageKey(targetUserId)
					if (existingKeys.includes(key)) return
					const legacy = state.records[targetUserId]
					const phase = blockedIds.has(targetUserId) || (legacy && legacy.expired)
						? OPERATION_PHASES.blockedOnly
						: OPERATION_PHASES.cleanupOnly
					try {
						const record = createOperationRecord({
							targetUserId,
							inviteCode: legacy ? legacy.inviteCode : '',
							operationId: `legacy-${Date.now().toString(36)}-${String(index++).padStart(3, '0')}`,
							phase,
							createdAt: legacy ? legacy.createdAt : Date.now()
						}, Date.now())
						this.writeAndVerifyOperationRecord(record)
					} catch (error) {
						migrationFailed = true
						issues.push(`用户 ${targetUserId} 的旧恢复状态迁移失败：${error.message || error}`)
					}
				})
				if (!issues.length && !migrationFailed) {
					uni.removeStorageSync(LEGACY_PENDING_CLEANUP_STORAGE_KEY)
					if (this.getStorageKeys().includes(LEGACY_PENDING_CLEANUP_STORAGE_KEY)) {
						issues.push('旧聚合恢复状态删除后仍然存在')
						migrationFailed = true
					}
				}
				return { issues, unsafe: state.issues.length > 0 || migrationFailed }
			},
			applyRecoveredOperationRecord(record) {
				if (record.expired || record.phase === OPERATION_PHASES.blockedOnly) {
					const message = record.expired
						? '该账号的本地安全状态已超过30天，已禁止自动清理和完整取消，请人工核对。'
						: '该账号存在已开始但未能安全确认完成的核心操作，已禁止自动清理和完整取消，请人工核对邀请关系和VIP。'
					this.setBlockedCore(record.targetUserId, message)
					return
				}
				this.setCompletedCore(record.targetUserId, {
					targetUserId: record.targetUserId,
					inviteCode: record.inviteCode,
					recovered: true,
					expired: false,
					operationRecord: record,
					cleanup: { success: false, items: [] }
				})
			},
			restorePendingCleanups() {
				const issues = []
				let keys = []
				try {
					keys = this.getStorageKeys()
					const migration = this.migrateLegacyPendingCleanups(keys)
					issues.push(...migration.issues)
					if (migration.unsafe) {
						this.operationStorageReady = false
						this.operationStorageError = '旧本地恢复状态存在无法安全识别的内容，已全局禁止完整取消操作'
					}
					keys = this.getStorageKeys()
				} catch (error) {
					console.error('枚举或迁移本地安全状态失败:', error)
					this.operationStorageReady = false
					this.operationStorageError = `本地安全状态不可用：${error.message || error}`
					issues.push(this.operationStorageError)
				}

				keys.filter(key => key.startsWith(OPERATION_STORAGE_PREFIX)).forEach(key => {
					const targetUserId = this.getOperationTargetFromKey(key)
					if (!targetUserId) {
						this.operationStorageReady = false
						this.operationStorageError = '存在无法识别用户ID的本地安全状态键，已全局禁止完整取消操作'
						issues.push(this.operationStorageError)
						return
					}
					try {
						const state = this.readOperationState(targetUserId)
						if (!state.record) {
							const message = `本地安全状态损坏：${state.issue || '未知错误'}；已禁止该账号完整取消，请人工核对。`
							this.setBlockedCore(targetUserId, message)
							issues.push(`用户 ${targetUserId}：${message}`)
							return
						}
						this.applyRecoveredOperationRecord(state.record)
					} catch (error) {
						const message = `读取本地安全状态失败：${error.message || error}；已禁止完整取消，请人工核对。`
						this.operationStorageReady = false
						this.operationStorageError = '至少一条本地安全状态无法读取，已全局禁止完整取消操作'
						this.setBlockedCore(targetUserId, message)
						issues.push(`用户 ${targetUserId}：${message}`)
					}
				})
				this.pendingCleanupIssues = Array.from(new Set(issues))
			},
			async recoverPendingCleanup(record) {
				if (!record || this.querying || this.processing) return
				const stored = this.completedCoreUsers[record.targetUserId]
				if (!stored || !stored.recovered || stored.expired || stored.targetUserId !== record.targetUserId) {
					uni.showToast({ title: '该恢复记录不可自动处理', icon: 'none' })
					return
				}
				await this.executeCleanupRetry(record.targetUserId, stored)
			},
			setCompletedCore(targetUserId, value) {
				this.$set(this.completedCoreUsers, targetUserId, value)
			},
			setBlockedCore(targetUserId, message) {
				this.$set(this.blockedCoreUsers, targetUserId, message)
			},
			isCoreOperationLocked(targetUserId) {
				return Boolean(
					targetUserId &&
					(!this.operationStorageReady || this.completedCoreUsers[targetUserId] || this.blockedCoreUsers[targetUserId])
				)
			},
			getCoreOperationLockMessage(targetUserId) {
				if (!this.operationStorageReady) return this.operationStorageError || '本地安全状态不可用，已禁止完整取消操作。'
				if (this.blockedCoreUsers[targetUserId]) return this.blockedCoreUsers[targetUserId]
				const completed = this.completedCoreUsers[targetUserId]
				if (completed && completed.cleanup && !completed.cleanup.success) {
					return '邀请关系和VIP核心操作已完成。为避免误伤之后新购买的VIP，现在只能使用“仅重试0元记录清理”。'
				}
				return '该账号的核心操作已在本页面完成，不能重复取消VIP。'
			},
			createResult(type, title, message, cleanup) {
				return {
					type,
					title,
					message,
					cleanupItems: cleanup ? cleanup.items : []
				}
			},
			applyCleanupRemainingCounts(cleanup) {
				const nextCounts = Object.assign({}, this.zeroAmountCounts)
				const items = cleanup && Array.isArray(cleanup.items) ? cleanup.items : []
				items.forEach(item => {
					if (!item || (item.key !== CLEANUP_KEYS.vipChanges && item.key !== CLEANUP_KEYS.paymentOrders)) return
					if (Number.isSafeInteger(item.remaining) && item.remaining >= 0) {
						nextCounts[item.key] = item.remaining
					}
				})
				this.zeroAmountCounts = nextCounts
			},
			async cancelInviter() {
				if (!this.targetUser || this.isCoreOperationLocked(this.targetUser._id)) return

				const targetSnapshot = Object.assign({}, this.targetUser)
				const targetUserId = targetSnapshot._id
				const inviteCode = targetSnapshot.my_invite_code
				let operationContext = null

				this.processing = true
				this.lastResult = null
				uni.showLoading({
					title: '正在处理...',
					mask: true
				})

				try {
					operationContext = this.beginCoreOperation(targetSnapshot)
					this.setBlockedCore(targetUserId, '完整取消操作已开始并写入本地安全锁；完成前禁止重复执行。')
					const workflowResult = await runCancellationWorkflow(
						this.createWorkflowOperations(operationContext),
						targetSnapshot,
						Date.now()
					)
					if (!workflowResult.coreSucceeded) {
						const core = workflowResult.core
						let coreMessage = core.message
						if (canReleaseOperationLockAfterCoreFailure(core)) {
							try {
								this.removeAndVerifyOperationRecord(operationContext.record, OPERATION_PHASES.blockedOnly)
								this.$delete(this.blockedCoreUsers, targetUserId)
							} catch (error) {
								const warning = `；本地安全锁未能安全移除（${error.message || error}），已禁止再次完整操作，请人工核对`
								coreMessage += warning
								this.setBlockedCore(targetUserId, coreMessage)
							}
						} else if (core.stage === 'relations') {
							const blockedMessage = '邀请关系清理请求已经发出，但结果无法证明本次操作完全未修改任何关系。预先写入的本地安全锁已保留；为避免之后重新执行时误伤新购买的VIP，禁止重复完整流程，请人工核对邀请关系和VIP。'
							coreMessage = `${coreMessage}；${blockedMessage}`
							this.setBlockedCore(targetUserId, blockedMessage)
						} else {
							this.affectedCount = 0
							const blockedMessage = '邀请关系已清除，但VIP结果未能安全确认。预先写入的本地安全锁已保留；为避免误伤后来购买的VIP，禁止重复执行完整流程，请人工核对账号当前VIP状态。'
							this.setBlockedCore(targetUserId, blockedMessage)
						}
						this.lastResult = this.createResult(
							'error',
							core.stage === 'vip' ? '核心操作部分完成' : '处理失败',
							coreMessage,
							null
						)
						uni.showModal({
							title: this.lastResult.title,
							content: coreMessage,
							showCancel: false
						})
						return
					}

					const core = workflowResult.core
					this.affectedCount = 0
					this.targetUser = Object.assign({}, this.targetUser, core.latestUser)
					if (!workflowResult.cleanup) {
						const blockedMessage = `邀请关系和VIP核心操作已完成，但无法把本地安全状态切换为仅清理模式（${workflowResult.recoveryStateError || '未知错误'}）。为避免误操作，未删除0元记录且已禁止再次完整取消，请人工核对。`
						this.setBlockedCore(targetUserId, blockedMessage)
						this.lastResult = this.createResult(
							'error',
							'核心操作完成，安全状态切换失败',
							blockedMessage,
							null
						)
						return
					}
					this.applyCleanupRemainingCounts(workflowResult.cleanup)
					this.$delete(this.blockedCoreUsers, targetUserId)
					this.setCompletedCore(targetUserId, {
						targetUserId,
						inviteCode,
						operationRecord: operationContext.record,
						cleanup: workflowResult.cleanup
					})

					if (workflowResult.cleanup.success) {
						let recoveryCleanupWarning = ''
						try {
							this.removeAndVerifyOperationRecord(operationContext.record, OPERATION_PHASES.cleanupOnly)
						} catch (error) {
							recoveryCleanupWarning = `；但本地仅清理状态清除失败：${error.message || error}，刷新后仍会显示安全重试入口`
						}
						this.lastResult = this.createResult(
							'success',
							'处理成功',
							`邀请码 ${inviteCode} 对应账号的邀请关系已清空、VIP已取消，两张表的数字0元记录均已复核为0${recoveryCleanupWarning}。`,
							workflowResult.cleanup
						)
						uni.showToast({
							title: '处理成功',
							icon: 'success'
						})
					} else {
						this.lastResult = this.createResult(
							'error',
							'核心操作成功，0元记录清理未完成',
							'邀请关系已清空且VIP状态已回读确认。本地状态已切换为仅清理模式；未完成的0元记录只能使用下方专用按钮重试，不会再次清理邀请关系或取消VIP。',
							workflowResult.cleanup
						)
					}
				} catch (error) {
					console.error('取消邀请人失败:', error)
					if (operationContext && operationContext.record) {
						this.setBlockedCore(targetUserId, '操作在未知阶段异常中断，预先写入的本地安全锁已保留；禁止再次完整取消，请人工核对邀请关系和VIP。')
					}
					this.lastResult = this.createResult(
						'error',
						'处理失败',
						error.message || '操作失败，请重新查询当前状态后再处理',
						null
					)
					uni.showModal({
						title: '处理失败',
						content: this.lastResult.message,
						showCancel: false
					})
				} finally {
					this.processing = false
					uni.hideLoading()
				}
			},
			async retryZeroAmountCleanup() {
				if (!this.targetUser || !this.canRetryCleanup || this.querying || this.processing) return

				const targetUserId = this.targetUser._id
				const completed = this.completedCoreUsers[targetUserId]
				await this.executeCleanupRetry(targetUserId, completed)
			},
			async executeCleanupRetry(targetUserId, completed) {
				if (!completed || !completed.operationRecord || completed.expired || this.processing) return
				const operationContext = { record: completed.operationRecord }

				this.processing = true
				uni.showLoading({
					title: '正在复核清理...',
					mask: true
				})

				try {
					this.assertOperationContext(operationContext, OPERATION_PHASES.cleanupOnly)
					const cleanup = await cleanupZeroAmountRecords(
						this.createCleanupOperations(),
						targetUserId
					)
					this.setCompletedCore(targetUserId, Object.assign({}, completed, {
						operationRecord: operationContext.record,
						cleanup
					}))
					if (this.targetUser && this.targetUser._id === targetUserId) {
						this.applyCleanupRemainingCounts(cleanup)
					}
					let recoveryCleanupWarning = ''
					if (cleanup.success) {
						try {
							this.removeAndVerifyOperationRecord(operationContext.record, OPERATION_PHASES.cleanupOnly)
						} catch (error) {
							recoveryCleanupWarning = `；但本地仅清理状态清除失败：${error.message || error}，刷新后仍会显示安全重试入口`
						}
					}
					this.lastResult = this.createResult(
						cleanup.success ? 'success' : 'error',
						cleanup.success ? '0元记录清理完成' : '0元记录仍未清理完成',
						cleanup.success
							? `原用户ID ${targetUserId} 的两张表均已最终复核为0；本次重试没有查询邀请码、清理邀请关系或取消VIP${recoveryCleanupWarning}。`
							: `原用户ID ${targetUserId} 仍有0元记录未完成清理；可继续仅重试0元记录清理，不会查询邀请码或执行核心操作。`,
						cleanup
					)
				} catch (error) {
					console.error('重试0元记录清理失败:', error)
					this.lastResult = this.createResult(
						'error',
						'0元记录清理失败',
						error.message || '无法执行0元记录清理，请稍后重试',
						completed.cleanup
					)
				} finally {
					this.processing = false
					uni.hideLoading()
				}
			},
			formatCleanupResult(item) {
				if (item.success) {
					return item.removeError
						? `删除请求曾返回异常（${item.removeError}），但最终复核无残留，按成功处理。`
						: '最终复核无残留。'
				}
				if (!item.verified) {
					return `无法完成最终复核：${item.countError || '未知错误'}${item.removeError ? `；删除请求异常：${item.removeError}` : ''}`
				}
				return `最终仍有 ${item.remaining} 条数字0元记录${item.removeError ? `；删除请求异常：${item.removeError}` : ''}`
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

	.recovery-box {
		display: flex;
		flex-direction: column;
		padding: 12px;
		margin-bottom: 18px;
		color: #c45656;
		background-color: #fef0f0;
		border: 1px solid #fde2e2;
		border-radius: 4px;
	}

	.recovery-title {
		margin-bottom: 8px;
		font-weight: 600;
	}

	.recovery-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 8px;
		border-top: 1px solid #fde2e2;
	}

	.recovery-row + .recovery-row {
		margin-top: 8px;
	}

	.recovery-row.invalid {
		color: #b88230;
		line-height: 1.6;
		background-color: #fdf6ec;
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

	.cleanup-row {
		padding: 10px 8px;
		margin-top: 4px;
		background-color: #fdf6ec;
	}

	.cleanup-count {
		font-weight: 600;
		color: #b88230;
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

	.operation-lock {
		padding: 12px;
		color: #b88230;
		line-height: 1.6;
		background-color: #fdf6ec;
		border: 1px solid #faecd8;
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

	.cleanup-results {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 12px;
	}

	.cleanup-result-row {
		display: flex;
		flex-direction: column;
		padding: 10px;
		color: #606266;
		background-color: rgba(255, 255, 255, 0.72);
		border: 1px solid #dcdfe6;
		border-radius: 4px;
	}

	.cleanup-result-row.success {
		border-color: #b3e19d;
	}

	.cleanup-result-row.error {
		border-color: #fab6b6;
	}

	.cleanup-result-title {
		margin-bottom: 3px;
		font-weight: 600;
	}

	.retry-cleanup-button {
		align-self: flex-start;
		margin: 12px 0 0;
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

		.recovery-row {
			align-items: stretch;
			flex-direction: column;
		}

		.recovery-row button {
			align-self: flex-start;
			margin: 8px 0 0;
		}
	}
</style>

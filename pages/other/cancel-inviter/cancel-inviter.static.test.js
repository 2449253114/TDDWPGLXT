const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const workspaceRoot = path.resolve(__dirname, '..', '..', '..')
const pagePath = path.join(__dirname, 'cancel-inviter.vue')
const pageSource = fs.readFileSync(pagePath, 'utf8')
const workflowSource = fs.readFileSync(path.join(__dirname, 'cancel-inviter.workflow.js'), 'utf8')
const scriptMatch = pageSource.match(/<script>([\s\S]*?)<\/script>/)

assert(scriptMatch, 'Vue script block is missing')
assert.doesNotThrow(() => {
	new Function(scriptMatch[1].replace('export default', 'return'))
}, 'Vue script contains invalid JavaScript syntax')
assert.doesNotThrow(() => new Function(workflowSource), 'Workflow helper contains invalid JavaScript syntax')
assert(!pageSource.includes('Promise.allSettled'), 'The HBuilderX-compatible page must not use Promise.allSettled')
assert(!pageSource.includes('?.'), 'The page must not use optional chaining unsupported by the current toolchain')
assert(pageSource.includes('仅重试0元记录清理'), 'Cleanup-only retry action is missing')
assert(pageSource.includes('createZeroAmountWhere(targetUserId)'), 'Both order-table operations must reuse the exact numeric-zero condition')
assert(pageSource.includes("Object.prototype.hasOwnProperty.call(targetSnapshot, 'vip_expire_date')"), 'VIP cancellation must preserve missing-vs-present expiration state')
assert(pageSource.includes('? targetSnapshot.vip_expire_date'), 'VIP cancellation must compare the confirmed expiration snapshot')
assert(pageSource.includes('this.isCoreOperationLocked(this.targetUser._id)'), 'A completed or uncertain core operation must not run again in-session')
assert(pageSource.includes("OPERATION_STORAGE_PREFIX = 'cancel-inviter-phase-v2:'"), 'Each target user needs an independent persistent phase key')
assert(pageSource.includes('getStorageInfoSync'), 'Persistent phase records must be enumerable after a page refresh')
assert(pageSource.includes('restorePendingCleanups()'), 'The page must restore unfinished cleanup-only operations')
assert(pageSource.includes('this.removeAndVerifyOperationRecord(operationContext.record, OPERATION_PHASES.cleanupOnly)'), 'Successful cleanup must remove and verify its cleanup-only marker')
assert(workflowSource.includes('PENDING_CLEANUP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000'), 'Automatic cleanup recovery must expire after 30 days')
assert(pageSource.includes('已超过30天'), 'Expired cleanup markers need a visible manual-review warning')
assert(pageSource.includes('本地待恢复记录损坏'), 'Damaged cleanup markers need a visible warning')
assert(pageSource.includes('new Set(state.blockedTargetUserIds)'), 'Recognizable users in damaged legacy state must migrate to blocked-only records')
assert(workflowSource.includes('blockedTargetUserIds: Array.from(blockedTargetUserIds).sort()'), 'Damaged recovery state must retain trustworthy user IDs as blocked-only records')

const cancelMethod = pageSource.match(/async cancelInviter\(\) \{[\s\S]*?\n\t\t\t\},\n\t\t\tasync retryZeroAmountCleanup/)
assert(cancelMethod, 'Full cancellation method is missing')
assert(
	cancelMethod[0].indexOf('this.beginCoreOperation(targetSnapshot)') < cancelMethod[0].indexOf('runCancellationWorkflow('),
	'A blocked-only phase must be persisted before the destructive workflow starts'
)
assert(cancelMethod[0].includes('canReleaseOperationLockAfterCoreFailure(core)'), 'Relationship-stage rollback must require proof that the clear request changed nothing')
assert(cancelMethod[0].includes('OPERATION_PHASES.blockedOnly'), 'A proven no-change rollback must only remove its own blocked-only phase')
assert(cancelMethod[0].includes('OPERATION_PHASES.cleanupOnly'), 'Completed cleanup must only remove its own cleanup-only phase')

const recoverMethod = pageSource.match(/async recoverPendingCleanup\(record\) \{[\s\S]*?\n\t\t\t\},\n\t\t\tsetCompletedCore/)
assert(recoverMethod, 'Persistent cleanup recovery method is missing')
assert(!recoverMethod[0].includes('queryAccount'), 'Persistent cleanup recovery must never query by the old invite code')
assert(!recoverMethod[0].includes('myInviteCode'), 'The old invite code must be display-only during recovery')
assert(recoverMethod[0].includes('this.executeCleanupRetry(record.targetUserId, stored)'), 'Recovery must bind directly to the original target user ID')

const cleanupRetryMethod = pageSource.match(/async executeCleanupRetry\(targetUserId, completed\) \{[\s\S]*?\n\t\t\t\},\n\t\t\tformatCleanupResult/)
assert(cleanupRetryMethod, 'Shared cleanup-only retry helper is missing')
assert(cleanupRetryMethod[0].includes('this.assertOperationContext(operationContext, OPERATION_PHASES.cleanupOnly)'), 'Cleanup retry must own a verified cleanup-only phase')
assert(cleanupRetryMethod[0].includes('cleanupZeroAmountRecords('), 'Shared retry must execute only the zero-amount cleanup workflow')
assert(cleanupRetryMethod[0].includes('this.createCleanupOperations()'), 'Shared retry must not receive relationship or VIP operations')
assert(!cleanupRetryMethod[0].includes('runCancellationWorkflow'), 'Cleanup recovery must never enter the full cancellation workflow')

if (process.env.VUE_TEMPLATE_COMPILER_PATH) {
	const compiler = require(process.env.VUE_TEMPLATE_COMPILER_PATH)
	const descriptor = compiler.parseComponent(pageSource)
	const compiledTemplate = compiler.compile(descriptor.template.content)
	assert.deepEqual(compiledTemplate.errors, [], `Vue template errors: ${compiledTemplate.errors.join('; ')}`)
}

if (process.env.SASS_COMPILER_PATH) {
	const sass = require(process.env.SASS_COMPILER_PATH)
	const styleMatch = pageSource.match(/<style lang="scss">([\s\S]*?)<\/style>/)
	assert(styleMatch, 'Vue SCSS block is missing')
	assert.doesNotThrow(() => sass.renderSync({ data: styleMatch[1] }), 'Vue SCSS contains invalid syntax')
}

for (const tableName of ['user-vip-changes', 'user-payment-orders']) {
	const indexes = JSON.parse(fs.readFileSync(
		path.join(workspaceRoot, 'uniCloud-aliyun', 'database', `${tableName}.index.json`),
		'utf8'
	))
	const compoundIndex = indexes.find(index => index.IndexName === 'user_id_total_fee')
	assert(compoundIndex, `${tableName} is missing user_id_total_fee index`)
	assert.deepEqual(
		compoundIndex.MgoKeySchema.MgoIndexKeys.map(key => key.Name),
		['user_id', 'total_fee'],
		`${tableName} index field order is incorrect`
	)
	assert.equal(compoundIndex.MgoKeySchema.MgoIsUnique, false, `${tableName} cleanup index must not be unique`)
}

console.log('cancel inviter static checks: ok')

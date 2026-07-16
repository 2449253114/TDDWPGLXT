const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

function commandOperation(type, value) {
	return { __mockCommand: true, type, value }
}

const command = {
	in(values) {
		return commandOperation('in', values.slice())
	},
	neq(value) {
		return commandOperation('neq', value)
	},
	and(values) {
		return commandOperation('and', values)
	},
	or(values) {
		return commandOperation('or', values)
	},
	exists(value) {
		return commandOperation('exists', value)
	},
	remove() {
		return commandOperation('remove')
	},
	gte(value) {
		return commandOperation('gte', value)
	},
	lte(value) {
		return commandOperation('lte', value)
	},
	gt(value) {
		return commandOperation('gt', value)
	}
}

function loadVueComponent(uniCloudMock, uniMock = {}) {
	const componentPath = path.join(__dirname, 'violation-invitation-v2.vue')
	const source = fs.readFileSync(componentPath, 'utf8')
	const match = source.match(/<script>([\s\S]*?)<\/script>/)
	assert(match, 'Vue component script block should exist')

	const transformed = match[1].replace(/export\s+default\s*\{/, 'module.exports = {')
	const moduleValue = { exports: {} }
	const previousUniCloud = global.uniCloud
	global.uniCloud = uniCloudMock

	try {
		const context = {
			module: moduleValue,
			exports: moduleValue.exports,
			uniCloud: uniCloudMock,
			uni: uniMock,
			console,
			setTimeout,
			clearTimeout,
			require(request) {
				if (request.startsWith('.')) return require(path.resolve(__dirname, request))
				return require(request)
			}
		}
		vm.runInNewContext(transformed, context, { filename: componentPath })
		return moduleValue.exports
	} finally {
		if (previousUniCloud === undefined) delete global.uniCloud
		else global.uniCloud = previousUniCloud
	}
}

function createDatabaseMock() {
	const inviterId = 'inviter-1'
	const rows = new Map([
		[inviterId, { _id: inviterId, inviter_uid: inviterId, my_invite_code: 'OWNER1', status: 0 }],
		['eligible-success', { _id: 'eligible-success', inviter_uid: inviterId, status: 0 }],
		['eligible-failed-verification', { _id: 'eligible-failed-verification', inviter_uid: inviterId, status: 0 }],
		['eligible-restricted', { _id: 'eligible-restricted', inviter_uid: inviterId, status: 1 }],
		['identity-guard', { _id: 'identity-guard', inviter_uid: inviterId, status: 0 }],
		['relationship-changed', { _id: 'relationship-changed', inviter_uid: 'another-inviter', status: 0 }],
		['already-banned', { _id: 'already-banned', inviter_uid: inviterId, status: 3 }],
		['second-banned', {
			_id: 'second-banned',
			inviter_uid: inviterId,
			status: 3
		}]
	])
	const calls = {
		where: [],
		update: [],
		get: [],
		doc: [],
		docUpdate: [],
		docGet: []
	}
	const docBehavior = {
		applyUpdate: true,
		updateResult: { updated: 1 },
		postUpdateReadFailures: 0
	}
	let remainingPostUpdateReadFailures = 0

	function matchesWhere(row, where) {
		return Object.keys(where || {}).every(key => {
			const condition = where[key]
			if (condition && condition.__mockCommand) {
				if (condition.type === 'in') return condition.value.includes(row[key])
				if (condition.type === 'neq') return row[key] !== condition.value
				if (condition.type === 'exists') {
					const exists = Object.prototype.hasOwnProperty.call(row, key) && row[key] !== undefined
					return condition.value ? exists : !exists
				}
				throw new Error(`Unsupported mock command: ${condition.type}`)
			}
			return row[key] === condition
		})
	}

	class Query {
		constructor(where) {
			this.whereValue = where
			this.fieldValue = null
		}

		field(value) {
			this.fieldValue = value
			return this
		}

		async get() {
			calls.get.push({ where: this.whereValue, field: this.fieldValue })
			if (
				this.whereValue &&
				this.whereValue._id === inviterId &&
				remainingPostUpdateReadFailures > 0
			) {
				remainingPostUpdateReadFailures--
				throw new Error('simulated post-write read failure')
			}
			const data = Array.from(rows.values())
				.filter(row => matchesWhere(row, this.whereValue))
				.map(row => ({ ...row }))
			return { result: { data } }
		}

		async update(data) {
			calls.update.push({ where: this.whereValue, data })
			const matchingRows = Array.from(rows.values()).filter(row => matchesWhere(row, this.whereValue))
			const isInviterUpdate = this.whereValue && this.whereValue._id === inviterId
			if (isInviterUpdate) remainingPostUpdateReadFailures = docBehavior.postUpdateReadFailures
			matchingRows.forEach(row => {
				if (isInviterUpdate && !docBehavior.applyUpdate) return
				// Simulate a partial/ineffective write for one account so the post-write
				// verification path has both an explicit success and failure to classify.
				if (row._id === 'eligible-failed-verification' && data.status === 3) return
				Object.keys(data).forEach(key => {
					const value = data[key]
					if (value && value.__mockCommand && value.type === 'remove') {
						delete row[key]
					} else {
						row[key] = value
					}
				})
			})
			return isInviterUpdate
				? { result: { ...docBehavior.updateResult } }
				: { result: { updated: matchingRows.length } }
		}
	}

	const collection = {
		where(where) {
			calls.where.push(where)
			return new Query(where)
		},
		doc(id) {
			calls.doc.push(id)
			return {
				async update(data) {
					calls.docUpdate.push({ id, data })
					const row = rows.get(id)
					if (row && docBehavior.applyUpdate) row.status = data.status
					return { result: { ...docBehavior.updateResult } }
				},
				field(fields) {
					return {
						async get() {
							calls.docGet.push({ id, fields })
							const row = rows.get(id)
							return { result: { data: row ? [{ _id: row._id, status: row.status }] : [] } }
						}
					}
				}
			}
		}
	}

	return {
		inviterId,
		calls,
		docBehavior,
		rows,
		uniCloud: {
			database() {
				return {
					command,
					collection() {
						return collection
					}
				}
			}
		}
	}
}

async function run() {
	const databaseMock = createDatabaseMock()
	const component = loadVueComponent(databaseMock.uniCloud)
	assert(component.methods && typeof component.methods.processBanChunk === 'function', 'processBanChunk should be directly testable')
	assert.strictEqual(component.computed.inviteeActionsReady.call({
		queryComplete: true,
		relationshipVerified: true,
		inviter: { _id: databaseMock.inviterId, missing: false }
	}), true)
	assert.strictEqual(component.computed.inviteeActionsReady.call({
		queryComplete: true,
		relationshipVerified: false,
		inviter: { _id: databaseMock.inviterId, missing: false }
	}), false)

	const accountById = {
		'inviter-1': { _id: 'inviter-1', my_invite_code: 'OWNER1' },
		'eligible-success': { _id: 'eligible-success', my_invite_code: 'GOOD01' },
		'eligible-failed-verification': { _id: 'eligible-failed-verification', my_invite_code: 'FAIL01' },
		'eligible-restricted': { _id: 'eligible-restricted', my_invite_code: 'LIMIT1' },
		'identity-guard': { _id: 'identity-guard', my_invite_code: 'GUARD1' },
		'relationship-changed': { _id: 'relationship-changed', my_invite_code: 'MOVED1' },
		'already-banned': { _id: 'already-banned', my_invite_code: 'BAN001' },
		'second-banned': { _id: 'second-banned', my_invite_code: 'PART01' },
		'missing-account': { _id: 'missing-account', my_invite_code: 'MISS01' }
	}
	const host = {
		accountById,
		banResult: { success: [], skipped: [], failed: [] },
		getErrorMessage(error) {
			return error && error.message ? error.message : String(error)
		}
	}
	Object.keys(component.methods).forEach(name => {
		host[name] = component.methods[name].bind(host)
	})

	const requestedIds = [
		databaseMock.inviterId,
		'eligible-success',
		'eligible-failed-verification',
		'relationship-changed',
		'already-banned',
		'missing-account'
	]
	const inviteeBanTarget = {
		inviterId: databaseMock.inviterId,
		inviteCodeExists: true,
		inviteCode: 'OWNER1',
		inviteCodeLabel: 'OWNER1'
	}
	await host.processBanChunk(requestedIds, inviteeBanTarget)

	assert.strictEqual(databaseMock.calls.update.length, 1, 'one chunk should issue exactly one batch update')
	assert.strictEqual(databaseMock.calls.doc.length, 0, 'invitee banning must not call collection.doc per account')

	const updateCall = databaseMock.calls.update[0]
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(updateCall.data)),
		{ status: 3 },
		'batch update must write only the existing status field and require no cloud schema changes'
	)
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(updateCall.where)),
		{
			_id: commandOperation('in', ['eligible-success', 'eligible-failed-verification']),
			inviter_uid: databaseMock.inviterId,
			status: 0
		},
		'batch update must constrain IDs, current inviter relationship, and exact snapshotted status together'
	)

	assert.deepStrictEqual(host.banResult.success.map(item => item.id), ['eligible-success'])
	assert.deepStrictEqual(host.banResult.failed.map(item => item.id), ['eligible-failed-verification'])
	assert.deepStrictEqual(
		host.banResult.skipped.map(item => item.id).sort(),
		[databaseMock.inviterId, 'relationship-changed', 'already-banned', 'missing-account'].sort(),
		'inviter self, changed relationship, already-banned, and missing accounts should be skipped'
	)

	assert.strictEqual(databaseMock.calls.get.length, 3, 'batch flow should read the invitees and inviter identity before writing, then read invitees again')
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(databaseMock.calls.get[2].where)),
		{ _id: commandOperation('in', ['eligible-success', 'eligible-failed-verification']) },
		'post-write verification should reload every eligible account in the batch'
	)

	assert.doesNotThrow(() => host.assertInviteeOwnership([
		{ _id: 'different-own-code', inviter_uid: databaseMock.inviterId, my_invite_code: 'OTHER1' }
	], databaseMock.inviterId), 'an invitee own code must not be confused with the inviter relationship')
	assert.throws(() => host.assertInviteeOwnership([
		{ _id: 'wrong-owner', inviter_uid: 'another-inviter', my_invite_code: 'OWNER1' }
	], databaseMock.inviterId), /inviter_uid 与当前邀请人不一致/, 'a matching-looking code must never bypass inviter_uid ownership')

	// status=1 is unused by this business flow and must not participate in a
	// batch ban, even if it is selected through stale UI state.
	host.banResult = { success: [], skipped: [], failed: [] }
	const ignoredStatusUpdateStart = databaseMock.calls.update.length
	await host.processBanChunk(['eligible-restricted'], inviteeBanTarget)
	const restrictedRow = databaseMock.rows.get('eligible-restricted')
	assert.strictEqual(databaseMock.calls.update.length, ignoredStatusUpdateStart)
	assert.strictEqual(restrictedRow.status, 1)
	assert.deepStrictEqual(host.banResult.skipped.map(item => item.id), ['eligible-restricted'])

	// The recovery path is intentionally status-only: status=3 becomes status=0,
	// without writing or reading any undeployed cloud schema fields.
	host.banResult = { success: [], skipped: [], failed: [] }
	const exactUnbanUpdateStart = databaseMock.calls.update.length
	await host.processUnbanChunk(['eligible-success'], inviteeBanTarget)
	assert.strictEqual(databaseMock.calls.update.length, exactUnbanUpdateStart + 1)
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(databaseMock.calls.update[exactUnbanUpdateStart].where)),
		{
			_id: commandOperation('in', ['eligible-success']),
			inviter_uid: databaseMock.inviterId,
			status: 3
		},
		'unban must constrain ID, current inviter relationship, and exact status=3'
	)
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(databaseMock.calls.update[exactUnbanUpdateStart].data)),
		{ status: 0 },
		'unban must write only the existing status field'
	)
	assert.strictEqual(databaseMock.rows.get('eligible-success').status, 0)
	assert.strictEqual(host.banResult.success[0].restoredStatus, 0)

	// Multiple existing banned accounts are restored in one conditional update.
	host.banResult = { success: [], skipped: [], failed: [] }
	const legacyUnbanUpdateStart = databaseMock.calls.update.length
	await host.processUnbanChunk(['already-banned', 'second-banned'], inviteeBanTarget)
	assert.strictEqual(databaseMock.calls.update.length, legacyUnbanUpdateStart + 1)
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(databaseMock.calls.update[legacyUnbanUpdateStart].where)),
		{
			_id: commandOperation('in', ['already-banned', 'second-banned']),
			inviter_uid: databaseMock.inviterId,
			status: 3
		},
		'batch unban must depend only on existing account fields'
	)
	assert.strictEqual(databaseMock.rows.get('already-banned').status, 0)
	assert.strictEqual(databaseMock.rows.get('second-banned').status, 0)
	assert.deepStrictEqual(host.banResult.success.map(item => item.id), ['already-banned', 'second-banned'])
	assert.deepStrictEqual(host.banResult.skipped, [])

	// Exercise the public batch-unban entry point, including local reconciliation,
	// selection cleanup, and the final result popup. This is the recovery path an
	// operator uses for mistakenly banned accounts.
	databaseMock.rows.set('already-banned', {
		_id: 'already-banned',
		inviter_uid: databaseMock.inviterId,
		status: 3
	})
	const batchUnbanHost = {
		busy: false,
		inviteeActionsReady: true,
		queryComplete: true,
		relationshipVerified: true,
		isBanning: false,
		inviter: { _id: databaseMock.inviterId, my_invite_code: 'OWNER1', status: 0 },
		invitedUsers: [{
			_id: 'already-banned',
			inviter_uid: databaseMock.inviterId,
			my_invite_code: 'BAN001',
			status: 3
		}],
		accountById: {
			'already-banned': {
				_id: 'already-banned',
				inviter_uid: databaseMock.inviterId,
				my_invite_code: 'BAN001',
				status: 3
			}
		},
		selectedUserIds: { 'already-banned': true },
		banResult: { success: [], skipped: [], failed: [] },
		failedUserIds: [],
		loadWarning: '',
		$set(target, key, value) { target[key] = value },
		$delete(target, key) { delete target[key] },
		setTask(message, metrics, error) { this.lastTask = { message, metrics, error } },
		syncVisibleSelection() {},
		openBanResult() { this.resultOpened = true },
		applyAccountAnalysis(users) {
			this.invitedUsers = users
			this.accountById = Object.fromEntries(users.map(user => [user._id, user]))
		},
		updateDiscoveryDetailCache() {}
	}
	Object.keys(component.methods).forEach(name => {
		if (!Object.prototype.hasOwnProperty.call(batchUnbanHost, name)) {
			batchUnbanHost[name] = component.methods[name].bind(batchUnbanHost)
		}
	})
	await batchUnbanHost.executeBatchUnban(['already-banned'])
	assert.strictEqual(databaseMock.rows.get('already-banned').status, 0)
	assert.strictEqual(batchUnbanHost.invitedUsers[0].status, 0, 'successful unban must immediately reconcile the visible row to normal')
	assert.strictEqual(batchUnbanHost.selectedUserIds['already-banned'], undefined, 'successful unban must clear the stale selection')
	assert.strictEqual(batchUnbanHost.failedUserIds.length, 0)
	assert.deepStrictEqual(JSON.parse(JSON.stringify(batchUnbanHost.banResult.success.map(item => item.id))), ['already-banned'])
	assert.strictEqual(batchUnbanHost.resultOpened, true)
	assert.match(batchUnbanHost.lastTask.message, /解封完成：成功 1，跳过 0，失败 0/)

	const identityGuardUpdateStart = databaseMock.calls.update.length
	databaseMock.rows.get(databaseMock.inviterId).my_invite_code = 'CHANGED'
	await assert.rejects(
		host.processBanChunk(['identity-guard'], inviteeBanTarget),
		error => error && error.inviteeBanContextInvalid && /邀请码已发生变化/.test(error.message)
	)
	assert.strictEqual(databaseMock.calls.update.length, identityGuardUpdateStart, 'invitee banning must stop before writing when inviter identity changes')
	assert.strictEqual(databaseMock.rows.get('identity-guard').status, 0)
	assert(host.banResult.failed.some(item => item.id === 'identity-guard' && item.reason.includes('邀请码已发生变化')))
	databaseMock.rows.get(databaseMock.inviterId).my_invite_code = 'OWNER1'

	const staleContextHost = {
		busy: false,
		inviteeActionsReady: true,
		queryComplete: true,
		relationshipVerified: true,
		isBanning: false,
		inviter: { _id: databaseMock.inviterId, my_invite_code: 'OWNER1', status: 0 },
		invitedUsers: [{ _id: 'identity-guard', inviter_uid: databaseMock.inviterId, my_invite_code: 'GUARD1', status: 0 }],
		accountById: {
			'identity-guard': { _id: 'identity-guard', inviter_uid: databaseMock.inviterId, my_invite_code: 'GUARD1', status: 0 }
		},
		selectedUserIds: { 'identity-guard': true },
		banResult: { success: [], skipped: [], failed: [] },
		failedUserIds: [],
		loadWarning: '',
		$set(target, key, value) { target[key] = value },
		$delete(target, key) { delete target[key] },
		setTask(message, metrics, error) { this.lastTask = { message, metrics, error } },
		syncVisibleSelection() {},
		openBanResult() { this.resultOpened = true },
		applyAccountAnalysis() {},
		updateDiscoveryDetailCache() {}
	}
	Object.keys(component.methods).forEach(name => {
		if (!Object.prototype.hasOwnProperty.call(staleContextHost, name)) {
			staleContextHost[name] = component.methods[name].bind(staleContextHost)
		}
	})
	databaseMock.rows.get(databaseMock.inviterId).my_invite_code = 'CHANGED'
	const staleContextUpdateStart = databaseMock.calls.update.length
	const originalConsoleErrorForContext = console.error
	console.error = () => {}
	try {
		await staleContextHost.executeBatchBan(['identity-guard'])
	} finally {
		console.error = originalConsoleErrorForContext
		databaseMock.rows.get(databaseMock.inviterId).my_invite_code = 'OWNER1'
	}
	assert.strictEqual(databaseMock.calls.update.length, staleContextUpdateStart, 'stale inviter identity must stop the whole batch before writing')
	assert.strictEqual(staleContextHost.queryComplete, false)
	assert.strictEqual(staleContextHost.relationshipVerified, false)
	assert.match(staleContextHost.loadWarning, /已停止后续封禁/)
	assert.deepStrictEqual(JSON.parse(JSON.stringify(staleContextHost.banResult.failed.map(item => item.id))), ['identity-guard'])
	assert.strictEqual(staleContextHost.resultOpened, true)

	let modalOptions = null
	const inviterComponent = loadVueComponent(databaseMock.uniCloud, {
		showModal(options) {
			modalOptions = options
		},
		showToast() {}
	})
	let updatedDiscoveryStatus = null
	let inviterRiskRecomputeCount = 0
	let autoBaselineCount = 0
	const inviterHost = {
		inviter: null,
		invitedUsers: [],
		busy: false,
		queryComplete: false,
		isBanning: false,
		baselineWritable: true,
		baselineWarning: '',
		$set(target, key, value) {
			target[key] = value
		},
		setTask(message, metrics, error) {
			this.lastTask = { message, metrics, error }
		},
		updateDiscoveryInviterStatus(id, status) {
			updatedDiscoveryStatus = { id, status }
		},
		applyAccountAnalysis(users) {
			assert.strictEqual(users, this.invitedUsers)
			inviterRiskRecomputeCount++
		},
		async autoBaselineBannedInviter() {
			autoBaselineCount++
			return { eligible: false, saved: false }
		},
		getErrorMessage(error) {
			return error && error.message ? error.message : String(error)
		}
	}
	;[
		'isBannedStatus',
		'getStatusText',
		'getInviterInviteCodeIdentity',
		'resolveInviterBanTarget',
		'readInviterBanAccount',
		'readBackInviterStatusAccount',
		'validateInviterBanAccount',
		'applyInviterStatusToView',
		'applyInviterBanSuccess',
		'applyInviterUnbanSuccess',
		'confirmInviterStatusChange',
		'confirmBanInviter',
		'confirmUnbanInviter'
	].forEach(name => {
		inviterHost[name] = inviterComponent.methods[name].bind(inviterHost)
	})
	const scanItem = {
		inviterId: databaseMock.inviterId,
		inviter: { _id: databaseMock.inviterId, my_invite_code: 'OWNER1', status: 0 }
	}
	inviterHost.confirmBanInviter({
		inviterId: databaseMock.inviterId,
		inviter: { _id: 'another-account', my_invite_code: 'OWNER1', status: 0 }
	})
	assert.strictEqual(modalOptions, null, 'a mismatched row ID and embedded inviter ID must be rejected before confirmation')

	// status=1 is outside this workflow for inviter accounts as well. A stale
	// status=0 screen must still stop before writing when the fresh read is 1.
	databaseMock.rows.get(databaseMock.inviterId).status = 0
	modalOptions = null
	const ignoredInviterUpdateStart = databaseMock.calls.update.length
	inviterHost.confirmBanInviter(scanItem)
	databaseMock.rows.get(databaseMock.inviterId).status = 1
	const originalStatusOneConsoleError = console.error
	console.error = () => {}
	try {
		await modalOptions.success({ confirm: true })
	} finally {
		console.error = originalStatusOneConsoleError
	}
	assert.strictEqual(databaseMock.calls.update.length, ignoredInviterUpdateStart)
	assert.strictEqual(databaseMock.rows.get(databaseMock.inviterId).status, 1)
	assert.match(inviterHost.lastTask.message, /无法安全封禁/)
	databaseMock.rows.get(databaseMock.inviterId).status = 0

	// The inviter action is independent from opening or completely loading invitee detail.
	databaseMock.rows.get(databaseMock.inviterId).status = 0
	databaseMock.docBehavior.applyUpdate = false
	databaseMock.docBehavior.updateResult = { updated: 1 }
	const failedUpdateStart = databaseMock.calls.update.length
	const failedReadStart = databaseMock.calls.get.length
	inviterHost.confirmBanInviter(scanItem)
	assert(modalOptions && typeof modalOptions.success === 'function', 'scan rows must allow inviter banning with no open detail and queryComplete=false')
	const originalConsoleError = console.error
	console.error = () => {}
	try {
		await modalOptions.success({ confirm: true })
	} finally {
		console.error = originalConsoleError
	}
	assert.strictEqual(databaseMock.calls.update.length, failedUpdateStart + 1, 'inviter banning should issue one conditional update')
	assert.strictEqual(databaseMock.calls.get.length, failedReadStart + 2, 'inviter banning must freshly read before and after its write')
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(databaseMock.calls.update[failedUpdateStart].where)),
		{
			_id: databaseMock.inviterId,
			my_invite_code: 'OWNER1',
			status: 0
		},
		'inviter update must constrain ID, invite-code identity, and exact status=0 together'
	)
	assert.strictEqual(databaseMock.rows.get(databaseMock.inviterId).status, 0, 'a positive update count must not bypass inviter status readback')
	assert.strictEqual(updatedDiscoveryStatus, null, 'failed readback must not update discovery state or baseline')
	assert.strictEqual(inviterRiskRecomputeCount, 0, 'failed inviter readback must not recompute risk as if the ban succeeded')
	assert.strictEqual(autoBaselineCount, 0, 'failed inviter readback must not write a local baseline')
	assert.strictEqual(inviterHost.lastTask.error, true)
	assert.strictEqual(databaseMock.calls.docUpdate.length, 0, 'independent inviter banning must never use an unconditional document update')

	// A write may succeed while every immediate readback fails. This is an
	// indeterminate result, not a definite failure and must not invite a blind retry.
	databaseMock.docBehavior.applyUpdate = true
	databaseMock.docBehavior.postUpdateReadFailures = 3
	databaseMock.rows.get(databaseMock.inviterId).status = 0
	modalOptions = null
	updatedDiscoveryStatus = null
	const uncertainReadStart = databaseMock.calls.get.length
	inviterHost.confirmBanInviter(scanItem)
	console.error = () => {}
	try {
		await modalOptions.success({ confirm: true })
	} finally {
		console.error = originalConsoleError
	}
	assert.strictEqual(databaseMock.rows.get(databaseMock.inviterId).status, 3, 'the fixture must model a committed write with failed readback')
	assert.strictEqual(databaseMock.calls.get.length, uncertainReadStart + 4, 'the flow must read once before writing and retry readback three times')
	assert.strictEqual(updatedDiscoveryStatus, null, 'unconfirmed writes must not be published as confirmed UI state')
	assert.strictEqual(inviterHost.lastTask.metrics.metricText, '结果待确认')
	assert.strictEqual(modalOptions.title, '封禁结果待确认')
	assert.ok(modalOptions.content.includes('不要立即重复操作'))
	databaseMock.docBehavior.postUpdateReadFailures = 0

	// Successful scan-row action updates discovery/cache state without requiring a current detail.
	databaseMock.docBehavior.applyUpdate = true
	databaseMock.rows.get(databaseMock.inviterId).status = 0
	modalOptions = null
	updatedDiscoveryStatus = null
	inviterHost.confirmBanInviter(scanItem)
	const successReadStart = databaseMock.calls.get.length
	await modalOptions.success({ confirm: true })
	assert.strictEqual(databaseMock.rows.get(databaseMock.inviterId).status, 3)
	assert.deepStrictEqual(updatedDiscoveryStatus, { id: databaseMock.inviterId, status: 3 })
	assert.strictEqual(databaseMock.calls.get.length, successReadStart + 2, 'successful inviter banning must also read before and after the write')
	assert.strictEqual(inviterRiskRecomputeCount, 0, 'a different or unopened detail must not be recomputed')
	assert.strictEqual(autoBaselineCount, 1, 'successful inviter banning must run automatic local-baseline handling')
	modalOptions = null
	const concurrentBanUpdateStart = databaseMock.calls.update.length
	inviterHost.confirmBanInviter(scanItem)
	await modalOptions.success({ confirm: true })
	assert.strictEqual(databaseMock.calls.update.length, concurrentBanUpdateStart, 'a freshly read already-banned inviter must not be written again')

	// Inviter recovery is the exact inverse transition and keeps the review
	// baseline untouched; it must never affect invitees.
	const bannedScanItem = {
		inviterId: databaseMock.inviterId,
		inviter: { _id: databaseMock.inviterId, my_invite_code: 'OWNER1', status: 3 }
	}
	modalOptions = null
	updatedDiscoveryStatus = null
	const inviterUnbanUpdateStart = databaseMock.calls.update.length
	const autoBaselineBeforeUnban = autoBaselineCount
	inviterHost.confirmUnbanInviter(bannedScanItem)
	assert.strictEqual(modalOptions.title, '确认解封邀请人')
	assert.ok(modalOptions.content.includes('已审核状态会继续保留'))
	await modalOptions.success({ confirm: true })
	assert.strictEqual(databaseMock.calls.update.length, inviterUnbanUpdateStart + 1)
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(databaseMock.calls.update[inviterUnbanUpdateStart])),
		{
			where: {
				_id: databaseMock.inviterId,
				my_invite_code: 'OWNER1',
				status: 3
			},
			data: { status: 0 }
		},
		'inviter unban must conditionally transition only the verified inviter from status=3 to status=0'
	)
	assert.strictEqual(databaseMock.rows.get(databaseMock.inviterId).status, 0)
	assert.deepStrictEqual(updatedDiscoveryStatus, { id: databaseMock.inviterId, status: 0 })
	assert.strictEqual(autoBaselineCount, autoBaselineBeforeUnban, 'unbanning must not clear or rewrite the reviewed baseline')
	assert.match(inviterHost.lastTask.message, /已审核状态和检测结果均继续保留/)

	// The same workflow updates and re-analyzes an already-open detail for this inviter.
	databaseMock.rows.get(databaseMock.inviterId).status = 0
	inviterHost.inviter = { _id: databaseMock.inviterId, my_invite_code: 'OWNER1', status: 0 }
	modalOptions = null
	inviterHost.confirmBanInviter(inviterHost.inviter)
	await modalOptions.success({ confirm: true })
	assert.strictEqual(inviterHost.inviter.status, 3)
	assert.strictEqual(inviterRiskRecomputeCount, 1, 'successful inviter banning must refresh same-IP banned counts for the open detail')

	// A changed invite-code identity is rejected before any destructive write.
	databaseMock.rows.get(databaseMock.inviterId).status = 0
	databaseMock.rows.get(databaseMock.inviterId).my_invite_code = 'CHANGED'
	inviterHost.inviter = null
	modalOptions = null
	const driftUpdateStart = databaseMock.calls.update.length
	inviterHost.confirmBanInviter(scanItem)
	console.error = () => {}
	try {
		await modalOptions.success({ confirm: true })
	} finally {
		console.error = originalConsoleError
	}
	assert.strictEqual(databaseMock.calls.update.length, driftUpdateStart, 'invite-code drift must abort before the conditional update')
	assert.strictEqual(databaseMock.rows.get(databaseMock.inviterId).status, 0)
	assert.strictEqual(inviterHost.lastTask.error, true)
	assert(inviterHost.lastTask.message.includes('邀请码已发生变化'))
	assert.strictEqual(databaseMock.calls.docUpdate.length, 0, 'no inviter workflow may write through collection.doc')

	// Legacy inviters without a my_invite_code field remain actionable, but the
	// conditional write must verify that the field is still absent.
	const inviterRow = databaseMock.rows.get(databaseMock.inviterId)
	delete inviterRow.my_invite_code
	inviterRow.status = 0
	modalOptions = null
	const missingCodeItem = {
		inviterId: databaseMock.inviterId,
		inviter: { _id: databaseMock.inviterId, status: 0 }
	}
	const missingCodeUpdateStart = databaseMock.calls.update.length
	inviterHost.confirmBanInviter(missingCodeItem)
	assert(modalOptions && modalOptions.content.includes('未设置'))
	await modalOptions.success({ confirm: true })
	assert.strictEqual(inviterRow.status, 3)
	assert.deepStrictEqual(
		JSON.parse(JSON.stringify(databaseMock.calls.update[missingCodeUpdateStart].where)),
		{
			_id: databaseMock.inviterId,
			my_invite_code: commandOperation('exists', false),
			status: 0
		},
		'a missing legacy invite-code field must be guarded with exists(false)'
	)

	const inviterOnlyUpdates = databaseMock.calls.update.filter(call => call.where._id === databaseMock.inviterId)
	assert(inviterOnlyUpdates.length > 0, 'the inviter workflow should have issued guarded inviter updates')
	assert(inviterOnlyUpdates.every(call => call.where._id === databaseMock.inviterId), 'inviter actions must never update any invitee account')
	const inviteeOnlyUpdates = databaseMock.calls.update.filter(call => call.where._id && call.where._id.type === 'in')
	assert(inviteeOnlyUpdates.every(call => call.where.inviter_uid === databaseMock.inviterId), 'every invitee action must constrain inviter_uid')

	console.log('violation invitation V2 status-only batch account actions: ok')
}

run().catch(error => {
	console.error(error)
	process.exitCode = 1
})

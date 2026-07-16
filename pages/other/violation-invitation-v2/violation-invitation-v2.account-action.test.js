const assert = require('assert')
const {
	isBannableStatus,
	isUnbannableStatus
} = require('./violation-invitation-v2.account-action.js')

assert.strictEqual(isBannableStatus(0), true)
assert.strictEqual(isBannableStatus(1), false)
assert.strictEqual(isBannableStatus(2), false)
assert.strictEqual(isBannableStatus(3), false)
assert.strictEqual(isBannableStatus('0'), false)

assert.strictEqual(isUnbannableStatus(3), true)
assert.strictEqual(isUnbannableStatus(0), false)
assert.strictEqual(isUnbannableStatus(1), false)
assert.strictEqual(isUnbannableStatus(2), false)
assert.strictEqual(isUnbannableStatus('3'), false)

console.log('violation invitation V2 status-only account actions: ok')

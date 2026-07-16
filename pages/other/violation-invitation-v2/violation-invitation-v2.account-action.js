function isBannableStatus(value) {
	return value === 0
}

function isUnbannableStatus(value) {
	return value === 3
}

module.exports = {
	isBannableStatus,
	isUnbannableStatus
}

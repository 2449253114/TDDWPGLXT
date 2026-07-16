const NORMAL_MAX = 5
const HIGH_RISK_MIN = 15

const RISK_RANK = {
	unknown: 0,
	normal: 1,
	medium: 2,
	high: 3
}

function buildTimestampDisplay(normalizedTimestamp) {
	const timestamp = Number(normalizedTimestamp)
	if (!Number.isFinite(timestamp) || timestamp <= 0) {
		return { valid: false, date: '无', time: '', text: '无' }
	}

	const value = new Date(timestamp)
	if (Number.isNaN(value.getTime())) {
		return { valid: false, date: '无', time: '', text: '无' }
	}
	const pad = part => String(part).padStart(2, '0')
	const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
	const time = `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
	return { valid: true, date, time, text: `${date} ${time}` }
}

function haveSameDisplayedDate(displays) {
	if (!Array.isArray(displays) || displays.length !== 3) return false
	const first = displays[0]
	return Boolean(
		first &&
		first.valid &&
		displays.every(display => display && display.valid && display.date === first.date)
	)
}

function normalizeIpv4(value) {
	if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
		return ''
	}

	const parts = value.split('.').map(Number)
	if (parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
		return ''
	}

	return parts.join('.')
}

function compressIpv6(parts) {
	let bestStart = -1
	let bestLength = 0
	let currentStart = -1

	for (let index = 0; index <= parts.length; index++) {
		if (index < parts.length && parts[index] === '0') {
			if (currentStart === -1) currentStart = index
			continue
		}

		if (currentStart !== -1) {
			const length = index - currentStart
			if (length > bestLength) {
				bestStart = currentStart
				bestLength = length
			}
			currentStart = -1
		}
	}

	if (bestLength < 2) {
		return parts.join(':')
	}

	const before = parts.slice(0, bestStart).join(':')
	const after = parts.slice(bestStart + bestLength).join(':')
	return `${before}::${after}`
}

function normalizeIpv6(value) {
	let ip = value.toLowerCase()
	if (ip.startsWith('[') && ip.endsWith(']')) {
		ip = ip.slice(1, -1)
	}
	if (!ip || ip.includes('%') || !/^[0-9a-f:.]+$/.test(ip)) {
		return ''
	}

	if (ip.includes('.')) {
		const lastColon = ip.lastIndexOf(':')
		if (lastColon === -1) return ''
		const ipv4 = normalizeIpv4(ip.slice(lastColon + 1))
		if (!ipv4) return ''
		const octets = ipv4.split('.').map(Number)
		const first = ((octets[0] << 8) | octets[1]).toString(16)
		const second = ((octets[2] << 8) | octets[3]).toString(16)
		ip = `${ip.slice(0, lastColon)}:${first}:${second}`
	}

	const compressedParts = ip.split('::')
	if (compressedParts.length > 2) return ''

	const left = compressedParts[0] ? compressedParts[0].split(':') : []
	const right = compressedParts.length === 2 && compressedParts[1] ? compressedParts[1].split(':') : []
	const allParts = left.concat(right)
	if (allParts.some(part => !/^[0-9a-f]{1,4}$/.test(part))) return ''

	if (compressedParts.length === 1 && allParts.length !== 8) return ''
	if (compressedParts.length === 2 && allParts.length >= 8) return ''

	const missing = compressedParts.length === 2 ? 8 - allParts.length : 0
	const expanded = left
		.concat(Array(missing).fill('0'))
		.concat(right)
		.map(part => Number.parseInt(part, 16).toString(16))

	return expanded.length === 8 ? compressIpv6(expanded) : ''
}

function normalizeIp(value) {
	if (typeof value !== 'string') return ''
	const trimmed = value.trim()
	if (!trimmed) return ''

	const lowered = trimmed.toLowerCase()
	if (['未知', 'unknown', 'null', 'undefined', '-', '无'].includes(lowered)) {
		return ''
	}

	return normalizeIpv4(trimmed) || normalizeIpv6(trimmed)
}

function getRiskLevel(count) {
	if (count >= HIGH_RISK_MIN) return 'high'
	if (count > NORMAL_MAX) return 'medium'
	return count > 0 ? 'normal' : 'unknown'
}

function analyzeAccounts(accounts) {
	const groupMap = new Map()
	const accountMap = new Map()
	const accountIpEvidence = new Map()
	const accountIpsById = Object.create(null)
	const accountRiskById = Object.create(null)

	accounts.forEach(account => {
		if (!account || !account._id) return
		accountMap.set(account._id, account)

		const registerIp = normalizeIp(account.register_ip)
		const loginIp = normalizeIp(account.login_ip)
		const ips = Array.from(new Set([registerIp, loginIp].filter(Boolean)))
		accountIpEvidence.set(account._id, { registerIp, loginIp })
		accountIpsById[account._id] = ips
		accountRiskById[account._id] = 'unknown'

		ips.forEach(ip => {
			if (!groupMap.has(ip)) groupMap.set(ip, new Set())
			groupMap.get(ip).add(account._id)
		})
	})

	const groups = Array.from(groupMap.entries()).map(([ip, idSet]) => {
		const allIds = Array.from(idSet)
		const riskLevel = getRiskLevel(allIds.length)
		let registerMatchCount = 0
		let loginMatchCount = 0
		let bothMatchCount = 0
		let bannedCount = 0

		allIds.forEach(id => {
			const account = accountMap.get(id)
			const evidence = accountIpEvidence.get(id)
			const registerMatches = evidence.registerIp === ip
			const loginMatches = evidence.loginIp === ip
			if (registerMatches) registerMatchCount++
			if (loginMatches) loginMatchCount++
			if (registerMatches && loginMatches) bothMatchCount++
			if (Number(account.status) === 3) bannedCount++

			if (RISK_RANK[riskLevel] > RISK_RANK[accountRiskById[id]]) {
				accountRiskById[id] = riskLevel
			}
		})

		return {
			ip,
			count: allIds.length,
			riskLevel,
			allIds,
			selectableIds: allIds.filter(id => Number(accountMap.get(id).status) === 0),
			bannedIds: allIds.filter(id => Number(accountMap.get(id).status) === 3),
			bannedCount,
			registerMatchCount,
			loginMatchCount,
			bothMatchCount
		}
	})

	groups.sort((left, right) => {
		const rankDifference = RISK_RANK[right.riskLevel] - RISK_RANK[left.riskLevel]
		if (rankDifference !== 0) return rankDifference
		if (right.count !== left.count) return right.count - left.count
		return left.ip.localeCompare(right.ip)
	})

	const summary = {
		normalIpCount: 0,
		mediumIpCount: 0,
		highIpCount: 0,
		unknownAccountCount: 0
	}

	groups.forEach(group => {
		summary[`${group.riskLevel}IpCount`]++
	})
	summary.unknownAccountCount = Object.keys(accountRiskById)
		.filter(id => accountRiskById[id] === 'unknown')
		.length

	return {
		groups,
		accountIpsById,
		accountRiskById,
		summary
	}
}

function analyzeInviterIpAccounts(inviter, invitees) {
	const inviterId = inviter && inviter._id !== undefined && inviter._id !== null
		? String(inviter._id)
		: ''
	const accounts = []
	if (inviterId && inviter && typeof inviter === 'object' && !inviter.missing) {
		accounts.push(inviter)
	}
	;(Array.isArray(invitees) ? invitees : []).forEach(account => {
		if (!account || account._id === undefined || account._id === null) return
		if (inviterId && String(account._id) === inviterId) return
		accounts.push(account)
	})

	const analysis = analyzeAccounts(accounts)
	const groups = analysis.groups.map(group => {
		const includesInviter = Boolean(
			inviterId && group.allIds.some(id => String(id) === inviterId)
		)
		return {
			...group,
			includesInviter,
			selectableIds: group.selectableIds.filter(id => String(id) !== inviterId),
			bannedIds: group.bannedIds.filter(id => String(id) !== inviterId)
		}
	})
	return {
		...analysis,
		groups
	}
}

function chunkArray(items, size) {
	const chunkSize = Math.max(1, Number(size) || 1)
	const chunks = []
	for (let index = 0; index < items.length; index += chunkSize) {
		chunks.push(items.slice(index, index + chunkSize))
	}
	return chunks
}

module.exports = {
	NORMAL_MAX,
	HIGH_RISK_MIN,
	buildTimestampDisplay,
	haveSameDisplayedDate,
	normalizeIp,
	getRiskLevel,
	analyzeAccounts,
	analyzeInviterIpAccounts,
	chunkArray
}

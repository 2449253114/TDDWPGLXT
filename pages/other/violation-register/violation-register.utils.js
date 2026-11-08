/**
 * 违规注册检测的纯函数：按注册 IP 分组、风险分级、统计、筛选与分页。
 * 不访问数据库、不依赖 uni / uniCloud，便于用 node 直接测试。
 * IP 规范化与风险阈值直接复用违规邀请 v2，保证两个页面口径一致。
 */
const {
	normalizeIp,
	getRiskLevel,
	NORMAL_MAX,
	HIGH_RISK_MIN
} = require('../violation-invitation-v2/violation-invitation-v2.utils.js')

/** 同一注册 IP 至少有多少个账号才列为分组。 */
const MIN_GROUP_SIZE = 2

/** 分组排序和筛选使用的风险权重，数值越大越危险。 */
const GROUP_RISK_RANK = {
	normal: 1,
	medium: 2,
	high: 3
}

/**
 * 风险筛选项。
 * - mediumHigh：只看中、高风险分组，默认值，日常排查用；
 * - high：只看高风险分组，处理最严重的批量注册；
 * - all：看全部同 IP 分组（≥2 个账号），用于核对低风险组。
 */
const RISK_FILTERS = {
	mediumHigh: group => group.riskLevel === 'medium' || group.riskLevel === 'high',
	high: group => group.riskLevel === 'high',
	all: () => true
}

/** 把 _id、inviter_uid 等关联字段统一成字符串；空值返回空串。 */
function toIdString(value) {
	if (value === undefined || value === null) return ''
	return String(value).trim()
}

/** 注册时间转成毫秒数字；数据库里该字段是毫秒 timestamp，异常值按 0 处理并排在最后。 */
function toTimestamp(value) {
	const numeric = Number(value)
	return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

/**
 * 分组内账号排序：注册时间倒序，时间相同按 _id 倒序，保证结果稳定。
 * @param {Map} accountIndex - buildRegisterIpGroups 返回的账号索引
 */
function compareAccountsByRegisterDateDesc(accountIndex) {
	return (leftId, rightId) => {
		const difference = accountIndex.get(rightId).registerDate - accountIndex.get(leftId).registerDate
		if (difference !== 0) return difference
		return leftId < rightId ? 1 : leftId > rightId ? -1 : 0
	}
}

/**
 * 分组排序：风险高的在前；同风险时有邀请人的在前（邀请奖励刷号是主要处置对象）；
 * 再按账号数倒序；最后按 IP 字典序，保证每次检测顺序一致。
 */
function compareGroups(left, right) {
	const rankDifference = GROUP_RISK_RANK[right.riskLevel] - GROUP_RISK_RANK[left.riskLevel]
	if (rankDifference !== 0) return rankDifference
	if (left.hasInviter !== right.hasInviter) return left.hasInviter ? -1 : 1
	if (right.count !== left.count) return right.count - left.count
	return left.ip < right.ip ? -1 : left.ip > right.ip ? 1 : 0
}

/**
 * 按规范化后的注册 IP 分组。
 * @param {Array} accounts - 扫描读到的账号，至少包含 _id、register_ip、register_date、inviter_uid、status
 * @returns {{
 *   groups: Array<{ip: string, ids: string[], count: number, riskLevel: string, inviterIds: string[], noInviterCount: number, hasInviter: boolean}>,
 *   accountIndex: Map<string, {registerDate: number, inviterId: string, selfInvited: boolean, status: number}>,
 *   scannedCount: number,
 *   invalidIpCount: number
 * }}
 * - groups 只包含账号数 ≥ MIN_GROUP_SIZE 的 IP，已按 compareGroups 排序，组内 ids 按注册时间倒序；
 * - accountIndex 只保留进入分组的账号，单独一个 IP 的账号不再保留，减少内存占用；
 * - 注册 IP 为空、"未知" 或格式非法的账号不参与分组，只计入 invalidIpCount；
 * - 同一 _id 重复出现时只计一次，以最后一次读到的数据为准；
 * - inviter_uid 等于自身 _id 的账号记为 selfInvited，按无邀请人统计。
 */
function buildRegisterIpGroups(accounts) {
	const latestById = new Map()
	;(Array.isArray(accounts) ? accounts : []).forEach(account => {
		const id = account ? toIdString(account._id) : ''
		if (id) latestById.set(id, account)
	})

	const idsByIp = new Map()
	let invalidIpCount = 0
	latestById.forEach((account, id) => {
		const ip = normalizeIp(account.register_ip)
		if (!ip) {
			invalidIpCount++
			return
		}
		if (!idsByIp.has(ip)) idsByIp.set(ip, [])
		idsByIp.get(ip).push(id)
	})

	const accountIndex = new Map()
	const groups = []
	idsByIp.forEach((ids, ip) => {
		if (ids.length < MIN_GROUP_SIZE) return
		const inviterIds = new Set()
		let noInviterCount = 0
		ids.forEach(id => {
			const account = latestById.get(id)
			const rawInviterId = toIdString(account.inviter_uid)
			// 线上存在 inviter_uid 等于自身 _id 的异常数据，自己不能算作自己的邀请人
			const selfInvited = rawInviterId === id
			const inviterId = selfInvited ? '' : rawInviterId
			accountIndex.set(id, {
				registerDate: toTimestamp(account.register_date),
				inviterId,
				selfInvited,
				status: Number(account.status)
			})
			if (inviterId) inviterIds.add(inviterId)
			else noInviterCount++
		})
		ids.sort(compareAccountsByRegisterDateDesc(accountIndex))
		groups.push({
			ip,
			ids,
			count: ids.length,
			riskLevel: getRiskLevel(ids.length),
			inviterIds: Array.from(inviterIds).sort(),
			noInviterCount,
			hasInviter: inviterIds.size > 0
		})
	})
	groups.sort(compareGroups)

	return {
		groups,
		accountIndex,
		scannedCount: latestById.size,
		invalidIpCount
	}
}

/**
 * 汇总分组统计。
 * @returns {{groupCount, accountCount, high, medium, normal, mediumHighInviterCount}}
 * - high / medium / normal 分别是对应风险的 { groupCount, accountCount }；
 * - mediumHighInviterCount 是中高风险分组涉及的邀请人去重数量，同一邀请人出现在多个分组只算一次。
 */
function summarizeGroups(groups) {
	const summary = {
		groupCount: 0,
		accountCount: 0,
		high: { groupCount: 0, accountCount: 0 },
		medium: { groupCount: 0, accountCount: 0 },
		normal: { groupCount: 0, accountCount: 0 },
		mediumHighInviterCount: 0
	}
	const mediumHighInviters = new Set()
	;(Array.isArray(groups) ? groups : []).forEach(group => {
		summary.groupCount++
		summary.accountCount += group.count
		summary[group.riskLevel].groupCount++
		summary[group.riskLevel].accountCount += group.count
		if (RISK_FILTERS.mediumHigh(group)) {
			group.inviterIds.forEach(id => mediumHighInviters.add(id))
		}
	})
	summary.mediumHighInviterCount = mediumHighInviters.size
	return summary
}

/** 按风险筛选分组；未知筛选值抛错，避免静默显示错误范围。 */
function filterGroups(groups, riskFilter) {
	const predicate = RISK_FILTERS[riskFilter]
	if (!predicate) throw new TypeError(`未知的风险筛选：${riskFilter}`)
	return (Array.isArray(groups) ? groups : []).filter(predicate)
}

/**
 * 统计分组内每个邀请人邀请了多少个本组账号。
 * @param {string[]} ids - 分组账号 id
 * @param {Map} accountIndex - 账号索引
 * @returns {Array<{inviterId: string, count: number, inGroup: boolean}>}
 *   按邀请数量倒序、inviterId 正序；inGroup 表示邀请人本人也在本组（同 IP 自邀的强信号）。
 */
function countGroupInviters(ids, accountIndex) {
	const idSet = new Set(ids)
	const countById = new Map()
	ids.forEach(id => {
		const inviterId = accountIndex.get(id).inviterId
		if (inviterId) countById.set(inviterId, (countById.get(inviterId) || 0) + 1)
	})
	return Array.from(countById.entries())
		.map(([inviterId, count]) => ({ inviterId, count, inGroup: idSet.has(inviterId) }))
		.sort((left, right) => right.count - left.count || (left.inviterId < right.inviterId ? -1 : 1))
}

/** 取第 page 页（从 1 开始）；页码越界时自动夹到合法范围。 */
function paginate(items, page, pageSize) {
	const list = Array.isArray(items) ? items : []
	const size = Math.max(1, Number(pageSize) || 1)
	const pageCount = Math.max(1, Math.ceil(list.length / size))
	const current = Math.min(Math.max(1, Number(page) || 1), pageCount)
	return list.slice((current - 1) * size, current * size)
}

/** 账号状态文本，与 user-accounts.schema.json 的 status 定义一致。 */
function getStatusText(status) {
	return {
		0: '正常',
		1: '禁止购买会员',
		2: '审核中',
		3: '已封禁'
	}[status] || '状态未知'
}

/** 风险文本。分组至少有 2 个账号，所以 normal 显示为“低风险”而不是“正常”。 */
function getRiskText(riskLevel) {
	return {
		high: '高风险',
		medium: '中风险',
		normal: '低风险'
	}[riskLevel] || '未知'
}

module.exports = {
	MIN_GROUP_SIZE,
	NORMAL_MAX,
	HIGH_RISK_MIN,
	RISK_FILTERS,
	toIdString,
	buildRegisterIpGroups,
	summarizeGroups,
	filterGroups,
	countGroupInviters,
	paginate,
	getStatusText,
	getRiskText
}

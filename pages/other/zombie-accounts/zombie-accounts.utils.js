/**
 * 僵尸号清理的纯函数：检测条件解析、活跃判定、分类、受保护判定、筛选与受益邀请人排行。
 * 不访问数据库、不依赖 uni / uniCloud，便于用 node 直接测试。
 *
 * 僵尸号定义：注册时间落在检测范围内，并且“最后活跃时间”距注册不超过 N 天，此后再无活动。
 * 最后活跃时间取 login_date（设备登录时更新）与 last_online_time（get-user-info 时更新）中较晚者；
 * 只看 login_date 会把只刷新在线时间、不重新登录的活跃用户误判为僵尸号。
 */
const {
	ONE_DAY_MS,
	getBusinessDayKey,
	getBusinessDateStart
} = require('../violation-invitation-v2/violation-invitation-v2.scan.js')
const { toIdString } = require('../violation-register/violation-register.utils.js')

/** 默认注册起始日期（北京时间）。 */
const DEFAULT_START_DATE = '2022-01-01'
/** 截止月数上限，防止误输入导致范围为空或越界。 */
const MAX_MONTHS = 120
/** 活跃间隔天数上限。 */
const MAX_GAP_DAYS = 365
/** 会员到期时间距今超过该值时显示为“永久会员”（邀请满 50 人赠送 9999 天）。 */
const PERMANENT_VIP_MS = 10 * 365 * ONE_DAY_MS

/**
 * 命中账号的分类，决定允许的处置方式。
 * - inviter：本身是别人的邀请人。只允许封禁；删除会让其名下受邀者的邀请人变成“不存在”。
 * - invitee：有邀请人的受邀小号。只允许封禁；删除会让邀请人的受邀人数下降，
 *   之后再补回 50 人会再次触发 bind-Invitation 的 9999 天奖励。
 * - none：没有任何邀请关系。允许封禁或删除；删除后真实用户日后回来只会注册新号，不会被拦。
 */
const ZOMBIE_CATEGORIES = {
	inviter: '本身是邀请人',
	invitee: '受邀小号',
	none: '无邀请关系'
}

/**
 * 受保护原因：命中规则但不允许在本页处置，单独列出供人工核对。
 * - paid：有金额大于 0 的已支付或已退款订单；
 * - vip：会员未过期（含永久会员）；
 * - internal：内部用户（is_internal_user 为 true）。
 */
const PROTECT_REASONS = {
	paid: '有真实付费',
	vip: '会员未过期',
	internal: '内部用户'
}

/**
 * 结果筛选项。
 * - actionable：全部可处置（不含受保护）；invitee / inviter / none：按分类且不含受保护；
 * - protected：只看受保护账号。
 */
const HIT_FILTERS = {
	actionable: hit => !hit.protectReason,
	invitee: hit => !hit.protectReason && hit.category === 'invitee',
	inviter: hit => !hit.protectReason && hit.category === 'inviter',
	none: hit => !hit.protectReason && hit.category === 'none',
	protected: hit => Boolean(hit.protectReason)
}

function pad(value) {
	return String(value).padStart(2, '0')
}

/** 时间戳转毫秒数字；缺失、非数字或不大于 0 时返回 0。 */
function toTimestamp(value) {
	const numeric = Number(value)
	return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

/** 解析 1..max 的正整数输入；不合法时抛出带字段名的错误。 */
function parsePositiveInt(raw, label, max) {
	const text = String(raw === undefined || raw === null ? '' : raw).trim()
	if (!/^\d+$/.test(text)) throw new TypeError(`${label}必须是正整数`)
	const value = Number(text)
	if (!Number.isSafeInteger(value) || value < 1 || value > max) {
		throw new TypeError(`${label}必须在 1 到 ${max} 之间`)
	}
	return value
}

/**
 * 北京时间日期往前推若干自然月；目标月没有这一天时取该月最后一天
 * （例如 05-31 往前 3 个月是 02-28 或 02-29）。
 * @param {string} dateKey - YYYY-MM-DD
 * @param {number} months - 正整数
 * @returns {string} YYYY-MM-DD
 */
function subtractMonths(dateKey, months) {
	getBusinessDateStart(dateKey) // 校验日期格式与合法性
	const [year, month, day] = dateKey.split('-').map(Number)
	const monthIndex = year * 12 + (month - 1) - months
	const targetYear = Math.floor(monthIndex / 12)
	const targetMonth = monthIndex - targetYear * 12 // 0..11
	const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
	return `${targetYear}-${pad(targetMonth + 1)}-${pad(Math.min(day, lastDay))}`
}

/**
 * 解析检测条件。所有日期按北京时间自然日计算。
 * @param {Object} options
 * @param {string} options.startDate - 注册起始日期 YYYY-MM-DD（含当天 00:00:00）
 * @param {'months'|'manual'} options.endMode - months：截止到“今天往前推 N 个月”的前一天；manual：截止到指定日期当天结束
 * @param {number|string} options.months - endMode 为 months 时的月数
 * @param {string} options.endDate - endMode 为 manual 时的截止日期（含当天）
 * @param {number|string} options.gapDays - 最后活跃距注册不超过的天数
 * @param {number} options.confirmedAt - 点击检测的时刻（毫秒）
 * @returns {{startMs: number, endExclusiveMs: number, gapMs: number, gapDays: number, activeBoundMs: number, startDate: string, endDate: string}}
 *   endExclusiveMs 不含；endDate 为最后一个包含的日期；activeBoundMs = endExclusiveMs + gapMs，
 *   是命中账号最后活跃时间的上界，用于数据库预筛。
 * @throws {TypeError} 条件不合法、截止早于起始，或截止时间加活跃间隔晚于当前时间（观察期未满）
 */
function resolveZombieCriteria(options = {}) {
	const confirmedAt = Number(options.confirmedAt)
	if (!Number.isSafeInteger(confirmedAt) || confirmedAt <= 0) throw new TypeError('检测确认时间无效')

	const startDate = String(options.startDate || '').trim()
	if (!startDate) throw new TypeError('请选择注册起始日期')
	const startMs = getBusinessDateStart(startDate)

	let endExclusiveMs
	if (options.endMode === 'months') {
		const months = parsePositiveInt(options.months, '截止月数', MAX_MONTHS)
		endExclusiveMs = getBusinessDateStart(subtractMonths(getBusinessDayKey(confirmedAt), months))
	} else if (options.endMode === 'manual') {
		const endDate = String(options.endDate || '').trim()
		if (!endDate) throw new TypeError('请选择注册截止日期')
		endExclusiveMs = getBusinessDateStart(endDate) + ONE_DAY_MS
	} else {
		throw new TypeError('截止方式无效')
	}

	const gapDays = parsePositiveInt(options.gapDays, '活跃间隔天数', MAX_GAP_DAYS)
	const gapMs = gapDays * ONE_DAY_MS
	if (endExclusiveMs <= startMs) throw new TypeError('注册截止日期必须晚于起始日期')
	if (endExclusiveMs + gapMs > confirmedAt) {
		throw new TypeError('截止日期加上活跃间隔晚于当前时间，范围内的账号还没过完观察期，请提前截止日期或缩短间隔')
	}
	return {
		startMs,
		endExclusiveMs,
		gapMs,
		gapDays,
		activeBoundMs: endExclusiveMs + gapMs,
		startDate,
		endDate: getBusinessDayKey(endExclusiveMs - 1)
	}
}

/**
 * 计算账号的活跃信息。最后活跃时间不早于注册时间（容忍登录时间早于注册时间的脏数据）。
 * @returns {{registerDate: number, loginDate: number, onlineDate: number, lastActiveAt: number, activeGapMs: number}}
 */
function evaluateActivity(account) {
	const registerDate = toTimestamp(account.register_date)
	const loginDate = toTimestamp(account.login_date)
	const onlineDate = toTimestamp(account.last_online_time)
	const lastActiveAt = Math.max(registerDate, loginDate, onlineDate)
	return { registerDate, loginDate, onlineDate, lastActiveAt, activeGapMs: lastActiveAt - registerDate }
}

/** 是否命中僵尸号规则。注册时间缺失或非法时保守返回 false。 */
function isZombie(account, criteria) {
	const activity = evaluateActivity(account)
	if (!activity.registerDate) return false
	if (activity.registerDate < criteria.startMs || activity.registerDate >= criteria.endExclusiveMs) return false
	return activity.activeGapMs <= criteria.gapMs
}

/**
 * 从候选账号中筛出命中账号并分类。
 * @param {Array} accounts - 扫描读到的候选账号
 * @param {Object} criteria - resolveZombieCriteria 的返回值
 * @param {{paidUserIds: Set<string>, inviterIds: Set<string>, now: number}} context
 *   paidUserIds：有真实付费的用户；inviterIds：命中账号中本身是邀请人的 id；now：判定会员是否过期的时刻
 * @returns {{hits: Array, candidateCount: number}}
 *   hits 按注册时间升序、_id 升序排列，每项为
 *   { id, registerDate, loginDate, onlineDate, hasOnlineField, activeGapMs, status, inviterId, selfInvited, category, protectReason }；
 *   inviter_uid 等于自身 _id 的异常数据记为 selfInvited，按无邀请人处理。
 */
function classifyZombies(accounts, criteria, context) {
	const paidUserIds = context.paidUserIds || new Set()
	const inviterIds = context.inviterIds || new Set()
	const now = Number(context.now)
	const seen = new Set()
	const hits = []
	let candidateCount = 0
	;(Array.isArray(accounts) ? accounts : []).forEach(account => {
		const id = account ? toIdString(account._id) : ''
		if (!id || seen.has(id)) return
		seen.add(id)
		candidateCount++
		if (!isZombie(account, criteria)) return

		const activity = evaluateActivity(account)
		const rawInviterId = toIdString(account.inviter_uid)
		const selfInvited = rawInviterId === id
		const inviterId = selfInvited ? '' : rawInviterId
		let protectReason = ''
		if (paidUserIds.has(id)) protectReason = 'paid'
		else if (toTimestamp(account.vip_expire_date) > now) protectReason = 'vip'
		else if (account.is_internal_user === true) protectReason = 'internal'

		hits.push({
			id,
			registerDate: activity.registerDate,
			loginDate: activity.loginDate,
			onlineDate: activity.onlineDate,
			hasOnlineField: account.last_online_time !== undefined && account.last_online_time !== null,
			activeGapMs: activity.activeGapMs,
			status: Number(account.status),
			inviterId,
			selfInvited,
			category: inviterIds.has(id) ? 'inviter' : inviterId ? 'invitee' : 'none',
			protectReason
		})
	})
	hits.sort((left, right) => left.registerDate - right.registerDate || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))
	return { hits, candidateCount }
}

/**
 * 汇总命中账号。
 * @returns {{total: number, protected: {paid: number, vip: number, internal: number, total: number}, actionable: {inviter: number, invitee: number, none: number, total: number}}}
 */
function summarizeZombies(hits) {
	const summary = {
		total: 0,
		protected: { paid: 0, vip: 0, internal: 0, total: 0 },
		actionable: { inviter: 0, invitee: 0, none: 0, total: 0 }
	}
	;(Array.isArray(hits) ? hits : []).forEach(hit => {
		summary.total++
		if (hit.protectReason) {
			summary.protected[hit.protectReason]++
			summary.protected.total++
		} else {
			summary.actionable[hit.category]++
			summary.actionable.total++
		}
	})
	return summary
}

/** 按筛选项过滤命中账号；未知筛选值抛错。 */
function filterHits(hits, filter) {
	const predicate = HIT_FILTERS[filter]
	if (!predicate) throw new TypeError(`未知的结果筛选：${filter}`)
	return (Array.isArray(hits) ? hits : []).filter(predicate)
}

/**
 * 受益邀请人排行：统计每个邀请人名下有多少个可处置的命中受邀小号。
 * @returns {Array<{inviterId: string, count: number}>} 按数量倒序、inviterId 正序
 */
function rankBeneficiaries(hits) {
	const countById = new Map()
	;(Array.isArray(hits) ? hits : []).forEach(hit => {
		if (hit.protectReason || !hit.inviterId) return
		countById.set(hit.inviterId, (countById.get(hit.inviterId) || 0) + 1)
	})
	return Array.from(countById.entries())
		.map(([inviterId, count]) => ({ inviterId, count }))
		.sort((left, right) => right.count - left.count || (left.inviterId < right.inviterId ? -1 : 1))
}

/** 时长显示：不足 1 小时按分钟，不足 1 天按小时，否则按天（保留 1 位小数）。 */
function formatDuration(ms) {
	const value = Math.max(0, Number(ms) || 0)
	if (value < 3600000) return `${Math.round(value / 60000)} 分钟`
	if (value < ONE_DAY_MS) return `${(value / 3600000).toFixed(1)} 小时`
	return `${(value / ONE_DAY_MS).toFixed(1)} 天`
}

/**
 * 封禁批次标记，写入 description，便于日后按批次核对。
 * @param {Object} criteria - resolveZombieCriteria 的返回值
 * @param {string} operatedAtText - 操作时刻（北京时间文本）
 */
function buildBanTag(criteria, operatedAtText) {
	return `僵尸号清理封禁 ${operatedAtText}：注册 ${criteria.startDate}~${criteria.endDate}，最后活跃距注册≤${criteria.gapDays}天`
}

module.exports = {
	DEFAULT_START_DATE,
	MAX_MONTHS,
	MAX_GAP_DAYS,
	PERMANENT_VIP_MS,
	ZOMBIE_CATEGORIES,
	PROTECT_REASONS,
	HIT_FILTERS,
	subtractMonths,
	resolveZombieCriteria,
	evaluateActivity,
	isZombie,
	classifyZombies,
	summarizeZombies,
	filterHits,
	rankBeneficiaries,
	formatDuration,
	buildBanTag
}

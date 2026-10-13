'use strict';
// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
//
// 用途：清理 user-accounts 表中的"僵尸用户"（含机器批量注册后只用几分钟即弃用的账号）。
//
// 僵尸判定（三个条件全部满足）：
//   1) register_date < 2026-01-01 23:59:59 (UTC+8)
//   2) login_date 缺失或为 0（从未登录过），或 |login_date - register_date| <= 10 分钟
//      （注册后短时间内最后登录一次，此后再无任何登录 —— login_date 只记录"最后"一次）
//   3) 默认附加资产护栏（excludeActiveVip=true）：仅排除"真 VIP"
//      —— vip === true 且 vip_expire_date > now（与 app-user-auth/common/fun.js 的
//         checkVipStatus 权威判定一致）。注意不能只看 vip === true：
//         注册即送 1 天 VIP，用户不上线的话 vip 字段永远停在 true（已知设计缺陷），
//         但 VIP 早已过期。湾币(coin)/积分(score)客户端未使用，不作为护栏。
//
// 实现说明：JQL 不支持字段间比较（login_date 与 register_date 的差值），
//           因此用 _id 游标分页拉取候选用户、在 JS 内过滤，
//           真删时按 _id in ids AND register_date < cutoff 双约束分批删除。
//
// 安全设计：默认仅 dry-run，只有显式传 { dryRun: false, confirm: "YES_DELETE" }
//           才会真正删除。

const db = uniCloud.database()
const dbCmd = db.command

const COLLECTION_NAME = 'user-accounts'
const userCol = db.collection(COLLECTION_NAME)

// 2026-01-01 23:59:59 (UTC+8) = 2026-01-01T15:59:59.000Z
const CUTOFF_TIMESTAMP = Date.UTC(2026, 0, 1, 15, 59, 59)
// 注册与最后登录的时间窗口：10 分钟
const WINDOW_MS = 10 * 60 * 1000

// 每次扫描/删除的批次大小（JQL 单次 limit / remove 上限 1000）
const BATCH_SIZE = 1000
// 扫描游标分页上限：1000 * 20000 = 2000 万候选用户，超出强制中止
const MAX_SCAN_LOOPS = 20000
// 相邻两次 DB 请求之间的间隔（毫秒），防止密集请求触发阿里云数据库限流。
// 100ms ≈ 10 QPS，远低于单实例数据库操作配额，代价是每扫 100 万行多花 ~100 秒。
const DEFAULT_INTERVAL_MS = 1000

function sleep(ms) {
	return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

// 统一构造 cutoff 描述
function buildCutoff() {
	const d = new Date(CUTOFF_TIMESTAMP)
	const pad = (n) => String(n).padStart(2, '0')
	return {
		local: '2026-01-01 23:59:59 (UTC+8)',
		timestampMs: CUTOFF_TIMESTAMP,
		timestampISO: d.toISOString(),
		timestampUTC: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' +
			pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' +
			pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' UTC'
	}
}

/**
 * 判断单个用户文档是否为僵尸用户（时间维度）
 * @param {object} doc { _id, register_date, login_date }
 * @returns {boolean}
 */
function isZombieByTime(doc) {
	const registerDate = doc.register_date
	// 注册时间缺失或非法 → 无法判定，保守起见不算（不删）
	if (typeof registerDate !== 'number' || registerDate <= 0) {
		return false
	}
	if (registerDate >= CUTOFF_TIMESTAMP) {
		return false
	}
	const loginDate = doc.login_date
	// 从未登录过（缺失或为 0）→ 注册了但一次都没用，比"只用10分钟"更僵尸
	if (typeof loginDate !== 'number' || loginDate <= 0) {
		return true
	}
	// 注册后 10 分钟内最后登录，之后再无登录
	return Math.abs(loginDate - registerDate) <= WINDOW_MS
}

/**
 * 判断用户是否持有"真 VIP"（资产护栏：只有未过期的 VIP 才算资产）
 * 与 app-user-auth/common/fun.js 的 checkVipStatus 语义一致：
 * vip === true 且 vip_expire_date > now。仅 vip === true 不算 ——
 * 注册即送 1 天 VIP，用户不上线则该字段永远停在 true（已知设计缺陷）。
 * @param {object} doc { vip, vip_expire_date }
 * @returns {boolean} true = 真 VIP，应排除
 */
function hasActiveVip(doc) {
	if (doc.vip !== true) return false
	return typeof doc.vip_expire_date === 'number' && doc.vip_expire_date > Date.now()
}

module.exports = {
	_before: function() {
		// 通用预处理器；如需鉴权可在此处加 uniID 校验。
	},

	/**
	 * 执行僵尸用户清理。默认 dry-run；必须显式传 { dryRun:false, confirm:"YES_DELETE" } 才会真删。
	 * @param {object} options
	 * @param {boolean} [options.dryRun=true] 是否仅统计不删除
	 * @param {string}  [options.confirm] 真删时必须传 "YES_DELETE"
	 * @param {boolean} [options.excludeActiveVip=true] 资产护栏：持有未过期 VIP 的用户不删
	 * @param {number}  [options.intervalMs=100] 相邻两次 DB 请求的间隔毫秒数，防限流；传 0 关闭
	 * @returns {Promise<object>} 统计 / 删除结果
	 */
	async run({ dryRun = true, confirm = '', excludeActiveVip = true, intervalMs = DEFAULT_INTERVAL_MS } = {}) {
		// 1) 参数守卫：与 cleanup-old-notices 保持一致语义
		const intentToDelete = dryRun === false || confirm === 'YES_DELETE'
		if (intentToDelete && confirm !== 'YES_DELETE') {
			return {
				errCode: 'CONFIRM_REQUIRED',
				errMsg: '检测到删除意图（dryRun=false 或 confirm 传值），但 confirm 不是 "YES_DELETE"。' +
					'当前 confirm 值: ' + JSON.stringify(confirm)
			}
		}

		// 2) 扫描阶段：游标分页拉取所有候选用户（注册时间早于截止线的），
		//    在 JS 内做时间窗口判断。无论 dry-run 还是真删都需要完整扫一遍。
		const zombieIds = []
		let excludedByActiveVip = 0
		let scanned = 0
		let scanLoops = 0
		let scanError = null
		const sample = []

		try {
			let lastId = ''
			while (scanLoops < MAX_SCAN_LOOPS) {
				scanLoops++

				// 游标分页：首批无游标，后续用 _id > lastId 推进
				const where = lastId
					? { _id: dbCmd.gt(lastId), register_date: dbCmd.lt(CUTOFF_TIMESTAMP) }
					: { register_date: dbCmd.lt(CUTOFF_TIMESTAMP) }

				const batchRes = await userCol
					.where(where)
					.orderBy('_id', 'asc')
					.limit(BATCH_SIZE)
					.field({
						_id: true, register_date: true, login_date: true,
						vip: true, vip_expire_date: true,
						username: true, nickname: true, status: true, vip_level: true
					})
					.get()
				const docs = batchRes.data || []
				if (docs.length === 0) {
					break
				}

				for (const doc of docs) {
					scanned++
					if (!isZombieByTime(doc)) continue
					if (excludeActiveVip && hasActiveVip(doc)) {
						excludedByActiveVip++
						continue
					}
					zombieIds.push(doc._id)
					if (sample.length < 3) {
						sample.push({
							_id: doc._id,
							username: doc.username,
							nickname: doc.nickname,
							register_date: doc.register_date,
							login_date: doc.login_date,
							status: doc.status,
							vip: doc.vip,
							vip_expire_date: doc.vip_expire_date,
							vipStillActive: hasActiveVip(doc), // 便于肉眼核对护栏判定
							vip_level: doc.vip_level,
							loginMinusRegisterMs: (typeof doc.login_date === 'number' && doc.login_date > 0)
								? (doc.login_date - doc.register_date)
								: null // null = 从未登录
						})
					}
				}

				lastId = docs[docs.length - 1]._id
				if (docs.length < BATCH_SIZE) {
					break
				}
				// 批次间隔，防止密集请求触发限流（最后一批后无需等待）
				await sleep(intervalMs)
			}
		} catch (err) {
			scanError = (err && err.message) ? err.message : String(err)
		}

		if (scanError) {
			return {
				errCode: 'SCAN_FAILED',
				errMsg: '扫描阶段出错，未删除任何数据：' + scanError,
				scanLoops,
				scanned,
				zombieFound: zombieIds.length
			}
		}

		// 3) dry-run 分支：只汇报
		if (!intentToDelete) {
			return {
				mode: 'dryRun',
				collection: COLLECTION_NAME,
				cutoff: buildCutoff(),
				rule: 'register_date < cutoff 且 (从未登录 或 |login_date - register_date| <= 10分钟)',
				excludeActiveVip,
				scanned, // 扫描过的候选用户总数（注册时间早于截止线）
				excludedByActiveVip, // 因持有未过期 VIP 被护栏拦下的用户数
				willDelete: zombieIds.length,
				scanLoops,
				batchSize: BATCH_SIZE,
				intervalMs,
				sample,
				reachedScanCap: scanLoops >= MAX_SCAN_LOOPS,
				hint: scanLoops >= MAX_SCAN_LOOPS
					? '警告：扫描达到上限（' + MAX_SCAN_LOOPS + ' 轮），统计可能不完整，请勿直接真删，先排查数据量！'
					: '确认 sample 里都是要删的账号后，调用 run({ dryRun: false, confirm: "YES_DELETE" })。'
			}
		}

		// 4) 真删分支：按 1000 一批、双约束删除
		const expectedTotal = zombieIds.length
		if (expectedTotal === 0) {
			return {
				mode: 'delete',
				collection: COLLECTION_NAME,
				cutoff: buildCutoff(),
				excludeActiveVip,
				scanned,
				excludedByActiveVip,
				expectedTotal: 0,
				deletedTotal: 0,
				deleteLoops: 0,
				note: '没有满足条件的僵尸用户，无需删除'
			}
		}

		let deletedTotal = 0
		let deleteLoops = 0
		let lastError = null
		const log = []

		try {
			for (let i = 0; i < zombieIds.length; i += BATCH_SIZE) {
				deleteLoops++
				const ids = zombieIds.slice(i, i + BATCH_SIZE)

				// 双约束：_id in ids AND register_date < cutoff，防止边界异常扩大删除范围
				const delRes = await userCol
					.where({
						_id: dbCmd.in(ids),
						register_date: dbCmd.lt(CUTOFF_TIMESTAMP)
					})
					.remove()

				const deletedThisBatch = delRes.deleted || 0
				deletedTotal += deletedThisBatch
				log.push({ loop: deleteLoops, idsInBatch: ids.length, deletedThisBatch, deletedTotal })

				// 批次间隔，防止密集 remove 触发限流（最后一批后无需等待）
				if (i + BATCH_SIZE < zombieIds.length) {
					await sleep(intervalMs)
				}
			}
		} catch (err) {
			lastError = (err && err.message) ? err.message : String(err)
		}

		const result = {
			mode: 'delete',
			collection: COLLECTION_NAME,
			cutoff: buildCutoff(),
			rule: 'register_date < cutoff 且 (从未登录 或 |login_date - register_date| <= 10分钟)',
			excludeActiveVip,
			scanned,
			excludedByActiveVip,
			expectedTotal, // 扫描判定的僵尸总数，可与 deletedTotal 对账
			deletedTotal,
			scanLoops,
			deleteLoops,
			batchSize: BATCH_SIZE,
			intervalMs,
			log,
			sample,
			reachedScanCap: scanLoops >= MAX_SCAN_LOOPS
		}
		if (lastError) {
			result.errCode = 'DELETE_ABORTED'
			result.errMsg = lastError
		}
		return result
	}
}

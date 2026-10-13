'use strict';
// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
//
// 用途：清理 system-app-notice 表中 create_date 早于截止时间的记录（硬删除，不备份）。
// 安全设计：默认仅 dry-run（统计 + 样例，不删任何数据）；
//           只有显式传 { dryRun: false, confirm: "YES_DELETE" } 才会真正删除，
//           避免被误调用时直接对线上数据动手。
//
// 调用示例：
//   1) 统计会删多少条（前 3 条样例预览）：
//        run({ dryRun: true })
//   2) 真删：
//        run({ dryRun: false, confirm: "YES_DELETE" })

const db = uniCloud.database()
const dbCmd = db.command

const COLLECTION_NAME = 'system-app-notice'
const noticeCollection = db.collection(COLLECTION_NAME)

// 截止时间：2026-09-01 23:59:59 北京时间（UTC+8）
// 文档原话 "2026-09-01 235959" 解析为 UTC+8 当地时间最贴近中国大陆用户使用习惯。
// 字段 create_date 在客户端表现为毫秒时间戳，直接数字比较即可。
const CUTOFF_TIMESTAMP = new Date('2026-09-01T23:59:59+08:00').getTime()

// 单批删除的最大条数。JQL `where().remove()` 的最大删除数为 1000，
// 直接取满能减少循环轮次；保留 ORDER BY 避免"删了又出现"假象。
const BATCH_SIZE = 1000
// 循环上限：1000 * 2000 = 200 万条，足以覆盖任何合理规模的清理；超出后强制中止
const MAX_LOOPS = 2000
// 连续返回 deleted=0 的次数阈值，用于在筛选条件异常时防止死循环
const MAX_CONSECUTIVE_NOOP = 3

function formatTimestamp(ms) {
	const d = new Date(ms)
	const pad = (n) => String(n).padStart(2, '0')
	return (
		d.getUTCFullYear() + '-' +
		pad(d.getUTCMonth() + 1) + '-' +
		pad(d.getUTCDate()) + ' ' +
		pad(d.getUTCHours()) + ':' +
		pad(d.getUTCMinutes()) + ':' +
		pad(d.getUTCSeconds()) + ' UTC'
	)
}

// 统一构造 cutoff 描述，dry-run 与真删两个分支复用
function buildCutoff() {
	return {
		local: '2026-09-01 23:59:59 (UTC+8)',
		timestampMs: CUTOFF_TIMESTAMP,
		timestampISO: new Date(CUTOFF_TIMESTAMP).toISOString(),
		timestampUTC: formatTimestamp(CUTOFF_TIMESTAMP)
	}
}

module.exports = {
	_before: function() {
		// 通用预处理器；如需鉴权可在此处加 uniID 校验。
	},

	/**
	 * 执行清理。默认 dry-run；必须显式传 { dryRun:false, confirm:"YES_DELETE" } 才会真删。
	 * @param {object} options
	 * @param {boolean} [options.dryRun=true] 是否仅统计不删除
	 * @param {string}  [options.confirm] 真删时必须传 "YES_DELETE"
	 * @returns {Promise<object>} 统计 / 删除结果
	 */
	async run({ dryRun = true, confirm = '' } = {}) {
		// 1) 参数守卫：dryRun=false 或传了确认口令，都视为"表达了删除意图"。
		//    只要表达了删除意图就必须 confirm = "YES_DELETE"，否则拒绝。
		const intentToDelete = dryRun === false || confirm === 'YES_DELETE'
		if (intentToDelete && confirm !== 'YES_DELETE') {
			return {
				errCode: 'CONFIRM_REQUIRED',
				errMsg: '检测到删除意图（dryRun=false 或 confirm 传值），但 confirm 不是 "YES_DELETE"。' +
					'当前 confirm 值: ' + JSON.stringify(confirm)
			}
		}

		const whereOldEnough = { create_date: dbCmd.lte(CUTOFF_TIMESTAMP) }

		// 2) dry-run 分支：仅统计 + 取样例（willDelete=0 时免去一次空查询）
		if (!intentToDelete) {
			const countRes = await noticeCollection.where(whereOldEnough).count()
			const willDelete = countRes.total

			let sample = []
			if (willDelete > 0) {
				const sampleRes = await noticeCollection
					.where(whereOldEnough)
					.limit(3)
					.orderBy('create_date', 'asc')
					.field({ _id: true, title: true, create_date: true, user_id: true, is_read: true })
					.get()
				sample = sampleRes.data || []
			}

			return {
				mode: 'dryRun',
				collection: COLLECTION_NAME,
				cutoff: buildCutoff(),
				willDelete,
				batchSize: BATCH_SIZE,
				maxLoopsCap: MAX_LOOPS,
				sample,
				hint: '确认无误后，调用 run({ dryRun: false, confirm: "YES_DELETE" }) 真正执行删除。'
			}
		}

		// 3) 真删分支：先拿一次精确总数作为预期值，便于和最终 deletedTotal 对账
		const countRes = await noticeCollection.where(whereOldEnough).count()
		const expectedTotal = countRes.total

		let deletedTotal = 0
		let loops = 0
		let consecutiveNoop = 0
		let lastError = null
		const log = []

		try {
			while (loops < MAX_LOOPS) {
				loops++

				// 取一批满足条件的 _id（仅取 _id 减少数据传输与权限校验开销）
				const batchRes = await noticeCollection
					.where(whereOldEnough)
					.limit(BATCH_SIZE)
					.field({ _id: true })
					.get()

				const ids = (batchRes.data || []).map((d) => d._id)
				if (ids.length === 0) {
					log.push({ loop: loops, batchSize: 0, deletedThisBatch: 0, note: 'no more rows, exit' })
					break
				}

				// 删除条件保留双约束：_id in ids AND create_date <= cutoff，防止边界异常
				const delRes = await noticeCollection
					.where({
						_id: dbCmd.in(ids),
						create_date: dbCmd.lte(CUTOFF_TIMESTAMP)
					})
					.remove()

				const deletedThisBatch = delRes.deleted || 0
				deletedTotal += deletedThisBatch

				log.push({
					loop: loops,
					queried: ids.length,
					deletedThisBatch,
					deletedTotal
				})

				if (deletedThisBatch === 0) {
					consecutiveNoop++
					if (consecutiveNoop >= MAX_CONSECUTIVE_NOOP) {
						lastError = `连续 ${consecutiveNoop} 批返回 deleted=0，为防死循环中止。` +
							`请人工核查云端数据与权限。`
						break
					}
				} else {
					consecutiveNoop = 0
				}

				// 本批少于 BATCH_SIZE，说明已是最后一批
				if (ids.length < BATCH_SIZE) {
					break
				}
			}
		} catch (err) {
			lastError = (err && err.message) ? err.message : String(err)
		}

		const result = {
			mode: 'delete',
			collection: COLLECTION_NAME,
			cutoff: buildCutoff(),
			expectedTotal, // 删除开始前预估的总数，可与 deletedTotal 对账
			deletedTotal,
			loops,
			batchSize: BATCH_SIZE,
			maxLoopsCap: MAX_LOOPS,
			log,
			reachedLoopCap: loops >= MAX_LOOPS && lastError === null
		}
		if (lastError) {
			result.errCode = 'DELETE_ABORTED'
			result.errMsg = lastError
		}
		return result
	}
}

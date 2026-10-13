'use strict';
// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
//
// 用途：清理 user-vip-changes 表中 total_fee 为数字 0 的记录（硬删除，不备份）。
// 重要：mongo `{ total_fee: 0 }` 同时匹配三种文档：
//   1) total_fee === 0
//   2) total_fee === null
//   3) total_fee 字段完全缺失（mongo 把 "missing" 等价为 null）
// 因此 dry-run 输出里会强制带上 sample，由人在删前肉眼核对要删哪些。
//
// 安全设计：默认仅 dry-run，只有显式传 { dryRun: false, confirm: "YES_DELETE" }
//           才会真正删除。

const db = uniCloud.database()
const dbCmd = db.command

const COLLECTION_NAME = 'user-vip-changes'
const vipCol = db.collection(COLLECTION_NAME)

// 复用 cleanup-old-notices 的经验：BATCH_SIZE 取 JQL 单次 remove 上限
const BATCH_SIZE = 1000
const MAX_LOOPS = 2000
const MAX_CONSECUTIVE_NOOP = 3

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
		// 1) 参数守卫：与 cleanup-old-notices 保持一致语义
		const intentToDelete = dryRun === false || confirm === 'YES_DELETE'
		if (intentToDelete && confirm !== 'YES_DELETE') {
			return {
				errCode: 'CONFIRM_REQUIRED',
				errMsg: '检测到删除意图（dryRun=false 或 confirm 传值），但 confirm 不是 "YES_DELETE"。' +
					'当前 confirm 值: ' + JSON.stringify(confirm)
			}
		}

		// 选取条件。注意：mongo 默认把字段缺失也匹配进来，详见本文件顶部注释。
		const whereZeroFee = { total_fee: 0 }
		const MONGO_NOTE = 'mongo 把 {total_fee:0} 同时匹配三种文档：值为数字 0 / null / 字段缺失。' +
			'请在删前用 sample 列表肉眼确认是否真的全都是想删的。'

		// 2) dry-run 分支
		if (!intentToDelete) {
			const countRes = await vipCol.where(whereZeroFee).count()
			const willDelete = countRes.total

			let sample = []
			if (willDelete > 0) {
				// 拉前 3 条样例（用 _id 默认排序即可）
				const sampleRes = await vipCol
					.where(whereZeroFee)
					.limit(3)
					.field({ _id: true, total_fee: true, user_id: true, time_limit_day: true,
						vip_expire_date: true, out_trade_no: true, comment: true, create_date: true })
					.get()
				sample = sampleRes.data || []
			}

			return {
				mode: 'dryRun',
				collection: COLLECTION_NAME,
				filter: 'total_fee == 0',
				mongoNote: MONGO_NOTE,
				willDelete,
				batchSize: BATCH_SIZE,
				maxLoopsCap: MAX_LOOPS,
				sample,
				hint: '确认 sample 里都是要删的记录后，调用 run({ dryRun: false, confirm: "YES_DELETE" })。'
			}
		}

		// 3) 真删分支：先 count 拿预期，方便和最终 deletedTotal 对账
		const countRes = await vipCol.where(whereZeroFee).count()
		const expectedTotal = countRes.total
		if (expectedTotal === 0) {
			return {
				mode: 'delete',
				collection: COLLECTION_NAME,
				filter: 'total_fee == 0',
				mongoNote: MONGO_NOTE,
				expectedTotal: 0,
				deletedTotal: 0,
				loops: 0,
				note: '没有满足条件的记录，无需删除'
			}
		}

		let deletedTotal = 0
		let loops = 0
		let consecutiveNoop = 0
		let lastError = null
		const log = []

		try {
			while (loops < MAX_LOOPS) {
				loops++

				const batchRes = await vipCol
					.where(whereZeroFee)
					.limit(BATCH_SIZE)
					.field({ _id: true })
					.get()

				const ids = (batchRes.data || []).map((d) => d._id)
				if (ids.length === 0) {
					log.push({ loop: loops, batchSize: 0, deletedThisBatch: 0, note: 'no more rows, exit' })
					break
				}

				// 双约束：_id in ids AND total_fee == 0，防止边界异常扩大删除范围
				const delRes = await vipCol
					.where({
						_id: dbCmd.in(ids),
						total_fee: 0
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
			filter: 'total_fee == 0',
			mongoNote: MONGO_NOTE,
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

'use strict';
// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
//
// 用途：清理已失效的 m3u8 文件：先删云存储文件，再删 yike-invalid-m3u8-files 里的 DB 记录。
//       与管理后台 /pages/cloud-storage/m3u8file/list 的 deleteExpiredM3u8FilesConcurrent 行为一致。
//       主表 yike-album-files-m3u8file 不在本任务清理范围。
//
// 双入口：
//   - _timing() 由 package.json 的定时触发器每 8 分钟调一次，默认 maxDeletePerRun=100。
//   - run({...}) 由 HBuilderX 本地运行或外部 callFunction 调用；默认 dry-run 防止误删。
//
// 单次最多删 maxDeletePerRun 个 URL，避免一次跑太久撑爆超时；
// 一个 cron 周期清不完的部分留到下一周期继续清（自然背压）。

const db = uniCloud.database()
const dbCmd = db.command

const COLLECTION_NAME = 'yike-invalid-m3u8-files'
const invalidCol = db.collection(COLLECTION_NAME)

// "已失效" 窗口：与 admin 页一致，create_date 早于 (now - 10h) 的记录视为已失效，
// 给一个 10 小时的安全缓冲（部分转码可能失败但仍可正常播放）
const EXPIRED_WINDOW_MS = 10 * 60 * 60 * 1000

// uniCloud.deleteFile 单次 fileList 上限是 50
const CLOUD_DELETE_BATCH = 50

// 单次最多删多少 URL：定时任务默认 100，足够在 300s 超时内结束
const DEFAULT_MAX_DELETE_PER_RUN = 100

// 顶层执行函数：避免云对象方法 this 绑定不确定，便于 _timing 与 run 共用同一份逻辑
async function cleanupOnce({ dryRun, confirm, maxDeletePerRun, trigger }) {
	// 参数守卫
	const intentToDelete = dryRun === false || confirm === 'YES_DELETE'
	if (intentToDelete && confirm !== 'YES_DELETE') {
		return {
			errCode: 'CONFIRM_REQUIRED',
			errMsg: '检测到删除意图（dryRun=false 或 confirm 传值），但 confirm 不是 "YES_DELETE"。' +
				'当前 confirm 值: ' + JSON.stringify(confirm)
		}
	}

	const cutoff = Date.now() - EXPIRED_WINDOW_MS
	const limitCount = Math.max(1, parseInt(maxDeletePerRun, 10) || DEFAULT_MAX_DELETE_PER_RUN)
	const whereExpired = { create_date: dbCmd.lt(cutoff) }

	// dry-run 分支
	if (!intentToDelete) {
		const countRes = await invalidCol.where(whereExpired).count()
		const willDelete = countRes.total
		let sample = []
		if (willDelete > 0) {
			const s = await invalidCol
				.where(whereExpired)
				.limit(3)
				.field({ _id: true, invalid_m3u8_file_url: true, create_date: true })
				.get()
			sample = s.data || []
		}
		return {
			mode: 'dryRun',
			trigger,
			collection: COLLECTION_NAME,
			filter: 'create_date < now - 10h',
			cutoff: {
				windowHours: 10,
				timestampMs: cutoff,
				timestampISO: new Date(cutoff).toISOString()
			},
			willDelete,
			limitedTo: Math.min(willDelete, limitCount),
			maxDeletePerRun: limitCount,
			sample,
			hint: '确认无误后，调用 run({ dryRun: false, confirm: "YES_DELETE", maxDeletePerRun: 100 })。'
		}
	}

	// 真删分支：先查询限定数量 + 关键字段
	const batchRes = await invalidCol
		.where(whereExpired)
		.limit(limitCount)
		.field({ _id: true, invalid_m3u8_file_url: true })
		.get()

	const rows = (batchRes.data || []).filter((r) => r.invalid_m3u8_file_url)
	if (rows.length === 0) {
		return {
			mode: 'delete',
			trigger,
			collection: COLLECTION_NAME,
			cutoff: { windowHours: 10, timestampMs: cutoff },
			maxDeletePerRun: limitCount,
			queried: 0,
			cloudDeleteOk: 0,
			cloudDeleteFail: 0,
			dbDeleted: 0,
			note: '没有满足条件的记录或本批 URL 全为空，无需删除'
		}
	}

	const ids = rows.map((r) => r._id)
	const urls = rows.map((r) => r.invalid_m3u8_file_url)

	// 1) 先删云存储：每批最多 50 个，单批失败不抛错（与 admin 页行为一致）
	let cloudDeleteOk = 0
	let cloudDeleteFail = 0
	const cloudFailures = []
	for (let i = 0; i < urls.length; i += CLOUD_DELETE_BATCH) {
		const subUrls = urls.slice(i, i + CLOUD_DELETE_BATCH)
		try {
			const res = await uniCloud.deleteFile({ fileList: subUrls })
			if (res && Array.isArray(res.fileList)) {
				for (const f of res.fileList) {
					// 阿里云 OSS：code===0 表示成功；历史接口未带 code 也按成功算
					if (f && (f.code === 0 || f.code === 'SUCCESS' || f.code === undefined)) {
						cloudDeleteOk++
					} else {
						cloudDeleteFail++
						cloudFailures.push({ url: f.fileID || f.url || 'unknown', code: f.code, message: f.message })
					}
				}
			} else {
				// 老格式 / 简化返回：按全部成功处理
				cloudDeleteOk += subUrls.length
			}
		} catch (err) {
			cloudDeleteFail += subUrls.length
			cloudFailures.push({ batch: i / CLOUD_DELETE_BATCH, error: (err && err.message) || String(err) })
			console.error('[cleanup-expired-m3u8] cloud delete batch failed:', err)
		}
	}

	// 2) 再删 DB 记录：双约束 _id in ids AND create_date < cutoff
	//    即使云存储有失败，DB 记录照样删（与 admin 页逻辑一致，避免脏数据堆积）
	const dbDelRes = await invalidCol
		.where({
			_id: dbCmd.in(ids),
			create_date: dbCmd.lt(cutoff)
		})
		.remove()
	const dbDeleted = dbDelRes.deleted || 0

	const result = {
		mode: 'delete',
		trigger,
		collection: COLLECTION_NAME,
		cutoff: { windowHours: 10, timestampMs: cutoff },
		maxDeletePerRun: limitCount,
		queried: rows.length,
		cloudDeleteOk,
		cloudDeleteFail,
		dbDeleted,
		note: 'queried 是本批实际处理的记录数；maxDeletePerRun 以上的会留到下个 cron 周期继续清'
	}
	// 仅在有失败时回显失败明细，控制日志体积
	if (cloudFailures.length > 0) {
		result.cloudFailures = cloudFailures
	}
	return result
}

module.exports = {
	_before: function() {
		// 通用预处理器
	},

	/**
	 * 定时任务入口（与 auto-update-m3u8-file-url 的 _timing 同名约定）
	 * 每 8 分钟被 cron 触发一次，参数固定为"真删+默认限量"。
	 */
	async _timing() {
		const t0 = Date.now()
		const summary = await cleanupOnce({
			dryRun: false,
			confirm: 'YES_DELETE',
			maxDeletePerRun: DEFAULT_MAX_DELETE_PER_RUN,
			trigger: 'timer'
		})
		console.log('[cleanup-expired-m3u8/_timing] done in ' + (Date.now() - t0) + 'ms, summary:', JSON.stringify(summary))
		return summary
	},

	/**
	 * 手动 / 本地运行 / 测试 入口。默认 dry-run；真删必须传 confirm: "YES_DELETE"。
	 * @param {object} options
	 * @param {boolean} [options.dryRun=true] 是否仅统计不执行
	 * @param {string}  [options.confirm] 真删必传 "YES_DELETE"
	 * @param {number}  [options.maxDeletePerRun=100] 单次最多删除 URL 数
	 * @param {string}  [options.trigger='manual'] 触发来源标识，仅用于日志
	 * @returns {Promise<object>} 执行概要
	 */
	async run(options = {}) {
		return await cleanupOnce({
			dryRun: options.dryRun !== undefined ? options.dryRun : true,
			confirm: options.confirm || '',
			maxDeletePerRun: options.maxDeletePerRun !== undefined ? options.maxDeletePerRun : DEFAULT_MAX_DELETE_PER_RUN,
			trigger: options.trigger || 'manual'
		})
	}
}

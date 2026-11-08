/**
 * 测试专用：模拟 clientDB 的 user-accounts 集合与 db.command，只实现本页用到的查询能力。
 * 页面代码不会引用本文件。
 */
const dbCmd = {
	gte: value => ({ op: 'gte', value }),
	lte: value => ({ op: 'lte', value }),
	gt: value => ({ op: 'gt', value }),
	in: values => ({ op: 'in', value: values.slice() }),
	and: conditions => ({ op: 'and', value: conditions })
}

function matches(value, condition) {
	if (!condition || typeof condition !== 'object') return value === condition
	switch (condition.op) {
		case 'gte': return value >= condition.value
		case 'lte': return value <= condition.value
		case 'gt': return value > condition.value
		case 'in': return condition.value.includes(value)
		case 'and': return condition.value.every(item => matches(value, item))
		default: throw new Error(`假实现不支持的条件：${condition.op}`)
	}
}

/**
 * @param {Array} rows - 集合中的文档，会被 update 原地修改
 * @param {Object} options
 *   maxLimit：服务端单次返回上限；ignoreIdCursor：忽略 _id 的 gt 条件（模拟条件失效）；
 *   failGet(n) / failUpdate(n) / failCount(n)：第 n 次调用返回 true 时抛错；
 *   dropUpdate：update 不生效但不报错；beforeGet(n)：每次 get 前回调
 */
function createCollection(rows, options = {}) {
	const calls = { get: [], update: [], count: 0 }
	const collection = {
		where(where) {
			const state = { fields: null, order: null, limit: 100 }
			const select = () => rows.filter(row => Object.keys(where).every(key => {
				if (key === '_id' && options.ignoreIdCursor && where[key].op === 'gt') return true
				return matches(row[key], where[key])
			}))
			const query = {
				field(fields) { state.fields = fields; return query },
				orderBy(key, direction) { state.order = { key, direction }; return query },
				limit(limit) { state.limit = limit; return query },
				async count() {
					calls.count++
					if (options.failCount && options.failCount(calls.count)) throw new Error('计数失败')
					return { result: { total: select().length } }
				},
				async get() {
					calls.get.push({ where, limit: state.limit, fields: state.fields })
					if (options.beforeGet) options.beforeGet(calls.get.length)
					if (options.failGet && options.failGet(calls.get.length)) throw new Error('网络抖动')
					let data = select()
					if (state.order) {
						data = data.slice().sort((left, right) => (left[state.order.key] < right[state.order.key] ? -1 : 1))
						if (state.order.direction === 'desc') data.reverse()
					}
					data = data.slice(0, Math.min(state.limit, options.maxLimit || Infinity))
					return {
						result: {
							data: data.map(row => {
								if (!state.fields) return { ...row }
								const projected = {}
								Object.keys(state.fields).forEach(key => {
									if (key in row) projected[key] = row[key]
								})
								return projected
							})
						}
					}
				},
				async update(patch) {
					calls.update.push({ where, patch })
					if (options.failUpdate && options.failUpdate(calls.update.length)) throw new Error('写入超时')
					const matched = select()
					if (!options.dropUpdate) matched.forEach(row => Object.assign(row, patch))
					return { result: { updated: matched.length } }
				}
			}
			return query
		}
	}
	return { collection, calls, options }
}

module.exports = {
	dbCmd,
	createCollection
}

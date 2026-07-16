const db = uniCloud.database()
const dbCmd = db.command

const COLLECTIONS = {
	USERS: 'user-accounts',
	ORDERS: 'user-payment-orders'
}

function response(code, message, data = null) {
	return { code, message, data }
}

function getQuery(context) {
	return context.getHttpInfo().queryStringParameters || {}
}

module.exports = {
	/**
	 * GET /api/legacy-migration/user-info?my_invite_code=旧版邀请码
	 */
	async 'user-info'() {
		const query = getQuery(this)
		const inviteCode = typeof query.my_invite_code === 'string'
			? query.my_invite_code.trim()
			: ''

		if (!inviteCode) {
			return response(400, '缺少 my_invite_code')
		}

		const result = await db.collection(COLLECTIONS.USERS)
			.where({ my_invite_code: inviteCode })
			.limit(1)
			.get()
		const user = result.data && result.data[0]

		if (!user) {
			return response(404, '用户不存在')
		}

		delete user.password
		return response(200, '查询用户信息成功', user)
	},

	/**
	 * GET /api/legacy-migration/user-orders?user_id=旧版用户ID
	 */
	async 'user-orders'() {
		const query = getQuery(this)
		const userId = typeof query.user_id === 'string'
			? query.user_id.trim()
			: ''

		if (!userId) {
			return response(400, '缺少 user_id')
		}

		const result = await db.collection(COLLECTIONS.ORDERS)
			.where({
				user_id: userId,
				total_fee: dbCmd.gt(1)
			})
			.orderBy('create_time', 'desc')
			.limit(1000)
			.get()

		return response(200, '查询用户实付订单成功', result.data || [])
	}
}

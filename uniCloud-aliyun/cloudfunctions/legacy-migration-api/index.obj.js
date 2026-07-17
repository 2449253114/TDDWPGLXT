const db = uniCloud.database()
const dbCmd = db.command

const COLLECTIONS = {
	USERS: 'user-accounts',
	ORDERS: 'user-payment-orders'
}

function ok(data, message = 'ok') {
	return { code: 0, message, data }
}

function fail(message) {
	return { code: 1, message, data: null }
}

function getQuery(context) {
	return context.getHttpInfo().queryStringParameters || {}
}

module.exports = {
	/**
	 * GET /api/legacy-migration/user-info
	 *     ?my_invite_code=旧版邀请码
	 *     &oaid_prefix=OAID前3位
	 *     &oaid_suffix=OAID后4位
	 */
	async 'user-info'() {
		const query = getQuery(this)
		const inviteCode = typeof query.my_invite_code === 'string'
			? query.my_invite_code.trim()
			: ''
		const oaidPrefix = typeof query.oaid_prefix === 'string'
			? query.oaid_prefix.trim().toLowerCase()
			: ''
		const oaidSuffix = typeof query.oaid_suffix === 'string'
			? query.oaid_suffix.trim().toLowerCase()
			: ''

		if (!inviteCode || oaidPrefix.length !== 3 || oaidSuffix.length !== 4) {
			return fail('旧版账号信息不匹配')
		}

		try {
			const result = await db.collection(COLLECTIONS.USERS)
				.where({ my_invite_code: inviteCode })
				.field({ _id: true, vip_expire_date: true, device_oaid: true })
				.limit(1)
				.get()
			const user = result.data && result.data[0]
			const deviceOaid = user && typeof user.device_oaid === 'string'
				? user.device_oaid.trim().toLowerCase()
				: ''

			if (
				!user
				|| deviceOaid.length < 7
				|| !deviceOaid.startsWith(oaidPrefix)
				|| !deviceOaid.endsWith(oaidSuffix)
			) {
				return fail('旧版账号信息不匹配')
			}

			return ok({
				user_id: user._id,
				vip_expire_date: user.vip_expire_date == null ? 0 : user.vip_expire_date
			}, '旧版账号校验成功')
		} catch (error) {
			console.error('[legacy-migration-api.user-info] failed:', error)
			return fail('旧版账号查询失败，请稍后重试')
		}
	},

	/**
	 * GET /api/legacy-migration/user-orders?user_id=旧版用户ID
	 */
	async 'user-orders'() {
		const query = getQuery(this)
		const userId = typeof query.user_id === 'string'
			? query.user_id.trim()
			: ''

		if (!userId) return fail('user_id 不能为空')

		try {
			const result = await db.collection(COLLECTIONS.ORDERS)
				.where({
					user_id: userId,
					total_fee: dbCmd.gt(0),
					status: dbCmd.in([1, 2])
				})
				.field({
					_id: true,
					body: true,
					pay_type: true,
					out_trade_no: true,
					total_fee: true,
					status: true,
					day_count: true,
					create_time: true
				})
				.orderBy('create_time', 'desc')
				.limit(1000)
				.get()

			return ok(result.data || [], '查询旧版付费订单成功')
		} catch (error) {
			console.error('[legacy-migration-api.user-orders] failed:', error)
			return fail('旧版订单查询失败，请稍后重试')
		}
	}
}

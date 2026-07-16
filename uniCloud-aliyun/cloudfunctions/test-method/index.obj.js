// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const db = uniCloud.database()
const dbCmd = db.command

// 用户数据库表
const userCollectionName = 'user-accounts'
const userCollection = db.collection(userCollectionName)

module.exports = {
	_before: function () { // 通用预处理器

	},
	/**
	 * method1方法描述
	 * @param {string} param1 参数1描述
	 * @returns {object} 返回值描述
	 */
	/* 
	method1(param1) {
		// 参数校验，如无参数则不需要
		if (!param1) {
			return {
				errCode: 'PARAM_IS_NULL',
				errMsg: '参数不能为空'
			}
		}
		// 业务逻辑
		
		// 返回结果
		return {
			param1 //请根据实际需要返回值
		}
	}
	*/

	/**
	 * 查询当天从0点到现在的所有今天登录APP的用户数量
	 * 不需要返回用户数据，只需要返回用户数量
	 * @returns {number} 用户数量
	 */
	queryTodayLoginUser: async function() {
		// 计算当前日期的0点的毫秒时间戳
		const currentDateZero = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
		console.log('当天0点的毫秒时间戳', currentDateZero)
		
		// 查询当天从0点到现在的所有今天登录APP的用户
		const res = await db.collection(userCollectionName).where({
			login_date: dbCmd.gt(currentDateZero) // 这里是毫秒时间戳。gt()是大于的意思
		}).count()
		console.log("结果", res)
		// 从返回结果中提取用户数量
		const userCount = res.total
		// 打印用户数量
		console.log('当天登录用户数量:', userCount)
		// 返回用户数量
		return userCount
	}

}

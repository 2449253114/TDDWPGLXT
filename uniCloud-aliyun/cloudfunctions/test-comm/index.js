'use strict';
exports.main = async (event, context) => {
	//event为客户端上传的参数
	console.log('event : ', event)
	
	const db = uniCloud.database();
	
	console.log("db", db)
	//const dbCmd = db.command

		
	// 获取当前日期的毫秒时间戳
	//const currentDate = Date.now()
	// 计算当前日期的0点的毫秒时间戳
	//const currentDateZero = new Date(new Date().setHours(0, 0, 0, 0)).getTime()
	
	// 查询当天从0点到现在的所有今天登录APP的用户
	const res = await db.collection('user-accounts').where({
		_id: "65be37419755e3283004978c"
		//login_date: dbCmd.gt(1754841600000)
	}).get()
	console.log("结果", res)
	// 从返回结果中提取用户数量
	//const userCount = res.total
	// 打印用户数量
	//console.log('当天登录用户数量:', userCount)
	// 返回用户数量
	
	//返回数据给客户端
	return event
};

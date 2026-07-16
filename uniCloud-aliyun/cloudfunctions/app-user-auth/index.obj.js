// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const {
	userCollection, dbCmd
} = require('./common/constants')

const {
  verifyOaidLogin,
	verifyOaidLoginV2
} = require('./module/login/index')

const {
  getUserInfo,
  updateUserInfo,
  bindInvitation,
  invitationRecords,
  myInviterInfo,
  addPurchase,
  getPurchase
} = require('./module/user/index')

const {
	notifications,
	notificationsReadAll
} = require('./module/notifications/index')


module.exports = {
	_before: function () { // 通用预处理器

	},
	_timing: async function (param) { // 云对象使用定时触发：https://doc.dcloud.net.cn/uniCloud/trigger.html
		console.log('触发时间：', param.Time)
		// 云对象定时触发的业务逻辑
		// 每天凌晨4点执行
		// 对所有用户的surplus_movie_count字段进行重置为3（每天剩余可观看3部电影）
		// const resopnse = await userCollection.where({
		// 	surplus_movie_count: dbCmd.lte(2)// 小于等于2的用户
		// }).update({
		// 	surplus_movie_count: 3, // 今日剩于3次观看次数
		// 	daily_movie_count: 3 // 每日观看次数
		// })
		
		
		// 2024-0602起，每日仅1次免费观看，不能让白嫖用户白嫖的太快，那样的话，压根不充钱或不拉人头，肯定不行，会亏死的
		// 2024-1028起，已配置云函数定时任务，每周一至周三的凌晨2点执行。
		const resopnse = await userCollection.update({
			surplus_movie_count: 1, // 今日剩于3次观看次数
			daily_movie_count: 1 // 每日观看次数
		})
		return resopnse
		
		
		/* 
		// 2024-0815起，仅每周一、周三、周五，可免费看一次。其他时间不可免费看。
		const today = new Date(); // 获取当前日期
		const dayOfWeek = today.getDay(); // 获取今天是星期几，返回值是0（周日）到6（周六）
		
		let dailyMovieCount = 0; // 默认设置为0
		
		// 检查今天是周一、周三还是周五（1、3、5）
		if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
			dailyMovieCount = 1; // 如果是，设置为1
		}
		
		// 更新数据库记录
		const response = await userCollection.update({
			surplus_movie_count: dailyMovieCount, // 今日剩余观看次数 （看视频扣除的是这个字段值）
			daily_movie_count: dailyMovieCount // 根据星期几设置的每日观看次数
		});
		
		return response;
		 */
	},
	
	
	/**
	 * 验证OAID登录与注册（一键登录与注册，采用"设备OAID"来做唯一凭证）
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/verifyOaidLogin
	 * @param {Object}  params
	 * @param {String}  params.device_oaid       设备OAID
	 * @param {String}  params.app_platform      APP平台
	 * @returns
	 */
	'oaid-login': verifyOaidLoginV2, // verifyOaidLogin
	'oaid-login-v2': verifyOaidLoginV2,
	
	
	/**
	 * 获取用户信息
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/getUserInfo
	 * @param {Object}  params
	 * @param {String}  params._id       用户ID
	 * @returns
	 */
	'info': getUserInfo,
	
	
	/**
	 * 更新用户信息
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/updateUserInfo
	 * @param {Object}  params
	 * @param {String}  params._id       用户ID
	 * @returns
	 */
	'update': updateUserInfo,
	
	
	/**
	 * 绑定邀请关系
	 * @url POST /api/users/bind-invitation
 	 * @param {Object}  params
 	 * @param {String} 	params.inviteCode 用户输入的邀请码（邀请人的邀请码）
 	 * @param {String} 	params.userId 当前用户的ID
 	 * @returns {Object} 返回绑定结果
	 */
	'bind-invitation': bindInvitation,


	/**
	 * 查询用户的邀请记录
	 * @url GET /api/users/invitation-records
	 * @param {String} userId 用户的ID
	 * @returns {Object} 返回用户的邀请记录列表
	 */
	'invitation-records': invitationRecords,
	
	/**
	 * 查询我的邀请人信息
	 * @url GET /api/users/my-inviter-info
	 * @param {String} userId 用户的ID
	 * @returns {Object} 返回我的邀请人信息
	 */
	'my-inviter-info': myInviterInfo,
	
	/**
	 * 查询当前用户的系统通知
	 * @url GET /api/users/notifications
	 * @param {Object}  params
	 * @param {String} 	params.userId 用户的ID
	 * @returns {Object} 返回用户的系统通知列表
	 */
	 'system-messages': notifications,
	
	
	/**
	 * 将当前用户的系统通知全部标记为已读
	 * @url POST /api/users/notifications-read-all
	 * @param {Object}  params
	 * @param {String}  params.userId 用户的ID
	 * @returns {Object} 返回操作结果
	 */
	'system-messages-read-all': notificationsReadAll,
	
	
	
	
	/**
	 * 添加我的购买
	 * @url POST /api/users/add-purchase
	 * @param {Object} params
	 * @param {String} params.user_id 用户ID
	 * @param {String} params.fs_id 文件ID（可选）
	 * @param {String} params.album_id 相册ID（可选）
	 * @returns {Object} 返回添加结果
	 */
	'add-purchase': addPurchase,
	
	
	/**
	 * 获取我的购买记录
	 * @url POST /api/users/get-purchases
	 * @param {Object} params
	 * @param {String} params.user_id 用户ID
	 * @returns {Object} 返回该用户的购买记录
	 */
	'get-purchases': getPurchase,
	
	
	
	
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
}

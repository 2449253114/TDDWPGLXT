const {
	userCollection,
	allInvitationCodesCollection,
	appSystemNoticeCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

const {
	checkVipStatus,
	sendSystemNotice,
	addVipChangeRecord
} = require('../../common/fun')


// 添加被封禁的用户id，这些用户是购买了VIP会员后使用一段时间就投诉订单，然后处理了退款，需要把这些人永久性封禁
// 不能让它们登录APP。
const disable_login_users = [
	"665368d2bd022087df814884", // 备注：退款商户订单号：VIPCZ1716744531428210、微信订单号：4200002221202405276223208373，退款时间：2024-06-02 03:43:50
	"66574e4fee97ef5896c816d8", // 备注：退款商户订单号：VIPCZ1717267947894389、微信订单号：4200002314202406024446124783，退款时间：2024-06-02 03:33:28
	"6651b2c18620667bb4fecd10", // 备注：短时间内恶意下单多次，且是不同商品，并且不付款，明显同行恶搞
	//"65be37419755e3283004978c" // 我的账号，用来测试是否成功不让登录
]
// 需要新增一个每分钟自动检查是否有短时间内同一个用户多次下单且不付款，如短时间(1分钟)内超过3个订单，则视为恶意刷单，直接封号。


/**
 * 生成6位数邀请码的函数（用于注册账号成功时生成用户自身的邀请码）
 * 传入的参数是一个集合，用于存储已经生成的邀请码，确保生成的邀请码不重复，并且allCodesSet会在函数内部被修改，所以不需要返回新的allCodesSet
 * @param {Array} allCodesSet 
 * @returns 
 */
function generateInviteCode(allCodesSet) {
	// 定义所有可能的字符，去掉小写字母
	const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

	// 生成邀请码的函数
	function generateCode() {
		let code = '';
		// 循环6次，每次从characters中随机选择一个字符添加到code中
		for (let i = 0; i < 6; i++) {
			code += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		// 检查新生成的邀请码是否已经存在
		if (allCodesSet.has(code)) {
			// 如果已经存在，则重新生成
			return generateCode();
		} else {
			// 如果不存在，则添加到集合中并返回
			allCodesSet.add(code);
			return code;
		}
	}

	return generateCode()
}


/**
 * 你需要生成一个6到9位数的随机账号，且保证唯一性。以下是根据你的需求优化后的代码
 * 这里的函数名称改为generateUniqueAccount，这样更清楚地表示它的功能是生成唯一的账号。同时，增加了对账号长度的随机生成，确保生成的是6到9位的随机数字账号。
 * @param {*} allAccounts 所有账号
 * @returns 
 */
// 生成6-9位随机数字账号
function generateUniqueAccount(allAccounts) {
	const existingAccounts = new Set(allAccounts);

	// 定义所有可能的字符
	const characters = '0123456789';

	// 生成账号的函数
	function generateNumber() {
		const length = Math.floor(Math.random() * 4) + 6; // 生成6-9位数
		let account = '';

		// 循环生成数字账号
		for (let i = 0; i < length; i++) {
			account += characters.charAt(Math.floor(Math.random() * characters.length));
		}

		// 检查新生成的账号是否已经存在
		if (existingAccounts.has(account)) {
			// 如果已经存在，则重新生成
			return generateNumber();
		} else {
			// 如果不存在，则添加到集合中并返回
			existingAccounts.add(account);
			return account;
		}
	}

	return generateNumber();
}




/**
 * 验证OAID登录与注册（一键登录与注册，采用"设备OAID"来做唯一凭证）
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-user-auth/verifyOaidLogin
 * @param {Object}  params
 * @param {String}  params.device_oaid       设备OAID
 * @param {String}  params.app_platform      APP平台
 * @returns
 */
module.exports = async function() {
	const clientInfo = this.getClientInfo()

	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let device_oaid, app_platform, app_package_name, app_version;
	// try {
	// 	({
	// 		device_oaid,
	// 		app_platform,
	// 		app_package_name,
	// 		app_version = "1.0.0"
	// 	} = JSON.parse(body));
	// } catch (error) {
	// 	return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	// }
	
	try {
	  const parsedBody = JSON.parse(body);
	  device_oaid = parsedBody.device_oaid;
	  app_platform = parsedBody.app_platform;
	  app_package_name = parsedBody.app_package_name;
	  app_version = parsedBody.app_version || "1.0.0"; // 默认值
	} catch (error) {
	  return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	// // APP平台参数未传递
	// if (!app_platform || typeof app_platform !== 'string' || app_platform.trim() ===
	// 	"") { // APP平台参数为空或不为字符串类型，或去掉字符串两端的空白字符后为空
	// 	return createResponse(STATE_CODE.ERROR, "无效的请求数据");
	// }

	// // APP平台参数不正确
	// if (app_platform !== "熊多多" && app_platform !== "与他") {
	// 	return createResponse(STATE_CODE.ERROR, "无效的请求数据，平台不正确");
	// }
	
	// APP包名参数不正确
	if (app_package_name !== "com.withhim.cc.demo.debug"
		&& app_package_name !== "com.withhim.cc"
		&& app_package_name !== "tt.ubear.xyz.demo.debug"
		&& app_package_name !== "tt.ubear.xyz"
	) {
		return createResponse(STATE_CODE.ERROR, "无效的请求数据");
	}
	

	let queryUserResult;
	try {
		queryUserResult = await userCollection.where({
			device_oaid: device_oaid
			//device_oaid: new RegExp(`^${device_oaid}`) // 动态匹配以 device_oaid 开头的值 // 去掉 'i' 标志，表示区分大小写
		}).get() // 获取用户信息
	} catch (error) { // 错误处理：对于数据库查询操作的错误处理将使代码更加健壮和稳定，减少了程序崩溃的可能性
		console.error(error);
		return createResponse(STATE_CODE.ERROR, "数据库查询失败");
	}
	
	// 账号效验，如果有记录，则说明此设备已注册过账号，可以直接登录，否则直接注册
	if (queryUserResult['affectedDocs'] == 1) { // 有记录，此账号存在

		const user = queryUserResult['data'][0]
		const {
			_id: user_id
		} = user
		
		// 检查是否为被永久禁止登录的用户（写死的数据，目前有3个是真实封禁的用户）
		if (disable_login_users.includes(user_id)) {
		    // 如果用户ID在禁止登录的用户列表中，则拒绝登录
		    //return createResponse(STATE_CODE.FAIL, "您的账号已被禁止登录");
			//return createResponse(STATE_CODE.FAIL, "服务器异常，请稍后重试");
			return createResponse(STATE_CODE.FAIL, "服务器异常，请稍后重试");
			//return createResponse(STATE_CODE.SUCCESS, "登录成功");// 无任何数据，直接让APP闪退
		} 
		
		// 检查是否为被永久禁止登录的用户（动态数据，通过用户状态status==3（永久封禁）来拦截登录）
		if (user.status == 3) {
			// 如果用户ID在禁止登录的用户列表中，则拒绝登录
			//return createResponse(STATE_CODE.FAIL, "您的账号已被禁止登录");
			//return createResponse(STATE_CODE.FAIL, "服务器异常，请稍后重试");
			//return createResponse(STATE_CODE.FAIL, "服务器维护中，请稍后重试");
			return createResponse(STATE_CODE.FAIL, "服务器异常");// 无任何数据，不闪退APP
			//return createResponse(STATE_CODE.SUCCESS, "服务器链接失败");// 无任何数据，直接让APP闪退
		}


		// 先更新用户的登录时间和登录IP
		let updateUserResult = await userCollection.where({
			_id: user_id
		}).updateAndReturn({
			login_ip: clientInfo['clientIP'], // 最后登录IP
			login_date: Date.now(), // 最后登录时间 (获取当前时间戳)
			vip: checkVipStatus(user) // 检查并更新VIP状态
		})
		
		const data = updateUserResult['doc']
		
		// 处理数据，将device_oaid转换成前三位和后四位显示，中间用*代替，保留11位
		if (data.device_oaid) {
			const oaid = data.device_oaid;
			data.device_oaid = `${oaid.substring(0, 3)}****${oaid.substring(oaid.length - 4)}`;
		}
		
		
		if (app_version <= "1.0.5") {
			// 低于1.0.5版本的提示信息
			return createResponse(STATE_CODE.SUCCESS, "你正在使用旧版本，请尽快更新至新版，旧版即将关闭服务", data);
		} 
		// else if (app_version === "1.0.5") {
		// 	// 等于1.0.5版本的提示信息
		// 	return createResponse(STATE_CODE.SUCCESS, "登录成功！请更新，数据加载更快", data);
		// }

		// 其他情况（高于1.0.5版本）的提示信息
		//return createResponse(STATE_CODE.SUCCESS, "登录成功，系统升级中，若图片无法显示为正常情况，预计几小时后恢复", data);
		
		//return createResponse(STATE_CODE.SUCCESS, "登录成功", data);
		//return createResponse(STATE_CODE.SUCCESS, "登录成功，视频正在迁移中，预计需用时168小时，请7月21日后再来", data);
		//return createResponse(STATE_CODE.SUCCESS, "登录成功，同步更新中，若偶尔APP无数据，是正常的，18点左右完成", data);
		//return createResponse(STATE_CODE.SUCCESS, "登录成功，视频下载，预计10月推出", data);
		return createResponse(STATE_CODE.SUCCESS, "登录成功，APP改进中", data);
		//视频正在迁移中，预计需用时168小时，请7月21日后再来

	} else { // 无记录，此账号不存在，则先注册


		// 1. 获取全部邀请码数据库表中所有用户的自身邀请码，因为注册时，生成的自身邀请码不可以和数据库表中已存在的邀请码重复


		// 新版本获取全部邀请码从allInvitationCodesCollection获取，此时allInvitationCodesCollection的记录可能为空，所以需要判断
    	// 获取全部邀请码
    	const allInvitationCodesResult = await allInvitationCodesCollection.get();
    	const allInvitationCodesData = allInvitationCodesResult['data'];

		// 把allInvitationCodesData中的第一条记录的codes字段（如果存在）转换成Set
		let allCodesSet = new Set(allInvitationCodesData.length > 0 && allInvitationCodesData[0].codes ? allInvitationCodesData[0].codes : []);

		// 调用generateInviteCode函数生成新的邀请码
		const newCode = generateInviteCode(allCodesSet);

		// 更新或新增邀请码集合记录
		if (allInvitationCodesData.length > 0) {
			// 异步执行，不需要await同步等等
			
			// 如果记录存在，则更新
			allInvitationCodesCollection.where({
				_id: allInvitationCodesData[0]._id
			}).update({
				codes: Array.from(allCodesSet) // 注意这里确保了新邀请码已添加到集合中
			});
		} else {
			// 如果记录不存在，则新增
			allInvitationCodesCollection.add({
				codes: Array.from(allCodesSet) // 注意这里确保了新邀请码已添加到集合中
			});
		}
	
		// 2. 开始注册（一键登录不用填写邀请码，邀请码在其他页面单独填写）

		// 注册用户之前先计算赠送1天会员的到期时间（从当前时间开始计算新的到期时间）
		let newExpireDate = Date.now();
			// 要增加的VIP天数
			daysToAdd = 1;
			// 计算新的VIP到期时间
		    newExpireDate += daysToAdd * 24 * 60 * 60 * 1000;
		

		// 注册用户结果
		let registerUserResult = await userCollection.add({ // 注册 - 新增用户
			device_oaid, // 设备oaid
			app_platform, // APP平台
			my_invite_code: newCode, // 生成用户自身邀请码
			username: "", // 当前版本不再生成账号， 生成用户自身账号generateUniqueAccount(usernames)
			daily_movie_count: 3,// 每日观看次数
			surplus_movie_count: 3,// 当日剩余观看次数
			score: 0,
			coin: 0,
			// 更新注册用户的VIP状态和到期时间
			vip: false,// 注册赠送，2024-0517-起暂停赠送7天VIP
			vip_expire_date: newExpireDate,// 注册赠送（2025-0106起赠送1天VIP）
			//vip_expire_date: 0,// 注册赠送，2024-0517-起暂停赠送7天VIP
			vip_level: 0, // 会员等级：0 会员（VIP） 1 大会员（SVIP）
			status: 0 ,// 正常
			inviter_uid: "", // 邀请人id
			invite_time: 0, // 受邀请时间
			register_ip: clientInfo['clientIP'], // 注册是IP地址
			register_date: Date.now(), // 注册时间 (获取当前时间戳)
			login_ip: clientInfo['clientIP'], // 登录IP地址
			login_date: Date.now(), // 登录时间 (获取当前时间戳)
			// 以下字段暂时没用
			avatar: "",
			password: "",
			nickname: "",
			introduction: "",
		});

		const { id: user_id } = registerUserResult
		
		// 异步执行，不需要await同步等等
		sendSystemNotice(appSystemNoticeCollection,{
		    user_id: user_id,
		    title: "新用户注册通知",
		    //content: "亲爱的用户，欢迎您加入我们！我们已为您的账户赠送7天VIP会员体验，现在您可以享受所有VIP特权！祝您体验愉快。"
			//content: "欢迎加入我们！您已获得7天VIP会员试用，享受全部特权。试用结束后，您每天还可免费观看三次视频。祝您体验愉快！"
			//content: "欢迎加入我们！请注意，自2024年5月17日18:00起，我们暂停了注册赠送7天VIP会员试用的活动。不过，您每天仍然可以免费观看三次视频。祝您体验愉快！"
			content: "欢迎加入我们！请注意，自2024年5月17日18:00起，我们调整了新用户的福利。注册当天，您可以享受1天VIP会员体验，之后每周一至周三将继续享有1次免费观看的权益。我们已暂停了注册赠送7天VIP会员试用的活动。祝您在平台上的每一刻都充满乐趣！"
		});
		
		// 添加会员变更记录，2024-0517-起暂停赠送7天VIP
		//await addVipChangeRecord(userVipCollection, user_id, daysToAdd, '新用户注册赠送VIP');
		
		const queryUserInfoResult = await userCollection.where({
			_id: user_id
		}).get()
		
		
		let result = queryUserInfoResult['data'][0]
		
		// 处理数据，将device_oaid转换成前三位和后四位显示，中间用*代替，保留11位
		if (result.device_oaid) {
			const oaid = result.device_oaid;
			result.device_oaid = `${oaid.substring(0, 3)}****${oaid.substring(oaid.length - 4)}`;
		}
		
		// ，2024-0517-起暂停赠送7天VIP
		//return createResponse(STATE_CODE.SUCCESS, "注册成功，已为你赠送7天VIP会员", result)
		return createResponse(STATE_CODE.SUCCESS, "注册成功", result)
	}

}


















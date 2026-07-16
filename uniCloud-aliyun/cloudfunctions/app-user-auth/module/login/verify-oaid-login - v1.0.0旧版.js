const {
	userCollection,
	allInvitationCodesCollection
} = require('../../common/constants')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')

const {
	checkVipStatus
} = require('../../common/fun')

// 生成6位数邀请码的函数（用于注册账号成功时生成用户自身的邀请码）
function generateInviteCode(allcodes) {
	// 创建一个空的集合来存储已经生成的邀请码
	//let codes = new Set();
	let codes = allcodes;

	// 定义所有可能的字符
	//const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

	// 去掉小写字母
	const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

	// 生成邀请码的函数
	function generateCode() {
		let code = '';
		// 循环6次，每次从characters中随机选择一个字符添加到code中
		for (let i = 0; i < 6; i++) {
			code += characters.charAt(Math.floor(Math.random() * characters.length));
		}
		// 检查新生成的邀请码是否已经存在
		if (codes.has(code)) {
			// 如果已经存在，则重新生成
			return generateCode();
		} else {
			// 如果不存在，则添加到集合中并返回
			codes.add(code);
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
	const ClientInfo = this.getClientInfo()

	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let device_oaid = '',
		app_platform = '';
	try {
		({
			device_oaid,
			app_platform
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	// 验证OAID登录
	// 在设备OAID之前拼接APP平台参数，用于区分不同APP平台的用户
	device_oaid = app_platform + device_oaid

	// APP平台参数未传递
	if (!app_platform || typeof app_platform !== 'string' || app_platform.trim() ===
		"") { // APP平台参数为空或不为字符串类型，或去掉字符串两端的空白字符后为空
		return createResponse(STATE_CODE.ERROR, "无效的请求数据");
	}

	// APP平台参数不正确
	if (app_platform !== "WithHim") { // APP平台参数不正确
		return createResponse(STATE_CODE.ERROR, "无效的请求数据");
	}

	let queryUserResult;
	try {
		queryUserResult = await userCollection.where({
			device_oaid: device_oaid
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
		


		// 先更新用户的登录时间和登录IP
		let updateUserResult = await userCollection.where({
			_id: user_id
		}).updateAndReturn({
			login_ip: ClientInfo['clientIP'], // 最后登录IP
			login_date: Date.now(), // 最后登录时间 (获取当前时间戳)
			vip: checkVipStatus(user) // 检查并更新VIP状态
		})
		
		const data = updateUserResult['doc']
		
		return createResponse(STATE_CODE.SUCCESS, "登录成功", data);

	} else { // 无记录，此账号不存在，则先注册


		// 1. 获取用户数据库表中所有用户的自身邀请码，因为注册时，生成的自身邀请码不可以和数据库表中已存在的邀请码重复

		// 获取全部自身邀请码，指定返回字段 [自身邀请码] 只返回my_invite_code字段、_id字段，其他字段不返回
		const existingCodesResult = await userCollection.field({
				my_invite_code: true, // 用户自身邀请码
				username: true // 用户账号
			})
			.limit(1000) // 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
			.get()
		// 创建一个空的集合来存储已经生成的邀请码，循环遍历，添加到集合中，用于注册用户时，不生成重复的自身邀请码
		const codes = new Set(existingCodesResult['data'].map(item => item.my_invite_code)); // 用户自身邀请码集合
		const usernames = new Set(existingCodesResult['data'].map(item => item.username)); // 用户账号集合
		// return createResponse(STATE_CODE.INVALID_INVITE_CODE, "全部邀请码", Array.from(codes))


		// 2. 开始注册（一键登录不用填写邀请码，邀请码在其他页面单独填写）

		// 注册用户结果
		let registerUserResult = await userCollection.add({ // 注册 - 新增用户
			device_oaid, // 设备oaid
			my_invite_code: generateInviteCode(codes), // 生成用户自身邀请码
			username: generateUniqueAccount(usernames), // 生成用户自身账号
			daily_movie_count: 5,// 每日观看次数
			surplus_movie_count: 5,// 当日剩余观看次数
			score: 0,
			vip: false,
			vip_expire_date: 0,
			verified: false,
			status: 0 ,// 正常
			inviter_uid: "", // 邀请人id
			invite_time: 0, // 受邀请时间
			register_ip: ClientInfo['clientIP'], // 注册是IP地址
			register_date: Date.now(), // 注册时间 (获取当前时间戳)
			login_ip: ClientInfo['clientIP'], // 登录IP地址
			login_date: Date.now(), // 登录时间 (获取当前时间戳)
			// 以下字段暂时没用
			avatar: "",
			backdrop: "",
			subscription_buy_url: "",
			password: "",
			nickname: "",
			introduction: "",
		});

		const {
			id: user_id
		} = registerUserResult
		const queryUserInfoResult = await userCollection.where({
			_id: user_id
		}).get()
		let result = queryUserInfoResult['data'][0]

		return createResponse(STATE_CODE.SUCCESS, "注册成功", result)
	}

}
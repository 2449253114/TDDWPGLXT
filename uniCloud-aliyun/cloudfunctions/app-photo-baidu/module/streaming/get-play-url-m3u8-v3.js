const {
	dbCmd,
	userCollection,
	userPurchasesCollection,
	m3u8FileCollection,
} = require('../../common/constants')

const {
	checkIfPurchased
} = require('../../common/fun')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')


/**
 * 请求指定FSID的M3U8播放URL。
 * 该函数检查数据库中是否存在有效的M3U8文件记录。
 * 如果存在且未过期，并且转码状态为"available"，则直接返回对应的播放URL。
 * 如果记录存在但转码状态为不可播放或已过期，则抛出错误提示用户。
 * @param {string} fsid - 一刻相册文件的唯一标识符。
 * @returns {string} M3U8文件的URL，如果记录有效且未过期。
 * @throws {Error} 如果视频正在转码、部分可播放但还在转码中，或视频暂未分配服务器。
 */
async function requestM3U8PlayUrl (fsid) {
	const currentTime = Date.now()
	
	// 定义接口启用时间的变量，表示2024年8月3日06:00:00的时间戳
	const activationTime = 1722636000000;
	
	// 检查当前时间是否早于接口启用时间
	if ( currentTime < activationTime ) {
		throw new Error('播放请求已暂停使用，请看首页公告');
	}
	
	// 从数据库查询当前视频的m3u8文件记录
	let m3u8RecordResult = await m3u8FileCollection.where({
		fsid: parseInt(fsid, 10), // 需要转int类型，因为这个表中不是string类型的fsid。fsid是不会变的，即使是在其他相册有相同的文件，因为fsid是唯一的
	}).get();
	
	// 只需要取出第一条记录即可
	let m3u8Record = m3u8RecordResult.data && m3u8RecordResult.data[0];
	
	// 如果m3u8记录存在且未过期，并且转码状态为可播放，则直接返回URL
	if (m3u8Record && m3u8Record.expire_time > currentTime && m3u8Record.transcoding_status === "available") {
		// 初始化m3u8记录数据
		const m3u8FileData = {
		    fsid: parseInt(fsid, 10),// 确保fsid为整数类型
		};
		await updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData)
		// 如果记录存在且未过期，直接返回记录中的m3u8文件URL
		return m3u8Record.m3u8_file_url;
	} 
	// 如果m3u8记录存在且未过期，并且转码状态为转码中或部分可播放，则直接提示
	else if (m3u8Record && m3u8Record.expire_time > currentTime && (m3u8Record.transcoding_status === "transcoding" || m3u8Record.transcoding_status === "partial_available")) {
		// 视频正在转码中或部分可播放但还在转码中
		throw new Error('视频正在转码中，或部分可播放但仍在转码中，请稍后再来哦。');
	}
	// 如果m3u8记录存在且过期（只有转码状态为"available"的记录，才会有m3u8_file_url）
	else if (m3u8Record && m3u8Record.expire_time < currentTime && m3u8Record.transcoding_status === "available") {
		throw new Error('当前视频暂未分配服务器，请观看其他视频或晚点再来。');
	}
	
	// 如果没有找到有效的记录，可能需要抛出一个错误或进行其他处理
	//throw new Error('当前视频未找到有效的播放地址。');
	throw new Error('当前视频暂未分配服务器，请观看其他视频或晚点再来。');
}

/**
 * 更新m3u8文件记录到数据库
 * @param {object} m3u8FileCollection 数据库集合引用
 * @param {object|null} m3u8Record 当前数据库中的记录
 * @param {object} m3u8FileData 要更新或添加的记录数据
 */
async function updateM3u8Record(m3u8FileCollection, m3u8Record, m3u8FileData) {
	const {
		read_count,
		...otherParams
	} = m3u8FileData
	
	// 必须确保fsid为int类型

	// 如果之前存在记录，则更新记录，否则创建新记录
	if (m3u8Record) {
		await m3u8FileCollection.doc(m3u8Record._id).update({
			...otherParams,
			read_count: dbCmd.inc(1) // 用自增好点
		});
	}
}


/**
 * 获取M3U8视频播放地址（用于Web端和APP端，无需请求头播放）
 * @tutorial url https://photo.baidu.com/youai/file/v1/streaming?fs_id=802501495334896
 * @url /api/yike/play-url-m3u8
 * @param {Object}  params
 * @param {String}  params.user_id       		用户ID
 * @param {String}  params.album_id       	  	相册ID
 * @param {String}  params.fsid       	  		文件ID
 * @returns
 */
module.exports = async function() {
	// 获取客户端信息：其中包含访问IP
	const clientInfo = this.getClientInfo()

	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	// TODO 这里还需要增加一个 相册是否已购买字段、文件是否已购买字段（或者你更建议怎么做会更好？）
	let user_id, album_id, fsid, tid;
	try {
		({
			user_id,
			album_id,
			fsid,
			tid
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	/* 
	// TODO 优先判断相册是否已购买，如果是true，则开始查数据库核实，否则如果文件是否已购买，如果true，则开始核实数据库，如果核实，则不需要扣除次数和VIP效验等步骤（或者你更建议怎么做会更好？）
	// TODO: 检查相册或文件是否已购买
	const hasPurchasedAlbum = await checkIfPurchased(userPurchasesCollection, user_id, album_id, null);
	const hasPurchasedFile = !hasPurchasedAlbum && fsid ? await checkIfPurchased(userPurchasesCollection,
		user_id, null, fsid) : false;

	// 如果相册或文件已购买，直接请求播放地址
	if (hasPurchasedAlbum || hasPurchasedFile) {
		try {
			const playUrl = await requestM3U8PlayUrl(fsid);
			// 构造返回数据
			const data = {
				playUrl
			}
			return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data); // 获取播放地址成功
		} catch (error) {
			return createResponse(STATE_CODE.FAIL, error.message);
		}
	}
	 */
	// 没有购买相册或文件，则正常走播放次数或VIP逻辑


	// 先查询用户信息，获取是否VIP，VIP到期时间是否已过期，非VIP则获取当日剩余观看次数，== 0 则直接返回意思就是说当日免费观看视频次数已经没有了，大致是这个意思。

	// 查询用户信息
	const userResult = await userCollection.where({
		_id: user_id
	}).get()

	// 检查用户是否存在
	if (userResult.data.length === 0) {
		return createResponse(STATE_CODE.FAIL, "用户不存在");
	}

	// 用户信息
	const userInfo = userResult.data[0]
	
	// 检查是否为被永久禁止登录的用户（动态数据，通过用户状态status==3（永久封禁）来拦截登录）
	if (userInfo.status == 3) {
		// 如果用户ID在禁止登录的用户列表中，则拒绝登录
		//return createResponse(STATE_CODE.FAIL, "您的账号已被禁止登录");
		//return createResponse(STATE_CODE.FAIL, "服务器异常，请稍后重试");
		//return createResponse(STATE_CODE.FAIL, "服务器维护中，请稍后重试");
		//return createResponse(STATE_CODE.FAIL, "服务器异常");// 无任何数据，不闪退APP
		return createResponse(STATE_CODE.FAIL, "已被永久封禁");// 无任何数据，不闪退APP
		//return createResponse(STATE_CODE.SUCCESS, "服务器链接失败");// 无任何数据，直接让APP闪退
	}
	
	//2025-0114-1227 已废弃，会导致有些手机只能用流量看的BUG，因为云函数可能获取的他手机卡的IP，而非WiFi的IP
	// 检查请求IP是否与最后一次登录IP一致，不一致就是破解APP，如果被破解，那么不需要登录，但是这个用户id的登录ip是破解人的
	const request_ip = clientInfo['clientIP']
	const last_login_ip = userInfo['login_ip']
	if (request_ip !== last_login_ip) {
		// 带上IP返回
		// return {
		// 	request_ip: request_ip,
		// 	last_login_ip: last_login_ip,
		// 	...createResponse(STATE_CODE.FAIL, "非法访问：您当前的网络环境与账户登录时不符，请在相同的网络环境下观看视频。")
		// }
	}
	

	// 检查用户是否VIP以及VIP是否已过期
	if (userInfo.vip && userInfo.vip_expire_date > Date.now()) {
		// 如果是VIP且VIP未过期，则直接请求播放地址
		try {
			const playUrl = await requestM3U8PlayUrl(fsid);
			// 构造返回数据
			const data = {
				playUrl,
				//Cookie: headers.Cookie, // 播放m3u8视频不需要带上请求头信息
			}
			//return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data); // 获取播放地址成功

			// 带上IP返回
			return {
				request_ip: request_ip,
				last_login_ip: last_login_ip,
				...createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放", data) // 获取播放地址成功
			}

		} catch (error) {
			//return createResponse(STATE_CODE.FAIL, error.message);

			// 带上IP返回
			return {
				request_ip: request_ip,
				last_login_ip: last_login_ip,
				...createResponse(STATE_CODE.FAIL, error.message)
			}
		}

	} else {
		// 有时候，VIP过期时间已经过了，但是用户VIP状态还是true，这个时候需要更新用户VIP状态为false

		// 如果不是VIP或VIP已过期，则检查当日剩余观看次数
		const surplusMovieCount = userInfo.surplus_movie_count || 0;
		// 检查当日剩余观看次数是否已用完
		if (surplusMovieCount <= 0) {
			return createResponse(STATE_CODE.FAIL, "今日免费观看次数已用完。每周一至周三，免费看 1 次");
		}

		// 请求播放地址，然后更新当日剩余观看次数
		try {
			const playUrl = await requestM3U8PlayUrl(fsid);

			// 更新当日剩余观看次数
			const updateResult = await userCollection.where({
				_id: user_id
			}).update({
				surplus_movie_count: surplusMovieCount - 1,
				vip: false
			})

			// 构造返回数据
			const data = {
				playUrl,
			}
			//return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放，观看次数 -1，每日免费1次", data); // 获取播放地址成功
			//return createResponse(STATE_CODE.SUCCESS, "请求成功：准备播放，每日免费看 1 次", data); // 获取播放地址成功
			
			return createResponse(STATE_CODE.SUCCESS, "准备播放，每周一至周三，免费看 1 次", data); // 获取播放地址成功
		} catch (error) {
			return createResponse(STATE_CODE.FAIL, error.message);
		}
	}
}

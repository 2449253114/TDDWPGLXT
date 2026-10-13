/**
 * 同多多网盘 MongoDB 索引创建脚本（mongosh）
 *
 * 目标库：一键搬家工具导入的扩展数据库（默认 tddlegacy），集合与线上阿里云内置库一致。
 *
 * 运行方式（在项目根目录执行，需要 mongosh 2.x）：
 *   预览，只读不建索引：
 *     Git Bash：   INDEX_DRY_RUN=1 mongosh --nodb --quiet scripts/mongodb/create-indexes.mongosh.js
 *     PowerShell：$env:INDEX_DRY_RUN=1; mongosh --nodb --quiet scripts/mongodb/create-indexes.mongosh.js
 *   正式创建：
 *     mongosh --nodb --quiet scripts/mongodb/create-indexes.mongosh.js
 *   PowerShell 下 $env:INDEX_DRY_RUN 会保留到窗口关闭，正式创建前先执行 Remove-Item Env:INDEX_DRY_RUN。
 *
 * 连接配置：读取项目根目录 .env（以 .env 为准，.env 中缺失或为空的键才回退到同名环境变量），配置项见 .env.example：
 *   DATABASE_URL        连接串。已包含账号密码时直接使用；未包含时用 DATABASE_USER / DATABASE_PASSWORD 拼接
 *   DATABASE_USER       数据库账号
 *   DATABASE_PASSWORD   数据库密码
 *   DATABASE_NAME       业务库名，未配置时默认 tddlegacy（连接串路径里的库只用于认证）
 * 脚本不输出连接串、账号和密码，错误信息中出现的凭据会被替换为 ***。
 *
 * 行为约定：
 * - 只创建索引，不删除、不修改任何索引和数据；可重复执行。
 * - 集合不存在时跳过并提示，不会因库名写错而建出空集合（createIndex 会隐式建集合）。
 *   唯一例外是 COLLECTIONS_TO_CREATE 中的新表（user-invite-codes），缺失时显式创建。
 * - 同名同定义，或定义相同但名称不同的索引已存在时，视为已满足并跳过。
 * - 同名不同定义、同键不同选项视为冲突，只报告不处理，由人工核对。
 * - 每个索引单独创建，一个失败不影响其余。存在冲突或失败时，脚本最后抛错，以非 0 退出。
 * - 应在全量数据导入完成后再执行一次，以确认结果。
 *   历史集合上不新增唯一索引，所以先建索引不会导致导入时历史数据被拒绝。
 *
 * ------------------------------------------------------------------------------------------
 * 索引命名规范
 * - 新索引按键顺序把字段名用下划线连接；字段 _id 写作 id，嵌套字段的点换成下划线，降序字段后追加 _desc。
 *   例如 {user_id:1, create_date:-1} 命名为 user_id_create_date_desc。
 *   该规则与仓库 uniCloud-aliyun/database/*.index.json 中已有的 inviter_uid_id、user_id_total_fee 一致。
 * - 线上迁移过来的既有索引沿用原名（例如 device_oaid_）。不改名，避免出现同键不同名的冲突。
 *
 * ------------------------------------------------------------------------------------------
 * 字段顺序原则（ESR）
 * - 等值条件（含选择性最高的 user_id、album_id 等）放最前，排序字段其次，范围条件放最后。
 * - $in 视作多个等值点：后面跟排序字段时，MongoDB 会对各点做归并排序，不需要内存排序。
 *
 * ------------------------------------------------------------------------------------------
 * 唯一索引
 * - 保留线上已有的 4 个唯一索引：user-accounts.device_oaid、user-accounts.my_invite_code、
 *   yike-albums.album_id、yike-person.person_id。线上数据已满足这些约束，导入后不会违反。
 * - 新表 user-invite-codes.code 建唯一索引。
 *   - 它是本次新建的已占用邀请码登记表，数据只来自迁移云对象 migrate-invite-codes（先查重再写入）和注册流程，不存在历史重复。
 *   - 注册流程正是依赖这个唯一约束，防止并发注册占用同一个码。
 *   - 若一键搬家导入该表，源表在阿里云上已有同样的唯一索引（uniCloud-aliyun/database/user-invite-codes.index.json）。
 * - 历史集合不新增唯一索引。下面这些字段业务上“应唯一”，但有两个前提尚未满足：
 *   (1) 目标库还未导入全量数据，现在加唯一约束会让历史重复记录在导入时被拒绝，相当于迁移丢数据；
 *   (2) 写入方都是“先查后插”，且没有处理重复键错误 E11000。
 *   - user-payment-orders.out_trade_no：邀请赠送订单号是 'VIPZS' + 毫秒，邀请双方可能在同一毫秒写入，必然撞号。
 *   - yike-album-files-m3u8file.fsid：后台 xiufu-video 页面专门清理 (album_id, fsid, tid) 重复记录，说明历史上出现过重复。
 *   - 其余候选：yike-video-puzzle.video_fsid、yike-fsid-request-log.fsid、associations_file_person(file_id, person_id)、
 *     cheerio-crawler-urls(task_id, url)、yike-account-cookie.user_name、admin-auto-video-screenshot.cursor。
 *   - 要转为唯一，必须先统计并清理重复值，再给写入方补上重复键处理，然后单独上线。
 * - yike-album-files.fsid 不唯一：同一 fsid 可以出现在多个相册。
 *
 * 稀疏索引：不创建
 * - 本项目写入时通常用空字符串、0、false 作为默认值，而不是省略字段（例如 inviter_uid: ''、invite_time: 0）。
 * - sparse 只跳过“字段缺失”的文档，起不到缩小索引的作用。
 * - 稀疏索引还会让不带该字段条件的排序、计数无法使用它。
 *
 * 部分索引：不创建
 * - 评估过的候选：
 *   - user-payment-orders 上按 is_payment_status_checked:false 过滤的部分索引：单个用户的订单量很小，user_id_total_fee 已足够。
 *   - user-accounts 上 inviter_uid 非空的部分索引：违规邀请 v2 用 $exists + $ne 写条件，无法被推导为过滤表达式的子集，用不上这个索引。
 *
 * TTL 索引：不创建
 * - 所有时间字段都是数字时间戳（create_time、create_date、expire_time 等，单位有毫秒也有秒）。
 * - TTL 只对 BSON Date 生效，对数字字段永不过期，建了也是无效索引。
 * - 候选集合：yike-invalid-m3u8-files（create_date 实为“可清理时刻”）、system-app-notice（只增不删）、send_sms_logs（expire_time）。
 * - 如需启用：先让写入方新增 Date 字段（例如 expire_at: new Date(...)）并回填，再建 {expire_at:1} 且 expireAfterSeconds:0。
 *   TTL 会物理删除数据，保留期需业务确认。
 *
 * ------------------------------------------------------------------------------------------
 * 不建二级索引的集合及原因
 * - system-app-config：单文档集合，只做无条件读取或按 _id 更新。
 * - user-all-Invitation-codes：旧邀请码总表（单文档 codes 数组），改造后注册不再读写，只由迁移云对象 migrate-invite-codes 读取。
 * - shop-goods、yike-account-cookie、yike-collection-config、admin-auto-task、admin-auto-video-screenshot、
 *   system-app-tag、yike-tv-series、yike-albums-filter、cheerio-crawler-tasks：
 *   商品、账号、配置、任务、单相册游标页、标签、网剧、过滤相册、采集任务，数据量小，全表扫描成本可以忽略。
 * - user-coin-changes：只写不读。
 * - user-invitations、associations_person_tag、send_sms_logs：代码中没有访问。
 * - yuta-media-library：只新增。
 * - gay-comics：App 接口在查询数据库前就已 return；后台只有无锚定正则筛选，索引帮不上。
 * - yike-invalid-m3u8-files：后台按 create_date < 当前时间-10 小时分批清理。旧记录在自然序前部，不建索引也能很快取满每批，
 *   真正合适的方案是 TTL（见上）。
 * - yike-fsid-request-log.requested：布尔字段、选择性低，每轮整表在 true 和 false 之间翻转，建索引会让每次更新都移动索引项；
 *   读取时 limit 很小，扫描到第一批即可返回。
 * - 后台列表页的列筛选多为无锚定正则（new RegExp(value)），用户可选的排序字段也有十几个，属于低频手动操作，不为它们逐一建索引。
 */

(() => {
	'use strict'

	const fs = require('fs')
	const path = require('path')

	const DEFAULT_DATABASE_NAME = 'tddlegacy'

	/**
	 * 期望存在的索引，按集合分组。
	 * 每项为 { name, key, options? }，options 只放 unique 等选项，name 不要写在 options 里。
	 * 注释中“线上既有”指一键搬家工具从阿里云导出的索引，见迁移工具目录 uniCloud-alipay/database/*.index.json。
	 */
	const INDEX_PLAN = {
		'user-accounts': [
			// 线上既有：登录 verify-oaid-login-v2 按 device_oaid 等值查询，注册依赖其唯一。后台会员列表的 /^408/ 前缀正则也能走它
			{ name: 'device_oaid_', key: { device_oaid: 1 }, options: { unique: true } },
			// 线上既有：按邀请码精确查询，包括 bind-Invitation、get-user-info、legacy-migration-api user-info 以及多个后台页面
			{ name: 'my_invite_code_', key: { my_invite_code: 1 }, options: { unique: true } },
			// 线上既有：后台首页 adminHome 用 {vip:true, vip_expire_date<now} 修正过期会员，vip=true 的账号是少数
			{ name: 'vip_', key: { vip: 1 } },
			// 线上既有：adminHome 的 {vip:false, vip_expire_date>now}，以及违规邀请 v1 页面的永久会员统计 vip_expire_date>=X
			{ name: 'vip_expire_date_', key: { vip_expire_date: 1 } },
			// 新增（仓库 user-accounts.index.json 已声明）。替代线上单字段 inviter_uid_
			// - 违规邀请 v2：按 inviter_uid 等值或 in 过滤，再用 _id 做游标分页；inviter_uid 在前，_id 同时提供游标区间和排序。
			// - 同时覆盖 App 邀请记录 invitation-records、绑定邀请计数、取消邀请人的计数和批量更新。
			//   App 邀请记录按 invite_time 倒序，排序在单个邀请人的受邀账号内存里完成，数量有限。
			{ name: 'inviter_uid_id', key: { inviter_uid: 1, _id: 1 } },
			// 新增（仓库已声明）：违规邀请 v2 按时间段扫描（invite_time 范围 + _id 区间），时间窗口小，invite_time 放首位选择性高
			{ name: 'invite_time_id', key: { invite_time: 1, _id: 1 } },
			// 新增：违规注册检测按 register_date 范围计数并分页读取，会员列表也有注册时间筛选。该字段注册后不变，只在注册时有维护成本
			{ name: 'register_date', key: { register_date: 1 } }
		],

		'user-payment-orders': [
			// 新增：支付状态同步 async-ltzf-order-status（App 启动和首页调用）与 get-pay-order 都按 out_trade_no 查询并更新订单，
			// 当前每次都是全表扫描。不设唯一，原因见文件头“唯一索引”一节
			{ name: 'out_trade_no', key: { out_trade_no: 1 } },
			// 新增（仓库 user-payment-orders.index.json 已声明）。user_id 等值放首位，选择性最高。替代线上单字段 user_id_
			// - 取消邀请人：{user_id, total_fee:0} 计数和删除。
			// - legacy-migration-api user-orders：{user_id, order_type:1, status:1, total_fee>0}，可以直接跳过 0 元赠送订单。
			// - App 订单列表 {user_id, order_type in} 与支付同步 {user_id, is_payment_status_checked:false}：
			//   在单个用户的订单内按 create_time 做内存排序，单个用户的订单量很小。
			{ name: 'user_id_total_fee', key: { user_id: 1, total_fee: 1 } },
			// 新增：后台首页 adminHome 每次打开都会按 {status, system_recharge_issuccess, total_fee>N} 计数，并分页读取已支付订单。
			// 两个等值字段在前，范围字段 total_fee 在后
			{
				name: 'status_system_recharge_issuccess_total_fee',
				key: { status: 1, system_recharge_issuccess: 1, total_fee: 1 }
			}
		],

		'user-vip-changes': [
			// 新增（仓库 user-vip-changes.index.json 已声明）：取消邀请人按 {user_id, total_fee:0} 计数和删除
			{ name: 'user_id_total_fee', key: { user_id: 1, total_fee: 1 } }
		],

		'user-purchases-yike': [
			// 线上既有：购买校验（add-my-purchases、播放接口 checkIfPurchased）都以 user_id 等值开头。
			// 单个用户的购买记录少，album_id、file_id 的过滤在回表后完成
			{ name: 'user_id_', key: { user_id: 1 } }
		],

		'system-app-notice': [
			// 新增：App 系统消息 notifications 按 user_id 查询、按 create_date 倒序取前 100 条；全部已读按 user_id 更新；后台按 user_id in 删除。
			// 等值字段在前、排序字段在后，可直接按索引顺序取最新数据，不需要内存排序。替代线上单字段 user_id_
			{ name: 'user_id_create_date_desc', key: { user_id: 1, create_date: -1 } }
		],

		'yike-albums': [
			// 线上既有：album_id 业务唯一。用于相册详情、购买校验、file-search 的 lookup，以及后台按 album_id 等值或 in 查询
			{ name: 'album_id_', key: { album_id: 1 }, options: { unique: true } },
			// 新增：App 相册列表 albums 按 {status:1, _id $nin} 过滤，按 total_count 倒序。
			// 定时任务的 {status:1} 与 {status:1, album_type:0} 也能用它的前缀
			{ name: 'status_total_count_desc', key: { status: 1, total_count: -1 } },
			// 新增：封面定时任务（app-photo-baidu._timing，每小时 2 次）按 cover_info.fsid 逐个更新，每轮最多 300 次
			{ name: 'cover_info_fsid', key: { 'cover_info.fsid': 1 } }
		],

		'yike-album-files': [
			// 线上既有：按 fsid 等值或 in 查询的场景最多，包括文件详情、搜索、首页按 m3u8 抽样结果回查文件、
			// 封面定时任务的 {album_id, fsid} 更新、后台同步前去重
			{ name: 'fsid_', key: { fsid: 1 } },
			// 线上既有：后台文件列表在没有过滤条件时按 ctime 排序整表，没有它会对全表做内存或磁盘排序
			{ name: 'ctime_', key: { ctime: 1 } },
			// 新增：App 首页 files（createTime、createTimeGroupStick）按 {status:1, category in, ctime<=, _id nin} 过滤，按 ctime 倒序。
			// status 和 category 是等值或 in，ctime 既是排序也是范围，放最后。
			// 后台视频列表、m3u8 定时任务的 {category:1, status:1} 计数和分页也能用它的前缀
			{ name: 'status_category_ctime_desc', key: { status: 1, category: 1, ctime: -1 } },
			// 新增：App 相册文件 album-files 按 {album_id, status:1, category in, ctime<} 过滤，按 ctime 倒序，album_id 选择性最高放首位。
			// 也覆盖后台按 album_id 等值或 in 的查询、更新、删除。替代线上单字段 album_id_
			{
				name: 'album_id_status_category_ctime_desc',
				key: { album_id: 1, status: 1, category: 1, ctime: -1 }
			}
		],

		'yike-album-files-m3u8file': [
			// 线上既有：播放接口 play-url-m3u8 按 fsid 取播放地址，是 App 最高频的调用之一；m3u8 定时任务也按 fsid 先查后插
			{ name: 'fsid_', key: { fsid: 1 } },
			// 新增：App 首页随机推荐先 $match {transcoding_status:'available', expire_time > 当前时间+5 分钟}，再 $sample。
			// 等值字段在前、范围字段在后。替代线上单字段 expire_time_
			{ name: 'transcoding_status_expire_time', key: { transcoding_status: 1, expire_time: 1 } }
		],

		'yike-video-puzzle': [
			// 新增：App 首页按抽样得到的 fsid 批量 $in 查询视频截图；截图定时任务按 video_fsid in 先查后插，并逐条按 video_fsid 更新
			{ name: 'video_fsid', key: { video_fsid: 1 } }
		],

		'yike-fsid-request-log': [
			// 新增：m3u8 定时任务每小时执行 4 次，每轮按 fsid 逐条更新请求结果（8 路并发）；后台列表也按 fsid 等值筛选
			{ name: 'fsid', key: { fsid: 1 } }
		],

		'yike-person': [
			// 线上既有：人物业务主键唯一，后台按 person_id in 去重
			{ name: 'person_id_', key: { person_id: 1 }, options: { unique: true } },
			// 新增：App 人物列表 persons 按 {status in [1,2]} 过滤，按 ctime 倒序取 100 条；人物封面定时任务和后台按 status 查询也能用它的前缀
			{ name: 'status_ctime_desc', key: { status: 1, ctime: -1 } }
		],

		'associations_file_person': [
			// 新增：后台相册详情每次加载都按 file_id in（不超过 200 个）查询人物关联；绑定和解绑按 {file_id in, person_id in}。
			// 所以 file_id 放首位
			{ name: 'file_id_person_id', key: { file_id: 1, person_id: 1 } }
		],

		'cheerio-crawler-urls': [
			// 新增：采集任务入库前按 {task_id, url in} 去重
			{ name: 'task_id_url', key: { task_id: 1, url: 1 } }
		],

		'yike-collection-album-files': [
			// 新增：
			// - 后台一刻相册文件页按 {fsid in, album_id in} 判断文件是否已采集；
			// - 网剧编辑和文件管理按 album_id 等值查询、更新、删除；
			// album_id 放首位，可同时覆盖只按 album_id 的操作
			{ name: 'album_id_fsid', key: { album_id: 1, fsid: 1 } }
		],

		'user-invite-codes': [
			// 新表（替代 user-all-Invitation-codes 的单文档 codes 数组），名称与 uniCloud-aliyun/database/user-invite-codes.index.json 一致。
			// 注册 reserveInviteCode 按 code 等值查重后写入占用，迁移云对象按 code in 批量查重。
			// 唯一约束是并发注册不会占用同一个码的兜底，理由见文件头“唯一索引”一节
			{ name: 'code', key: { code: 1 }, options: { unique: true } }
		]
	}

	/** 本次新建的集合：目标库缺失时由脚本显式创建（其余集合缺失只提示，避免库名写错时建出空集合）。 */
	const COLLECTIONS_TO_CREATE = ['user-invite-codes']

	/**
	 * 线上既有、经审计没有查询依赖的冗余索引。
	 * 脚本不会删除它们，只在运行结束时列出目标库中仍存在的项。
	 * 建议先用 db.getCollection('<集合>').aggregate([{ $indexStats: {} }]) 观察一段时间的使用次数，确认后再手动 dropIndex。
	 */
	const REDUNDANT_INDEXES = {
		// inviter_uid_ 已被 inviter_uid_id 前缀覆盖。
		// daily_movie_count_ 和 surplus_movie_count_ 没有查询使用，却会在每次播放扣次数、每周全表重置时被改写
		'user-accounts': ['inviter_uid_', 'daily_movie_count_', 'surplus_movie_count_'],
		// user_id_ 已被 user_id_total_fee 前缀覆盖；没有单独按 order_type 的查询
		'user-payment-orders': ['user_id_', 'order_type_'],
		// 已被 user_id_create_date_desc 前缀覆盖
		'system-app-notice': ['user_id_'],
		// 所有查询都带 user_id
		'user-purchases-yike': ['album_id_', 'file_id_'],
		// album_id_、status_ 已被新复合索引前缀覆盖；category_ 总与 status 或 album_id 同时出现；
		// tid_、uk_ 没有查询使用；create_time_ 只在死代码中使用；
		// status_id_category_create_time 第二列是 _id，只服务已废弃的聚合，并且包含 duration_ms_long，
		// 定时任务每 2 分钟批量更新该字段时会连带改写这个索引
		'yike-album-files': [
			'album_id_',
			'status_',
			'category_',
			'tid_',
			'uk_',
			'create_time_',
			'status_id_category_create_time'
		],
		// expire_time_ 已被 transcoding_status_expire_time 覆盖；album_id_、create_time_ 只用于后台列表的列排序
		'yike-album-files-m3u8file': ['album_id_', 'create_time_', 'expire_time_'],
		// 没有查询使用
		'yike-albums': ['tid_'],
		// 没有查询使用
		'yike-person': ['album_id_']
	}

	const STATUS_LABELS = {
		exists: '已存在',
		created: '已创建',
		would_create: '待创建',
		conflict: '冲突',
		failed: '失败',
		missing_collection: '集合缺失'
	}

	/** 解析 .env：忽略空行和 # 注释行，去掉值两端成对的引号；不支持行尾注释和多行值。 */
	function readDotEnv(filePath) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`未找到 ${filePath}，请参照 .env.example 创建并填写连接配置`)
		}
		const result = {}
		const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
		for (const rawLine of text.split(/\r?\n/)) {
			const line = rawLine.trim()
			if (!line || line.startsWith('#')) continue
			const separatorIndex = line.indexOf('=')
			if (separatorIndex <= 0) continue
			let value = line.slice(separatorIndex + 1).trim()
			if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
			result[line.slice(0, separatorIndex).trim()] = value
		}
		return result
	}

	/**
	 * 生成连接串：DATABASE_URL 已带凭据时原样返回；
	 * 未带凭据且账号、密码都已配置时，把编码后的凭据拼进去；否则原样返回，由服务端决定是否需要认证。
	 */
	function buildConnectionUri(url, user, password) {
		const match = /^(mongodb(?:\+srv)?:\/\/)([^/?]*)(.*)$/.exec(url)
		if (!match) throw new Error('DATABASE_URL 必须以 mongodb:// 或 mongodb+srv:// 开头')
		const [, scheme, authority, rest] = match
		if (authority.includes('@') || !user || !password) return url
		return `${scheme}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${authority}${rest}`
	}

	/** 把 Long、Int32、Double 等 BSON 数值包装对象转成普通数字，便于比较索引定义。 */
	function toPlainValue(value) {
		if (value && typeof value === 'object') {
			if (typeof value.toNumber === 'function') return value.toNumber()
			if (typeof value.valueOf === 'function' && typeof value.valueOf() !== 'object') return value.valueOf()
		}
		return value
	}

	/** 递归排序对象键，得到与键顺序无关的稳定表示；数组保持原顺序，undefined 记为 null。 */
	function canonical(value) {
		if (value === undefined || value === null) return null
		if (Array.isArray(value)) return value.map(canonical)
		const plain = toPlainValue(value)
		if (plain && typeof plain === 'object') {
			return Object.keys(plain).sort().reduce((result, key) => {
				result[key] = canonical(plain[key])
				return result
			}, {})
		}
		return plain
	}

	/** 索引键签名：字段顺序有意义，保持原顺序。 */
	function keySignature(key) {
		return JSON.stringify(Object.keys(key).map(field => [field, toPlainValue(key[field])]))
	}

	/** 影响索引语义的选项签名；不传的布尔选项按 false 处理，与服务端省略默认值的行为一致。 */
	function optionsSignature(spec) {
		return JSON.stringify({
			unique: spec.unique === true,
			sparse: spec.sparse === true,
			expireAfterSeconds: canonical(spec.expireAfterSeconds),
			partialFilterExpression: canonical(spec.partialFilterExpression),
			collation: canonical(spec.collation)
		})
	}

	function describeIndex(index) {
		const flags = ['unique', 'sparse'].filter(flag => index[flag] === true)
		if (index.partialFilterExpression) flags.push(`partial=${JSON.stringify(canonical(index.partialFilterExpression))}`)
		if (index.expireAfterSeconds !== undefined) flags.push(`ttl=${toPlainValue(index.expireAfterSeconds)}`)
		if (index.collation) flags.push(`collation=${index.collation.locale}`)
		// 键必须按原顺序输出，字段顺序正是复合索引的含义
		const key = Object.fromEntries(Object.entries(index.key).map(([field, direction]) => [field, toPlainValue(direction)]))
		return `${index.name} ${JSON.stringify(key)}${flags.length ? ' ' + flags.join(' ') : ''}`
	}

	/** 对比计划索引与现有索引，返回 exists、conflict 或 to_create。 */
	function decide(planned, existingIndexes) {
		const plannedKey = keySignature(planned.key)
		const plannedOptions = optionsSignature(planned.options || {})
		const sameName = existingIndexes.find(index => index.name === planned.name)
		if (sameName) {
			if (keySignature(sameName.key) === plannedKey && optionsSignature(sameName) === plannedOptions) {
				return { status: 'exists' }
			}
			return { status: 'conflict', detail: `同名索引定义不同，现有：${describeIndex(sameName)}` }
		}
		const sameKey = existingIndexes.filter(index => keySignature(index.key) === plannedKey)
		const equivalent = sameKey.find(index => optionsSignature(index) === plannedOptions)
		if (equivalent) return { status: 'exists', detail: `等价索引已存在，名称为 ${equivalent.name}` }
		if (sameKey.length > 0) {
			return { status: 'conflict', detail: `同键索引选项不同，现有：${sameKey.map(describeIndex).join('；')}` }
		}
		return { status: 'to_create' }
	}

	function main() {
		if (typeof __dirname !== 'string') {
			throw new Error('请以文件方式运行：mongosh --nodb --quiet scripts/mongodb/create-indexes.mongosh.js')
		}
		const projectRoot = path.resolve(__dirname, '..', '..')
		const dotEnv = readDotEnv(path.join(projectRoot, '.env'))
		const config = name => dotEnv[name] || process.env[name] || ''

		const url = config('DATABASE_URL')
		const user = config('DATABASE_USER')
		const password = config('DATABASE_PASSWORD')
		const configuredDatabaseName = config('DATABASE_NAME')
		const databaseName = configuredDatabaseName || DEFAULT_DATABASE_NAME
		const dryRun = /^(1|true|yes)$/i.test(process.env.INDEX_DRY_RUN || '')
		if (!url) throw new Error('.env 中未配置 DATABASE_URL')

		const uri = buildConnectionUri(url, user, password)
		const secrets = [uri, url, password, password && encodeURIComponent(password)].filter(Boolean)
		const redact = text => secrets.reduce((result, secret) => result.split(secret).join('***'), String(text))

		print(`目标数据库：${databaseName}${configuredDatabaseName ? '' : '（DATABASE_NAME 未配置，使用默认值）'}`)
		print(`运行模式：${dryRun ? '预览（只读，不创建索引）' : '创建'}`)

		let targetDb
		let existingCollections
		try {
			// 脚本中的 getDB 等价于交互式 shell 的 use <库名>
			targetDb = new Mongo(uri).getDB(databaseName)
			existingCollections = new Set(targetDb.getCollectionNames())
		} catch (error) {
			throw new Error(`连接或读取集合列表失败：${redact(error.message)}`)
		}

		const plannedCollections = Object.keys(INDEX_PLAN)
		if (!plannedCollections.some(name => existingCollections.has(name))) {
			throw new Error(`数据库 ${databaseName} 中不存在任何计划内集合，请确认 DATABASE_NAME 与连接的实例是否正确`)
		}

		const results = []
		for (const collectionName of plannedCollections) {
			print(`\n[${collectionName}]`)
			const collection = targetDb.getCollection(collectionName)
			let existingIndexes
			if (existingCollections.has(collectionName)) {
				existingIndexes = collection.getIndexes()
			} else if (!COLLECTIONS_TO_CREATE.includes(collectionName)) {
				for (const planned of INDEX_PLAN[collectionName]) {
					results.push({ collectionName, name: planned.name, status: 'missing_collection' })
				}
				print('  集合缺失：已跳过，不会隐式创建集合；导入数据后请重新运行本脚本')
				continue
			} else if (dryRun) {
				print('  集合不存在：正式运行时会先创建该集合')
				existingIndexes = []
			} else {
				try {
					targetDb.createCollection(collectionName)
					print('  已创建集合')
					existingIndexes = []
				} catch (error) {
					const detail = redact(`创建集合失败 ${error.codeName || error.name}: ${error.message}`)
					for (const planned of INDEX_PLAN[collectionName]) {
						results.push({ collectionName, name: planned.name, status: 'failed', detail })
					}
					print(`  ${detail}`)
					continue
				}
			}
			for (const planned of INDEX_PLAN[collectionName]) {
				const decision = decide(planned, existingIndexes)
				let status = decision.status
				let detail = decision.detail
				if (status === 'to_create') {
					if (dryRun) {
						status = 'would_create'
					} else {
						try {
							collection.createIndex(planned.key, { ...(planned.options || {}), name: planned.name })
							status = 'created'
						} catch (error) {
							status = 'failed'
							detail = redact(`${error.codeName || error.name}: ${error.message}`)
						}
					}
				}
				results.push({ collectionName, name: planned.name, status, detail })
				print(`  ${STATUS_LABELS[status]}  ${describeIndex({ ...(planned.options || {}), name: planned.name, key: planned.key })}${detail ? `（${detail}）` : ''}`)
			}
		}

		const counts = results.reduce((result, item) => {
			result[item.status] = (result[item.status] || 0) + 1
			return result
		}, {})
		print('\n================ 汇总 ================')
		print(`计划索引 ${results.length} 个：${Object.keys(counts).map(status => `${STATUS_LABELS[status]} ${counts[status]}`).join('，')}`)

		const redundantPresent = []
		for (const [collectionName, names] of Object.entries(REDUNDANT_INDEXES)) {
			if (!existingCollections.has(collectionName)) continue
			const existingNames = new Set(targetDb.getCollection(collectionName).getIndexes().map(index => index.name))
			const present = names.filter(name => existingNames.has(name))
			if (present.length > 0) redundantPresent.push(`${collectionName}: ${present.join(', ')}`)
		}
		if (redundantPresent.length > 0) {
			print('\n以下线上既有索引经审计判定为冗余，本脚本未删除，确认 $indexStats 后可手动 dropIndex：')
			redundantPresent.forEach(line => print(`  ${line}`))
		}

		const problems = results.filter(item => item.status === 'conflict' || item.status === 'failed')
		if (problems.length > 0) {
			throw new Error(`存在 ${problems.length} 个冲突或失败的索引：${problems.map(item => `${item.collectionName}.${item.name}`).join(', ')}`)
		}
		print(dryRun ? '\n预览完成，未做任何写入。' : '\n全部完成。')
	}

	main()
})()

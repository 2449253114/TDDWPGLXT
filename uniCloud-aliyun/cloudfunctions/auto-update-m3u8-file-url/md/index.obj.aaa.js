// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const db = uniCloud.database()
const dbCmd = db.command

// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 相册文件 - m3u8文件
const m3u8FileCollectionName = 'yike-album-files-m3u8file'
const m3u8FileCollection = db.collection(m3u8FileCollectionName)

// uniCloud云储存 - 记录已失效的m3u8文件URL，用于清理
const invalidM3u8FilesCollectionName = "yike-invalid-m3u8-files"
const invalidM3u8FilesCollection = db.collection(invalidM3u8FilesCollectionName)

// 文件ID（fsid）请求日志 (这个表用于追踪fsid的请求情况，记录每个文件请求的详细信息)
const fsidRequestLogCollectionName = "yike-fsid-request-log"
const fsidRequestLogCollection = db.collection(fsidRequestLogCollectionName)
/* 
{
	"bsonType": "object",
	"description": "这个表用于追踪fsid的请求情况，记录每个文件请求的详细信息，包括文件ID、请求账号ID、请求状态和请求时间。",
	"properties": {
		"_id": {
			"description": "ID，系统自动生成"
		},
		"album_id": {
			"bsonType": "string",
			"title": "album_id",
			"description": "一刻相册，相册id，和相册列表项关联",
			"foreignKey": "yike-albums.album_id", // 关联某表字段
			"defaultValue": ""
		},
		"fsid": {
			"bsonType": "int",
			"title": "文件ID",
			"description": "一刻相册，文件的唯一标识符"
		},
		"tid": {
			"bsonType": "string",
			"title": "tid",
			"description": "一刻相册，tid",
			"defaultValue": ""
		},
		"uk": {
			"bsonType": "int",
			"title": "uk",
			"description": "一刻相册，文件上传者用户id",
			"defaultValue": ""
		},
		"account_id": {
			"bsonType": "string",
			"title": "账号ID",
			"description": "发起请求的账号ID",
			"defaultValue": ""
		},
		"requested": {
			"bsonType": "bool",
			"title": "已被请求",
			"description": "标记文件是否已被请求过",
			"defaultValue": false
		},
		"request_time": {
			"bsonType": "timestamp",
			"title": "请求时间",
			"description": "请求发生的时间",
			"defaultValue": {
				"$env": "now"
			}
		},
		"files_total": {
			"bsonType": "int",
			"title": "文件总数",
			"description": "记录 yike-album-files 数据库表 中的数据条数，yike-album-files.count(), 主要用于检查是否有新增的文件条数，然后再把新增的文件条数记录过来。",
			"defaultValue": 0
		}
	}
}
 */

// 一刻相册账号cookie（m3u8流请求时需要的cookie）
const accountCookieCollectionName = "yike-account-cookie"
const accountCookieCollection = db.collection(accountCookieCollectionName)
/* 
{
	"bsonType": "object",
	"description": "一刻相册账号cookie（m3u8流请求时需要的cookie）",
	"properties": {
		"_id": {
			"description": "ID，系统自动生成"
		},
		"user_name": {
			"bsonType": "string",
			"title": "用户名",
			"trim": "both",
			"defaultValue": ""
		},
		"cookie": {
			"bsonType": "string",
			"title": "cookie",
			"trim": "end"
		},
		"create_date": {
			"bsonType": "timestamp",
			"title": "创建时间",
			"description": "创建时间",
			"defaultValue": {
				"$env": "now"
			}
		}
	}
} 
 */

// 流程一
// 查询文件总数和需要请求的文件总数并是否要更新需要请求的文件数据库表记录，函数名和函数说明你帮我写，基本代码如下
const 变量名你帮我写 = await fileCollection.where({ 
	category: 1, // 一刻相册，文件类别: 1=视频；3=图片
	status: 1
}).count() 
const 变量名你帮我写 = await fsidRequestLogCollection.count()
// 1.如果fsidRequestLogCollection.count()总数 == 0
//   则先通过fileCollection.where(省略).count()总数来确定要分批请求多少次，每次最大1000，fileCollection.where(省略).limit(limit).skip(page * limit).field({album_id: true, fsid: true, tid: true, uk: true}).get()
//   需要把分批请求的文件结果写入到fsidRequestLogCollection.add(data), data[i]item字段有:album_id、fsid、tid、uk、account_id、requested、request_time、files_total=fileCollection.count()
// 2.如果fileCollection.where(省略).count()总数 == fsidRequestLogCollection.count()，则直接下一步逻辑（流程二）

// 流程二
// 查询账号Cookie总数和所有账号Cookie记录，函数名和函数说明你帮我写，基本代码如下
const 变量名你帮我写 = await accountCookieCollection.count()
const 变量名你帮我写 = await accountCookieCollection.limit(上面拿到的count).get()
// 1.根据账号总数去获取fsidRequestLogCollection记录
//   const 变量名你帮我写 = fsidRequestLogCollection.where({ requested: false // 标记文件是否已被请求过 }).limit(上面拿到的count).get()
//	 const 变量名你帮我写 = 为上面拿到的数据去分配请求信息，一个fsid分配一个账号Cookie，就是每个fsid对应一个账号。

// 流程三
// 队列请求（同步请求async），然后更新对应数据库表信息完毕后，间隔200毫秒后开始下一个请求（即每个请求间隔200毫秒）
	 
	 
	 
	 
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
}

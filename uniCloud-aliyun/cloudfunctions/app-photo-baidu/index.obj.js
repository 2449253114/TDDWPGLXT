// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const {
  files,
  fileDetail,
  fileSearch
} = require('./module/file/index')

// const {
//   albums,
// } = require('./module/album/index')

// 这是正确的解构和导入方式
const albumModule = require('./module/album/index');
const albums = albumModule.albums;
const albumFiles = albumModule['album-files']; // 使用方括号来访问
const albumDetail = albumModule['album-detail']; // 使用方括号来访问



const {
	persons
} = require('./module/person/index')

// 同志漫画
const comicModule = require('./module/comic/index')
const gayComics = comicModule['gay-comics']

// 文件直连
//const streamModule = require('./module/streaming/index')
//const getPlayUrl = streamModule['play-url']
const {
	streaming,
	getDownload,
	getPlayUrlMP4,
	//getPlayUrlM3U8,
	getPlayUrlM3U8New,
	getPlayUrlM3U8NewTest,
	getPlayUrlM3U8_V3
} = require('./module/streaming/index')

const {
	dbCmd,
	fileCollection,
} = require('./common/constants')

const {
	photoConfig
} = require('./common/photo-config')

const {
	selectRandomAvatarUrl,
	getRandomTimestampInRange
} = require('./common/fun.js')

const {
	STATE_CODE,
	createResponse
} = require('./common/response')


// 每30分钟后自动更新相册封面
const autoUpdateAlbumCover = require('auto-update-album-cover')

module.exports = {
	_before: function () { // 通用预处理器

	},
	_timing: async function (param) { // 云对象使用定时触发：https://doc.dcloud.net.cn/uniCloud/trigger.html
		console.log('触发时间：', param.Time)
		// 云对象定时触发的业务逻辑
		// 每1小时执行一次
		//await auto_update_file_cover() // 已在admin-auto-task-asc
		//let res = await updateCoverUrls()
		// 您可能想要处理响应或返回它
		//return res;
		
		let res = await autoUpdateAlbumCover()
		return res;
	},

	
	

	/**
	 * 获取指定类别（视频、图片）文件列表（不指定某个相册的文件，直接查询）
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getCategoryFileList
	 * @param {Object}  params
	 * @param {Number}  params.pageSize       每页显示数量
	 * @param {Number}  params.category       文件类别: 1=视频；3=图片
	 * @param {Array}   params.ids       	  文件ID数组，用于跳过已经查询过的文件，ids数组中的文件不会被查询出来
	 * @returns
	 */
	files,
	
	
	/**
	 * 获取指定文件详情
	 * @url /api/yike/file-detail
	 * @param {Object}   params
	 * @param {String}   params.fsid       	  		文件ID
	 * @returns
	 */
	'file-detail': fileDetail,
	


	/**
	 * 搜索文件
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/file-search
 	 * @param {Object}  params
 	 * @param {Number}  params.fsid  	一刻相册_文件id
	 */ 
	'file-search': fileSearch,

	
	/**
	 * 获取相册列表（不指定某个相册，直接查询）
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getAlbumList
	 * @param {Object}  params
	 * @param {Number}  params.pageSize       每页显示数量
	 * @param {Array}   params.ids       	  相册ID数组，用于跳过已经查询过的相册，ids数组中的相册不会被查询出来
	 * @returns
	 */
	albums,
	
	
	/**
	 * 获取指定相册里的文件列表
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getAlbumFileList
	 * @param {Object}  params
	 * @param {String}  params.album_id       一刻相册_相册ID
	 * @param {Number}  params.pageSize       每页显示数量
	 * @param {Array}   params.ids       	  相册文件ID数组，用于跳过已经查询过的相册文件，ids数组中的相册文件不会被查询出来
	 * @returns
	 */
	'album-files': albumFiles,
	

	/**
	 * 获取相册详情信息（指定相册）
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getAlbumDetail
	 * @param {Object} params 
	 * @param {String} params.albumId 相册ID
	 */
	'album-detail': albumDetail,
	
	
	
	
	/***
	 * 获取人物列表（直接获取全部人物列表）
	 * @url POST /getPersonList
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getPersonList
	 */
	persons,
	
	
	/**
	 * 获取漫画列表（不指定某个漫画，直接查询）
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getComicList
	 * @param {Object}  params
	 * @param {Number}  params.pageSize       每页显示数量
	 * @param {Array}   params.ids       	  漫画ID数组，用于跳过已经查询过的漫画，ids数组中的漫画不会被查询出来
	 * @returns
	 */
	'gay-comics': gayComics,
	
	
	
	
	// 已不使用
	streaming,
	
	
	
	// 仅用于apipost测试
	getDownload,
	
	

	
	
	/**
	 * 获取MP4视频播放地址 (仅用于APP端，因为需要请求头播放)
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-photo-baidu/getPlayUrl
	 * @param {Object}  params
	 * @param {String}  params.user_id       		用户ID
	 * @param {String}   params.album_id       	  	相册ID
	 * @param {String}   params.uk       	  		uk
	 * @param {String}   params.tid       	  		tid
	 * @param {String}   params.fsid       	  		文件ID
	 * @returns
	 */
	'play-url-mp4': getPlayUrlMP4,
	
	
	/**
	 * 获取M3U8视频播放地址（用于Web端和APP端，无需请求头播放）
	 * @tutorial url https://photo.baidu.com/youai/file/v1/streaming?fs_id=802501495334896
	 * @url /api/yike/play-url-m3u8
	 * @param {Object}  params
	 * @param {String}  params.user_id       		用户ID
	 * @param {String}   params.album_id       	  	相册ID
	 * @param {String}   params.uk       	  		uk
	 * @param {String}   params.tid       	  		tid
	 * @param {String}   params.fsid       	  		文件ID
	 * @returns
	 */
	//'play-url-m3u8': getPlayUrlM3U8,
	//'play-url-m3u8': getPlayUrlM3U8New,// TODO 2024-0517-0116调整为此接口，优化了一刻相册的视频请求（库里有且未过期就读库，减少一刻相册的请求）
	'play-url-m3u8': getPlayUrlM3U8_V3,// TODO 2024-0802-2336调整为此接口，优化了一刻相册的视频请求（直接读库里有且未过期，否则晚点再来看，减少一刻相册的请求）
	

	getPlayUrlM3U8New,
	getPlayUrlM3U8NewTest,
	getPlayUrlM3U8_V3,
	
	
	
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

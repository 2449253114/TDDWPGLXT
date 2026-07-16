// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const {
	queryPCode,
	joinAlbum
} = require('./module/album/index')

const {
	addCkAccount
} = require('./module/account-ck/index')

const {
	getUnexpiredVideos,
	getVideoFiles,
	getVideoFilesByIds,
	getVideoCount	
} = require('./module/file/index')

module.exports = {
	_before: function () { // 通用预处理器

	},
	'query-pcode': queryPCode,
	'join-album': joinAlbum,
	'add-ckaccount': addCkAccount,
	'query-unexpired-videos': getUnexpiredVideos,
	'query-video-files': getVideoFiles,
	'query-video-files-by-ids': getVideoFilesByIds,
	'query-video-count': getVideoCount
}

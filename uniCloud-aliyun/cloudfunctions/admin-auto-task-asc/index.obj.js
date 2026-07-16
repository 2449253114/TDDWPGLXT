// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

// 每1分钟时自动更新一刻相册文件封面的URL的方法
const updateCoverUrls = require('admin-auto-task')

module.exports = {
	_before: function () { // 通用预处理器
		
	},
	_timing: async function (param) {
	    console.log('触发时间：', param.Time)
		console.log('triggered by timing')
		
		let res = await updateCoverUrls("task-asc-admin-auto-task-auto-update-file-cover")
		console.log('res', res)
		
		return {
			trigger_time: param.Time,
			res
		}
	},
	auto_update_file_cover: async function() {
		let res = await updateCoverUrls("task-asc-admin-auto-task-auto-update-file-cover")
		console.log('res', res)
		return res
	}
}

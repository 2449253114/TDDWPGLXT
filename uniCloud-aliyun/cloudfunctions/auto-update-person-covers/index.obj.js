// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

// 每60分钟自动更新一次人物头像封面
const autoUpdatePersonCovers = require('auto-update-person-covers')

module.exports = {
	_before: function () { // 通用预处理器

	},
	_timing: async function (param) {
	    console.log('触发时间：', param.Time)
		console.log('triggered by timing')
		
		let res = await autoUpdatePersonCovers()
		console.log('res-自动更新人物头像封面的执行结果', res)
		
		return {
			trigger_time: param.Time,
			res
		}
	},
	testAutoUpdatePersonCovers: async function () {
		let res = await autoUpdatePersonCovers()
		console.log('res-自动更新人物头像封面的执行结果', res)
		return res
		
	} 
}

// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129


const autoUpdateTVSeriesCovers = require('auto-update-tv-series-covers')

module.exports = {
	_before: function () { // 通用预处理器

	},
	_timing: async function (param) {
	    console.log('触发时间：', param.Time)
		console.log('triggered by timing')
		
		let res = await autoUpdateTVSeriesCovers()
		console.log('res-自动更新电视剧剧集封面的执行结果', res)
		
		return {
			trigger_time: param.Time,
			res
		}
	},
	testAutoUpdateTVSeriesCovers: async function() {
		let res = await autoUpdateTVSeriesCovers()
		console.log('res-自动更新电视剧剧集封面的执行结果', res)
		return res
	}
}

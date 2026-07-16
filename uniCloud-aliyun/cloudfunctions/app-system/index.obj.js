// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const {
	goods
} = require('./module/goods/index')

const {
	appConfig
} = require('./module/app-config/index')


module.exports = {
	_before: function () { // 通用预处理器

	},
	
	
	/**
	 * 获取商品列表
	 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-system/getGoodsList
	 * 
	 * @param {Number} type - 商品类型：0 金币充值 、1 会员开通 
	 *     必填: 是
	 *     示例值: 1
	 * 
	 */
	'shop-goods': goods,
	
	
	'app-config': appConfig,
	
	
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

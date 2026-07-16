// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

const {
	getAlbumList
} = require('./module/album/index')

const {
	getAlbumListFile,
	streaming
} = require('./module/file/index')

const {
	getPersonList
} = require('./module/person/index')

module.exports = {
	_before: function () { // 通用预处理器

	},
	/**
	 * 一刻相册 - 视频流 请求接口
	 * @return  res.data = m3u8文件内容（视频流） String
	 */
	streaming,
	
	
	
	/**
	 * [一刻相册 > 全部相册]：获取相册列表
	 * @api https://photo.baidu.com/youai/album/v1/list
	 */
	getAlbumList,
	
	
	/**
	 * [一刻相册 > 全部相册 > 相册文件]：获取某个相册里的所有文件
	 * @api https://photo.baidu.com/youai/album/v1/listfile
	 * 
	 * @uniCloud https://doc.dcloud.net.cn/uniCloud/cf-functions.html#unicloud-request
	 * @formdatas 发送formdata类型数据 var form = new FormData();form.append('my_field', 'my value');
	 */
	getAlbumListFile,
	/* 
	 `FormData` 对象本身并没有一个直接的方法来将其内容转换为查询字符串（如您的 `formData` 结构）。这是因为 `FormData` 通常用于构建 `multipart/form-data` 格式的数据，而这种格式与 URL 编码的查询字符串格式不同。
	 
	 在 Node.js 中，如果您想将 `FormData` 的内容转换为查询字符串格式（即 `application/x-www-form-urlencoded`），您需要手动构建这个字符串。`FormData` 对象不提供一个直接的 `.toString()` 方法来实现这种转换。
	 
	 您已经展示了如何手动构建这种字符串的方法。但如果您想要从 `FormData` 对象中自动化这个过程，您将需要遍历 `FormData` 的字段，并构建相应的查询字符串。不过，标准的 `FormData` 在 Node.js 中没有提供一个简单的方法来遍历其内部的键值对。
	 
	 如果您使用的是像 `form-data` 这样的 Node.js 库，它可能也不提供直接转换为查询字符串的方法。在这种情况下，您需要继续使用手动构建查询字符串的方法，或者考虑在发送请求之前直接构造查询字符串，而不是先构造 `FormData` 对象。
	 
	 
	 */
	
	/**
	 * [一刻相册 > 人物]：获取人物列表
	 * @api https://photo.baidu.com/youai/iclass/person/v2/list
	 */
	getPersonList
	
	
	
	
	
	
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


async function sendPostRequest(apiUrl, headers, formData) {
    try {
        const response = await uniCloud.httpclient.request(apiUrl, {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded", // 确保与服务器期望的内容类型匹配
                ...headers // 扩展其他传入的头部信息
            },
            content: formData, // 发送转换后的查询字符串作为请求体
            dataType: 'json' // 指定返回类型为 JSON
        });

        console.log("Response:", response);
        return response.data; // 返回解析后的 JSON 数据
    } catch (error) {
        console.error("Request error:", error);
        return { error: error.message }; // 返回错误信息
    }
}

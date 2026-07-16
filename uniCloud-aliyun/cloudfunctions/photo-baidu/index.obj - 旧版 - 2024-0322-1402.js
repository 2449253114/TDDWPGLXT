// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129

// 定义常量，方便管理和修改
const CODE = {
	ERROR: 404, // 无效请求或请求失败
	SUCCESS: 200, // 成功
};
// 抽象出重复的返回对象（定义一个用于返回结果的函数）
function createResponse(code, message, data = null) {
	return {
		code,
		message,
		data
	};
}

module.exports = {
	_before: function () { // 通用预处理器

	},
	/**
	 * 一刻相册 - 视频流 请求接口
	 * @return  res.data = m3u8文件内容（视频流） String
	 */
	async streaming() {
		// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
		if (httpInfo.isBase64Encoded) { // 是否base64格式
			bodyParam = Buffer.from(bodyParam, 'base64').toString()
		}
	
		console.log("Received Body:", bodyParam);
	
		let querys, headers;
		try {
			({
				querys,
				headers
			} = JSON.parse(bodyParam));
		} catch (error) {
			console.error("Error parsing bodyParam:", error);
			return createResponse(CODE.ERROR, "无效的请求数据");
		}
	
		// 如果querys已经是对象，则不需要再次解析
		if (typeof querys === 'string') {
			try {
				querys = JSON.parse(querys);
			} catch (error) {
				console.error("Error parsing querys:", error);
				return createResponse(CODE.ERROR, "无效的请求参数");
			}
		}
	
		const {
			fsid,// 必须为String类型
			album_id,// 必须为String类型
			uk,// 必须为String类型
			tid// 必须为String类型
		} = querys;
	
		const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
			url: `https://photo.baidu.com/youai/album/v1/streaming?fsid=${fsid}&album_id=${album_id}&uk=${uk}&tid=${tid}`,
			method: "GET",
			dataType: "text",
			header: headers
		})
	
		//console.log(res.statusCode)
		//console.log(res.data)
		console.log(res)
	
		//返回数据给客户端
		return res
	
	},
	
	
	
	/**
	 * [一刻相册 > 全部相册]：获取相册列表
	 * @api https://photo.baidu.com/youai/album/v1/list
	 */
	async getAlbumList() {
		// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
		if (httpInfo.isBase64Encoded) { // 是否base64格式
			bodyParam = Buffer.from(bodyParam, 'base64').toString()
		}
			
		console.log("Received Body:", bodyParam);
			
		let querys, headers;
		try {
			({
				querys,
				headers
			} = JSON.parse(bodyParam));
		} catch (error) {
			console.error("Error parsing bodyParam:", error);
			return createResponse(CODE.ERROR, "无效的请求数据");
		}
		
		// 如果querys已经是对象，则不需要再次解析
		if (typeof querys === 'string') {
			try {
				querys = JSON.parse(querys);
			} catch (error) {
				console.error("Error parsing querys:", error);
				return createResponse(CODE.ERROR, "无效的请求参数");
			}
		}
			
		const {// querys参数只能是string类型
			clienttype = "70",// 客户端类型 70为Web
			bdstoken,
			cursor, // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
			limit = "30",// 每页30条（Web版默认）
			need_amount = "1",// 默认
			need_member = "1",// 默认
			field ="mtime"// 默认
		} = querys;
			
		const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
			url: `https://photo.baidu.com/youai/album/v1/list?clienttype=${clienttype}&bdstoken=${bdstoken}&cursor=${cursor}&limit=${limit}&need_amount=${need_amount}&need_member=${need_member}&field=${field}`,
			method: "GET",
			header: headers
		})
			
		//console.log(res.statusCode)
		//console.log(res.data)
		console.log(res)
			
		//返回数据给客户端
		return res
	},
	
	
	/**
	 * [一刻相册 > 全部相册 > 相册文件]：获取某个相册里的所有文件
	 * @api https://photo.baidu.com/youai/album/v1/listfile
	 * 
	 * @uniCloud https://doc.dcloud.net.cn/uniCloud/cf-functions.html#unicloud-request
	 * @formdatas 发送formdata类型数据 var form = new FormData();form.append('my_field', 'my value');
	 */
	async getAlbumListFile() {
		// 获取url化时的http信息
		const httpInfo = this.getHttpInfo()
		let bodyParam = httpInfo.body // 获取客户端传递的数据，如JSON
		if (httpInfo.isBase64Encoded) { // 是否base64格式
			bodyParam = Buffer.from(bodyParam, 'base64').toString()
		}
			
		console.log("Received Body:", bodyParam);
			
		let querys, formdatas, headers;
		try {
			({
				querys,
				formdatas,
				headers
			} = JSON.parse(bodyParam));
		} catch (error) {
			console.error("Error parsing bodyParam:", error);
			return createResponse(CODE.ERROR, "无效的请求数据");
		}
		
		// 如果querys已经是对象，则不需要再次解析
		if (typeof querys === 'string') {
			try {
				querys = JSON.parse(querys);
			} catch (error) {
				console.error("Error parsing querys:", error);
				return createResponse(CODE.ERROR, "无效的请求参数");
			}
		}
		
		if (typeof formdatas === 'string') {
			try {
				formdatas = JSON.parse(formdatas);
			} catch (error) {
				console.error("Error parsing formdatas:", error);
				return createResponse(CODE.ERROR, "无效的请求参数");
			}
		}
			
		const {// querys参数只能是string类型
			clienttype = "70",// 客户端类型 70为Web
			bdstoken,
		} = querys;
		
		const {
			cursor, // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
			album_id,
			need_amount = "1",// 默认 string
			limit = "100",// 每页100条（Web版默认）string
			passwd = ""// 默认 string
		} = formdatas;
				
		// 构建 form-data 字符串
		let formData = '';
		formData += `cursor=${encodeURIComponent(cursor)}&`;
		formData += `album_id=${encodeURIComponent(album_id)}&`;
		formData += `need_amount=${encodeURIComponent(need_amount)}&`;
		formData += `limit=${encodeURIComponent(limit)}`;
		formData += `&passwd=${encodeURIComponent(passwd)}`;
		
			
		// querys参数只能采用拼接的方式才能请求成功
		const apiUrl = `https://photo.baidu.com/youai/album/v1/listfile?clienttype=${clienttype}&bdstoken=${bdstoken}`
		
		try {
			const res = await uniCloud.httpclient.request(apiUrl, {
				method: 'POST',
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",// 此类型在['https://photo.baidu.com/youai/album/v1/listfile']接口，控制台中看Network > api接口 > Header > Request Headers 中查看
					...headers
				},
				content: formData,
				dataType: 'json' // 此处指定为json表示将此请求的返回值解析为json
			});
	
			console.log(res);
			return res;
		} catch (error) {
			console.error(error);
			return { error };
		}
		
		console.log(res)

	},
	/* 
	 `FormData` 对象本身并没有一个直接的方法来将其内容转换为查询字符串（如您的 `formData` 结构）。这是因为 `FormData` 通常用于构建 `multipart/form-data` 格式的数据，而这种格式与 URL 编码的查询字符串格式不同。
	 
	 在 Node.js 中，如果您想将 `FormData` 的内容转换为查询字符串格式（即 `application/x-www-form-urlencoded`），您需要手动构建这个字符串。`FormData` 对象不提供一个直接的 `.toString()` 方法来实现这种转换。
	 
	 您已经展示了如何手动构建这种字符串的方法。但如果您想要从 `FormData` 对象中自动化这个过程，您将需要遍历 `FormData` 的字段，并构建相应的查询字符串。不过，标准的 `FormData` 在 Node.js 中没有提供一个简单的方法来遍历其内部的键值对。
	 
	 如果您使用的是像 `form-data` 这样的 Node.js 库，它可能也不提供直接转换为查询字符串的方法。在这种情况下，您需要继续使用手动构建查询字符串的方法，或者考虑在发送请求之前直接构造查询字符串，而不是先构造 `FormData` 对象。
	 
	 
	 */
	
	
	
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

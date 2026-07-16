/**
 * 使用 uni.request 发起网络请求。
 * 
 * @param {Object} config 配置对象，包括 url, method, data 等。
 * @returns {Promise<Object>} 包含文件列表的 Promise 对象。
 */
async function http(config) {
	return new Promise((resolve, reject) => {
		uni.request({
			...config,
			success: (res) => {
				if (res.statusCode === 200) {
					resolve(res);
				} else {
					reject(new Error('Request Error'));
				}
			},
			fail: (err) => reject(err)
		});
	});
}

/* 使用示例：
http({
	url: 'https://photo.baidu.com/youai/album/v1/listfile',
	method: 'POST',
	data: {}
}).then(data => {
	console.log('File list:', data);
}).catch(error => {
	console.error('Error:', error);
});
 */

export {
	http
}
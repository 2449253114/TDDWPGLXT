### 1. 下面这部分是我用过apipost接口测试工具生成的代码。
var axios = require("axios").default;

var options = {
	method: 'POST',
	url: 'https://photo.baidu.com/youai/album/v1/listfile',
	params: {
		clienttype: '70',
		bdstoken: '5b3bda475d3738a44580fff097ee8037'
	},
	headers: {
		Cookie: 'BIDUPSID=C6FF1A0FA68F50915CC0E431973FC719; PSTM=1693624019; BAIDUID=40F14108017EB6641D57F1DA67B48673:FG=1; BAIDUID_BFESS=40F14108017EB6641D57F1DA67B48673:FG=1; ZFY=Xp592oYhjmGCZmNwoZBgEk0hCwPwIzAsvxUVTsgAU58:C; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%221815907562%22%2C%22first_id%22%3A%2218c91cebcada6f-009f1d0798fdf2-26031051-1440000-18c91cebcae2589%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22%24device_id%22%3A%2218c91cebcada6f-009f1d0798fdf2-26031051-1440000-18c91cebcae2589%22%7D; H_PS_PSSID=39733_39842_39935_39937_39942_39938_39996_39990_40008_40041; Hm_lvt_829488e8924d8de8d4420f2bbed270ca=1703506069; csrfToken=KmwdLtmt-PXrLKXQ91p1fJKP; Hm_lpvt_829488e8924d8de8d4420f2bbed270ca=1703591142; BDUSS=ml0WUFvWFRNZWRJSjNjNk90WFdpallNblZnOWppenEzV2gydzFZdGRNVE9XN0psSVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM7OimXOzoplY; BDUSS_BFESS=ml0WUFvWFRNZWRJSjNjNk90WFdpallNblZnOWppenEzV2gydzFZdGRNVE9XN0psSVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM7OimXOzoplY; STOKEN=cc27463179bc702c84f6ab660c54ea667345f5bfc2c5b90056bf05aad88b85f3; PANWEB=1; PANWEB.sig=mEnYrSeaQqssYZire89rFPmLY9htA0FzmyWp6jBsV1U; PANPSC=4280712215366108143%3AKkwrx6t0uHD14zbcy1iaRUYemHfSgA%2FTQq7UC5FOJJER515Zs3QpojiXo%2BL7lLgCz81ttRoL0tDTNf37Iq5CgzBQK7CymrGCprqOJzl%2B%2FQmLh7E4dmY0hDNE46h4cZGLLvxjdeGWe15auAWpRfVz1hEldvReXuS2Y8uG8AM%2BY0Ih6uZoP3DwQ6eNNPHXgC%2BBNo8m%2ByaHSIqMVj%2BP8sFRaA%3D%3D',
		Host: 'photo.baidu.com',
		Origin: 'https://photo.baidu.com',
		Referer: 'https://photo.baidu.com/photo/web/album/4452381325621037832',
		'content-type': 'multipart/form-data; boundary=---011000010111000001101001'
	},
	data: '-----011000010111000001101001\r\nContent-Disposition: form-data; name="cursor"\r\n\r\neyJsb3YiOjE2OTczMDQ1OTUsImZvdiI6MTY5NzMwNzM0NywibGZzaWQiOjg0ODUyNTE4MTU4OTA2NiwiZmZpc2QiOjE3MzAwMTM4MTU2MDE3NiwidiI6MX0\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name="album_id"\r\n\r\n4452381325621037832\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name="need_amount"\r\n\r\n1\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name="limit"\r\n\r\n100\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name="passwd"\r\n\r\n\r\n-----011000010111000001101001--\r\n\r\n'
};

axios.request(options).then(function(response) {
	console.log(response.data);
}).catch(function(error) {
	console.error(error);
});

### 2.下面这部分代码是我自己写的，但请求总是失败。
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

// 创建一个新的 FormData 实例  [ 发送formdata类型数据，此form-data需要使用npm安装，地址：https://www.npmjs.com/package/form-data ]
const form = new FormData()
// 将数据添加到 FormData 实例中
form.append('cursor', cursor);
form.append('album_id', album_id);
form.append('need_amount', need_amount);
form.append('limit', limit);
form.append('passwd', passwd);
	
// querys参数只能采用拼接的方式才能请求成功
const apiUrl = `https://photo.baidu.com/youai/album/v1/listfile?clienttype=${clienttype}&bdstoken=${bdstoken}`

const res = await uniCloud.httpclient.request(apiUrl, {
	method: 'POST',
	content: form, // 使用构造的 FormData 对象 [ String | Buffer 请求内容 | 手动设置请求的payload，设置后会忽略data ]
	headers: {
		"Content-Type": "application/x-www-form-urlencoded",
		...headers
	}, // 请求头
	dataType: 'json' // 此处指定为json表示将此请求的返回值解析为json
})
	
//console.log(res.statusCode)
//console.log(res.data)
console.log(res)
	
//返回数据给客户端
return res

### 3. 然后你帮我通过 [### 2] 我的代码, 改造为 [### 3] axios的代码结构
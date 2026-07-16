1. 这是axios版本的
```javascript
const axios = require('axios');
const { createResponse, STATE_CODE } = require('../../coomon/response');

// 加入相册功能函数
async function joinAlbum(bdstoken, inviteCode, cookie) {
  try {
    const options = {
      method: 'GET',
      url: 'https://photo.baidu.com/youai/album/v1/join',
      params: {
        clienttype: '70',
        bdstoken: bdstoken,
        invite_code: inviteCode
      },
      headers: {
        Host: 'photo.baidu.com',
        Referer: `https://photo.baidu.com/photo/web/share?inviteCode=${inviteCode}`,
        Cookie: cookie,  // 必填参数
        Accept: '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.112 Safari/537.36',
        Connection: 'keep-alive'
      }
    };

    const response = await axios.request(options);

    if (response.data?.errno === 0) {
      return createResponse(STATE_CODE.SUCCESS, '成功加入相册', response.data);
    } else {
      return createResponse(STATE_CODE.FAIL, '加入相册失败', response.data);
    }
  } catch (error) {
    return createResponse(STATE_CODE.ERROR, '请求失败', error);
  }
}

module.exports = { joinAlbum };
```

2. 这是uniCloud.request版本的
```javascript
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
```
我现在需要你帮我把 1的axios版本 改成 2的uniCloud.request版本的，包括之前你给我的queryPCode也改成uniCloud.request版本的



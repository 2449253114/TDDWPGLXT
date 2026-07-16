下面是我的需求文档，然后我需要你帮我按照我的云对象模块目录结构去对照下面的文档需求去帮我生成云对象模块目录结构，具体我也不太会描述，主要还是你先往下看吧。
===以下是接口api文档
# 熊多多后端工具箱 - api 接口

## 一、加入共享相册接口

### （一）querypcode（查询 invite_code）

1. 接口描述
   - 用于根据传入的参数查询加入共享相册所需的邀请码。
2. 请求参数
   - `pcode`：从一刻相册 APP 分享链接中获取的原始代码。
3. 返回结果
   - `res.pdata.invite_code`：加入相册的唯一邀请码（凭证）。

### （二）join（加入相册，需传递 invite_code）

1. 接口描述
   - 使用查询到的邀请码加入共享相册。
2. 请求参数
   - `invite_code`：通过`querypcode`接口获取的邀请码。
3. 返回结果
   - 加入相册成功或失败的状态信息。

### （三）使用说明

1. 从一刻相册 APP 分享相册，复制链接。
   - 示例：邀请你加入相册《共享 futoshio_onlyfans》。点击链接接口查看全部内容：https://photo.baidu.com/photo/wap/albumShare/invite/fPsbMVBWCm?from=linkShare。其中`fPsbMVBWCm`为分享邀请的代码，在浏览器打开如上链接，会自动重定向到：https://photo.baidu.com/photo/web/share?inviteCode=fPsbMVBWCm。
2. 使用`querypcode`接口，传递`pcode=fPsbMVBWCm`来获取加入相册的唯一邀请码（凭证）。
3. 使用`join`接口，传递邀请码来加入到共享相册中。

## 二、接口使用示例

### （一）querypcode（查询 invite_code）示例

以下是以 axios 为例的`querypcode`接口使用方法：

```javascript
var options = {
  method: 'GET',
  url: 'https://photo.baidu.com/youai/album/v1/querypcode',
  params: {
    clienttype: '70',
    bdstoken: '742523d88a6851b15673a8f4916f7624',
    pcode: 'sudshjARYm',
    web: '1'
  },
  headers: {
    Host: 'photo.baidu.com',
    Referer: 'https://photo.baidu.com/photo/web/share?inviteCode=sudshjARYm',
    //Cookie: '',可选的参数
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'PostmanRuntime-ApipostRuntime/1.1.0',
    Connection: 'keep-alive'
  }
};

axios.request(options).then(function (response) {
  console.log(response.data);
}).catch(function (error) {
  console.error(error);
});
```

### （二）join（加入相册，需传递 invite_code）示例

以下是以 axios 为例的`join`接口使用方法：

```javascript
var options = {
  method: 'GET',
  url: 'https://photo.baidu.com/youai/album/v1/join',
  params: {
    clienttype: '70',
    bdstoken: '742523d88a6851b15673a8f4916f7624',
    invite_code: 'eyJpIjoxODE1OTA3NTYyLCJhIjoyOTk2MTA1NDE4NTgyNDMyMjE0LCJldCI6MjE0NzQ4MzY0MCwicyI6MjkzMzE2ODY2NjAyMTkyMDE3Mn0'
  },
  headers: {
    Host: 'photo.baidu.com',
    Referer: 'https://photo.baidu.com/photo/web/share?inviteCode=sudshjARYm',
    Cookie: '',// 必填
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'PostmanRuntime-ApipostRuntime/1.1.0',
    Connection: 'keep-alive'
  }
};

axios.request(options).then(function (response) {
  console.log(response.data);
}).catch(function (error) {
  console.error(error);
});
```

## 二、CK账号Cookie接口


## 三、视频逐帧拼图接口


===看完以上的接口api文档，再来看云对象模块目录结构，需要你帮我命名文件名和文件中的函数名，一个文件里只有一个功能函数（文件里的功能函数的辅助函数不算）。
完整的云对象模块目录结构图如下所示
- uniCloud
  - cloudfunctions
    - AdminDesktopAppTools（这就是我的云对象了）
      - coomon
        - constants.js（放数据库表）
        - response.js（放返回结果的结构）
      - module
        - 对应功能模块的目录名
          - xx模块
            - xx模块的子功能
            - index.js（就是module.exports）
		- userxxx（示例，这是为了便于你理解）
          - login（登录模块，有许多方式登录）
            - 手机号登录（短信验证码）
			- 邮箱登录（邮箱验证码）
			- 账号密码登录
            - index.js（就是module.exports）
      - index.obj.js（就是module/xx模块/index的module.exports）
      - package.json
然后这是我目前的云对象模块目录结构图如下所示
- uniCloud
  - cloudfunctions
    - AdminDesktopAppTools（这就是我的云对象了）
      - coomon
        - constants.js（放数据库表）
        - response.js（放返回结果的结构）
      - module
      - index.obj.js
      - package.json

constants.js 示例代码
```javascript
const db = uniCloud.database()
const dbCmd = db.command

// 用户数据库表
const userCollectionName = 'user-accounts'
const userCollection = db.collection(userCollectionName)
module.exports = {
	dbCmd,
	userCollection
}
```	

response.js 示例代码
```javascript
const STATE_CODE = {
	FAIL: 1005, // 失败
	ERROR: 404,
	SUCCESS: 200
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
	STATE_CODE,
	createResponse
}
```

然后我现在需要你帮我按照以上的（接口api文档）去设计（云对象模块目录结构）并且将功能写出来，且要为函数名加上说明和代码注释。

    

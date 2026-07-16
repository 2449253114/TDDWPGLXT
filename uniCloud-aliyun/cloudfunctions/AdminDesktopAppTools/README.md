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

```javascript
const {
	inviteUserCollection,
	userCollectionName
} = require('../../../common/constants');

const {
	STATE_CODE,
	createResponse
} = require('../../../common/response');

/**
 * 查询用户的邀请记录
 * @url GET /api/users/invitation-records
 * @param {String} userId 用户的ID
 * @returns {Object} 返回用户的邀请记录列表
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	let body = httpInfo.body // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString()
	}

	let userId;
	try {
		({
			userId
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}
	
	let invitationRecordsResult;
	try {
		invitationRecordsResult = await inviteUserCollection
		.aggregate()
		.match({
			user_id: userId // 用户ID字段
		})
		.lookup({
			from: userCollectionName, // 关联的表
			localField: 'user_id', // 当前表的字段
			foreignField: 'user_id', // 关联表的字段
			as: 'invited_users_info', // 输出的字段
		})
		// .field({
		// 	device_oaid: true,
		// 	invite_time: true
		// })
		//.sort({ user_invite_time: -1 }) // <排序规则> :1 代表升序排列（从小到大）；-1 代表降序排列（从大到小）
		.limit(1000)
		.end(); // 获取最新的邀请列表
	} catch (error) {
		console.error(error);
		return createResponse(STATE_CODE.ERROR, "查询邀请记录失败");
	}
	
	// 构造空的响应体
	let emptyResponse = {
		total: 0,
		list: []
	}

	// 没有更多数据了
	if (invitationRecordsResult['affectedDocs'] === 0) {
		return createResponse(STATE_CODE.FAIL, '没有更多数据了', emptyResponse)
	}
	
	// 处理数据，将device_oaid转换成前三位和后四位显示，中间用*代替，保留11位
	let processedData = invitationRecordsResult.data.map(record => {
	  let processedRecord = { ...record };
	  // oaid加密
	  if (processedRecord.device_oaid) {
		const oaid = processedRecord.device_oaid;
		processedRecord.device_oaid = `${oaid.substring(0, 3)}****${oaid.substring(oaid.length - 4)}`;
	  }
	  // 删除用户id
	  delete processedRecord._id
	  return processedRecord;
	});
	
	
	// 构造响应体
	let response = {
		total: invitationRecordsResult['affectedDocs'],// 总记录数
		list: processedData// 数据列表
	}
	
	// 返回结果
	return createResponse(STATE_CODE.SUCCESS, '查询邀请记录成功', response)

}
```
报错如下
```txt
请求入参: {
  "args": {
    "path": "/invitation-records",
    "httpMethod": "POST",
    "headers": {
      "content-length": "46",
      "cookie": "aliyungf_tc=01649389ad2826ca34c04996b030de8d6801c804dff77ae551676c56d5649250;acw_tc=ac11000117151925314151485e4b341bd06d0a3a15bc6865373fda80bde90f",
      "x5-uuid": "d30529c4d9bc3ba1dec8df8c84bc17ad",
      "x-client-ip": "175.164.125.222",
      "x-forwarded-for": "175.164.125.222, 120.27.173.99, 39.96.130.164",
      "accept": "*/*",
      "x-real-ip": "175.164.125.222",
      "x-sinfo": "on",
      "host": "fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com",
      "content-type": "application/json",
      "x-forwarded-by": "172.28.211.113:80",
      "cache-control": "no-cache",
      "accept-encoding": "gzip, deflate, br",
      "user-agent": "PostmanRuntime-ApipostRuntime/1.1.0"
    },
    "queryStringParameters": {},
    "isBase64Encoded": false,
    "body": "{\r\n    \"userId\": \"65be37419755e3283004978c\"\r\n}"
  },
  "requestId": "ac1cd3711715193815707142896"
}
[app-user-auth/ac1cd3711715193815707142896/78ms/ERROR] Command failed with error 9 (FailedToParse): 'missing 'from' option to $lookup stage specification: { localField: "user_id", foreignField: "user_id", as: "invited_users_info" }' on server 172.28.207.2:3717. The full response is { "operationTime" : { "$timestamp" : { "t" : 1715193814, "i" : 6 } }, "ok" : 0.0, "errmsg" : "missing 'from' option to $lookup stage specification: { localField: \"user_id\", foreignField: \"user_id\", as: \"invited_users_info\" }", "code" : 9, "codeName" : "FailedToParse", "$clusterTime" : { "clusterTime" : { "$timestamp" : { "t" : 1715193815, "i" : 7 } }, "signature" : { "hash" : { "$binary" : "4N2snMbBszCb7+ECdhpKn7KP20Y=", "$type" : "00" }, "keyId" : { "$numberLong" : "7322767653104254990" } } } }
Error: Command failed with error 9 (FailedToParse): 'missing 'from' option to $lookup stage specification: { localField: "user_id", foreignField: "user_id", as: "invited_users_info" }' on server 172.28.207.2:3717. The full response is { "operationTime" : { "$timestamp" : { "t" : 1715193814, "i" : 6 } }, "ok" : 0.0, "errmsg" : "missing 'from' option to $lookup stage specification: { localField: \"user_id\", foreignField: \"user_id\", as: \"invited_users_info\" }", "code" : 9, "codeName" : "FailedToParse", "$clusterTime" : { "clusterTime" : { "$timestamp" : { "t" : 1715193815, "i" : 7 } }, "signature" : { "hash" : { "$binary" : "4N2snMbBszCb7+ECdhpKn7KP20Y=", "$type" : "00" }, "keyId" : { "$numberLong" : "7322767653104254990" } } } }
    at /tmp/function/@dcloudio/serverless/lib/aliyun/uni-cloud.js:1:1549
    at processTicksAndRejections (internal/process/task_queues.js:97:5)
请求响应状态: success
```
const {
	userPurchasesCollection,
	albumCollectionName,
	fileCollectionName
} = require('../../../common/constants');

const {
	STATE_CODE,
	createResponse
} = require('../../../common/response');


/**
 * 获取用户的购买记录及关联的相册或文件信息
 * @url POST /api/users/get-purchases
 * @param {Object} params
 * @param {String} params.user_id 用户ID
 * @returns {Object} 返回该用户的购买记录
 */
module.exports = async function() {
	
	return createResponse(STATE_CODE.SUCCESS, "没有更多购买记录", {
		total: 0,
		list: []
	});
	
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo();
	let body = httpInfo.body; // 获取客户端传递的数据，如JSON
	if (httpInfo.isBase64Encoded) { // 是否base64格式
		body = Buffer.from(body, 'base64').toString();
	}

	let user_id;
	try {
		({
			user_id
		} = JSON.parse(body));
	} catch (error) {
		return createResponse(STATE_CODE.FAIL, "无效的请求数据");
	}

	if (!user_id) {
		return createResponse(STATE_CODE.FAIL, "用户ID不能为空");
	}

	//return createResponse(STATE_CODE.FAIL, `测试是否有响应: ${user_id}`);


	pageSize = 1000;

	// 查询用户的购买记录
	try {
		const aggregateResult = await userPurchasesCollection.aggregate()
			// 根据用户ID匹配购买记录
			.match({
				user_id: user_id
			})
			.limit(pageSize)
			// 关联相册信息
			.lookup({
				from: albumCollectionName, // 关联的表名
				localField: "album_id", // 当前表的字段
				foreignField: "album_id", // 关联表的字段
				as: "album_info" // 输出的字段
			})
			// 关联文件信息
			.lookup({ // 字段类型必须相同才能查询到
				from: fileCollectionName, // 关联的表名
				localField: "file_id", // 当前表的字段
				foreignField: "fsid", // 关联表的字段
				as: "file_info" // 输出的字段
			})
			// 根据购买时间降序排序
			.sort({
				purchase_time: -1 // <排序规则> :1 代表升序排列（从小到大）；-1 代表降序排列（从大到小）
			})
			// 添加处理步骤，格式化album_info和file_info
			.addFields({
				album_info: {
					$arrayElemAt: ["$album_info", 0] // 从数组中取第一个元素（因为lookup返回的是数组）
				},
				file_info: {
					$arrayElemAt: ["$file_info", 0] // 同上
				},
			})
			// 进一步处理album_info和file_info
			.addFields({
				album_info: {
					$cond: {
						if: "$album_info",
						then: {
							// 保留album_info中我们需要的字段
							_id: "$album_info._id",
							album_id: "$album_info.album_id",
							tid: "$album_info.tid",
							pic_count: "$album_info.pic_count",
							video_count: "$album_info.video_count",
							total_count: "$album_info.total_count",
							title: "$album_info.title",
							thumburl: {
								// 取cover_info.thumburl的第二个元素
								$arrayElemAt: ["$album_info.cover_info.thumburl", 1]
							}
						},
						else: null
					}
				},
				file_info: {
					$cond: {
						if: "$file_info",
						then: {
							// 保留file_info中我们需要的字段
							_id: "$file_info._id",
							album_id: "$file_info.album_id",
							category: "$file_info.category",
							file_type: "$file_info.file_type",
							extra_info: "$file_info.extra_info",
							fsid: "$file_info.fsid",
							tid: "$file_info.tid",
							uk: "$file_info.uk",
							size: "$file_info.size",
							bytes: "$file_info.bytes",
							duration_format: "$file_info.duration_format",
							thumburl: {
								$arrayElemAt: ["$file_info.thumburl", 1] // 取thumburl数组的第二个元素
							},
							ctime: "$file_info.ctime"
						},
						else: null
					}
				}
			})
			// 使用$project排除不需要的字段
			.project({
			    "file_info.tag": 0, // 不需要此字段
			    "file_info.free_video": 0, // 不需要此字段
			    "file_info.status": 0, // 不需要此字段
			    "file_info.desc": 0, // 不需要此字段
			    "file_info.dlink": 0, // 不需要此字段
			    "file_info.md5": 0, // 不需要此字段
			    "file_info.nickname": 0, // 不需要此字段
			    "file_info.path": 0, // 不需要此字段
			    "file_info.photo": 0, // 不需要此字段
			    "file_info.server_md5": 0, // 不需要此字段
			    "album_info.tag": 0, // 不需要此字段
			    "album_info.status": 0, // 不需要此字段
			    "album_info.bg_info": 0, // 不需要此字段
			    "album_info.cover_info": 0, // 不需要此字段
			    "album_info.create_time": 0, // 不需要此字段
			    "album_info.creator_user": 0, // 不需要此字段
			    "album_info.notice": 0 // 不需要此字段
			})
			.end();

		// 检查是否有查询结果
		if (aggregateResult && aggregateResult.data && aggregateResult.data.length > 0) {
			// 返回带有购买记录的响应
			return createResponse(STATE_CODE.SUCCESS, `获取购买记录成功`, {
				total: aggregateResult.affectedDocs,
				list: aggregateResult.data
			});
		} else {
			return createResponse(STATE_CODE.SUCCESS, "没有更多购买记录", {
				total: 0,
				list: []
			});
		}
	} catch (error) {
		console.error(error);
		return createResponse(STATE_CODE.ERROR, "查询购买记录失败");
	}

};
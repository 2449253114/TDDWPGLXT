按照下面这个schema数据库表字段：
{
	"bsonType": "object",
	"required": [],
	"permission": {
		"read": true,
		"create": true,
		"update": true,
		"delete": true
	},
	"properties": {
		"_id": {
			"description": "ID，系统自动生成"
		},
		"vip_days_on_signup": {
			"bsonType": "int",
			"title": "注册会员赠送VIP天数",
			"description": "新用户注册后自动获得的VIP体验天数",
			"defaultValue": 7
		},
		"daily_login_reward": {
			"bsonType": "int",
			"title": "每日登录奖励",
			"description": "用户每日登录App可获得的金币奖励",
			"defaultValue": 1
		},
		"weekly_login_vip_reward": {
		    "bsonType": "object",
		    "title": "周登陆VIP奖励",
		    "description": "用户在指定的周几登录App时，可以获得额外的VIP体验天数。",
		    "properties": {
		        "login_day": {
		            "bsonType": "int",
		            "title": "登录日",
		            "description": "用户需要登录的星期几，以数字表示，1代表周一，2代表周二，依此类推至7代表周日。",
		            "defaultValue": 1,
		            "enum": [
		                {"value": 1, "text": "周一"},
		                {"value": 2, "text": "周二"},
		                {"value": 3, "text": "周三"},
		                {"value": 4, "text": "周四"},
		                {"value": 5, "text": "周五"},
		                {"value": 6, "text": "周六"},
		                {"value": 7, "text": "周日"}
		            ]
		        },
		        "reward_vip_days": {
		            "bsonType": "int",
		            "title": "奖励VIP天数",
		            "description": "用户在指定日登录后获得的额外VIP体验天数。",
		            "defaultValue": 1
		        },
		        "enabled": {
		            "bsonType": "bool",
		            "title": "是否启用",
		            "description": "是否启用此奖励配置。",
		            "defaultValue": true
		        }
		    }
		},
		"invite_reward": {
			"bsonType": "object",
			"title": "邀请奖励",
			"description": "设置用户邀请新用户加入平台时获得的奖励。管理员可以指定奖励的类型（如金币或VIP天数）和数量，激励现有用户邀请更多新用户，从而增加平台的用户基数和活跃度。",
			"properties": {
				"reward_type": {
					"bsonType": "int",
					"title": "奖励类型",
					"description": "用户邀请奖励的类型，如：积分、金币、VIP天数等",
					"defaultValue": 1,
					"enum": [{
							"value": 0,
							"text": "金币"
						},
						{
							"value": 1,
							"text": "VIP天数"
						}
					]
				},
				"reward_amount": {
					"bsonType": "int",
					"title": "奖励数量",
					"description": "用户邀请每位新用户所获得的奖励数量",
					"defaultValue": 3
				}
			}
		},
		"share_reward": {
		    "bsonType": "object",
		    "title": "分享奖励",
		    "description": "用户分享App后获得的奖励。",
		    "properties": {
		        "enabled": {
		            "bsonType": "boolean",
		            "title": "奖励开启",
		            "description": "是否开启分享App的奖励功能",
		            "defaultValue": true
		        },
				"reward_type": {
					"bsonType": "int",
					"title": "奖励类型",
					"description": "分享奖励的类型，如金币、VIP天数等",
					"defaultValue": 1,
					"enum": [
						{"value": 0, "text": "金币"},
						{"value": 1, "text": "VIP天数"}
					]
				},
		        "reward_amount": {
		            "bsonType": "int",
		            "title": "奖励数量",
		            "description": "用户分享App后获得的奖励数量",
		            "defaultValue": 1
		        }
		    }
		},
		"new_user_guide_display": {
			"bsonType": "boolean",
			"title": "新用户引导页显示",
			"description": "是否向新用户展示引导页",
			"defaultValue": true
		},
		"customer_service_contact": {
			"bsonType": "string",
			"title": "客服联系方式",
			"description": "App内客服的联系方式",
			"defaultValue": "contact@example.com"
		},
		"maintenance_mode_enabled": {
			"bsonType": "boolean",
			"title": "维护模式开启",
			"description": "App是否处于维护模式",
			"defaultValue": false
		}
		
	}
}
来生成一个db_init.json的默认数据，可参考这个：
参考：相册列表schema数据库表
{
	"bsonType": "object",
	"description": "相册列表（全部相册）接口：https://photo.baidu.com/youai/album/v1/list?",
	"required": [],
	"permission": {
		"read": true,
		"create": true,
		"update": true,
		"delete": true
	},
	"properties": {
		"_id": {
			"description": "ID，系统自动生成"
		},
		"album_type": {
			"bsonType": "int",
			"title": "相册类型",
			"description": "相册类型：0 一刻相册 1 同多多相册",
			"defaultValue": 0,
			"enum": [{
					"text": "一刻相册",
					"value": 0
				},
				{
					"text": "同多多相册",
					"value": 1
				}
			]
		},
		"album_id": {
			"bsonType": "string",
			"title": "album_id",
			"description": "一刻相册_相册id",
			"defaultValue": ""
		},
		"bg_info": {
			"bsonType": "object",
			"title": "bg_info",
			"description": "一刻相册_相册背景墙"// 《不需要》为相册中最新的第一个文件的封面，参考“一刻相册”APP
		},
		"cover_info": {
			"bsonType": "object",// object类型，不能加默认值:{}
			"title": "cover_info",
			"description": "一刻相册_相册封面"
			/* "defaultValue": {
				"uk": 1815907562,
				"fsid": 511843860017785,
				"category": 1,
				"md5": "293d0510df79b806b59e7475307a1249",
				"server_md5": "a30799d2ej55f3faddf0ff65ee62db6a",
				"path": "/youa/web/转码VID_20230814_205310_274.mp4",
				"thumburl": [
					"https://pcsdata.baidu.com/thumbnail/a30799d2ej55f3faddf0ff65ee62db6a?fid=1815907562-16051585-511843860017785&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-ExlUX%2F1WcR3qJul0QUsqrJxfGSY%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=368242517301816081&dp-callid=0&time=1703937600&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
					"https://pcsdata.baidu.com/thumbnail/a30799d2ej55f3faddf0ff65ee62db6a?fid=1815907562-16051585-511843860017785&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-ExlUX%2F1WcR3qJul0QUsqrJxfGSY%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=368242517301816081&dp-callid=0&time=1703937600&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
				],
				"dlink": "https://photo.baidu.com/youai/album/v1/download?album_id=4064158634569417858&uk=1815907562&tid=0&fsid=511843860017785"
			} */
		},
		"create_time": {
			"bsonType": "timestamp",
			"title": "create_time",
			"description": "一刻相册 相册创建时间，时间戳：秒（S）"
		},
		"creator_user": {
			"bsonType": "object",
			"title": "creator_user",
			"description": "一刻相册 相册创建者用户"
		},
		"notice": {
			"bsonType": "string",
			"title": "相册描述",
			"description": "一刻相册 相册描述"
		},
		"tid": {
			"bsonType": "string",
			"title": "tid",
			"description": "一刻相册 tid"
		},
		"title": {
			"bsonType": "string",
			"title": "相册名称",
			"description": "一刻相册 相册名称"
		},
		"tag": {// 这个 [tag] 是自己加的字段
			"bsonType": "array",
			"title": "标签",
			"description": "标签 同多多网盘系统内置",
			"defaultValue": []
		},
		"status": {// 这个 [status] 是自己加的字段
			"bsonType": "int",
			"title": "发布状态",
			"description": "发布状态：0 草稿箱 1 已发布",
			"defaultValue": 1,
			"enum": [
				{
					"value": 0,
					"text": "草稿箱"
				},
				{
					"value": 1,
					"text": "已发布"
				},
				{
					"value": 2,
					"text": "审核中"
				}
			]
		}
	}
}
参考：相册列表schema数据库表的db_init.json默认数据
{// 内置测试数据
  "_id": "_photo_baidu_album_list_preset",
  "album_type": 0,
  "album_id": "4064158634569417858",
  "bg_info": {},
  "cover_info": {
		"category": 1,
		"dlink": "https://photo.baidu.com/youai/album/v1/download?album_id=4064158634569417858&uk=1815907562&tid=0&fsid=511843860017785",
		"fsid": 511843860017785,
		"md5": "293d0510df79b806b59e7475307a1249",
		"path": "/youa/web/转码VID_20230814_205310_274.mp4",
		"server_md5": "a30799d2ej55f3faddf0ff65ee62db6a",
		"thumburl": [
			"https://pcsdata.baidu.com/thumbnail/a30799d2ej55f3faddf0ff65ee62db6a?fid=1815907562-16051585-511843860017785&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-xnGDptA0A3cJEHGxuTCEAL0KzpU%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=338126012189061607&dp-callid=0&time=1703826000&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
			"https://pcsdata.baidu.com/thumbnail/a30799d2ej55f3faddf0ff65ee62db6a?fid=1815907562-16051585-511843860017785&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-xnGDptA0A3cJEHGxuTCEAL0KzpU%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=338126012189061607&dp-callid=0&time=1703826000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
		],
		"uk": 1815907562
	},
	"create_time": 1703332682,
	"creator_user": {
		"nickname": "活泼开朗的小灵通",
		"photo": "https://himg.bdimg.com/sys/portraith/item/public.1.e1b7a64b.Vk_O1Ls6gNsyDRzEMTNnXw",
		"youa_id": 1815907562
	},
	"notice": "演员blc113的视频集",
	"tid": "317033326838614036",
	"title": "演员blc113_分组1_主页onlyfans_来源Telegram群"
}
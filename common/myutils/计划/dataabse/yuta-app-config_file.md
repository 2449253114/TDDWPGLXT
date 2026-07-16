先看下面的schema数据库表
// 文档教程: https://uniapp.dcloud.net.cn/uniCloud/schema
{
	"bsonType": "object",
	"description": "APP设置",
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
		// "vip_days_on_signup": {
		// 	"bsonType": "int",
		// 	"title": "注册会员赠送VIP天数",
		// 	"description": "新用户注册后自动获得的VIP体验天数",
		// 	"defaultValue": 7
		// },
		"register_reward": {
		    "bsonType": "object",
		    "title": "新用户注册奖励",
		    "description": "新用户注册平台时自动获得的奖励。管理员可以指定奖励的类型（如金币或VIP天数）和数量，以激励更多新用户的加入。",
		    "properties": {
		        "reward_type": {
		            "bsonType": "int",
		            "title": "奖励类型",
		            "description": "用户注册奖励的类型，如：金币、VIP天数等",
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
		            "description": "新用户注册平台后所获得的奖励数量",
		            "defaultValue": 7
		        }
		    }
		},
		// "daily_login_reward": {
		// 	"bsonType": "int",
		// 	"title": "每日登录奖励",
		// 	"description": "用户每日登录App可获得的金币奖励",
		// 	"defaultValue": 1
		// },
		"daily_login_reward": {
		    "bsonType": "object",
		    "title": "每日登录奖励",
		    "description": "用户每日登录App时获得的奖励。管理员可以指定奖励的类型（如金币或VIP天数）和数量，以增加用户的日常活跃度。",
		    "properties": {
		        "reward_type": {
		            "bsonType": "int",
		            "title": "奖励类型",
		            "description": "用户每日登录奖励的类型，如：金币、VIP天数等",
		            "defaultValue": 0,
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
		            "description": "用户每日登录App后获得的奖励数量",
		            "defaultValue": 1
		        }
		    }
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
		            "defaultValue": 6,
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
				"reward_type": {
					"bsonType": "int",
					"title": "奖励类型",
					"description": "分享奖励的类型，如金币、VIP天数等",
					"defaultValue": 0,
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
		"new_user_guide_display": {// 暂时不需要
			"bsonType": "boolean",
			"title": "新用户引导页显示",
			"description": "是否向新用户展示引导页",
			"defaultValue": true
		},
		"customer_service_contact": {// 暂时不需要
			"bsonType": "string",
			"title": "客服联系方式",
			"description": "App内客服的联系方式",
			"defaultValue": "contact@example.com"
		},
		"maintenance_mode_enabled": {// 暂时不需要
			"bsonType": "boolean",
			"title": "维护模式开启",
			"description": "App是否处于维护模式",
			"defaultValue": false
		}
		//  还需要公告（弹出层）、通知（走马灯文字）
	}
}
然后我现在还需要增加的字段有：“每日免费观看次数（仅针对视频）”这个标题有点长，你帮我再优化下，要简洁易懂、

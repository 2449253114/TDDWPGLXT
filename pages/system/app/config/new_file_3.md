帮我把下面这两个字段[1][2]改成[3]的格式
[1]"vip_days_on_signup": {
	"bsonType": "int",
	"title": "注册会员赠送VIP天数",
	"description": "新用户注册后自动获得的VIP体验天数",
	"defaultValue": 7
},
[2]"daily_login_reward": {
	"bsonType": "int",
	"title": "每日登录奖励",
	"description": "用户每日登录App可获得的金币奖励",
	"defaultValue": 1
},
[3]
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
}

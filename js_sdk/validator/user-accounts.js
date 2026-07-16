// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "is_internal_user": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "内部用户",
    "defaultValue": false,
    "label": "内部用户"
  },
  "username": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "用户名",
    "defaultValue": "",
    "label": "用户名"
  },
  "password": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "密码",
    "defaultValue": "",
    "label": "密码"
  },
  "nickname": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "昵称",
    "defaultValue": "",
    "label": "昵称"
  },
  "introduction": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "个人介绍",
    "defaultValue": "这个人很懒，什么也没留下",
    "label": "个人介绍"
  },
  "daily_movie_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "每日观看次数",
    "defaultValue": 3,
    "label": "每日观看次数"
  },
  "surplus_movie_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "当日剩余观看次数",
    "defaultValue": 3,
    "label": "当日剩余观看次数"
  },
  "score": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "积分",
    "defaultValue": 0,
    "label": "积分"
  },
  "coin": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "湾币",
    "defaultValue": 0,
    "label": "湾币"
  },
  "vip": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "会员",
    "defaultValue": false,
    "label": "会员"
  },
  "vip_expire_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "会员有效期至",
    "defaultValue": 0,
    "label": "会员有效期至"
  },
  "vip_level": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "text": "会员（VIP）",
            "value": 0
          },
          {
            "text": "大会员（SVIP）",
            "value": 1
          }
        ]
      }
    ],
    "title": "会员等级",
    "defaultValue": 0,
    "label": "会员等级"
  },
  "inviter_uid": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "邀请人",
    "defaultValue": "",
    "label": "邀请人"
  },
  "invite_time": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "受邀时间",
    "defaultValue": 0,
    "label": "受邀时间"
  },
  "my_invite_code": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "我的邀请码",
    "defaultValue": "",
    "label": "我的邀请码"
  },
  "device_oaid": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "设备oaid",
    "defaultValue": "",
    "label": "设备oaid"
  },
  "app_platform": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "APP平台",
    "defaultValue": "",
    "label": "APP平台"
  },
  "status": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "text": "正常",
            "value": 0
          },
          {
            "text": "禁止购买会员",
            "value": 1
          },
          // {
          //   "text": "审核中",
          //   "value": 2
          // },
          {
            "text": "已被封禁",
            "value": 3
          }
        ]
      }
    ],
    "title": "用户状态",
    "defaultValue": 0,
    "label": "用户状态"
  },
  "description": {
	  "rules": [
	    {
	      "format": "string"
	    }
	  ],
	  "title": "备注说明",
	  "defaultValue": "",
	  "label": "备注说明，自用，一般封禁用户账号的备注说明"
  },
  "avatar": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "头像地址",
    "defaultValue": "",
    "label": "头像地址"
  },
  "login_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "最后登录时间",
    "defaultValue": {
      "$env": "now"
    },
    "label": "最后登录时间"
  },
  "login_ip": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "最后登录时 IP 地址",
    "defaultValue": {
      "$env": "clientIP"
    },
    "label": "最后登录时 IP 地址"
  },
  "register_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "注册时间",
    "defaultValue": {
      "$env": "now"
    },
    "label": "注册时间"
  },
  "register_ip": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "注册时 IP 地址",
    "defaultValue": {
      "$env": "clientIP"
    },
    "label": "注册时 IP 地址"
  }
}

const enumConverter = {
  "vip_level_valuetotext": {
    "0": "会员（VIP）",
    "1": "大会员（SVIP）"
  },
  "status_valuetotext": {
    "0": "正常",
    "1": "禁止购买会员",
    // "2": "审核中",
    "3": "已被封禁"
  }
}

function filterToWhere(filter, command) {
  let where = {}
  for (let field in filter) {
    let { type, value } = filter[field]
    switch (type) {
      case "search":
        if (typeof value === 'string' && value.length) {
          where[field] = new RegExp(value)
        }
        break;
      case "select":
        if (value.length) {
          let selectValue = []
          for (let s of value) {
            selectValue.push(command.eq(s))
          }
          where[field] = command.or(selectValue)
        }
        break;
      case "range":
        if (value.length) {
          let gt = value[0]
          let lt = value[1]
          where[field] = command.and([command.gte(gt), command.lte(lt)])
        }
        break;
      case "date":
        if (value.length) {
          let [s, e] = value
          let startDate = new Date(s)
          let endDate = new Date(e)
          where[field] = command.and([command.gte(startDate), command.lte(endDate)])
        }
        break;
      case "timestamp":
        if (value.length) {
          let [startDate, endDate] = value
          where[field] = command.and([command.gte(startDate), command.lte(endDate)])
        }
        break;
    }
  }
  return where
}

export { validator, enumConverter, filterToWhere }

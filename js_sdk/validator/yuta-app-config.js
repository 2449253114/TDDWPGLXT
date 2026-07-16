// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "vip_days_on_signup": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "注册会员赠送VIP天数",
    "defaultValue": 7,
    "label": "注册会员赠送VIP天数"
  },
  "daily_login_reward": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "每日登录奖励",
    "defaultValue": 1,
    "label": "每日登录奖励"
  },
  "weekly_login_vip_reward": {
    "rules": [
      {
        "format": "object"
      }
    ],
    "title": "周登陆VIP奖励",
    "label": "周登陆VIP奖励"
  },
  "invite_reward": {
    "rules": [
      {
        "format": "object"
      }
    ],
    "title": "邀请奖励",
    "label": "邀请奖励"
  },
  "share_reward": {
    "rules": [
      {
        "format": "object"
      }
    ],
    "title": "分享奖励",
    "label": "分享奖励"
  },
  "new_user_guide_display": {
    "rules": [
      {
        "format": "boolean"
      }
    ],
    "title": "新用户引导页显示",
    "defaultValue": true,
    "label": "新用户引导页显示"
  },
  "customer_service_contact": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "客服联系方式",
    "defaultValue": "contact@example.com",
    "label": "客服联系方式"
  },
  "maintenance_mode_enabled": {
    "rules": [
      {
        "format": "boolean"
      }
    ],
    "title": "维护模式开启",
    "defaultValue": false,
    "label": "维护模式开启"
  }
}

const enumConverter = {}

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

// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "register_reward": {
    "rules": [
      {
        "format": "object"
      }
    ],
    "title": "新用户注册奖励",
    "label": "新用户注册奖励"
  },
  "daily_login_reward": {
    "rules": [
      {
        "format": "object"
      }
    ],
    "title": "每日登录奖励",
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
  "free_video_views_per_day": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "每日免费视频观看次数",
    "defaultValue": 3,
    "label": "每日免费视频观看次数"
  },
  "app_file_cover_type": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "value": 0,
            "text": "一刻相册"
          },
          {
            "value": 1,
            "text": "uniCloud"
          }
        ]
      }
    ],
    "title": "文件封面URL",
    "defaultValue": 1,
    "label": "文件封面URL"
  },
  "app_download_link": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "APP下载链接",
    "defaultValue": "",
    "label": "APP下载链接"
  },
  "app_dwonload_qr_code": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "APP下载二维码",
    "defaultValue": "",
    "label": "APP下载二维码"
  },
  "app_share_content": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "APP分享内容",
    "defaultValue": "",
    "label": "APP分享内容"
  },
  "app_home_notice": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "APP首页公告",
    "defaultValue": "",
    "label": "APP首页公告"
  },
  "app_version": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "APP版本",
    "defaultValue": "1.0.0",
    "label": "APP版本"
  }
}

const enumConverter = {
  "app_file_cover_type_valuetotext": {
    "0": "一刻相册",
    "1": "uniCloud"
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

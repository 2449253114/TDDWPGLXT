// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "notes": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      }
    ],
    "title": "备注",
    "defaultValue": "",
    "label": "备注"
  },
  "uk": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      }
    ],
    "title": "uk",
    "defaultValue": "",
    "label": "uk"
  },
  "bdstoken": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      }
    ],
    "title": "bdstoken",
    "defaultValue": "",
    "label": "bdstoken"
  },
  "clienttype": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "clienttype",
    "defaultValue": "70",
    "label": "clienttype"
  },
  "Cookie": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "string"
      }
    ],
    "title": "Cookie",
    "defaultValue": "",
    "label": "Cookie"
  },
  "Host": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "Host",
    "defaultValue": "photo.baidu.com",
    "label": "Host"
  },
  "Origin": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "Origin",
    "defaultValue": "https://photo.baidu.com",
    "label": "Origin"
  },
  "Referer": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "Referer",
    "defaultValue": "https://photo.baidu.com/photo/web/album",
    "label": "Referer"
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

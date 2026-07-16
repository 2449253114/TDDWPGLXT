// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "user_name": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "用户名",
    "defaultValue": "",
    "label": "用户名"
  },
  "cookie": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "cookie",
    "label": "cookie"
  },
  "status": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "value": 0,
            "text": "正常"
          },
          {
            "value": 1,
            "text": "cookie过期"
          },
          {
            "value": 2,
            "text": "账户异常"
          }
        ]
      }
    ],
    "title": "账户状态",
    "defaultValue": 0,
    "label": "账户状态"
  },
  "create_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "创建时间",
    "defaultValue": {
      "$env": "now"
    },
    "label": "创建时间"
  }
}

const enumConverter = {
  "status_valuetotext": {
    "0": "正常",
    "1": "cookie过期",
    "2": "账户异常"
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

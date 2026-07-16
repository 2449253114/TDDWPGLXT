// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "login_day": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "value": 1,
            "text": "周一"
          },
          {
            "value": 2,
            "text": "周二"
          },
          {
            "value": 3,
            "text": "周三"
          },
          {
            "value": 4,
            "text": "周四"
          },
          {
            "value": 5,
            "text": "周五"
          },
          {
            "value": 6,
            "text": "周六"
          },
          {
            "value": 7,
            "text": "周日"
          }
        ]
      }
    ],
    "title": "登录日",
    "defaultValue": 1,
    "label": "登录日"
  }
}

const enumConverter = {
  "login_day_valuetotext": {
    "1": "周一",
    "2": "周二",
    "3": "周三",
    "4": "周四",
    "5": "周五",
    "6": "周六",
    "7": "周日"
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

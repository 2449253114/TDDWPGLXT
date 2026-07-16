// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "user_id": {
    "rules": [
      {
        "format": "string"
      }
    ]
  },
  "purchase_type": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "text": "相册",
            "value": 0
          },
          {
            "text": "文件",
            "value": 1
          }
        ]
      }
    ],
    "title": "购买类型",
    "label": "购买类型"
  },
  "album_id": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "相册ID",
    "label": "相册ID"
  },
  "file_id": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "文件ID",
    "label": "文件ID"
  },
  "purchase_time": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "购买时间",
    "defaultValue": {
      "$env": "now"
    },
    "label": "购买时间"
  },
  "price": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "购买价格",
    "label": "购买价格"
  }
}

const enumConverter = {
  "purchase_type_valuetotext": {
    "0": "相册",
    "1": "文件"
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

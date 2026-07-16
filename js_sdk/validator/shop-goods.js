// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "name": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "商品名称",
    "label": "商品名称"
  },
  "type": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "text": "金币充值",
            "value": 0
          },
          {
            "text": "会员开通",
            "value": 1
          }
        ]
      }
    ],
    "title": "商品类型",
    "defaultValue": 0,
    "label": "商品类型"
  },
  "price": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "价格",
    "defaultValue": 25,
    "label": "价格"
  },
  "day_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "开通天数",
    "defaultValue": 0,
    "label": "开通天数"
  },
  "giveaway_coin": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "赠送金币",
    "defaultValue": 0,
    "label": "赠送金币"
  }
}

const enumConverter = {
  "type_valuetotext": {
    "0": "金币充值",
    "1": "会员开通"
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

// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "title": {
    "rules": [
      {
        "required": true,
        "errorMessage": "{title}不能为空"
      },
      {
        "format": "string",
        "errorMessage": "{title}不能为空"
      }
    ],
    "title": "标题",
    "label": "标题"
  },
  "excerpt": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "摘要",
    "label": "摘要"
  },
  "source_url": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "来源地址",
    "label": "来源地址"
  },
  "your_story": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "array"
      }
    ],
    "title": "内容",
    "label": "内容"
  },
  "thumburl": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "array"
      }
    ],
    "title": "封面大图",
    "label": "封面大图"
  },
  "creator_user": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "object"
      }
    ],
    "title": "创建者信息",
    "label": "创建者信息"
  },
  "create_time": {
    "rules": [
      {
        "required": true
      },
      {
        "format": "timestamp"
      }
    ],
    "title": "创建时间",
    "label": "创建时间"
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

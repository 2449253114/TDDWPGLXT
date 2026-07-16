// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "album_id": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "相册ID",
    "label": "相册ID"
  },
  "show_name": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "剧名",
    "label": "剧名"
  },
  "episodes": {
    "rules": [
      {
        "format": "array"
      }
    ],
    "title": "剧集信息",
    "label": "剧集信息"
  },
  "description": {
    "rules": [
      {
        "format": "string"
      },
      {
        "maxLength": 500
      }
    ],
    "title": "描述",
    "label": "描述"
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
            "text": "草稿箱"
          },
          {
            "value": 1,
            "text": "已发布"
          }
        ]
      }
    ],
    "title": "发布状态",
    "defaultValue": 0,
    "label": "发布状态"
  }
}

const enumConverter = {
  "status_valuetotext": {
    "0": "草稿箱",
    "1": "已发布"
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

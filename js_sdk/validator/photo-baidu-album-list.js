// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "album_type": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "text": "一刻相册",
            "value": 0
          },
          {
            "text": "同多多相册",
            "value": 1
          }
        ]
      }
    ],
    "title": "相册类型",
    "defaultValue": 0,
    "label": "相册类型"
  },
  "create_time": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "create_time",
    "label": "create_time"
  },
  "notice": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "相册描述",
    "label": "相册描述"
  },
  "title": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "相册名称",
    "label": "相册名称"
  },
  "tag": {
    "rules": [
      {
        "format": "array"
      }
    ],
    "title": "标签",
    "defaultValue": [],
    "label": "标签"
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
          },
          {
            "value": 2,
            "text": "审核中"
          }
        ]
      }
    ],
    "title": "文章状态",
    "defaultValue": 1,
    "label": "文章状态"
  },
  "cover_info": {
    "rules": [
      {
        "format": "object"
      }
    ],
    "title": "cover_info",
    "label": "cover_info"
  }
}

const enumConverter = {
  "album_type_valuetotext": {
    "0": "一刻相册",
    "1": "同多多相册"
  },
  "status_valuetotext": {
    "0": "草稿箱",
    "1": "已发布",
    "2": "审核中"
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

// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "album_id": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "album_id",
    "defaultValue": "",
    "label": "album_id"
  },
  "category": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "text": "视频",
            "value": 1
          },
          {
            "text": "图片",
            "value": 3
          }
        ]
      }
    ],
    "title": "类别",
    "defaultValue": 1,
    "label": "类别"
  },
  "ctime": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "上传时间",
    "label": "上传时间"
  },
  "fsid": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "fsid",
    "label": "fsid"
  },
  "bytes": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "bytes",
    "label": "bytes"
  },
  "duration_format": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "总时长",
    "defaultValue": "0",
    "label": "总时长"
  },
  "thumburl": {
    "rules": [
      {
        "format": "array"
      }
    ],
    "title": "thumburl",
    "label": "thumburl"
  },
  "duration_ms_long": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "总时长毫秒",
    "defaultValue": 0,
    "label": "总时长毫秒"
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
    "title": "发布状态",
    "defaultValue": 1,
    "label": "发布状态"
  },
  "extra_info": {
    "rules": [
      {
        "format": "object"
      }
    ],
    "title": "额外信息",
    "label": "额外信息"
  }
}

const enumConverter = {
  "category_valuetotext": {
    "1": "视频",
    "3": "图片"
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

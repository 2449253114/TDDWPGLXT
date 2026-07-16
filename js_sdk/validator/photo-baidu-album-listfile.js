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
  "size": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "size",
    "label": "size"
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
  "title": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "标题",
    "label": "标题"
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
	"duration_ms_long": {
		"rules": [
		  {
		    "format": "int"
		  }
		],
		"title": "duration_ms_long",
		"label": "duration_ms_long"
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
  "album_type_valuetotext": {
    "0": "一刻相册",
    "1": "同多多相册"
  },
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

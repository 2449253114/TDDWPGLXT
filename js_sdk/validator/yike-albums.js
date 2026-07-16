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
	          "value": 0,
	          "text": "一刻相册"
	        },
	        {
	          "value": 1,
	          "text": "网剧相册"
	        }
	      ]
	    }
	  ],
	  "title": "相册类型",
	  "defaultValue": 0,
	  "label": "相册类型"
	},
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
  "create_time": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "创建时间",
    "label": "创建时间"
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
  "custom_title": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "APP相册名称",
    "label": "APP相册名称"
  },
  "top_days": {
    "rules": [
      {
        "format": "int"
      },
      {
        "minimum": 0
      }
    ],
    "title": "置顶天数",
    "defaultValue": 0,
    "label": "置顶天数"
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
    "defaultValue": 0,
    "label": "发布状态"
  }
}

const enumConverter = {
  "status_valuetotext": {
    "0": "草稿箱",
    "1": "已发布",
    "2": "审核中"
  },
  "album_type_valuetotext": {
	"0": "一刻相册",
	"1": "网剧相册"
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

// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "task_title": {
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
    "title": "任务名",
    "label": "任务名"
  },
  "urls": {
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
    "title": "采集地址",
    "label": "采集地址"
  },
  "source_url_selector": {
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
    "title": "source_url 选择器",
    "label": "source_url 选择器"
  },
  "title_selector": {
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
    "title": "title 选择器",
    "label": "title 选择器"
  },
  "nickname_selector": {
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
    "title": "creator_user.nickname 选择器",
    "label": "creator_user.nickname 选择器"
  },
  "your_story_selector": {
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
    "title": "your_story 选择器",
    "label": "your_story 选择器"
  },
  "your_story_img_selector": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "your_story 图片选择器",
    "defaultValue": "img",
    "label": "your_story 图片选择器"
  },
  "your_story_src_prefix": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "your_story 图片 src 前缀",
    "defaultValue": "",
    "label": "your_story 图片 src 前缀"
  },
  "your_story_description_selector": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "your_story.description 选择器",
    "defaultValue": "",
    "label": "your_story.description 选择器"
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

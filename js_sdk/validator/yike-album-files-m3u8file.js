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
  "fsid": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "fsid",
    "defaultValue": "",
    "label": "fsid"
  },
  "m3u8_file_url": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "m3u8文件URL",
    "defaultValue": "",
    "label": "m3u8文件URL"
  },
  "read_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "读取次数",
    "defaultValue": 0,
    "label": "读取次数"
  },
  "transcoding_status": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "转码状态",
    "defaultValue": "transcoding",
    "label": "转码状态"
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
  "expire_time": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "失效时间",
    "label": "失效时间"
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
          // 我需要修改这部分代码，我要用validator[field]来获取当前字段的类型，validator[field].rules.format == int时，那我就不能new RegExp(value)，因为这是返回的string类型，且在外面传入进来的时候已经把字段value值变成了string，就很烦（uni没考虑字段类型，导致搜索不到结果）
          // 所以我这里需要处理正确的字段值的类型，因为官方写的这个有BUG
          
          // 获取字段的类型
          const fieldType = validator[field]?.rules[0]?.format;
          
          // 根据字段类型处理搜索值
          if (fieldType === 'int') {
          	// 如果是 int 类型，将字符串转换为整数
          	where[field] = parseInt(value, 10);
          } else {
          	// 其他类型（如 string）直接使用正则表达式
          	where[field] = new RegExp(value);
          }
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

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
  "file_type": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "文件类型",
    "defaultValue": "video",
    "label": "文件类型"
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
  "desc": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "描述",
    "label": "描述"
  },
  "dlink": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "dlink",
    "label": "dlink"
  },
  "extra_info": {
    "rules": [
      {
        "format": "object"
      }
    ],
    "title": "额外信息",
    "label": "额外信息"
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
  "md5": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "md5",
    "label": "md5"
  },
  "nickname": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "nickname",
    "label": "nickname"
  },
  "path": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "path",
    "label": "path"
  },
  "photo": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "photo",
    "label": "photo"
  },
  "server_md5": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "server_md5",
    "label": "server_md5"
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
  "tid": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "tid",
    "label": "tid"
  },
  "uk": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "uk",
    "label": "uk"
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
  "free_video": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "限免视频",
    "defaultValue": false,
    "label": "限免视频"
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

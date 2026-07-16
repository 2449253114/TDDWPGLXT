// 表单校验规则由 schema2code 生成，不建议直接修改校验规则，而建议通过 schema2code 生成, 详情: https://uniapp.dcloud.net.cn/uniCloud/schema


const validator = {
  "body": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "商品描述",
    "label": "商品描述"
  },
  "pay_type": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "支付渠道",
    "label": "支付渠道"
  },
  "out_trade_no": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "支付订单号",
    "label": "支付订单号"
  },
  "total_fee": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "订单总金额",
    "label": "订单总金额"
  },
  "timestamp": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "发起订单时间",
    "label": "发起订单时间"
  },
  "sign": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "数据签名",
    "label": "数据签名"
  },
  "user_id": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "下单用户ID",
    "defaultValue": "",
    "label": "下单用户ID"
  },
  "client_ip": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "客户端IP",
    "defaultValue": {
      "$env": "clientIP"
    },
    "label": "客户端IP"
  },
  "platform": {
    "rules": [
      {
        "format": "String"
      }
    ],
    "title": "下单平台",
    "defaultValue": "与他APP",
    "label": "下单平台"
  },
  "order_type": {
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
    "title": "订单类型",
    "defaultValue": 0,
    "label": "订单类型"
  },
  "status": {
    "rules": [
      {
        "format": "int"
      },
      {
        "range": [
          {
            "text": "未支付",
            "value": 0
          },
          {
            "text": "已支付",
            "value": 1
          },
          {
            "text": "已退款",
            "value": 2
          }
        ]
      }
    ],
    "title": "订单状态",
    "defaultValue": 0,
    "label": "订单状态"
  },
  "day_count": {
    "rules": [
      {
        "format": "int"
      }
    ],
    "title": "开通会员天数",
    "defaultValue": 0,
    "label": "开通会员天数"
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
  },
  "system_recharge_issuccess": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "系统充值是否成功",
    "defaultValue": false,
    "label": "系统充值是否成功"
  },
  "create_time": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "订单创建时间",
    "label": "订单创建时间"
  },
  "pay_success_time": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "支付完成时间",
    "label": "支付完成时间"
  },
  "pay_add_time": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "下单时间",
    "label": "下单时间"
  },
  "pay_no": {
    "rules": [
      {
        "format": "string"
      }
    ],
    "title": "微信支付订单号",
    "label": "微信支付订单号"
  },
  "cancel_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "取消时间",
    "label": "取消时间"
  },
  "is_payment_status_checked": {
    "rules": [
      {
        "format": "bool"
      }
    ],
    "title": "支付状态检查标记（蓝兔支付）",
    "defaultValue": false,
    "label": "支付状态检查标记（蓝兔支付）"
  },
  "notify_date": {
    "rules": [
      {
        "format": "timestamp"
      }
    ],
    "title": "异步通知时间",
    "label": "异步通知时间"
  }
}

const enumConverter = {
  "order_type_valuetotext": {
    "0": "金币充值",
    "1": "会员开通"
  },
  "status_valuetotext": {
    "0": "未支付",
    "1": "已支付",
    "2": "已退款"
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

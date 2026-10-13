# cleanup-zero-fee-vip-changes

清理 `user-vip-changes` 表中 `total_fee` 为 0 的记录（硬删除，不备份）。

## ⚠️ mongo 语义警告

mongo 的 `{ total_fee: 0 }` 同时匹配三种文档：

1. `total_fee` 值为数字 `0`
2. `total_fee` 值为 `null`
3. `total_fee` 字段完全缺失（mongo 把 missing 等价为 null）

即本云对象会**同时删除"0 值 + null 值 + 字段缺失"三类历史记录**。目前 init 数据统计：18 条记录里 11 条 `total_fee=1`、7 条字段缺失、0 条等于 0。所以第一次真删**实际删掉的主要是那 7 条字段缺失的历史记录**。dry-run 输出里强制带 `sample`（前 3 条样例），请在删前肉眼核对。

## 使用流程（两步走）

### 第 1 步：dry-run 统计（不删任何数据）

在 HBuilderX 里右键 `index.obj.js` → 运行云对象。默认参数（见 `cleanup-zero-fee-vip-changes.param.js`）就是：

```js
run({ dryRun: true })
```

控制台输出：

- `willDelete`：满足条件的总条数
- `sample`：前 3 条样例（含 `_id` / `total_fee` / `user_id` / `comment` / `create_date` 等关键字段）
- `mongoNote`：上面那条 mongo 语义警告

**务必看一眼 sample 里都是你想删的记录再进第 2 步。**

### 第 2 步：真删

把 `cleanup-zero-fee-vip-changes.param.js` 顶部的 `run({ dryRun: true })` 注释掉，解开底部被注释的：

```js
run({
	dryRun: false,
	confirm: "YES_DELETE"
})
```

再运行一次即可。输出里有 `expectedTotal`（删前预估总数）和 `deletedTotal`（实际删除数），两者对得上说明删干净了。

## 安全护栏

| 护栏 | 说明 |
|---|---|
| 默认 dry-run | 不传参数只统计，不删数据 |
| `confirm` 口令 | 真删必须显式传 `confirm: "YES_DELETE"`，拼错会被拒绝 |
| 分批删除 | 每批最多 1000 条（JQL 单次 remove 上限），循环删除直到清完 |
| 防死循环 | 连续 3 批返回 `deleted=0` 强制中止，防止筛选条件异常导致空转 |
| 双约束删除 | 每批删除时用 `_id in ids AND total_fee == 0` 双条件，防止边界异常扩大删除范围 |
| 循环上限 | 最多 2000 轮（即 200 万条），超出强制中止 |

## 不做的事

- 不备份（按需求"只硬删除"）
- 不加日期筛选（按需求"全量"）
- 不处理 `total_fee` 为正数的记录（那些是真实付费记录）

# cleanup-zombie-users

清理 `user-accounts` 表中的**僵尸用户**（含机器批量注册后只用几分钟即弃用的账号）。硬删除，不备份。

## 僵尸判定（三个条件全部满足）

1. `register_date < 2026-01-01 23:59:59 (UTC+8)`
2. **从未登录过**（`login_date` 缺失或为 0），**或** `|login_date - register_date| ≤ 10 分钟`
   - 语义：注册后在 10 分钟内完成最后一次登录，此后再无任何登录。因为 `login_date` 只记录**最后**一次登录时间，"最后登录紧挨着注册"即等于"注册后只用了一小会儿就再没回来"。
   - 你举的例子：`2026-01-01 02:10:30` 注册、5 分钟后下线再未上线 → `login_date - register_date ≈ 5min ≤ 10min` → 命中。
3. **资产护栏**（默认开启，`excludeActiveVip: true`）：持有**未过期 VIP**（`vip === true` 且 `vip_expire_date > now`）的用户**不删**。判定与项目权威函数 `app-user-auth/common/fun.js` 的 `checkVipStatus` 一致。
   - 为什么不能只看 `vip === true`：注册即送 1 天 VIP（2025-01-06 起），而 `vip` 字段只在用户登录/获取用户信息时被刷新——用户不上线则字段永远停在 `true`（已知设计缺陷）。这些"过期 VIP 僵尸号"**会被清理**。
   - 湾币（coin）/ 积分（score）客户端未使用，**不作为护栏**——持有湾币/积分的僵尸号照删。

### 边界说明

- `register_date` 缺失/非法的用户**保守不删**（无法判定）。
- 时间窗口取 `abs()`（绝对值），容忍登录时间略早于注册时间的脏数据。
- `status`（封禁状态）**不参与判定**：被封禁的僵尸号同样会删；如果你想把封禁号留作证据，告诉我加一个排除条件。

## 实现方式（与其它清理对象不同）

JQL 不支持"字段减字段"的比较，所以不能一条 `where` 表达 10 分钟窗口。流程是：

1. **扫描**：按 `_id` 游标分页（每批 1000，`_id` 升序）拉取所有 `register_date < 截止线` 的用户
2. **JS 过滤**：逐条做时间窗口判定 + 资产护栏判定，收集僵尸 `_id`
3. **删除**：按 1000 一批，用 `_id in ids AND register_date < cutoff` **双约束**删除

扫描上限 2000 万候选用户（MAX_SCAN_LOOPS=20000），超限会中止并在结果里标记 `reachedScanCap: true`。

### 限流保护（intervalMs）

相邻两次 DB 请求（查询或删除）之间默认间隔 **100ms（≈10 QPS）**，防止密集请求触发阿里云数据库限流。可通过参数调整：

- 数据量小（几千用户以内）：`intervalMs: 0` 关闭间隔，跑得快
- 数据量大：保持默认 100ms；仍被限流就加大到 200~500ms

代价估算：每 100 万候选行 ≈ 1000 批 ≈ 多花 100 秒。云函数 `timeout: 300s` 内默认间隔最多可扫约 250 万行；更多数据请分批跑（改 cutoff 或告诉我改成定时任务分段推进）。

## 使用流程（两步走）

### 第 1 步：dry-run（不删任何数据）

HBuilderX 右键 `index.obj.js` → 运行云对象。默认参数（见 `cleanup-zombie-users.param.js`）：

```js
run({ dryRun: true })
```

输出关注这几项：

| 字段 | 含义 |
|---|---|
| `scanned` | 扫描过的候选用户总数（注册时间早于截止线的全部用户） |
| `excludedByActiveVip` | 时间上像僵尸、但持有未过期 VIP 被护栏拦下的数量 |
| `willDelete` | 最终会删的账号数 |
| `sample` | 前 3 条样例，`loginMinusRegisterMs` 为 null 表示从未登录；`vipStillActive` 可核对护栏判定 |

**务必看 sample，确认 username/nickname 都是机器味或弃用号再进第 2 步。**

### 第 2 步：真删

把 `cleanup-zombie-users.param.js` 顶部的 `run({ dryRun: true })` 注释掉，解开底部：

```js
run({
	dryRun: false,
	confirm: "YES_DELETE",
	excludeActiveVip: true,
	intervalMs: 100
})
```

输出里 `expectedTotal`（扫描判定数）和 `deletedTotal`（实际删除数）应相等。

## 不做的事

- 不备份（硬删除）
- 不清理该用户在其它表的关联数据（观看记录、vip 变更、邀请关系等）——只删 `user-accounts` 行本身。如有级联清理需求，另行评估。

## 安全护栏汇总

| 护栏 | 说明 |
|---|---|
| 默认 dry-run | 不传参数只统计，不删数据 |
| `confirm` 口令 | 真删必须显式传 `confirm: "YES_DELETE"` |
| 资产护栏 | 持有未过期 VIP（`vip=true` 且 `vip_expire_date>now`）的用户默认永不删除；仅 `vip=true` 但已过期的不拦（已知缺陷：不上线的用户 vip 字段不刷新） |
| 保守判定 | 注册时间缺失的用户不删 |
| 双约束删除 | `_id in ids AND register_date < cutoff`，防边界异常扩大范围 |
| 扫描失败即中止 | 扫描阶段任何异常直接返回，0 删除 |
| 单实例并发 | package.json `concurrency: 1`，防并发重复执行 |

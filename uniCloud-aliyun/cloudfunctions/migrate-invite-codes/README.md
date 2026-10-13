# migrate-invite-codes

一次性迁移：把旧表 `user-all-Invitation-codes` 中单个文档的 `codes` 数组（约 46.5 万个邀请码、8.7MB）拆成每码一条记录，写入新表 `user-invite-codes`。

## 为什么要迁移

- 旧注册流程每注册一个用户，都要读出整个数组，再把整个数组写回去。写回时没有 await，并发注册会互相覆盖。
- 这个文档会一直变大。按当前约 19.7 字节/码估算，约 85 万个邀请码时会超过 MongoDB 单文档 16MB 的上限，届时注册失败。
- 新流程（`app-user-auth/common/fun.js` 的 `reserveInviteCode`）：
  1. 随机生成一个 6 位码；
  2. 同时查新表和用户表 `user-accounts.my_invite_code`（两边都有索引，都是单次点查）；
  3. 两边都没有，才写入新表占用。
  - `code` 上的唯一索引兜底并发冲突。

## 新表 `user-invite-codes`

| 字段 | 说明 |
|---|---|
| `code` | 邀请码，唯一索引（`database/user-invite-codes.index.json`） |
| `source` | 来源：`legacy_array` 从旧数组迁移；`register` 注册生成 |
| `create_date` | 写入本表的毫秒时间戳。迁移记录取迁移执行时间，不是邀请码最初生成的时间 |

## 迁移逻辑

1. **旧数组**：读取旧表全部文档的 `codes`，去重后每 1000 个一批。查询新表里已有哪些码，只写入缺失的部分。
   - 批大小不能超过 1000：uniCloud 单次查询最多返回 1000 条，再大查重结果会被截断。
2. **核对**：统计新表总数。若少于旧数组去重后的数量，返回 `VERIFY_FAILED`。

不扫描 `user-accounts` 补齐：
- 清理僵尸用户后，用户表约 46.5 万条，与旧数组的码数一致。
- 扫描用户表要多出几百批请求，耗时且增加线上数据库压力。
- 注册查重时还会查用户表。万一个别在用邀请码不在旧数组里，它也不会被重新分配。
- dry-run 会返回用户表总数，便于与旧数组码数对照。

其他约定：
- 只新增，不修改、不删除旧表。旧表保留，用于核对和回滚。
- 已迁移的码会被跳过，可以重复运行。
- 单次运行有 500 秒时间预算，用尽后返回 `done: false` 和 `resume`，把 `resume` 原样传回即可续跑。
- 写入出错时返回 `MIGRATE_ABORTED` 和 `resume`。查明原因后重跑即可，不会重复写入。

## 防止触发阿里云数据库限流

触发条件：阿里云服务空间每分钟新增慢查询日志超过 200 条，或扫描文档超过 2000 万行，会触发 `Throttling.Api` 限流。限流对整个服务空间生效，线上 App 的请求也会被拒绝。

本云对象的防护措施：
- **串行执行**：所有批次逐个 `await`，不会并发打满数据库。
- **批次间隔**：每批开始前默认等待 300 毫秒（`intervalMs`），约每分钟 120 批。
  - 每批是 2 次已命中索引的请求，即使每批都产生一条慢日志，也低于 200 条的阈值。
  - 需要更保守时，调大 `intervalMs`，例如 `run({ ..., intervalMs: 600 })`。
- **必须先建好 `code` 唯一索引**：
  - 没有索引时，每批的 `in` 查询都会全表扫描新表；新表最多有约 46.5 万条，累计扫描量会达到数亿行，必然触发限流。
  - 所以执行步骤第 1 步必须先上传 `user-invite-codes.index.json`。

如果仍然触发限流：
- 运行会返回 `MIGRATE_ABORTED`，并且 `errMsg` 中包含 `Throttling`。
- 等待 1 分钟以上，再原样传入 `resume` 续跑，必要时同时调大 `intervalMs`。
- 已写入的数据不会重复写。

耗时估算：
- 约 465 批（每批 1000 个），单批耗时取决于线上数据库负载，可能需要续跑多次；
- dry-run 只有几次读取，很快完成。
- 以上是估算，实际以运行结果中的 `elapsedMs` 为准。

## 执行步骤（先在阿里云内置库跑通，再做一键搬家）

1. **建表和索引**：在 HBuilderX 中，右键 `uniCloud-aliyun/database`，上传 `user-invite-codes.schema.json` 和 `user-invite-codes.index.json`。
   - 先在云端控制台确认已有 `code` 唯一索引。没有索引就迁移会触发限流，见上一节。
2. **上传本云对象并 dry-run**：右键本目录 → 上传部署，然后按 `migrate-invite-codes.param.js` 第 1 步运行。重点看这几个字段：
   - `legacy.unique`：旧数组去重后的邀请码数，与 `users.total`（用户表总数）对照；
   - `legacy.duplicates` / `legacy.invalid` / `legacy.nonStandard`：异常数据统计。
3. **正式迁移**：按 param 文件第 2 步运行。
   - 期望结果：`done: true`、没有 `errCode`，且 `target.total` ≥ `legacy.unique`。
4. **上传新代码**：上传 `app-user-auth`（新注册逻辑）以及本次替换了 `affectedDocs` 的其余云函数，观察注册和登录是否正常。
5. **再跑一次第 3 步**：第 1 步之后、第 4 步之前，旧注册逻辑仍在往旧数组追加，这一步把这段时间新增的码补进新表，让新表保持完整。
   - 这段时间注册的用户已经写进用户表，新注册查重时会查到，所以第 4、5 步之间不会出现撞码。
6. **一键搬家**：把 `user-invite-codes` 加入一键搬家工具 `vk.db.config.js` 的 `db` 清单，并把它的 schema 和 index 复制到工具的 `uniCloud-alipay/database`。
   - 迁移完成后，在扩展库执行 `scripts/mongodb/create-indexes.mongosh.js`，确认唯一索引存在。

## 返回字段速查

- dry-run：`legacy`（旧数组统计）、`target.total`（新表现有数）、`users.total`（用户表总数，仅供对照）
- 迁移：`progress`（`inserted` 新写入数、`existed` 已存在数）、`target.total`、`done`、`resume`、`intervalMs`、`elapsedMs`
- 出错：`errCode`（`CONFIRM_REQUIRED` / `INVALID_PARAM` / `INVALID_RESUME` / `MIGRATE_ABORTED` / `VERIFY_FAILED` / `RUN_FAILED`）与 `errMsg`、`hint`

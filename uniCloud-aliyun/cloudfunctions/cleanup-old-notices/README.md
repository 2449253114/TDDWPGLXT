# cleanup-old-notices

清理 `system-app-notice` 表中 `create_date` 早于 **2026-09-01 23:59:59 (UTC+8)** 的记录（硬删除，不备份）。

## 安全模型

- 默认 **dry-run**：只统计数量 + 取前 3 条样例，不删任何数据。
- 真删必须显式传 `{ dryRun: false, confirm: "YES_DELETE" }`，否则拒绝执行。
- 真删采用分批循环（每次最多 500 条），并对删除条件同时约束 `_id in ids` 与 `create_date <= cutoff` 防止边界异常扩大删除范围。
- 设上限 2000 个循环（≈100 万条）+ 连续 3 批 `deleted=0` 自动中止，避免极端条件下死循环或失控。

## 部署与触发

uniCloud 云函数必须在 HBuilderX 中右键 → 上传并部署后才能运行。
本目录已包含：
- `index.obj.js` 云对象主体
- `package.json` 扩展与运行时配置
- `cleanup-old-notices.param.js` 本地运行参数（HBuilderX 双击云函数 → 运行 → 云对象 → `run`）

## 两步走流程

1. **dry-run**（推荐永远先做这一步）
   - 保持 `cleanup-old-notices.param.js` 默认内容（含 `run({ dryRun: true })`）。
   - 在 HBuilderX 中右键 `cleanup-old-notices/index.obj.js` → 运行 → 运行到云函数。
   - 在控制台/输出面板查看：
     - `willDelete`：会被删除的记录数
     - `sample`：前 3 条最早记录的样例
     - `cutoff.local`：`2026-09-01 23:59:59 (UTC+8)`

2. **真删**
   - 确认 `willDelete` 数量与你的预期一致。
   - 编辑 `cleanup-old-notices.param.js`：
     - 把最上面那行 `run({ dryRun: true })` 注释掉；
     - 解开末尾 `run({ dryRun: false, confirm: "YES_DELETE" })` 的注释。
   - 在 HBuilderX 中再次运行。在输出面板确认 `deletedTotal` 等于 dry-run 的 `willDelete`。

## 注意事项

- **时区**：截止时间解析为北京时间。如实际库内 `create_date` 写入时使用 UTC，请把 `CUTOFF_TIMESTAMP` 改为 `new Date('2026-09-01T23:59:59Z').getTime()`。
- **不可逆**：硬删除不备份，请先在云开发控制台用云数据库「导出」功能自行备份一次再跑。
- **限频**：单次云函数超时 300s（见 `package.json`）；若 `willDelete > 5w` 建议分多次调用，或在循环里加 `await sleep(50)`。

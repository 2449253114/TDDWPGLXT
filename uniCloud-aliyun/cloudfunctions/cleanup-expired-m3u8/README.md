# cleanup-expired-m3u8

定时清理已失效的 m3u8 文件：先删云存储文件，再删 `yike-invalid-m3u8-files` 表里的 DB 记录。

与后台管理页 `/pages/cloud-storage/m3u8file/list` 的 `deleteExpiredM3u8FilesConcurrent` 行为一致；主表 `yike-album-files-m3u8file` **不在**本任务清理范围（可从管理后台手动处理）。

## 定时触发

`package.json` 已配置 cron 触发器（7-field 格式，与项目现有 `auto-update-m3u8-file-url` 同款）：

```
0 0,8,16,24,32,40,48,56 * * * * *
```

即**每 8 分钟**整点偏移触发一次 `_timing()`，自动执行：

- 删 `yike-invalid-m3u8-files` 里 `create_date < now - 10h` 的记录对应的云存储文件
- 删这些 DB 记录本身
- 单次最多处理 100 个 URL（`maxDeletePerRun=100`），跑不完的留到下个周期继续（自然背压）

**注意：上传部署到云端后 cron 立即生效。** 如果不想让它自动跑，先清空 `package.json` 里的 `triggers` 字段再上传。

## "已失效" 的定义

`create_date` 早于 `(now - 10 小时)`。与管理后台 `deleteExpiredM3u8FilesConcurrent` 的判定窗口一致，给转码失败但可正常播放的情况留 10 小时安全缓冲。

## 手动使用（两步走）

### 第 1 步：dry-run 统计（不删任何数据）

HBuilderX 右键 `index.obj.js` → 运行云对象。默认参数（见 `cleanup-expired-m3u8.param.js`）：

```js
run({ dryRun: true })
```

输出 `willDelete`（待删总数）、`limitedTo`（本批会处理的数量）、`sample`（前 3 条样例）。

### 第 2 步：手动真删（不想等下个 cron 周期时用）

解开 `cleanup-expired-m3u8.param.js` 底部注释：

```js
run({
	dryRun: false,
	confirm: "YES_DELETE",
	maxDeletePerRun: 100,
	trigger: "manual"
})
```

## 行为细节

| 细节 | 说明 |
|---|---|
| 云存储删除分批 | `uniCloud.deleteFile` 单次 `fileList` 上限 50，自动按 50 一批分批调 |
| 云存储失败不阻断 | 某批云存储删除失败只计数 + 记 `cloudFailures`，DB 记录照样删（避免脏数据堆积，与 admin 页一致） |
| URL 为空的记录 | `invalid_m3u8_file_url` 为 null/空串的记录跳过云存储删除，但 DB 记录会删 |
| 双约束 DB 删除 | `_id in ids AND create_date < cutoff` 双条件，防止边界异常扩大删除范围 |
| `confirm` 口令 | 真删必须 `confirm: "YES_DELETE"`；`_timing()` 内部已硬编码 |

## 输出字段速查

```js
{
  mode: 'delete' | 'dryRun',
  trigger: 'timer' | 'manual',
  queried: N,          // 本批实际处理的记录数
  cloudDeleteOk: N,    // 云存储删除成功数
  cloudDeleteFail: N,  // 云存储删除失败数
  dbDeleted: N,        // DB 记录删除数
  cloudFailures: [...] // 仅在有失败时出现
}
```

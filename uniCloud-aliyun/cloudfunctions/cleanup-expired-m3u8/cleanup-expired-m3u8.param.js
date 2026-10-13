// 本文件中的内容将在云对象【运行】时解析为运行参数
// 配置教程参考：https://uniapp.dcloud.net.cn/uniCloud/rundebug.html#run-obj-param
//
// 注意：本云对象已配置了定时触发器（每 8 分钟自动跑一次 _timing()），
// 上传并部署后会立刻生效。手动本地运行时建议只跑 dry-run 来核对逻辑。
//
// 第 1 步（推荐）：先跑 dry-run 看看会清理哪些
// run({
// 	dryRun: true
// })

/*
// 第 2 步：手动触发一次真删（仅当你不想等下一个定时周期时使用）
//          - maxDeletePerRun: 单次最多删 100 个 URL（与定时任务默认值一致）
run({
	dryRun: false,
	confirm: "YES_DELETE",
	maxDeletePerRun: 100,
	trigger: "manual"
})
*/
run({
	dryRun: false,
	confirm: "YES_DELETE",
	maxDeletePerRun: 100,
	trigger: "manual"
})
// 本文件中的内容将在云对象【运行】时解析为运行参数
// 配置教程参考：https://uniapp.dcloud.net.cn/uniCloud/rundebug.html#run-obj-param
//
// 所有调用都可以加 intervalMs（批次间等待毫秒数，默认 300）防止触发阿里云数据库限流，例如 intervalMs: 600。
//
// 第 1 步（推荐）：先跑 dry-run，只读统计旧数组和新表，并对用户表计数，不写入任何数据
// run({
// 	dryRun: true
// })

/*
// 第 2 步：确认 dry-run 输出符合预期后，把上面的 run 注释掉，解开下面这段再运行一次，执行迁移。
// 已在新表中的码会被跳过，可以重复运行。
run({
	dryRun: false,
	confirm: "YES_MIGRATE"
})
*/

// run({
// 	dryRun: false,
// 	confirm: "YES_MIGRATE"
// })


/*
// 第 3 步（仅当上一步返回 done: false 时）：把上一步返回的 resume 原样填进来续跑。
// 不填 resume 直接重跑也正确，只是会重新检查已迁移的部分。
run({
	dryRun: false,
	confirm: "YES_MIGRATE",
	resume: { legacyOffset: 0 }
})
*/

run({
	dryRun: false,
	confirm: "YES_MIGRATE",
	resume: { legacyOffset: 78000 }
})

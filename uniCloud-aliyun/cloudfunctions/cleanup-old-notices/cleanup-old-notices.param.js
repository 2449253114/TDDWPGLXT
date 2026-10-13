// 本文件中的内容将在云对象【运行】时解析为运行参数
// 配置教程参考：https://uniapp.dcloud.net.cn/uniCloud/rundebug.html#run-obj-param
//
// 第 1 步（推荐）：先跑 dry-run 统计会删多少条 + 看样例 —— 不会删任何数据
// run({
// 	dryRun: true
// })

/*
// 第 2 步：确认 dry-run 输出的 willDelete 数量符合预期后，把上面整段注释掉，
// 解开下面这段注释，在 HBuilderX 里再点一次运行即可真删。
//
// 警告：run({ dryRun: false, confirm: "YES_DELETE" }) 会真的删除数据库记录，
//       删除前请确认 willDelete 与你的预期一致！
run({
	dryRun: false,
	confirm: "YES_DELETE"
})
*/
run({
	dryRun: false,
	confirm: "YES_DELETE"
})
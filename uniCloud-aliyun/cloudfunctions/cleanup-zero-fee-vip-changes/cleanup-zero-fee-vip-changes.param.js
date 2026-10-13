// 本文件中的内容将在云对象【运行】时解析为运行参数
// 配置教程参考：https://uniapp.dcloud.net.cn/uniCloud/rundebug.html#run-obj-param
//
// 第 1 步（推荐）：先跑 dry-run 统计会删多少条 + 看样例 —— 不会删任何数据。
// 注意：mongo 把 {total_fee:0} 同时匹配值=0 / null / 字段缺失 三种文档，
//       请用 sample 数组肉眼确认要删的都是哪种再决定下一步。
// run({
// 	dryRun: true
// })

/*
// 第 2 步：确认 dry-run 输出的 sample 都是要删的之后，把上面整段注释掉，
// 解开下面这段注释，在 HBuilderX 里再点一次运行即可真删。
//
// 警告：run({ dryRun: false, confirm: "YES_DELETE" }) 会真的删除数据库记录，
//       删除前请确认 sample 与你的预期一致！
run({
	dryRun: false,
	confirm: "YES_DELETE"
})
*/
run({
	dryRun: false,
	confirm: "YES_DELETE"
})
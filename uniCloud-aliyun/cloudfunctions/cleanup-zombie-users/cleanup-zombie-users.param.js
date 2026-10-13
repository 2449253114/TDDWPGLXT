// 本文件中的内容将在云对象【运行】时解析为运行参数
// 配置教程参考：https://uniapp.dcloud.net.cn/uniCloud/rundebug.html#run-obj-param
//
// 第 1 步（推荐）：先跑 dry-run 统计会删多少个账号 + 看 sample 样例 —— 不会删任何数据。
// sample 里 loginMinusRegisterMs 为 null 表示"从未登录过"。
// intervalMs 是相邻两次 DB 请求的间隔（防阿里云限流），默认 100ms ≈ 10 QPS；
// 数据量小（几千以内）可以传 0 跑得快，数据量大建议保持默认。
// run({
// 	dryRun: true,
// 	intervalMs: 100
// })

/*
// 第 2 步：确认 dry-run 输出的 sample 都是要删的账号之后，把上面整段注释掉，
// 解开下面这段注释，在 HBuilderX 里再点一次运行即可真删。
//
// 警告：run({ dryRun: false, confirm: "YES_DELETE" }) 会真的删除用户账号，不可恢复！
//       excludeActiveVip 默认 true（持有"未过期"VIP 的用户不删；仅 vip=true 但已过期
//       的不算资产——注册即送1天VIP，不上线的用户该字段永远停在 true，属已知设计缺陷）。
run({
	dryRun: false,
	confirm: "YES_DELETE",
	excludeActiveVip: true,
	intervalMs: 100
})
*/
run({
	dryRun: false,
	confirm: "YES_DELETE",
	excludeActiveVip: true,
	intervalMs: 600
})
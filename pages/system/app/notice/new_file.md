帮我写一个删除所有已读通知，字段is_read为是否已读
```javascript
const db = uniCloud.database()
const dbCmd = db.command;

const appNoticeCollectionName = 'system-app-notice';
const appNoticeCollection = db.collection(appNoticeCollectionName)
```

然后这是文档
```txt
删除文档
方式1 通过指定文档ID删除

collection.doc(_id).remove()

// 清理全部数据
let res = await collection.get()
res.data.map(async(document) => {
  return await collection.doc(document.id).remove();
});
复制代码
方式2 条件查找文档然后直接批量删除

collection.where().remove()

// 删除字段a的值大于2的文档
const dbCmd = db.command
let res = await collection.where({
  a: dbCmd.gt(2)
}).remove()

// 清理全部数据
const dbCmd = db.command
let res = await collection.where({
  _id: dbCmd.exists(true)
}).remove()
复制代码
响应参数

字段	类型	必填	说明
deleted	Number	否	删除的记录数量
示例：判断删除成功或失败，打印删除的记录数量

const db = uniCloud.database();
db.collection("table1").doc("5f79fdb337d16d0001899566").remove()
	.then((res) => {
		console.log("删除成功，删除条数为: ",res.deleted);
	})
	.catch((err) => {
		console.log( err.message )
	})
	.finally(() => {

	})
```
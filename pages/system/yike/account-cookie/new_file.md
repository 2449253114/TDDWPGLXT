这是已有的代码
```
const db = uniCloud.database()
const dbCmd = db.command;

const accountCookieCollectionName = 'yike-account-cookie';
const accountCookieCollection = db.collection(accountCookieCollectionName)
```

然后这是文档说明：
```txt
批量更新文档
collection.update()

const dbCmd = db.command
let res = await collection.where({name: dbCmd.eq('hey')}).update({
  age: 18,
})
```
我现在需要你帮我实现批量更新status字段为0，但我的数据中目前有status字段，所以需要通过批量更新来填充，然后条件就是 _id 字段，你可以直接 _id: dbCmd.exists(true) 这样，然后代码要写上注释。
{
	"bsonType": "object",
	"required": [],
	"permission": {
		"read": true,
		"create": true,
		"update": true,
		"delete": true
	},
	"properties": {
		"_id": {
			"description": "ID，系统自动生成"
		},
		"vip_days_on_signup": {
			"bsonType": "int",
			"title": "注册会员赠送VIP天数",
			"description": "新用户注册后自动获得的VIP体验天数",
			"defaultValue": 7
		},
		"daily_login_reward": {
			"bsonType": "int",
			"title": "每日登录奖励",
			"description": "用户每日登录App可获得的金币奖励",
			"defaultValue": 1
		},
		"weekly_login_vip_reward": {
		    "bsonType": "object",
		    "title": "周登陆VIP奖励",
		    "description": "用户在指定的周几登录App时，可以获得额外的VIP体验天数。",
		    "properties": {
		        "login_day": {
		            "bsonType": "int",
		            "title": "登录日",
		            "description": "用户需要登录的星期几，以数字表示，1代表周一，2代表周二，依此类推至7代表周日。",
		            "defaultValue": 1,
		            "enum": [
		                {"value": 1, "text": "周一"},
		                {"value": 2, "text": "周二"},
		                {"value": 3, "text": "周三"},
		                {"value": 4, "text": "周四"},
		                {"value": 5, "text": "周五"},
		                {"value": 6, "text": "周六"},
		                {"value": 7, "text": "周日"}
		            ]
		        },
		        "reward_vip_days": {
		            "bsonType": "int",
		            "title": "奖励VIP天数",
		            "description": "用户在指定日登录后获得的额外VIP体验天数。",
		            "defaultValue": 1
		        },
		        "enabled": {
		            "bsonType": "bool",
		            "title": "是否启用",
		            "description": "是否启用此奖励配置。",
		            "defaultValue": true
		        }
		    }
		},
		"invite_reward": {
			"bsonType": "object",
			"title": "邀请奖励",
			"description": "设置用户邀请新用户加入平台时获得的奖励。管理员可以指定奖励的类型（如金币或VIP天数）和数量，激励现有用户邀请更多新用户，从而增加平台的用户基数和活跃度。",
			"properties": {
				"reward_type": {
					"bsonType": "int",
					"title": "奖励类型",
					"description": "用户邀请奖励的类型，如：积分、金币、VIP天数等",
					"defaultValue": 1,
					"enum": [{
							"value": 0,
							"text": "金币"
						},
						{
							"value": 1,
							"text": "VIP天数"
						}
					]
				},
				"reward_amount": {
					"bsonType": "int",
					"title": "奖励数量",
					"description": "用户邀请每位新用户所获得的奖励数量",
					"defaultValue": 3
				}
			}
		},
		"share_reward": {
		    "bsonType": "object",
		    "title": "分享奖励",
		    "description": "用户分享App后获得的奖励。",
		    "properties": {
		        "enabled": {
		            "bsonType": "boolean",
		            "title": "奖励开启",
		            "description": "是否开启分享App的奖励功能",
		            "defaultValue": true
		        },
				"reward_type": {
					"bsonType": "int",
					"title": "奖励类型",
					"description": "分享奖励的类型，如金币、VIP天数等",
					"defaultValue": 1,
					"enum": [
						{"value": 0, "text": "金币"},
						{"value": 1, "text": "VIP天数"}
					]
				},
		        "reward_amount": {
		            "bsonType": "int",
		            "title": "奖励数量",
		            "description": "用户分享App后获得的奖励数量",
		            "defaultValue": 1
		        }
		    }
		},
		"new_user_guide_display": {
			"bsonType": "boolean",
			"title": "新用户引导页显示",
			"description": "是否向新用户展示引导页",
			"defaultValue": true
		},
		"customer_service_contact": {
			"bsonType": "string",
			"title": "客服联系方式",
			"description": "App内客服的联系方式",
			"defaultValue": "contact@example.com"
		},
		"maintenance_mode_enabled": {
			"bsonType": "boolean",
			"title": "维护模式开启",
			"description": "App是否处于维护模式",
			"defaultValue": false
		}
		
	}
}
这个是uniCloud云数据库schema表，帮我基于上面的APP配置schema数据库表，写一个APP配置的页面，
使用unicloud-db组件和uni-ui组件，来把这个页面和功能写出来，当APP配置数据库中没有记录时，页面表单渲染渲染默认值，则保存按钮事件为新增，当有记录时，页面表单渲染记录值，保存按钮事件为更新。
，然后下面是unicloud-db组件介绍：
<unicloud-db> 组件是一个数据库查询组件，它是对clientDB的js库的再封装。
前端通过组件方式直接获取uniCloud的云端数据库中的数据，并绑定在界面上进行渲染。
在传统开发中，开发者需要在前端定义data、通过request联网获取接口数据、然后赋值给data。同时后端还需要写接口来查库和反馈数据。
有了<unicloud-db> 组件，上述工作只需要1行代码！写组件，设组件的属性，在属性中指定要查什么表、哪些字段、以及查询条件，就OK了！
HBuilderX中敲下udb代码块，得到如下代码，然后通过collection属性指定要查询表“table1”，通过field属性指定要查询字段“field1”，并且在where属性中指定查询id为1的数据。查询结果data就可以直接渲染在界面上。
<unicloud-db v-slot:default="{data, loading, error, options}" collection="table1" field="field1" :getone="true" where="id=='1'">
  <view>
    {{ data}}
  </view>
</unicloud-db>
<unicloud-db> 组件尤其适用于列表、详情等展示类页面。开发效率可以大幅度的提升。
<unicloud-db> 组件的查询语法是jql，这是一种比sql语句和nosql语法更简洁、更符合js开发者习惯的查询语法。没学过sql或nosql的前端，也可以轻松掌握。jql详见
<unicloud-db> 组件不仅支持查询。还自带了add、remove、update方法，见下文方法章节
属性
属性	类型	描述
v-slot:default		查询状态（失败、联网中）及结果（data）
ref	string	vue组件引用标记
spaceInfo	Object	服务空间信息，新增于HBuilderX 3.2.11。同uniCloud.init参数，参考：uniCloud.init
collection	string	表名。支持输入多个表名，用 , 分割，自HBuilderX 3.2.6起也支持传入tempCollection组成的数组
field	string	指定要查询的字段，多个字段用 , 分割。不写本属性，即表示查询所有字段。支持用 oldname as newname方式对返回字段重命名
where	string	查询条件，对记录进行过滤。见下
orderby	string	排序字段及正序倒序设置
foreign-key	String	手动指定使用的关联关系，HBuilderX 3.1.10+ 详情
page-data	String	分页策略选择。值为 add 代表下一页的数据追加到之前的数据中，常用于滚动到底加载下一页；值为 replace 时则替换当前data数据，常用于PC式交互，列表底部有页码分页按钮，默认值为add
page-current	Number	当前页
page-size	Number	每页数据数量
getcount	Boolean	是否查询总数据条数，默认 false，需要分页模式时指定为 true
getone	Boolean	指定查询结果是否仅返回数组第一条数据，默认 false。在false情况下返回的是数组，即便只有一条结果，也需要[0]的方式获取。在值为 true 时，直接返回结果数据，少一层数组，一般用于非列表页，比如详情页
action	string	云端执行数据库查询的前或后，触发某个action函数操作，进行预处理或后处理，详情。场景：前端无权操作的数据，比如阅读数+1
manual	Boolean	已过时，使用 loadtime 替代 是否手动加载数据，默认为 false，页面onready时自动联网加载数据。如果设为 true，则需要自行指定时机通过方法this.$refs.udb.loadData()来触发联网，其中的udb指组件的ref值。一般onLoad因时机太早取不到this.$refs.udb，在onReady里可以取到
gettree	Boolean	是否查询树状结构数据，HBuilderX 3.0.5+ 详情
startwith	String	gettree的第一层级条件，此初始条件可以省略，不传startWith时默认从最顶级开始查询，HBuilderX 3.0.5+
limitlevel	Number	gettree查询返回的树的最大层级。超过设定层级的节点不会返回。默认10级，最大15，最小1，HBuilderX 3.0.5+
groupby	String	对数据进行分组，HBuilderX 3.1.0+
group-field	String	对数据进行分组统计
distinct	Boolean	是否对数据查询结果中重复的记录进行去重，默认值false，HBuilderX 3.1.0+
loadtime	String	加载数据时机，默认auto，可选值 auto|onready|manual,详情 HBuilderX3.1.10+
ssr-key	String	详情 HBuilderX 3.4.11+
@load	EventHandle	成功回调。联网返回结果后，若希望先修改下数据再渲染界面，则在本方法里对data进行修改
@error	EventHandle	失败回调
示例
比如云数据库有个user的表，里面有字段id、name，查询id=1的数据，那么写法如下：
注意下面示例使用了getone会返回一条对象形式的data，如不使用getone，data将会是数组形式，即多一层
<template>
  <view>
    <unicloud-db v-slot:default="{data, loading, error, options}" collection="user" field="name" :getone="true" where="id=='1'">
      <view>
          {{ data.name}}
      </view>
    </unicloud-db>
  </view>
</template>
v-slot:default
<unicloud-db v-slot:default="{data, pagination, loading, hasMore, error, options}"></unicloud-db>
复制代码
属性	类型	描述
data	Array|Object	查询结果，默认值为Array, 当 getone 指定为 true 时，值为数组中第一条数据，类型为 Object，减少了一层
pagination	Object	分页属性
loading	Boolean	查询中的状态。可根据此状态，在template中通过v-if显示等待内容，如<view v-if="loading">加载中...</view>
hasMore	Boolean	是否有更多数据。可根据此状态，在template中通过v-if显示没有更多数据了，如<uni-load-more v-if="!hasMore" status="noMore"></uni-load-more>, <uni-load-more>详情 https://ext.dcloud.net.cn/plugin?id=29
error	Object	查询错误。可根据此状态，在template中通过v-if显示等待内容，如<view v-if="error">加载错误</view>
options	Object	在小程序中，插槽不能访问外面的数据，需通过此参数传递, 不支持传递函数
提示：如果不指定分页模式， data 为多次查询的集合
状态示例：
<unicloud-db v-slot:default="{data, loading, error, options}" collection="user">
	<view v-if="error">{{error.message}}</view>
	<view v-else-if="loading">正在加载...</view>
	<view v-else>
		{{data}}
	</view>
</unicloud-db>
事件
load事件
load事件在查询执行后、渲染前触发，一般用于查询数据的二次加工。比如查库结果不能直接渲染时，可以在load事件里先对data进行预处理。
...
<unicloud-db @load="handleLoad" />
...
handleLoad(data, ended, pagination) {
  // `data` 当前查询结果
  // `ended` 是否有更多数据
  // `pagination` 分页信息 HBuilderX 3.1.5+ 支持
}
复制代码
数据库里的时间一般是时间戳，不能直接渲染。虽然可以在load事件中对时间格式化，但更简单的方式是使用<uni-dateformat>组件，无需写js处理。
error事件
error事件在查询报错时触发，比如联网失败。
...
<unicloud-db @error="handleError" />
...
handleError(e) {
  // {message}
}
方法
loadData
当 <unicloud-db> 组件的 manual 属性设为 true 时，不会在页面初始化时联网查询数据，此时需要通过本方法在需要的时候手动加载数据。

this.$refs.udb.loadData() //udb为unicloud-db组件的ref属性值
复制代码
一般onLoad因时机太早取不到this.$refs.udb，在onReady里可以取到。

举例常见场景，页面pagea在url中获取参数id，然后加载数据

请求地址：/pages/pagea?id=123

pagea.vue源码：

<template>
	<view>
		<unicloud-db ref="udb" collection="table1" :where="where" v-slot:default="{data,pagination,loading,error,options}" :options="options" manual>
			{{data}}
		</unicloud-db>
	</view>
</template>
<script>
export default {
	data() {
		return {
			_id:'',
			where: ''
		}
	},
	onLoad(e) {
		const id = e.id
		if (id) {
			this._id = id
			this.where = "_id == '" + this._id + "'"
		}
		else {
			uni.showModal({
				content:"页面参数错误",
				showCancel:false
			})
		}
	},
	onReady() {
		if (this._id) {
			this.$refs.udb.loadData()
		}
	}
}
</script>
复制代码
下拉刷新示例

this.$refs.udb.loadData({clear: true}, callback)，

可选参数 clear: true，是否清空数据和分页信息，true表示清空，默认false

callback 是回调函数，加载数据完成后触发（即使加载失败）

<script>
	export default {
		data() {
			return {
			}
		},
		// 页面生命周期，下拉刷新后触发
		onPullDownRefresh() {
			this.$refs.udb.loadData({
				clear: true
			}, () => {
				// 停止下拉刷新
				uni.stopPullDownRefresh()
			})
		}
	}
</script>
复制代码
loadMore
在列表的加载下一页场景下，使用ref方式访问组件方法，加载更多数据，每加载成功一次，当前页 +1

this.$refs.udb.loadMore() //udb为unicloud-db组件的ref属性值
复制代码
clear
清空已加载的数据，但不会重置当前分页信息

this.$refs.udb.clear() //udb为unicloud-db组件的ref属性值
复制代码
reset
重置当前分页信息，但不会清空已加载的数据

this.$refs.udb.reset() //udb为unicloud-db组件的ref属性值
复制代码
refresh
清空并重新加载当前页面数据

this.$refs.udb.refresh() //udb为unicloud-db组件的ref属性值
复制代码
remove
语法

this.$refs.udb.remove(id, options)

udb为unicloud-db组件的ref属性值

必选参数 id

属性	类型	默认值	描述
id	string|Array		传入数据库的_id
可选参数 options

属性	类型	默认值	描述
action	string		云端执行数据库查询的前或后，触发某个action函数操作，进行预处理或后处理，详情。场景：前端无权操作的数据，比如阅读数+1
confirmTitle	string	提示	删除确认框标题
confirmContent	string	是否删除该数据	删除确认框提示
needConfirm	boolean	true	控制是否有弹出框，HBuilderX 3.1.5+
needLoading	boolean	true	是否显示Loading，HBuilderX 3.1.5+
loadingTitle	string	''	显示loading的标题，HBuilderX 3.1.5+
success	function		删除成功后的回调
fail	function		删除失败后的回调
complete	function		完成后的回调
在列表页面，如果想删除一个item，原本要做很多事：

弹出删除确认框
弹出loading
调用clientDB的js api删除云端数据
接收云端删除结果，如果成功则关闭loading
进一步删除列表的data中对应的item，自动刷新页面
为减少重复开发，unicloud-db组件提供了remove方法，在列表渲染时绑定好index，直接调用remove方法即可一行代码完成上述5步。

首先在列表生成的时候给删除按钮绑定好id：

<unicloud-db ref="udb" :collection="collectionName" v-slot:default="{data,pagination,loading,error}">
	<uni-table :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe >
		<uni-tr>
			<uni-th>用户名</uni-th>
			<uni-th>操作</uni-th>
		</uni-tr>
		<uni-tr v-for="(item,index) in data" :key="index">
			<uni-th>{{item.username}}</uni-th>
			<uni-td>
				<view>
					<button @click="confirmDelete(item._id)" type="warn">删除</button>
				</view>
			</uni-td>
		</uni-tr>
	</uni-table>
</unicloud-db>
复制代码
然后confirmDelete方法里面只有一行代码：

confirmDelete(id) {
	this.$refs.udb.remove(id)
}
复制代码
clientDB组件的remove方法的参数只支持传入数据库的_id进行删除，不支持其他where条件删除。

参数传入的_id支持单个，也支持多个，即可以批量删除。多个id的格式是：

this.$refs.udb.remove(["5f921826cf447a000151b16d", "5f9dee1ff10d2400016f01a4"])
复制代码
在uniCloud的web控制台的DB Schema界面，可自助生成数据表的admin管理插件，其中有多行数据批选批删示例。

完整实例，第二个是可选参数。

var ids = ["5f921826cf447a000151b16d", "5f9dee1ff10d2400016f01a4"]
this.$refs.udb.remove(ids, {
  action: '', // 删除前后的动作
  confirmTitle: '提示', // 确认框标题
  confirmContent: '是否删除该数据',  // 确认框内容
  success: (res) => { // 删除成功后的回调
    const { code, message } = res
  },
  fail: (err) => { // 删除失败后的回调
    const { message } = err
  },
  complete: () => { // 完成后的回调
  }
})
复制代码
add
语法

this.$refs.udb.add(value, options)

udb为unicloud-db组件的ref属性值

必选参数 value

属性	类型	默认值	描述
value	Object		新增数据
可选参数 options

属性	类型	默认值	描述
action	string		云端执行数据库查询的前或后，触发某个action函数操作，进行预处理或后处理，详情。HBuilder 3.1.0+
showToast	boolean	true	是否显示更新成功后的提示框
toastTitle	string	新增成功	新增成功后的toast提示
needLoading	boolean	true	是否显示Loading，HBuilderX 3.1.5+
loadingTitle	string	''	显示loading的标题，HBuilderX 3.1.5+
success	function		新增成功后的回调
fail	function		新增失败后的回调
complete	function		完成后的回调
<unicloud-db ref="udb" :collection="collectionName" v-slot:default="{data,pagination,loading,error}">
</unicloud-db>
复制代码
this.$refs.udb.add(value)
复制代码
完整实例

this.$refs.udb.add(value, {
  toastTitle: '新增成功', // toast提示语
  success: (res) => { // 新增成功后的回调
    const { code, message } = res
  },
  fail: (err) => { // 新增失败后的回调
    const { message } = err
  },
  complete: () => { // 完成后的回调
  }
})
复制代码
update
语法

this.$refs.udb.update(id, value, options)

udb为unicloud-db组件的ref属性值

必选参数 id

属性	类型	默认值	描述
id	string		数据的唯一标识
必选参数 value

属性	类型	默认值	描述
value	Object		需要修改的新数据
可选参数 options

属性	类型	默认值	描述
action	string		云端执行数据库查询的前或后，触发某个action函数操作，进行预处理或后处理，详情。HBuilder 3.1.0+
showToast	boolean	true	是否显示更新成功后的提示框
toastTitle	string	修改成功	修改成功后的toast提示
needConfirm	boolean	true	控制是否有更新确认弹出框，HBuilderX 3.1.5+
confirmTitle	string	true	更新确认弹出框标题，HBuilderX 3.1.5+
confirmContent	string	true	更新确认弹出框内容，HBuilderX 3.1.5+
needLoading	boolean	true	是否显示Loading，HBuilderX 3.1.5+
loadingTitle	string	''	显示loading的标题，HBuilderX 3.1.5+
success	function		更新成功后的回调
fail	function		更新失败后的回调
complete	function		完成后的回调
使用unicloud-db组件的update方法，除了更新云数据库中的数据外，也会同时更新当前页面的unicloud-db组件中的data数据，自然也会自动差量更新页面渲染的内容。同时update方法还封装了修改成功的toast提示。

<unicloud-db ref="udb" :collection="collectionName" v-slot:default="{data,pagination,loading,error}" :getone="true">
</unicloud-db>
复制代码
第一个参数 id 是数据的唯一标识，第二个参数 value 是需要修改的新数据

this.$refs.udb.update(id, value)
复制代码
完整实例，第三个是可选参数

this.$refs.udb.update(id, value, {
  toastTitle: '修改成功', // toast提示语
  success: (res) => { // 更新成功后的回调
    const { code, message } = res
  },
  fail: (err) => { // 更新失败后的回调
    const { message } = err
  },
  complete: () => { // 完成后的回调
  }
})
复制代码
注意：

如果列表分页采取分页组件，即page-data值为replace，每页有固定数量，那么clientDB组件的remove方法删除数据后，会重新请求当前页面数据。
如果列表采取滚动加载方式，即page-data值为add，滚动加载下一页数据，那么clientDB组件的remove方法删除数据后，不会重新请求数据，而是从已有数据移除已删除项。(组件版本1.1.0+支持)
dataList
在js中，获取<unicloud-db> 组件的data的方法如下：

console.log(this.$refs.udb.dataList);
复制代码
如果修改了dataList的值，组件渲染的界面也会同步变化。
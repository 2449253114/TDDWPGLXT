现在有个需求，需要设计一个电视剧剧集的数据库表，采用uniCloud DB Schema，是基于 JSON 格式定义的数据结构的规范。
有以下这些字段：
1. album_id（关联的相册，文件在相册中获取
2. 电视剧剧名
3. 电视剧剧集信息（包含字段如下）
	3.1 当前集数
	3.2 当前集名
	3.3 当前集的视频文件fsid
	3.4 当前集的封面文件fsid
字段名你帮我起名，其他的字段还没想到，你可以建议一些。
然后帮我把这个数据库表设计出来





中文啊，并且你字段信息配置的不全
属性列表
properties里的字段列表，每个字段都有很多可以设置的属性，如下：

属性分类	属性	类型	描述
基本	bsonType	any	字段类型，如json object、字符串、数字、bool值、日期、时间戳，具体见下表bsonType可用类型
基本	arrayType	String	数组项类型，bsonType="array" 时有效，HBuilderX 3.1.0+ 支持，具体见下表arrayType可用类型
基本	title	string	标题，开发者维护时自用。在schema2code生成前端表单代码时，默认用于表单项前面的label
基本	description	string	描述，开发者维护时自用。在生成前端表单代码时，如果字段未设置componentForEdit，且字段被渲染为input，那么input的placehold将默认为本描述
基本	defaultValue	string|Object	默认值
基本	forceDefaultValue	string|Object	强制默认值，不可通过clientDB的代码修改，常用于存放用户id、时间、客户端ip等固定值。具体参考下表的defaultValue
值域校验	required	array	是否必填。支持填写必填的下级字段名称。required可以在表级的描述出现，约定该表有哪些字段必填。也可以在某个字段中出现，如果该字段是一个json对象，可以对这个json中的哪些字段必填进行描述。详见下方示例
值域校验	enum	Array	字段值枚举范围，数组中至少要有一个元素，且数组内的每一个元素都是唯一的。
值域校验	enumType	String	字段值枚举类型，可选值tree。设为tree时，代表enum里的数据为树形结构。此时schema2code可生成多级级联选择组件
值域校验	fileMediaType	String	文件类型，bsonType="file" 时有效，可选值 all|image|video 默认值为all,表示所有文件，image表示图片类型文件，video表示视频类型文件 HBuilderX 3.1.0+
值域校验	fileExtName	String	文件扩展名过滤，bsonType="file" 时有效，多个文件扩展名用 "," 分割，例如: jpg,png，HBuilderX 3.1.0+ 支持
值域校验	maximum	number	如果bsonType为数字时，可接受的最大值
值域校验	exclusiveMaximum	boolean	是否排除 maximum
值域校验	minimum	number	如果bsonType为数字时，可接受的最小值
值域校验	exclusiveMinimum	boolean	是否排除 minimum
值域校验	minLength	number	限制字符串或数组的最小长度
值域校验	maxLength	number	限制字符串或数组的最大长度
值域校验	trim	String	去除空白字符，支持 none|both|start|end，默认none，仅bsonType="string"时有效
值域校验	format	'url'|'email'	数据格式，不符合格式的数据无法入库。目前只支持'url'和'email'，未来会扩展其他格式
值域校验	pattern	String	正则表达式，如设置为手机号的正则表达式后，不符合该正则表达式则校验失败，无法入库
值域校验	validateFunction	string	扩展校验函数名
权限校验	permission	Object	数据库权限，控制什么角色可以对什么数据进行读/写，可控制表和字段，可设置where条件。见下文详述
错误返回	errorMessage	string|Object	当数据写入或更新时，校验数据合法性失败后，返回的错误提示
关联关系	foreignKey	String	关联字段。表示该字段的原始定义指向另一个表的某个字段，值的格式为表名.字段名，比如订单表的下单用户uid字段指向uni-id-users表的_id字段，那么值为uni-id-users._id。关联字段定义后可用于联表查询，通过关联字段合成虚拟联表，极大的简化了联表查询的复杂度
关联关系	parentKey	String	同一个数据表内父级的字段。详情参考：树状数据查询
schema2code	label	string	字段标题。schema2code生成前端代码时，渲染表单项前面的label标题。如果不填，会使用title属性。适用于title不便显示在表单项前面的情况
schema2code	group	string	分组id。schema2code生成前端代码时，多个字段对应的表单项可以合并显示在一个uni-group组件中
schema2code	order	int	表单项排序序号。schema2code生成前端代码时，默认是以schema中的字段顺序从上到下排布表单项的，但如果指定了order，则按order规定的顺序进行排序。如果表单项被包含在uni-group中，则同组内按order排序
schema2code	component	Object|Array	schema2code生成前端代码时，使用什么组件渲染这个表单项。已废弃。请使用下面的componentForEdit和componentForShow
schema2code	componentForEdit	Object|Array	HBuilderX 3.1.0+, 生成前端编辑页面文件时(add.vue、edit.vue)，使用什么组件渲染这个表单项。比如使用input输入框。
schema2code	componentForShow	Object|Array	HBuilderX 3.1.0+, 生成前端展示页面时(list.vue、detail.vue)，使用什么组件渲染。比如使用uni-dateformat格式化日期。
示例

如果你阅读过数据库入门文档，那么你的服务空间此时应该有表resume，且里面有一条数据。

我们仍以 resume 表为例，除了_id外，该表有6个业务字段：name, birth_year, tel, email, address, intro。

业务规则如下：

name字段是字符串，长度大于等于2小于等于17，必填，需要去除头尾空白字符
birth_year字段是大于等于1950小于2020的数字，必填
tel字段是字符串，但格式是手机号，必填
email字符是字符串，但格式是email，必填
address字段类型为json object，它下面又有2个子字段，city和street，其中"city"字段必填
intro字段类型为string，非必填，需要去除头尾空白字符
则resume.schema.json按如下编写。

{
	"bsonType": "object",
	"required": ["name", "birth_year", "tel", "email"],
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
		"name": {
			"bsonType": "string",
			"title": "姓名",
			"trim": "both",
			"minLength": 2,
			"maxLength": 17
		},
		"birth_year": {
			"bsonType": "int",
			"title": "出生年份",
			"minimum": 1950,
			"maximum": 2020
		},
		"tel": {
			"bsonType": "string",
			"title": "手机号码",
			"pattern": "^\\+?[0-9-]{3,20}$",
			"trim": "both"
		},
		"email": {
			"bsonType": "string",
			"title": "email",
			"format": "email",
			"trim": "both"
		},
		"address": {
			"bsonType": "object",
			"title": "地址",
			"required": ["city"],
			"properties": {
				"city": {
					"bsonType": "string",
					"title": "城市"
				},
				"street": {
					"bsonType": "string",
					"title": "街道",
					"trim": "both"
				}
			}
		},
		"intro":{
			"bsonType": "string",
			"title": "简介",
			"trim": "both"
		}
	}
}
#### admin后台


- 仿一刻相册Header>tab：全部相册、一刻相册、同多多相册。（同多多相册主要用于自己新建相册，然后把一刻的文件关联进来，这样就解决了总是要去一刻建立相册。）（并且还能解决一刻的相册中就那么几个文件的，浪费请求。注：一刻中已有的相册，不要去动他） 
### 相册
- 可关联文件
- 可关联人物
- 可关联标签TAG
- 后期计划
	1. 

### 文件
 - 可关联 QQ影音（QQplayerPic）连拍图（视频截帧连拍）
 - 可关联 视频指定范围片段（时间范围、GIF图封面）
 - 可关联 标签TAG
 - 可关联 人物
 - 可关联 相册
 - 后期计划 
	1. 上传文件：一刻那边同步上传文件（需指定相册）。（前端解决不了上传，那就上传到uniCloud云存储，云函数再从云存储中读取文件，然后上传分片到一刻，最后合并分片创建文件。）
	2. 删除文件：一刻那边同步删除文件。

### 人物
- 可关联文件
- 可关联标签TAG
- 可关联相册

### 标签TAG
- 可关联文件
- 可关联相册
- 可关联人物

### 连拍图数据库表（单独一刻的相册，同人物头像相册）
 - 关联文件

### GIF图数据库（单独一刻的相册，同人物头像相册）




#### app客户端

### 推荐
 - 在视频封面的下面区域增加
 - 1. QQ影音 > 视频封面 > 连拍图
 - 2. 几个预览。（预览区封面是截取的GIF图片，预览是配置指定时间段，exo去播放m3u8片段，需要在请求中加上预览字段标识，专门用于预览片段播放）

### 点击
 - 标签：跳转搜索页（类型为标签），查询所有关联某标签的 > 人物、相册、文件。（页面可仿照一刻相册app人物点击）
 - 人物：跳转搜索页（类型为人物），同上，查询关联 > 标签、相册、文件、人物（可多人物关联同一文件，参考一刻）


## 重要功能
 - 视频下载。（只能用 钻石 购买，充值钻石，最低150起）不然太便宜了 充值10钻10块钱，比如只能下载一个视频，下载完毕后就要求退款，造成白嫖，这是不行的。
 - 下载次数限制：每日最多下载3个视频。（要不然一天就下载完了，要求退款，那怎么办？）
 - 下载次数套餐：根据购买 钻石 的比例，每日下载次数也是不同的，在后台设置，类似赠送金币这样。
	- 1钻 = 1元
	- 一个视频为 10钻石，可下载5次，5次用完后需要重新购买。
	- 视频只能卖贵，便宜就会形成白嫖，与转卖。
	 1. 150钻：每日3次下载。 - 150 / (3*10) = 5天、15视频
	 2. 300钻：每日5次下载   - 300 / (5*10) = 6天、30视频
	 3. 500钻：每日8次下载   - 500 / (8*10) = 7天、50视频










## 问
先给你看下我目前的数据库表的设计（DB Schema是基于 JSON 格式定义的数据结构的规范）
一、yike-albums.schema.json
```json
{
	"bsonType": "object",
	"description": "相册表",
	"properties": {
		"_id": {
			"description": "ID，系统自动生成"
		},
		"album_type": {
			"bsonType": "int",
			"title": "相册类型",
			"description": "相册类型：0 一刻相册 1 网剧相册 2 同多多相册",
			"defaultValue": 0,
			"enum": [{
					"text": "一刻相册",
					"value": 0
				},
				{
					"text": "网剧相册",
					"value": 1
				},
				{
					"text": "同多多相册",
					"value": 2
				}
			]
		},
		"album_id": {
			"bsonType": "string",
			"title": "album_id",
			"foreignKey": "yike-album-files.album_id",
			"description": "一刻相册_相册id",
			"defaultValue": ""
		}
	}
}
```
二、yike-album-files.schema.json
```json
{
	"bsonType": "object",
	"description": "相册文件表",
	"properties": {
		"_id": {
			"description": "ID，系统自动生成"
		},
		"album_type": {
			"bsonType": "int",
			"title": "相册类型",
			"description": "相册类型：0 一刻相册 1 网剧相册 2 同多多相册",
			"defaultValue": 0,
			"enum": [{
					"text": "一刻相册",
					"value": 0
				},
				{
					"text": "网剧相册",
					"value": 1
				},
				{
					"text": "同多多相册",
					"value": 2
				}
			]
		},
		"album_id": {
			"bsonType": "string",
			"title": "album_id",
			"description": "一刻相册_相册id，和相册列表项关联",
			"foreignKey": "yike-albums.album_id", // 关联某表字段
			"defaultValue": ""
		},
		"fsid": {
			"bsonType": "int",
			"title": "fsid",
			"description": "一刻相册_文件id"
		}
	}
}
```
album_id: 一刻相册的相册id，非我这边的
然后我现在的需求是
### 相册
- 一刻相册、同多多相册。（同多多相册主要用于自己新建相册，然后把一刻的文件关联进来，这样就解决了总是要去一刻建立相册。）（并且还能解决一刻的相册中就那么几个文件的，浪费请求。注：一刻中已有的相册，不要去动他） 
- （需求在这）同多多相册类型的也可关联一刻的文件（自己关联，主要用于同多多相册，目前不能做，要解决albumn_id问题，因为请求文件m3u8流的接口是要带上album_id的，但如果我自己用同多多类型的相册，那么把一刻文件放进来，但由于相册id不同，会出现我无法请求到文件m3u8流，所以要解决这个问题。）
就是说：“同多多相册类型的是我自己在后台建立的，但一刻相册类型的，是一刻相册那边同步过来的，然后文件全部是一刻那边同步过来的，但有些文件我想自己放到同多多类型相册中，这样可以解决不用去一刻那边新建相册，再同步过来，很麻烦。但我在自己后台建同多多相册，关联一刻的文件，要如何解决album_id问题呢？” 
是否有更加简单的方式去处理，让不管相册类型是什么，他们都有一个共同的标识来让其互相关联（文件关联相册，相册关联文件），这样就解决了不用建立两个不同相册的id字段，对吧。
基于这样的思维逻辑，你帮我分析下要怎么设计和具体的实现方式？



## 答
根据你提供的信息和需求，我们可以考虑以下设计方案来实现相册和文件的关联，同时满足不同类型相册的需求：

1. **统一标识符（Unified Identifier）**：
   - 引入一个新的字段，比如 `universal_id`，作为相册和文件之间关联的统一标识符。这个字段可以是系统生成的唯一标识符，用于跨相册类型关联文件。

2. **修改数据库结构**：
   - 在 `yike-albums` 和 `yike-album-files` 表中，添加 `universal_id` 字段。这个字段将作为相册和文件之间的关联键。

3. **关联表设计**：
   - 创建一个新的关联表，比如 `album_file_associations`，用于存储相册和文件之间的关联信息。这个表可以包含字段：`album_id`, `file_id`, `universal_id`。

4. **处理逻辑**：
   - 当创建一个新的相册时，无论它是一刻相册还是同多多相册，都生成一个 `universal_id`。
   - 当关联文件到相册时，将文件的 `fsid` 和相册的 `universal_id` 存入 `album_file_associations` 表。

5. **查询逻辑**：
   - 当需要获取相册中的文件列表时，通过 `universal_id` 来查询 `album_file_associations` 表，然后根据 `file_id` 来获取文件的详细信息。

6. **解决 `album_id` 问题**：
   - 对于同多多相册类型，你可以在创建时生成自己的 `album_id`，同时生成 `universal_id`。当需要关联一刻相册的文件时，使用一刻相册的 `album_id` 和同多多相册的 `universal_id` 来建立关联。

7. **API 设计**：
   - 设计 API 来处理相册的创建、文件的关联、以及根据 `universal_id` 查询相册文件列表的功能。

8. **数据迁移**：
   - 如果现有的数据库中已经有了数据，需要设计数据迁移策略，将现有数据迁移到新的结构中，确保 `universal_id` 的正确生成和关联。

9. **权限和安全性**：
   - 确保在设计新的数据库结构和API时，考虑到权限和安全性的问题，避免未授权访问。

通过上述设计，你可以实现一个更加灵活和统一的相册和文件关联系统，无论相册的类型是什么，都可以通过 `universal_id` 来实现文件的关联和管理。这样，你就可以避免在不同类型相册之间建立多个 `album_id` 字段，简化了数据库的设计和操作逻辑。

----
通过这样的设计，你可以有效地解决同多多相册关联一刻相册文件的问题，同时避免了对一刻相册已有相册的干扰。



## 答2
在数据库设计中，没有绝对的“最好”解决方案，因为最佳实践通常取决于具体的应用场景、数据使用模式和性能要求。然而，
引入统一标识符（Universal Identifier）和关联表是一种常见的设计模式，
特别是在需要处理多对多关系或需要高度灵活性的系统中。以下是一些考虑因素，以评估这种设计是否适合你的需求：

1. **多对多关系**：如果你的应用场景涉及到多对多关系，即一个相册可以包含多个文件，一个文件也可以属于多个相册，那么使用关联表是一个很好的解决方案。

2. **灵活性**：统一标识符提供了一种灵活的方式来关联不同类型的数据，这在处理多种类型的相册和文件时非常有用。

3. **扩展性**：随着系统的发展，可能需要添加新的相册类型或文件类型。使用统一标识符和关联表可以更容易地扩展系统以适应这些变化。

4. **维护性**：虽然关联表增加了数据库的复杂性，但它也使得维护和更新数据关系更加容易。

5. **查询效率**：关联表可能会影响查询性能，特别是当涉及到多个表的JOIN操作时。因此，需要考虑索引策略和查询优化。

6. **数据一致性**：关联表需要额外的逻辑来确保数据的一致性，例如，当删除一个相册或文件时，需要同步更新关联表。

7. **事务管理**：在涉及多个表操作时，需要考虑事务管理，确保数据操作的原子性。

8. **性能考虑**：在设计时，需要评估关联表对性能的影响，并根据需要进行优化。

9. **可替代方案**：在某些情况下，可能可以使用其他设计模式，如嵌套文档（在某些NoSQL数据库中）或使用扁平化的数据结构。

10. **特定数据库特性**：不同的数据库系统有不同的特性和优化方式，设计时应考虑这些特性。

综上所述，统一标识符和关联表设计是一个强大且灵活的解决方案，但是否是“最好的”取决于你的具体需求和上下文。在实施之前，建议评估其他可能的设计模式，并进行性能测试以确定最适合你需求的方案。






# 问
基于你刚刚回答的关联表的灵活性，我现在的需求是下面这样的，你帮我设计处理下面的关联关系和要建立的表等
### 相册
- 可关联文件
- 可关联人物
- 可关联标签TAG

### 文件
 - 可关联 QQ影音（QQplayerPic）连拍图（视频截帧连拍）
 - 可关联 视频指定范围片段（时间范围、GIF图封面）
 - 可关联 标签TAG
 - 可关联 人物
 - 可关联 相册

### 人物
- 可关联文件
- 可关联标签TAG
- 可关联相册

### 标签TAG
- 可关联文件
- 可关联相册
- 可关联人物



## 答
好的，我们可以将关联表命名为 `album_file_associations` 并按照这个模式来设计其他关联表。以下是具体的表命名和结构设计：

### 基础表设计

1. **Albums** - 相册表
   - `album_id` (主键)
   - `album_name`
   - `album_description`

2. **Files** - 文件表
   - `file_id` (主键)
   - `file_name`
   - `file_path`
   - `file_type`

3. **Persons** - 人物表
   - `person_id` (主键)
   - `person_name`
   - `person_description`

4. **Tags** - 标签表
   - `tag_id` (主键)
   - `tag_name`
   - `tag_description`

### 关联表设计

1. **associations_album_file** - 相册与文件关联表
   - `association_id` (主键)
   - `album_id` (外键，关联 Albums)
   - `file_id` (外键，关联 Files)

2. **associations_album_person** - 相册与人物关联表
   - `association_id` (主键)
   - `album_id` (外键，关联 Albums)
   - `person_id` (外键，关联 Persons)

3. **associations_album_tag** - 相册与标签关联表
   - `association_id` (主键)
   - `album_id` (外键，关联 Albums)
   - `tag_id` (外键，关联 Tags)

4. **associations_file_person** - 文件与人物关联表
   - `association_id` (主键)
   - `file_id` (外键，关联 Files)
   - `person_id` (外键，关联 Persons)

5. **associations_file_tag** - 文件与标签关联表
   - `association_id` (主键)
   - `file_id` (外键，关联 Files)
   - `tag_id` (外键，关联 Tags)

6. **associations_person_tag** - 人物与标签关联表
   - `association_id` (主键)
   - `person_id` (外键，关联 Persons)
   - `tag_id` (外键，关联 Tags)

### 特殊关联处理

- 对于 QQ 影音连拍图和视频指定范围片段，可以在 `Files` 表中增加相应的字段或创建新的表来存储这些特殊信息，并在关联表中通过 `file_id` 来关联。
- 如果特殊属性如连拍图、GIF封面和视频指定时间范围片段具有明确的结构和用途，可以单独创建表来管理这些特殊属性，这样可以使得数据模型更加清晰和专门化。以下是针对这些特殊属性的表结构设计：

### 特殊文件属性表设计

1. **QQPlayerPics** - QQ影音连拍图表 **associations_file_qqplayerpics**
   - `qqplayer_pic_id` (主键)
   - `file_id` (外键，关联 Files表指向原始视频文件)
   - `burst_pic_fsid` - 连拍图的文件fsid，这个fsid不存储在Files表中，但与一刻相册中的某个文件相关联，主要用于自动化采集“连拍图封面的URL”
   - `burst_pic_cover_url` - 连拍图封面的URL

2. **VideoSegments** - 视频片段表 **associations_file_videosegments**
   - `video_segment_id` (主键)
   - `file_id` (外键，关联 Files表向原始视频文件)
   - `start_time` - 片段开始时间
   - `end_time` - 片段结束时间
   - `gif_cover_id` - 可选，如果片段有关联的GIF封面图文件ID
   - `tag_ids` - 一个字段，用于存储与该GIF封面关联的标签ID列表，通常是以某种分隔符分隔的字符串

3. **GIFCovers** - GIF封面表 **associations_file_gifcover**
   - `gif_cover_id` (主键)
   - `video_segment_id` (外键，关联 VideoSegments 表，指向对应的视频片段)
   - `file_id` (外键，关联 Files表指向原始视频文件)
   - `gif_cover_file_fsid` - GIF封面图文件fsid，这个fsid不存储在Files表中，但与一刻相册中的某个文件相关联，主要用于自动化采集“GIF图封面的URL”
   - `gif_cover_file_url` - GIF封面图的URL

### 索引设计

- 对所有外键字段和 `association_id` 创建索引，以加速查询和 JOIN 操作。

### 查询示例

- 查询某个相册的所有文件：通过 `album_id` 在 `album_file_associations` 表中找到所有关联的 `file_id`，然后从 `Files` 表中检索对应的文件信息。

- 查询与特定人物关联的所有标签：通过 `person_id` 在 `person_tag_associations` 表中找到所有关联的 `tag_id`，然后从 `Tags` 表中检索对应的标签信息。

- 查询某个文件的所有连拍图：通过 `file_id` 在 `QQPlayerPics` 表中找到所有关联的连拍图记录。

- 查询某个视频的所有片段：通过 `file_id` 在 `VideoSegments` 表中找到所有关联的视频片段记录。

- 查询某个视频的GIF封面：通过 `file_id` 在 `GIFCovers` 表中找到关联的 `gif_cover_id`，然后使用 `cover_image_id` 在 `Files` 表中检索对应的封面图片文件信息。

通过这种设计，每个特殊属性都有其专门的表来存储，这样可以提供更好的数据组织和查询效率，同时也便于维护和扩展。如果未来有新的文件属性或类型需要添加，也可以通过添加新的表来实现，而不会影响到现有的数据结构。

这种设计提供了清晰的结构来处理复杂的多对多关系，并且通过使用关联表和外键约束，确保了数据的一致性和完整性。



















## 24/08/21 问
你帮我把下面这些关联表生成DB Schema数据表结构，注意我下面给你的字段只是已有的，你可以根据最下面的文档，去决定是否增加字段来更清晰的建立关联关系。。
### 关联表设计

1. **associations_album_file** - 相册与文件关联表
   - `association_id` (主键)
   - `album_id` (外键，关联 Albums)
   - `file_id` (外键，关联 Files)

2. **associations_album_person** - 相册与人物关联表
   - `association_id` (主键)
   - `album_id` (外键，关联 Albums)
   - `person_id` (外键，关联 Persons)

3. **associations_album_tag** - 相册与标签关联表
   - `association_id` (主键)
   - `album_id` (外键，关联 Albums)
   - `tag_id` (外键，关联 Tags)

4. **associations_file_person** - 文件与人物关联表
   - `association_id` (主键)
   - `file_id` (外键，关联 Files)
   - `person_id` (外键，关联 Persons)

5. **associations_file_tag** - 文件与标签关联表
   - `association_id` (主键)
   - `file_id` (外键，关联 Files)
   - `tag_id` (外键，关联 Tags)

6. **associations_person_tag** - 人物与标签关联表
   - `association_id` (主键)
   - `person_id` (外键，关联 Persons)
   - `tag_id` (外键，关联 Tags)

### 特殊文件属性表设计

1. **QQPlayerPics** - QQ影音连拍图表
   - `qqplayer_pic_id` (主键)
   - `file_id` (外键，关联 Files)
   - `main_file_fsid` (外键，关联 Files表的fsid，指向主视频文件)
   - `burst_pic_fsid` - 连拍图的文件fsid，这个fsid不存储在Files表中，但与一刻相册中的某个文件相关联，主要用于自动化采集“连拍图封面的URL”
   - `burst_pic_cover_url` - 连拍图封面的URL

2. **VideoSegments** - 视频片段表
   - `video_segment_id` (主键)
   - `file_id` (外键，关联 Files)
   - `start_time` - 片段开始时间
   - `end_time` - 片段结束时间
   - `gif_cover_id` - 可选，如果片段有关联的GIF封面图文件ID
   - `tag_ids` - 一个字段，用于存储与该GIF封面关联的标签ID列表，通常是以某种分隔符分隔的字符串

3. **GIFCovers** - GIF封面表
   - `gif_cover_id` (主键)
   - `file_id` (外键，关联 Files指向原始视频文件)
   - `video_segment_id` (外键，关联 VideoSegments 表，指向对应的视频片段)
   - `cover_description` - 封面描述
   - `tag_ids` - 一个字段，用于存储与该GIF封面关联的标签ID列表，通常是以某种分隔符分隔的字符串
   - 标签如：人物名、某动作等，用于显示在GIF图右上角。右下角是很小的播放图标，点击就播放预览片段

然后给你表结构的文档
DB Schema概述
DB Schema是基于 JSON 格式定义的数据结构的规范。

每张表/集合，都有一个表名.schema.json的文件，来描述表的信息、字段的信息。

一个表的简单schema.json示例如下

{
	"bsonType": "object", // 固定节点
	"description": "该表的描述",
	"required": [], // 必填字段列表
	"properties": { // 该表的字段清单
		"_id": { // 字段名称，每个表都会带有_id字段
			"description": "ID，系统自动生成"
			// 这里还有很多字段属性可以设置
		},
		"field2": { // 字段2，每个表都会带有_id字段
			"description": ""
			// 这里还有很多字段属性可以设置
		}
	}
}

字段的属性
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


foreignKey字段外键
一个复杂的业务系统，有很多张数据表。表与表之间，存在的数据关联。foreignKey用于描述数据关联关系。

比如一个文章系统，至少需要用户表、文章分类表、文章表、评论表。opendb已经包含了这4张表，可以点击链接看这些表的结构：

用户表：uni-id-users
文章分类表：opendb-news-categories
文章表：opendb-news-articles
评论表：opendb-news-comments
分表
我们先不展开描述上面这几张表，首先讲解为什么分表、怎么分表。

熟悉关系型数据库的开发者对分表设计并不陌生 只不过在uniCloud的数据库中，新增了一个传统数据库并没有的schema，其中还有一个foreignKey来表达各个表之间关联关系。 比如上面几个表中的文章表：opendb-news-articles，其中的作者字段user_id配置了"foreignKey": "uni-id-users._id"

enum格式之支持描述的复杂数组
仍然使用性别字段举例，合法值域只能是“0”、“1”、“2”中的一个。但通过schema2code生成前端表单页面时，该字段会生成uni-data-checkbox组件，该组件在界面上渲染时会生成“未知”、“男”、“女”这3个候选的复选框。

{
  "bsonType": "object",
  "required": [],
  "properties": {
    "_id": {
      "description": "存储文档 ID（用户 ID），系统自动生成"
    },
    "gender": {
		"bsonType": "int",
		"title": "性别",
		"defaultValue": 0,
		"enum": [
			{
				"text": "未知",
				"value": 0
			},
			{
				"text": "男",
				"value": 1
			},
			{
				"text": "女",
				"value": 2
			}
		]
	  }
  }
}
复制代码
这种带描述的方式，让schema可读性提高，同时也让schema2code生成的前端界面可用性更高。

enum格式之数据表查询
一个字段的合法值域，可以是从另一个数据查询而来。也即，在enum中可以配置JQL查询语句。

这种方式需要搭配foreignKey来使用，也就是需要关联另一个表

在opendb中有一个民族表opendb-nation-china，里面存放了中国的56个民族。

我们要在resume表中加一个民族字段，就应该从这个opendb-nation-china表取值。

首先新建这个民族表
在项目根目录uniCloud/database点右键，新建schema，选择opendb-nation-china

这种opendb表的预置数据，需要上传schema到云端，才会添加到数据库中。所以需要对这个opendb-nation-china.schema.json点右键，上传 DB Schema

就可以uniCloud web控制台创建，此时会自动入库数据，但需要对项目根目录uniCloud/database点右键->下载 DB Schema，才可以在本地调试时使用。

建立关联表关系、配置enum的jql查询
设置nation字段的外键"foreignKey": "opendb-nation-china.name"。民族比较简单，这里我们直接取了民族表的汉字名称为关联key，没有取数据库ID。

然后设置nation字段的enum如下：

{
  "bsonType": "object",
  "required": [],
  "properties": {
    "_id": {
      "description": "存储文档 ID（用户 ID），系统自动生成"
    },
    "nation": {
      "bsonType": "string",
      "title": "民族",
      "foreignKey": "opendb-nation-china.name",
      "enum": {
        "collection": "opendb-nation-china",
        "orderby": "first_letter asc",
        "field": "name as value, name as text"
      }
    }
  }
}






用户id：66d0271ace5ec98eaa54e102



给你看个示例
通知标题：违规警告⚠️，避免封号
通知内容：尊敬的用户，您在近3天中，短时间内频繁下单且不付款。此行为已被系统识别为可疑订单行为，并触发了我们的安全警报机制。​​请您立即停止此类操作，以免进一步触发系统的自动封号功能。若您确实有意开通VIP会员，请确保在下单后完成支付。任何形式的恶意下单或破坏平台秩序的行为都将受到严肃处理。​​我们再次提醒您，若继续此类行为，可能导致您的账号被封禁，且后果自负。请您理性消费，共同维护良好的网络交易环境。​​感谢您的理解与配合！
接收通知的用户ID：66602a3609664cbba05ff43f

然后我需要你帮我写一个警告用户白嫖的严重性，可以说是系统识别到....（类似上面的示例），因为此用户已经白嫖两次了，就是充值vip后，次日退款。这样的操作分别在9月11和10月18，一共搞了2次，反正就是再一再二不再三，再有第三次直接永久封禁账号，就是这个意思，我需要你帮我写标题和内容。
通知标题：你帮我写
通知内容：你帮我写
接收通知的用户ID：66d0271ace5ec98eaa54e102

## 第2个二次白嫖用户（充值VIP后次日退款）
 - 用户id：66d0271ace5ec98eaa54e102
通知标题：账户异常警告⚠️，避免永久封号

通知内容：尊敬的用户，系统已检测到您在近两次交易中存在充值VIP后次日退款的行为，分别发生在2024年9月11日和2024年10月18日。此类操作已被识别为异常退款行为，并触发了平台的安全警报机制。我们理解您的购买意图，但请您遵守平台规则，避免不当操作。

请注意，**再一再二不再三**，若您再次发生类似行为，系统将对您的账号实施永久封禁措施，且将无法恢复。我们强烈建议您停止此类操作，以免造成不可挽回的后果。

感谢您的理解与配合，期待您合理使用平台服务，共同维护良好的交易环境。

接收通知的用户ID：66d0271ace5ec98eaa54e102


## 第1个二次白嫖用户（先充值VIP使用一段时间再退款）
 - 用户id：66bdb9d1286f7c509fc27e9b
通知标题：账户异常警告⚠️，避免永久封号

通知内容：尊敬的用户，系统已检测到您在近两次交易中存在先充值VIP使用一段时间再退款的行为，分别发生在2024年10月10日和2024年10月15日。此类操作已被识别为异常退款行为，并触发了平台的安全警报机制。我们理解您的购买意图，但请您遵守平台规则，避免不当操作。

请注意，**再一再二不再三**，若您再次发生类似行为，系统将对您的账号实施永久封禁措施，且将无法恢复。我们强烈建议您停止此类操作，以免造成不可挽回的后果。

感谢您的理解与配合，期待您合理使用平台服务，共同维护良好的交易环境。


## 第3个首次白嫖用户（先充值VIP使用一段时间再退款）（凌晨3点08充值，早上07:47要求退款，中间白嫖了4小时半）
 - 用户id: 6714b3da3f1a476373c02a83
通知标题：账户异常警告⚠️，避免永久封号

通知内容：尊敬的用户，系统已检测到您在最近一次交易中存在先充值VIP使用一段时间再退款的行为。该行为发生在2024年10月29日，您在2024年10月29日 03:08充值VIP，并在2024年10月29日 07:47申请退款，期间享受了约4小时30分钟的服务。这种操作被识别为异常退款行为，属于严重的白嫖行为，并触发了平台的安全警报机制。

关于您提出的“莫名扣费，现在想把钱拿回来”的退款理由，平台在此明确说明，所有支付流程均为用户主动操作：您在下单后唤起微信支付，并在微信内手动确认支付，包括输入支付密码或使用指纹等验证方式。因此，这一过程中不存在“莫名扣费”情况。

此外，合理的退款操作通常是在确认购买后的3分钟内完成申请。如因误操作或改变初衷不再需要VIP服务，应及时申请退款才符合规范。您在享受数小时VIP服务后再申请退款，已不属于正常操作，平台将此视为有意白嫖行为

我们理解您的购买意图，但请您遵守平台规则，避免不当操作。请注意，若您再次发生类似行为，系统将对您的账号实施永久封禁措施，且将无法恢复。我们强烈建议您停止此类操作，以免造成不可挽回的后果。

感谢您的理解与配合，期待您合理使用平台服务，共同维护良好的交易环境。



## 待办事项 **重要** 计划：2024年11月5日 > 执行
### 优化订单请求（5分钟内只能请求一次）
 - APP用户下单流程 > 用户下单 > 将h5支付地址记录到数据库表中。（如果用户放弃支付，然后在5分钟内又再次唤起下单，直接返回刚刚下单的地址，不用处理与上次订单金额是否相同）
 - 后端api下单流程 > 先查询订单数据库表中是否有当前用户的下单记录（条件查询：5分钟之内的订单，也就是当前时间+5分钟），如果有，则返回这个订单的支付地址就行了。
   - 5分钟内的订单如果查询？
    1. 当前时间 + 5分钟 = 查询条件的时间戳。（举个例子：这里你帮写个文字描述的列子）
	- ## 举个例子：假设当前时间是 2024 年 11 月 4 日 10 点 00 分，那么当前时间加上 5 分钟后，时间变为 2024 年 11 月 4 日 10 点 05 分。
	 - 在数据库查询时，以这个时间戳作为查询条件之一，查询在当前时间至 2024 年 11 月 4 日 10 点 05 分这个时间段内是否有当前用户的下单记录。
	 - 如果有，则返回这个订单的支付地址；如果没有，则进行正常的下单流程，并将生成的 H5 支付地址记录到数据库表中。
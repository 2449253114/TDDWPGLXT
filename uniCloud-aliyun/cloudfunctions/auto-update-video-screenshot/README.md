# videoPuzzleCollection 数据库表结构
```json
{
  "bsonType": "object",
  "description": "视频封面和拼图信息表",
  "required": ["video_id", "puzzle_url"],
  "properties": {
    "_id": {
      "description": "ID，系统自动生成"
    },
    "video_fsid": {
			"bsonType": "int",
			"foreignKey": "yike-album-files.fsid",
			"description": "主视频文件ID，关联Files表指向原始视频文件"
    },
    "cover_url": {
      "description": "视频封面图片URL，命名规则：fsid_{video_fsid}_cover.jpg，例如：fsid_134480830088_cover.jpg",
      "bsonType": "string",
      "pattern": "^fsid_\\d+_cover\\.jpg$"
    },
    "puzzle_url": {
      "description": "视频拼图图片URL，存储连续截图拼接后的完整图片。命名规则：fsid_{video_fsid}_screenshot.jpg，例如：fsid_134480830088_screenshot.jpg",
      "bsonType": "string",
      "pattern": "^fsid_\\d+_screenshot\\.jpg$"
    },
		"create_time": {
			"bsonType": "timestamp",
			"label": "创建时间",
			"defaultValue": {
				"$env": "now"
			},
			"componentForEdit": {
				"name": "uni-dateformat"
			}
		},
    "update_time": {
			"bsonType": "timestamp",
      "description": "更新时间",
			"defaultValue": {
				"$env": "now"
			},
			"componentForEdit": {
				"name": "uni-dateformat"
			}
    }
  }
} 
```
# videoShotCursorCollection 数据库表结构
```json
{
	"bsonType": "object",
	"description": "储存视频截图相册的光标，用于分配多账号请求",
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
		"album_id": {
			"bsonType": "string",
			"title": "album_id",
			"foreignKey": "yike-album-files.album_id",
			"description": "一刻相册_相册id"
		},
		"cursor": {
			"bsonType": "string",
			"title": "cursor",
			"description": "光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页。data.cursor）"
		},
		"cursor_page_num": {
			"bsonType": "string",
			"title": "光标页码",
			"description": "光标页码，用于标记这是这是第几页的cursor"
		},
		"has_more": {
			"bsonType": "int",
			"title": "是否有更多",
			"description": "是否还有更多数据 ? 1 还有更多、0 没有更多了。（data.has_more）",
			"defaultValue": 0,
			"enum": [{
					"text": "没有更多了",
					"value": 0
				},
				{
					"text": "还有更多",
					"value": 1
				}
			]
		},
		"create_time": {
			"bsonType": "timestamp",
			"title": "创建时间",
			"defaultValue": {
				"$env": "now"
			},
			"componentForEdit": {
					"name": "uni-dateformat"
				}
			}
		}
	}
}
```
# constants.js
```javascript
const db = uniCloud.database()
const dbCmd = db.command

// 视频封面和视频截帧拼图
const videoPuzzleCollectionName = 'yike-video-puzzle'
const videoPuzzleCollection = db.collection(videoPuzzleCollectionName)

// 视频截帧图相册的光标（光标，用于请求下一页的唯一标识）
const videoShotCursorCollectionName = 'admin-auto-video-screenshot'
const videoShotCursorCollection = db.collection(videoShotCursorCollectionName)

// 一刻相册账号cookie（请求时需要的cookie）
const accountCookieCollectionName = "yike-account-cookie"
const accountCookieCollection = db.collection(accountCookieCollectionName)

// 视频封面和视频截帧拼图的相册ID
const videoPuzzleAlbumId = 2391117296005381760

module.exports = {
	dbCmd,
	videoPuzzleAlbumId,
	videoPuzzleCollection,
	videoShotCursorCollection,
	accountCookieCollection
}
```

# 任务设计
一. 查询videoShotCursorCollection的album_id的记录数。
```javascript
const { total } = await videoShotCursorCollection.where({
	album_id: videoPuzzleAlbumId,
}).count();
```
二. 判断total。
2.1 如果total == 0，则先添加一条记录（此为相册ID第一页的光标记录）
```javascript
videoShotCursorCollection.add({
	album_id: videoPuzzleAlbumId,
	cursor: "", // 光标，第一页默认为空
	cursor_page_num: 1, // 光标页码
})
```
三、查询videoShotCursorCollection的album_id记录
```
const videoShotCursors = videoShotCursorCollection.where({album_id: videoPuzzleAlbumId}).limit(total).get()
```
四、从accountCookieCollection中随机获取（total）个账号，准备接下来的请求使用
```javascript
const allAccountCookieData = await accountCookieCollection
	.aggregate()
  .match({
    status: 0, // 正常
  })
	.sample({
		size: 1
	})
	.limit(1)
  .end();

// 构造分配账号请求的数据（为每个cursor分配一个账号Cookie，并准备请求的必要数据）大概是下面这样
// 遍历videoShotCursors从allAccountCookieData中提取账号信息（通过videoShotCursors中的cursor_page_num拿allAccountCookieData中cookieItem，注意，cursor_page_num为1，相当于索引0）
```
五、准备请求
并发请求队列中的cursor，每批次同时请求8个（每次是最多8个，因为有的批次可能不满足8个），同时就是并发的意思

以上就是需要实现的功能，请帮我实现。
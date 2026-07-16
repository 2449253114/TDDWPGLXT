我现在有个admin-auto-task.schema.json数据库表，作用就是记录自动化任务的表，但是每个任务都有自己的归属字段，所以需求会一直变和一直增加，但是又得保证只用这一个表来统一存放所有的任务记录（我这是uniCloud）
```json
// 文档教程: https://uniapp.dcloud.net.cn/uniCloud/schema
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
		}
		
	}
}
```
[](https://pcsdata.baidu.com/thumbnail/c51930496pf3290e79fc34c53d0e1046?fid=1815907562-16051585-138226472886646&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-6wYW4b2YGY6EszhxYLtFBn2EWZg%3D&expires=2h&chkv=0&chkbd=0&chkpc=&dp-logid=8897156970542595303&dp-callid=0&time=1715706000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video)
[](https://pcsdata.baidu.com/thumbnail/c51930496pf3290e79fc34c53d0e1046?fid=1815907562-16051585-138226472886646&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-6wYW4b2YGY6EszhxYLtFBn2EWZg%3D&expires=2h&chkv=0&chkbd=0&chkpc=&dp-logid=8897171201455799220&dp-callid=0&time=1715706000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video)
[](https://pcsdata.baidu.com/thumbnail/dae0f2653od1606cc29d1329343f8ae4?fid=1815907562-16051585-117959341988650&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-sfnxHAemBKMVb27uBQL4SHqp9c8%3D&expires=2h&chkv=0&chkbd=0&chkpc=&dp-logid=8897171201455799220&dp-callid=0&time=1715706000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video)

[](https://pcsdata.baidu.com/thumbnail/dae0f2653od1606cc29d1329343f8ae4?fid=1815907562-16051585-117959341988650&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-uJe4UL9Crk9fk27Bcm4wqSlsAvM%3D&expires=2h&chkv=0&chkbd=0&chkpc=&dp-logid=8895782271461382292&dp-callid=0&time=1715702400&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video)







[](https://pcsdata.baidu.com/thumbnail/a6f03cd0dqd60a153124a272da78c708?fid=1815907562-16051585-327676779454842&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-oDmNhOGmYTMSY73tJcf54n%2FWp1A%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=8897284645629752751&dp-callid=0&time=1715706000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video)
[](https://pcsdata.baidu.com/thumbnail/5b4f88312m76f1caf6e2b74fd32e79f1?fid=1815907562-16051585-38450152954363&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-2kPuM6Tu1%2BQXvOMu%2B5%2FtmPXtOVM%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=8897284645629752751&dp-callid=0&time=1715706000&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video)

按照您的需求，您希望在一个统一的表中管理多个自动化任务，并在满足一定条件时执行特定的相册更新操作。以下是一种实现方法的概要：
查询自动化任务：从数据库中获取当前的任务。
判断任务状态：根据任务状态（pending, running, completed）执行不同的逻辑。
任务初始化：如果任务是pending状态，需要初始化任务状态，将云端相册同步到任务列表中。
任务执行：如果任务是running状态，继续执行未完成的任务。
任务完成：如果任务是completed状态，重置任务状态以备下次执行。
现在，我们将根据您的代码示例和这些步骤实现updateCoverUrls函数：


你帮我看看我的需要要如何实现
task数据 = 下面的data[0]
```json
[
	{
		"_id": "admin-auto-task-auto-update-file-cover",
		"task_type": "album-files-update-file-cover",
		"task_details": {
			"album_id": "", // 当前任务的相册ID
			"cursor": "", // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
			"has_more": 0 ,// 如果has_more为1，表示还有更多数据需要处理，我们将继续调用更新函数，并传递新的cursor值。
			"current_page": 0,
			"total_count": 0, // 总数量
		},
		"task_albums": [// 如果task_albums中全部item.status都为completed，则任务重新开始，否则从除completed外，在当前第一个pending中开始执行album_id的任务
			{
				"album_id": "",
				"status": "pending" // 等待中（pending）、进行中（running）、已完成（completed）
			}
		],
		"status": "pending",
		"create_time": 0,
		"updated_time": 0
	}
]
```
代码中注释的有关处理状态为pending的第一个，比如下面的数据图
```json
[
	{
		"album_id": "",
		"status": "pending" // 找到了3个pending，但只从此处执行loadAlbumFiles，后面的忽略
	},
	{
		"album_id": "",
		"status": "completed"
	},
	{
		"album_id": "",
		"status": "pending" 
	},
	{
		"album_id": "",
		"status": "pending"
	}
]
```

```javascript
const {
	dbCmd,
	fileCollection,
	albumCollection,
	adminAutoTaskCollection
} = require('../../common/constants')

const {
	photoConfig
} = require('../../common/photo-config')

const {
	STATE_CODE,
	createResponse
} = require('../../common/response')


async function queryAutoTask() {
	try {
		const { data: taskResult } = await adminAutoTaskCollection.get()
		const task = taskResult[0]
		return task
		
	}  catch (error) {
		
	    throw error; // 重新抛出错误，以便调用者可以处理
	}
}


async function loadAlbumFiles(
	album_id = "",
	cursor = ""
) {
	// 一刻相册的请求头
	let headers = photoConfig.headers
		headers.Referer = `https://photo.baidu.com/photo/web/album/${album_id}`
	// querys参数只能是Sting类型
	const clienttype = "70"; // 客户端类型 70为Web
	const bdstoken = "5b3bda475d3738a44580fff097ee8037"; // 
	// cursor变量已在函数参数中声明，无需再次声明
	//const cursor = cursor; // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
	const need_amount = "1"; // 默认
	const limit = "100"; // 默认
	const passwd = "0";
	
	// 构建 form-data 字符串
	let formData = '';
	formData += `cursor=${encodeURIComponent(cursor)}&`;
	formData += `album_id=${encodeURIComponent(album_id)}&`;
	formData += `need_amount=${encodeURIComponent(need_amount)}&`;
	formData += `limit=${encodeURIComponent(limit)}`;
	formData += `&passwd=${encodeURIComponent(passwd)}`;
	
	const apiUrl = `https://photo.baidu.com/youai/album/v1/listfile?clienttype=${clienttype}&bdstoken=${bdstoken}`
	
	try {
		const res = await uniCloud.httpclient.request(apiUrl, {
			method: 'POST',
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",// 此类型在['https://photo.baidu.com/youai/album/v1/listfile']接口，控制台中看Network > api接口 > Header > Request Headers 中查看
				...headers
			},
			content: formData,
			dataType: 'json' // 此处指定为json表示将此请求的返回值解析为json
		});
		
		return createResponse(STATE_CODE.SUCCESS, "请求成功", res.data)

	} catch (error) {
		
		return createResponse(STATE_CODE.FAIL, "请求失败", error)
	}
		
}

async function updateTaskAlbums(task) {
    try {
        // 任务状态为pending，表示任务未开启，需要初始化任务，查询所有相册
        const { data: albumData } = await albumCollection.where({ status: 1 }).field({ album_id: true, total_count: true }).get();
		
		// 过滤掉task.task_albums中album_id为空的项
		task.task_albums = task.task_albums.filter((taskAlbum) => taskAlbum.album_id !== "");
		
        // 检测是否需要更新任务相册列表
        let taskAlbumsUpdated = false;
        
        // 如果数量不等，将云端相册添加到任务相册中
        albumData.forEach((album) => {			
            if (!task.task_albums.some((taskAlbum) => taskAlbum.album_id === album.album_id)) {
                task.task_albums.push({
                    album_id: album.album_id,
                    status: "pending",
                    total_count: album.total_count
                });
                taskAlbumsUpdated = true;
            }
        });

        if (taskAlbumsUpdated) {
            // 按照total_count倒序排序task.task_albums
            task.task_albums.sort((a, b) => b.total_count - a.total_count);

            // 更新数据库中的任务记录
            await adminAutoTaskCollection.doc(task._id).update({
                task_albums: task.task_albums
            });
        }

        return task.task_albums; // 返回可能更新后的任务相册列表
    } catch (error) {
        console.error("Failed to update task albums:", error);
        throw error; // 重新抛出错误，以便调用者可以处理
    }
}

async function updateCoverUrls(cursor = "") {
	try {
	    // 第一步：查询自动化任务
	    let task = await queryAutoTask()

		// 第二步：根据任务状态执行相应逻辑
		if (task.status === "pending") {
			// 任务状态为pending，表示任务未开启，需要初始化任务
			
			// 检查是否要更新任务相册
			const updatedTaskAlbums = await updateTaskAlbums(task);
			
			// 检查任务相册中第一个状态为pending的任务，并执行更新
			const pendingAlbumIndex = updatedTaskAlbums.findIndex((album) => album.status === "pending");
			if (pendingAlbumIndex !== -1) {
			    // 设置找到的pendingAlbum状态为running [运行中]
			    updatedTaskAlbums[pendingAlbumIndex].status = "running";
			    // 当前相册ID
				const currentAlbumId = updatedTaskAlbums[pendingAlbumIndex].album_id
				
			    // 更新任务状态为running，并更新task_albums数组
			    await adminAutoTaskCollection.doc(task._id).update({
			        status: "running",
			        task_albums: updatedTaskAlbums,
					task_details: {
						album_id: currentAlbumId,
						cursor: "",
						has_more: 0,
						current_page: 1
					}
			    });
				
				// 递归调用（默认传递cursor=""），代表这是从第一页开始的（文件数量: 0-100）
				await updateCoverUrls()
				
			}
			
		} else if (task.status === "running") {
			// 任务状态为running，表示任务正在执行
			// 执行任务，加载相册文件并更新封面URL
			const { task_details: taskDetails } = task;// 第一步 中 拿到的 任务信息
			const currentAlbumId = taskDetails.album_id;
			const currentCursor = cursor ? cursor : taskDetails.cursor; // 为空""，表示是第一页相册文件请求（0-100）
			const currentHasMore = taskDetails.has_more;
			
			// 执行loadAlbumFiles更新操作
			const { data: loadData } = await loadAlbumFiles(currentAlbumId, currentCursor);
			// 根据loadAlbumFileData进行后续处理...
			const albumFiles = loadData.list;
			// 请求下页时用到的
			const next_cursor = loadData.cursor;
			const next_has_more = loadData.has_more; // 1 还有更多、0 没有更多了
			// 循环更新
			if (albumFiles && albumFiles.length > 0) {
				// 遍历文件列表，更新文件封面URL
				for (let item of albumFiles) {
					// 更新文件封面URL
					await fileCollection.where({
						album_id: item.album_id,
						fsid: item.fsid
					}).update({
						// 更新thumburl[0]
						['thumburl.' + 0]: item.thumburl[1]
					});
				}
				
			    if (next_has_more === 1) {
					// 更新任务详情，准备请求下一页
					await adminAutoTaskCollection.doc(task._id).update({
					    status: "running",
					    //task_albums: updatedTaskAlbums, // 只有当前相册文件的封面全部更新完了，next_has_more==0才需要更新这个
						task_details: {
							album_id: currentAlbumId,
							cursor: next_cursor,
							has_more: next_has_more,
							current_page: dbCmd.inc(1) // 准备请求下页
						}
					});
					
			        // 递归调用处理下一页
			        await updateCoverUrls(next_cursor);
			    } else {
					// 当前相册处理完成，更新状态为completed
					
					// 准备下一个任务相册ID，直到所有的任务相册ID的status==completed，则更新adminAutoTaskCollection状态为status==completed
					// 所以这里其实还要先检查所有任务相册ID的status==completed，并更新adminAutoTaskCollection状态status==completed，再递归调用updateCoverUrls
					// 这是updateCoverUrls就会走到task.status === "completed"中（这部分的需求在对应处的注释中）

					// 检查是否要更新任务相册
					const updatedTaskAlbums = await updateTaskAlbums(task);
					// 将当前相册标记为已完成
					const currentAlbumIndex = updatedTaskAlbums.findIndex(album => album.album_id === currentAlbumId);
					updatedTaskAlbums[currentAlbumIndex].status = 'completed';
					
					// 检查所有相册是否已完成，完成则更新任务状态status==completed，然后递归updateCoverUrls，在task.status==completed中重置任务状态并重启任务
					const allCompleted = updatedTaskAlbums.every(album => album.status === 'completed');
					if (allCompleted) {
					    // 所有任务相册都已完成，重置任务状态为completed，等待下一次执行
					    await adminAutoTaskCollection.doc(task._id).update({
					        status: "completed",
					        task_albums: updatedTaskAlbums.map(album => ({ ...album, status: 'pending' })), // 将所有相册状态重置为pending
					        task_details: {// 重置任务详细
					            album_id: "",
					            cursor: "",
					            has_more: 0,
					            current_page: 0,
					            total_count: 0
					        }
					    });
					    //（可选）通过递归调用updateCoverUrls（）重新启动自动化任务
						await updateCoverUrls()
					} else {
						// 还有未完成的相册，找到下一个pending的相册并开始处理
						const nextPendingIndex = updatedTaskAlbums.findIndex(album => album.status === 'pending');
						if (nextPendingIndex !== -1) {
							// 将找到下一个pending的相册状态为running [运行中]
							updatedTaskAlbums[nextPendingIndex].status = "running";
							// 下一个任务相册ID
							const nextAlbumId = updatedTaskAlbums[nextPendingIndex].album_id
							// 更新任务状态为running，并开始处理下一个pending的相册
							await adminAutoTaskCollection.doc(task._id).update({
								status: "running",
								task_albums: updatedTaskAlbums,
								task_details: { // 更新任务详情为下一个相册
									album_id: nextAlbumId,
									cursor: "",
									has_more: 0,
									current_page: 1,
									total_count: 0
								}
							});
							await updateCoverUrls(); // 重新开始处理下一个相册
						}
					}		
					//return "当前任务相册ID全部更新完成"
				}
			} else {
			    console.error('Failed to load files or no files found.');
				return "Failed to load files or no files found."
			}
			
		} else if (task.status === "completed") {
			// 任务状态为completed，表示任务已完成
			
			// 这里还需要再确认一遍updateTaskAlbums中的所有相册任务ID状态是否completed已完成，因为相册可能会随时添加进来，所以需要再次确认下，防止比如刚刚添加的相册没加入进来，而疏忽了更新相册文件封面的任务。
			// 然后再重置"task_details": {
			// 	"album_id": "", // 当前任务的相册ID
			// 	"cursor": "", // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
			// 	"has_more": 0 ,// 如果has_more为1，表示还有更多数据需要处理，我们将继续调用更新函数，并传递新的cursor值。
			// 	"current_page": 0,
			// 	"total_count": 0 // 总数量
			// }
			// 和重置task_albums中所有item.status==pending
			// 然后再次递归updateCoverUrls，代表是整个任务完成后的第二次执行，因为这是个无限循环的任务。
		
		
			// 任务已完成，验证是否有新的相册加
			const updatedTaskAlbums = await updateTaskAlbums(task);
			const allCompleted = updatedTaskAlbums.every(album => album.status === 'completed');
			if (!allCompleted) {
				// 如果有新的相册加入，重置任务状态为pending，并开始处理新加入的相册
				await adminAutoTaskCollection.doc(task._id).update({
					status: "pending",
					task_albums: updatedTaskAlbums,
					task_details: { // 重置任务详情
						album_id: "",
						cursor: "",
						has_more: 0,
						current_page: 0,
						total_count: 0
					}
				});
				await updateCoverUrls(); // 重新开始处理任务
			} else {
				// 重新开始处理任务
			}
			
		}
		
	} catch (error) {
	    // 处理错误
	    //console.error("An error occurred during task update:", error);
		
		return { error }
	}
}

// 遍历响应数据：首先，我们需要遍历从loadFiles函数获取的响应数据中的list数组，并对每一项进行数据库更新操作。
// 递归更新：我们将使用递归的方式来处理分页数据的更新，如果has_more为1，表示还有更多数据需要处理，我们将继续调用更新函数，并传递新的cursor值。

module.exports = async function () {
	
	let res = await updateCoverUrls()
	
	//let res = await loadFiles()
	// 您可能想要处理响应或返回它
	return res;
}

```


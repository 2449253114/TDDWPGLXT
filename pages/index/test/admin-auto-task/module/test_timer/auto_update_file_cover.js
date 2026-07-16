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
			// 如果任务状态为pending（等待中），表示任务未开启，需要初始化任务
			const updatedTaskAlbums = await updateTaskAlbums(task); // 更新任务相册列表
			
			// 找到第一个状态为pending的相册并开始执行
			const pendingAlbumIndex = updatedTaskAlbums.findIndex((album) => album.status === "pending");
			if (pendingAlbumIndex !== -1) {
			    updatedTaskAlbums[pendingAlbumIndex].status = "running"; // 将此相册状态设置为running（执行中）
			    const currentAlbumId = updatedTaskAlbums[pendingAlbumIndex].album_id; // 获取当前相册ID
				
			    // 更新任务状态为running，并更新相册列表和任务详情
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
				await updateCoverUrls(); // 递归调用自身，开始处理相册文件
				
			}
			
		} else if (task.status === "running") {
			// 如果任务状态为running（执行中），表示任务正在执行
			
			const { task_details: taskDetails } = task;// 第一步 中 拿到的 任务信息
			const currentAlbumId = taskDetails.album_id;
			const currentCursor = cursor ? cursor : taskDetails.cursor; // 光标，用于请求下一页
			//const currentHasMore = taskDetails.has_more;
			
			// 加载相册文件
			const { data: loadData } = await loadAlbumFiles(currentAlbumId, currentCursor);
			// 根据loadAlbumFileData进行后续处理...
			const albumFiles = loadData.list; // 相册文件列表
			// 请求下页时用到的
			const next_cursor = loadData.cursor; // 下一页的光标
			const next_has_more = loadData.has_more; // 是否还有更多数据 ? 1 还有更多、0 没有更多了
			// 是否有相册文件
			if (albumFiles && albumFiles.length > 0) {
				// 遍历相册文件列表，更新文件封面URL
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
					// 如果还有更多数据，更新任务详情并请求下一页
					await adminAutoTaskCollection.doc(task._id).update({
					    status: "running",
						task_details: {
							album_id: currentAlbumId,
							cursor: next_cursor,
							has_more: next_has_more,
							current_page: dbCmd.inc(1) // 当前页码加一
						}
					});
					
			        // 递归调用处理下一页
			        await updateCoverUrls(next_cursor);
			    } else {
					// 准备下一个任务相册ID，直到所有的任务相册ID的status==completed，则更新adminAutoTaskCollection状态为status==completed
					// 所以这里其实还要先检查所有任务相册ID的status==completed，并更新adminAutoTaskCollection状态status==completed，再递归调用updateCoverUrls
					// 这是updateCoverUrls就会走到task.status === "completed"中（这部分的需求在对应处的注释中）
					
					
					// 如果当前相册处理完成，更新相册状态为completed（已完成）
					const updatedTaskAlbums = await updateTaskAlbums(task); // 更新任务相册列表
					const currentAlbumIndex = updatedTaskAlbums.findIndex(album => album.album_id === currentAlbumId);
					updatedTaskAlbums[currentAlbumIndex].status = 'completed';
					
					// 检查是否所有相册都已完成
					const allCompleted = updatedTaskAlbums.every(album => album.status === 'completed');
					if (allCompleted) {
						// 如果所有相册都已完成，重置相册任务状态为pending，等待下一次执行
						await adminAutoTaskCollection.doc(task._id).update({
							status: "completed",
							task_albums: updatedTaskAlbums.map(album => ({ ...album, status: 'pending' })),
							task_details: {
								album_id: "",
								cursor: "",
								has_more: 0,
								current_page: 0,
								total_count: 0
							}
						});
						await updateCoverUrls(); // 重新启动任务处理
					} else {
						// 如果还有未完成的相册，找到下一个pending的相册并更新状态为running，然后继续处理
						const nextPendingIndex = updatedTaskAlbums.findIndex(album => album.status === 'pending');
						if (nextPendingIndex !== -1) {
							updatedTaskAlbums[nextPendingIndex].status = "running";
							const nextAlbumId = updatedTaskAlbums[nextPendingIndex].album_id;
							await adminAutoTaskCollection.doc(task._id).update({
								status: "running",
								task_albums: updatedTaskAlbums,// 只有当前相册文件的封面全部更新完了，next_has_more==0才需要更新这个
								task_details: {
									album_id: nextAlbumId,
									cursor: "",
									has_more: 0,
									current_page: 1,
									total_count: 0
								}
							});
							await updateCoverUrls(); // 处理下一个pending的相册
						}
					}	
				}
			} else {
				throw new Error('未能加载文件或找不到文件');
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
			
			
			// 如果任务状态为completed（已完成），则检查是否有新的相册加入，并重置任务状态和详情以备下次执行
			const updatedTaskAlbums = await updateTaskAlbums(task); // 更新任务相册列表
			const allCompleted = updatedTaskAlbums.every(album => album.status === 'completed');
			if (!allCompleted) {
				// 如果有新的相册加入或未完成的相册，重置任务状态为pending，并开始处理新加入的相册
				await adminAutoTaskCollection.doc(task._id).update({
					status: "pending",
					task_albums: updatedTaskAlbums.map(album => ({ ...album, status: 'pending' })), // 重置所有相册状态为pending
					task_details: {
						album_id: "",
						cursor: "",
						has_more: 0,
						current_page: 0,
						total_count: 0
					}
				});
				await updateCoverUrls(); // 重新开始处理任务
			}
			// 如果所有相册都已完成，并且没有新相册加入，则任务保持completed状态，等待下一次触发
		}
		
	} catch (error) {
	    console.error("任务更新过程中出现错误:", error); // 输出错误信息
	    return { error };
	}
}

// 遍历响应数据：首先，我们需要遍历从loadFiles函数获取的响应数据中的list数组，并对每一项进行数据库更新操作。
// 递归更新：我们将使用递归的方式来处理分页数据的更新，如果has_more为1，表示还有更多数据需要处理，我们将继续调用更新函数，并传递新的cursor值。

module.exports = async function () {
	let res = await updateCoverUrls(); // 触发任务更新
	return res; // 返回任务更新结果
}
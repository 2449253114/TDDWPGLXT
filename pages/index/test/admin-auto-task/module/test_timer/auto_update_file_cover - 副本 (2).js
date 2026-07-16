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
	const { data: taskResult } = await adminAutoTaskCollection.get()
	const task = taskResult[0]
	return task
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
        // 任务状态为pending，表示任务未开启，需要初始化任务
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
				
			    // 执行loadAlbumFiles更新操作
			    const { data: loadData} = await loadAlbumFiles(currentAlbumId, "");
			    // 根据loadAlbumFileData进行后续处理...
				
				const next_cursor = loadData.cursor;
				const next_has_more = loadData.has_more
				const albumFiles = loadData.list;
				
				if (albumFiles && albumFiles.length > 0) {
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
					
				    if (res.has_more === 1) {
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
						
						
				        // 如果有更多数据，递归调用并传递cursor
				        await updateCoverUrls(res.cursor);
				    } else {
						return "全部更新完成"
					}
				} else {
				    console.error('Failed to load files or no files found.');
					return "Failed to load files or no files found."
				}
				
				// 设置找到的pendingAlbum状态为completed [已完成]
				updatedTaskAlbums[pendingAlbumIndex].status = "completed";
				
				// 更新任务的信息，具体的注释说明你帮我写（集合我的需求）
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
				
				//return loadResult
			}
			
			// 检查是否有相册需要更新所有文件封面
			// if (albumResult.data.length > 0) {
			// 	// 有相册需要更新所有文件封面
			// 	// 遍历相册
			// 	for (let album of albumResult) {
			// 		// 获取相册ID
			// 		const album_id = album.album_id
			// 		// 获取相册文件总数
			// 		const total_count = album.total_count
			// 	}
			// }
		
		
		
		
		} else if (task.status === "running") {
			// 任务状态为running，表示任务正在执行
			
		
		
		
		} else if (task.status === "completed") {
			// 任务状态为completed，表示任务已完成
		
		
		}
		
	} catch (error) {
	    // 处理错误
	    //console.error("An error occurred during task update:", error);
		
		return { error }
	}


	
	
	
  //   let res = await loadFiles(cursor);

  //   if (res.list && res.list.length > 0) {
  //       for (let item of res.list) {
		// 	// 获取当前时间戳
		// 	const now = Date.now();
		// 	// 更新文件封面URL
  //           await fileCollection.where({
  //               fsid: item.fsid
  //           }).update({
  //               // 更新thumburl[0]
  //               ['thumburl.' + 0]: item.thumburl1,
		// 		cover_update_time: now // 新增字段，记录更新时间
  //           });
  //       }
		
		// return "全部更新完成"
		
  // //       if (res.has_more === 1) {
  // //           // 如果有更多数据，递归调用并传递cursor
  // //           await updateCoverUrls(res.cursor);
  // //       } else {
		// // 	return "全部更新完成"
		// // }
  //   } else {
  //       console.error('Failed to load files or no files found.');
		// return "Failed to load files or no files found."
  //   }
}

// 遍历响应数据：首先，我们需要遍历从loadFiles函数获取的响应数据中的list数组，并对每一项进行数据库更新操作。
// 递归更新：我们将使用递归的方式来处理分页数据的更新，如果has_more为1，表示还有更多数据需要处理，我们将继续调用更新函数，并传递新的cursor值。


module.exports = async function () {
	
	let res = await updateCoverUrls()
	
	//let res = await loadFiles()
	// 您可能想要处理响应或返回它
	return res;
}
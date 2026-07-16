const {
	dbCmd,
	fileCollection,
	albumCollection,
	adminAutoTaskCollection
} = require('./common/constants')

const {
	photoConfig
} = require('./common/photo-config')

const {
	newTasks
} = require('./common/fun')

const {
	STATE_CODE,
	createResponse
} = require('./common/response')

/**
 * 查询指定的任务ID相应的任务记录
 * 
 * @param {string} startTaskId 要启动的任务的ID。
 * @returns {Promise<object>} 返回任务记录的结果，可能包含成功或失败的消息。
 */
async function queryAutoTask(startTaskId = "") {
	// 后期改为：没有就新建个
	try {
		const { data: taskResult } = await adminAutoTaskCollection.doc(startTaskId).get()

		// 检查是否查询到了任务
		if (taskResult.length === 0) {
			// 没有查询到任务，创建新的任务
			const newTask = newTasks
			
			// 在数据库中创建新的任务
			await adminAutoTaskCollection.add(newTask);
			
			// 返回新创建startTaskId的任务
			const task = newTask.find(t => t._id === startTaskId);
			return task;
		} else {
			// 查询到了任务
			const task = taskResult[0];
			return task;
		}
	}  catch (error) {
	    throw error; // 重新抛出错误，以便调用者可以处理
	}
}


async function loadAlbumFiles(
	album_id = "",
	cursor = ""
) {
	
	// 一刻相册的请求头
	let headers = {
		"Cookie": photoConfig.headers.Cookie,
		"Host": photoConfig.headers.Host,
		"Origin": "https://photo.baidu.com",
		"Referer": `https://photo.baidu.com/photo/web/album/${album_id}`
	}
	
	// querys参数只能是Sting类型
	const clienttype = "70"; // 客户端类型 70为Web
	const bdstoken = "5b3bda475d3738a44580fff097ee8037"; // 
	// cursor变量已在函数参数中声明，无需再次声明
	//const cursor = cursor; // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
	const need_amount = "1"; // 默认
	const limit = "100"; // 默认
	const passwd = "";
	
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
		
		console.log('res', res)
		return createResponse(STATE_CODE.SUCCESS, "请求成功", res.data)

	} catch (error) {

		return createResponse(STATE_CODE.FAIL, "请求失败", error)
	}
		
}



async function updateTaskAlbums(task) {
    try {
        // 任务状态为pending，表示任务未开启，需要初始化任务，查询所有相册
        const { data: albumData } = await albumCollection
		.where({ 
			status: 1,
			album_type: 0 // 一刻相册
		})
		.field({ album_id: true, total_count: true })
		.limit(500)
		.get();
		
		 // 创建一个新的任务相册列表，基于云端的数据
		let newTaskAlbums = albumData.map(album => ({
			album_id: album.album_id,
			status: "pending", // 默认状态设置为pending
			total_count: album.total_count
		}));

		// 保留已存在的任务相册状态
		newTaskAlbums = newTaskAlbums.map(newAlbum => {
			const existingAlbum = task.task_albums.find(taskAlbum => taskAlbum.album_id === newAlbum.album_id);
			// 如果在现有任务列表中找到，则保留其状态，否则使用新相册的默认状态
			return existingAlbum ? { ...newAlbum, status: existingAlbum.status } : newAlbum;
		});
		
        // 检查是否有更新（新的列表和旧的列表不同）
		taskAlbumsUpdated = newTaskAlbums.length !== task.task_albums.length ||
								!newTaskAlbums.every((newAlbum, index) => task.task_albums[index] && task.task_albums[index].album_id === newAlbum.album_id);
        	
        if (taskAlbumsUpdated) {
			// 如果有更新，重新排序新的任务相册列表
			if (task.task_sort === "desc") {
				// 按照相册文件数量降序排序
				newTaskAlbums.sort((a, b) => b.total_count - a.total_count);
			} else {
				// 按照相册文件数量升序排序
				newTaskAlbums.sort((a, b) => a.total_count - b.total_count);
			}
			
			// TODO TEST
			// 如果是测试，只保留前两个相册任务
			//newTaskAlbums = newTaskAlbums.slice(0, 1);
			
            // 使用新的任务相册列表更新数据库记录
            await adminAutoTaskCollection.doc(task._id).update({
                task_albums: newTaskAlbums
            });
        }
		
		// 返回更新后的任务相册列表
        return newTaskAlbums;
    } catch (error) {
        console.error("更新任务相册列表失败：", error);
        throw error; // 重新抛出错误，以便调用者可以处理
    }
}

/**
 * 根据指定的任务ID启动相应的自动更新封面URL任务。
 * 
 * @param {string} startTaskId 要启动的任务的ID。
 * @returns {Promise<object>} 返回任务更新的结果，可能包含成功或失败的消息。
 */
async function updateCoverUrls(startTaskId = "") {
	try {
	    // 第一步：查询自动化任务
	    let task = await queryAutoTask(startTaskId)
		// 确保查询到了任务
		if (!task) {
			throw new Error(`未找到ID为 ${startTaskId} 的任务`);
		}
		
		// 第二步：根据任务状态执行相应逻辑
		if (task.status === "pending") {
			// 如果任务状态为pending（等待中），表示任务未开启，需要初始化任务
			const updatedTaskAlbums = await updateTaskAlbums(task); // 更新任务相册列表
			// 计算所有相册的文件总数量
			let totalAlbumFileCount = updatedTaskAlbums.reduce((total, album) => total + album.total_count, 0);
			
			// 找到第一个状态为pending的相册并开始执行
			const pendingAlbumIndex = updatedTaskAlbums.findIndex((album) => album.status === "pending");
			if (pendingAlbumIndex !== -1) {
			    updatedTaskAlbums[pendingAlbumIndex].status = "running"; // 将此相册状态设置为running（执行中）
			    const currentAlbumId = updatedTaskAlbums[pendingAlbumIndex].album_id; // 获取当前相册ID
				const currentAlbumFileTotalCount = updatedTaskAlbums[pendingAlbumIndex].total_count; // 获取当前相册ID文件总数量
				
			    // 更新任务状态为running，并更新相册列表和任务详情
			    await adminAutoTaskCollection.doc(task._id).update({
			        status: "running",
			        task_albums: updatedTaskAlbums,
					task_details: {
						album_id: currentAlbumId,
						cursor: "",
						has_more: 0,
						current_page: 1,
						total_count: currentAlbumFileTotalCount
					},
					task_album_file_total: totalAlbumFileCount,
					create_time: Date.now(), // 使用当前时间戳作为创建时间
					updated_time: Date.now() // 使用当前时间戳作为更新时间
			    });
				
				// 递归调用（默认传递cursor=""），代表这是从第一页开始的（文件数量: 0-100）
				//await updateCoverUrls(); // 递归调用自身，开始处理相册文件
				
				return { msg: "pending - 完成" }
				
			}
			
		} else if (task.status === "running") {
			// 如果任务状态为running（执行中），表示任务正在执行
			
			const { task_details: taskDetails } = task;// 第一步 中 拿到的 任务信息
			const currentAlbumId = taskDetails.album_id;
			const currentCursor = taskDetails.cursor; // 光标，用于请求下一页
			//const currentHasMore = taskDetails.has_more;
			
			// 加载相册文件
			let { data: loadData } = await loadAlbumFiles(currentAlbumId, currentCursor);
			// console.log('loadData', loadData)
			// 根据loadAlbumFileData进行后续处理...
			const albumFiles = loadData.list; // 相册文件列表
			// 请求下页时用到的
			const next_cursor = loadData.cursor; // 下一页的光标
			const next_has_more = loadData.has_more; // 是否还有更多数据 ? 1 还有更多、0 没有更多了
			
			
			const fileCount = albumFiles.length
			console.log('fileCount', fileCount)
			
			console.log('albumFiles.length', albumFiles.length)
			
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
						['thumburl.' + 0]: item.thumburl[1],
						extra_info: item.extra_info,
						duration_ms_long: item.category == 1 ? Math.floor(Number(item.extra_info.duration_ms)) : null
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
						},
						task_completed_file_count: dbCmd.inc(fileCount), // 当前页码的文件数量
						updated_time: Date.now() // 使用当前时间戳作为更新时间
					});
					
			        // 递归调用处理下一页
			        //await updateCoverUrls(next_cursor);
					
			    } else {
					// 准备下一个任务相册ID，直到所有的任务相册ID的status==completed，则更新adminAutoTaskCollection状态为status==completed
					// 所以这里其实还要先检查所有任务相册ID的status==completed，并更新adminAutoTaskCollection状态status==completed，再递归调用updateCoverUrls
					// 这是updateCoverUrls就会走到task.status === "completed"中（这部分的需求在对应处的注释中）
					
					
					// 如果当前相册处理完成，更新相册状态为completed（已完成）
					let updatedTaskAlbums = await updateTaskAlbums(task); // 更新任务相册列表
					const currentAlbumIndex = updatedTaskAlbums.findIndex(album => album.album_id === currentAlbumId);
					updatedTaskAlbums[currentAlbumIndex].status = 'completed';
					
					// 如果没有更多数据，更新任务详情
					await adminAutoTaskCollection.doc(task._id).update({
					    status: "completed",
						task_albums: updatedTaskAlbums,// 只有当前相册文件的封面全部更新完了，next_has_more==0才需要更新这个
						task_details: {
							album_id: "",
							cursor: "",
							has_more: 0,
							current_page: 0,
							total_count: 0
						},
						task_completed_file_count: dbCmd.inc(fileCount), // 当前页码的文件数量
						updated_time: Date.now() // 使用当前时间戳作为更新时间
					});
					
					
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
							},
							updated_time: Date.now() // 使用当前时间戳作为更新时间
						});
						
						await updateCoverUrls(); // 重新启动任务处理
						
					} else {
						// 如果还有未完成的相册，找到下一个pending的相册并更新状态为running，然后继续处理
						const nextPendingIndex = updatedTaskAlbums.findIndex(album => album.status === 'pending');
						if (nextPendingIndex !== -1) {
							updatedTaskAlbums[nextPendingIndex].status = "running";
							const nextAlbumId = updatedTaskAlbums[nextPendingIndex].album_id;
							const nextAlbumFileTotalCount = updatedTaskAlbums[nextPendingIndex].total_count;
							
							await adminAutoTaskCollection.doc(task._id).update({
								status: "running",
								task_albums: updatedTaskAlbums,// 只有当前相册文件的封面全部更新完了，next_has_more==0才需要更新这个
								task_details: {
									album_id: nextAlbumId,
									cursor: "",
									has_more: 0,
									current_page: 1,
									total_count: nextAlbumFileTotalCount
								},
								updated_time: Date.now() // 使用当前时间戳作为更新时间
							});
							
							// 这里不再需要自动递归，直接等待定时任务每次启动时自动执行。
							//await updateCoverUrls(); // 处理下一个pending的相册
							
						}
					}
					
					// 递归调用处理下一页
					//await updateCoverUrls(next_cursor);
					
				}
				
			} else {
				throw new Error('未能加载文件或找不到文件');
			}
			
			return { msg: "running - 完成" }
			
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
			let updatedTaskAlbums = await updateTaskAlbums(task); // 更新任务相册列表
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
					},
					updated_time: Date.now() // 使用当前时间戳作为更新时间
				});
				//await updateCoverUrls(); // 重新开始处理任务
			} else {
				console.log("所有相册都已完成")
				
				await adminAutoTaskCollection.doc(task._id).update({
					status: "completed",
					task_albums: updatedTaskAlbums.map(album => ({ ...album, status: 'pending' })), // 重置所有相册状态为pending
					task_details: {
						album_id: "",
						cursor: "",
						has_more: 0,
						current_page: 0,
						total_count: 0
					},
					create_time: Date.now(), // 使用当前时间戳作为创建时间
					updated_time: Date.now() // 使用当前时间戳作为更新时间
				});
				
				// 所有相册都已完成时，需要递归一个出去，让其进入循环
				return await updateCoverUrls()
				
				//return { msg: "所有相册都已完成" }
			}
			// 如果所有相册都已完成，并且没有新相册加入，则任务保持completed状态，等待下一次触发
			
			return { msg: "completed - 完成" }
		}
		
	} catch (error) {
	    console.error("任务更新过程中出现错误:", error); // 输出错误信息
	    return { error };
	}
}

// 遍历响应数据：首先，我们需要遍历从loadFiles函数获取的响应数据中的list数组，并对每一项进行数据库更新操作。
// 递归更新：我们将使用递归的方式来处理分页数据的更新，如果has_more为1，表示还有更多数据需要处理，我们将继续调用更新函数，并传递新的cursor值。

/**
 * 启动指定ID的自动更新封面URL任务。
 * 此函数将根据传入的任务ID来触发相应的自动化任务。
 * 如果任务ID不存在或任务无法启动，则会返回相应的错误。
 *
 * @param {string} startTaskId - 要启动的自动化任务的唯一标识ID。
 * @returns {Promise<object>} - 返回一个Promise对象，该对象在成功时解析为任务更新的结果，如果有错误发生则会拒绝。
 */
module.exports = async function (startTaskId) {
	// 公用模块用法请参考 https://uniapp.dcloud.io/uniCloud/cf-common
	let res = await updateCoverUrls(startTaskId); // 触发任务更新
	return res; // 返回任务更新结果
}


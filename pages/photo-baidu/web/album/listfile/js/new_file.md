# 全自动采集流程 - 采集每页任务流程
1. 请求文件列表 "https://photo.baidu.com/youai/album/v1/listfile" [ data[list] ]
2. 查询是否已关联云端 [ list[item] ]
3. 过滤掉已关联云端的 [ list[item] ]，并请求视频转码（视频流）"https://photo.baidu.com/youai/album/v1/streaming" ，如果状态是：视频飞速转码中，请稍后再来哦。则接口返回为JSON：{"errno":31341,"request_id":65528536080069544,"error_code":31341,"errmsg":"be transcoding, please wait and retry"}，如果转码已完成则接口返回String m3u8视频流：#EXTM3U\n#EXT-X-TARGETDURATION:15\n...
4. 过滤掉已关联云端的 [ list[item] ]，并同步到云端

以上就是我的需求，请求接口需要使用uni.request方法，但请帮我把uni.request方法封装为Promise的函数调用，这样我可以async await操作，你帮我把上面的需求写出来，函数名要有说明并且符合中国人的规范

## GPT4
为了实现您的全自动采集流程，我们将创建几个函数，每个函数都将执行流程的一个特定部分。我将提供这些函数的代码示例，并为每个函数添加适当的注释以说明其用途。这些函数将使用 uni.request 方法，并被封装为返回 Promise 的函数，以便可以使用 async/await 来处理异步操作。

1. 请求文件列表函数 - 从 "https://photo.baidu.com/youai/album/v1/listfile" 获取文件列表。

2. 查询是否已关联云端函数 - 检查列表中的每个文件是否已经关联到云端。

3. 请求视频转码函数 - 为尚未关联云端的视频文件请求转码。

4. 同步到云端函数 - 将过滤后的文件列表同步到云端。



当我正在全自动采集时，我需要向页面反馈，然而我写的反馈并不好，
先说一下我想改造的页面反馈，大致就是这样："正在采集第i页，正在查询关联云端第i页，正在请求转码第i页，正在同步云端第i页，共n页"，大致就是这样，但太啰嗦了，也不好。
然后我给你看看我之前的代码，你帮我优化优化代码和页面反馈的表达。
```
<view class="uni-group" style="justify-content: flex-start;">
	<view class="uni-title">
		<text>当前采集任务</text>
		<!-- 当前页 -->
		<text>{{ photobaidu.task.page.current }}</text>
		<text>/</text>
		<!-- 总页数 -->
		<text class="color-red">{{ photobaidu.task.page.total }}</text>
		<text>页</text>
		<!-- 采集任务状态 -->
		<text class="m-l-10">状态：{{ photobaidu.task.state.run ? '已完成' : '采集中'  }}</text>
	</view>
	<view class="uni-sub-title m-l-10">
		<text>无需更新：</text>
		<text class="color-blue">{{ photobaidu.task.state.need_not }}</text>
	</view>
	<view class="uni-sub-title m-l-10">
		<text>采集完成：</text>
		<text class="color-green">{{ photobaidu.task.state.finish }}</text>
	</view>
	<view class="uni-sub-title m-l-10">
		<text>采集失败：</text>
		<text class="color-red">{{ photobaidu.task.state.error }}</text>
	</view>
	<template>
		<view class="uni-title m-l-10">
			<text>视频转码任务</text>
		</view>
		<view class="uni-sub-title m-l-10">
			<text>无需转码：</text>
			<text class="color-blue">{{ photobaidu.task.state.need_not }}</text>
		</view>
		<view class="uni-sub-title m-l-10">
			<text>转码完成：</text>
			<text class="color-green">{{ photobaidu.task.state.finish }}</text>
			<text> / </text>
			<text class="color-red">{{ photobaidu.task.page.total }}</text>
		</view>
	</template>
	<button @click="ceshi">测试</button>
</view>
// data
photobaidu: {
	task: {// 采集任务
		page: {
			current: 0, // 当前页
			total: 0, // 总页
			data: {// 当前页的数据
				list: []// 相册文件列表
			}
		},
		state: {// 采集状态
			run: false,// 采集进行中
			need_not: 0,// 无需更新
			finish: 0, // 采集完成
			error: 0,// 采集失败
		}
	}
}
// methods
async ceshi() {
	this.fetchAll()// 测试成功
},
async fetchAll() {
	let hasMore = true;
	while (hasMore) {
		try {
			// 1. 请求文件列表函数 - 从 "https://photo.baidu.com/youai/album/v1/listfile" 获取文件列表。
			const response = await this.fetchFileList();
			
			if (response && response.list) {
				// 处理响应中的数据...
				// 更新状态或数据
				hasMore = response.has_more == 0 ? false : true;
				
				// 2. 查询是否已关联云端函数 - 检查列表中的每个文件是否已经关联到云端。
				await this.getCloudAlbumFileList(response.list);
				
				// 3. 请求视频转码函数 - 为尚未关联云端的视频文件请求转码。
				await this.requestVideoTranscoding();
				
				// 4. 同步到云端函数 - 将过滤后的文件列表同步到云端。 
				await this.syncToCloud(response.list)
				
				const task_page_current = this.photobaidu.task.page.current
				console.log(`Task ${task_page_current} page completed`) // 任务完成
				
			} else {// 请求失败
				hasMore = false; // 停止循环
			}
			
		} catch (error) {
		    console.error('Error during processing:', error);
		}
		
	}
},
/**
 * 请求文件列表。
 * 从 "https://photo.baidu.com/youai/album/v1/listfile" 获取文件列表。
 * 
 * @returns {Promise<Object>} 包含文件列表的 Promise 对象。
 */
async fetchFileList() {
	if (this.photobaidu.album.data.has_more == 0) {
		uni.showToast({
			title: '没有更多了'
		})
		return
	}
	
	// 采集页+1
	this.photobaidu.task.page.current += 1
	
	// 开始采集
	this.photobaidu.task.state.run = true
	
	const BASE_URL = "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com"
	const ROUTE = "/api/v1/photobaidu/"
	const FUN = "getAlbumListFile"
	
	// 配置项索引
	let configSelectIndex = this.photobaidu.config.selectValue
	let config = this.photobaidu.config.data[configSelectIndex]
	
	// 请求下页时的光标，为空获取第一页数据
	let cursor = this.photobaidu.album.data.cursor
	
	// 构造查询参数
	let querys = {
		clienttype: "70",// 客户端类型 70为Web
		bdstoken: config.bdstoken
	}
	
	// 相册id，用于采集当前相册的所有文件
	let album_id = this.photobaidu.album.album_id
	// 构造body<form-data>表单参数
	let formdatas = {
		cursor, // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
		album_id, // string
		need_amount: "1",// 默认 string
		limit: "100",// 每页100条（Web版默认）string
		passwd: ""// 默认 string
	}
	
	// 构造请求头
	let headers = {
		"Cookie": config.Cookie,
		"Host": config.Host,
		"Origin": config.Origin,
		"Referer": `${config.Referer}/${album_id}` // https://photo.baidu.com/photo/web/album=全部相册；不加相册id代表获取全部相册，加相册id代表获取指定id相册
	}
	
	this.loading = true
	return new Promise((resolve, reject) => {
		http({
			url: `${BASE_URL}${ROUTE}${FUN}`,
			method: 'POST',// 云对象方法，要用POST
			data: {
				querys,
				formdatas,
				headers
			}
		}).then(res => {
			//console.log('res', res)
			//console.log('File list:', res.data.lit);
			
			// 首先检查 res.data.data 是否存在且包含 list 属性
			if (!res.data.data || !res.data.data.list) {
				uni.showToast({
					title: '请求失败'
				})
			    reject(new Error('Request Error'));; // 如果不存在，直接返回
			}
			
			const { cursor, has_more, total_count, list } = res.data.data;
			
			// 为list中的每个项目添加自定义字段
			const updatedList = list.map(item => ({
				...item,
				file_type: item.category == 1 ? 'video' : 'image',
				bytes: formatFileSize(item.size),
				duration_format: item.category == 1 ? convertDuration(item.extra_info.duration_ms) : '',
				custom_info: {
					cover_upload_progress: 0, // 封面（图片）文件上传进度，默认为0
					is_bind_cloud: false, // 是否已关联云端，默认为false
				}
			}));
			
			// 更新相册文件数据，将新处理的项目添加到现有列表中
			this.photobaidu.album.data = {
				cursor,
				has_more,
				total_count,
				// 将更新后的 list 与原有 list 合并
				list: [...this.photobaidu.album.data.list, ...updatedList],
			};
			
			// 更新分页信息
			this.pagination.count = total_count
			
			// 计算总页数，每页100条。不足100条的部分也算作一整页。（比如201，为3页）
			this.photobaidu.task.page.total = Math.ceil(total_count / 100); // 每页100条
			// 记录需要同步云端的采集当前页数据
			this.photobaidu.task.page.data.list = updatedList;
			
			this.loading = false
			// 采集结束
			this.photobaidu.task.state.run = false
			
			resolve({
				has_more,
				list: updatedList
			})
			
		}).catch(error => {
			console.error('Error:', error);
			this.loading = false
			// 采集结束
			this.photobaidu.task.state.run = false
			reject(err)
		});
	})
},
/**
 * 请求视频转码。
 * 对未关联云端的视频文件进行批量转码请求。
 * 每个请求间隔200毫秒发送。
 * 第一个请求立即发送，第二个请求在200毫秒后发送，第三个请求在400毫秒后发送，依此类推。
 * 
 * @param {Array} fileList 文件列表。
 * @returns {Promise<Array>} 转码请求结果的 Promise 对象。
 */
async requestVideoTranscoding() {
	const fileList = this.photobaidu.album.data.list
	
	// 过滤掉已经关联云端的文件 [要转码的文件] category：1=视频、3=图片
	const filesToTranscode = fileList.filter(file => !file.custom_info.is_bind_cloud && file.category === 1);
	
	// 创建一个处理单个转码请求的函数
	const processTranscodingRequest = async (file, index) => {
		return new Promise((resolve, reject) => {
			setTimeout(async () => {
				try {
					const response = await this.requestTranscoding(file);
					console.log(`File ${index} id ${file.fsid} transcoding completed`);
					resolve(response); // 转码成功
				} catch (error) {
					console.error(`Error in transcoding file ${file.fsid}:`, error);
					reject(error); // 转码失败
				}
			}, 200 * index); // 每个请求间隔200毫秒
		});
	};
	
	// 批量请求转码
	try {
		const transcodingPromises = filesToTranscode.map((file, index) => processTranscodingRequest(file, index));
		const transcodingResults = await Promise.all(transcodingPromises);
		console.log('Transcoding results:', transcodingResults);// 全部转码完成
	} catch (error) {
		console.error('Error during video transcoding:', error);
	}
	
	
	// 从文件列表中过滤掉"item.custom_info.is_bind_cloud = true;// 已关联云端的文件"
	// 然后开始批量转码
	
	
	// 这里需要实现对未关联云端视频文件的转码请求逻辑
	// 假设我们有一个函数 requestTranscoding() 来请求视频转码
	// 以下为示例实现
	// return Promise.all(fileList.map(file => requestTranscoding(file)));
},
/**
 * 请求视频文件转码。
 * 
 * @param {Object} file 文件对象。
 * @returns {Promise<Object>} 转码请求的 Promise 对象。
 */
async requestTranscoding(file) {
	const BASE_URL = "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com"
	const ROUTE = "/api/v1/photobaidu/"
	const FUN = "streaming"
	
	// 配置项索引
	let configSelectIndex = this.photobaidu.config.selectValue
	let config = this.photobaidu.config.data[configSelectIndex]
	
	// 相册id
	let album_id = this.photobaidu.album.album_id || file.album_id
	
	// 构造查询参数
	let querys = {
		fsid: file.fsid.toString(),// 必须string类型
		album_id: file.album_id,// 必须string类型
		uk: file.uk.toString(),// 必须string类型
		tid: file.uk// 必须string类型
	}
	
	// 构造请求头
	let headers = {
		"Cookie": config.Cookie,
		"Host": config.Host,
		"Origin": config.Origin,
		"Referer": `${config.Referer}/${album_id}` // https://photo.baidu.com/photo/web/album=全部相册；不加相册id代表获取全部相册，加相册id代表获取指定id相册
	}
	
    return new Promise((resolve, reject) => {
		http({
			url: `${BASE_URL}${ROUTE}${FUN}`,
			method: 'POST',// 云对象方法，要用POST
			data: {
				querys,
				headers
			}
		})
		.then((res) => {
			if (res.statusCode === 200) {
			    resolve(file);
			} else {
			    reject(new Error(`Failed to request transcoding for file ${file.fsid}`));
			}
		})
		.catch((error) => {
			reject(err)
		})
    });
}


```
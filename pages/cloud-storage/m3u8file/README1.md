下面是我的uniCloud客户端代码
```javascript
// 删除已失效的m3u8文件
async deleteExpiredM3u8Files() {
	// 显示加载提示
	uni.showLoading({
		title: "查询文件"
	});

	// 10小时前的时间戳
	const oneDayAgoTimestamp = parseInt(Date.now() - 10 * 60 * 60 * 1000)

	console.log('oneDayAgoTimestamp', oneDayAgoTimestamp)

	// 查询所有已失效的m3u8文件记录
	let {
		result: {
			total: expiredFilesTotal
		}
	} = await invalidM3u8FilesCollection.where({
		create_date: dbCmd.lt(oneDayAgoTimestamp) // 小于当前时间戳减去一天的毫秒数
	}).count()

	// 计算需要删除的文件总数
	console.log(`已失效的文件总数：${expiredFilesTotal}`);

	// 如果存在已失效的文件，进行分页查询并删除
	if (expiredFilesTotal > 0) {
		const MAX_LIMIT = 1000; // 假设每次查询的最大数量
		let allExpiredFiles = [];

		// 分页查询所有已失效的记录
		for (let i = 0; i < expiredFilesTotal; i += MAX_LIMIT) {

			// 当前第i页的数据
			console.log(`失效文件：当前第${i / MAX_LIMIT + 1}页`);

			const {
				result: {
					data: expiredFilesBatch
				}
			} = await invalidM3u8FilesCollection.where({
					create_date: dbCmd.lt(oneDayAgoTimestamp) // 小于当前时间戳减去一天的秒数
				})
				.field({
					_id: true,
					invalid_m3u8_file_url: true
				})
				.skip(i).limit(MAX_LIMIT).get();

			allExpiredFiles = allExpiredFiles.concat(expiredFilesBatch);

		}
		console.log('所有已失效文件:', allExpiredFiles, allExpiredFiles.length);


		// 提取所有已失效的记录中的 invalid_m3u8_file_url 字段
		const filesToDelete = allExpiredFiles.map(file => file.invalid_m3u8_file_url);

		// 调用云函数删除文件
		const deleteResult = await this.deleteFilesFromCloud(filesToDelete);

	}

	// 隐藏加载提示
	uni.hideLoading();

	console.log("所有文件删除完成。");
	uni.showToast({
		title: "所有文件删除完成。",
		icon: 'none'
	});
},
// 云存储文件删除函数
async deleteFilesFromCloud(fileUrls) {
	// No more than 50 files at a time. | 一次不超过50个文件。

	const BATCH_SIZE = 50; // 每批最多处理的文件数量
	const totalFiles = fileUrls.length; // 总文件数
	const totalPages = Math.ceil(totalFiles / BATCH_SIZE); // 总页数

	// 显示加载提示
	uni.showLoading({
		title: "正在删除文件..."
	});

	for (let i = 0; i < totalPages; i++) {
		console.log(`正在删除第 ${i + 1} 页文件，共 ${totalPages} 页`);
		uni.showToast({
			title: `正在删除第 ${i + 1} 页文件，共 ${totalPages} 页`,
			icon: 'none',
			duration: 3500
		});

		// 获取当前批次的文件URLs和对应的记录
		const startIndex = i * BATCH_SIZE;
		const endIndex = (i + 1) * BATCH_SIZE;
		const batchFileUrls = fileUrls.slice(startIndex, endIndex);

		try {
			// 1. 删除云存储文件
			const {
				result
			} = await uniCloud.callFunction({
				name: 'deleteM3U8File',
				data: {
					fileList: batchFileUrls
				}
			});

			// 2. 删除对应的数据库记录
			const {
				result: dbResult
			} = await invalidM3u8FilesCollection.where({
				invalid_m3u8_file_url: dbCmd.in(batchFileUrls)
			}).remove();

			console.log(`第 ${i + 1} 页处理结果:`, {
				'云存储删除数量': result.fileList.length,
				'数据库删除数量': dbResult.deleted
			});

			uni.showToast({
				title: `第 ${i + 1} 页删除完成`,
				icon: 'none'
			});

		} catch (error) {
			console.error(`第 ${i + 1} 页文件删除失败:`, error.message);
			uni.showToast({
				title: `第 ${i + 1} 页文件删除失败: ${error.message}`,
				icon: "none"
			});
			throw error; // 可以选择抛出错误或者继续删除剩余文件
		}
	}
}
```
现在的删除文件的代码太慢了，假设有5000个文件，就是500页，要等很长时间，所以我现在需要你帮我做成并发的，最后能控制并发的数量，你需要集合deleteExpiredM3u8Files和deleteFilesFromCloud去改写（意思是你写到新方法里面，便于我拿过来直接测试行不行，因为我不想先改目前的代码，我怕万一你写的也有问题呢？）

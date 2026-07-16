/**
 * 要实现批量下载文件并更新 albumList 的功能，
 * 你可以编写一个函数来处理下载任务，
 * 并在下载完成后更新 albumList。以下是一个示例实现：
 */

/* // 定义批量下载函数
async function handleDownloadFiles(fileList, onProgress) {
    for (let i = 0; i < fileList.length; i++) {
        const item = fileList[i];
        const url = item.cover_info.thumburl[1]; // 获取文件路径

        // 创建下载任务
        const downloadTask = uni.downloadFile({
            url: url,
            success: (res) => {
                if (res.statusCode === 200) {
                    console.log(`File ${i} downloaded successfully.`);
                    // 更新下载文件的本地路径
                    item.localPath = res.tempFilePath;
                }
            }
        });

        // 监听下载进度
        downloadTask.onProgressUpdate((res) => {
            console.log(`Downloading file ${i}: ${res.progress}%`);
            if (onProgress) {
                onProgress(i, res.progress); // 调用进度回调
            }
        });

        // 等待下载完成
        await new Promise(resolve => downloadTask.onProgressUpdate(resolve));
    }
} */



// 定义批量下载文件的函数
async function downloadFiles(fileList, onProgress) {
    // 下载单个文件的函数
    function downloadSingleFile(file, index) {
		// 如果文件已经下载，则直接返回已有的文件信息
		if (file.custom_info && file.custom_info.cover_download_progress == 100) {
			console.log(`跳过 File ${index} is 100% downloaded. 文件已下载自动跳过`);// 云端已存在，会自动为cover_download_progress==100，用与这里跳过下载
			return Promise.resolve(file); // 已下载的文件不需要重新下载
		}
		
        return new Promise((resolve, reject) => {
            const downloadTask = uni.downloadFile({
                url: file.cover_info.thumburl[1],
                success: (res) => {
                    if (res.statusCode === 200) {
                        // 更新文件的本地路径
						file.localPath = res.tempFilePath;  // 确保这里正确设置了本地路径
						resolve({ ...file, localPath: res.tempFilePath });
                    } else {
                        reject(new Error(`Download failed with status code: ${res.statusCode}`));
                    }
                },
                fail: (err) => reject(err)
            });

            downloadTask.onProgressUpdate((res) => {
                if (onProgress) {
                    onProgress(index, res.progress);
                }
            });
        });
    }

    // 使用 Promise.all 来同时下载所有文件
    const updatedFileList = await Promise.all(
        fileList.map((file, index) => downloadSingleFile(file, index))
    );

    return updatedFileList;
}

// 使用示例
async function handleDownloadFiles(fileList, onProgress) {
    try {
        const updatedFileList = await downloadFiles(fileList, onProgress);
        return updatedFileList; // 返回更新后的文件列表
    } catch (error) {
        console.error('Error downloading files:', error);
        throw error; // 向外抛出异常
    }
}

/* 
  // 使用 handleDownloadFiles 函数
  await handleDownloadFiles(fileList, (index, progress) => {
      console.log(`File ${index} is ${progress}% downloaded.`);
      // 更新进度条
      this.photobaidu.album.data.list[index].custom_info.cover_download_progress = progress;
  }).then((resList) => {
      console.log('All files downloaded');
      // 处理下载后的操作，例如更新列表
  }).catch(error => {
      console.error('Error during file download:', error);
  }); 
 */

export {
	handleDownloadFiles
}

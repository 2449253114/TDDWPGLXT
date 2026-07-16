// 批量上传文件到云存储
function uploadCloudFiles(fileList, onProgress) {
    // 上传单个文件的函数
    function uploadSingleFile(file, index) {		
		// 如果已经上传，则跳过
		if (file.custom_info.cover_upload_progress == 100) {
			console.log(`跳过 File ${index} is 100% uploaded. 文件已上传自动跳过`);
			return Promise.resolve({ ...file }); // 使用 Promise.resolve 来返回一个立即解析的 promise
		}
		
		// 如果之前已经上传，是不存在localPath字段的
		if (file && !file.localPath) {
			console.log(`跳过 File ${index} is 100% uploaded. 文件已上传自动跳过`);
			return Promise.resolve({ ...file }); // 使用 Promise.resolve 来返回一个立即解析的 promise
		}
		
		// 生成随机字符串（长度在 35 到 60 之间）
		const randomString = generateRandomString(35, 60); // 生成长度在 35 到 60 之间的随机字符串
		
		// 由于"一刻相册"网络图片路径并没有后缀，所以需要自己增加
		const fileExtension = '.jpg';
		// 云端路径  [ 如果file.notice为空，会导致上传不了文件，因为路径错误 格式为： notice// ，所以必须手动设置一个 ] 
		const cloudPath = `uploads/photobaidu/covers/notice/${file.notice ? file.notice : '未设置' }/${randomString}_file_${file.title}_album_id_${file.album_id}_${fileExtension}`;
		
				
		// 开始上传
        return uniCloud.uploadFile({
			// thumburl [0] 缩略图、[1] 原图大图
            //filePath: file.cover_info.thumburl[1],// 本地文件路径
			filePath: file.localPath,// 本地文件路径
            cloudPath: cloudPath, // 这里设置云端路径 
			cloudPathAsRealPath: true,// 是否以cloudPath作为云端文件绝对路径
            onUploadProgress: function(progressEvent) {
                // 处理上传进度
                var percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
				// 如果提供了 onProgress 回调，则调用它更新进度
                if (onProgress) {
                    onProgress(index, percentCompleted); // 回调上传进度
                }
            }
        }).then(res => {
			// 上传成功后，将 file.cover_info.thumburl[1] 更新为云端文件ID
			file.cover_info.thumburl[1] = res.fileID;
			return { ...file };
			// 注意：这里假设 thumburl 是一个数组，且我们只更新 thumburl[1]
        }).catch(err => {
			// policy does not allow file_overwrite: 2.webp   策略不允许文件重写：2.webp
			// 也就说不允许出现重命名的文件，出现重命名的文件不会上传，而是直接失败。所以需要随机生成35-60位数字和字母的组合拼接在文件名中
			
			console.log('uni.uploadFile.err', err);
            return { ...file, errMsg: err.errMsg || err.message }; // 上传失败，返回错误信息
        });
    }

    // 使用 Promise.all 来同时上传所有文件
    return Promise.all(fileList.map((file, index) => uploadSingleFile(file, index)));
}

// 生成指定长度范围的随机字母和数字组合的字符串
function generateRandomString(minLength, maxLength) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

// 使用示例
async function handleUploadFiles(fileList, onProgress) {
    try {
        const updatedFileList = await uploadCloudFiles(fileList, onProgress);
        return updatedFileList; // 返回更新后的文件列表
    } catch (error) {
        console.error('Error uploading files:', error);
        throw error; // 向外抛出异常
    }
}


/* 
在这个示例中，`uploadSingleFile` 函数接收当前文件和它在列表中的索引。在 `onUploadProgress` 回调中，它计算当前上传的百分比，并调用 `onProgress` 回调函数，传递文件的索引和上传百分比。

您可以这样使用这个函数：

```javascript
await handleUploadFiles(this.tempFileList, (index, progress) => {
    console.log(`File ${index} is ${progress}% uploaded.`);
    // 这里更新您的进度条，例如：
    // this.tempFileList[index].uploadProgress = progress;
}).then(updatedList => {
    this.tempFileList = updatedList; // 更新 tempFileList
}).catch(error => {
    console.error('Error during file upload:', error);
});
```

在这里，`handleUpload` 的第二个参数是一个处理进度的回调函数，它将在每个文件的上传进度更新时被调用。您可以在这个回调中更新您的进度条或执行其他与进度相关的操作。 
 */

export {
	handleUploadFiles
}


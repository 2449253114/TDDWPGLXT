/**
 * 批量上传文件到云存储
 * @param {Array} fileList - 待上传的文件列表
 * @param {Function} onProgress - 上传进度回调函数
 * @returns {Promise<Array>} - 上传结果的 Promise
 */
function uploadCloudFiles(fileList, onProgress) {
    /**
	 * 上传单个文件的函数
	 * @param {Object} file - 待上传的文件对象
	 * @param {number} index - 文件在 fileList 中的索引
	 * @param {number} retryCount - 当前重试次数，默认为 0
	 * @returns {Promise<Object>} - 上传结果的 Promise
	 */
    function uploadSingleFile(file, index, retryCount = 0) {
		// 如果已经上传，则跳过
		if (file.url != "") {
		    console.log(`跳过 File ${index} is 100% uploaded. 文件已上传自动跳过`);
		    return Promise.resolve({ ...file }); // 使用 Promise.resolve 来返回一个立即解析的 promise
		}
		
		// 生成随机字符串（长度在 35 到 60 之间）
		const randomString = generateRandomString(35, 60); // 生成长度在 35 到 60 之间的随机字符串
		
		// 云端路径
		const cloudPath = 'uploads/reading/' + randomString + '_file_' + file.name;
		
		// 开始上传
        return uniCloud.uploadFile({
            filePath: file.path,// 本地文件路径
            cloudPath: cloudPath, // 这里设置云端路径
			fileType: file.selectFileType, // 文件类型，支付宝小程序、钉钉小程序必填，可选image、video、audio
			cloudPathAsRealPath: true,// 是否以cloudPath作为云端文件绝对路径
            onUploadProgress: function(progressEvent) {
                // 处理上传进度
                var percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                if (onProgress) {
                    onProgress(index, percentCompleted); // 回调上传进度
                }
            }
        }).then(res => {
            return { ...file, url: res.fileID, thumburl: ["https://xxx.com", res.fileID] }; // 上传成功，返回带有 url 的文件对象
        }).catch(err => {
			// policy does not allow file_overwrite: 2.webp   策略不允许文件重写：2.webp
			// 也就说不允许出现重命名的文件，出现重命名的文件不会上传，而是直接失败。所以需要随机生成35-60位数字和字母的组合拼接在文件名中
			
			// 如果是策略不允许文件重写错误，或者重试次数达到上限，则返回失败信息
			if (
				err.errCode === 10007 /* policy does not allow file_overwrite */ ||
				retryCount === 3 // 可重试上传3次
			) {
				console.log('uni.uploadFile.err', err);
				return { ...file, errMsg: err.errMsg || err.message }; // 上传失败，返回错误信息
			}
			// 打印重试提示
			console.log(`重试上传 File ${index}, 重试次数: ${retryCount + 1}`);
            // 否则，重试上传
            return uploadSingleFile(file, index, retryCount + 1);
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
this.handleUploadFiles(this.tempFileList, (index, progress) => {
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
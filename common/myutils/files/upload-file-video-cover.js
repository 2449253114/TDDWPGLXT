// 批量上传文件到云存储
function uploadCloudFilesCover(fileList, onProgress) {
    // 上传单个封面文件的函数
    function uploadSingleCover(file, index) {
        if (file.file_type !== "video" || file.cover_url.startsWith('http')) {
            return Promise.resolve({ ...file }); // 如果不是视频类型或已有URL，直接返回
        }

        // 生成随机字符串（长度在 35 到 60 之间）
        const randomString = generateRandomString(35, 60); // 生成长度在 35 到 60 之间的随机字符串

        // 云端路径
        const cloudPath = 'covers/' + randomString + '_cover_' + file.name; // 假设封面是jpg格式

        // 开始上传封面
        return uniCloud.uploadFile({
            filePath: file.cover_url, // 本地封面文件路径
            cloudPath: cloudPath, // 云端路径
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
            return { ...file, cover_url: res.fileID }; // 上传成功，更新cover_url
        }).catch(err => {
            console.log('uni.uploadFile.err', err);
            return { ...file, errMsg: err.errMsg || err.message }; // 上传失败，返回错误信息
        });
    }

    // 使用 Promise.all 来同时上传所有封面
    return Promise.all(fileList.map((file, index) => uploadSingleCover(file, index)));
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
async function handleUploadCovers(fileList, onProgress) {
    try {
        const updatedFileList = await uploadCloudFilesCover(fileList, onProgress);
        return updatedFileList; // 返回更新后的文件列表
    } catch (error) {
        console.error('Error uploading covers:', error);
        throw error; // 向外抛出异常
    }
}

/* 
 在这个修改中，`uploadCloudFiles` 函数检查每个文件项的 `selectFileType` 是否为 "video"，并且 `cover_url` 是否不是一个 HTTP URL。如果是视频类型且 `cover_url` 不是 URL，则上传封面图片。在上传成功后，`cover_url` 字段更新为上传文件的 `fileID`。
 
 您可以调用 `handleUploadCovers` 方法来上传所有视频的封面，并获取更新后的文件列表：
 
 ```javascript
 this.handleUploadCovers(this.fileList, (index, progress) => {
     console.log(`Cover ${index} is ${progress}% uploaded.`);
     // 更新进度条逻辑
 }).then(updatedList => {
     this.fileList = updatedList; // 更新 fileList
 }).catch(error => {
     console.error('Error during cover upload:', error);
 });
 */

export {
	handleUploadCovers
}
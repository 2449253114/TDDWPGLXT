/* 需要将list.vue里最新的上传文件代码迁移至这里 */

import { generateRandomString } from './comm.js'

/**
 * 获取适当的文件路径。
 *
 * @param {object} file 文件对象。
 * @returns {string} 返回文件的正确路径。
 * 
 * https://photo.baidu.com/youai/album/v1/list《全部相册》相册文件封面 = file.cover_info.thumburl[1]
 * https://photo.baidu.com/youai/album/v1/listfile《相册文件》 文件封面 = file.thumburl[1]
 * 
 */
function getFilePath(file) {
    if (file.cover_info && file.cover_info.thumburl && file.cover_info.thumburl[1]) {
		// 兼容一刻相册 > 相册
        return file.cover_info.thumburl[1];
    } else if (file.thumburl && file.thumburl[1]) {
		// 兼容一刻相册 > 文件
        return file.thumburl[1];
    } else if (file.covers && file.covers[0].thumb) {
		// 兼容一刻相册 > 人物
		return file.covers[0].thumb
	}else {
        return ''; // 或返回一个默认的文件路径
    }
}

/**
 * 获取处理后的文件标题或FSID。
 * 
 * @param {Object} file - 包含 title 或 fsid 属性的文件对象。
 * @returns {String} 处理后的标题或FSID。
 * 
 * https://photo.baidu.com/youai/album/v1/list《全部相册》return = file.title
 * https://photo.baidu.com/youai/album/v1/listfile《相册文件》 return = file.fsid
 * 
 */
function getTitleOrFsid(file) {
    if (file.title) {
        // 如果 title 字段存在，则使用 title 并移除其中的所有空格
        return file.title.replace(/\s/g, '');
    } else if (file.fsid) {
        // 如果 title 字段不存在，但 fsid 字段存在，则直接使用 fsid
        return file.fsid;
    } else {
        // 如果两者都不存在，可以设定一个默认值或处理错误, 或生成一个10到30位的随机字母数字组合
        return generateRandomString(10, 30); // 生成长度在 10 到 30 之间的随机字符串
    }
}

/**
 * 更新文件对象的 thumburl 属性。
 * 此函数根据 file 对象中存在的字段来更新其 thumburl 属性。
 * 如果 file.cover_info.thumburl[1] 存在，则更新这个属性。
 * 否则，如果 file.thumburl[1] 存在，则更新这个属性。
 * 这个函数只更新 thumburl 属性，不修改 file 对象的其他属性。
 * 
 * @param {Object} file - 包含 thumburl 属性的文件对象。
 * @param {String} newUrl - 新的 URL 字符串。<res.fileID>
 * @returns {Object} 更新后的文件对象。
 * 
 * https://photo.baidu.com/youai/album/v1/list《全部相册》 file.cover_info.thumburl[1] = newUrl
 * https://photo.baidu.com/youai/album/v1/listfile《相册文件》 file.thumburl[1] = newUrl
 * 
 */
function updateThumbUrl(file, newUrl) {
    if (file.cover_info && file.cover_info.thumburl && file.cover_info.thumburl.length > 1) {
        // 更新 file.cover_info.thumburl[1]
        file.cover_info.thumburl[1] = newUrl;
    } else if (file.thumburl && file.thumburl.length > 1) {
        // 更新 file.thumburl[1]
        file.thumburl[1] = newUrl;
    } else if (file.covers && file.covers[0].thumb) {
		// 兼容一刻相册 > 人物
		file.covers[0].thumb = newUrl
	}
    return file;
}

// 使用示例
//const updatedFile = updateThumbUrl(file, res.fileID); // 假设 res.fileID 是新的 URL

async function uploadSelectedAlbums(selectedAlbums, onProgress) {
	const uploadPromises = selectedAlbums.map((file, index) => {
		return new Promise((resolve, reject) => {
			// 如果已经上传，则跳过
			if (file.custom_info.cover_upload_progress == 100) {
				console.log(`跳过 File ${index} is 100% uploaded. 文件已上传自动跳过`);
				return resolve({ ...file }); // 使用 Promise.resolve 来返回一个立即解析的 promise
			}

			// 生成随机字符串（长度在 35 到 60 之间）
			const randomString = generateRandomString(15, 30); // 生成长度在 35 到 60 之间的随机字符串
			
			// 由于"一刻相册"网络图片路径并没有后缀，所以需要自己增加
			const fileExtension = '.jpg';
			const fileTitle = getTitleOrFsid(file); // 移除file.title中的所有空格
			const fileNotice = 'repeal';// 暂时废弃，因为notice里面可能包含t.me/xxx这样的链接 //file.notice ? file.notice : '未设置'
			// 云端路径  [ 如果file.notice为空，会导致上传不了文件，因为路径错误 格式为： notice// ，所以必须手动设置一个 ] 
			//const cloudPath = `uploads/photobaidu/covers/notice/${fileNotice}/${randomString}_file_title_${fileTitle}_album_id_${file.album_id}_${fileExtension}`;
			// 云端路径  [新] 同时兼容 “相册列表” 和 “相册文件列表” 两个接口的全部文件
			//const cloudPath = `uploads/photobaidu/covers/album_id/${file.album_id}/notice_${fileNotice}_${randomString}_file_title_${fileTitle}_${fileExtension}`;
			
			// 云端路径  [新] 兼容所有接口，这里采用随机
			const cloudPath = `uploads/photobaidu/covers/${randomString}_title_${fileTitle}${fileExtension}`;
			
			// 使用 getFilePath 函数获取正确的文件路径
			const filePath = getFilePath(file);
			
			// 开始上传
			uniCloud.uploadFile({
				// thumburl [0] 缩略图、[1] 原图大图
				filePath: filePath ,// 本地文件路径
				//cloudPath: `${cloudPath}.jpg`, // 这里设置云端路径 
				cloudPath: cloudPath,
				cloudPathAsRealPath: true,// 是否以cloudPath作为云端文件绝对路径
				fileType: 'image',
				onUploadProgress: function(progressEvent) {
					// 处理上传进度
					const percentCompleted = Math.round(
						(progressEvent.loaded * 100) / progressEvent.total
					);
					console.log(`File ${index} progress: ${percentCompleted}%`);
					// 如果提供了 onProgress 回调，则调用它更新进度
					if (onProgress) {
						onProgress(index, percentCompleted); // 回调上传进度
					}
				},
				success(res) {
					console.log(`File ${index} uploaded:`, res.fileID);					
					// 上传成功后，将 file.cover_info.thumburl[1] 更新为云端文件ID
					//file.cover_info.thumburl[1] = res.fileID;// 阿里云空间fileID为文件直连
					
					const updatedFile = updateThumbUrl(file, res.fileID);
					
					resolve({ ...updatedFile });
					// 注意：这里假设 thumburl 是一个数组，且我们只更新 thumburl[1]
				},
				fail(err) {
					// policy does not allow file_overwrite: 2.webp   策略不允许文件重写：2.webp
					// 也就说不允许出现重命名的文件，出现重命名的文件不会上传，而是直接失败。所以需要随机生成35-60位数字和字母的组合拼接在文件名中
					console.error(`File ${index} upload error:`, err);
					// 失败时拒绝错误
					reject({ ...file, errMsg: err.errMsg || err.message }); // 上传失败，返回错误信息
				},
			});
		});
	});
	
	// 使用 Promise.all 来同时上传所有文件
	return Promise.all(uploadPromises);
}

// 批量上传相册文件封面到云储存的函数
function handleUploadFiles(fileList, onProgress) {
	return new Promise((resolve, reject) => {
		uploadSelectedAlbums(fileList, onProgress)
			.then(fileIDs => {
				// 处理所有文件上传成功的情况
				console.log('All files uploaded:', fileIDs);
				resolve(fileList); // 返回更新后的 fileList
			})
			.catch(error => {
				// 处理上传过程中的任何错误
				console.error('Error during file upload:', error);
				reject(error);
			});
	});
}

/*
// 使用函数示例
handleUploadFiles(selectedAlbums, (index, progress) => {
    console.log(`Album ${index} is ${progress}% uploaded.`);
    // 更新进度条
    this.photobaidu.album.data.list[index].custom_info.cover_upload_progress = progress;
})
.then(updatedList => {
    console.log('All files uploaded');
    // 处理上传后的操作，例如更新列表
})
.catch(error => {
    console.error('Error during file upload:', error);
});
 */

export {
	handleUploadFiles
}
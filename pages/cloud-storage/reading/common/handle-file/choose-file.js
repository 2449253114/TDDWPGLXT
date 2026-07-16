'use strict';

// 封装选择视频的函数
function chooseVideo() {
    return new Promise((resolve, reject) => {
        uni.chooseVideo({
            sourceType: ['camera', 'album'],
            //extension: [''] // Array<String> 根据文件拓展名过滤，每一项都不能是空字符串。默认不过滤。
            compressed: false, // 是否压缩所选的视频源文件，默认值为 true，需要压缩。
            success: (res) => {
				/*
				 success 返回参数说明
				 
				 参数	类型	说明	平台差异
				 tempFilePath	String	选定视频的临时文件路径	
				 tempFile	File	选定的视频文件	仅H5（2.6.15+）支持
				 duration	Number	选定视频的时间长度，单位为 s	APP 2.1.0+、H5、微信小程序、京东小程序
				 size	Number	选定视频的数据量大小	APP 2.1.0+、H5、微信小程序、京东小程序
				 height	Number	返回选定视频的高	APP 2.1.0+、H5、微信小程序、京东小程序
				 width	Number	返回选定视频的宽	APP 2.1.0+、H5、微信小程序、京东小程序
				 name	String	包含扩展名的文件名称	仅H5支持
				 */
				const {
					tempFile: tempFileH5, // 将 tempFile 重命名为 tempFileH5
					name: nameH5,
					tempFilePath,
					duration,
					size,
					height,
					width
				} = res;
				
				// 计算宽高比例并判断方向
				const ratio = res.width / res.height;
				let orientation;
				if (ratio > 1.2) {
					orientation = 'row'; // 宽度大于高度
				} else if (ratio < 0.8) {
					orientation = 'column'; // 高度大于宽度
				} else {
					orientation = 'equal'; // 接近正方形
				}

				// 添加到返回结果中
				res.file_cover_orientation = orientation;
				
                resolve(res);
            },
            fail: (err) => {
                reject(err);
            }
        });
    });
}

// 封装获取视频信息的函数
function getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
        uni.getVideoInfo({
            src: filePath,// 视频文件路径，可以是临时文件路径也可以是永久文件路径（不支持网络地址）
            success: (res) => {
				/*
				 success 返回参数说明
				 
				 参数名	类型	说明	平台差异说明
				 orientation	string	画面方向	微信小程序、App（3.1.14+）
				 type	string	视频格式	微信小程序、App（3.1.14+）
				 duration	number	视频长度	微信小程序、App（3.1.10+）、H5
				 size	number	视频大小，单位 kB	微信小程序、App（3.1.10+）、H5
				 height	number	视频的长，单位 px	微信小程序、App（3.1.10+）、H5
				 width	number	视频的宽，单位 px	微信小程序、App（3.1.10+）、H5
				 fps	number	视频帧率	微信小程序、App（3.1.14+）
				 bitrate	number	视频码率，单位 kbps	微信小程序、App（3.1.14+）
				 */
                resolve(res);
            },
            fail: (err) => {
                reject(err);
            }
        });
    });
}

async function selectVideo() {
    try {
        const videoSelection = await chooseVideo();
        const videoInfo = await getVideoInfo(videoSelection.tempFilePath);

        // 创建视频详情对象
        return {
            path: videoSelection.tempFilePath,
			url: '', // 网络地址（返回给外面使用）
            duration: videoSelection.duration,
            size: videoSelection.size,
            height: videoSelection.height,
            width: videoSelection.width,
			orientation: videoInfo.orientation,
			cover_url: '',
			name: videoSelection.name ? videoSelection.name : extractFileNameAndExtension(videoSelection.tempFilePath).fileName,
            type: videoInfo.type ? videoInfo.type : 'video/' + extractFileNameAndExtension(videoSelection.tempFilePath).extension,
            fps: videoInfo.fps,
            bitrate: videoInfo.bitrate,
			selectFileType: 'video',
			content: '' // 文件描述（返回给外面使用）
        };
    } catch (error) {
        console.error("Error in selecting or retrieving video info:", error);
    }
}

/* 
	// 临时文件列表
	let tempFileList = [];

	// 调用 selectVideo 函数并处理结果
	selectVideo().then(videoDetails => {
		if (videoDetails) {
			tempFileList.push(videoDetails);
		}
	}).catch(error => {
		console.error("Error in processing video:", error);
	}); 
 */


// 封装选择图片的函数
function chooseImage() {
    return new Promise((resolve, reject) => {
        uni.chooseImage({
            count: 9, // 默认9
            sizeType: ['original'], // 可以指定是原图还是压缩图，默认二者都有
            sourceType: ['album'], // 从相册选择
            success: (res) => {
				/*
				 success 返回参数说明
				 
				 参数	类型	说明
				 tempFilePaths	Array<String>	图片的本地文件路径列表
				 tempFiles	Array<Object>、Array<File>	图片的本地文件列表，每一项是一个 File 对象
				 File 对象结构如下
				 
				 参数	类型	说明
				 path	String	本地文件路径
				 size	Number	本地文件大小，单位：B
				 name	String	包含扩展名的文件名称，仅H5支持
				 type	String	文件类型，仅H5支持
				 */
                resolve(res);
            },
            fail: (err) => {
                reject(err);
            }
        });
    });
}
/**
 * 封装获取图片详细信息的函数
 * @param {string} path - 图片路径
 * @returns {Promise<Object>} - 包含图片详细信息的 Promise 对象
 */
function getImageInfo(path) {
    return new Promise((resolve, reject) => {
        uni.getImageInfo({
            src: path,
            success: (res) => {
				/*
				success 返回参数说明
				
				参数名	类型	说明	平台差异说明
				width	Number	图片宽度，单位px	
				height	Number	图片高度，单位px	
				path	String	返回图片的本地路径	
				orientation	String	返回图片的方向，有效值见下表	App、小程序、京东小程序
				type	String	返回图片的格式	App、小程序、京东小程序
				 */
                resolve(res);
            },
            fail: (err) => {
                //reject(err);
				// 处理异常情况，返回一个默认的图片信息，即使某些图片信息获取失败，整个 Promise 也会正常返回，不会因为一个失败而导致整个 Promise 失败。
				console.error(`Error in getting image info for ${path}:`, err);
				resolve({
					width: 0,
					height: 0,
					path: path
				});
            }
        });
    });
}

/**
 * 获取默认的图片信息数组，这个是直接写死，不通过getImageInfo获取
 * @param {Array} files - 文件数组
 * @returns {Array} - 默认的图片信息数组
 */
function getDefaultImageDetails(files) {
    return files.map(file => ({
        width: 0,
        height: 0,
        path: file.path || '',
        orientation: '',
        url: '',
        size: file.size || 0,
        name: file.name ? file.name : extractFileNameAndExtension(file.path).fileName,
        type: file.type ? file.type : 'image/' + extractFileNameAndExtension(file.path).extension,
        cover_url: file.path || '',
        selectFileType: 'image',
        content: ''
    }));
}

/**
 * 批量处理多个图片信息
 * @param {Array<Object>} files - 包含图片文件信息的数组
 * @param {boolean} returnDefault - 是否返回默认值，默认为 false
 * @returns {Promise<Array<Object>>} - 包含图片详细信息的 Promise 对象
 */
async function processImageDetails(files, returnDefault = false) {
	// 在这里处理是否返回默认值
	if (returnDefault) {
		return getDefaultImageDetails(files);
	}
	
	try {
		const imageInfoPromises = files.map(file => {
			return getImageInfo(file.path).then(info => ({
				...info, // 包含 width, height, path 等
				url: '', // 网络地址（返回给外面使用）
				size: file.size || 0,
				name: file.name ? file.name : extractFileNameAndExtension(file.path).fileName,
				type: file.type ? file.type : 'image/' + extractFileNameAndExtension(file.path).extension,
				cover_url: file.path, // 直接使用 file.path 作为 cover_url
				selectFileType: 'image',
				content: '' // 文件描述（返回给外面使用）
			}));
		});
		return await Promise.all(imageInfoPromises);
		
	} catch (error) {
		console.error("Error in processing image details:", error);
		// 在这里处理整个批量处理的异常情况，可以返回一个默认值或者空数组
		return getDefaultImageDetails(files);
		// throw error; // 如果 returnDefault 为 false，则抛出错误
	}
}

async function selectImage() {
    try {
        const imageSelection = await chooseImage();
        const imageDetailsArray = await processImageDetails(imageSelection.tempFiles);

        return imageDetailsArray; // 返回包含所有图片详细信息的数组
    } catch (error) {
        console.error("Error in selecting or retrieving image info:", error);
    }
}

/* 
// 临时文件列表
let tempFileList = [];

// 调用 selectImage 函数并处理结果
selectImage().then(imageDetailsArray => {
    if (imageDetailsArray) {
        tempFileList.push(...imageDetailsArray); // 将所有图片详情添加到 tempFileList
    }
}).catch(error => {
    console.error("Error in processing images:", error);
}); 
 */


function extractFileNameAndExtension(filePath) {
    // 使用正则表达式匹配文件名和扩展名
    const match = filePath.match(/([^\/]+)\.(\w+)$/);
    if (match) {
        return {
            fileName: match[1] + "." +  match[2], // 文件名 如01.png
            extension: match[2] // 扩展名
        };
    } else {
        return {
            fileName: '',
            extension: ''
        };
    }
}

/* 
 // 示例使用
 const filePath = "file:///storage/emulated/0/Pictures/180秒内;胖熊;猪熊;壮熊;熊熊;狒狒;肌肉;猛攻耐0/5_6282628321788299758.mp4";
 const fileInfo = extractFileNameAndExtension(filePath);
 console.log(fileInfo); // { fileName: "5_6282628321788299758", extension: "mp4" } 
 */

export {
	processImageDetails,
	selectVideo,
	selectImage
}
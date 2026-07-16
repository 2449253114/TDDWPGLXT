export default {
	data() {
		return {
			tempFiles: {}
		}
	},
	methods: {
		// 获取上传状态
		select(e) {
			console.log('选择文件：', e)
		},
		// 获取上传进度
		progress(e) {
			console.log('上传进度：', e)
		},
		// 上传成功
		success(e) {
			console.log('上传成功', e)
				let _this = this
			
			    // 从响应对象中提取tempFiles数组，假设e是一个包含tempFiles的对象
			    let tempFiles = e.tempFiles;
			
			    // 遍历tempFiles数组
			    tempFiles.forEach(file => {
			        // 构造新的图片项对象
			        let imageItem = {
						size: file.size,			// 图片大小
			            width: file.image.width,    // 图片宽度
			            height: file.image.height,  // 图片高度
			            thumb: file.fileID,         // 缩略图，使用fileID作为值
			            path: "cloudstorage/" + file.cloudPath,// 路径，使用"cloudstorage/"加上cloudPath的值
			        };
			        // 将新的图片项对象追加到formData.covers数组中
			        _this.formData.avatar = file.fileID;
			    });
				
				this.tempFiles = tempFiles
		},
		// 上传失败
		fail(e) {
			console.log('上传失败：', e)
		},
		// 开始上传
		upload() {
			this.$refs.files.upload()
		},
	}
}
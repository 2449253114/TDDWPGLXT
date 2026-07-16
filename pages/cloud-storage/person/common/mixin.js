import {
	urlEncode,
	urlDecode,
} from '@/pages/cheerio-crawler/tasks/common/common.js'

export default {
	data() {
		return {
			imageValue: []
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
			        this.formData.covers.push(imageItem);
			    });
			
			    // 至此，formData.covers数组已更新，可以进一步使用或处理formData对象
			
			
			// 往formData.covers中追究刚刚上传的图片数据
			// 图片Item数据应该是这样的
			// image中去掉location、size、thumb=fileID、path="cloudstorage/"+cloudPath
			
			
			
			/* 
			{
			    "tempFiles": [
			        {
			            "extname": "jpg",
			            "fileType": "image",
			            "image": {
			                "width": 2160,
			                "height": 2880,
			                "location": "blob:http://localhost:8080/2b92a4d2-0996-4f31-bffc-e53e51a896c2"
			            },
			            "name": "ade3cc68ef21e6d940479.jpg",
			            "path": "blob:http://localhost:8080/2b92a4d2-0996-4f31-bffc-e53e51a896c2",
			            "size": 1292481,
			            "fileID": "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/cloudstorage/1071ecff-004a-4aeb-acc2-6b4ed5ffc07e.jpg",
			            "url": "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/cloudstorage/1071ecff-004a-4aeb-acc2-6b4ed5ffc07e.jpg",
			            "uuid": 1714497365696,
			            "status": "success",
			            "cloudPath": "1714497365696_0.jpg"
			        }
			    ],
			    "tempFilePaths": [
			        "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/cloudstorage/1071ecff-004a-4aeb-acc2-6b4ed5ffc07e.jpg"
			    ]
			} 
			 */
			
		},
		
		// 上传失败
		fail(e) {
			console.log('上传失败：', e)
		},
		// 开始上传
		upload() {
			this.$refs.files.upload()
		},
		removeCover(index) {
			// 删除位于 index 位置的图片
			this.formData.covers.splice(index, 1);
			this.imageValue.splice(index, 1);
		},
		
		
		
		
		// #
		urlEncodeChange(str) {
			// 这里执行编码逻辑
			return urlEncode(str)
		},
		urlDecodeChange(str) {
			// 这里执行解码逻辑
			return urlDecode(str)
		},
		updateUrls(value) {
			// 这里执行更新 formData.link 的逻辑
			this.formData.link = value;
		}
		
	}
}
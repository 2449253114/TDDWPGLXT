// 云对象教程: https://uniapp.dcloud.net.cn/uniCloud/cloud-obj
// jsdoc语法提示教程：https://ask.dcloud.net.cn/docs/#//ask.dcloud.net.cn/article/129


const db = uniCloud.database()
const dbCmd = db.command
// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 全部相册
const albumCollectionName = 'yike-albums'
const albumCollection = db.collection(albumCollectionName)


module.exports = {
	_before: function() { // 通用预处理器

	},
	async testAutoUpdateAlbumCover() {
		// 查询所有已发布的相册
		const allAlbumsResult = await albumCollection.where({
			status: 1 // 已发布
		}).limit(300).get();
		
		// 从相册条目中提取fsid字段
		const fsids = allAlbumsResult.data.map(album => album.cover_info.fsid);
		
		// 使用fsid查询文件集合中的文件项
		for (const fsid of fsids) {
			const fileResult = await fileCollection.where({
				fsid: fsid
			}).get();
		
			// 如果找到文件项，则更新相应的相册封面图片URL
			if (fileResult.data.length > 0) {
				const fileItem = fileResult.data[0];
		
				// 更新相册集合中的封面信息
				await albumCollection.where({
					'cover_info.fsid': fsid
				}).update({
					'cover_info.thumburl.0': fileItem.thumburl[0]
				});
			}
		}
		
		return {
			msg: "相册封面更新完成"
		}

	}
	/**
	 * method1方法描述
	 * @param {string} param1 参数1描述
	 * @returns {object} 返回值描述
	 */
	/* 
	method1(param1) {
		// 参数校验，如无参数则不需要
		if (!param1) {
			return {
				errCode: 'PARAM_IS_NULL',
				errMsg: '参数不能为空'
			}
		}
		// 业务逻辑
		
		// 返回结果
		return {
			param1 //请根据实际需要返回值
		}
	}
	*/
}
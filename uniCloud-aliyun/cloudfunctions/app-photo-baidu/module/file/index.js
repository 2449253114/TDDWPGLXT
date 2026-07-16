module.exports = {
	// 已不需要
	//getFileList: require('./get-file-list'), // 获取文件列表（不指定某个相册的文件，直接查询）
	files: require('./category-files'), // 获取指定类别（视频、图片）文件列表（不指定某个相册的文件，直接查询）
	fileDetail: require('./file-detail'), // 获取指定文件详情,
	fileSearch: require('./file-search'), // 搜索指定文件
}
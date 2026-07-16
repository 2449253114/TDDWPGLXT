module.exports = {
	albums: require('./albums'),// 获取相册列表（不指定某个相册，直接查询）
    'album-files': require('./album-files'),// 获取指定相册的文件列表
    'album-detail': require('./album-detail'),// 获取指定相册的详细信息
}
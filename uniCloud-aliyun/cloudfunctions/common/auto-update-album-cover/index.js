const db = uniCloud.database()
const dbCmd = db.command
// 全部相册文件
const fileCollectionName = 'yike-album-files'
const fileCollection = db.collection(fileCollectionName)

// 全部相册
const albumCollectionName = 'yike-albums'
const albumCollection = db.collection(albumCollectionName)

/**
 * 自动更新相册封面
 * 此函数的目的是自动更新数据库中所有已发布相册的封面图片。
 * 它首先查询所有状态为已发布（status: 1）的相册条目，
 * 然后从每个相册条目中提取封面信息的fsid字段。
 * 之后，使用这些fsid去查询文件集合中对应的文件项，
 * 最后更新相册条目中的封面图片URL，即cover_info.thumburl字段。
 */
async function autoUpdateAlbumCover() {
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

module.exports = async function(e) {
	// 公用模块用法请参考 https://uniapp.dcloud.io/uniCloud/cf-common
	let res = await autoUpdateAlbumCover();
	return res;
}
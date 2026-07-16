<template>
	<view class="uni-content">

		<button @click="purgeRecordsWithFsidAsString" type="primary" size="mini">删除FSID字符串记录</button>

		<button @click="deleteRecordsWithEmptyAlbumId" type="primary" size="mini">删除album_id为空记录</button>

	</view>
</template>

<script>
	const db = uniCloud.database()
	const dbCmd = db.command

	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)

	// 全部相册文件
	const fileCollectionName = 'yike-album-files'
	const fileCollection = db.collection(fileCollectionName)

	// 相册文件 - m3u8文件
	const m3u8FileCollectionName = 'yike-album-files-m3u8file'
	const m3u8FileCollection = db.collection(m3u8FileCollectionName)

	// 文件ID（fsid）请求日志 (这个表用于追踪fsid的请求情况，记录每个文件请求的详细信息)
	const fsidRequestLogCollectionName = "yike-fsid-request-log"
	const fsidRequestLogCollection = db.collection(fsidRequestLogCollectionName)

	export default {
		data() {
			return {

			}
		},
		methods: {
			/**
			 * 从数据库中分批检索并删除具有字符串类型FSID的记录。
			 * 该函数逐步检索数据，直到检索完所有记录，并识别出其中FSID为字符串类型的记录。
			 * 然后，这些记录将被批量删除，以保证数据库的一致性和准确性。
			 */
			async purgeRecordsWithFsidAsString() {
				let data = [];
				const batchSize = 1000;
				let page = 0;
				let hasMore = true;

				uni.showLoading()

				while (hasMore) {
					const {
						result
					} = await m3u8FileCollection
						.limit(batchSize)
						.skip(page * batchSize)
						.field({
							_id: true,
							fsid: true
						})
						.get();

					// 将查询结果添加到data数组
					data = data.concat(result.data);

					// 检查是否还有更多数据
					if (result.data.length < batchSize) {
						hasMore = false;
						break; // 必须跳出循环，否则还会进入hasMore

					} else {
						// 写在else里保险点
						// 准备下一次查询
						page++;
					}
				}

				console.log("data", data)

				// 找出data数组中fsid为string类型的记录
				const fsidStringRecords = data.filter(item => typeof item.fsid === 'string');

				console.log("Records with string type fsid:", fsidStringRecords);

				// 提取这些记录的fsid值到一个新的数组中
				const fsidStrings = fsidStringRecords.map(item => item.fsid);

				// 输出fsid字符串数组
				console.log("FSID strings:", fsidStrings);
				
				console.log(`共有 ${fsidStrings.length} 条 FSID 为strings的记录`)

				const {
					result: {
						deleted
					}
				} = await m3u8FileCollection
					.where({
						fsid: dbCmd.in(fsidStrings)
					})
					.remove()

				console.log("已删除记录数：", deleted)

				uni.hideLoading()
			},

			async deleteRecordsWithEmptyAlbumId() {
				let data = [];
				const batchSize = 1000;
				let page = 0;
				let hasMore = true;

				uni.showLoading()

				while (hasMore) {
					const {
						result
					} = await fsidRequestLogCollection
						.limit(batchSize)
						.skip(page * batchSize)
						.field({
							_id: true,
							fsid: true,
							album_id: true
						})
						.get();

					// 将查询结果添加到data数组
					data = data.concat(result.data);

					// 检查是否还有更多数据
					if (result.data.length < batchSize) {
						hasMore = false;
						break; // 必须跳出循环，否则还会进入hasMore

					} else {
						// 写在else里保险点
						// 准备下一次查询
						page++;
					}
				}

				console.log("data", data)

				// 过滤出那些 album_id 为 null、undefined 或者没有 album_id 字段的记录
				let recordsToDelete = data.filter(item =>
					item.album_id === null || item.album_id === undefined || !('album_id' in item)
				);
				
				console.log(`共有 ${recordsToDelete.length} 条 album_id 为空的记录`)
				
				uni.hideLoading()
			}
		}
	}
</script>

<style scoped>

</style>
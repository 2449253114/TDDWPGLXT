<template>
	<view>
		<view class="uni-header">
			<view class="uni-group">
				<!-- <view class="uni-title"></view> -->
				<!-- <view class="uni-sub-title"></view> -->
				<button class="uni-button" type="warn" size="mini" @click="deleteExpiredM3u8FilesConcurrent">
					清理已失效的m3u8文件
				</button>
			</view>
			<view class="uni-group">
				<input class="uni-search" type="text" v-model="query" @confirm="search" placeholder="请输入搜索内容" />
				<button class="uni-button" type="default" size="mini" @click="search">搜索</button>
				<button class="uni-button" type="default" size="mini" @click="navigateTo('./add')">新增</button>
				<button class="uni-button" type="default" size="mini" :disabled="!selectedIndexs.length"
					@click="delTable">批量删除</button>
				<download-excel class="hide-on-phone" :fields="exportExcel.fields" :data="exportExcelData"
					:type="exportExcel.type" :name="exportExcel.filename">
					<button class="uni-button" type="primary" size="mini">导出 Excel</button>
				</download-excel>
			</view>
		</view>
		<view class="uni-container">
			<unicloud-db ref="udb" :collection="collectionList"
				field="album_id,fsid,m3u8_file_url,read_count,transcoding_status,create_time,expire_time" :where="where" page-data="replace"
				:orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
				v-slot:default="{data,pagination,loading,error,options}" :options="options" loadtime="manual"
				@load="onqueryload">
				<uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe type="selection"
					@selection-change="selectionChange">
					<uni-tr>
						<uni-th align="center" sortable @sort-change="sortChange($event, 'album_id')">album_id</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'fsid')" sortable @sort-change="sortChange($event, 'fsid')">fsid</uni-th>
						<uni-th width="120px" align="center" filter-type="search"
							@filter-change="filterChange($event, 'm3u8_file_url')" sortable
							@sort-change="sortChange($event, 'm3u8_file_url')">m3u8文件URL</uni-th>
						<uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'read_count')" sortable
							@sort-change="sortChange($event, 'read_count')">读取次数</uni-th>
						<uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'transcoding_status')"
							sortable @sort-change="sortChange($event, 'transcoding_status')">转码完成</uni-th>
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'create_time')" sortable
							@sort-change="sortChange($event, 'create_time')">创建时间</uni-th>
						<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'expire_time')" sortable
							@sort-change="sortChange($event, 'expire_time')">失效时间</uni-th>
						<uni-th align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(item,index) in data" :key="index">
						<uni-td align="center">{{item.album_id}}</uni-td>
						<uni-td align="center">{{item.fsid}}</uni-td>
						<uni-td align="center">
							<text class="uni-font-size-10">{{item.m3u8_file_url}}</text>
						</uni-td>
						<uni-td align="center">{{item.read_count}}</uni-td>
						<uni-td align="center">{{item.transcoding_status == "available" ? '✅' : '❌' }}</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.create_time"></uni-dateformat>
						</uni-td>
						<uni-td align="center">
							<uni-dateformat :threshold="[0, 0]" :date="item.expire_time"></uni-dateformat>
						</uni-td>
						<uni-td align="center">
							<view class="uni-group">
								<button @click="navigateTo('./edit?id='+item._id, false)" class="uni-button" size="mini"
									type="primary">修改</button>
								<button @click="confirmDelete(item._id)" class="uni-button" size="mini" type="warn">删除</button>
							</view>
						</uni-td>
					</uni-tr>
				</uni-table>
				<view class="uni-pagination-box">
					<uni-pagination show-icon :page-size="pagination.size" v-model="pagination.current" :total="pagination.count"
						@change="onPageChanged" />
				</view>
			</unicloud-db>
		</view>
	</view>
</template>

<script>
	import {
		enumConverter,
		filterToWhere
	} from '@/js_sdk/validator/yike-album-files-m3u8file.js';

	const db = uniCloud.database()
	const dbCmd = db.command

	// uniCloud云储存 - 记录已失效的m3u8文件URL，用于清理
	const invalidM3u8FilesCollectionName = "yike-invalid-m3u8-files"
	const invalidM3u8FilesCollection = db.collection(invalidM3u8FilesCollectionName)

	// 表查询配置
	const dbOrderBy = '' // 排序字段
	const dbSearchFields = [] // 模糊搜索字段，支持模糊搜索的字段列表。联表查询格式: 主表字段名.副表字段名，例如用户表关联角色表 role.role_name
	// 分页配置
	const pageSize = 20
	const pageCurrent = 1

	const orderByMapping = {
		"ascending": "asc",
		"descending": "desc"
	}

	export default {
		data() {
			return {
				collectionList: "yike-album-files-m3u8file",
				query: '',
				where: '',
				orderby: dbOrderBy,
				orderByFieldName: "",
				selectedIndexs: [],
				options: {
					pageSize,
					pageCurrent,
					filterData: {},
					...enumConverter
				},
				imageStyles: {
					width: 64,
					height: 64
				},
				exportExcel: {
					"filename": "yike-album-files-m3u8file.xls",
					"type": "xls",
					exportExcel: {
						"filename": "yike-album-files-m3u8file.xls",
						"type": "xls",
						"fields": {
							"album_id": "album_id",
							"fsid": "fsid",
							"m3u8文件URL": "m3u8_file_url",
							"读取次数": "read_count",
							"转码完成": "transcoding_status",
							"创建时间": "create_time",
							"失效时间": "expire_time"
						}
					},
				},
				exportExcelData: []
			}
		},
		onLoad() {
			this._filter = {}
		},
		onReady() {
			this.$refs.udb.loadData()
		},
		methods: {
			onqueryload(data) {
				this.exportExcelData = data
				console.log('data', data)
			},
			getWhere() {
				const query = this.query.trim()
				if (!query) {
					return ''
				}
				const queryRe = new RegExp(query, 'i')
				return dbSearchFields.map(name => queryRe + '.test(' + name + ')').join(' || ')
			},
			search() {
				const newWhere = this.getWhere()
				this.where = newWhere
				this.$nextTick(() => {
					this.loadData()
				})
			},
			loadData(clear = true) {
				this.$refs.udb.loadData({
					clear
				})
			},
			onPageChanged(e) {
				this.selectedIndexs.length = 0
				this.$refs.table.clearSelection()
				this.$refs.udb.loadData({
					current: e.current
				})
			},
			navigateTo(url, clear) {
				// clear 表示刷新列表时是否清除页码，true 表示刷新并回到列表第 1 页，默认为 true
				uni.navigateTo({
					url,
					events: {
						refreshData: () => {
							this.loadData(clear)
						}
					}
				})
			},
			// 多选处理
			selectedItems() {
				var dataList = this.$refs.udb.dataList
				return this.selectedIndexs.map(i => dataList[i]._id)
			},
			// 批量删除
			delTable() {
				this.$refs.udb.remove(this.selectedItems(), {
					success: (res) => {
						this.$refs.table.clearSelection()
					}
				})
			},
			// 多选
			selectionChange(e) {
				this.selectedIndexs = e.detail.index
			},
			confirmDelete(id) {
				this.$refs.udb.remove(id, {
					success: (res) => {
						this.$refs.table.clearSelection()
					}
				})
			},
			sortChange(e, name) {
				this.orderByFieldName = name;
				if (e.order) {
					this.orderby = name + ' ' + orderByMapping[e.order]
				} else {
					this.orderby = ''
				}
				this.$refs.table.clearSelection()
				this.$nextTick(() => {
					this.$refs.udb.loadData()
				})
			},
			filterChange(e, name) {
				this._filter[name] = {
					type: e.filterType,
					value: e.filter
				}
				let newWhere = filterToWhere(this._filter, db.command)
				if (Object.keys(newWhere).length) {
					this.where = newWhere
				} else {
					this.where = ''
				}
				this.$nextTick(() => {
					this.$refs.udb.loadData()
				})
			},
			// 删除已失效的m3u8文件
			async deleteExpiredM3u8Files() {
				// 显示加载提示
				uni.showLoading({
					title: "查询文件"
				});

				// 10小时前的时间戳
				const oneDayAgoTimestamp = parseInt(Date.now() - 10 * 60 * 60 * 1000)

				console.log('oneDayAgoTimestamp', oneDayAgoTimestamp)

				// 查询所有已失效的m3u8文件记录
				let {
					result: {
						total: expiredFilesTotal
					}
				} = await invalidM3u8FilesCollection.where({
					create_date: dbCmd.lt(oneDayAgoTimestamp) // 小于当前时间戳减去一天的毫秒数
				}).count()

				// 计算需要删除的文件总数
				console.log(`已失效的文件总数：${expiredFilesTotal}`);

				// 如果存在已失效的文件，进行分页查询并删除
				if (expiredFilesTotal > 0) {
					const MAX_LIMIT = 1000; // 假设每次查询的最大数量
					let allExpiredFiles = [];

					// 分页查询所有已失效的记录
					for (let i = 0; i < expiredFilesTotal; i += MAX_LIMIT) {

						// 当前第i页的数据
						console.log(`失效文件：当前第${i / MAX_LIMIT + 1}页`);

						const {
							result: {
								data: expiredFilesBatch
							}
						} = await invalidM3u8FilesCollection.where({
								create_date: dbCmd.lt(oneDayAgoTimestamp) // 小于当前时间戳减去一天的秒数
							})
							.field({
								_id: true,
								invalid_m3u8_file_url: true
							})
							.skip(i).limit(MAX_LIMIT).get();

						allExpiredFiles = allExpiredFiles.concat(expiredFilesBatch);

					}
					console.log('所有已失效文件:', allExpiredFiles, allExpiredFiles.length);


					// 提取所有已失效的记录中的 invalid_m3u8_file_url 字段
					const filesToDelete = allExpiredFiles.map(file => file.invalid_m3u8_file_url);

					// 调用云函数删除文件
					const deleteResult = await this.deleteFilesFromCloud(filesToDelete);

				}

				// 隐藏加载提示
				uni.hideLoading();

				console.log("所有文件删除完成。");
				uni.showToast({
					title: "所有文件删除完成。",
					icon: 'none'
				});
			},
			// 云存储文件删除函数
			async deleteFilesFromCloud(fileUrls) {
				// No more than 50 files at a time. | 一次不超过50个文件。

				const BATCH_SIZE = 50; // 每批最多处理的文件数量
				const totalFiles = fileUrls.length; // 总文件数
				const totalPages = Math.ceil(totalFiles / BATCH_SIZE); // 总页数

				// 显示加载提示
				uni.showLoading({
					title: "正在删除文件..."
				});

				for (let i = 0; i < totalPages; i++) {
					console.log(`正在删除第 ${i + 1} 页文件，共 ${totalPages} 页`);
					uni.showToast({
						title: `正在删除第 ${i + 1} 页文件，共 ${totalPages} 页`,
						icon: 'none',
						duration: 3500
					});

					// 获取当前批次的文件URLs和对应的记录
					const startIndex = i * BATCH_SIZE;
					const endIndex = (i + 1) * BATCH_SIZE;
					const batchFileUrls = fileUrls.slice(startIndex, endIndex);

					try {
						// 1. 删除云存储文件
						const {
							result
						} = await uniCloud.callFunction({
							name: 'deleteM3U8File',
							data: {
								fileList: batchFileUrls
							}
						});

						// 2. 删除对应的数据库记录
						const {
							result: dbResult
						} = await invalidM3u8FilesCollection.where({
							invalid_m3u8_file_url: dbCmd.in(batchFileUrls)
						}).remove();

						console.log(`第 ${i + 1} 页处理结果:`, {
							'云存储删除数量': result.fileList.length,
							'数据库删除数量': dbResult.deleted
						});

						uni.showToast({
							title: `第 ${i + 1} 页删除完成`,
							icon: 'none'
						});

					} catch (error) {
						console.error(`第 ${i + 1} 页文件删除失败:`, error.message);
						uni.showToast({
							title: `第 ${i + 1} 页文件删除失败: ${error.message}`,
							icon: "none"
						});
						throw error; // 可以选择抛出错误或者继续删除剩余文件
					}
				}
			},

			/**
			 * 删除已失效的m3u8文件（优化版本）
			 * 采用分批查询删除策略，避免数据库冻结
			 * 每批处理50个文件，处理完成后延时3秒
			 */
			async deleteExpiredM3u8FilesConcurrent() {
				try {
					// 显示加载提示
					uni.showLoading({
						title: "正在统计文件数量..."
					});

					// 10小时前的时间戳
					const tenHoursAgoTimestamp = parseInt(Date.now() - 10 * 60 * 60 * 1000);
					console.log('tenHoursAgoTimestamp:', tenHoursAgoTimestamp);

					// 查询已失效文件的总数
					const {
						result: {
							total: expiredFilesTotal
						}
					} = await invalidM3u8FilesCollection.where({
						create_date: dbCmd.lt(tenHoursAgoTimestamp)
					}).count();

					console.log(`已失效的文件总数：${expiredFilesTotal}`);

					// 如果没有失效文件，直接返回
					if (expiredFilesTotal === 0) {
						uni.hideLoading();
						uni.showToast({
							title: "没有需要清理的文件",
							icon: 'none'
						});
						return;
					}

					// 分批处理配置
					const BATCH_SIZE = 50; // 每批处理的文件数量
					const DELAY_MS = 3000; // 每批处理完成后的延时（毫秒）
					const totalBatches = Math.ceil(expiredFilesTotal / BATCH_SIZE);
					
					let processedCount = 0; // 已处理的文件数量
					let successCount = 0; // 成功删除的文件数量
					let errorCount = 0; // 删除失败的文件数量

					console.log(`开始分批删除，总批次：${totalBatches}，每批${BATCH_SIZE}个文件`);

					// 分批查询并删除
					for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
						const currentBatch = batchIndex + 1;
						
						try {
							// 更新加载提示
							uni.showLoading({
								title: `处理第${currentBatch}/${totalBatches}批文件...`
							});

							console.log(`开始处理第${currentBatch}批文件`);

							// 查询当前批次的失效文件
							const {
								result: {
									data: expiredFilesBatch
								}
							} = await invalidM3u8FilesCollection.where({
								create_date: dbCmd.lt(tenHoursAgoTimestamp)
							})
							.field({
								_id: true,
								invalid_m3u8_file_url: true
							})
							.limit(BATCH_SIZE)
							.get();

							// 如果没有查询到数据，说明已经删除完毕
							if (!expiredFilesBatch || expiredFilesBatch.length === 0) {
								console.log(`第${currentBatch}批没有查询到数据，可能已删除完毕`);
								break;
							}

							console.log(`第${currentBatch}批查询到${expiredFilesBatch.length}个文件`);

							// 提取文件URL和ID
							const fileUrls = expiredFilesBatch.map(file => file.invalid_m3u8_file_url);
							const fileIds = expiredFilesBatch.map(file => file._id);

							// 删除云存储文件
							let cloudDeleteResult = null;
							try {
								const {
									result
								} = await uniCloud.callFunction({
									name: 'deleteM3U8File',
									data: {
										fileList: fileUrls
									}
								});
								cloudDeleteResult = result;
								console.log(`第${currentBatch}批云存储删除结果:`, result);
							} catch (cloudError) {
								console.error(`第${currentBatch}批云存储删除失败:`, cloudError);
								// 云存储删除失败，但仍然删除数据库记录
							}

							// 删除数据库记录
							const {
								result: dbResult
							} = await invalidM3u8FilesCollection.where({
								_id: dbCmd.in(fileIds)
							}).remove();

							console.log(`第${currentBatch}批数据库删除结果:`, dbResult);

							// 统计处理结果
							const batchProcessed = expiredFilesBatch.length;
							const batchSuccess = dbResult.deleted || 0;
							const batchError = batchProcessed - batchSuccess;

							processedCount += batchProcessed;
							successCount += batchSuccess;
							errorCount += batchError;

							// 显示批次处理结果
							uni.showToast({
								title: `第${currentBatch}批完成：成功${batchSuccess}个`,
								icon: 'none',
								duration: 2000
							});

							console.log(`第${currentBatch}批处理完成 - 处理:${batchProcessed}, 成功:${batchSuccess}, 失败:${batchError}`);

						} catch (batchError) {
							console.error(`第${currentBatch}批处理失败:`, batchError);
							errorCount += BATCH_SIZE;
							
							uni.showToast({
								title: `第${currentBatch}批处理失败: ${batchError.message}`,
								icon: 'none',
								duration: 3000
							});
						}

						// 如果不是最后一批，则延时等待
						if (batchIndex < totalBatches - 1) {
							console.log(`第${currentBatch}批处理完成，等待${DELAY_MS}ms后继续...`);
							
							uni.showLoading({
								title: `等待${DELAY_MS/1000}秒后继续...`
							});
							
							// 延时等待，避免数据库压力过大
							await new Promise(resolve => setTimeout(resolve, DELAY_MS));
						}
					}

					// 隐藏加载提示
					uni.hideLoading();

					// 显示最终结果
					const resultMessage = `清理完成！总计处理${processedCount}个文件，成功${successCount}个，失败${errorCount}个`;
					console.log(resultMessage);
					
					uni.showModal({
						title: '清理完成',
						content: resultMessage,
						showCancel: false,
						confirmText: '确定'
					});

				} catch (error) {
					// 隐藏加载提示
					uni.hideLoading();
					
					console.error('删除失效文件过程中发生错误:', error);
					uni.showModal({
						title: '操作失败',
						content: `删除过程中发生错误: ${error.message}`,
						showCancel: false,
						confirmText: '确定'
					});
				}
			},
			// 并发删除云存储文件。（通过调整 concurrency 参数来控制并发数量，以适应不同的性能需求）
			async deleteFilesFromCloudConcurrent(fileUrls, concurrency = 10) {
				const BATCH_SIZE = 50; // 每批最多处理的文件数量
				const totalFiles = fileUrls.length; // 总文件数
				const totalPages = Math.ceil(totalFiles / BATCH_SIZE); // 总页数

				// 显示加载提示
				uni.showLoading({
					title: "正在删除文件..."
				});

				// 并发控制函数（修正版）
				const runTasksInParallel = async (tasks, concurrency) => {
					const results = [];
					const executing = new Set(); // 使用 Set 来存储正在执行的任务

					for (const task of tasks) {
						// 创建一个 Promise，执行任务并处理结果
						const p = task().then(result => {
							results.push(result);
							executing.delete(p); // 任务完成后从 Set 中移除
						});

						executing.add(p); // 将任务添加到 Set 中

						// 如果当前执行的任务数量达到并发限制，等待其中一个任务完成
						if (executing.size >= concurrency) {
							await Promise.race(executing);
						}
					}

					// 等待所有剩余的任务完成
					await Promise.all(executing);
					return results;
				};

				// 创建任务列表
				const tasks = [];
				for (let i = 0; i < totalPages; i++) {
					tasks.push(async () => {
						console.log(`正在删除第 ${i + 1} 页文件，共 ${totalPages} 页`);
						uni.showToast({
							title: `正在删除第 ${i + 1} 页文件，共 ${totalPages} 页`,
							icon: 'none',
							duration: 3500
						});

						// 获取当前批次的文件URLs和对应的记录
						const startIndex = i * BATCH_SIZE;
						const endIndex = (i + 1) * BATCH_SIZE;
						const batchFileUrls = fileUrls.slice(startIndex, endIndex);

						try {
							// 1. 删除云存储文件
							const {
								result
							} = await uniCloud.callFunction({
								name: 'deleteM3U8File',
								data: {
									fileList: batchFileUrls
								}
							});

							// 2. 删除对应的数据库记录
							const {
								result: dbResult
							} = await invalidM3u8FilesCollection.where({
								invalid_m3u8_file_url: dbCmd.in(batchFileUrls)
							}).remove();

							console.log(`第 ${i + 1} 页处理结果:`, {
								'云存储删除数量': result.fileList.length,
								'数据库删除数量': dbResult.deleted
							});

							uni.showToast({
								title: `第 ${i + 1} 页删除完成`,
								icon: 'none'
							});

							return {
								success: true,
								page: i + 1
							};
						} catch (error) {
							console.error(`第 ${i + 1} 页文件删除失败:`, error.message);
							uni.showToast({
								title: `第 ${i + 1} 页文件删除失败: ${error.message}`,
								icon: "none"
							});
							return {
								success: false,
								page: i + 1,
								error
							};
						}
					});
				}

				// 执行并发任务
				await runTasksInParallel(tasks, concurrency);

				// 隐藏加载提示
				uni.hideLoading();
			}
		}
	}
</script>

<style>
</style>
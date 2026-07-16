<template>
	<div>
		<view class="uni-header">
			<view class="uni-group">
				<view class="uni-title">
					<span>{{ `文件总数：${ totalFiles }` }}</span>
					<span style="margin: 0 5px;"> | </span>
					<span>{{ `待同步文件总数：${ totalFilesToSync }` }}</span>
				</view>
				<!-- <uni-load-more status="loading" :show-text="false" /> -->
				<view class="uni-sub-title">{{ showLoadingText }}</view>
				<button class="uni-button" type="warn" size="mini" :disabled="true" @click="allFileRemove">清空云存储管理数据库中的全部文件</button>
			</view>
			<view class="uni-group">
				<uni-section title="选择时间范围" type="line" />
				<uni-datetime-picker v-model="datetimerange" type="datetimerange" @change="dateTimerAngeChange"
					rangeSeparator="至" />
				<button class="uni-button" type="warn" size="mini" @click="reorderAlbumItemsWithLimit">重新排序</button>
				<button class="uni-button" type="primary" size="mini" @click="loadAlbumFilesData">加载相册文件</button>
				<button class="uni-button" type="primary" size="mini" @click="syncAlbumFilesToCloudStorage">同步到云存储</button>
				<!-- <button class="uni-button" type="primary" size="mini" @click="updateFilesToPublishedStatus">发布</button> -->
			</view>
		</view>
		<button @click="xx">xx</button>
		<view class="uni-pagination-box">
			<uni-pagination show-icon="false" showPageSize :pageSizeRange="[pagination.size]"
				:page-size="pagination.size" v-model="pagination.current" :total="pagination.count"
				@change="onPageChanged" />
		</view>
		<div class="uni-container">
			<div class="flex flex-wrap">
				<div class="media-grid">
					<div v-for="(item, index) in visibleFilesData" :key="index" class="media-item">
						<div class="media-image-container">
							<img class="media-image" :src="item.thumburl[1]" :alt="item.fsid">
							<div v-if="item.file_type === 'video'" class="video-info">
								<span>{{ item.duration_format }}</span>
								<span style="margin: 0 5px;"> | </span>
								<span>{{ item.bytes }}</span>
							</div>
						</div>
						<div class="media-info">
							<!-- <h3 class="media-name">{{ item.name ? item.name : 'Summer Trip' }}</h3> -->
							<h5 class="media-name">{{ item.album_id }}</h5>
							<h6 class="media-name">{{ item.fsid }}</h6>
							<p class="media-created-at">
								{{ `生成创建时间：${ item.create_time ? item.create_time : '2023-01-15' }` }}
							</p>
							<uni-dateformat :date="item.create_time"
								:threshold="[0,tenYearsInMilliseconds]"></uni-dateformat>
							<uni-dateformat :date="item.create_time" :threshold="[0,0]"></uni-dateformat>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	const db = uniCloud.database()
	import Heap from 'heap'; // 它提供了一个高效的堆数据结构。
	export default {
		data() {
			return {
				cloudStorageFileCollectionName: "yike-album-files",
				fileCollectionName: "yike-collection-album-files",
				totalFiles: 0, // 文件总数
				totalFilesToSync: 0, // 待同步文件总数（未同步的文件总数）
				allFilesData: [], // 全部文件数据
				pagination: {
					size: 1000, // 每页数量
					current: 1, // 当前页
					count: 0 // 总数量
				},
				datetimerange: ["2024-05-09 06:01:10", "2024-07-21 23:59:59"],
				showLoadingText: '',
				mediaData: [
					// 假的动态数据
					{
						type: 'video',
						url: 'https://placekitten.com/300/200',
						duration: '01:33',
						size: '1.2GB',
						name: 'Summer Trip',
						createdAt: '2023-01-15'
					}
					// 其他媒体数据...
				],
			};
		},
		computed: {
			/**
			 * 计算属性：visibleFilesData
			 * 根据分页信息从所有文件数据中计算出当前页应该显示的文件数据。
			 * 
			 * @returns {Array} 当前页的文件数据数组。
			 */
			visibleFilesData() {
				const start = (this.pagination.current - 1) * this.pagination.size; // 计算当前页的起始索引
				const end = start + this.pagination.size; // 计算当前页的结束索引
				return this.allFilesData.slice(start, end); // 从所有文件数据中切割出当前页的数据并返回
			},
			// 10年（百万秒）
			tenYearsInMilliseconds() {
				const oneYear = 365 * 24 * 60 * 60 * 1000; // 平年的毫秒数
				return 10 * oneYear;
			}
		},
		onReady() {
			this.queryFileCounts()
			this.updateEndTimeToCurrent()
		},
		mounted() {
			this.calculateItemWidth();
			window.addEventListener('resize', this.calculateItemWidth);
		},
		beforeDestroy() {
			window.removeEventListener('resize', this.calculateItemWidth);
		},
		methods: {
			calculateItemWidth() {
				// 在这里实现计算宽度的逻辑
				const grid = this.$el.querySelector('.media-grid');
				const gridWidth = grid.clientWidth;
				const itemWidth = 180; // 假设图片的最小宽度是200px
				const itemsPerRow = Math.floor(gridWidth / itemWidth);
				this.setItemWidth(grid, itemsPerRow);
			},
			setItemWidth(grid, itemsPerRow) {
				// 使用Vue的DOM操作来动态设置宽度
				const itemWidth = grid.clientWidth / itemsPerRow;
				grid.querySelectorAll('.media-item').forEach((item) => {
					item.style.width = `${itemWidth}px`;
				});
			},
			onPageChanged(e) {
				this.pagination.current = e.current
			},
			dateTimerAngeChange(e) {
				// e = ["2021-07-08 00:01:10","2021-08-08 23:59:59"]  
				console.log('change事件:', e);

				// 将日期时间字符串转换为时间戳（秒）
				const startTime = new Date(e[0]).getTime() / 1000;
				const endTime = new Date(e[1]).getTime() / 1000;

				console.log('startTime:', startTime);
				console.log('endTime:', endTime);
			},
			/**
			 * 更新日期时间范围的结束时间为当前时间。
			 * 该方法将 `datetimerange` 数组的第二个元素设置为当前时间，
			 * 时间格式为 "YYYY-MM-DD HH:MM:SS"。
			 */
			updateEndTimeToCurrent() {
				// 获取当前时间的 Date 对象
				const now = new Date();
				// 格式化时间为 "YYYY-MM-DD HH:MM:SS" 格式
				const formattedNow =
					`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
				// 更新 datetimerange 数组的第二个元素为当前时间
				// 使用新数组来更新datetimerange，以确保Vue能检测到变化
				this.datetimerange = [this.datetimerange[0], formattedNow];

				console.log('formattedNow', formattedNow)
			},
			// 同步相册文件到云存储
			async loadAlbumFilesData(validationTimes = 3) {// 默认效验次数为3
				uni.showLoading()
				await this.loadData()
				await this.filterExistingCloudStorageFiles()
				await this.filterExistingCloudStorageFiles() // 二次效验，为了提高准确性，当前版本就这样修复BUG吧
				await this.reorderAlbumItemsWithLimit()
				uni.hideLoading()
			},
			async loadData() {
				const {
					totalFiles
				} = this;
				const {
					fileCollectionName
				} = this;
				const fileCollection = db.collection(fileCollectionName);
				const MAX_LIMIT = 900; // uniapp的limit最大值1000
				let allFiles = [];

				for (let i = 0; i < totalFiles; i += MAX_LIMIT) {
					// 当前第i页的数据
					console.log(`当前第${i / MAX_LIMIT + 1}页`);
					
					this.showLoadingText = `当前第${i / MAX_LIMIT + 1}页`
					
					const {
						result: queryFileResult
					} = await fileCollection.skip(i).limit(MAX_LIMIT).get();
					//allFiles = queryFileResult.data
					allFiles = allFiles.concat(queryFileResult.data);
				}

				console.log('所有文件:', allFiles);

				this.allFilesData = allFiles

				// 数据更新后重新计算宽度
				this.$nextTick(() => {
					this.calculateItemWidth();
				});
			},

			// 这个函数名字你帮我起名和函数说明
			// 查询云存储相册文件中allFilesData是否已存在相同的fsid且album_id的item项，如果存在，需要排除掉，过滤不要，只保留云端中没有的
			// cloudStorageFileCollectionName = album-files
			// where条件fsid_ids、album_ids
			// 查询之后从data中过滤，如果返回[]数据，则说明云存储相册文件中没有，如果返回的有数据，则说明存在，需要把data中有的记录从allFilesData排查掉，就是云存储只能怪没有的

			/**
			 * 过滤掉已经在云存储中存在的相册文件。
			 * 该函数查询云存储以确定 allFilesData 中的哪些文件已经存在。
			 * 使用 fsid 作为文件的唯一标识符，它将检查 allFilesData 中的每个文件，
			 * 并排除那些在云端已有记录的文件。最终，allFilesData 将仅包含云端尚未存储的文件。
			 * 查询云存储时，由于查询大小限制（1MB还是2MB来着），fsid 和 album_id 的检查将分批进行，
			 * 每批最多处理 500 条记录。
			 */
			async filterExistingCloudStorageFiles() {
				const cloudStorageFileCollection = db.collection(this.cloudStorageFileCollectionName);
				const MAX_QUERY = 500; // 每次查询的最大数量限制
				let remainingFiles = this.allFilesData; // 初始化剩余文件列表
				const fsid_ids = this.allFilesData.map(item => item.fsid); // 提取所有fsid
				const album_ids = this.allFilesData.map(item => item.album_id); // 提取所有album_id

				// 定义一个辅助函数来实现延时
				const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

				// 分批查询，每批最多查询MAX_QUERY个fsid和album_id
				for (let i = 0; i < fsid_ids.length; i += MAX_QUERY) {
					let end = Math.min(i + MAX_QUERY, fsid_ids.length);
					let batchFsidIds = fsid_ids.slice(i, end);
					let batchAlbumIds = album_ids.slice(i, end);

					console.log(`正在查询云存储，批次：${i / MAX_QUERY + 1}`);
					
					// 在查询前延时200毫秒
					await delay(200);
					
					this.showLoadingText = `正在查询云存储，批次：${i / MAX_QUERY + 1}`
					
					const {
						result: queryCloudResult
					} = await cloudStorageFileCollection.where({
							fsid: {
								$in: batchFsidIds
							}, // 包含ids数组中的相册文件id
							album_id: {
								$in: batchAlbumIds
							} // 包含ids数组中的相册id
						})
						.limit(batchFsidIds
							.length) // 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
						.get();

					// 如果云端有数据，从remainingFiles中排除这些已存在的项
					if (queryCloudResult.data.length > 0) {
						const existingIds = new Set(queryCloudResult.data.map(item => item.fsid));
						remainingFiles = remainingFiles.filter(item => !existingIds.has(item.fsid));
					}
				}

				// 更新allFilesData为剩余的项
				this.allFilesData = remainingFiles;
				// 待同步文件总数
				this.totalFilesToSync = remainingFiles.length

				console.log('已过滤云存储中已存在项，剩余未同步文件:', this.allFilesData);
			},



			// 需求1
			// 为allFilesData > item.album_id重新排序，就是说不能出现3个以上相同album_id的连续item项
			// 比如  [{album_id：0}，{album_id：0}，{album_id：0}，{album_id：0}], 这样就是错的，因为有4个相同album_id的连续item项了。这是不对的
			// 以上不能出现3个以上相同album_id的连续item项是在条件成立的情况下才不能出现。
			// 比如现在我按照不能出现1个以上相同album_id的连续项，然后我有11条album_id数据如下,为了方便起见，我这里以数组Array<String>为例，<String>代表album_id
			// [0, 0, 0, 0, 1, 1, 2, 3, 3, 5, 5 ] 那么排序就需要优先不能连续，因为数据是在条件情况下不能连续, 然后假设排序的结果如下
			// [0, 1, 2, 3, 5, 0, 1, 3, 5, 0, 0（这里不够了，多个0，就可以把0放进来，因为没有和0不同的项了）]
			// 然后这个函数名和函数说明你帮我写，名字要符合功能逻辑和好理解好维护
			// 下面是你帮我写的代码, 然后我还需要改进，已经把需求写到函数开始的地方了
			/**
			 * 根据指定的最大连续数，重新排序相册项，以确保没有超过指定数量的相同 album_id 连续出现。
			 * @param {Number} maxConsecutive 允许的最大连续相同 album_id 的数量。
			 */
			reorderAlbumItemsWithLimit(maxConsecutive = 5) {
				// 改进需求：
				// 可先将相同album_id的item提取出来，放到相同album_id的盒子里。
				// 然后再开始排序，排序需要从每次不同的盒子里拿item数据, 但需要保证每个盒子都要走一遍，意思就是
				// 假设盒子1=[0, 1, 2] 盒子2=[3, 4, 5] 盒子3=[6,7,8]
				// 共3个盒子，每次随机抽取一个盒子拿数据，但必须每个盒子都走到
				// 假设这是从盒子中拿数据的过程：
				// 第一次：盒子1提取1、盒子2提取3、盒子3提取8
				// 第二次：盒子3提取6，盒子1提取0，盒子2提取5
				// 以此类推，就是说每一次都要把盒子走完，才能下一次（下一轮的意思）
				// 然后条件不满足时，才能从相同盒子中随机提取
				
				// 如果没有文件数据，则提前退出
				if (this.allFilesData.length === 0) {
					uni.showToast({
						title: '没有文件数据',
						icon: 'none'
					});
					return;
				}
				
				// 提示正在排序
				console.log('正在重新排序相册文件项...');
				this.showLoadingText = '正在重新排序相册文件项...'

				let itemGroups = {}; // 按 album_id 分组

				// 按 album_id 分组
				this.allFilesData.forEach(item => {
					if (!itemGroups[item.album_id]) {
						itemGroups[item.album_id] = [];
					}
					itemGroups[item.album_id].push(item);
				});

				let heap = new Heap((a, b) => a.lastIndex - b.lastIndex);
				let sortedAlbumItems = []; // 重新排序后的数组
				let lastIndices = {}; // 记录每个 album_id 最后出现的索引位置
				let currentIndex = 0; // 当前全局索引

				// 初始化堆和 lastIndices
				Object.keys(itemGroups).forEach(album_id => {
					lastIndices[album_id] = -1; // 初始化 lastIndices
					heap.push({
						album_id,
						lastIndex: lastIndices[album_id]
					});
				});

				while (sortedAlbumItems.length < this.allFilesData.length) {
					let groupData = heap.pop(); // 取出堆顶元素，即 lastIndex 最小的分组

					// 取出当前分组的随机一项数据，并更新其在 sortedAlbumItems 中的索引
					if (itemGroups[groupData.album_id].length > 0) {
						// 只拿第一项，不是随机
						//let item = itemGroups[groupData.album_id].shift();
						//sortedAlbumItems.push(item);

						// 随机选择一个索引
						let randomIndex = Math.floor(Math.random() * itemGroups[groupData.album_id].length);
						// 移除并返回随机选择的元素
						let item = itemGroups[groupData.album_id].splice(randomIndex, 1)[0];
						sortedAlbumItems.push(item);


						// 如果当前分组连续出现次数不足 maxConsecutive 或已经到了下一轮，则更新 lastIndices
						if (currentIndex - lastIndices[groupData.album_id] >= maxConsecutive) {
							lastIndices[groupData.album_id] = currentIndex;
							currentIndex++;
							heap.push({
								album_id: groupData.album_id,
								lastIndex: lastIndices[groupData.album_id]
							});
						} else {
							// 如果当前分组连续出现次数已满，则将其 lastIndex 设置为当前索引 + maxConsecutive，以确保它不会连续出现
							lastIndices[groupData.album_id] = currentIndex + maxConsecutive - 1;
							currentIndex++;
							// 只有当这个分组中还有更多数据时，才将其重新放入堆中
							if (itemGroups[groupData.album_id].length > 0) {
								heap.push({
									album_id: groupData.album_id,
									lastIndex: lastIndices[groupData.album_id]
								});
							}
						}
					}
				}

				// 更新 allFilesData 数组为新的顺序
				this.allFilesData = sortedAlbumItems;

				// 分配创建时间戳和排序
				this.assignCreationTimestampsAndSort()
			},

			// 需求2
			// 为allFilesData>item.create_time生成创建时间 这个函数名帮我写，并且需要写上函数说明
			// 生成创建时间的条件是：（起始）久远之前的时间datetimerange[0]、（结束）现在的时间datetimerange[1] ，需要转时间戳（毫秒）
			// 然后通过起始和结束时间，来生成时间。
			// 最后把allFilesData按照时间倒序排序，最新的总在最后

			/**
			 * 分配创建时间戳和排序
			 * 为 allFilesData 中的每个 item 分配一个在指定时间范围内的随机创建时间戳，并按创建时间倒序排序。
			 * 创建时间的范围由 datetimerange 数组提供，第一个元素是起始时间，第二个元素是结束时间。
			 * 创建时间戳是在这个范围内随机生成的，并且以毫秒为单位。
			 * 排序完成后，allFilesData 将被更新，其中最新创建的项将位于数组后部。
			 */
			assignCreationTimestampsAndSort() {
				this.showLoadingText = '正在分配创建时间戳和排序'

				const startTime = new Date(this.datetimerange[0]).getTime();
				const endTime = new Date(this.datetimerange[1]).getTime();

				// 为 allFilesData 中的每个 item 分配创建时间戳
				this.allFilesData.forEach(item => {
					// 在起始和结束时间戳之间生成随机时间戳
					item.create_time = Math.floor(Math.random() * (endTime - startTime + 1)) + startTime;
					// item.ctime如果已经是秒单位，则不能除1000，否则会导致app-home-视频宫格列表出现BUG，无法加载下页问题。
					// 只有在毫秒单位时才需要除1000
					//item.ctime = Math.floor(Date.now() / 1000);
				});

				// 按创建时间戳正序排序 allFilesData，使得最新创建的项位于数组最后面
				this.allFilesData.sort((a, b) => a.create_time - b.create_time);
				
			},

			// 同步到云存储相册文件
			async syncAlbumFilesToCloudStorage() {
				// 如果没有需要同步的相册文件，则提前退出
				if (this.allFilesData.length === 0) {
					uni.showToast({
						title: '没有需要同步的相册',
						icon: 'none'
					});
					return;
				}				
				
				uni.showLoading()
				
				this.showLoadingText = '正在同步到云存储相册文件'
				
				// 同步前，将 allFilesData 中每个文件的状态设置为 '已发布'
				this.allFilesData.forEach(item => {
					item.status = 1; // 标记为已发布
				});
				
				
				const cloudStorageFileCollection = db.collection(this.cloudStorageFileCollectionName);
				try {
					// 批量添加所有未同步的文件记录到云数据库
					const {
						result: res
					} = await cloudStorageFileCollection.add(this.allFilesData);
					if (res.ids && res.ids.length > 0) {
						console.log('批量插入成功，插入的记录 IDs:', res.ids);
						uni.showToast({
						    title: '同步成功',
						    icon: 'success'
						});
						
					} else {
						console.error('批量插入失败，未获得插入记录的 IDs');
						uni.showToast({
						    title: '同步失败',
						    icon: 'none'
						});
					}
				} catch (error) {
					console.error('同步相册文件到云存储过程中出现错误:', error);
					uni.showToast({
					    title: '同步时出现错误',
					    icon: 'none'
					});
				}
				
				this.showLoadingText = '已全部完成'
				uni.hideLoading()
			},
			
			
			// 批量更新为已发布 <将文件更新为已发布状态>
			async updateFilesToPublishedStatus() {
				const dbCmd = db.command
				const cloudStorageFileCollection = db.collection(this.cloudStorageFileCollectionName);
				let { result: res} = await cloudStorageFileCollection.where({status: dbCmd.eq(0)}).update({
				  status: 1,
				})
				console.log(res.updated)
			},
			
			
			// 删除文件 <仅测试期间>
			async removeFlie() {
				const fsid = 350398014988986
				const album_id = "4167709408245590722"
				
				const dbCmd = db.command
				const cloudStorageFileCollection = db.collection(this.cloudStorageFileCollectionName);
				let { result: res} = await cloudStorageFileCollection
				.where({
					fsid: fsid,
					album_id: album_id
				})
				.get()
				console.log('get', res.data)
				
				
				let { result: removeResult } = await cloudStorageFileCollection
				.where({
					fsid: fsid,
					album_id: album_id
				}).remove();
				
				console.log('remove', removeResult.deleted)
				
			},

			// 查询文件总数
			async queryFileCounts() {
				const {
					fileCollectionName
				} = this;
				const fileCollection = db.collection(fileCollectionName);

				// 获取文件总数
				const {
					result: fileCountResult
				} = await fileCollection.count();
				const totalFiles = fileCountResult.total;
				console.log('文件总数:', totalFiles);
				this.totalFiles = totalFiles
				// 计算总页数
				this.pagination.count = totalFiles;
			},

			// 删除全部云存储相册文件
			async allFileRemove() {
				uni.showToast({
					title: "你的操作无效，不要乱点，这是删除云存储相册文件的数据库所有记录"
				})
				
				return
				try {
					// 通知开始清理数据
					console.log('开始清理全部云存储相册文件...');
					const dbCmd = db.command;
					const cloudStorageFileCollection = db.collection(this.cloudStorageFileCollectionName);

					// 执行删除操作
					let { result: res } = await cloudStorageFileCollection.where({
						_id: dbCmd.exists(true)
					}).remove();

					// 如果删除成功，输出成功信息
					if (res && res.deleted > 0) {
						console.log(`成功清理 ${res.deleted} 个文件。`);
						
						uni.showToast({
							title: `成功清理 ${res.deleted} 个文件。`
						});
					} else {
						console.log('没有要清理的文件，或清理操作未成功执行。');
					}
				} catch (error) {
					// 如果出现错误，输出错误信息
					console.error('清理云存储相册文件过程中出现错误:', error);
					
					uni.showToast({
						title: `清理失败 ${ error }`
					});
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.media-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		padding: 20px;
	}

	// .media-item {
	// 	flex: 0 1 calc(100% - 20px);
	// 	/* Default to full width */
	// 	background-color: #fff;
	// 	border-radius: 8px;
	// 	overflow: hidden;
	// 	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	// }

	.media-item {
		/* 初始宽度设置为100%，具体宽度将由JavaScript动态计算 */
		width: 100%;
		position: relative;
		/* 用于定位图片和视频信息 */
		overflow: hidden;
		/* 保持内容在容器内 */
		background-color: #fff;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	// /* 2 columns for small screens (>=600px) */
	// @media (min-width: 600px) {
	// 	.media-item {
	// 		flex: 0 1 calc(50% - 20px);
	// 	}
	// }

	// /* 3 columns for medium screens (>=900px) */
	// @media (min-width: 900px) {
	// 	.media-item {
	// 		flex: 0 1 calc(33.333% - 20px);
	// 	}
	// }

	// /* 4 columns for large screens (>=1200px) */
	// @media (min-width: 1200px) {
	// 	.media-item {
	// 		flex: 0 1 calc(25% - 20px);
	// 	}
	// }

	.media-image-container {
		position: relative;
		width: 100%;
		/* 16:9 Aspect Ratio */
	}

	// .media-image {
	// 	position: absolute;
	// 	top: 0;
	// 	left: 0;
	// 	width: 100%;
	// 	height: 100%;
	// 	object-fit: cover;
	// }

	.media-image {
		height: 150px;
		/* 设置固定高度 */
		width: auto;
		/* 宽度自适应 ， 因为可能是9:16的竖长图*/
		display: block;
		/* 避免默认的行内元素行为 */
		margin: 0 auto;
		/* 居中图片 */
	}

	.video-info {
		position: absolute;
		bottom: 0;
		left: 0;
		background-color: rgba(0, 0, 0, 0.5);
		color: #fff;
		padding: 4px 8px;
		font-size: 12px;
	}

	.media-info {
		padding: 10px;
	}

	.media-name {
		margin: 0;
		font-size: 16px;
		font-weight: bold;
	}

	.media-created-at {
		margin: 5px 0 0;
		font-size: 12px;
		color: #666;
	}


	// 能不能帮我实现动态算出每行展示的列，因为图片宽度是不确定的，然后.media-item中包含的图片是高度固定，宽度自适应。
</style>
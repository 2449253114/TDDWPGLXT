<template>
	<view class="container">
		<view class="operation-area">
			<button type="default" @click="chooseJsonFile">选择JSON文件</button>
			<!-- 移除隐藏的input元素，改为在JS中动态创建 -->
			<text v-if="jsonFileName">已选择: {{ jsonFileName }}</text>
			<button type="primary" @click="importJson" :disabled="!jsonContent">导入JSON</button>
			<button type="primary" @click="startFetch" :disabled="!exportedData.length || isFetching">开始获取相册数据</button>
			<button type="default" @click="stopFetch" :disabled="!isFetching">停止获取</button>
			<button type="primary" @click="checkAndSyncData" :disabled="!exportedData.length || isProcessing">检查并同步数据</button>
			<button type="primary" @click="cleanDuplicateM3u8Files" :disabled="isCleaningDuplicates">清理重复M3U8文件</button>
			<button type="primary" @click="cleanDuplicateFsidRequestLogs" :disabled="isCleaningDuplicates">清理重复请求日志</button>
		</view>
		
		<view class="status-area" v-if="exportedData.length">
			<text>导入数据: {{ exportedData.length }} 条</text>
			<text>相册数量: {{ uniqueAlbums.length }} 个</text>
			<text>当前处理: {{ currentAlbumIndex >= 0 ? `相册 ${currentAlbumIndex+1}/${uniqueAlbums.length}` : '未开始' }}</text>
			<text>匹配数量: {{ matchedItems.length }} 条</text>
			<text v-if="syncedCount > 0">同步数量: {{ syncedCount }} 条</text>
		</view>
		
		<view class="filter-area" v-if="exportedData.length">
			<uni-data-checkbox v-model="filterType" :localdata="filterOptions" @change="handleFilterChange"></uni-data-checkbox>
			<uni-search-bar placeholder="搜索视频路径" :v-model="searchKeyword" @input="handleSearchInput" @confirm="handleSearchInput"></uni-search-bar>
		</view>
		
		<view class="list-area" v-if="filteredData.length">
			<!-- 选择和分页控制区 -->
			<view class="control-area">
				<view class="selection-controls">
					<checkbox :checked="isAllSelected" @click="toggleSelectAll" />全选
					<text class="selection-info" v-if="selectedItems.length">已选择 {{ selectedItems.length }} 项</text>
					<button type="default" size="mini" v-if="selectedItems.length" @click="clearSelection">清除选择</button>
				</view>
				<view class="pagination-controls">
					<button type="default" size="mini" :disabled="currentGridPage <= 1" @click="prevPage">上一页</button>
					<text>{{ currentGridPage }}/{{ totalGridPages }}</text>
					<button type="default" size="mini" :disabled="currentGridPage >= totalGridPages" @click="nextPage">下一页</button>
				</view>
			</view>
			
			<!-- Grid布局展示区 -->
			<view class="grid-container">
				<view 
					v-for="(item, index) in paginatedData" 
					:key="item._id" 
					class="grid-item"
					:class="{selected: isItemSelected(item), 'grid-item-matched': item.isMatched, 'grid-item-unmatched': !item.isMatched, 'grid-item-synced': item.isSynced, 'grid-item-existed': item.isExisted}"
					@click="toggleSelectItem(item)"
				>
					<view class="grid-item-header">
						<checkbox :checked="isItemSelected(item)" @click.stop="toggleSelectItem(item)" />
						<view class="status-badge" :class="item.isMatched ? 'matched' : 'unmatched'">
							{{ item.isMatched ? '已匹配' : '未匹配' }}
						</view>
						<view class="status-badge synced" v-if="item.isSynced">
							已同步
						</view>
						<view class="status-badge existed" v-if="item.isExisted">
							已存在
						</view>
					</view>
					
					<view class="grid-item-content">
						<text class="item-title text-ellipsis">{{ item.path }}</text>
						
						<view class="item-info">
							<text>相册ID: {{ item.album_id }}</text>
							<text>文件ID: {{ item.fsid }}</text>
							<text>时长: {{ item.duration_format }}</text>
							<text>大小: {{ item.bytes }}</text>
						</view>
						
						<view class="item-thumbs">
							<view class="thumb-container">
								<text>导出缩略图:</text>
								<image class="thumb" :src="item.thumburl" mode="aspectFit"></image>
							</view>
							<view class="thumb-container" v-if="item.isMatched && item.matchedData">
								<text>相册缩略图:</text>
								<image class="thumb" :src="item.matchedData.thumburl" mode="aspectFit"></image>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>
		
		<uni-popup ref="messagePopup" type="message">
			<uni-popup-message :type="messageType" :message="messageContent" :duration="2000"></uni-popup-message>
		</uni-popup>
	</view>
</template>

<script>
	const db = uniCloud.database()
	const dbCmd = db.command
	
	// m3u8文件集合名称
	const m3u8FileCollectionName = 'yike-album-files-m3u8file'
	const m3u8FileCollection = db.collection(m3u8FileCollectionName)
	// 文件ID（fsid）请求日志集合名称
	const fsidRequestLogCollectionName = "yike-fsid-request-log"
	const fsidRequestLogCollection = db.collection(fsidRequestLogCollectionName)
	
	export default {
		computed: {
			// 实时过滤数据
			filteredData() {
				if (!this.exportedData.length) return []
				
				// 先应用匹配状态筛选
				let result = [...this.exportedData.map(item => ({
					...item,
					isMatched: this.matchedItems.some(matched => matched._id === item._id),
					matchedData: this.matchedItems.find(matched => matched._id === item._id)?.matchedData
				}))]
				
				if (this.filterType === 'matched') {
					result = result.filter(item => item.isMatched)
				} else if (this.filterType === 'unmatched') {
					result = result.filter(item => !item.isMatched)
				}
				
				// 再应用搜索关键词筛选
				if (this.searchKeyword) {
					const keyword = this.searchKeyword.toLowerCase()
					result = result.filter(item => {
						return item.path && item.path.toLowerCase().includes(keyword)
					})
				}
				
				return result
			},
			
			// 计算总页数
			totalGridPages() {
				return Math.ceil(this.filteredData.length / this.gridPageSize)
			},
			
			// 获取当前页的数据
			paginatedData() {
				const startIndex = (this.currentGridPage - 1) * this.gridPageSize
				const endIndex = startIndex + this.gridPageSize
				return this.filteredData.slice(startIndex, endIndex)
			},
			
			// 判断是否全选
			isAllSelected() {
				return this.paginatedData.length > 0 && this.paginatedData.every(item => 
					this.selectedItems.some(selectedItem => selectedItem._id === item._id)
				)
			}
		},
		data() {
			return {
				// 文件选择相关
				jsonFileName: '',
				jsonContent: null,
				
				// 数据相关
				exportedData: [], // 导出的JSON数据
				uniqueAlbums: [], // 去重后的相册ID列表
				albumData: {}, // 相册数据，格式: {album_id: [文件列表]}
				matchedItems: [], // 匹配到的项目
				
				// 获取数据相关
				isFetching: false,
				currentAlbumIndex: -1,
				currentPage: 1,
				pageSize: 30,
				hasMore: true,
				
				// 数据同步相关
				isProcessing: false,
				syncedCount: 0,
				
				// 清理重复数据相关
				isCleaningDuplicates: false,
				totalM3u8Files: 0,
				processedM3u8Files: 0,
				duplicatesRemoved: 0,
				
				// 筛选相关
				filterType: 'all',
				filterOptions: [
					{ text: '全部', value: 'all' },
					{ text: '已匹配', value: 'matched' },
					{ text: '未匹配', value: 'unmatched' }
				],
				searchKeyword: '',
				
				// Grid布局分页相关
				currentGridPage: 1,
				gridPageSize: 12, // 每页显示的数量
				
				// 选择相关
				selectedItems: [], // 已选择的项目
				
				// 消息提示
				messageType: 'success',
				messageContent: ''
			}
		},
		methods: {
			// 文件选择与导入
			chooseJsonFile() {
				// 修改为直接显示文件选择框，而不是通过代码触发点击事件
				// 在H5环境中，this.$refs.fileInput.click()可能不起作用
				// 将隐藏的input改为可见状态
				const fileInput = document.createElement('input');
				fileInput.type = 'file';
				fileInput.accept = '.json';
				fileInput.addEventListener('change', this.onFileChange);
				fileInput.click();
			},
			
			// 文件选择变更处理
			onFileChange(event) {
				const file = event.target.files[0];
				if (!file) return;
				
				// 检查文件类型
				if (!file.name.endsWith('.json')) {
					this.showMessage('error', '请选择JSON文件');
					return;
				}
				
				// 更新文件名
				this.jsonFileName = file.name;
				
				// 使用FileReader读取文件内容
				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						this.jsonContent = e.target.result;
						this.showMessage('success', '文件读取成功，请点击导入按钮');
					} catch (error) {
						console.error('文件读取错误:', error);
						this.showMessage('error', '文件读取错误');
					}
				};
				reader.onerror = (error) => {
					console.error('文件读取错误:', error);
					this.showMessage('error', '文件读取错误');
				};
				reader.readAsText(file);
			},
			
			importJson() {
				if (!this.jsonContent) {
					this.showMessage('error', '请先选择JSON文件')
					return
				}
				
				try {
					const data = JSON.parse(this.jsonContent)
					if (!Array.isArray(data)) {
						this.showMessage('error', '导入的JSON必须是数组格式')
						return
					}
					
					this.exportedData = data
					this.processExportedData()
					this.showMessage('success', `成功导入 ${data.length} 条数据`)
				} catch (error) {
					console.error('JSON解析错误:', error)
					this.showMessage('error', 'JSON解析错误')
				}
			},
			
			// 处理导出的数据
			processExportedData() {
				// 提取并去重album_id
				const albumIds = this.exportedData.map(item => item.album_id)
				this.uniqueAlbums = [...new Set(albumIds)]
			},
			
			// 获取相册数据
			async startFetch() {
				if (this.isFetching) return
				if (!this.uniqueAlbums.length) {
					this.showMessage('error', '没有相册ID可以获取')
					return
				}
				
				this.isFetching = true
				
				// 如果是重新开始，重置状态
				if (this.currentAlbumIndex < 0) {
					this.currentAlbumIndex = 0
					this.albumData = {}
				}
				
				try {
					await this.fetchAlbumData()
				} catch (error) {
					console.error('获取相册数据错误:', error)
					this.showMessage('error', '获取相册数据错误')
					this.isFetching = false
				}
			},
			
			stopFetch() {
				this.isFetching = false
				this.showMessage('info', '已停止获取数据')
			},
			
			async fetchAlbumData() {
				if (!this.isFetching) return
				
				// 检查是否已完成所有相册
				if (this.currentAlbumIndex >= this.uniqueAlbums.length) {
					this.isFetching = false
					this.showMessage('success', '所有相册数据获取完成')
					return
				}
				
				const currentAlbumId = this.uniqueAlbums[this.currentAlbumIndex]
				
				// 初始化当前相册的数据结构
				if (!this.albumData[currentAlbumId]) {
					this.albumData[currentAlbumId] = []
					this.currentPage = 1
					this.hasMore = true
				}
				
				// 如果当前相册没有更多数据，进入下一个相册
				if (!this.hasMore) {
					this.currentAlbumIndex++
					setTimeout(() => {
						this.fetchAlbumData()
					}, 1000) // 间隔1秒后获取下一个相册
					return
				}
				
				// 调用云函数获取相册文件数据
				try {
					const result = await uniCloud.callFunction({
						name: 'app-photo-baidu',
						data: {
							action: 'getAlbumFiles',
							album_id: currentAlbumId,
							page: this.currentPage,
							pageSize: this.pageSize
						}
					})
					
					const { data, hasMore } = result.result
					this.hasMore = hasMore
					
					if (data && data.length) {
						// 将获取到的数据添加到当前相册的数据中
						this.albumData[currentAlbumId] = [...this.albumData[currentAlbumId], ...data]
						
						// 匹配数据
						this.matchData(currentAlbumId, data)
					}
					
					// 如果还有更多数据，继续获取下一页
					if (this.hasMore) {
						this.currentPage++
						setTimeout(() => {
							this.fetchAlbumData()
						}, 1000) // 间隔1秒后获取下一页
					} else {
						// 当前相册数据获取完毕，进入下一个相册
						this.currentAlbumIndex++
						setTimeout(() => {
							this.fetchAlbumData()
						}, 1000) // 间隔1秒后获取下一个相册
					}
				} catch (error) {
					console.error('获取相册文件数据错误:', error)
					this.showMessage('error', '获取相册文件数据错误')
					this.isFetching = false
				}
			},
			
			// 匹配数据
			matchData(albumId, albumFiles) {
				// 遍历导出的数据，查找匹配项
				this.exportedData.forEach((exportItem, index) => {
					// 只处理当前相册的数据且未匹配的项
					if (exportItem.album_id === albumId && !this.matchedItems.some(item => item._id === exportItem._id)) {
						// 在相册文件中查找匹配项
						const matchedFile = albumFiles.find(file => {
							// 通过duration_ms字段匹配
							return file.extra_info && 
								exportItem.extra_info && 
								file.extra_info.duration_ms === exportItem.extra_info.duration_ms
						})
						
						if (matchedFile) {
							// 创建匹配项并添加到匹配项列表
							const matchedItem = {
								...exportItem,
								isMatched: true,
								matchedData: matchedFile
							}
							
							// 添加到匹配项列表
							this.matchedItems.push(matchedItem)
						}
					}
				})
				
				// 重置当前页码，确保在数据变化后从第一页开始显示
				this.currentGridPage = 1
			},
			
			// 筛选功能
			handleFilterChange() {
				// 重置当前页码，确保在筛选条件变化后从第一页开始显示
				this.currentGridPage = 1
			},
			
			// 处理搜索输入
			handleSearchInput(e) {
				console.log('搜索关键词:', e)
				this.searchKeyword = e
				// 重置当前页码，确保在搜索关键词变化后从第一页开始显示
				this.currentGridPage = 1
			},
			
			// 分页相关方法
			prevPage() {
				if (this.currentGridPage > 1) {
					this.currentGridPage--
				}
			},
			
			nextPage() {
				if (this.currentGridPage < this.totalGridPages) {
					this.currentGridPage++
				}
			},
			
			// 选择相关方法
			toggleSelectItem(item) {
				const index = this.selectedItems.findIndex(selectedItem => selectedItem._id === item._id)
				if (index === -1) {
					// 添加到选中项
					this.selectedItems.push(item)
				} else {
					// 从选中项中移除
					this.selectedItems.splice(index, 1)
				}
			},
			
			isItemSelected(item) {
				return this.selectedItems.some(selectedItem => selectedItem._id === item._id)
			},
			
			toggleSelectAll() {
				if (this.isAllSelected) {
					// 如果全部已选中，则清空选择
					this.selectedItems = []
				} else {
					// 否则选中当前页的所有项
					this.selectedItems = [...this.paginatedData]
				}
			},
			
			clearSelection() {
				this.selectedItems = []
			},
			
			// 检查并同步数据到数据库
			async checkAndSyncData() {
				if (this.isProcessing) return
				if (!this.exportedData.length) {
					this.showMessage('error', '没有数据可以同步')
					return
				}
				
				this.isProcessing = true
				this.syncedCount = 0
				
				try {
					// 遍历exportedData数组
					for (let i = 0; i < this.exportedData.length; i++) {
						const item = this.exportedData[i]
						const fsid = item.fsid
						const currentTime = Date.now()
						
						// 检查并处理m3u8FileCollection
						const { result: m3u8FileResult } = await m3u8FileCollection.where({
							fsid: fsid
						}).get()

						console.log('m3u8FileResult:', m3u8FileResult)
						
						// 准备m3u8FileCollection的数据
						const m3u8FileData = {
							album_id: item.album_id,
							fsid: item.fsid,
							tid: item.tid,
							uk: item.uk,
							m3u8_file_url: "",
							read_count: 0,
							transcoding_status: "transcoding",
							create_time: currentTime,
							expire_time: currentTime
						}
						
						if (m3u8FileResult.data.length === 0) {
							// 如果记录不存在，新增记录
							await m3u8FileCollection.add(m3u8FileData)
						} else {
							// 如果记录存在，更新记录
							await m3u8FileCollection.where({ fsid: fsid }).update(m3u8FileData)
						}
						
						// 检查并处理fsidRequestLogCollection
						const { result: fsidRequestLogResult } = await fsidRequestLogCollection.where({
							fsid: fsid
						}).get()
						
						// 准备fsidRequestLogCollection的数据
						const fsidRequestLogData = {
							album_id: item.album_id,
							fsid: item.fsid,
							tid: item.tid,
							uk: item.uk,
							account_id: '',
							requested: false,
							m3u8_file_url: "",
							request_time: currentTime
						}
						
						if (fsidRequestLogResult.data.length === 0) {
							// 如果记录不存在，新增记录
							await fsidRequestLogCollection.add(fsidRequestLogData)
						} else {
							// 如果记录存在，更新记录
							await fsidRequestLogCollection.where({ fsid: fsid }).update(fsidRequestLogData)
						}
						
						// 更新同步计数和状态
						this.syncedCount++
						this.exportedData[i].isSynced = true
					}
					
					this.showMessage('success', `同步完成，共同步 ${this.syncedCount} 条数据`)
				} catch (error) {
					console.error('同步数据错误:', error)
					this.showMessage('error', '同步数据错误: ' + error.message)
				} finally {
					this.isProcessing = false
				}
			},
			
			// 消息提示
			showMessage(type, content) {
				this.messageType = type
				this.messageContent = content
				this.$refs.messagePopup.open()
				console.log(content)
			},
			
			// 清理m3u8文件集合中的重复数据
			async cleanDuplicateM3u8Files() {
				if (this.isCleaningDuplicates) return
				
				this.isCleaningDuplicates = true
				this.totalM3u8Files = 0
				this.processedM3u8Files = 0
				this.duplicatesRemoved = 0
				
				try {
					// 1. 获取总数据量
					const { result: countResult } = await m3u8FileCollection.count()
					this.totalM3u8Files = countResult.total
					this.showMessage('info', `开始清理重复数据，共有 ${this.totalM3u8Files} 条记录`)
					
					// 2. 分页查询所有数据
					const pageSize = 1000
					const totalPages = Math.ceil(this.totalM3u8Files / pageSize)
					
					// 用于存储唯一记录的Map，键为"album_id-fsid-tid"组合
					const uniqueRecords = new Map()
					// 存储要删除的记录ID
					const recordsToDelete = []
					
					// 分页查询所有数据
					for (let page = 0; page < totalPages; page++) {
						const skipCount = page * pageSize
						const { result } = await m3u8FileCollection.skip(skipCount).limit(pageSize).get()
						const records = result.data
						
						// 更新已处理记录数
						this.processedM3u8Files += records.length
						
						// 处理当前页的记录
						for (const record of records) {
							// 创建唯一键
							const uniqueKey = `${record.album_id}-${record.fsid}-${record.tid}`
							
							// 检查是否已存在相同键的记录
							if (uniqueRecords.has(uniqueKey)) {
								// 如果已存在，将当前记录添加到要删除的列表中
								recordsToDelete.push(record._id)
							} else {
								// 如果不存在，将记录添加到唯一记录Map中
								uniqueRecords.set(uniqueKey, record)
							}
						}
						
						// 每处理完一页，显示进度
						this.showMessage('info', `处理进度: ${this.processedM3u8Files}/${this.totalM3u8Files}`)
					}
					
					// 3. 删除重复记录
					for (const recordId of recordsToDelete) {
						await m3u8FileCollection.doc(recordId).remove()
						this.duplicatesRemoved++
					}
					
					this.showMessage('success', `清理完成，共删除 ${this.duplicatesRemoved} 条重复记录`)
				} catch (error) {
					console.error('清理重复数据错误:', error)
					this.showMessage('error', '清理重复数据错误: ' + error.message)
				} finally {
					this.isCleaningDuplicates = false
				}
			},
			
			// 清理fsid请求日志集合中的重复数据
			async cleanDuplicateFsidRequestLogs() {
				if (this.isCleaningDuplicates) return
				
				this.isCleaningDuplicates = true
				this.totalM3u8Files = 0
				this.processedM3u8Files = 0
				this.duplicatesRemoved = 0
				
				try {
					// 1. 获取总数据量
					const { result: countResult } = await fsidRequestLogCollection.count()
					this.totalM3u8Files = countResult.total
					this.showMessage('info', `开始清理fsid请求日志重复数据，共有 ${this.totalM3u8Files} 条记录`)
					
					// 2. 分页查询所有数据
					const pageSize = 1000
					const totalPages = Math.ceil(this.totalM3u8Files / pageSize)
					
					// 用于存储唯一记录的Map，键为fsid
					const uniqueRecords = new Map()
					// 存储要删除的记录ID
					const recordsToDelete = []
					
					// 分页查询所有数据
					for (let page = 0; page < totalPages; page++) {
						const skipCount = page * pageSize
						const { result } = await fsidRequestLogCollection.skip(skipCount).limit(pageSize).get()
						const records = result.data
						
						// 更新已处理记录数
						this.processedM3u8Files += records.length
						
						// 处理当前页的记录
						for (const record of records) {
							// 创建唯一键，仅使用fsid作为唯一标识
							const uniqueKey = `${record.fsid}`
							
							// 检查是否已存在相同键的记录
							if (uniqueRecords.has(uniqueKey)) {
								// 如果已存在，将当前记录添加到要删除的列表中
								recordsToDelete.push(record._id)
							} else {
								// 如果不存在，将记录添加到唯一记录Map中
								uniqueRecords.set(uniqueKey, record)
							}
						}
						
						// 每处理完一页，显示进度
						this.showMessage('info', `处理进度: ${this.processedM3u8Files}/${this.totalM3u8Files}`)
					}
					
					// 3. 删除重复记录
					for (const recordId of recordsToDelete) {
						await fsidRequestLogCollection.doc(recordId).remove()
						this.duplicatesRemoved++
					}
					
					this.showMessage('success', `清理完成，共删除 ${this.duplicatesRemoved} 条重复记录`)
				} catch (error) {
					console.error('清理fsid请求日志重复数据错误:', error)
					this.showMessage('error', '清理fsid请求日志重复数据错误: ' + error.message)
				} finally {
					this.isCleaningDuplicates = false
				}
			}
		}
	}
</script>

<style>
.container {
	padding: 20px;
}

.operation-area {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 20px;
}

.status-area {
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
	margin-bottom: 20px;
}

.filter-area {
	margin-bottom: 20px;
}

.item-header {
	display: flex;
	align-items: center;
	gap: 10px;
}

.status-badge {
	padding: 2px 8px;
	border-radius: 4px;
	font-size: 12px;
}

.matched {
	background-color: #67C23A;
	color: white;
}

.unmatched {
	background-color: #F56C6C;
	color: white;
}

.synced {
	background-color: #409EFF;
	color: white;
}

.existed {
	background-color: #E6A23C;
	color: white;
}

.control-area {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
}

.selection-controls {
	display: flex;
	align-items: center;
	gap: 10px;
}

.pagination-controls {
	display: flex;
	align-items: center;
	gap: 10px;
}

.grid-container {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 20px;
}

.grid-item {
	border: 1px solid #EBEEF5;
	border-radius: 4px;
	padding: 10px;
	transition: all 0.3s;
}

.grid-item:hover {
	box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.grid-item.selected {
	border-color: #409EFF;
	background-color: rgba(64, 158, 255, 0.1);
}

.grid-item-matched {
	border-left: 4px solid #67C23A;
}

.grid-item-unmatched {
	border-left: 4px solid #F56C6C;
}

.grid-item-synced {
	border-right: 4px solid #409EFF;
}

.grid-item-existed {
	border-right: 4px solid #E6A23C;
}

.grid-item-header {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 10px;
}

.grid-item-content {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.item-title {
	font-weight: bold;
	font-size: 16px;
}

.text-ellipsis {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.item-info {
	display: flex;
	flex-direction: column;
	gap: 5px;
	font-size: 14px;
}

.item-thumbs {
	display: flex;
	gap: 10px;
}

.thumb-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 5px;
}

.thumb {
	width: 120px;
	height: 80px;
	object-fit: cover;
	border-radius: 4px;
}
</style>
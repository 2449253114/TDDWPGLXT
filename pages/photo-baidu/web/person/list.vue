<template>
	<view>
		<view class="uni-header">
			<view class="uni-group" style="justify-content: flex-start;">
				<view class="uni-title">全部人物</view>
				<view class="uni-sub-title">采集地址：https://photo.baidu.com/photo/web/person</view>
				<uni-data-select style="margin-left: 20rpx;" 
					v-model="photobaidu.config.selectValue" 
					:localdata="photobaidu.config.data"
					placeholder="请选择一个采集配置" 
					label="采集配置选择"
				/>
				<button class="uni-button" type="primary" size="mini" @click="startCollectData()">采集人物列表</button>
				<button class="uni-button" type="default" :disabled="disabled" size="mini" 
				@click="syncSelectedPersonsToCloud()">批量关联</button>
				<button class="uni-button" type="default" :disabled="disabled" size="mini"
				@click="delTable()">批量删除</button>
			</view>
			<view class="uni-group"></view>
		</view>
		<view class="uni-container">
			<uni-table ref="table" :loading="loading" emptyText="没有更多数据" border stripe
				type="selection" @selection-change="selectionChange">
				<uni-tr>
					<uni-th width="175px" align="center">人物头像</uni-th>
					<uni-th width="175px" align="center">人物名字</uni-th>
					<uni-th align="center">关联云端</uni-th>
					<uni-th align="center">操作</uni-th>
				</uni-tr>
				<uni-tr v-for="(item,index) in photobaidu.person.data.list" :key="index">
					<uni-td align="center">
						<!-- thumburl [0] 缩略图、[1] 原图大图 -->
						<image :src="item.covers[0].thumb" style="width: 165px;height: 165px;" mode="aspectFill"/>
					</uni-td>
					<uni-td align="center">{{item.name}}</uni-td>
					<uni-td align="center">
						<text :class="item.custom_info.is_bind_cloud ? 'color-green' : 'color-red'">
						    {{ item.custom_info.is_bind_cloud ? '已关联' : '未关联' }}
						</text>
					</uni-td>
					<uni-td align="center">
						<view class="uni-group">
							<button class="uni-button" size="mini"
								type="primary" @click="syncToCloud(item)">关联云端</button>
							<button @click="confirmDelete(item.person_id)" class="uni-button" size="mini"
								type="warn">删除</button>
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>
		</view>
	</view>
</template>

<script>
	import {
		handleUploadFiles
	} from '@/common/myutils/files/new-upload-file.js'
	
	const db = uniCloud.database()
	export default {
		data() {
			return {
				loading: false,
				photobaidu: {
					config: { // 一刻相册的采集配置
						collection: "yike-collection-config",
						selectValue: 0,
						data: []
					},
					person: {// 一刻相册 > 人物
						collection: "yike-person",
						syncList: [] ,// 已关联云端的人物
						data: {
							cursor: "",
							has_more: -1, // 有更多？ 1=有更多，可加载下页。 0=没有更多数据了
							list: [
								/*
								{
									custom_info: {// 自定义属性字段，需要在loadData加载数据完成时为list每个item添加此字段，并且需要在getCloudAlbumList方法中更改此字段的值
										is_bind_cloud: false, // 已关联云端？
									}
								} 
								 */
							]
						}
					}
				},
				selectedIndexs: []// 多选
			}
		},
		computed: {
			disabled() {
				return this.selectedIndexs.length == 0
			}
		},
		onLoad() {
			
		},
		onReady() {
			this.getConfig()
		},
		methods: {
			getConfig() {// 获取 “一刻相册” 采集配置
				const configColl = this.photobaidu.config.collection
				db.collection(configColl)
					.get()
					.then((res) => {
						// res 为数据库查询结果
						//console.log(res.result.data)
						const updatedData = res.result.data.map((item, index) => {
							return {
								...item,
								text: item.notes, // 创建新的 text 字段，赋予 notes 的值
								value: index // 将 value 字段设为 index 索引
							};
						});
						this.photobaidu.config.data = updatedData
					}).catch((err) => {
						console.log(err.code); // 打印错误码
						console.log(err.message); // 打印错误内容
					})
			},
			startCollectData() {// 清空全部人物（人物列表）并开始采集
				this.photobaidu.person.syncList = []
				this.photobaidu.person.data.cursor = ""
				this.photobaidu.person.data.has_more = -1
				this.photobaidu.person.data.list = []
				this.loadData()
			},
			async loadData() {// 加载数据，调用一刻相册https://photo.baidu.com/youai/album/v1/list接口
				if (this.photobaidu.config.data.length == 0) return
				if (this.photobaidu.person.data.has_more == 0) {
					uni.showToast({
						title: '没有更多了'
					})
					return
				}
				const BASE_URL = "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com"
				const ROUTE = "/api/v1/photobaidu/"
				const FUN = "getPersonList"
				
				// 配置项索引
				let configSelectIndex = this.photobaidu.config.selectValue
				let config = this.photobaidu.config.data[configSelectIndex]
				
				// 请求下页时的光标，为空获取第一页数据
				let cursor = this.photobaidu.person.data.cursor || ""
				// 构造查询参数
				let querys = {
					clienttype: "70",// 客户端类型 70为Web
					bdstoken: config.bdstoken
				}
				// 构造请求头
				let headers = {
					"Cookie": config.Cookie,
					"Host": config.Host,
					"Referer": config.Referer // https://photo.baidu.com/photo/web/album=全部相册；不加相册id代表获取全部相册，加相册id代表获取指定id相册
				}
				this.loading = true
				uni.request({
					url: `${BASE_URL}${ROUTE}${FUN}`,
					method: 'POST',// 云对象方法，要用POST
					data: {
						querys,
						headers
					},
					success: (res) => {
						console.log(res)
			
						const { cursor, has_more, total_count, list } = res.data.data;
						
						// 为list中的每个项目添加自定义字段
						const updatedList = list.map(item => ({
							...item,
							custom_info: {
								cover_upload_progress: 0, // 封面（图片）文件上传进度，默认为0
								is_bind_cloud: false, // 是否已关联云端，默认为false
							}
						}));
					
						// 更新相册数据，将新处理的项目添加到现有列表中
						this.photobaidu.person.data = {
							cursor,
							has_more,
							total_count,
							list: [...this.photobaidu.person.data.list, ...updatedList]
						};
						
						// 获取云端相册列表，并更新相应的自定义信息
						this.getCloudPersonList(updatedList);
						
						this.loading = false
					},
					fail: (err) => {
						console.log(err)
						this.loading = false
					}
				})
				
			},
			async getCloudPersonList(personList) {// 批量获取云端人物列表
				// 将 personList 里每个项目的 person_id 放进 ids 数组中
				const ids = personList.map(item => item.person_id);
				const personCollection = this.photobaidu.person.collection // 获取人物列表集合
				
				// 先查询云端是否已存在
				let queryResult;
				try {
					queryResult = await db.collection(personCollection)
						.where({
							person_id: {$in: ids} // 包含ids数组中的人物
						})
						.limit(ids.length)// 设置记录数量（limit，即返回记录的最大数量，默认值为100，也就是不设置limit的情况下默认返回100条数据。limit最大为1000条。）
						.get()
						
				} catch (error) {
					uni.showToast({
						title: '异常错误',
						icon: 'none'
					})
					return
				}
				
				let { errMsg, data } = queryResult.result
				
				// 将 data 里每个 item 的 person_id 追加到 syncList 中
				data.forEach(item => {
				    // 检查 syncList 是否已包含该 person_id，如果不包含，则追加
				    if (!this.photobaidu.person.syncList.includes(item.person_id)) {
				        this.photobaidu.person.syncList.push(item.person_id);
				    }
				});
				console.log(data)
				
				// data 包含云端已存在的项目，用于更新本地列表中的对应项目状态，并同步更新 syncList
				this.photobaidu.person.data.list.forEach(item => {
				    // 检查云端数据中是否存在当前项目
				    const isItemInCloud = data.some(cloudItem => cloudItem.person_id === item.person_id);
				
				    // 如果存在于云端，更新 custom_info.is_bind_cloud
				    if (isItemInCloud) {
				        item.custom_info = item.custom_info || {};
				        item.custom_info.is_bind_cloud = true;// 已关联云端
				    }
				
				    // 检查封面图片 URL 的前缀
				  //   const cloudUrlPrefix = "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com";
				  //   if (item.cover_info && item.cover_info.thumburl && item.cover_info.thumburl[1]) {
				  //       const isCloudUrl = item.cover_info.thumburl[1].startsWith(cloudUrlPrefix);
				  //       // 这里根据需要处理 isCloudUrl 的结果
						// if (isCloudUrl) {
						// 	item.custom_info.cover_upload_progress = 100; // 封面已上传至uniCloud云储存
						// 	item.custom_info.cover_download_progress = 100; // 一刻相册的文件封面已下载到本地
						// }
				  //   }
				});
				
			},
			async syncToCloud(personList) {// 关联云端 [支持单个和批量添加]
			    // 确保传入的参数是数组，如果不是数组，则将其转换为数组
			    let persons = Array.isArray(personList) ? personList : [personList];
			    const ids = persons.map(item => item.person_id); // 从每个人物对象中提取person_id
				
			    const personCollection = this.photobaidu.person.collection; // 获取人物列表集合
			
			    // 先查询云端是否已存在
			    let queryResult;
			    try {
			        queryResult = await db.collection(personCollection)
			            .where({
			                person_id: {$in: ids} // 包含ids数组中的相册
			            })
			            .get();
			    } catch (error) {
			        uni.showToast({
			            title: '异常错误',
			            icon: 'none'
			        });
			        return;
			    }
			
			    let { errMsg, data } = queryResult.result;
			    console.log('data', data);// data仅返回云端中ids中已存在的记录
				
				// 将data中每个item.person_id从ids或persons中排除掉，这样就可以确定批量关联时，云端中没有的记录。
				
				// 排除已经存在于云端的相册 [ 只保留data中没有的项 ]
				persons = persons.filter(personItem => 
					!data.some(existingPersonItem => existingPersonItem.person_id === personItem.person_id)
				);
			
				// 如果没有需要同步的相册，则提前退出
				if (persons.length === 0) {
					uni.showToast({
						title: '没有需要同步的人物',
						icon: 'none'
					});
					return;
				}
				
				
				// 批量上传相册文件封面到uniCloud云储存中
				await handleUploadFiles(persons, (index, progress) => {
				    console.log(`Person ${index} is ${progress}% uploaded.`);
					
					// 获取当前正在上传的项目（progressItem）
					const progressItem = persons[index];
					
					// 查找 list 中与 progressItem 相匹配的项目，并更新其上传进度
					const listIndex = this.photobaidu.person.data.list.findIndex(item => item.person_id === progressItem.person_id);
					if (listIndex !== -1) {
						this.photobaidu.person.data.list[listIndex].custom_info.cover_upload_progress = progress;
					}
					
				})
				.then(updatedList => {
				    console.log('All files uploaded');
					console.log('updatedList', updatedList)
				    // 处理上传后的操作，例如更新列表
					
					persons = updatedList
					
					// 更新List
					updatedList.forEach(updatedItem => {
					    // 查找 this.photobaidu.album.data.list 中具有相同 album_id 的索引
					    const index = this.photobaidu.person.data.list.findIndex(item => item.person_id === updatedItem.person_id);
					
					    // 如果找到匹配的项目，则替换
					    if (index !== -1) {
					        this.photobaidu.person.data.list.splice(index, 1, updatedItem);
					    }
					});
					
				})
				.catch(error => {
				    console.error('Error during file upload:', error);
				});
				
				
			
			    // 定义数据库 schema 中存在的字段
			    const validFields = [
			        'album_id', 'person_id', 'name', 'covers',
					'description', 'link'
			    ];
			
			    // 准备要添加的对象数组
			    let itemsToAdd = persons.map(item => {
			        let newItem = {};
			        // 筛选出有效的字段
			        validFields.forEach(field => {
			            if (item.hasOwnProperty(field)) {
			                newItem[field] = item[field];
			            }
			        });
			        return newItem;
			    });
			
			    // 向数据库批量添加记录
			    let addResult;
			    try {
			        addResult = await db.collection(personCollection).add(itemsToAdd);
			        console.log(addResult.result);
					
					// 更新 this.photobaidu.person.data.list 中的 custom_info.is_bind_cloud 标志
					this.photobaidu.person.data.list.forEach(item => {
					    // 检查 item 是否存在于 albums 中
					    const isSynced = persons.some(personItem => personItem.person_id === item.person_id);
					
					    // 如果存在，则设置 custom_info.is_bind_cloud 为 true
					    if (isSynced) {
					        item.custom_info = item.custom_info || {}; // 确保 custom_info 存在
					        item.custom_info.is_bind_cloud = true; // 关联云端
					    }
					});
					
					// 此时 this.photobaidu.person.data.list 中的相关条目已被更新
					
			        // 记录已同步的相册 id
			        this.photobaidu.person.syncList = [...this.photobaidu.person.syncList, ...ids];
					uni.showToast({
						title: '同步完成',
						icon: 'none'
					})
			    } catch (error) {
			        // 错误处理
			        console.error("Error adding to database:", error);
					uni.showToast({
						title: '同步失败',
						icon: 'none'
					});
			    }
			},
			async syncSelectedPersonsToCloud() {// 将所选人物同步到云端人物列表中
				// 根据selectedIndexs数组获取选中的人物对象
			    const selectedPersons = this.selectedIndexs.map(index => 
			        this.photobaidu.person.data.list[index]
			    );
				
				await this.syncToCloud(selectedPersons)
				
			},
			confirmDelete(person_id) {
				// 删除list中对应person_id的项目
				// 使用 filter 方法删除特定 person_id 的项目
				this.photobaidu.person.data.list = this.photobaidu.person.data.list.filter(item => item.person_id !== person_id);
			},
			// 多选处理
			selectedItems() {
				return this.selectedIndexs.map(i => 
					this.photobaidu.person.data.list[i]
				)
			},
			// 多选
			selectionChange(e) {
				console.log(e.detail.index) // 返回只包含索引的多选项数组 = [1, 2, 3, 5,...] 
				this.selectedIndexs = e.detail.index
			},
			//批量删除
			delTable() {
				const selectedItems = this.selectedItems();
				console.log(selectedItems);
			
				// 获取要删除的 person_id 数组
				const idsToDelete = selectedItems.map(item => item.person_id);
			
				// 从 list 中过滤掉要删除的项目
				this.photobaidu.person.data.list = this.photobaidu.person.data.list.filter(
					item => !idsToDelete.includes(item.person_id)
				);
			
				
			
				// 可以在这里添加代码更新 UI 或给用户反馈
				uni.showToast({
					title: '所选项目已删除',
					icon: 'none'
				});
				
				this.$refs.table.clearSelection() // 用于多选表格，清空用户的选择
				// 清空已选择的索引
				this.selectedIndexs = [];
			}
		}
	}
</script>

<style>
</style>
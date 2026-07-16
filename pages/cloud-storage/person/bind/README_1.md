```json
[// photobaidu.album.data.list
    {
        "fsid": 254004265716824,
        "path": "/youa/web/Porsch_Porsch9615f9880r145629215f15f6bdcc318b.jpg",
        "thumburl": [
            "https://pcsdata.baidu.com/thumbnail/aa96ebc86j153a2d19c0b21564e8de7e?fid=1815907562-16051585-254004265716824&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-v0qTP3jLgk55XV1HWMD80Tqojzk%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=65901201575563513&dp-callid=0&time=1717167600&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
            "https://pcsdata.baidu.com/thumbnail/aa96ebc86j153a2d19c0b21564e8de7e?fid=1815907562-16051585-254004265716824&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-v0qTP3jLgk55XV1HWMD80Tqojzk%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=65901201575563513&dp-callid=0&time=1717167600&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
        ],
    }
]
```
```vue
<template>
	<div class="people-container">
		<div class="person" v-for="(person, index) in personData" :key="index"
			:class="{ 'highlighted': selectedPersonIndex === index, 'hidden': selectedPersonIndex !== null && selectedPersonIndex !== index }"
			@click="selectPerson(index)"
		>
			<image :src="person.covers[0].thumb" class="person-image" mode="aspectFill" />
			<div class="person-name">{{ person.name }}</div>
		</div>
	</div>
	<div v-if="selectedPersonIndex !== null" class="person-introduction">
		<h2>{{ personData[selectedPersonIndex].name }}</h2>
		<!-- 在这里添加更多人物介绍的信息 -->
		<p>这里是人物介绍...</p>
		
		<!-- // 这里渲染selectedPersonCoverData，和上面people-container样式一样
		// selectedPersonCoverData代表这个人物的所有头像数据（就是通过搜索查询字符串匹配到的当前人物的所有头像数据）
		// selectedPersonCoverData是从photobaidu.album.data.list的item.path字段中匹配出来的数据
		// 所以这里有个搜索框，用来查找item.path中匹配到的所有item数据
		<input class="uni-search" type="text" v-model="你帮我写" @confirm="你帮我写" placeholder="你帮我写" />
		
		// 这是一个 item.path: "/youa/web/Porsch_Porsch9615f9880r145629215f15f6bdc 的数据示例
		// 匹配规则就是从 /youa/web/ 起，来查找输入框输入的
		// 比如我输入的是Porsch 那么就能匹配到如下
		// /youa/web/Porsch_Porsch9615f9880r145629215f15f6bdc
		// /youa/web/Porsch_Porsch724caf0b1l6e23d84b7c6d9e0a -->
		
		
		<input
			class="uni-search"
			type="text"
			v-model="searchQuery"
			@input="searchCovers"
			placeholder="输入关键词搜索封面"
		/>
	
		<div class="people-container">
			<div
			  v-for="(cover, index) in 关键词搜索匹配出来的封面数据"
			  :key="index"
			  class="cover"
			>
				<image :src="cover" class="cover-image" mode="aspectFill"/>
				// fsid
			</div>
		</div>
	</div>
</template>

<script>
	const db = uniCloud.database()
	// 全部人物
	const personCollectionName = 'yike-person'
	const personCollection = db.collection(personCollectionName)

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
					album: { // 一刻相册 相册文件
						album_id: "2494020321173028889", // 相册id，用于采集当前相册的所有文件
						data: { // 相册全部文件数据，接口：https://photo.baidu.com/youai/album/v1/listfile
							cursor: "",
							has_more: -1, // 有更多？ 1=有更多，可加载下页。 0=没有更多数据了
							list: [], // 相册文件列表
							total_count: 0, // 总数量,
							pic_count: 0, // 图片数量
							video_count: 0, // 视频数量
						}
					}
				},
				personData: [],
				selectedPersonIndex: null, // 被选中的人物索引
				searchQuery: '', // 搜索查询字符串
				你帮我起名: [], // 选中人物的所有头像数据（就是通过搜索查询字符串匹配到的当前人物的所有头像数据）
			}
		},
		async onReady() {
			this.getConfig()
			await this.loadPersonData()
		},
		methods: {
			getConfig() { // 获取 “一刻相册” 采集配置
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
			async loadPersonData() {
				const {
					result
				} = await personCollection.where({
					status: 1
				}).get()
				console.log('result', result)
				this.personData = result.data
			},
			selectPerson(index) {
				if (this.selectedPersonIndex === index) {
					// 如果点击的索引与当前选中的相同，则取消选择
					this.selectedPersonIndex = null;
				} else {
					// 否则，更新选中的索引
					this.selectedPersonIndex = index;
				}
			},
			resetParam() {
				this.photobaidu.album.data.cursor = ""
				this.photobaidu.album.data.has_more = -1
				this.photobaidu.album.data.total_count = 0
				this.photobaidu.album.data.pic_count = 0
				this.photobaidu.album.data.video_count = 0
				this.photobaidu.album.data.list = []
			},
			async startCollectData() { // 清空全部相册文件（相册文件列表）并开始采集
				uni.showLoading({
					title: '加载中'
				})
				if (this.loading == true) {
					uni.showToast({
						title: '采集中，不可操作'
					})
					return
				}
				this.resetParam()
				await this.loadAlbumFileData()
			},
			async loadAlbumFileData() { // 加载数据，调用一刻相册https://photo.baidu.com/youai/album/v1/listfile接口
				if (this.photobaidu.album.data.has_more == 0) {
					this.loading = false
					uni.hideLoading()
					uni.showToast({
						title: '没有更多了'
					})
					return
				}

				const BASE_URL = "https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com"
				const ROUTE = "/api/v1/photobaidu/"
				const FUN = "getAlbumListFile"


				// 配置项索引
				let configSelectIndex = this.photobaidu.config.selectValue
				let config = this.photobaidu.config.data[configSelectIndex]

				// 请求下页时的光标，为空获取第一页数据
				let cursor = this.photobaidu.album.data.cursor

				// 构造查询参数
				let querys = {
					clienttype: "70", // 客户端类型 70为Web
					bdstoken: config.bdstoken
				}

				// 相册id，用于采集当前相册的所有文件
				let album_id = this.photobaidu.album.album_id
				// 构造body<form-data>表单参数
				let formdatas = {
					cursor, // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
					album_id, // string
					need_amount: "1", // 默认 string
					limit: "100", // 每页100条（Web版默认）string
					passwd: "" // 默认 string
				}



				// 构造请求头
				let headers = {
					"Cookie": config.Cookie,
					"Host": config.Host,
					"Origin": config.Origin,
					"Referer": `${config.Referer}/${album_id}` // https://photo.baidu.com/photo/web/album=全部相册；不加相册id代表获取全部相册，加相册id代表获取指定id相册
				}

				this.loading = true
				await uni.request({
					url: `${BASE_URL}${ROUTE}${FUN}`,
					method: 'POST', // 云对象方法，要用POST
					data: {
						querys,
						formdatas,
						headers
					},
					success: async (res) => {
						console.log("album/v1/listfile：", res)

						// 首先检查 res.data.data 是否存在且包含 list 属性
						if (!res.data.data || !res.data.data.list) {
							uni.showToast({
								title: '请求失败'
							})
							return; // 如果不存在，直接返回
						}

						const {
							cursor,
							has_more,
							total_count,
							pic_count,
							video_count,
							list
						} = res.data.data;

						// 更新相册文件数据，将新处理的项目添加到现有列表中
						this.photobaidu.album.data = {
							cursor,
							has_more,
							total_count,
							pic_count,
							video_count,
							// 将更新后的 list 与原有 list 合并
							list: [...this.photobaidu.album.data.list, ...list],
						};

						if (has_more == 1) { // 1=有更多
							setTimeout(async () => {
								// 递归调用自身
								await this.loadAlbumFileData()
							}, 1000)
						} else {
							this.loading = false
							uni.hideLoading()
						}

					},
					fail: (err) => {
						console.log(err)
						this.loading = false
						uni.hideLoading()
					}
				})

			},
		}
	}
</script>
```












下面的代码目前还有点问题
```vue
<input
	class="uni-search"
	type="text"
	v-model="searchQuery"
	@confirm="searchCovers"
	placeholder="输入关键词搜索封面"
/>
			
<div class="people-container">
	<div
	  v-for="(cover, index) in filteredCovers"
	  :key="index"
	  class="cover"
	>
		<image :src="cover.thumburl[0]" class="cover-image" mode="aspectFill"/>
		<div>{{ cover.fsid }}</div>
	</div>
</div>
computed: {
	filteredCovers() {
		this.selectedCovers = this.photobaidu.album.data.list.filter(cover => cover.path.includes(this.searchQuery));
		console.log('selectedCovers', this.selectedCovers)
		return this.selectedCovers
	}
},
async onReady() {
	this.getConfig()
	await this.loadPersonData()
},
methods: {
	// ...其他方法...
	selectPerson(index) {
		if (this.selectedPersonIndex === index) {
			// 如果点击的索引与当前选中的相同，则取消选择
			this.selectedPersonIndex = null;
			this.selectedCovers = [];
		} else {
			// 否则，更新选中的索引
			this.selectedPersonIndex = index;
			// 假设photobaidu.album.data.list是所有封面数据的数组
			//this.selectedCovers = this.photobaidu.album.data.list.filter(item => item.path.includes(this.personData[index].name));
			this.selectedCovers = [];
		}
	},
```
当我selectedPersonIndex更新时，我应该清空filteredCovers
























```vue
<div class="people-container">
	<div class="person" v-for="(person, index) in personData" :key="index"
		:class="{ 'highlighted': selectedPersonIndex === index, 'hidden': selectedPersonIndex !== null && selectedPersonIndex !== index }"
		@click="selectPerson(index)"
	>
		<image :src="person.covers[0].thumb" class="person-image" mode="aspectFill" />
		<div class="person-name">{{ person.name }}</div>
	</div>
</div>
<div v-if="selectedPersonIndex !== null" class="person-introduction">
	<h2>{{ personData[selectedPersonIndex].name }}</h2>
	<input
		class="uni-search"
		type="text"
		v-model="searchQuery"
		@confirm="searchCovers"
		placeholder="输入关键词搜索封面"
	/>
	
	<button 
		v-if="filteredCovers.length >= 1"
		class="uni-button" 
		type="primary" 
		size="mini" 
		@click="startCollectData()"
	>绑定人物封面</button>
	
	<div class="people-container">
		<div
		  v-for="(cover, index) in filteredCovers"
		  :key="index"
		  class="cover"
		>
			<image :src="cover.thumburl[0]" class="cover-image" mode="aspectFill"/>
			<div>{{ cover.fsid }}</div>
		</div>
	</div>
	
</div>
<script>
	const db = uniCloud.database()
	// 全部人物
	const personCollectionName = 'yike-person'
	const personCollection = db.collection(personCollectionName)

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
					album: { // 一刻相册 相册文件
						album_id: "2494020321173028889", // 相册id，用于采集当前相册的所有文件
						data: { // 相册全部文件数据，接口：https://photo.baidu.com/youai/album/v1/listfile
							cursor: "",
							has_more: -1, // 有更多？ 1=有更多，可加载下页。 0=没有更多数据了
							list: [], // 相册文件列表
							total_count: 0, // 总数量,
							pic_count: 0, // 图片数量
							video_count: 0, // 视频数量
						}
					}
				},
				personData: [],
				selectedPersonIndex: null, // 被选中的人物索引
				searchQuery: '', // 搜索查询字符串
				selectedCovers: [], // 选中人物的所有头像数据（就是通过搜索查询字符串匹配到的当前人物的所有头像数据）
			}
		},
		computed: {
			filteredCovers() {
				this.selectedCovers = this.photobaidu.album.data.list.filter(cover => cover.path.includes(this.searchQuery));
				console.log('selectedCovers', this.selectedCovers)
				return this.selectedCovers
			}
		},
		async onReady() {
			this.getConfig()
			await this.loadPersonData()
		},
		methods: {
			// ...其他方法...
			selectPerson(index) {
				if (this.selectedPersonIndex === index) {
					// 如果点击的索引与当前选中的相同，则取消选择
					this.selectedPersonIndex = null;
					this.searchQuery = ""
					this.selectedCovers = [];
				} else {
					// 否则，更新选中的索引
					this.selectedPersonIndex = index;
					// 假设photobaidu.album.data.list是所有封面数据的数组
					//this.selectedCovers = this.photobaidu.album.data.list.filter(item => item.path.includes(this.personData[index].name));
					this.searchQuery = ""
					this.selectedCovers = [];
				}
			},
			searchCovers() {
				// 在这里不需要额外的逻辑，因为搜索结果是通过计算属性`filteredCovers`实现的
			},
			// 这里增加个方法，就是将当前选择的人物绑定selectedCovers
			// personData的(当前选择的人物)item.covers = selectedCovers（且只要selectedCovers里item.fsid、item.path、item.thumb这3个字段）
			
```










```javascript
// 添加被封禁的用户id，这些用户是购买了VIP会员后使用一段时间就投诉订单，然后处理了退款，需要把这些人永久性封禁
// 不能让它们登录APP，因为这些人里面有部分人是白嫖，先充钱白嫖几天，然后再投诉订单为他处理退款。
const disable_login_users = [
	"665368d2bd022087df814884", // 退款商户订单号：VIPCZ1716744531428210、微信订单号：4200002221202405276223208373，退款时间：2024-06-02 03:43:50
	"66574e4fee97ef5896c816d8", // 退款商户订单号：VIPCZ1717267947894389、微信订单号：4200002314202406024446124783，退款时间：2024-06-02 03:33:28
]

// 账号效验，如果有记录，则说明此设备已注册过账号，可以直接登录，否则直接注册
if (queryUserResult['affectedDocs'] == 1) { // 有记录，此账号存在

	const user = queryUserResult['data'][0]
	const {
		_id: user_id
	} = user
	
	// 我需要在这里处理 检查是否为disable_login_users中的被永久禁止登录的用户
	// 如果是，则不让登录
	return createResponse(STATE_CODE.SUCCESS, "这里你帮我写");
```








现在有个新VIP套餐定价，你认为定价多少合适，我先给你我已有套餐价格
180天（6个月）360元
365天（12个月）599元
新的套餐：90天（3个月）单价多少合适呢？














我现在有个需求，先给你代码
```vue
<template>
	<view>
		<view class="uni-header">
			<view class="uni-group" style="justify-content: flex-start;">
				<view class="uni-title">为人物cover绑定fsid</view>
				<view class="uni-sub-title">采集地址：https://photo.baidu.com/photo/web/album/2494020321173028889</view>
				<uni-data-select style="margin-left: 20rpx;" v-model="photobaidu.config.selectValue"
					:localdata="photobaidu.config.data" placeholder="请选择一个采集配置" label="采集配置选择" />
				<button class="uni-button" type="primary" size="mini" @click="startCollectData()">采集相册文件</button>
			</view>

			<button class="uni-button" type="warn" size="mini"
				@click="testAutoUpdatePersonInCovers()">测试自动更新人物封面任务</button>

		</view>
		<view class="uni-container">
			<div class="people-container">
				<div class="person" v-for="(person, index) in personData" :key="index"
					:class="{ 'highlighted': selectedPersonIndex === index, 'hidden': selectedPersonIndex !== null && selectedPersonIndex !== index }"
					@click="selectPerson(index)">
					<image :src="person.covers[0].thumb" class="person-image" mode="aspectFill" />
					<div class="person-name">{{ person.name }}</div>
				</div>
			</div>
			<div v-if="selectedPersonIndex !== null" class="person-introduction">
				<h2>{{ personData[selectedPersonIndex].name }}</h2>
				
				<input class="uni-search" type="text" v-model="searchQuery" @confirm="searchCovers"
					placeholder="输入关键词搜索封面" />

				<button v-if="filteredCovers.length >= 1" class="uni-button" type="primary" size="mini"
					@click="bindSelectedCoversToPerson()">绑定人物封面</button>

				<div class="people-container">
					<div v-for="(cover, index) in filteredCovers" :key="index" class="cover">
						<image :src="cover.thumburl[0]" class="cover-image" mode="aspectFill" />
						<div>{{ cover.fsid }}</div>
					</div>
				</div>

			</div>

		</view>
	</view>
</template>
<script>
	const db = uniCloud.database()
	// 全部人物
	const personCollectionName = 'yike-person'
	const personCollection = db.collection(personCollectionName)

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
					album: { // 一刻相册 相册文件
						album_id: "2494020321173028889", // 相册id，用于采集当前相册的所有文件
						data: { // 相册全部文件数据，接口：https://photo.baidu.com/youai/album/v1/listfile
							cursor: "",
							has_more: -1, // 有更多？ 1=有更多，可加载下页。 0=没有更多数据了
							list: [], // 相册文件列表
							total_count: 0, // 总数量,
							pic_count: 0, // 图片数量
							video_count: 0, // 视频数量
						}
					}
				},
				personData: [],
				selectedPersonIndex: null, // 被选中的人物索引
				searchQuery: '', // 搜索查询字符串
				selectedCovers: [], // 选中人物的所有头像数据（就是通过搜索查询字符串匹配到的当前人物的所有头像数据）
				autoUpdatePersonCoversData: [
					{
						"_id": "662d0321eef9cb63bb916aac",
						"album_id": "3641378994058590416",
						"name": "Porsch 🇹🇭🐻",
						"searchQuery": "Porsch", // 搜索查询字符串
					},
				]
			}
		},
		computed: {
			filteredCovers() {
				this.selectedCovers = this.photobaidu.album.data.list.filter(cover => cover.path.includes(this
					.searchQuery));
				console.log('selectedCovers', this.selectedCovers)
				return this.selectedCovers
			}
		},
		async onReady() {
			await this.loadPersonData()
		},
				// ...其他方法...
		selectPerson(index) {
			if (this.selectedPersonIndex === index) {
				// 如果点击的索引与当前选中的相同，则取消选择
				this.selectedPersonIndex = null;
				this.searchQuery = ""
				this.selectedCovers = [];
			} else {
				// 否则，更新选中的索引
				this.selectedPersonIndex = index;
				// 假设photobaidu.album.data.list是所有封面数据的数组
				//this.selectedCovers = this.photobaidu.album.data.list.filter(item => item.path.includes(this.personData[index].name));
				this.searchQuery = ""
				this.selectedCovers = [];
			}
		},
		searchCovers() {
			// 在这里不需要额外的逻辑，因为搜索结果是通过计算属性`filteredCovers`实现的
		},
		// 新增方法: 绑定选中的封面到当前选中的人物
		bindSelectedCoversToPerson() {
			if (this.selectedPersonIndex === null) return; // 如果没有选中任何人物，就直接返回

			// 只保留 fsid、path、thumb 字段
			const coversToBind = this.filteredCovers.map(cover => ({
				fsid: cover.fsid,
				path: cover.path,
				thumb: cover.thumburl[0],
			}));

			// 更新当前选中人物的 covers 属性
			this.$set(this.personData[this.selectedPersonIndex], 'covers', coversToBind);

			console.log('this.personData[this.selectedPersonIndex]', this.personData[this.selectedPersonIndex])

			// 可能需要的后续操作，比如更新数据库中的数据
			// 注意：这里的示例假设你将在其他地方处理数据库更新操作
			// 例如：this.updatePersonInDatabase(this.personData[this.selectedPersonIndex]);
		},
		// 新增测试方法，用于云函数自动更新人物头像的人物
		testAutoUpdatePersonInCovers() {
			if (this.photobaidu.album.data.list.length == 0) {
				uni.showToast({
					title: "请先采集相册文件",
					icon: "none"
				})
				return
			}

			const testPersonData = [{
				"_id": "662d0321eef9cb63bb916aac",
				"name": "Porsch 🇹🇭🐻",
				"album_id": "3641378994058590416",
				"covers": [{
						"fsid": 444393054614149,
						"path": "/youa/web/Porsch_09873253876.jpg",
						"thumb": ""
					},
					{
						"fsid": 466054668014736,
						"path": "/youa/web/Porsch_Porschb993548a3sc2d01c6cb82f26cd41204a.jpg",
						"thumb": ""
					},
					{
						"fsid": 194976142329377,
						"path": "/youa/web/Porsch_Porsch83aaa7a66r24bf4d66919a745518c9e4.jpg",
						"thumb": ""
					}
				]
			}]

			//const testUpdatePersonData = 遍历testPersonData里item.covers里item.fsid = 从this.photobaidu.album.data.list里找到的item.fsid, 然后更新item.thumb = 从...album.data.list里找到的item.fsid这个数据的thumburl[0]

			// 遍历 testPersonData 来更新 covers 中的 thumb
			const testUpdatePersonData = testPersonData.map(person => {
				const updatedCovers = person.covers.map(cover => {
					// 在相册数据中找到匹配的封面
					const matchedCover = this.photobaidu.album.data.list.find(albumCover => albumCover
						.fsid === cover.fsid);
					// 如果找到，更新 thumb，否则保持原来的 thumb
					const updatedThumb = matchedCover ? matchedCover.thumburl[0] : cover.thumb;
					return {
						...cover,
						thumb: updatedThumb
					};
				});

				return {
					...person,
					covers: updatedCovers
				};
			});

			// 在这里，testUpdatePersonData 包含更新后的数据
			console.log('Updated testUpdatePersonData', testUpdatePersonData);
			// 如果你需要将更新的数据保存到数据库，你可以在这里添加相应的逻辑

		},
		// 这里我需要新增个方法
		// 通过autoUpdatePersonCoversData里item.searchQuery来自动设置this.searchQuery，并且找到对应的selectedPersonIndex索引（索引寻找方法：autoUpdatePersonCoversData里item.album_id == personData里item.album_id）
		// 然后自动更新人物头像的人物，逻辑在testAutoUpdatePersonInCovers里，只不过testAutoUpdatePersonInCovers里的是写上的测试用的，你可以参考，应该能明白我想表达的意思吧
		// 改进的自动更新人物的封面方法
		async autoUpdatePersonCovers() {
		    // 遍历 autoUpdatePersonCoversData 数组
		    for (const updateItem of this.autoUpdatePersonCoversData) {
				// 设置搜索查询字符串
				this.searchQuery = updateItem.searchQuery;
		
		      // 找到对应的 personData 索引
		      const personIndex = this.personData.findIndex(person => person.album_id === updateItem.album_id);
		
		      // 如果找到对应的人物
		      if (personIndex !== -1) {
		        // 更新 selectedPersonIndex
		        this.selectedPersonIndex = personIndex;
		        
		        // 模拟搜索封面的操作，实际上是通过计算属性 filteredCovers 完成的
		        // 因此这里不需要显式调用方法，只要确保 searchQuery 和 personData 更新即可
		
		        // 模拟绑定选中的封面到当前选中的人物
		        // 此处直接使用计算属性 filteredCovers 的结果进行绑定
		        const coversToBind = this.filteredCovers.map(cover => ({
		          fsid: cover.fsid,
		          path: cover.path,
		          thumb: cover.thumburl[0],
		        }));
		
		        // 更新当前选中人物的 covers 属性
		        this.$set(this.personData[personIndex], 'covers', coversToBind);
		
		        // 进行自动更新人物封面的逻辑
		        // 遍历 personData 中当前选中的人物的封面
		        const personToUpdate = this.personData[personIndex];
		        personToUpdate.covers = personToUpdate.covers.map(cover => {
		          // 在相册数据中找到匹配的封面
		          const matchedCover = this.photobaidu.album.data.list.find(albumCover => albumCover.fsid === cover.fsid);
		          // 如果找到，更新 thumb，否则保持原来的 thumb
		          const updatedThumb = matchedCover ? matchedCover.thumburl[0] : cover.thumb;
		          return {
		            ...cover,
		            thumb: updatedThumb
		          };
		        });
		
		        // 更新该人物在 personData 中的数据
		        this.$set(this.personData, personIndex, personToUpdate);
		
		        // 可能需要的后续操作，比如更新数据库中的数据
		        // 注意：这里的示例假设你将在其他地方处理数据库更新操作
		      }
		    }
		    
		    // 更新完成后重置 selectedPersonIndex 和 searchQuery
		    this.selectedPersonIndex = null;
		    this.searchQuery = '';
		},
	}		
```













这里我是实在不知道怎么写了，你帮我写
```javascript
async function autoUpdatePersonCoversTask() {
	let currentAlbumId = "2494020321173028889";
	let currentCursor = ""; // 光标，用于请求下一页
	
	
	// 加载相册文件
	let { data: loadData } = await loadAlbumFiles(currentAlbumId, currentCursor);
	// console.log('loadData', loadData)
	// 根据loadAlbumFileData进行后续处理...
	const albumFiles = loadData.list; // 相册文件列表
	// 请求下页时用到的
	const next_cursor = loadData.cursor; // 下一页的光标
	const next_has_more = loadData.has_more; // 是否还有更多数据 ? 1 还有更多、0 没有更多了
	
	if (next_has_more === 1) {
		// 如果还有更多数据，继续请求下一页，比如在内部递归，因为要保证主函数autoUpdatePersonCoversTask中的albumFiles在每次递归加载相册文件时不被重置等。
		// 但是要保证albumFiles不被清空或重置，直到没有下页了
		
	}
	
	// 没有下页时，才能走下来
	// 这里是其他业务代码
	
}
```



我需要你帮我把我的代码加上间隔请求，每次间隔1-3秒
```javascript
async function loadAlbumFiles(
	album_id = "",
	cursor = ""
) {

	// 一刻相册的请求头
	let headers = {
		"Cookie": photoConfig.headers.Cookie,
		"Host": photoConfig.headers.Host,
		"Origin": "https://photo.baidu.com",
		"Referer": `https://photo.baidu.com/photo/web/album/${album_id}`
	}

	// querys参数只能是Sting类型
	const clienttype = "70"; // 客户端类型 70为Web
	const bdstoken = "5b3bda475d3738a44580fff097ee8037"; // 
	// cursor变量已在函数参数中声明，无需再次声明
	//const cursor = cursor; // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
	const need_amount = "1"; // 默认
	const limit = "100"; // 默认
	const passwd = "";

	// 构建 form-data 字符串
	let formData = '';
	formData += `cursor=${encodeURIComponent(cursor)}&`;
	formData += `album_id=${encodeURIComponent(album_id)}&`;
	formData += `need_amount=${encodeURIComponent(need_amount)}&`;
	formData += `limit=${encodeURIComponent(limit)}`;
	formData += `&passwd=${encodeURIComponent(passwd)}`;

	const apiUrl = `https://photo.baidu.com/youai/album/v1/listfile?clienttype=${clienttype}&bdstoken=${bdstoken}`

	try {
		const res = await uniCloud.httpclient.request(apiUrl, {
			method: 'POST',
			headers: {
				"Content-Type": "application/x-www-form-urlencoded", // 此类型在['https://photo.baidu.com/youai/album/v1/listfile']接口，控制台中看Network > api接口 > Header > Request Headers 中查看
				...headers
			},
			content: formData,
			dataType: 'json' // 此处指定为json表示将此请求的返回值解析为json
		});

		console.log('res', res)
		return createResponse(STATE_CODE.SUCCESS, "请求成功", res.data)

	} catch (error) {

		return createResponse(STATE_CODE.FAIL, "请求失败", error)
	}

}

async function loadAllAlbumFiles(albumId, cursor, allFiles) {
	// 如果是初始调用，allFiles 应该是空数组
	allFiles = allFiles || [];

	// 加载相册文件
	let {
		data: loadData
	} = await loadAlbumFiles(albumId, cursor);
	// console.log('loadData', loadData)
	allFiles = allFiles.concat(loadData.list); // 追加相册文件列表

	if (loadData.has_more === 1) {
		// 如果还有更多数据，递归调用自身来加载下一页
		return loadAllAlbumFiles(albumId, loadData.cursor, allFiles);
	} else {
		// 没有更多数据，返回最终的所有相册文件列表
		return allFiles;
	}
}
```














```javascript
// 定义一个函数来随机选择avatarurl
function selectRandomAvatarUrl(personInfo, defaultUrl) {
	if (personInfo && personInfo.avatarurl && personInfo.avatarurl.length > 0) {
		// 如果存在avatarurl数组，随机选择一个索引
		const randomIndex = Math.floor(Math.random() * personInfo.avatarurl.length);
		// 返回随机选取的avatarurl的thumb属性
		return personInfo.avatarurl[randomIndex].thumb;
	} else {
		// 如果没有avatarurl数组，返回默认的url
		return defaultUrl;
	}
}

// 确保 item.covers 是一个数组且至少有一个元素
if (Array.isArray(item.covers) && item.covers.length > 0) {
    //item.thumburl = item.covers[0].thumb;
	// 我需要在这里用selectRandomAvatarUrl这个函数，来随机选一张
	
} else {
    // 如果没有封面，可以设置一个默认的thumb值或者跳过设置
    item.thumburl = 'defaultThumb.jpg'; // 或者其他您希望设置的默认值
}
```












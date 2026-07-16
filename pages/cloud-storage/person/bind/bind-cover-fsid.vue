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

			<!-- <button class="uni-button" type="warn" size="mini"
				@click="testAutoUpdatePersonInCovers()">测试自动更新人物封面任务</button> -->

			<button class="uni-button" type="warn" size="mini" @click="autoUpdatePersonCovers()">测试动态自动更新人物封面任务</button>

		</view>
		<view class="uni-container">
			<div class="people-container">
				<div class="person" v-for="(person, index) in personData" :key="index"
					:class="{ 'highlighted': selectedPersonIndex === index, 'hidden': selectedPersonIndex !== null && selectedPersonIndex !== index }"
					@click="selectPerson(index)">
					<image v-if="person.covers && person.covers.length >= 1" :src="person.covers[0].thumb"
						class="person-image" mode="aspectFill" />
					<div class="person-name">{{ person.name }}</div>
				</div>
			</div>
			<div v-if="selectedPersonIndex !== null" class="person-introduction">
				<h2>{{ personData[selectedPersonIndex].name }}</h2>
				<!-- 在这里添加更多人物介绍的信息 -->
				<p>这里是人物介绍...</p>

				<!-- // 这里渲染selectedPersonCoverData，和上面people-container样式一样
				// selectedPersonCoverData代表这个人物的所有头像数据
				// selectedPersonCoverData是从photobaidu.album.data.list的item.path字段中匹配出来的数据
				// 所以这里有个搜索框，用来查找item.path中匹配到的所有item数据
				<input class="uni-search" type="text" v-model="你帮我写" @confirm="你帮我写" placeholder="你帮我写" />
				
				// 这是一个 item.path: "/youa/web/Porsch_Porsch9615f9880r145629215f15f6bdc 的数据示例
				// 匹配规则就是从 /youa/web/ 起，来查找输入框输入的
				// 比如我输入的是Porsch 那么就能匹配到如下
				// /youa/web/Porsch_Porsch9615f9880r145629215f15f6bdc
				// /youa/web/Porsch_Porsch724caf0b1l6e23d84b7c6d9e0a -->


				<input class="uni-search" type="text" v-model="searchQuery" @confirm="searchCovers"
					placeholder="输入关键词搜索封面" />

				<button v-if="filteredCovers.length >= 1" class="uni-button" type="primary" size="mini"
					@click="bindSelectedCoversToPerson()">绑定人物封面</button>

				<div class="people-container">
					<div v-for="(cover, index) in filteredCovers" :key="index" class="cover">
						<image v-if="cover.thumburl && cover.thumburl.length >= 1" :src="cover.thumburl[0]"
							class="cover-image" mode="aspectFill" />
						<div>{{ cover.fsid }}</div>
						<div>{{ cover.path }}</div>
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
				autoUpdatePersonCoversData: [{ // 配置“测试动态自动更新人物封面任务”的数据，自动匹配头像图片在一刻相册的fsid文件itme
						"_id": "662d0321eef9cb63bb916aac",
						"album_id": "3641378994058590416",
						"name": "Porsch 🇹🇭🐻",
						"searchQuery": "Porsch", // 搜索查询字符串
					},
					{
						"_id": "662d0321eef9cb63bb916aad",
						"album_id": "4328495618609692526",
						"name": "chubbybearth18",
						"searchQuery": "chubbybearth18",
					},
					{
						"_id": "662d0321eef9cb63bb916aae",
						"album_id": "4581226870739772286",
						"name": "Noomz98",
						"searchQuery": "Noomz98",
					},
					{
						"_id": "662d0321eef9cb63bb916aaf",
						"album_id": "2912542151292422080",
						"name": "Bくん@blc113",
						"searchQuery": "blc113",
					},
					{
						"_id": "662d0321eef9cb63bb916ab0",
						"album_id": "3265019305087839765",
						"name": "cubcubic",
						"searchQuery": "cubcubic",
					},
					{
						"_id": "662d0321eef9cb63bb916ab1",
						"album_id": "4342923770516638361", // 当自动更新封面时，当前album_id用于获取选择人物的索引
						"name": "Q@qqqqq_oo",
						"searchQuery": "qqqqq_oo", // 正在配置搜索词
					},
					{
						"_id": "662d0321eef9cb63bb916ab2",
						"album_id": "3530886400097031219",
						"name": "たかしエロ親父",
						"searchQuery": "親父", // 正在配置搜索词
					},
					{
						"_id": "662d0321eef9cb63bb916ab3",
						"album_id": "4042601611161925931",
						"name": "ogomji",
						"searchQuery": "ogomji", // 正在配置搜索词
					},
					{
						"_id": "662d0321eef9cb63bb916ab4",
						"album_id": "4296585650970392599",
						"name": "BK_bear",
						"searchQuery": "BK_bear", // 正在配置搜索词
					},
					{
						"_id": "662d0321eef9cb63bb916ab5",
						"album_id": "3860903141996939967",
						"name": "Val",
						"searchQuery": "Val", // 正在配置搜索词
					},
					{
						"_id": "662d0321eef9cb63bb916ab9",
						"album_id": "2613449571532395170",
						"name": "龍龍龍",
						"searchQuery": "龍龍龍", // 正在配置搜索词
					},
					{
						"_id": "6633b8473d029c65e951bd4d",
						"album_id": "4181598028374802542",
						"name": "他噗",
						"searchQuery": "他噗", // 正在配置搜索词
					},
					{
						"_id": "6633bbb81c90b65e433e9329",
						"album_id": "4137830958416300293",
						"name": "阿星🎖🏅",
						"searchQuery": "抖音阿星", // 正在配置搜索词
					},
					{
						"_id": "6633c0a9466d41f585c6b661",
						"album_id": "3461807969446221749",
						"name": "楠楠",
						"searchQuery": "楠楠", // 正在配置搜索词
					},
					{
						"_id": "6633c154ee97ef5896d8f012",
						"album_id": "4063694655506579849",
						"name": "TWPDS",
						"searchQuery": "TWPDS", // 正在配置搜索词
					},
					{
						"_id": "6633c1cbeef9cb63bb593ae8",
						"album_id": "3579229012475914037",
						"name": "赤熊AKAKUMA",
						"searchQuery": "赤熊AKAKUMA", // 正在配置搜索词
					},
					{
						"_id": "6633c577a7c432936b9b3b24",
						"album_id": "4305064359373303574",
						"name": "thiccbunzcub",
						"searchQuery": "thiccbunzcub", // 正在配置搜索词
					},
					{
						"_id": "6633c7708b0da4a4e4c0649f",
						"album_id": "2512392963976525336",
						"name": "銀次郎",
						"searchQuery": "銀次郎", // 正在配置搜索词
					},
					{
						"_id": "6633ca2da7c432936b9b9d3e",
						"album_id": "4596316120806185809",
						"name": "熊教授",
						"searchQuery": "熊教授", // 正在配置搜索词
					},
					{
						"_id": "6633cf02b9fb2360b0ac5318",
						"album_id": "4167709408245590722",
						"name": "森林味的风",
						"searchQuery": "森林味的风", // 正在配置搜索词
					},
					{
						"_id": "6633d0fd21821b6d2b99687e",
						"album_id": "3794217936015822516",
						"name": "チマキ",
						"searchQuery": "chimakiad", // 正在配置搜索词
					},
					{
						"_id": "6633d35aeef9cb63bb5a4a6e",
						"album_id": "4399974055268226762",
						"name": "benz",
						"searchQuery": "benz", // 正在配置搜索词
					},
					{
						"_id": "6633d7723d029c65e9544c23",
						"album_id": "3670888259671190467",
						"name": "LoveLittleCat",
						"searchQuery": "LoveLittleCat", // 正在配置搜索词
					},
					{
						"_id": "6633da29fe975f7440559a3e",
						"album_id": "2609030708122529720",
						"name": "bozuhige",
						"searchQuery": "bozuhige", // 正在配置搜索词
					},
					{
						"_id": "663451673d029c65e95c8ffa",
						"album_id": "2925555733050990603",
						"name": "Eric",
						"searchQuery": "Eric", // 正在配置搜索词
					},
					{
						"_id": "663453459755e32830592c08",
						"album_id": "2727611501855357854",
						"name": "てぃら",
						"searchQuery": "thira_583", // 正在配置搜索词
					},
					{
						"_id": "6634579a8a5c7863b1a2f273",
						"album_id": "3425503383281384200",
						"name": "弯吊熊叔",
						"searchQuery": "弯吊熊叔", // 正在配置搜索词
					},
					{
						"_id": "66345a9e55b3372a1f120262",
						"album_id": "3887189594172143215",
						"name": "王小谦本谦",
						"searchQuery": "王小谦本谦", // 正在配置搜索词
					},
					{
						"_id": "66345d2e213929f866cbf62c",
						"album_id": "4192771979968202867",
						"name": "筋肉雄汁",
						"searchQuery": "筋肉雄汁", // 正在配置搜索词
					},
					{
						"_id": "66345ed921821b6d2ba38ce1",
						"album_id": "4233622266833197466",
						"name": "VeXeR",
						"searchQuery": "VeXeR", // 正在配置搜索词
					},
					{
						"_id": "66345ff78a5c7863b1a3f05f",
						"album_id": "2966633539868901740",
						"name": "Bounce北极熊",
						"searchQuery": "Bounce北极熊", // 正在配置搜索词
					},
					{
						"_id": "6634698a55b3372a1f13b239",
						"album_id": "3740874051381690786",
						"name": "VFactory",
						"searchQuery": "VFactory", // 正在配置搜索词
					},
					{
						"_id": "6648fc80b9fb2360b0563f74",
						"album_id": "3175717851180359496",
						"name": "抖音辉叔",
						"searchQuery": "抖音辉叔", // 正在配置搜索词
					},
					{
						"_id": "664e4fd4c3b5c965024efece",
						"album_id": "3906527244497767968",
						"name": "Leo",
						"searchQuery": "Leo", // 正在配置搜索词
					},
					{
						"_id": "6658baf48b0da4a4e4e2ddbc",
						"album_id": "0",
						"name": "真壁なをと-Nawoto-@nanao9307",
						"searchQuery": "真壁nanao9307", // 正在配置搜索词
					},
					{
						"_id": "665def6f21821b6d2b8eb965",
						"album_id": "4000622314436617496",
						"name": "STRIKE",
						"searchQuery": "STRIKE", // 正在配置搜索词
					},
					{
						"_id": "665dfa2955b3372a1f02144d",
						"album_id": "4124633156581645143",
						"name": "🐷Fatty（标清）",
						"searchQuery": "Fatty_标清", // 正在配置搜索词
					},
					{
						"_id": "665dfb04652341bc2f04b0cf",
						"album_id": "4307644890506555423",
						"name": "🐷Fatty（超清）",
						"searchQuery": "Fatty_超清", // 正在配置搜索词
					},
					{
						"_id": "6660fb873d029c65e9d848de",
						"album_id": "4240181028959587686", // 必须，不可重复
						"name": "新24/6/5",
						"searchQuery": "日期头像_20240605", // 正在配置搜索词
					},
					{
						"_id": "66672537652341bc2f9b7086",
						"album_id": "3021756111842291636", // 必须
						"name": "想再見你",
						"searchQuery": "想再见你", // 正在配置搜索词
					},
					{
						"_id": "666897ec7ad52dfcccb889ac",
						"album_id": "2922518232808747605", // 必须
						"name": "UncleYasu",
						"searchQuery": "UncleYasu", // 正在配置搜索词
					},
					{
						"_id": "667d93f86e5d2ddb5167437a",
						"album_id": "3525442937972956249", // 必须
						"name": "24年7月",
						"searchQuery": "日期头像_24年7月" //"日期头像_202407"// 正在配置搜索词
					},
					{
						"_id": "6680cc230d2b315faf25d116",
						"album_id": "2464197780225728412", // 必须
						"name": "ATR_helloattr",
						"searchQuery": "ATR_helloattr" //"日期头像_202407"// 正在配置搜索词
					},
					{
						"_id": "66c19276b9fb237f4b067459",
						"album_id": "4436734457935309393", // 必须
						"name": "9月上线",
						"searchQuery": "Bear_auanmhee" //"日期头像_202407"// 正在配置搜索词
					},
					{
						"_id": "66c193b27c8de445a6dbc7e5",
						"album_id": "4391481610480642913", // 必须
						"name": "10月上线",
						"searchQuery": "futoshio" //"日期头像_202407"// 正在配置搜索词
					},
					{
						"_id": "6704e0acbd0220786dbd55ea",
						"album_id": "2996105418582432214", // 必须
						"name": "10月上线",
						"searchQuery": "珍藏熊熊" //"日期头像_202407"// 正在配置搜索词
					},
					{
						"_id": "67270171286f7cec14c4ffdc",
						"album_id": "3610054849882613765", // 必须
						"name": "11月上线",
						"searchQuery": "胖熊_正太_男同Gay_头像01" //"日期头像_202407"// 正在配置搜索词
					},{
						"_id": "6752ba3b2139290eedd04d51",
						"album_id": "4434760596136153301", // 必须
						"name": "Panda🐻🐷🐘🐳🐒",
						"searchQuery": "Panda壮熊胖熊_" //"日期头像_202407"// 正在配置搜索词
					}
				], // 用于自动执行搜索查询字符串，并自动更新selectedCovers和personData
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
			// 新增测试方法，用于云函数自动更新人物头像的任务
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
				if (this.photobaidu.album.data.list.length == 0) {
					uni.showToast({
						title: "请先采集相册文件",
						icon: "none"
					})
					return
				}

				// 遍历 autoUpdatePersonCoversData 数组
				for (const updateItem of this.autoUpdatePersonCoversData) {
					// 设置搜索查询字符串
					this.searchQuery = updateItem.searchQuery;

					// 找到对应的 personData 索引
					const personIndex = this.personData.findIndex(person => person.album_id === updateItem.album_id);
					//const personIndex = this.personData.findIndex(person => person._id === updateItem._id);
					
					
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
							const matchedCover = this.photobaidu.album.data.list.find(albumCover => albumCover
								.fsid === cover.fsid);
							// 如果找到，更新 thumb，否则保持原来的 thumb
							//const updatedThumb = matchedCover ? matchedCover.thumburl[0] : cover.thumb;
							const updatedThumb = matchedCover?.thumburl?.[0] ?? cover.thumb;
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

				// 在这里 updatePersonData 包含更新后的数据
				console.log('Updated PersonData 完成', this.personData);

				await this.updatePersonCoversInDatabase()
				// 更新完成后重置 selectedPersonIndex 和 searchQuery
				//this.selectedPersonIndex = null;
				//this.searchQuery = '';
			},
			// 更新人物封面数据至数据库
			async updatePersonCoversInDatabase() {
				try {
					// 遍历 personData 数组
					for (const person of this.personData) {
						// 使用 person._id 来定位数据库中的记录，并更新 covers 字段
						const updateResult = await personCollection.doc(person._id).update({
							covers: person.covers
						});

						// 输出每次更新的结果，以便调试
						console.log(`更新结果 for ${person._id}:`, updateResult);
					}

					// 显示更新成功的提示
					uni.showToast({
						title: "人物封面更新成功",
						icon: "success"
					});
				} catch (error) {
					console.error("更新人物封面失败:", error);
					// 显示更新失败的提示
					uni.showToast({
						title: "人物封面更新失败",
						icon: "none"
					});
				}
			},


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
					status: {
						$in: [0, 1, 2]
					}
				}).get()
				console.log('result', result)
				this.personData = result.data
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

<style scoped>
	.people-container {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-start;
		align-items: stretch;
	}

	.person {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 10px;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 5px;
	}

	.highlighted {
		border-color: blue;
		/* 高亮显示的边框颜色 */
	}

	.hidden {
		display: none;
		/* 隐藏未选中的人物 */
	}

	.person-image {
		max-width: 100px;
		max-height: 100px;
		margin-bottom: 10px;
	}

	.person-name {
		font-size: 16px;
		color: #333;
	}

	.uni-search {
		margin-bottom: 20px;
		padding: 10px;
		font-size: 16px;
		border: 1px solid #ccc;
		border-radius: 5px;
	}

	.cover {
		margin: 10px;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 5px;
	}

	.cover-image {
		width: 100px;
		height: 100px;
	}
</style>
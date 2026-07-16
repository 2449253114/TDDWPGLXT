你帮我看看下面的代码，是不是每次在盒子中随机拿数据项，而不是拿盒子中第一项（如果当前maxConsecutive=1）
```javascript
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




	// let sortedAlbumItems = [];
	// let itemGroups = {};

	// // 按 album_id 分组
	// this.allFilesData.forEach(item => {
	// 	if (!itemGroups[item.album_id]) {
	// 		itemGroups[item.album_id] = [];
	// 	}
	// 	itemGroups[item.album_id].push(item);
	// });

	// // 创建一个堆，按每组的数量降序排序
	// let heap = new Heap((a, b) => b.length - a.length);
	// Object.values(itemGroups).forEach(group => heap.push(group));

	// let previousGroup = null;
	// let previousGroupCount = 0;

	// while (!heap.empty()) {
	// 	let currentGroup;

	// 	if (previousGroup && previousGroup.length > 0 && previousGroupCount < maxConsecutive) {
	// 		// 如果前一个组还有剩余项，并且未达到最大连续数，继续使用前一个组
	// 		currentGroup = previousGroup;
	// 	} else {
	// 		// 否则，从堆中取出下一个组
	// 		currentGroup = heap.pop();
	// 	}

	// 	// 把当前组的第一个项添加到结果数组
	// 	sortedAlbumItems.push(currentGroup.shift());

	// 	// 如果当前组还有剩余项，将其放回到堆中
	// 	if (currentGroup.length > 0) {
	// 		heap.push(currentGroup);
	// 	}

	// 	// 更新前一个组和连续数
	// 	if (currentGroup === previousGroup) {
	// 		previousGroupCount++;
	// 	} else {
	// 		previousGroup = currentGroup;
	// 		previousGroupCount = 1;
	// 	}
	// }

	// this.allFilesData = []
	// // 更新 allFilesData 数组为新的顺序
	// this.allFilesData = sortedAlbumItems;


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

		// 取出当前分组的下一项数据，并更新其在 sortedAlbumItems 中的索引
		if (itemGroups[groupData.album_id].length > 0) {
			let item = itemGroups[groupData.album_id].shift();
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

},

```


帮我实现需求3
```javascript
// 同步相册文件到云存储
async startSyncAlbumFiles() {
	await this.loadData()
	await this.filterExistingCloudStorageFiles()
	await this.reorderAlbumItemsWithLimit()
},
async loadData() {
	const {
		totalFiles
	} = this;
	const {
		fileCollectionName
	} = this;
	const fileCollection = db.collection(fileCollectionName);
	const MAX_LIMIT = 1000; // uniapp的limit最大值
	let allFiles = [];

	for (let i = 0; i < totalFiles; i += MAX_LIMIT) {
		// 当前第i页的数据
		console.log(`当前第${i / MAX_LIMIT + 1}页`);
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
/**
 * 过滤掉已经在云存储中存在的相册文件。
 * 该函数查询云存储以确定 allFilesData 中的哪些文件已经存在。
 * 使用 fsid 作为文件的唯一标识符，它将检查 allFilesData 中的每个文件，
 * 并排除那些在云端已有记录的文件。最终，allFilesData 将仅包含云端尚未存储的文件。
 * 查询云存储时，由于查询大小限制（1MB还是2MB来着），fsid 和 album_id 的检查将分批进行，
 * 每批最多处理 1000 条记录。
 */
async filterExistingCloudStorageFiles() {
	const {
		cloudStorageFileCollectionName
	} = this
	const cloudStorageFileCollection = db.collection(cloudStorageFileCollectionName);
	const MAX_QUERY = 1000; // 每次查询的最大数量限制
	let remainingFiles = this.allFilesData; // 初始化剩余文件列表
	const fsid_ids = this.allFilesData.map(item => item.fsid); // 提取所有fsid
	const album_ids = this.allFilesData.map(item => item.album_id); // 提取所有album_id

	// 分批查询，每批最多查询MAX_QUERY个fsid和album_id
	for (let i = 0; i < fsid_ids.length; i += MAX_QUERY) {
		const end = Math.min(i + MAX_QUERY, fsid_ids.length);
		const batchFsidIds = fsid_ids.slice(i, end);
		const batchAlbumIds = album_ids.slice(i, end);

		console.log(`正在查询云存储，批次：${i / MAX_QUERY + 1}`);
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
	this.totalFilesToSync = remainingFiles.length + 1 // 从0开始
	
	console.log('已过滤云存储中已存在项，剩余未同步文件:', this.allFilesData);
},
// 需求3 
// 同步到云存储相册文件
// 向数据库批量添加记录

```













需求在代码中
```javascript
const res = await uniCloud.request({ // querys参数只能采用拼接的方式才能请求成功
	url: `https://photo.baidu.com/youai/file/v1/streaming?fs_id=${fs_id}`,
	method: "GET",
	dataType: "text",
	header: headers,
})


// 返回数据给客户端
return res.data
// 失败响应（因为视频正在转码为m3u8）
// res.data
{
	"errno": 31341,// 固定值
	"request_id": 8722328130611736576,
	"error_code": 31341,
	"errmsg": "be transcoding, please wait and retry"// 固定值
}
{
	"errno": 31341,
	"request_id": 8722503573939941376,
	"error_code": 31341,
	"errmsg": "be transcoding, please wait and retry"
}
// 成功响应（已经是m3u8）
// res.data
// #EXTM3U
#EXT-X-TARGETDURATION:15
#EXT-X-DISCONTINUITY
#EXTINF:2,
https://v0-ant.baidu.com/video/netdisk-videotran-xian/16b29b68dkd4a42fe11e962380d775aa_1074_1_ts/cd229f6095ca315055d44a8cf8f3f8a1?ts_size=2651552&app_id=16051585&csl=0&dp-logid=8722368774545305289&esl=1&fn=5_6329912007591987351.mp4&from_type=1&fsid=948246465431558&isplayer=1&iv=0&...
...
#EXT-X-ENDLIST

// 然后我的需求是现在要确定他在转码中还是可以播放（已是m3u8），然后你帮我修改代码，完整代码见下面的一个```javascript
```







```kotlin
    val tabs = albumDetailViewModel.tabs.value
    var selectedTabIndex by remember { mutableStateOf(0) }
    val pagerState = rememberPagerState { tabs.size }

    LaunchedEffect(key1 = pagerState) {
        // Collect from the a snapshotFlow reading the currentPage
        snapshotFlow { pagerState.currentPage }.collect { pageIndex ->
            // Do something with each page change, for example:
            // viewModel.sendPageSelectedEvent(page)

            // 更新选中的tab索引
            selectedTabIndex = pageIndex
            // 执行每次页面切换都要执行的逻辑
            Log.d("Page change", "Page changed to $pageIndex")
        }
    }


    val albumAllFilesLazyStaggeredGridState = rememberLazyStaggeredGridState()
    val albumVideoFilesLazyStaggeredGridState = rememberLazyStaggeredGridState()
    val albumPicFilesLazyStaggeredGridState = rememberLazyStaggeredGridState()
    // 根据当前所选的页面类型，获取对应的第一个可见项的索引
    val firstVisibleIndex by remember {
        mutableStateOf(
            when (selectedTabIndex) {
                0 -> albumAllFilesLazyStaggeredGridState.firstVisibleItemIndex
                1 -> albumVideoFilesLazyStaggeredGridState.firstVisibleItemIndex
                3 -> albumPicFilesLazyStaggeredGridState.firstVisibleItemIndex
                else -> albumAllFilesLazyStaggeredGridState.firstVisibleItemIndex
            }
        )
    }
	
	Surface(
        modifier = Modifier
            .fillMaxSize()
            .statusBarsPadding(),
        color = MaterialTheme.colorScheme.background
    ) {

        // 用于记录应用栏的高度，以便在嵌套滚动中使用。会在onSizeChanged中获取
        var toolbarHeight by remember { mutableStateOf(0.dp) } // 整个顶部的应用栏高度
        var tabBarHeight by remember { mutableStateOf(0.dp) }

        //val maxUpPx by mutableStateOf(with(LocalDensity.current) { toolbarHeight.roundToPx().toFloat() - 50.dp.roundToPx().toFloat() - 56.dp.roundToPx().toFloat() }) // 此处会导致负数然后运行报错，这是错误的写法
        // ToolBar 最大向上位移量
        var maxUpPx by remember { mutableStateOf(0f) } // 使用属性初始化，而不是直接在mutableStateOf中初始化
        // 当工具栏高度变化时更新maxUpPx，并确保它不是负的
        LaunchedEffect(toolbarHeight) {
            maxUpPx = with(density) {
                (toolbarHeight.roundToPx().toFloat() - tabBarHeight.roundToPx().toFloat() - topAppBarHeight.roundToPx().toFloat()).coerceAtLeast(0f)
            }
        }
        // ToolBar 最小向上位移量
        val minUpPx = 0f
        // 偏移折叠工具栏上移高度
        val toolbarOffsetHeightPx = rememberSaveable { mutableStateOf(0f) }
        // 现在，让我们创建与嵌套滚动系统的连接并聆听子 LazyColumn 中发生的滚动
        val nestedScrollConnection = remember {
            object : NestedScrollConnection {
                // 1、工具栏完全可见时，向上滚动先移动工具栏。
                // 2、工具栏部分不可见时，任意方向滚动都先移动工具栏。
                // 3、工具栏完全不可见且处于最大偏移时，向上滚动应滚动 LazyColumn。
                // 4、工具栏完全可见时，向下滚动应滚动 LazyColumn。
                override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                    // 如果向上滚动，或者toolbar已经有偏移（但未达到最大值）
                    if (available.y < 0 && toolbarOffsetHeightPx.value > -maxUpPx) {
                        val delta = available.y
                        val newOffset = toolbarOffsetHeightPx.value + delta
                        toolbarOffsetHeightPx.value = newOffset.coerceIn(-maxUpPx, minUpPx)
                        // 消费掉所有的y轴上的滚动
                        return Offset(0f, delta)
                    }

                    // 如果toolbar偏移已经是最大值，且我们正在向上滚动，允许LazyColumn处理滚动事件
                    if (available.y < 0 && toolbarOffsetHeightPx.value == -maxUpPx) {
                        return Offset.Zero
                    }

                    // 如果工具栏完全可见，且向下滚动，直接返回 Offset.Zero 不消费事件，允许 LazyColumn 滚动
                    if (toolbarOffsetHeightPx.value == 0f && available.y > 0) {
                        return Offset.Zero
                    }

                    // 在其他情况下（向下滚动且工具栏有偏移），消费滚动事件使工具栏先滚动
                    if (available.y > 0 && toolbarOffsetHeightPx.value != 0f) {
                        val delta = available.y
                        val newOffset = toolbarOffsetHeightPx.value + delta
                        toolbarOffsetHeightPx.value = newOffset.coerceIn(-maxUpPx, 0f)
                        // 消费掉所有的y轴上的滚动
                        return Offset(0f, delta)
                    }

                    // 在其他情况下，不消费滚动事件
                    return Offset.Zero
                }

                override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                    // 其他情况不消费滚动事件
                    return super.onPostScroll(consumed, available, source)
                }
            }
        }

        // 使用toolbarOffsetHeightPx的值来判断是否已经滑动到最大值
        val isScrolledToMax by derivedStateOf {
            toolbarOffsetHeightPx.value <= -maxUpPx
        }

        // 使用toolbarOffsetHeightPx的值来判断是否已经滑动到最小值
        val isScrolledToMin by derivedStateOf {
            toolbarOffsetHeightPx.value >= 0f
        }

        Box(
            Modifier
                .fillMaxSize()
                // 作为父级附加到嵌套滚动系统
                .nestedScroll(nestedScrollConnection)
        ) {
            FollowNestedScrollToolbar(
                title = "toolbar offset is ${toolbarOffsetHeightPx.value}",
                albumInfo = albumInfo,
                scrollableAppBarHeight = toolbarHeight,
                toolbarOffsetHeightPx = toolbarOffsetHeightPx,
                isScrolledToMax = isScrolledToMax,
                onNavigate = {
                    onNavigate(popBackStack)
                },
                onBoxSizeChanged = { size ->
                    coroutineScope.launch {
                        // 你可以在这里获取到应用栏的高度
                        toolbarHeight = if (toolbarHeight == 0.dp) pxToDp(size.height, context).dp else toolbarHeight
                    }
                },
                onTabSizeChanged = { size ->
                    coroutineScope.launch {
                        // 你可以在这里获取到TabRow的高度
                        tabBarHeight = if (tabBarHeight == 0.dp) pxToDp(size.height, context).dp else tabBarHeight
                    }
                },
                tabs = tabs,
                selectedTabIndex = selectedTabIndex,
                onSelectedTabChange = { tabIndex ->
                    coroutineScope.launch {
                        selectedTabIndex = tabIndex
                        // Call scroll to on pagerState
                        pagerState.scrollToPage(tabIndex) // or pagerState.animateScrollToPage(tabIndex)
                    }
                }
            )

            if (false) {
                Text(text = if (isScrolledToMax) "达到最大偏移量" else "尚未达到最大偏移量")
            }
```
我现在的需求需要根据firstVisibleIndex来改进nestedScrollConnection
下面前4点是现在的
// 1、工具栏完全可见时，向上滚动先移动工具栏。
// 2、工具栏部分不可见时，任意方向滚动都先移动工具栏。
// 3、工具栏完全不可见且处于最大偏移时，向上滚动应滚动 LazyColumn。
// 4、工具栏完全可见时，向下滚动应滚动 LazyColumn。
而我需增加第5点条件
// 3、工具栏完全不可见且处于最大偏移时，任意方向滚动时如果firstVisibleIndex!==0，则应滚动 LazyColumn，否则firstVisibleIndex==0时，才应该移动工具栏。










我发现了问题， 解决这个问题和我加不加延时无关，我不知道为什么，我得执行两次，让他二次效验，才会准确，因为第一次filterExistingCloudStorageFiles总是会有已同步云端的但就是被识别没有同步云端
```javascript
// 同步相册文件到云存储
async loadAlbumFilesData() {
	uni.showLoading()
	await this.loadData()
	await this.filterExistingCloudStorageFiles()
	await this.filterExistingCloudStorageFiles() // 二次效验，为了提高准确性，当前版本就这样修复BUG吧
	await this.reorderAlbumItemsWithLimit()
	uni.hideLoading()
},

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
```
你帮我看看要怎么解决呢？








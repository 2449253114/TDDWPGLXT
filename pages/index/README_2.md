我现在有个需求，下载m3u8文件内容里的所有ts文件，并且把下载的ts路径写进本地m3u8文件内容中，m3u8文件内容可以直接按照data.m3u8写，只不过是把ts网络路径替换成了本地路径，m3u8文件也是和ts在同目录下，ts文件名是通过params[i].original_file_name去掉扩展名后加 + -by + -ts_index
一、这是我要下载的m3u8视频接口返回的数据
```json
{
	"code": 200,
	"message": "处理重定向成功",
	"data": {
		"m3u8": "#EXTM3U\n#EXT-X-TARGETDURATION:15\n#EXT-X-DISCONTINUITY\n#EXTINF:10,\nhttps://d09be1-613813804.antpcdn.com:19001/b/v2-ant.baidu.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=9182391360836148535&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=0&logid=9182391360836148535&mtime=1708361503&ouk=1815907562&r=239172419&size=450828284&sta_cs=2&sta_dt=video&sta_dx=429&time=1712504469&to=vas2&tot=bCNc7&uo=any&uva=173034443&vuk=1815907562&backhost=%5B%22xacu07.baidupcs.com%22%2C%22yqall07.baidupcs.com%22%5D&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=1077240&path=%2F_pcs_.appdata%2Fyoua%2Fweb%2F1773153875_758_IMG_0044_1708361503502_39.mp4&range=0-1077239&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-no6yzoHBV3VpzrJ5%252FtTG76R%252Bhc4%253D&xcode=fda2882887681eba717647aa1a7af9b6ceb7a5b36b4db0c8b36880baaee5366c911d5d2bca9989aa831d4f23c32d2573&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming\n//此处省略了n个ts #EXT-X-ENDLIST\n",
		"urls": [
			"https://d09be1-613813804.antpcdn.com:19001/b/v2-ant.baidu.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=9182391360836148535&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=0&logid=9182391360836148535&mtime=1708361503&ouk=1815907562&r=239172419&size=450828284&sta_cs=2&sta_dt=video&sta_dx=429&time=1712504469&to=vas2&tot=bCNc7&uo=any&uva=173034443&vuk=1815907562&backhost=%5B%22xacu07.baidupcs.com%22%2C%22yqall07.baidupcs.com%22%5D&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=1077240&path=%2F_pcs_.appdata%2Fyoua%2Fweb%2F1773153875_758_IMG_0044_1708361503502_39.mp4&range=0-1077239&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-no6yzoHBV3VpzrJ5%252FtTG76R%252Bhc4%253D&xcode=fda2882887681eba717647aa1a7af9b6ceb7a5b36b4db0c8b36880baaee5366c911d5d2bca9989aa831d4f23c32d2573&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming",
			// 此处省略了n个ts
		],
		"params": [
			{
				"ts_url": "https://v2-ant.baidu.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=9182391360836148535&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=0&logid=9182391360836148535&mtime=1708361503&ouk=1815907562&r=239172419&size=450828284&sta_cs=2&sta_dt=video&sta_dx=429&time=1712504469&to=vas2&tot=bCNc7&uo=any&uva=173034443&vuk=1815907562&backhost=%5B%22xacu07.baidupcs.com%22%2C%22yqall07.baidupcs.com%22%5D&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=1077240&path=%2F_pcs_.appdata%2Fyoua%2Fweb%2F1773153875_758_IMG_0044_1708361503502_39.mp4&range=0-1077239&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-no6yzoHBV3VpzrJ5%252FtTG76R%252Bhc4%253D&xcode=fda2882887681eba717647aa1a7af9b6ceb7a5b36b4db0c8b36880baaee5366c911d5d2bca9989aa831d4f23c32d2573&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming",
				"ts_size": "13571532",
				"dtime": "10",
				"original_file_name": "1773153875_758_IMG_0044_1708361503502_39.mp4",
				"fsid": "296700103461475",
				"original_file_size": "450828284",
				"file_type": "video",
				"len": "1077240",
				"range": "0-1077239",
				"by": "my-streaming",
				"ts_index": 0
			}
			// 此处省略了n个ts
		]
	}
}
```
二、这是我安卓Jetpack Compose项目的旧代码（目前只做了下载单个下载，然后测试成功了），现在需要通过这些代码去改造下载m3u8文件内容里的所有ts文件。
1. DownloadScreen.kt
```kotlin
@Composable
fun DownloadScreen(
    viewModel: DownloadViewModel = hiltViewModel(),
) {
    val context = LocalContext.current

    // 创建一个launcher用于启动权限请求
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { isGranted: Boolean ->
            if (isGranted) {
                // 权限被授予，执行下载操作
//                val cacheDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                viewModel.startDownload(
                    fileUrl = viewModel.test_playUrl,
                    m3u8FileId = "296700103461475",
                )
                showToast(context, "权限被授予")
            } else {
                // 权限被拒绝，显示一个提示或执行其他操作
                showToast(context, "权限被拒绝")
            }
        }
    )


    val videoViewModel: AlbumVideoDetailViewModel = hiltViewModel()
    var startPlayingRequest by videoViewModel::startPlayingRequest

    // 使用getDownloadPath函数获取下载路径
    val filePath = getDownloadPath(context)
    // 假设你有一个下载列表


    // 当组件被组合时添加下载任务列表
    LaunchedEffect(key1 = startPlayingRequest) {
        if (startPlayingRequest) {
            val fileResult = FileDownloadRequest(
                albumId = "2918279449996957968",
                fsid = "296700103461475",
                tid = "317083607965371908",
                uk = "1815907562",
                userId = "65be37419755e3283004978c"
            )
            // 请求视频文件地址
            videoViewModel.getDownloadFileUrl(
                request = fileResult,
                onSuccess = { response ->
                    // 请求成功，但不一定有数据，比如没有播放次数或者没有VIP权限等
                    showToast(context, response.message)
                    response.data?.let { data ->

                    }
                    startPlayingRequest = false
                },
                onFailure = { throwable ->
                    // 失败
                    showToast(context, "读取失败：${throwable.message}")
                    startPlayingRequest = false
                }
            )
        }
    }

    val downloadProgress by viewModel.downloadProgress.observeAsState(0)
    val downloadState by viewModel.downloadState.observeAsState()


    Box {
        Column(modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
            Button(onClick = {
                when {
                    ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.WRITE_EXTERNAL_STORAGE
                    ) == PackageManager.PERMISSION_GRANTED -> {
                        // 权限已经被授予
                        showToast(context, "权限已经被授予")
                        viewModel.startDownload(
                            fileUrl = viewModel.test_playUrl,
                            m3u8FileId = "296700103461475",
                        )
                    }
                    else -> {
                        // 请求权限
                        permissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    }
                }

            }) {
                Text(text = "开始下载")
            }

            when (downloadState) {
                is DownloadState.IN_PROGRESS -> {
                    LinearProgressIndicator(
                        progress = { downloadProgress / 100f },
                    )
                    Text(text = "下载进度：$downloadProgress%")
                }
                is DownloadState.SUCCESS -> {
                    val file = (downloadState as DownloadState.SUCCESS).file
                    Text(text = "下载完成：${file.absolutePath}")
                }
                is DownloadState.ERROR -> {
                    val message = (downloadState as DownloadState.ERROR).message
                    Log.d("DownloadScreen", "下载错误：$message")
                    Text(text = "下载错误：$message")
                }
                null -> {}
            }
        }

        if (startPlayingRequest) {
            ShowLoading()
        }
    }


}

fun getDownloadPath(context: Context): String {
    val downloadDirectory = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
    } else {
        Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    }
    // 确保目录存在，如果不存在则创建之
    if (downloadDirectory != null && !downloadDirectory.exists()) {
        downloadDirectory.mkdirs()
    }
    return downloadDirectory?.absolutePath ?: ""
}
```
2. DownloadService.kt
```kotlin
// 定义下载服务接口
interface DownloadService {
    @Streaming
    @GET
    fun downloadFileWithDynamicUrlAsync(
        @Url fileUrl: String,
        @HeaderMap headers: Map<String, String>
    ): Call<ResponseBody>


    companion object {
        // 创建一个Retrofit实例
        fun create(context: Context): DownloadService {
            return ServiceCreator(context).create(DownloadService::class.java)
        }
    }
}
```
3. DownloadViewModel.kt
```kotlin
@HiltViewModel
class DownloadViewModel @Inject constructor(
    @ApplicationContext context: Context
) : ViewModel()  {
    private val downloadService: DownloadService = DownloadService.create(context)

    val appContext = context

    // LiveData to observe download progress
    private val _downloadProgress = MutableLiveData<Int>()
    val downloadProgress: LiveData<Int> = _downloadProgress

    // LiveData to observe download state
    private val _downloadState = MutableLiveData<DownloadState>()
    val downloadState: LiveData<DownloadState> = _downloadState


    fun startDownload(fileUrl: String, m3u8FileId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            val headers = mapOf(
                //"Accept" to "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Accept" to "*/*",
                "Cache-Control" to "no-cache",
                "Connection" to "keep-alive",
                "Accept-Encoding" to "gzip, deflate, br",
                "Host" to Uri.parse(fileUrl).host.toString(),
            )

            val call = downloadService.downloadFileWithDynamicUrlAsync(fileUrl, headers)

            try {
                val response = call.execute() // 同步执行网络请求
                if (response.isSuccessful) {
                    response.body()?.let { responseBody ->
                        _downloadState.postValue(DownloadState.IN_PROGRESS)
                        // 文件写入操作也在 IO 线程中执行
                        val downloadedFile = writeResponseBodyToDisk(responseBody, fileUrl, m3u8FileId)
                        withContext(Dispatchers.Main) {
                            downloadedFile?.let { file ->
                                _downloadState.value = DownloadState.SUCCESS(file)
                            } ?: run {
                                _downloadState.value = DownloadState.ERROR("Failed to save the file")
                            }
                        }
                    } ?: run {
                        withContext(Dispatchers.Main) {
                            _downloadState.value = DownloadState.ERROR("Response body is null")
                        }
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        _downloadState.value = DownloadState.ERROR("Server returned non-successful response: ${response.code()}")
                    }
                }
            } catch (e: IOException) {
                withContext(Dispatchers.Main) {
                    _downloadState.value = DownloadState.ERROR(e.message ?: "Unknown error")
                }
            }
        }
    }

    // 通过 Application 的 Context 获取应用名称
    private val appName: String = appContext.applicationContext.getString(R.string.app_name)

    private fun writeResponseBodyToDisk(body: ResponseBody, fileUrl: String, m3u8FileId: String): File? {
        return try {
            // Extract the filename from URL
            //val filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1)

            // 解析文件URL以获取文件名
            val uri = Uri.parse(fileUrl)
            // 获取没有扩展名的文件名
            val filenameWithoutExtension = File(uri.path!!).nameWithoutExtension
            // 获取文件的扩展名
            val extension = File(uri.path!!).extension
            // 如果没有扩展名，则默认添加.ts，否则使用原文件名
            val filename = if (extension.isBlank()) "$filenameWithoutExtension.ts" else File(uri.path!!).name
            //val filename = uri.lastPathSegment ?: "downloaded_file_${System.currentTimeMillis()}"

            // Get the Download directory path
            //val downloadPath = getDownloadPath(appContext)
            //val file = File(downloadPath + File.separator + filename)

            // 获取公共下载目录
            val downloadDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            // 创建应用名的子目录
            val appDirectory = File(downloadDirectory, appName)
            // 如果目录不存在，则创建它
            if (!appDirectory.exists()) {
                appDirectory.mkdirs()
            }
            // 在应用名的子目录下创建以m3u8文件ID为名称的子目录
            val m3u8Directory = File(appDirectory, m3u8FileId)
            // 如果目录不存在，则创建它
            if (!m3u8Directory.exists()) {
                m3u8Directory.mkdirs()
            }
            // 创建文件对象，表示最终的下载文件
            val file = File(m3u8Directory, filename)

            var inputStream: InputStream? = null // 数据的输入流
            var outputStream: FileOutputStream? = null // 数据的输出流

            try {
                val fileReader = ByteArray(4194304) // 创建一个与前端分片大小相同的缓冲区，即4MB
                val fileSize = body.contentLength()
                var fileSizeDownloaded: Long = 0

                inputStream = body.byteStream()
                outputStream = FileOutputStream(file)

                while (true) {
                    val read = inputStream.read(fileReader)
                    if (read == -1) {
                        break
                    }

                    outputStream.write(fileReader, 0, read)
                    fileSizeDownloaded += read
                    val progress = (fileSizeDownloaded * 100 / fileSize).toInt()
                    _downloadProgress.postValue(progress)
                }

                outputStream.flush()

                // 返回文件对象
                file
            } catch (e: IOException) {
                Log.e("DownloadViewModel", "Error writing file: ${e.message}")
                null
            } finally {
                inputStream?.close()
                outputStream?.close()
            }
        } catch (e: IOException) {
            Log.e("DownloadViewModel", "Error accessing file: ${e.message}")
            null
        }
    }


    private fun getDownloadPath(context: Context): String {
        val downloadDirectory = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
        } else {
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        }
        // 确保目录存在，如果不存在则创建之
        if (downloadDirectory != null && !downloadDirectory.exists()) {
            downloadDirectory.mkdirs()
        }
        return downloadDirectory?.absolutePath ?: ""
    }
	
	// 这个test_playUrl就是测试下载的ts文件
    val test_playUrl = "https://d2aa27-613813799.antpcdn.com:19001/b/v2-ant.baidu.com/video/netdisk-videotran-xian/a821daab8pa1aa5fe68b211fd590d5b2_1075_1_ts/1b5695f67bdcd72c8479719438ee199a?ts_size=18218704&app_id=16051585&csl=0&dp-logid=9141037796336559899&esl=1&fn=1773153875_756_IMG_0018_1708361184666_51.mp4&from_type=1&fsid=958983419073317&isplayer=1&iv=0&logid=9141037796336559899&mtime=1708361184&ouk=1815907562&r=251123486&size=187639809&sta_cs=1&sta_dt=video&sta_dx=178&time=1712350415&to=vas2&tot=ceiz3&uo=any&uva=173034443&vuk=1815907562&backhost=%5B%22xacu07.baidupcs.com%22%2C%22yqall07.baidupcs.com%22%5D&dtime=2&etag=1b5695f67bdcd72c8479719438ee199a&fid=15dc62826354bb5a9e2d457c03e4287d-1815907562&len=360396&path=%2F_pcs_.appdata%2Fyoua%2Fweb%2F1773153875_756_IMG_0018_1708361184666_51.mp4&range=0-360395&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-FX0Qs6A8C540EzA2Fn2AogqwQcQ%253D&xcode=75a842900e187ac515fcc0a9ddb859543a886db6b5f4cdc61a629a880ac53eec44e76b932fe2fce64d32e5e71c1570d90b2977702d3e6764&xv=6&need_suf=&pmk=14001b5695f67bdcd72c8479719438ee199a008c82f000000115fed0&by=my-streaming"
    
	val test_fileName = "一刻-Fetch-123456.mp4"
    val test_Host = Uri.parse(test_playUrl).host.toString()
    val test_Cookie = "BIDUPSID=042F3CDCE30AE13FD30345900DD1A274; PSTM=1687770338; BAIDUID=042F3CDCE30AE13FC205E0552E16428E:FG=1; BAIDUID_BFESS=042F3CDCE30AE13FC205E0552E16428E:FG=1; ZFY=2AHvJ:BZDBijDzkCgI2TGu4B4DQ57wTK6svqq8vGS7gA:C; csrfToken=D2FhTy4N8HXgeltJ3wCSlk8h; PANWEB=1; PANWEB.sig=mEnYrSeaQqssYZire89rFPmLY9htA0FzmyWp6jBsV1U; sajssdk_2015_cross_new_user=1; Hm_lvt_829488e8924d8de8d4420f2bbed270ca=1690525951; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%221815907562%22%2C%22first_id%22%3A%221899b32e19d5e2-0e3aa2e92253cd-26031d51-1440000-1899b32e19e1cad%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E8%87%AA%E7%84%B6%E6%90%9C%E7%B4%A2%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC%22%2C%22%24latest_referrer%22%3A%22https%3A%2F%2Fwww.google.com.hk%2F%22%7D%2C%22%24device_id%22%3A%221899b32e19d5e2-0e3aa2e92253cd-26031d51-1440000-1899b32e19e1cad%22%7D; BDUSS=Fowd003Yy0zWlE1ZVlsb0ZVflc1WXdUYkZRWnpaenJ0QjhVLVpNclduVX43dXBrRUFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD9hw2Q~YcNkN; BDUSS_BFESS=Fowd003Yy0zWlE1ZVlsb0ZVflc1WXdUYkZRWnpaenJ0QjhVLVpNclduVX43dXBrRUFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD9hw2Q~YcNkN; STOKEN=33cc00f746b2e3e6b0ef0d48269d2ee2806b61f0e505d7841b33d870f14c2b82; PANPSC=5538768149112198639%3AKkwrx6t0uHD14zbcy1iaRUYemHfSgA%2FTQq7UC5FOJJER515Zs3QpojiXo%2BL7lLgCz81ttRoL0tBKQ4Dasb9%2FZoN%2BMPtNAtiXprqOJzl%2B%2FQmLh7E4dmY0hDNE46h4cZGLLvxjdeGWe15auAWpRfVz1hEldvReXuS2Y8uG8AM%2BY0Ih6uZoP3DwQ6eNNPHXgC%2BBNo8m%2ByaHSIqMVj%2BP8sFRaA%3D%3D; Hm_lpvt_829488e8924d8de8d4420f2bbed270ca=1690526067"
    val test_UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"



    sealed class DownloadState {
        object IN_PROGRESS : DownloadState()
        class SUCCESS(val file: File) : DownloadState()
        class ERROR(val message: String) : DownloadState()
    }
}
```
三、这是新的代码，但还没有实现，只写了一部分的逻辑
1. M3U8DownloadViewModel.kt
```kotlin
class M3U8DownloadViewModel @Inject constructor(
    @ApplicationContext context: Context
) : ViewModel() {
    private val downloadService: DownloadService = DownloadService.create(context)
    private val appContext = context

    /**
     * 下载所有ts文件
     */
    fun downloadAllTsFiles(
        streamingData: StreamingData
    ) {

    }

    /**
     * 下载一个ts文件
     */
    fun downloadTsFile(

    ) {

    }

    /**
     * 替换 m3u8 内容中的 URL
     */
    private fun replaceTsUrl(
        m3u8Content: String, // m3u8文件内容
        oldTsUrl: String, // 旧的ts文件URL，指向网络上的ts文件
        newTsUrl: String // 新的ts文件URL，指向本地已下载的ts文件
    ): String {
        return m3u8Content.replace(oldTsUrl, newTsUrl)
    }

    /**
     * 将更新后的M3U8内容保存到文件中
     */
    private fun saveM3U8ContentToFile(
        m3u8Content: String, // 更新后的M3U8内容
        appName: String, // 应用名
        m3u8FileId: String, // m3u8文件ID
        filename: String // 文件名
    ) {

    }

    /**
     * 为.m3u8文件和.ts文件创建一个目录
     * @param appName 应用名
     * @param m3u8FileId m3u8文件ID
     * @param filename 文件名
     * @suppress 最终的下载文件目录为：/storage/emulated/0/Download/应用名/m3u8文件ID/文件名
     */
    private fun createDownloadDir(
        appName: String, // 应用名
        m3u8FileId: String, // m3u8文件ID
        filename: String // 文件名
    ): File {
        // 获取公共下载目录
        val downloadDirectory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        // 创建应用名的子目录
        val appDirectory = File(downloadDirectory, appName)
        // 如果目录不存在，则创建它
        if (!appDirectory.exists()) {
            appDirectory.mkdirs()
        }
        // 在应用名的子目录下创建以m3u8文件ID为名称的子目录
        val m3u8Directory = File(appDirectory, m3u8FileId)
        // 如果目录不存在，则创建它
        if (!m3u8Directory.exists()) {
            m3u8Directory.mkdirs()
        }
        // 创建文件对象，表示最终的下载文件
        val file = File(m3u8Directory, filename)
        // 返回文件对象
        return file
    }

}
```
2. 数据类
```kotlin
@Serializable
data class StreamingResponse(
    @SerializedName("code") val code: Int,
    @SerializedName("streamingData") val streamingData: StreamingData,
    @SerializedName("message") val message: String
)
@Serializable
data class StreamingData(
    @SerializedName("m3u8") val m3u8: String,
    @SerializedName("params") val tsParams: List<TsParam>,
    @SerializedName("urls") val urls: List<String>
)
@Serializable
data class TsParam(
    @SerializedName("by") val `by`: String,
    @SerializedName("dtime") val dtime: String,
    @SerializedName("file_type") val file_type: String,
    @SerializedName("fsid") val fsid: String,
    @SerializedName("len") val len: String,
    @SerializedName("range") val range: String,
    @SerializedName("original_file_name") val original_file_name: String,
    @SerializedName("original_file_size") val original_file_size: String,
    @SerializedName("ts_index") val ts_index: Int,
    @SerializedName("ts_size") val ts_size: String,
    @SerializedName("ts_url") val ts_url: String
)
```
你帮我实现ts文件的下载和.m3u8文件的创建和更新.3u8文件内容，并且中文注释和函数说明，中文回答问题（以后我所有的问题都是如此）

























```kotlin
var updatedM3u8Content = StringBuilder(m3u8Content) // 用于更新的.m3u8内容
// 所有TS文件下载完毕，接下来替换M3U8内容中的URL，更新.m3u8文件内容
tsParams.forEachIndexed { index, tsParam ->
	val tsUrl = tsParam.ts_url
	val localPath = tsFilesLocalPaths[index]
	updatedM3u8Content = replaceTsUrl(updatedM3u8Content, tsUrl, localPath)
}

/**
 * 替换 m3u8 内容中的 URL
 */
private fun replaceTsUrl(
	m3u8Content: String, // m3u8文件内容
	oldTsUrl: String, // 旧的ts文件URL，指向网络上的ts文件
	newTsUrl: String // 新的ts文件URL，指向本地已下载的ts文件
): String {
	return m3u8Content.replace(oldTsUrl, newTsUrl)
}

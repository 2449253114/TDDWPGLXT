你先看代码
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
				"ts_url": "https://d09be1-613813804.antpcdn.com:19001/b/v2-ant.baidu.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=9182391360836148535&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=0&logid=9182391360836148535&mtime=1708361503&ouk=1815907562&r=239172419&size=450828284&sta_cs=2&sta_dt=video&sta_dx=429&time=1712504469&to=vas2&tot=bCNc7&uo=any&uva=173034443&vuk=1815907562&backhost=%5B%22xacu07.baidupcs.com%22%2C%22yqall07.baidupcs.com%22%5D&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=1077240&path=%2F_pcs_.appdata%2Fyoua%2Fweb%2F1773153875_758_IMG_0044_1708361503502_39.mp4&range=0-1077239&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-no6yzoHBV3VpzrJ5%252FtTG76R%252Bhc4%253D&xcode=fda2882887681eba717647aa1a7af9b6ceb7a5b36b4db0c8b36880baaee5366c911d5d2bca9989aa831d4f23c32d2573&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming",
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
二、这是我目前的代码
1. M3U8DownloadViewModel.kt
```kotlin
@HiltViewModel
class M3U8DownloadViewModel @Inject constructor(
    @ApplicationContext context: Context,
) : ViewModel() {
    private val downloadService: DownloadService = DownloadService.create(context)
    private val appContext = context

    // 通过 Application 的 Context 获取应用名称
    private val appName: String = appContext.applicationContext.getString(R.string.app_name)

    // 用于监听下载状态和进度的LiveData
    private val _downloadState = MutableLiveData<DownloadState>()
    val downloadState: LiveData<DownloadState> = _downloadState

    // 用于监听下载进度的LiveData
    private val _downloadProgress = MutableLiveData<Int>()
    val downloadProgress: LiveData<Int> = _downloadProgress


    // 下载任务列表
    private val downloadTasks = mutableListOf<M3U8DownloadTask>()


    /**
     * 开始批量下载
     */
    fun startMultipleDownloads(
        downloadTasksList: List<M3U8DownloadTask>
    ) {
        downloadTasks.clear()
        downloadTasks.addAll(downloadTasksList)

        downloadTasks.forEach { task ->
            startDownload(task.streamingData) { isSuccess ->
                task.isCompleted = true
                task.isSuccess = isSuccess
                checkAllDownloadsComplete()
            }
        }
    }

    // 检查是否所有下载都已完成
    private fun checkAllDownloadsComplete() {
        if (downloadTasks.all { it.isCompleted }) {
            // 所有下载任务已完成，可以在这里执行一些收尾工作
            // 比如通知UI下载全部完成等
            val allSuccess = downloadTasks.all { it.isSuccess }
            if (allSuccess) {
                // 所有下载都成功了
            } else {
                // 至少有一个下载失败了
            }
        }
    }


    /**
     * 开始下载
     */
    fun startDownload(
        streamingData: StreamingData,
        onDownloadComplete: (Boolean) -> Unit // 下载完成回调
    ) {
        // 下载m3u8文件
        downloadAllTsFiles(streamingData, onDownloadComplete)
    }

    /**
     * 下载所有ts文件，并更新本地m3u8文件
     * @param streamingData 调用m3u8视频接口返回的数据对象
     */
    private fun downloadAllTsFiles(
        streamingData: StreamingData,
        onDownloadComplete: (Boolean) -> Unit
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            val tsFilesLocalPaths = mutableListOf<String>()
            val tsParams = streamingData.tsParams
            val m3u8Content = streamingData.m3u8 // 原始.m3u8文件内容
            var updatedM3u8Content = streamingData.m3u8 // 用于更新的.m3u8内容

            // 遍历所有ts文件的URL，下载并记录本地路径
            tsParams.forEachIndexed { index, tsParam ->
                val tsUrl = tsParam.ts_url
                val localFileName =
                    "${tsParam.original_file_name.substringBeforeLast(".")}-${tsParam.by}-${tsParam.ts_index}.ts"

                Log.d("开始下载第${index + 1}个TS文件", "URL: $tsUrl")

                val localFile = downloadTsFile(
                    tsUrl = tsUrl,
                    fileId = tsParam.fsid,
                    localFileName = localFileName,
                )


                localFile?.let {
                    tsFilesLocalPaths.add(it.absolutePath)
                } ?: run {
                    _downloadState.postValue(DownloadState.ERROR("下载TS文件失败"))
                    return@launch
                }
            }

            // 所有TS文件下载完毕，接下来替换M3U8内容中的URL，更新.m3u8文件内容
            tsParams.forEachIndexed { index, tsParam ->
                val tsUrl = tsParam.ts_url
                val localPath = tsFilesLocalPaths[index]
                updatedM3u8Content = replaceTsUrl(
                    m3u8Content = updatedM3u8Content,
                    oldTsUrl = tsUrl,
                    newTsUrl = localPath,
                )
            }

            // 保存更新后的M3U8内容到本地文件
            val m3u8FileName = "${streamingData.tsParams.first().fsid}.m3u8"
            saveM3U8ContentToFile(
                m3u8Content = updatedM3u8Content.toString(),
                appName = appName,
                m3u8FileId = streamingData.tsParams.first().fsid,
                filename = m3u8FileName,
            )

            withContext(Dispatchers.Main) {
                showToast(appContext, "m3u8下载完成")
                onDownloadComplete(true)
            }

        }
    }

    /**
     * 下载一个ts文件并返回本地文件
     */
    private fun downloadTsFile(
        tsUrl: String, // ts文件URL
        fileId: String, // 文件ID
        localFileName: String, // 本地文件名
    ): File? {
        val headers = mapOf(
            //"Accept" to "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept" to "*/*",
            "Cache-Control" to "no-cache",
            "Connection" to "keep-alive",
            "Accept-Encoding" to "gzip, deflate, br",
            "Host" to Uri.parse(tsUrl).host.toString(),
        )

        val call = downloadService.downloadFileWithDynamicUrlAsync(tsUrl, headers)

        return try {
            val response = call.execute()
            if (response.isSuccessful) {
                response.body()?.let { responseBody ->
                    val downloadDir = createDownloadDir(appName, fileId, localFileName)
                    val localFile = File(downloadDir, localFileName)

                    writeResponseBodyToDisk(responseBody, localFile)
                    _downloadState.postValue(DownloadState.SUCCESS(localFile))
                    localFile
                }
            } else {
                _downloadState.postValue(DownloadState.ERROR("服务器响应错误: ${response.code()}"))
                null
            }
        } catch (e: IOException) {
            _downloadState.postValue(DownloadState.ERROR("下载过程中出现错误: ${e.message}"))
            null
        }
    }

    /**
     * 将响应体写入磁盘
     */
    private fun writeResponseBodyToDisk(body: ResponseBody, file: File) {
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
        } catch (e: IOException) {
            _downloadState.postValue(DownloadState.ERROR("文件写入错误: ${e.message}"))
        } finally {
            inputStream?.close()
            outputStream?.close()
        }
    }

    /**
     * 替换 m3u8 内容中的 URL
     */
    private fun replaceTsUrl(
        m3u8Content: String, // m3u8内容的
        oldTsUrl: String, // 旧的ts文件URL，指向网络上的ts文件
        newTsUrl: String, // 新的ts文件URL，指向本地已下载的ts文件
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
        filename: String, // 文件名
    ) {
        val downloadDir = createDownloadDir(appName, m3u8FileId, filename)
        val m3u8File = File(downloadDir, filename)
        try {
            FileOutputStream(m3u8File).use { output ->
                output.write(m3u8Content.toByteArray())
                _downloadState.postValue(DownloadState.SUCCESS(m3u8File))
            }
        } catch (e: IOException) {
            _downloadState.postValue(DownloadState.ERROR("保存M3U8文件时出现错误: ${e.message}"))
        }
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
        filename: String, // 文件名
    ): File {
        // 获取公共下载目录
        val downloadDirectory =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
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
        // 返回目录对象
        return m3u8Directory

        // 创建文件对象，表示最终的下载文件
        //val file = File(m3u8Directory, filename)
        // 返回文件对象
        //return file
    }

    // 是否开始流媒体内容请求
    var startStreamingRequest by mutableStateOf(false)
    var streamingData by mutableStateOf<StreamingData?>(null)

    /**
     * 获取m3u8流内容
     */
    fun getStreamingContent(
        fsId: Long,
        onSuccess: (StreamingResponse) -> Unit,
        onFailure: (Throwable) -> Unit = { },
    ) {
        // 执行网络请求...
        viewModelScope.launch {
            // 在协程中执行网络请求
            try {// try-catch 用于捕获网络请求过程中的异常
                // 异步执行网络请求并在 IO Dispatcher 上执行
                val response = downloadService.getStreamingContent(fs_id = fsId)
                streamingData = response.data
                onSuccess(response)
            } catch (e: Exception) {
                // 网络请求失败，将异常传递给调用者
                onFailure(e)
            }
        }
    }

}
```
2. 数据类
```kotlin
@Serializable
data class StreamingResponse(
    @SerializedName("code") val code: Int,
    @SerializedName("data") val data: StreamingData,
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
@Serializable
data class M3U8DownloadTask(
    val fsId: Long, // The unique filesystem identifier for the download
    val streamingData: StreamingData, // 执行下载所需的数据
    var isCompleted: Boolean = false, // 指示下载是否完成的标志
    var isSuccess: Boolean = false // 指示下载是否成功的标志
)
```
你帮我把列表播放增加下载进度，下载进度的计算方式是这样的，
1. 进度条100% = streamingData.params.size的每个writeResponseBodyToDisk方法里progress=100。这样说不知道你明不明白？
2. 假设当前下载的m3u8文件的params.size=5，然后就相当于每个writeResponseBodyToDisk方法里progress的100，相当于params.size里每个是20，即5*20=100,进度就是这样算的。
















// 更新整体下载进度的方法
private fun updateOverallProgress(task: M3U8DownloadTask) {
    // 如果当前TS文件下载完成（即进度为100），更新整体进度
    if (task.progress == 100) {
        val totalProgress = downloadTasks.sumOf { it.progress } / downloadTasks.size
        _downloadProgress.postValue(totalProgress)
    }
}我能实时更新进度吗？而不是必须等当前ts下载完成才更新，假设我ts总是是5个，每个ts的100进度就是相当于ts总数的单个20进度，如果是必须下载完成才更新，那就是20、40、60、80、100这样不好，我中间的进度全部看不到啊，从1-19.9,20.1-39.9等等，这些进度的更新我全部不知道啊，这样是不好的。

// 计算并更新单个TS文件的下载进度
val singleFileProgress = (fileSizeDownloaded * 100 / fileSize).toInt()
task.progress = (singleFileProgress * 20) / 100 // 每个ts文件完成度占总进度的1/5你这里又错了啊，这是能写死的吗？不应该是计算出来的吗？根据totalTs计算出，每个ts的100进度相当于totalTs的每个ts的多少进度。

也就是说还需要增加：每个TS文件的下载完成度对应于整体进度条的一部分






有BUG啊，你看控制台打印的消息，每个下载任务都只下载了第一个ts就停止了，而实际需求是需要同时下载3个m3u8文件的ts任务啊
```txt
2024-04-09 13:11:33.724 28565-2099  开始下载第1个TS文件             com.withhim.cc.demo.debug            D  URL: https://d09be1-613813804.antpcdn.com:19001/b/v2-ant.baidu.com/video/netdisk-videotran-xian/cd4dcc3e3hd1e54b11ba8e69e6d891ee_1075_1_ts/705deb4186c895f049bdedfa06e97372?ts_size=13571532&app_id=16051585&csl=0&dp-logid=2995578577818725&esl=1&fn=1773153875_758_IMG_0044_1708361503502_39.mp4&from_type=1&fsid=296700103461475&isplayer=1&iv=0&logid=2995578577818725&mtime=1708361503&ouk=1815907562&r=98258563&size=450828284&sta_cs=3&sta_dt=video&sta_dx=429&time=1712668294&to=vas2&tot=c2lS2&uo=any&uva=173034443&vuk=1815907562&backhost=%5B%22xacu07.baidupcs.com%22%2C%22yqall07.baidupcs.com%22%5D&dtime=10&etag=705deb4186c895f049bdedfa06e97372&fid=37910c2fdb23889de4903de8a3a2fc97-1815907562&len=1077240&path=%2F_pcs_.appdata%2Fyoua%2Fweb%2F1773153875_758_IMG_0044_1708361503502_39.mp4&range=0-1077239&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-2FDmEkDMrSSTDFTzFwxO2x4oMV0%253D&xcode=c36e650aa371d79975e1e678b91a7a14ceb7a5b36b4db0c89b5da96f8e919d4d991773cacbdc6913245337631125c2bf&xv=6&need_suf=&pmk=1400705deb4186c895f049bdedfa06e97372fd54396b000000cf15cc&by=my-streaming
2024-04-09 13:11:33.729 28565-2095  开始下载第1个TS文件             com.withhim.cc.demo.debug            D  URL: https://d2aa27-613813799.antpcdn.com:19001/b/v2-ant.baidu.com/video/netdisk-videotran-xian/a821daab8pa1aa5fe68b211fd590d5b2_1075_1_ts/1b5695f67bdcd72c8479719438ee199a?ts_size=18218704&app_id=16051585&csl=0&dp-logid=2995576581688291&esl=1&fn=1773153875_756_IMG_0018_1708361184666_51.mp4&from_type=1&fsid=958983419073317&isplayer=1&iv=0&logid=2995576581688291&mtime=1708361184&ouk=1815907562&r=361104686&size=187639809&sta_cs=3&sta_dt=video&sta_dx=178&time=1712668294&to=vas2&tot=ceix1&uo=any&uva=173034443&vuk=1815907562&backhost=%5B%22xacu07.baidupcs.com%22%2C%22yqall07.baidupcs.com%22%5D&dtime=2&etag=1b5695f67bdcd72c8479719438ee199a&fid=15dc62826354bb5a9e2d457c03e4287d-1815907562&len=360396&path=%2F_pcs_.appdata%2Fyoua%2Fweb%2F1773153875_756_IMG_0018_1708361184666_51.mp4&range=0-360395&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-Cuj4F3mvqMcBJKBoES3vcX33x8k%253D&xcode=c36e650aa371d7994ee3e3d78fb0ec313a886db6b5f4cdc6e0992c007689797771a1a503d37f2197c830a37061c0be2a316128a2cdfcce4d&xv=6&need_suf=&pmk=14001b5695f67bdcd72c8479719438ee199a008c82f000000115fed0&by=my-streaming
2024-04-09 13:11:33.756 28565-2104  开始下载第1个TS文件             com.withhim.cc.demo.debug            D  URL: https://055d6a-3748597356.antpcdn.com:19001/b/v2-ant.baidu.com/video/netdisk-videotran-xian/e4a5a1eb5lda437925c6d7f78cec5134_1076_1_ts/05f2b4baaf33d2de332054f3990e1214?ts_size=15904236&app_id=16051585&csl=0&dp-logid=2995666930038742&esl=1&fn=1773153875_352_5fcf71cb90d427011a49c_source.mp4&from_type=1&fsid=857096118037517&isplayer=1&iv=0&logid=2995666930038742&mtime=1708232327&ouk=1815907562&r=332174973&size=66237368&sta_cs=2&sta_dt=video&sta_dx=63&time=1712668294&to=vas2&tot=cemES&uo=any&uva=173034443&vuk=1815907562&backhost=%5B%22xacu07.baidupcs.com%22%2C%22yqall07.baidupcs.com%22%5D&dtime=2&etag=05f2b4baaf33d2de332054f3990e1214&fid=6bc70e020c8697573d657de58b286fb4-1815907562&len=483348&path=%2F_pcs_.appdata%2Fyoua%2Fweb%2F1773153875_352_5fcf71cb90d427011a49c_source.mp4&range=0-483347&region=xian&resv4=&sign=BOUTRFPQV-F3530edecde9cd71b79378b290804a96-RXZlWHs38uCuO9Z8Qf8meeDTvW8%253D&xcode=c36e650aa371d799b9c898b8279f4aad4fd92a8e70b030db4d3fa7b22fe98461f0cdb7f85d9e41bc2993ab87373d7cd7316128a2cdfcce4d&xv=6&need_suf=&pmk=140005f2b4baaf33d2de332054f3990e1214f07a4dc7000000f2adec&by=my-streaming
2024-04-09 13:11:54.873 28565-2732  ActivityThread          com.withhim.cc.demo.debug            V  updateVmProcessStateForGc sceneId =2 state=197376
```
这是代码
```kotlin
@HiltViewModel
class NewM3U8DownloadViewModel @Inject constructor(
    @ApplicationContext context: Context,
) : ViewModel() {
    private val dataSaver get() = AppConfig.dataSaver

    // 最大并发下载数为3
    private val maxConcurrentDownloads = 3
    private val downloadSemaphore = Semaphore(maxConcurrentDownloads)


    private val downloadService: DownloadService = DownloadService.create(context)
    private val appContext = context
    private val appName: String = appContext.applicationContext.getString(R.string.app_name)



    // 下载任务列表
    var downloadTasks: List<M3U8DownloadTask>? by dataSaverState(
        key = "downloadTasks",
        initialValue = null
    )

    // 创建一个下载任务
    fun createDownloadTask(fsId: Long) {
        val task = M3U8DownloadTask(fsId = fsId)
        // 保存到下载任务列表
        val tasks = downloadTasks?.toMutableList() ?: mutableListOf()
        tasks.add(task)
        // 更新下载任务列表
        downloadTasks = tasks
    }

    // 测试
    val fsIds by dataSaverState(
        key = "fsIds",
        initialValue = listOf(857096118037517, 296700103461475, 958983419073317)
    )

    // 批量创建下载任务
    fun createDownloadTasks(fsIds: List<Long>) {
        fsIds.forEach { fsId ->
            createDownloadTask(fsId)
        }
    }

    // 批量下载
    fun startDownloadAll() {
        downloadTasks?.forEach { task ->
            viewModelScope.launch(Dispatchers.IO) {
                downloadSemaphore.withPermit {
                    startDownload(task.fsId)
                }
            }
        }
    }

    // 开始下载
    fun startDownload(fsId: Long) {
        // 从下载任务列表中找到对应的任务
        val task = downloadTasks?.find { it.fsId == fsId } ?: return

        // 以下几点的序号不分先后顺序，只是为了方便理解，实际操作时可以根据实际情况调整顺序
        // 1. 下载之前需要先判断是否已经获取了存储权限
        // 2. 下载之前需要先判断streamingData是否为空，如果为空则需要调用接口获取
        // 3. 下载之前需要先判断是否已经下载过.m3u8文件，如果已经下载过则不再重复下载
        // 4. 下载之前需要先判断是否已经下载过所有的ts文件，如果已经下载过则不再重复下载
        // 5. 下载之前需要先判断是否已经合并过.m3u8文件为MP4，如果已经合并过则不再重复合并


        // 判断是否已经下载过.m3u8文件，如果已经下载过则不再重复下载
        if (task.isM3U8FileSaved) {
            // 已经下载过.m3u8文件，不再重复下载
            return
        }

        // 判断streamingData是否为空，如果为空则需要调用接口获取
        if (task.streamingData == null) {
            // 请求视频文件地址
            getStreamingContent(
                fsId = fsId,
                onSuccess = { response ->
                    // 请求成功，但不一定有数据，比如没有播放次数或者没有VIP权限等
                    showToast(appContext, response.message)
                    response.data?.let { streamingData ->
                        task.streamingData = streamingData
                        // 开始下载
                        //downloadM3U8(task)
                        downloadM3U8AllTsFiles(task) { isDownloadComplete ->
                            if (isDownloadComplete) {
                                // 合并m3u8文件为MP4
                                //mergeM3U8FilesToMp4(task)
                            }
                        }
                    }
                },
                onFailure = { throwable ->
                    // 失败
                    showToast(appContext, "请求失败：${throwable.message}")
                    Log.d("M3U8DownloadScreen", "请求失败：${throwable.message}")
                }
            )
        } else {
            // 开始下载
            //downloadM3U8(task)
            downloadM3U8AllTsFiles(task) { isDownloadComplete ->
                if (isDownloadComplete) {
                    // 合并m3u8文件为MP4
                    //mergeM3U8FilesToMp4(task)
                }
            }
        }

    }

    /**
     * 下载.m3u8的所有ts文件，并更新本地m3u8文件
     * @param downloadTask 调用m3u8视频接口返回的数据对象
     */
    private fun downloadM3U8AllTsFiles(
        downloadTask: M3U8DownloadTask,
        onDownloadComplete: (Boolean) -> Unit,
    ) {
        viewModelScope.launch(Dispatchers.IO) {
            val tsFilesLocalPaths = mutableListOf<String>()
            val streamingData = downloadTask.streamingData!!
            val tsParams = streamingData.tsParams
            val m3u8Content = streamingData.m3u8 // 原始.m3u8文件内容
            var updatedM3u8Content = streamingData.m3u8 // 用于更新的.m3u8内容

            // 尝试获取一个许可证，限制并发数
            downloadSemaphore.acquire()

            try {

                // 遍历所有ts文件的URL，下载并记录本地路径
                tsParams.forEachIndexed { index, tsParam ->
                    val tsUrl = tsParam.ts_url
                    val localFileName =
                        "${tsParam.original_file_name.substringBeforeLast(".")}-${tsParam.by}-${tsParam.ts_index}.ts"

                    Log.d("开始下载第${index + 1}个TS文件", "URL: $tsUrl")
                    downloadTask.startDownloadIndexTs = index + 1

                    val localFile = downloadTsFile(
                        tsUrl = tsUrl,
                        fileId = tsParam.fsid,
                        localFileName = localFileName,
                        downloadTask = downloadTask,
                    )

                    localFile?.let {
                        tsFilesLocalPaths.add(it.absolutePath)
                        downloadTask.numDownloadedTs = index + 1
                        downloadTask.tsFilesLocalPaths = tsFilesLocalPaths
                    } ?: run {
                        downloadTask.state = DownloadState.ERROR("下载TS文件失败")
                        return@launch
                    }
                }

                // 所有TS文件下载完毕，接下来替换M3U8内容中的URL，更新.m3u8文件内容
                tsParams.forEachIndexed { index, tsParam ->
                    val tsUrl = tsParam.ts_url
                    val localPath = tsFilesLocalPaths[index]
                    updatedM3u8Content = replaceTsUrl(
                        m3u8Content = updatedM3u8Content,
                        oldTsUrl = tsUrl,
                        newTsUrl = localPath,
                    )
                }

                // 保存更新后的M3U8内容到本地文件
                val m3u8FileName = "${streamingData.tsParams.first().fsid}.m3u8"
                saveM3U8ContentToFile(
                    m3u8Content = updatedM3u8Content,
                    appName = appName,
                    m3u8FileId = streamingData.tsParams.first().fsid,
                    filename = m3u8FileName,
                    downloadTask = downloadTask,
                )

            }  catch (e: Exception) {

                downloadTask.state = DownloadState.ERROR("下载过程中出现错误: ${e.message}")

            } finally {
                // 确保无论成功或失败，都释放许可证
                downloadSemaphore.release()
            }

            withContext(Dispatchers.Main) {
                showToast(appContext, "m3u8下载完成")
                onDownloadComplete(true)
            }

        }
    }

    /**
     * 下载一个ts文件并返回本地文件
     */
    private fun downloadTsFile(
        tsUrl: String, // ts文件URL
        fileId: String, // 文件ID
        localFileName: String, // 本地文件名
        downloadTask: M3U8DownloadTask, // 下载任务
    ): File? {
        val headers = mapOf(
            //"Accept" to "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept" to "*/*",
            "Cache-Control" to "no-cache",
            "Connection" to "keep-alive",
            "Accept-Encoding" to "gzip, deflate, br",
            "Host" to Uri.parse(tsUrl).host.toString(),
        )

        val call = downloadService.downloadFileWithDynamicUrlAsync(tsUrl, headers)

        return try {
            val response = call.execute()
            if (response.isSuccessful) {
                response.body()?.let { responseBody ->
                    val downloadDir = createDownloadDir(appName, fileId, localFileName)
                    val localFile = File(downloadDir, localFileName)

                    writeResponseBodyToDisk(responseBody, localFile, downloadTask)

                    downloadTask.state = DownloadState.SUCCESS(localFile, "TS文件下载成功")
                    localFile
                }
            } else {
                downloadTask.state = DownloadState.ERROR("服务器响应错误: ${response.code()}")
                null
            }
        } catch (e: IOException) {
            downloadTask.state = DownloadState.ERROR("下载过程中出现错误: ${e.message}")
            null
        }
    }

    /**
     * 将响应体写入磁盘
     */
    private fun writeResponseBodyToDisk(
        body: ResponseBody,
        file: File,
        downloadTask: M3U8DownloadTask,
    ) {
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

                // 计算并更新单个TS文件的下载进度
                val singleFileProgress = (fileSizeDownloaded * 100 / fileSize).toInt()
                // 每个TS文件的下载完成度对应于整体进度条的一部分
                val weightPerTs = 100 / downloadTask.totalTs!!
                downloadTask.progress = singleFileProgress * weightPerTs / 100
                downloadTask.state = DownloadState.InProgress(downloadTask.progress)

                // 更新整体下载进度（任务列表中所有文件加载一起的下载总进度相对于整个任务100%的多少）
                //updateOverallProgress()

                //val progress = (fileSizeDownloaded * 100 / fileSize).toInt()
                //_downloadProgress.postValue(progress)

            }
            outputStream.flush()
        } catch (e: IOException) {
            downloadTask.state = DownloadState.ERROR("文件写入错误: ${e.message}")
        } finally {
            inputStream?.close()
            outputStream?.close()
        }
    }

    // 更新整体下载进度的方法
    private fun updateOverallProgress() {
        // 计算所有下载任务的平均进度
        //val totalProgress = downloadTasks.sumOf { it.progress * (100 / it.totalTs) } / downloadTasks.size
        // _downloadProgress.postValue(totalProgress.coerceIn(0, 100))
    }


    /**
     * 替换 m3u8 内容中的 URL
     */
    private fun replaceTsUrl(
        m3u8Content: String, // m3u8内容的
        oldTsUrl: String, // 旧的ts文件URL，指向网络上的ts文件
        newTsUrl: String, // 新的ts文件URL，指向本地已下载的ts文件
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
        filename: String, // 文件名
        downloadTask: M3U8DownloadTask, // 下载任务
    ) {
        val downloadDir = createDownloadDir(appName, m3u8FileId, filename)
        val m3u8File = File(downloadDir, filename)
        try {
            FileOutputStream(m3u8File).use { output ->
                output.write(m3u8Content.toByteArray())
                downloadTask.isM3U8FileSaved = true
                downloadTask.m3u8FileLocalPath = m3u8File.absolutePath
                downloadTask.state = DownloadState.SUCCESS(m3u8File, "所有ts文件下载完成，m3u8文件保存成功")
                // 如果所有ts文件都下载完成，且m3u8文件保存成功，则合并m3u8文件为MP4
                if (downloadTask.numDownloadedTs == downloadTask.totalTs && downloadTask.isM3U8FileSaved) {
                    //mergeM3U8FilesToMp4(downloadTask)
                }
            }
        } catch (e: IOException) {
            downloadTask.state = DownloadState.ERROR("保存M3U8文件时出现错误: ${e.message}")
        }
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
        filename: String, // 文件名
    ): File {
        // 获取公共下载目录
        val downloadDirectory =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
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
        // 返回目录对象
        return m3u8Directory

        // 创建文件对象，表示最终的下载文件
        //val file = File(m3u8Directory, filename)
        // 返回文件对象
        //return file
    }






    // 暂停下载
    fun pauseDownload(fsId: Long) {
        // 从下载任务列表中找到对应的任务
        val task = downloadTasks?.find { it.fsId == fsId } ?: return
        // 暂停下载

    }

    // 取消下载
    fun cancelDownload(fsId: Long) {
        // 从下载任务列表中找到对应的任务
        val task = downloadTasks?.find { it.fsId == fsId } ?: return
        // 取消下载

    }

    // 删除下载
    fun deleteDownload(fsId: Long) {
        // 从下载任务列表中找到对应的任务
        val task = downloadTasks?.find { it.fsId == fsId } ?: return
        // 删除下载

    }

    // 清空下载任务列表
    fun clearDownloadTasks() {
        downloadTasks = null
    }

    // 获取下载任务
    fun getDownloadTask(fsId: Long): M3U8DownloadTask? {
        return downloadTasks?.find { it.fsId == fsId }
    }

    // 获取下载进度
    fun getDownloadProgress(fsId: Long): Int {
        return downloadTasks?.find { it.fsId == fsId }?.progress ?: 0
    }

    // 获取下载状态
    fun getDownloadState(fsId: Long): DownloadState {
        return downloadTasks?.find { it.fsId == fsId }?.state ?: DownloadState.NotStarted
    }



    // 是否开始流媒体内容请求
    var startStreamingRequest by mutableStateOf(false)
    private var streamingData by mutableStateOf<StreamingData?>(null)

    /**
     * 获取m3u8流内容
     */
    private fun getStreamingContent(
        fsId: Long,
        onSuccess: (StreamingResponse) -> Unit,
        onFailure: (Throwable) -> Unit = { },
    ) {
        startStreamingRequest = true
        // 执行网络请求...
        viewModelScope.launch {
            // 在协程中执行网络请求
            try {// try-catch 用于捕获网络请求过程中的异常
                // 异步执行网络请求并在 IO Dispatcher 上执行
                val response = downloadService.getStreamingContent(fs_id = fsId)
                streamingData = response.data
                startStreamingRequest = false
                onSuccess(response)
            } catch (e: Exception) {
                startStreamingRequest = false
                // 网络请求失败，将异常传递给调用者
                onFailure(e)
            }
        }
    }


    private inline fun <reified T> dataSaverState(key: String, initialValue: T) =
    // we pass dataSaver and custom coroutineScope(viewModelScope)
        // so that if the viewModel is cleared, the un-finished coroutine will be cancelled as well
        mutableDataSaverStateOf(
            dataSaverInterface = dataSaver,
            key = key,
            initialValue = initialValue,
            ///async = true,// 是否异步保存
            // 2024-0310-1802 更改为同步保存
            async = false,// 是否异步保存
            coroutineScope = viewModelScope
        )

    /**
     * This function READ AND CONVERT the saved data and return a [DataSaverMutableState].
     * Check the example in `README.md` to see how to use it.
     *
     * mutableDataSaverStateOf
     * 此函数 **读取并转换** 已保存的数据，返回 [DataSaverMutableState]
     *
     * @param key String 键
     * @param initialValue T 如果本地还没保存过值，此值将作为初始值；其他情况下会读取已保存值
     * @param savePolicy 管理是否。何时做持久化操作，见 [SavePolicy]
     * @param async 是否异步做持久化
     * @return DataSaverMutableState<T>
     *
     * @see DataSaverMutableState
     */


    companion object {
        private const val TAG = "NewM3U8DownloadViewModel"
    }
}
```



其实我的意思是在startDownloadAll开始时限制同时下载的m3u8文件同时下载的数量，并且利用回调下载成功来释放，接着下载下一个。
然后再downloadM3U8AllTsFiles内部再限制一个同时下载ts文件的数量，并且不能阻塞当前协程，例如使用async和await。
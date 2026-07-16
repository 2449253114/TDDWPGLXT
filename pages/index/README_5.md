可是为什么界面UI上没有实时更新状态呢？比如下载进度
```kotlin
@Composable
fun NewM3U8DownloadScreen(
    viewModel: NewM3U8DownloadViewModel = hiltViewModel(),
) {
    // TODO 2024-0409 M3U8DownloadScreen
    val context = LocalContext.current

    val fsIds by viewModel::fsIds

    // 创建一个launcher用于启动权限请求
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = RequestPermission(),
        onResult = { isGranted: Boolean ->
            if (isGranted) {
                // 权限被授予，执行下载操作
                viewModel.clearDownloadTasks()
                viewModel.createDownloadTasks(fsIds)
                viewModel.startDownloadAll()

                showToast(context, "权限被授予")
            } else {
                // 权限被拒绝，显示一个提示或执行其他操作
                showToast(context, "权限被拒绝")
            }
        }
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
    ) {

        Button(onClick = {
            when {
                ContextCompat.checkSelfPermission(
                    context,
                    permission.WRITE_EXTERNAL_STORAGE
                ) == PackageManager.PERMISSION_GRANTED -> {
                    // 权限已经被授予
                    showToast(context, "权限已经被授予")
                    viewModel.clearDownloadTasks()
                    viewModel.createDownloadTasks(fsIds)
                    viewModel.startDownloadAll()
                }
                else -> {
                    // 请求权限
                    permissionLauncher.launch(permission.WRITE_EXTERNAL_STORAGE)
                }
            }

        }) {
            Text(text = "开始批量下载m3u8")
        }

        val downloadTasks by viewModel::downloadTasks

        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
            downloadTasks?.let {
                items(it) { task ->
                    Column {
                        Text(text = "fsId: ${task.fsId}")
                        Text(text = "下载进度：${task.progress}%")
                        LinearProgressIndicator(
                            progress = { task.progress / 100f },
                        )
                        when (task.state) {
                            is DownloadState.NotStarted -> {
                                Text(text = "未开始")
                            }
                            is DownloadState.InProgress -> {
                                Text(text = "下载中")
                            }
                            is DownloadState.SUCCESS -> {
                                val file = (task.state as DownloadState.SUCCESS).file
                                val message = (task.state as DownloadState.SUCCESS).message
                                Text(text = "${message}：${file.absolutePath}")
                            }
                            is DownloadState.ERROR -> {
                                val message = (task.state as DownloadState.ERROR).message
                                Text(text = "下载错误：$message")
                            }
                            else -> {}
                        }
                        Text(text = "totalTs: ${task.totalTs}")
                        Text(text = "startDownloadIndexTs: ${task.startDownloadIndexTs}")
                        Text(text = "numDownloadedTs: ${task.numDownloadedTs}")
                        Text(text = "isM3U8FileSaved: ${task.isM3U8FileSaved}")
                        Text(text = "m3u8FileLocalPath: ${task.m3u8FileLocalPath}")
                    }
                }
            }
        }

    }
}

```
```kotlin
@HiltViewModel
class NewM3U8DownloadViewModel @Inject constructor(
    @ApplicationContext context: Context,
) : ViewModel() {
    private val dataSaver get() = AppConfig.dataSaver

    // 最大并发下载数为3
    private val maxConcurrentM3U8Downloads = 3 // m3u8同时下载的数量
    private val m3u8downloadSemaphore = Semaphore(maxConcurrentM3U8Downloads)

    // 限制同时下载的TS文件数量
    private val maxConcurrentTsDownloads = 3 // ts同时下载的数量
    private val tsDownloadSemaphore = Semaphore(maxConcurrentTsDownloads)


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
                m3u8downloadSemaphore.withPermit {
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
                        task.totalTs = streamingData.tsParams.size
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


            // 需求：
            // 1. 现在需要同步下载所有的TS文件，当上一个TS文件下载完成后，才能开始下载下一个TS文件

            // 遍历所有ts文件的URL，下载并记录本地路径
            tsParams.forEachIndexed { index, tsParam ->
                val tsUrl = tsParam.ts_url
                val localFileName =
                    "${tsParam.original_file_name.substringBeforeLast(".")}-${tsParam.by}-${tsParam.ts_index}.ts"

                Log.d("开始下载第${index + 1}个TS文件", "URL: $tsUrl")
                downloadTask.startDownloadIndexTs = index + 1

                // 下载TS文件
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
                val localPath = tsFilesLocalPaths.getOrNull(index) ?: return@forEachIndexed
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

            Log.d("m3u8下载完成", "m3u8下载完成")

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

@Serializable
data class StreamingResponse(
    @SerializedName("code") val code: Int,
    @SerializedName("data") val data: StreamingData?,
    @SerializedName("message") val message: String
)

@Serializable
data class M3U8DownloadTask(
    val fsId: Long, // The unique filesystem identifier for the download
    var streamingData: StreamingData? = null, // 执行下载所需的数据
    var progress: Int = 0, // 新增字段，用于跟踪每个任务的进度
    var totalTs: Int? = streamingData?.tsParams?.size, // 总的TS文件数
    var startDownloadIndexTs: Int = 0, // 新增字段，用于标记开始下载的TS文件序号
    var numDownloadedTs: Int = 0, // 新增字段，用于跟踪已下载的TS文件数
    var tsFilesLocalPaths: MutableList<String> = mutableListOf(), // 新增字段，用于保存已下载的TS文件的本地路径
    var isM3U8FileSaved: Boolean = false, // 新增字段，用于标记m3u8文件是否保存成功
    var m3u8FileLocalPath: String = "", // 新增字段，用于保存m3u8文件的本地路径
    var state: DownloadState = DownloadState.NotStarted // 新增字段，用于跟踪下载状态
)

@Serializable
@Stable
sealed class DownloadState {
    object NotStarted : DownloadState() // 未开始
    class InProgress(val progress: Int) : DownloadState() // 下载中，全部ts文件下载中的总进度
    class SUCCESS(val file: File, val message: String) : DownloadState() // 下载成功，ts文件下载成功 或 合并m3u8文件成功
    class ERROR(val message: String) : DownloadState() // 下载失败, ts文件下载失败 或 合并m3u8文件失败
    object CANCELLED : DownloadState() // 取消下载
}
```
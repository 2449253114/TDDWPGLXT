按照你说的这样改了后，你确定可以控制m3u8同时下载的数量和ts同时下载的数量吗？并且能保证下载成功一个就下载下一个吗？确定不需要释放许可证？
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
    private val maxConcurrentTsDownloads = 10 // ts同时下载的数量
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


            // 并发下载TS文件，并处理每个文件的下载结果
            val downloadJobs = tsParams.mapIndexed { index, tsParam ->
                async {
                    tsDownloadSemaphore.withPermit {
                        val tsUrl = tsParam.ts_url
                        val localFileName =
                            "${tsParam.original_file_name.substringBeforeLast(".")}-${tsParam.by}-${tsParam.ts_index}.ts"
                        Log.d("开始下载第${index + 1}个TS文件", "URL: $tsUrl")
                        downloadTask.startDownloadIndexTs = index + 1


                        try {
                            val localFile = downloadTsFile(tsUrl, tsParam.fsid, localFileName, downloadTask)
                            localFile?.let {
                                // 同步添加文件路径到集合中
                                synchronized(tsFilesLocalPaths) {
                                    tsFilesLocalPaths.add(it.absolutePath)
                                    downloadTask.numDownloadedTs = index + 1
                                    downloadTask.tsFilesLocalPaths = tsFilesLocalPaths
                                }
                            } ?: run {
                                // 如果下载失败，设置任务状态为ERROR
                                downloadTask.state = DownloadState.ERROR("下载TS文件失败")
                                null // 返回null作为这个async任务的结果
                            }
                        } catch (e: Exception) {
                            // 如果发生异常，记录到任务状态中
                            downloadTask.state = DownloadState.ERROR("下载TS文件异常: ${e.message}")
                            null // 返回null作为这个async任务的结果
                        }
                    }
                }
            }

            // 等待所有的下载任务完成，这将返回一个包含每个任务结果的列表
            val tsFiles = downloadJobs.awaitAll().filterNotNull()

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

            withContext(Dispatchers.Main) {
                showToast(appContext, "m3u8下载完成")
                onDownloadComplete(true)
            }




            return@launch
//            
//            // 以下是下载过程的代码，暂时不需要
//            // 尝试获取一个许可证，限制并发数
//            m3u8downloadSemaphore.acquire()
//
//            try {
//
//                // 遍历所有ts文件的URL，下载并记录本地路径
//                tsParams.forEachIndexed { index, tsParam ->
//                    val tsUrl = tsParam.ts_url
//                    val localFileName =
//                        "${tsParam.original_file_name.substringBeforeLast(".")}-${tsParam.by}-${tsParam.ts_index}.ts"
//
//                    Log.d("开始下载第${index + 1}个TS文件", "URL: $tsUrl")
//                    downloadTask.startDownloadIndexTs = index + 1
//
//                    val localFile = downloadTsFile(
//                        tsUrl = tsUrl,
//                        fileId = tsParam.fsid,
//                        localFileName = localFileName,
//                        downloadTask = downloadTask,
//                    )
//
//                    localFile?.let {
//                        tsFilesLocalPaths.add(it.absolutePath)
//                        downloadTask.numDownloadedTs = index + 1
//                        downloadTask.tsFilesLocalPaths = tsFilesLocalPaths
//                    } ?: run {
//                        downloadTask.state = DownloadState.ERROR("下载TS文件失败")
//                        return@launch
//                    }
//                }
//
//            }  catch (e: Exception) {
//
//                downloadTask.state = DownloadState.ERROR("下载过程中出现错误: ${e.message}")
//
//            } finally {
//                // 确保无论成功或失败，都释放许可证
//                m3u8downloadSemaphore.release()
//            }
//            


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




根据您提供的代码和要求，您已经设置了两个信号量(Semaphore)，一个用于控制同时下载的m3u8文件数量（m3u8downloadSemaphore），另一个用于控制同时下载的TS文件数量（tsDownloadSemaphore）。这种方式可以实现您需要的功能，即：
startDownloadAll 方法使用 m3u8downloadSemaphore 来确保同时只有最多 maxConcurrentM3U8Downloads 个m3u8文件被下载。
downloadM3U8AllTsFiles 方法内部使用 tsDownloadSemaphore 来确保同时只有最多 maxConcurrentTsDownloads 个TS文件被下载。
关于许可证的释放问题，withPermit 是一个扩展函数，它在内部处理许可证的获取和释放。当执行到 withPermit 区块的代码时，它会自动获取一个许可证，并在区块代码结束后（无论是正常结束还是由于异常退出）释放许可证。
这里是 withPermit 扩展函数的一个简化示例，以帮助您理解如何工作的：
kotlin
suspend fun <T> Semaphore.withPermit(action: suspend () -> T): T {
    acquire() // 获取许可证
    try {
        return action() // 执行代码块
    } finally {
        release() // 最终释放许可证
    }
}
因此，根据您的代码，每当一个m3u8下载任务开始时，它会获取一个许可证，这个任务完成后（无论成功或失败），许可证都会被释放，然后下一个等待的m3u8下载任务可以开始。
同样的，每个TS文件下载任务在 downloadM3U8AllTsFiles 方法中也会获取和释放许可证。这确保了TS文件的下载也是并行的但受控的，并且当一个TS文件下载完成后，下一个等待的TS文件下载任务可以开始。
总结来说，您的代码应该能够实现以下功能：
控制m3u8文件的并发下载数量。
控制TS文件的并发下载数量。
当一个下载任务完成时，自动开始下一个等待的下载任务。
不需要在其他地方显式释放许可证，因为 withPermit 已经处理了这一点。
正如您的代码所展示的，当构建并发下载系统时，选择正确的并发控制机制（如信号量）和合理的并发数量是非常重要的，以确保系统资源得到有效利用，同时不会超过服务器的负载能力或导致应用崩溃。
```kotlin
/**
 * 文件缩略图Item
 */
@Composable
fun FileThumbItem(
    fileItem: FileItem,
    onNavigate: (String) -> Unit,
    onVideoClick: (FileItem) -> Unit,
    onPicClick: (FileItem) -> Unit
) {

    Box(
        modifier = Modifier
            .noRippleClickable {
                when (fileItem.category) {
                    1 -> onVideoClick(fileItem)
                    3 -> onPicClick(fileItem)
                }
            }
            .fillMaxWidth()
            .aspectRatio(1f),// 宽高1:1
    ) {
        DC_ColiImage(
            modifier = Modifier
                .fillMaxSize(),
            url = fileItem.thumburl,
            contentDescription = fileItem._id,
            contentScale = ContentScale.Crop,
        )

        // fileItem.category == 1 时显示持续时间
        if (fileItem.category == 1) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 3.dp, end = 5.dp)
            ) {
                Text(
                    text = fileItem.duration_format,// 持续时间格式 （一刻相册自带, 如：07:36）
                    color = Color.White,
                    fontSize = 10.sp,
                    lineHeight = 10.sp,
                    textAlign = TextAlign.Center,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .background(
                            color = Color.Black.copy(0.75f),
                            shape = RoundedCornerShape(50)
                        )
                        .wrapContentSize()
                        .padding(horizontal = 3.5.dp, vertical = 2.5.dp)
                )
            }
        }
    }
}


/**
 * 文件列表项
 */
@Serializable
data class FileItem(
    @SerializedName("thumburl") val thumburl: String, // 文件封面，采用后台配置的封面图来自阿里云OSS或者一刻相册的百度云OSS（2h时效性），默认百度云OSS，用于Home页subPager/file页展示和相册详情页的文件列表展示
    @SerializedName("thumburl_persistent") val thumburl_persistent: String, // 文件封面图永久链接，用于历史记录页和收藏页展示，防止图片失效，所以是阿里云OSS
)
```
我这里FileThumbItem组件在两处用了，Home页subPager/file和历史记录页及收藏页分别要用不同的URL，你帮我看看FileThumbItem这个组合增加个什么参数来控制比较好，要易懂易理解，默认值是thumburl这个类型，就是动态的。







参考代码1
```kotlin
/**
 * 实现双击返回键退出应用的功能。| 在按一次返回键后，会显示一个Toast提示“再按一次退出应用”。
 * 用户需要在2秒内连续按两次返回键才能退出应用。
 * 如果在2秒内没有按第二次返回键，会显示一个Toast提示，并重置计时器。
 */
@Composable
fun DoubleBackToExitApp() {
    // 获取当前的Context
    val context = LocalContext.current
    // 用于控制退出提示的显示状态
    var backPressedTime by remember { mutableStateOf(0L) }
    // 获取主协程作用域
    val coroutineScope = rememberCoroutineScope()

    // 处理返回按钮的点击事件
    BackHandler {
        // 获取当前时间
        val currentTime = System.currentTimeMillis()
        // 如果两次点击的间隔时间小于2秒，则退出应用
        if (currentTime - backPressedTime < 2000) {
            // 退出应用的逻辑（在这里是直接调用finish()方法）
            // 请根据实际情况调整，例如Activity.finish()或其他
            (context as? Activity)?.finish()
        } else {
            // 更新上一次点击返回按钮的时间
            backPressedTime = currentTime
            // 显示提示信息
            showToast(context, "再按一次退出")

            // 使用协程来重置backPressedTime状态，避免长时间保持非0值
            coroutineScope.launch {
                delay(2000) // 等待2秒
                backPressedTime = 0L // 重置backPressedTime
            }
        }
    }
}
```
然后帮我修改这里
```kotlin
/**
 * 跳转到指定界面
 */
fun onNavigateScreen(
    route: String,
    navController: NavHostController,
    appViewModel: AppViewModel,
) {
	
	// --从这开始
    // 获取oldRoute的当前值
    val oldRouteValue = oldRoute.value
    // 当route等于oldRouteValue时，并且route等于popBackStack时不执行导航。
    // 防止在短时间内重复执行返回操作，例如，用户快速连续点击返回按钮。
    if (route == oldRouteValue && route == popBackStack) {
        return
    }
    // 更新oldRoute的值
    oldRoute.value = route
	// 到这结束
	// 这部分的代码需要修改，因为现在的问题是，当路由中有两个一样的，就只能返回一次
	// 比如路由是这样的: home、detail、detail, 返回只能回退一次，即home、detail, 实际上正确的是还可以返回。
	
	

    when (route) {
        popBackStack -> {
            // 返回上一层导航图
            navController.popBackStack()
        }
        Login.route -> {
            // TODO 2024-0210 跳转到登录界面
            appViewModel.navigateToLogin(
                navController = navController,
                route = route
            ) {  }
        }
    }
}
```
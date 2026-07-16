这样为什么不行？
```kotlin
interface ApiService {
	    // 读取配置文件
    @GET("/app.php")
    suspend fun getConfig(): ConfigRes
	
	    companion object {
        // 创建一个Retrofit实例
//        fun create(context: Context): ApiService {
//            return Http(context).create(ApiService::class.java)
//        }

        fun create(context: Context): ApiService {
            return Http(context).create(ApiService::class.java, ApiType.BASE)
        }

        fun createJX(context: Context): ApiService {
            return Http(context).create(ApiService::class.java, ApiType.JX)
        }

        fun createConfig(context: Context): ApiService {
            return Http(context).create(ApiService::class.java, ApiType.CONFIG)
        }

    }
}


class Http(private val context: Context) {

    // 实例化本地存储
    private val localDataSaver = viewModels<LocalDataSaverModel>()
```
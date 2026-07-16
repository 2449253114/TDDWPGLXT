# 存放 一刻相册 上传文件 的示例
 - 已抓到 上传文件的接口 和 创建文件并添加文件到相册中。









# 问
https://xafj-cm10.pcs.baidu.com/rest/2.0/pcs/superfile2?method=upload&app_id=16051585&channel=chunlei&clienttype=70&web=1&logid=MTcxMTQ0ODc0MjI3NjAuMjIyMTQwODgyMTYxMzcwODU=&path=%2F%E4%B8%AD%E5%9B%BD%E8%83%96%E5%AD%903xHamster.mp4&uploadid=P1-MTAuOTIuODEuMTQyOjE3MTE0NDg3MTI6ODkwNjcxOTUxNzE2NTIyODU4Mw==&partseq=39，这段url中你能分析出partseq是什么意思吗？
# 答
在给定的URL中，partseq=39表示这是分片上传中的一个具体片段，通常表示这是第39个分片。在大文件上传过程中，文件会被分成多个片段(part)，每个片段被独立上传以便于处理大文件上传过程中可能出现的问题，如网络中断。partseq就是用来标识这些片段的顺序编号。在所有片段上传完成后，服务器通常会根据这个序号将所有片段合并成一个完整的文件。
# 问
你说的是对的，因为我上传文件，调用了49次这个接口，每个接口会等待200，全部200后就执行了另一条添加文件到相册的接口。
而且我发现这49次接口中都发送了FromData数据File：(binary)这是我在谷歌浏览器开发者工具接口请求中看到的，我想知道，
我要如何实现它这种，将文件分片上传呢？比如我这是uniapp vue2项目（用于h5的），我要如何实现分片上传？
# 答
在uniapp项目中实现文件的分片上传，你可以按照以下步骤进行：
1、选择文件并读取文件信息: 让用户选择文件，然后使用File API读取文件的信息和内容。
2、计算分片: 根据文件的总大小，确定每个分片的大小（例如，每个分片1MB），然后计算出需要分成多少个分片。
3、创建分片: 使用Blob对象的slice()方法将文件分割成多个片段。
4、上传分片: 逐个上传每个分片到服务器。每次上传时，你可以通过FormData添加分片数据，并且可能需要附加额外的参数，比如partseq来标识分片的顺序。
5、监听上传进度和处理响应: 对每个分片的上传请求，监听上传进度，并处理服务器的响应。
6、完成上传: 当所有分片都上传完成后，可能需要发送一个请求告诉服务器所有分片都已经上传完毕，服务器可以开始合并文件。
请注意，这只是一个基本的示例步骤，实际的实现可能需要额外处理错误情况、重试逻辑、取消上传等功能。同时，服务器端也需要相应的逻辑来接收分片，并在所有分片上传完成后合并成一个文件。

##### 一刻相册 上传文件
1、你帮我写一个在uniapp项目中上传文件分片的完整示例，注意是uniapp vue2项目，
上传需要设置Cookie、Host、Origin、Referer这些参数，然而uni.uploadFile不支持header 中不能设置 Referer，
所以需要用其他的如axios模块实现
2、还需要获取文件md5值与分片md5


# 问
https://xafj-cm10.pcs.baidu.com/rest/2.0/pcs/superfile2?method=upload&app_id=16051585&channel=chunlei&clienttype=70&web=1&logid=MTcxMTQ0ODc0MjI3NjAuMjIyMTQwODgyMTYxMzcwODU=&path=%2F%E4%B8%AD%E5%9B%BD%E8%83%96%E5%AD%903xHamster.mp4&uploadid=P1-MTAuOTIuODEuMTQyOjE3MTE0NDg3MTI6ODkwNjcxOTUxNzE2NTIyODU4Mw==&partseq=39。
这段url参数logid中的值是随机计算的，uploadid也是随机计算的，然后你帮我按照他们的格式去写一个生成logid、uploadid的代码

现在按照url参数uploadid的值的规则来帮我写一个生成代码
P1-MTAuOTIuMTcwLjc2OjE3MTE0NTAyNjU6ODkwNzEzNjUyMDQyNDg3OTU3NQ==


生成的规则不一致啊
这是你代码生成的
P1-MzkuMTQ0LjU5LjE2NQ==:MTcxMTQ2MTk1Nw==:MTU2MTg3MzU1NzE0NjE0NQ==
这是URL中原始的格式
P1-MTAuOTIuMTcwLjc2OjE3MTE0NTAyNjU6ODkwNzEzNjUyMDQyNDg3OTU3NQ==




这个是媒体信息的值
QD1xoOXfdIsFhcUevCpY1X6ZR5QfdOiM0CvFYzjyX1Q/C4GsbyyS1VN7Oti/2YJSFS3qu8y64mHkP+nngDNnMXqqcq8CSbSLyLk3a6a5
你可以参考form-data值
media_info = QD1xoOXfdIsFhcUevCpY1X6ZR5QfdOiM0CvFYzjyX1Q/C4GsbyyS1VN7Oti/2YJSFS3qu8y64mHkP+nngDNnMXqqcq8CSbSLyLk3a6a5
然后你帮我写一个media_info值的生成计算



```javascript
try {
	const response = await axios.post(apiURL, formData, {
		headers: {
			'Content-Type': 'multipart/form-data; boundary=---011000010111000001101001',
			Cookie: Cookie, // 设置需要的cookie
			Host: 'xafj-cm10.pcs.baidu.com',
			Origin: 'https://photo.baidu.com',
			Referer: 'https://photo.baidu.com/photo/web/fastupload'
			// 其他header可以在这里设置，除了Referer
		},
		// 如果需要携带cookie，请确保设置了withCredentials
		withCredentials: true,
	});
```
上面的代码在浏览器中请求失效了，变成了如下
Content-Type:
multipart/form-data; boundary=----WebKitFormBoundaryldAOMuyVBEbCLlak
Host:
xafj-cm10.pcs.baidu.com
Referer:
http://localhost:8080/

我的Cookie、Origin没了，然后Referer变成了本地，有办法让他走代码里面设置的吗
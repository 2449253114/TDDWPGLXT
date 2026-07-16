ubearcn目录下的文件，专门用于采集[熊熊漫画备份[20200508]](http://gw-hope.blogspot.com/2020/05/20200508.html)的漫画详情页数据，如[肉体劳动者](http://www.ubearcn.com/bc/20200508w/)
- 所以这个目录下的采集网站.vue是写死的，因为他的渲染方式不一样，需要从script代码中抓取信息和循环拼接数据。




# 明天开始写上传：C:\Users\24492\Downloads\图片助手(ImageAssistant)_批量图片下载器\www.ubearcn.com
所有的图片到后台漫画数据库中，问ai node.js环境的有什么插件可以读取本地计算机的目录并且遍历目录的图片数量。

C:\Users\24492\Downloads\图片助手(ImageAssistant)_批量图片下载器\www.ubearcn.com  这个目录里的所有目录可以读取到吗？并且遍历www.ubearcn.com目录下的所有子目录里的图片数量

我的意思是“www.ubearcn.com”是起始目录（可以理解为父目录），然后www.ubearcn.com目录中有很多子目录，需要遍历所有子目录，并且把所有子目录里的图片数量获取到，
并且生成这种数组格式：[
	{
		"dir": "子目录名字",
		"img_count": 10// 子目录名字里的图片总数量
	}
]

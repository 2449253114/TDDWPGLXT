<template>
	<view>
		<button type="primary" @click="getTelegra">测试</button>
		
		
		<text>{{ txt }}</text>
		
	</view>
</template>

<script>
	// 必须使用1.0.0-rc.5版本，高于这个版本hx不支持
	import cheerio from 'cheerio';
	export default {
		data() {
			return {
				txt: '此页面只需要读取上页传递的采集链接（一行一个URL）或者是传递任务id，任务id数据库表中有记录的要采集的链接urls，然后过滤掉已采集的链接，再开始采集并上传阅读文，当全部链接urls采集和上传阅读文完毕后，将此任务id数据库表状态设为已完成',
				// 任务表拥有的字段：urls[包含已采集和上传阅读文完成的链接状态]、任务状态、任务数量（urls.length）、任务名称
			}
		},
		onLoad: function(e) {

		},
		onReady() {
			const $ = cheerio.load('<h2 class="title">Hello world</h2>');
			//console.log($)
			const title = $('h2.title').text(); // "Hello world"
			console.log(title)
		},
		methods: {
			getTelegra() {
				uni.request({
					url: 'https://telegra.ph/%E8%82%89%E6%AC%B2%E5%90%8C%E5%AD%A6%E4%BC%9A-01-02',
					method: 'GET',
					dataType: 'text',
					success: (res) => {
						console.log(res)
						const html = res.data
						//console.log(html)
						const $ = cheerio.load(html);

						/* 
						// ***【1】采集漫画标题
						// 要选择具有特定属性值的元素：
						const title = $('h1')[0].children[0].data
						// 获取第一个 h1 标签的文本内容
						const firstH1Text = $('h1:first').text();
						// 这两种都可以		
						console.log(title, firstH1Text)


						// ***【2】采集创建者信息
						// 获取 <a> 标签的链接和文本内容
						const link = $('address a[rel="author"]').attr('href');
						const nickname = $('address a[rel="author"]').text();
						console.log('Link:', link); // 输出链接
						console.log('Title:', nickname); // 输出文本内容
						// 总页
						const totali = $('aside')[0].children[0].data
						console.log(totali)

						// 选择 <img> 标签并提取 src 属性和 <figcaption> 中的页数信息
						const images = $('article img').map((index, element) => {
							const src = $(element).attr('src');
							const caption = $(element).next('figcaption').text().trim();
							const pageNumberMatch = caption.match(/第(\d+)页/);
							const pageNumber = pageNumberMatch ? pageNumberMatch[1] : null;

							return {
								src: `https://telegra.ph/${src}`,
								pageNumber,
							};
						}).get();

						console.log(images);
						 */
						
						
						// 提取信息
						const source_url = $('address a[rel="author"]').attr('href');// 来源群组
						const title = $('main h1:first').text();// 标题
						const creator_user = {
							user_id: "0",
						    nickname: $('address a[rel="author"]').text(),// 创建者的昵称
						};
						const your_story = [];// 包含故事内容的数组
						
						$('article figure').each((index, element) => {
						    const imgSrc = $(element).find('img').attr('src');
						    const pageNumber = $(element).find('figcaption').text().trim().match(/第(\d+)页/)[1];
							console.log('imgSrc', imgSrc)
							const newImgSrc = `https://telegra.ph${imgSrc}`
						    const story = {
						        description: `第${pageNumber}页`,
						        thumburl: [newImgSrc, newImgSrc],
						    };
						
						    your_story.push(story);
						});
						
						// 输出结果
						console.log({
						    source_url,
						    title,
						    creator_user,
						    your_story,
						});
						
						
					}
				})
			}
		}
	}
</script>

<style>

</style>
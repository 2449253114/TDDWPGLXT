// 必须使用1.0.0-rc.5版本，高于这个版本hx不支持
import cheerio from 'cheerio';


// 通用采集函数
function collectData(html, currentPageUrl) {
	const $ = cheerio.load(html);

	const result = {};
	result.excerpt = ""
	
	// 采集 source_url、title、creator_user
	result.source_url = [];

	// 获取shareTitle
	const shareTitleScript = $('script:contains("var shareTitle")');
	const shareTitleMatch = shareTitleScript.html().match(/var shareTitle\s*=\s*'([^']+)'/);
	const shareTitle = shareTitleMatch ? shareTitleMatch[1] : null;

	// 获取pageNum
	const pageNumScript = $('script:contains("var pageNum")');
	const pageNumMatch = pageNumScript.html().match(/var pageNum\s*=\s*(\d+)/);
	const pageNum = pageNumMatch ? parseInt(pageNumMatch[1]) : null;

	// 获取图片目录
	const dirScript = $('script:contains("var dir")');
	const dirMatch = dirScript.html().match(/var dir\s*=\s*'([^']+)'/);
	const dir = dirMatch ? dirMatch[1] : null;
	
	result.title = shareTitle;
	result.creator_user = {
		user_id: "0",
		nickname: "ubearcn",
	};
	
	// 获取 your_story
	result.your_story = [];

	// 构造 your_story 数组
	for (let i = 1; i <= pageNum; i++) {
		// 构建当前图片的完整路径，如果是个位数则在前面添加一个零
		const imgSrc = `${currentPageUrl}/${dir}/${i < 10 ? '0' : ''}${encodeURIComponent(i)}.jpg`;

		// 构建描述信息
		const description = `第${i}页`;

		// 创建一个故事对象
		const story = {
			description, // 描述信息
			thumburl: ["https://xxx.com", `${imgSrc}`], // 缩略图 URL
		};

		// 将当前故事对象添加到 your_story 数组中
		result.your_story.push(story);
	}
	
	// 设置封面参数
	result.thumburl = result.your_story[0].thumburl
	
	// 输出结果
	console.log('result:', result);
	
	return result;
}



export {
	collectData
}
// 必须使用1.0.0-rc.5版本，高于这个版本hx不支持
import cheerio from 'cheerio';

// 通用采集函数
function collectData(html, config) {
	const $ = cheerio.load(html);

	const result = {};
	result.excerpt = ""
	
	// 采集 source_url、title、creator_user
	result.source_url = [];
	// 将元素推送到数组
	result.source_url.push(decodeURIComponent(evaluateHref(config.source_url, $)));
	console.log('result.source_url', result.source_url)
	result.title = evaluateText(config.title, $);
	result.creator_user = {
		user_id: "0",
		nickname: evaluateText(config.creator_user.nickname, $),
	};

	// 采集 your_story
	result.your_story = [];
	$(config.your_story.selector).each((index, element) => {
		const imgSrc = $(element).find(config.your_story.imgSelector).attr('src');
		const description = `第${index + 1}页`;

		const story = {
			description,
			thumburl: ["https://xxx.com", `${config.your_story.srcPrefix}${imgSrc}`],
		};

		result.your_story.push(story);
	});
	
	// 设置封面参数
	result.thumburl = result.your_story[0].thumburl
	
	return result;
}

// 辅助函数：根据选择器和 Cheerio 对象评估值
function evaluateSelector(selector, $, returnHref = false) {
	const element = $(selector);
	return returnHref ? element.attr('href') : element.text().trim();
}

// 返回文本内容的方法
function evaluateText(selector, $) {
	return evaluateSelector(selector, $, false);
}

// 返回 href 属性值的方法
function evaluateHref(selector, $) {
	return evaluateSelector(selector, $, true);
}



// 配置对象示例
const config1 = {
	source_url: 'address a[rel="author"]',
	title: 'main header.tl_article_header h1',
	creator_user: {
		nickname: 'address a[rel="author"]',
	},
	your_story: {
		selector: 'article figure',
		imgSelector: 'img',
		srcPrefix: 'https://telegra.ph', // src前缀网址
		description: 'figcaption',
	},
};

const config2 = {
	source_url: 'div.breadcrumb-box a.text-dark:eq(1)',
	title: 'div.header h1.title',
	creator_user: {
		nickname: 'div.breadcrumb-box li.breadcrumb-item:nth-child(2) a',
	},
	your_story: {
		selector: 'div.content#lightgallery a',
		imgSelector: 'img',
		srcPrefix: '', // src前缀网址
		description: null, // 不指定 description 规则
	},
};

export {
	collectData
}


// // 测试采集函数
// const html1 = /* HTML 代码1 */;
// const html2 = /* HTML 代码2 */;

// const result1 = collectData(html1, config1);
// const result2 = collectData(html2, config2);

// console.log(result1);
// console.log(result2);

/* 
 html1: `<main class="tl_article">
   <header class="tl_article_header" dir="auto">
 	<h1>肉欲同学会</h1>
 	<address>
 	  <a rel="author" href="https://t.me/MLSHHZ" target="_blank">马栏山汉化组</a><!--
    --><time datetime="2024-01-02T09:01:12+0000">January 02, 2024</time>
 	</address>
   </header>
   <article id="_tl_editor" class="tl_article_content ql-container ql-disabled">
 	<div class="ql-editor" contenteditable="false">
 	<h1 dir="auto" data-placeholder="Title" data-label="Title">肉欲同学会</h1>
 	<address dir="auto" data-placeholder="Your name" data-label="Author"><a href="https://t.me/MLSHHZ"
 			target="_blank">马栏山汉化组</a></address>
 	<aside dir="auto">共22页</aside>
 	<figure contenteditable="false">
 		<div class="figure_wrapper"><img src="file/6799639d5e915a5fab56a.jpg"></div><span
 			class="cursor_wrapper" contenteditable="true"></span>
 		<figcaption dir="auto" class="editable_text" data-placeholder="Caption (optional)">第1页</figcaption>
 	</figure>
 	<figure contenteditable="false">
 		<div class="figure_wrapper"><img src="file/50838c7481a999d4b9f5a.jpg"></div><span
 			class="cursor_wrapper" contenteditable="true"></span>
 		<figcaption dir="auto" class="editable_text" data-placeholder="Caption (optional)">第22页</figcaption>
 	</figure>
 	<p dir="auto"><br></p>
 </div>
   </article>
 </main>`,
 				html2: `<div class="article">
   <div class="breadcrumb-box">
     <ol class="breadcrumb">
       <li class="breadcrumb-item">
         <a class="text-dark" href="http://darknight.party/comic">首页</a></li>
       <li class="breadcrumb-item">
         <a class="text-dark" href="http://darknight.party/comic/index.php/category/%e7%94%b0%e9%be%9c%e6%ba%90%e4%ba%94%e9%83%8e/">田龜源五郎</a></li>
       <li class="breadcrumb-item active" aria-current="page">正文</li></ol>
   </div>
   <div class="header">
     <h1 class="title">外道之家 （上）</h1>
     <div class="meta">
       <span>2023-02-11</span>
       <span>12153点热度</span>
       <span>6人点赞</span></div>
   </div>
   <div class="content" id="lightgallery" lg-uid="lg0">
     <p>
       <a href="http://darknight.party/comic/wp-content/uploads/2023/02/1-3.jpg">
         <img decoding="async" class="alignnone size-full wp-image-14564" src="http://darknight.party/comic/wp-content/uploads/2023/02/1-3.jpg" alt="" width="1662" height="2000"></a>
 	  <a href="http://darknight.party/comic/wp-content/uploads/2023/02/99-2.jpg">
         <img decoding="async" loading="lazy" class="alignnone size-full wp-image-14662" src="http://darknight.party/comic/wp-content/uploads/2023/02/99-2.jpg" alt="" width="1375" height="2000"></a>
     </p>
     <p>
       <a href="http://darknight.party/comic/wp-content/uploads/2023/02/199-3.jpg">
         <img decoding="async" loading="lazy" class="alignnone size-full wp-image-14762" src="http://darknight.party/comic/wp-content/uploads/2023/02/199-3.jpg" alt="" width="1375" height="2000"></a>
     </p>
     <p>
       <a href="http://darknight.party/comic/wp-content/uploads/2023/02/200-2.jpg">
         <img decoding="async" loading="lazy" class="alignnone size-full wp-image-14763" src="http://darknight.party/comic/wp-content/uploads/2023/02/200-2.jpg" alt="" width="1375" height="2000"></a>
       <a href="http://darknight.party/comic/wp-content/uploads/2023/02/265-1.jpg">
         <img decoding="async" loading="lazy" class="alignnone size-full wp-image-14828" src="http://darknight.party/comic/wp-content/uploads/2023/02/265-1.jpg" alt="" width="1375" height="2000"></a>
     </p>
   </div>
 </div>`
 */
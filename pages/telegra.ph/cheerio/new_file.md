现在我将完整的html文档给你，然后告诉你我需要采集的地方，你帮我写完整。
@[1]：这是html文档部分
<main class="tl_article">
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
		<div class="figure_wrapper"><img src="https://telegra.ph/file/6799639d5e915a5fab56a.jpg"></div><span
			class="cursor_wrapper" contenteditable="true"></span>
		<figcaption dir="auto" class="editable_text" data-placeholder="Caption (optional)">第1页</figcaption>
	</figure>
	<!-- ...此处省略n个figure -->
	<figure contenteditable="false">
		<div class="figure_wrapper"><img src="https://telegra.ph/file/50838c7481a999d4b9f5a.jpg"></div><span
			class="cursor_wrapper" contenteditable="true"></span>
		<figcaption dir="auto" class="editable_text" data-placeholder="Caption (optional)">第22页</figcaption>
	</figure>
	<p dir="auto"><br></p>
</div>
  </article>
</main>
@[2]这些需要采集的部分说明
source_url = a的href="https://t.me/MLSHHZ"
title = 肉欲同学会
creator_user.nickname = 马栏山汉化组
your_story = 遍历figure（也就是我上一次说的“我需要把article里的每个img的src取出来，并且还要figcaption里的第x页”）
your_story[i].description = 第n页
your_story[i].thumburl = ["https://xxx.com", img的src]

@[3]你给我的下面代码很有效
const cheerio = require('cheerio');

const html = `<main class="tl_article">
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
		<div class="figure_wrapper"><img src="https://telegra.ph/file/6799639d5e915a5fab56a.jpg"></div><span
			class="cursor_wrapper" contenteditable="true"></span>
		<figcaption dir="auto" class="editable_text" data-placeholder="Caption (optional)">第1页</figcaption>
	</figure>
	<figure contenteditable="false">
		<div class="figure_wrapper"><img src="https://telegra.ph/file/50838c7481a999d4b9f5a.jpg"></div><span
			class="cursor_wrapper" contenteditable="true"></span>
		<figcaption dir="auto" class="editable_text" data-placeholder="Caption (optional)">第22页</figcaption>
	</figure>
	<p dir="auto"><br></p>
</div>
  </article>
</main>`;

// 使用 Cheerio 加载 HTML
const $ = cheerio.load(html);

// 提取信息
const source_url = $('address a[rel="author"]').attr('href');
const title = $('main h1').text();
const creator_user = {
    nickname: $('address a[rel="author"]').text(),
};
const your_story = [];

$('article figure').each((index, element) => {
    const imgSrc = $(element).find('img').attr('src');
    const pageNumber = $(element).find('figcaption').text().trim().match(/第(\d+)页/)[1];

    const story = {
        description: `第${pageNumber}页`,
        thumburl: ["https://xxx.com", imgSrc],
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

@[4]现在有个新的网站我也需要采集，但其实采集的内容也是一样的，只是网站代码不一样了，你可以看下html文档部分
<div class="article">
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
      <!-- 此处省略n个"a>img"-->
	  <a href="http://darknight.party/comic/wp-content/uploads/2023/02/99-2.jpg">
        <img decoding="async" loading="lazy" class="alignnone size-full wp-image-14662" src="http://darknight.party/comic/wp-content/uploads/2023/02/99-2.jpg" alt="" width="1375" height="2000"></a>
    </p>
	<!-- 此处省略n个p -->
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
</div>
这部分的代码我需要采集的部分说明
source_url = a的href="http://darknight.party/comic/index.php/category/%e7%94%b0%e9%be%9c%e6%ba%90%e4%ba%94%e9%83%8e/"
title = 外道之家 （上）
creator_user.nickname = 田龜源五郎
your_story = 遍历div.content#lightgallery里的每个img的src取出来，并且还要第x页（第x页不指定则用索引代替））
your_story[i].description = 第n页
your_story[i].thumburl = ["https://xxx.com", img的src]

@[5]我现在的需求变了，因为每个网站的代码采集规则不一样（比如@[1]和@[4]这两个网站html代码就不同），所以我要如何做成一个通用的采集代码？我希望可以自己指定如下
source_url = 自己指定采集规则或者直接写代码，如$('address a[rel="author"]').attr('href')
title = 自己指定采集规则或者直接写代码
creator_user.nickname = 自己指定采集规则或者直接写代码
your_story = 遍历也是自己指定采集规则
your_story[i].description = 索引代替或者指定采集规则
your_story[i].thumburl = ["https://xxx.com", img的src或者指定采集规则]



为我下面的字段规则生成一个schema数据库表（uniCloud云数据库表），
字段有：要采集的地址（一行一个URL）、配置规则见下面config1，
这个表主要用于采集任务设计，数据库表名你帮我起名
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
		srcPrefix: 'https://telegra.ph/',// src前缀网址
        description: 'figcaption',
    }
};














```json
{
    "_id": "app_config_default", // 数据库记录的唯一标识符
    "vip_days_on_signup": 7, // 注册会员赠送VIP天数，默认为7天
    "daily_login_reward": 1, // 每日登录奖励，用户每天登录App获得的金币奖励，默认为1金币
    "weekly_login_vip_reward": { // 周登录VIP奖励配置
        "login_day": 1, // 登录日，以数字表示周几，这里默认为周一
        "reward_vip_days": 1, // 奖励VIP天数，用户在指定日登录后获得的额外VIP体验天数，默认为1天
        "enabled": true // 是否启用该奖励配置，默认为启用
    },
    "invite_reward": { // 邀请奖励配置
        "reward_type": 1, // 奖励类型，默认为1，代表VIP天数
        "reward_amount": 3 // 每次邀请的奖励数量，默认为3
    },
    "share_reward": { // 分享奖励配置
        "enabled": true, // 是否开启分享奖励，默认为开启
        "reward_type": 1, // 分享奖励的类型，默认为1，代表VIP天数
        "reward_amount": 1 // 分享后获得的奖励数量，默认为1
    },
    "new_user_guide_display": true, // 是否向新用户展示引导页，默认为展示
    "customer_service_contact": "contact@example.com", // App内客服的联系方式，默认值
    "maintenance_mode_enabled": false // App是否处于维护模式，默认为不处于维护模式
}
```

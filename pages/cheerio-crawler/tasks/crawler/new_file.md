@[1] config: {
	nickname_selector: "",
	source_url_selector: "",
	task_title: "",
	title_selector:  "",
	urls:  "",
	your_story_description_selector:  "",
	your_story_img_selector:  "",
	your_story_selector: "", 
	your_story_src_prefix:  "",
	_id:  ""
}
@[2] config: { // 采集规则配置
	_id: "",// 由上个页面传递过来
	urls: "", // 要采集的链接，一行一个URL，采集开始前会取出所有URL链接到urlsList数组中
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
}
我需要将@[1]的json字段格式转换成@[2]的json字段格式，你帮我写这个功能代码





###################################
以下是将该功能封装为方法的代码，包含方法注释和说明：

```javascript
/**
 * 过滤已存在于云端的项目
 * @param {Array} urlsList - 待过滤的项目数组
 * @param {Array} cloudData - 云端已存在的数据数组
 * @param {Function} urlDecode - URL解码函数
 * @returns {Object} - 包含新的urlsList数组和过滤了多少个项目的信息
 */
function filterExistingItems(urlsList, cloudData, urlDecode) {
    const originalLength = urlsList.length; // 原始数组长度

    const filteredUrlsList = urlsList.filter(item => {
        // 检查云端数据中是否存在当前项目（URL）
        const isItemInCloud = cloudData.some(cloudItem => urlDecode(cloudItem.url) === urlDecode(item.url));

        // 如果存在于云端，返回false，即不包含在新的urlsList中
        return !isItemInCloud;
    });

    const filteredCount = originalLength - filteredUrlsList.length;

    return {
        filteredUrlsList,
        filteredCount
    };
}

// 示例调用
const { filteredUrlsList, filteredCount } = filterExistingItems(this.task.urlsList, data, urlDecode);

// 打印过滤了多少个项目的信息
console.log(`过滤了 ${filteredCount} 个项目`);
// 更新this.task.urlsList为过滤后的数组
this.task.urlsList = filteredUrlsList;
```

在这个示例中，`filterExistingItems` 方法接受三个参数：`urlsList` 是待过滤的项目数组，`cloudData` 是云端已存在的数据数组，`urlDecode` 是URL解码函数。该方法返回一个对象，包含了过滤后的 `urlsList` 数组以及过滤了多少个项目的信息。在示例调用中，你可以根据需要更新 `this.task.urlsList` 和使用过滤了多少个项目的信息。




#######################################################
@[1] param: {
    "excerpt": "",
    "source_url": "https://t.me/MLSHHZ",
    "title": "铁道员的浪漫 第二回——与站长在一起的夜",
    "creator_user": {
        "user_id": "0",
        "nickname": "马栏山汉化组"
    },
    "your_story": [
        {
            "description": "第1页",
            "thumburl": [
                "https://xxx.com",
                "https://telegra.ph/file/d7209b097bd83afad802b.jpg"
            ]
        },
		// ...此处省略n个
        {
            "description": "第24页",
            "thumburl": [
                "https://xxx.com",
                "https://telegra.ph/file/bd0a27593d794b61de9f4.jpg"
            ]
        }
    ],
    "thumburl": [
        "https://xxx.com",
        "https://telegra.ph/file/d7209b097bd83afad802b.jpg"
    ],
    "url": "https://telegra.ph/铁道员的浪漫-第二回--与站长在一起的夜-09-19"
}
@[2] param: {
	fileList: [
		{
			url: "",// 上传之后才记录云存储的地址
			name: param.creator_user.nickname《param.title.将空格换成"_"》+i+param.your_story[i]thumburl[1]只要后缀即扩展名.jpg,
			path: param.your_story[i]thumburl[1]
		}
	]
}
我需要将@[1]的json字段格式转换成@[2]的json字段格式，你帮我写这个功能代码

/**
 * 将@[1]的JSON字段格式转换成@[2]的JSON字段格式
 * @param {Object} param - @[1]的参数对象
 * @returns {Object} - @[2]的参数对象
 */
function convertToUploadParam(param) {
    // 使用map方法遍历your_story数组，生成fileList数组
    const fileList = param.your_story.map((story, index) => {
        // 生成文件名，包含了作者昵称、标题、索引和扩展名
        const fileName = `${param.creator_user.nickname}_${param.title.replace(/ /g, "_")}_${index + 1}_${story.thumburl[1].split('/').pop()}`;

        return {
            url: '',  // 上传之后才记录云存储的地址
            name: fileName,
            path: story.thumburl[1]
        };
    });

    return {
        fileList
    };
}

// 示例调用
const param1 = {
    // ...省略部分字段
};

const param2 = convertToUploadParam(param1);

console.log(param2);
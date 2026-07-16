// 将item.urls处理为数组（urls里面包含多个url,一个一行）
function toUrlsList(urls) {
    // 将字符串分割为行，并移除前导/尾随空格
    const urlArray = urls.split('\n').map(url => urlDecode(url.trim())).filter(Boolean);
    return urlArray;
}
/* 
// 测试方法，传递item.urls并返回URL数组
const itemUrls = "https://telegra.ph/%E8%82%89%E6%AC%B2%E5%90%8C%E5%AD%A6%E4%BC%9A-01-02 https://telegra.ph/%E9%93%81%E9%81%93%E5%91%98%E7%9A%84%E6%B5%AA%E6%BC%AB-%E7%AC%AC%E4%BA%8C%E5%9B%9E--%E4%B8%8E%E7%AB%99%E9%95%BF%E5%9C%A8%E4%B8%80%E8%B5%B7%E7%9A%84%E5%A4%9C-09-19 https://telegra.ph/%E5%BD%93%E4%BC%99%E4%BC%B4%E6%98%AF%E5%BC%BA%E5%A3%AE%E5%85%BD%E4%BA%BA%E6%88%98%E5%A3%AB%E4%B9%8B%E5%90%8E%E5%92%8C%E4%BB%96%E8%B6%85%E8%B6%8A%E5%8F%8B%E8%B0%8A%E7%9A%84%E6%95%85%E4%BA%8B-02-28 https://telegra.ph/%E8%80%81%E5%85%AD%E7%9A%84%E6%95%85%E4%BA%8B-%E7%AC%AC%E5%85%AB%E7%AB%A0%E5%90%8E%E7%AF%87-02-27 https://telegra.ph/%E8%80%81%E5%85%AD%E7%9A%84%E6%95%85%E4%BA%8B-%E7%AC%AC%E4%B8%80%E8%AF%9D-02-08 https://telegra.ph/%E5%92%8C%E5%96%9D%E9%86%89%E4%BA%86%E7%9A%84%E7%AC%A8%E8%9B%8B%E8%80%81%E7%88%B8%E4%BB%A5%E6%80%A7%E6%95%99%E8%82%B2%E4%B8%BA%E7%94%B1%E5%81%9A%E7%88%B1%E4%BA%86-01-29 https://telegra.ph/%E7%AC%A8%E8%9B%8B%E8%80%81%E7%88%B9%E5%96%9D%E9%86%89%E4%BA%86%E7%AB%9F%E7%84%B6%E6%83%B3%E6%95%99%E6%88%91%E6%92%B8-%E5%90%8E%E7%AF%87-11-11";
const result = urlsList(itemUrls);
result;
 */

function addCustomInfoToUrls(urls) {
	const urlsList = [];
	urls.forEach(url => {
		// 创建自定义字段
		const customInfo = {
			state: {
				collect: 'waiting',
				sync: 'waiting'
			}
		};

		// 创建包含url和customInfo的对象
		const urlObject = {
			url: url,
			custom_info: customInfo
		};

		// 将对象添加到urlsList数组中
		urlsList.push(urlObject);
	});

	return urlsList;
}

/**
 * 过滤已存在于云端的项目
 * @param {Array} urlsList - 待过滤的项目数组
 * @param {Array} cloudData - 云端已存在的数据数组
 * @returns {Object} - 包含新的urlsList数组和过滤了多少个项目的信息
 */
function filterExistingItems(urlsList, cloudData) {
    const originalLength = urlsList.length; // 原始数组长度

    const filteredUrlsList = urlsList.filter(item => {
        // 检查云端数据中是否存在当前项目（URL）
        const isItemInCloud = cloudData.some(cloudItem => urlDecode(cloudItem.url) === urlDecode(item.url));

        // 如果存在于云端，返回false，即不包含在新的urlsList中
        return !isItemInCloud;
    });

    const filteredCount = originalLength - filteredUrlsList.length;

    return {
        filteredUrlsList,// 过滤后的数组
        filteredCount // 过滤项目数量
    };
}
/* 
 // 示例调用
 const { filteredUrlsList, filteredCount } = filterExistingItems(this.task.urlsList, data);
 
 // 打印过滤了多少个项目的信息
 console.log(`过滤了 ${filteredCount} 个项目`);
 // 更新this.task.urlsList为过滤后的数组
 this.task.urlsList = filteredUrlsList;
 */


// 转换为config配置参数格式
function convertConfig(config) {
    const convertedConfig = {
        _id: config._id,
        urls: config.urls,
        source_url: config.source_url_selector,
        title: config.title_selector,
        creator_user: {
			user_id: "0",
            nickname: config.nickname_selector,
        },
        your_story: {
            selector: config.your_story_selector,
            imgSelector: config.your_story_img_selector,
            srcPrefix: config.your_story_src_prefix,
            description: config.your_story_description_selector,
        }
    };

    return convertedConfig;
}

/**
 * 转换为上传参数格式
 * 将@[1]的JSON字段格式转换成@[2]的JSON字段格式
 * @param {Object} param - @[1]的参数对象
 * @returns {Object} - @[2]的参数对象
 */
function convertToUploadParam(param) {
    // 使用map方法遍历your_story数组，生成fileList数组
    const fileList = param.your_story.map((story, index) => {
        // 生成文件名，包含了作者昵称、标题、索引和扩展名
        const fileName = `${param.creator_user.nickname}_《${param.title.replace(/ /g, "_")}》_第${index + 1}页_${story.thumburl[1].split('/').pop()}`;

        return {
            url: '',  // 上传之后才记录云存储的地址
            name: fileName,
            path: story.thumburl[1]
        };
    });

    return fileList
}



// 封装延时等待的函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 封装取消定时器的函数
function clearTimeoutAndSetTimeout(clearId, ms, callback) {
    clearTimeout(clearId);
    return setTimeout(callback, ms);
}

// URL编码
function urlEncode(str) {
    return encodeURIComponent(str);
}

// URL解码
function urlDecode(str) {
    return decodeURIComponent(str);
}

/* // 示例
const originalString = "Hello, World!";
const encodedString = urlEncode(originalString);
const decodedString = urlDecode(encodedString);
 */

export {
	toUrlsList,
	addCustomInfoToUrls,
	convertConfig,
	convertToUploadParam,
	delay,
	clearTimeoutAndSetTimeout,
	urlEncode,
	urlDecode,
	filterExistingItems
}
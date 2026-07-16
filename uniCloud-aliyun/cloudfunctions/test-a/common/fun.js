const {
	appConfigCollection
} = require('./constants')

/**
 * 检查用户是否已购买指定的相册或文件
 * @param {Collection} userPurchasesCollection - uniCloud数据库中的用户购买记录集合
 * @param {String} user_id - 用户ID
 * @param {String} album_id - 相册ID，如果检查的是相册
 * @param {String} file_id - 文件ID，如果检查的是文件
 * @returns {Promise<Boolean>} 如果用户已购买则返回true，否则返回false
 */
async function checkIfPurchased(
	userPurchasesCollection,
	user_id, 
	album_id, 
	file_id
) {
  const query = {
    user_id,
  };
  
  if (album_id) {
    query.album_id = album_id;
  } else if (file_id) {
    query.file_id = file_id;
  }

  const result = await userPurchasesCollection.where(query).get();
  return result.data.length > 0; // 如果有记录，则表示已购买
}

/* 
 // 使用示例
 const hasPurchased = await checkIfPurchased(user_id, album_id, file_id);
 if (hasPurchased) {
   // 已购买，可以直接访问相册或文件
 } else {
   // 未购买，执行购买流程
 }
 */


// 定义一个函数来随机选择avatarurl
function selectRandomAvatarUrl(personInfo, defaultUrl) {
	if (personInfo && personInfo.avatarurl && personInfo.avatarurl.length > 0) {
		// 如果存在avatarurl数组，随机选择一个索引
		const randomIndex = Math.floor(Math.random() * personInfo.avatarurl.length);
		// 返回随机选取的avatarurl的thumb属性
		return personInfo.avatarurl[randomIndex].thumb;
	} else {
		// 如果没有avatarurl数组，返回默认的url
		return defaultUrl;
	}
}

/**
 * 在给定的时间范围内生成随机的时间戳 《获取范围内的随机时间戳》
 * @param {String} startTime  起始时间，格式 "YYYY-MM-DD HH:MM:SS"
 * @param {String} endTime    结束时间，格式 "YYYY-MM-DD HH:MM:SS"
 * @returns {Number}          随机时间戳（毫秒）
 */
function getRandomTimestampInRange(startTime, endTime) {
    // 如果未提供startTime，使用默认的 "2024-05-09 06:01:10"
    if (!startTime) {
        startTime = "2024-05-09 06:01:10";
    }
    // 如果未提供endTime，使用当前时间
    if (!endTime) {
        endTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.floor(Math.random() * (end - start + 1)) + start;
}


/**
 * 处理封面信息，包括提取封面图片和构建person_info对象。
 * 原封面信息字段（cover_info）将被删除。
 *
 * @param {Object} item 数据项，包含封面信息和个人信息字段
 * @returns {Object} 处理后的数据项，包含更新的封面图片和个人信息
 */
function processCoverInformation(item) {

	// 假设custom_title字段存在，修改title字段值
	if (item.custom_title) {
	    item.title = item.custom_title; // 返回APP相册名称
	}
	
    // 假设cover_info和person_info字段存在
    if (item.cover_info && item.cover_info.thumburl) {
		//item.thumburl = item.cover_info.thumburl[1]; // 返回封面信息中的第二张图片（阿里云OSS）
        item.thumburl = item.cover_info.thumburl[0]; // 返回封面信息中的第一张图片（一刻相册的封面URL，此时的URL是定时任务获取的，不必担心失效）
    }

    if (item.person_info) {
        // 构建新的person_info对象，包含avatarurl、description和link字段
        item.person_info = {
            avatarurl: selectRandomAvatarUrl(item.person_info, item.thumburl),
            name: item.person_info.name ? item.person_info.name : (item.title || ""),
            description: item.person_info.description ? item.person_info.description : "",
            link: item.person_info.link ? item.person_info.link.split('\n') : [] // 如果link是以换行符分割的字符串，则转换为数组
        };
    } else {
        // 如果person_info不存在，创建默认的person_info
        item.person_info = {
            avatarurl: item.thumburl || "",
            name: item.title || "",
            description: "",
            link: []
        };
    }
	
    delete item.cover_info; // 删除原始的cover_info字段
    return item;
}



/**
 * 处理相册列表的置顶逻辑。
 * 
 * 此函数首先筛选出所有处于置顶有效期内的相册，并根据相册的总数量进行倒序排序。
 * 然后将这些置顶相册放到所有普通相册的前面，普通相册保持原有顺序。
 * 如果相册没有`top_days`字段或者置顶已过期，视为普通相册。
 * 
 * @param {Array} albums 原始的相册列表数组，每个元素为一个相册对象。
 * @param {Date} currentTime 当前时间的Date对象，用于计算置顶有效期。
 * @returns {Array} 处理置顶逻辑后的新相册列表数组。
 */
function processTopAlbums(albums, currentTime) {
    let topAlbums = [];
    let normalAlbums = [];

    // 遍历原始相册列表，分类置顶相册和普通相册
    albums.forEach(item => {
        // 如果top_days字段存在，计算置顶有效期
        if (item.top_days) {
            // 置顶过期时间
            let topExpireTime = new Date(item.create_time * 1000);// 将秒转换为毫秒
            topExpireTime.setDate(topExpireTime.getDate() + item.top_days);

            // 判断是否处于置顶有效期内
            if (topExpireTime > currentTime) {
                item.title += '\n新片30天置顶'; // 名称后加置顶标识
                topAlbums.push(item); // 加入置顶相册数组
            } else {
                normalAlbums.push(item); // 加入普通相册数组
            }
        } else {
            normalAlbums.push(item); // 无top_days字段，加入普通相册数组
        }
    });

    // 对置顶相册按总数量倒序排序
    topAlbums.sort((a, b) => b.total_count - a.total_count);

    // 将排序后的置顶相册放到普通相册的最前面，并返回合并后的新列表
    return topAlbums.concat(normalAlbums);
}

async function querySystemAppConfig() {
	const { data } = await appConfigCollection.get()
	//console.log('data[0]', data[0])
	return data[0]
}


/**
 * 调整给定项的高度，确保宽高比不超过最大值。
 * 如果原始高度大于基于宽度计算出的最大高度，则使用最大高度；否则保持原始高度不变。
 * @param {Object} item - 包含宽高信息的项对象。
 * @param {number} maxRatio - 允许的最大宽高比，默认为1.35。
 * @returns {Object} - 调整宽高比后的项对象。
 */
function adjustAspectRatio(item, maxRatio = 1.35) {
    // 检查extra_info是否存在以及height和width字段是否有效
    if (item.extra_info && item.extra_info.width && (item.extra_info.height || item.extra_info.height === "")) {
        let width = parseInt(item.extra_info.width, 10);
        let height = parseInt(item.extra_info.height, 10);

        // 如果宽度和高度都是有效的数字
        if (!isNaN(width) && width > 0) {
            let maxHeight = width * maxRatio; // 根据宽度计算出的最大高度
            // 如果原始高度大于计算出的最大高度，则使用最大高度
            if (!isNaN(height) && height > maxHeight) {
                item.extra_info.height = Math.round(maxHeight).toString();
            } else if (isNaN(height) || height <= 0) {
                // 如果原始高度无效或不大于零，则也使用最大高度
                item.extra_info.height = Math.round(maxHeight).toString();
            }
            // 如果原始高度是有效的且不大于最大高度，则保持不变
        }
    }

    return item; // 返回调整后的项对象
}




module.exports = {
	checkIfPurchased,
	selectRandomAvatarUrl,
	getRandomTimestampInRange,
	processCoverInformation,
	processTopAlbums,
	querySystemAppConfig,
	adjustAspectRatio
}
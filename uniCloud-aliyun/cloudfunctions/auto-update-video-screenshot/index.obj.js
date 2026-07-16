const {
	dbCmd,
	videoPuzzleAlbumId,
	videoPuzzleCollection,
	videoShotCursorCollection,
	accountCookieCollection
} = require('./common/constants')

const {
	photoConfig
} = require('./common/photo-config')

const {
	STATE_CODE,
	createResponse
} = require('./common/response')

async function processVideoScreenshots() {
  try {
    // 一. 查询cursor记录数
    const { total } = await videoShotCursorCollection.where({
      album_id: videoPuzzleAlbumId,
      has_more: 1 // 有更多
    }).count()

    console.log(`cursor记录数: ${total}`)
		
    // 二. 处理首次运行情况
    if (total === 0) {
      await videoShotCursorCollection.add({
        album_id: videoPuzzleAlbumId,
        cursor: "", // 光标，用于请求下一页
        cursor_page_num: 1, // 光标页面
        has_more: 1 // 还有更多
      })
    }
		
    // 三. 获取所有cursor记录
    const { data: videoShotCursors } = await videoShotCursorCollection
      .where({ album_id: videoPuzzleAlbumId })
      .limit(total)
      .get()
			
    // 四. 获取随机账号
    const { data: accountCookies } = await accountCookieCollection
      .aggregate()
      .match({
        cookie: dbCmd.neq(''), // 不等于""的CK账号
      })
      .sample({
        size: total
      })
      .end()

    // 构造请求队列
    const requestQueue = videoShotCursors.map((cursor, index) => {
      // 如果没有对应的账号cookie，跳过这个请求
      if (!accountCookies[index] || !accountCookies[index].cookie) {
        console.log(`警告: 第${index + 1}个cursor没有对应的可用cookie，跳过此请求`);
        return null;
      }
      
      return {
        cursor: cursor.cursor,
        pageNum: cursor.cursor_page_num,
        hasMore: cursor.has_more,
        cookie: accountCookies[index].cookie,
        username: accountCookies[index].user_name
      };
    }).filter(Boolean); // 过滤掉null值

    // 如果没有可用的请求，提前返回
    if (requestQueue.length === 0) {
      console.log('没有可用的账号cookie，无法执行请求');
      return;
    }

    // 五. 并发请求处理（优化后的版本）
    const tasks = requestQueue.map(item => () => processRequest(item));
    const { results, errors } = await concurrentTasks(tasks, 8); // 并发8个请求

    if (errors.length > 0) {
      console.error(`处理 ${results.length} 个请求过程中发生了 ${errors.length} 个错误`);
      console.error('错误详情:', errors);
    } else {
      console.log(`所有请求处理成功完成，共处理 ${results.length} 个请求`);
    }

  } catch (error) {
    console.error('处理失败:', error)
    throw error
  }
}

// 新增并发控制函数
async function concurrentTasks(tasks, limit) {
  let results = [];
  let errors = [];
  let batchNumber = 1;

  while (tasks.length > 0) {
    const batch = tasks.splice(0, limit);
    console.log(`正在处理第 ${batchNumber} 批并发请求，批量大小: ${batch.length}`);

    const running = batch.map(task => {
      return task().catch(error => {
        errors.push({
          error,
          task: task.toString()
        });
      });
    });

    await Promise.all(running);
    await new Promise(resolve => setTimeout(resolve, 200));
    batchNumber++;
    results.push(...running.map(promise => promise.result));
  }

  return { results, errors };
}

// 修改 processRequest 函数，添加返回值
async function processRequest({ cursor, pageNum, cookie }) {
	console.log(`处理第${pageNum}页请求，cursor: ${cursor}`)
  try {
    const { data: loadData } = await loadAlbumFiles(videoPuzzleAlbumId, cursor, cookie);
    
    // 判断是否还有更多
    if (loadData.has_more === 1) {
      const nextPageCursor = loadData.cursor // 下一页的cursor
      // 如果还有更多数据，判断是否需要更新has_more和添加下一页请求的cursor
      const { data: cursorData } = await videoShotCursorCollection.where({ cursor: nextPageCursor }).get()
      if (cursorData.length === 0) {
        // 如果当前没有cursor记录，则添加记录
        await videoShotCursorCollection.add({
          album_id: videoPuzzleAlbumId,
          cursor: nextPageCursor,
          cursor_page_num: pageNum + 1,// 用pageNum + 1 来确定此账号请求后的下一页的页码
          has_more: loadData.has_more
        })
      } else {
        if (cursorData[0].has_more !== loadData.has_more) {
          // 如果当前cursor记录的has_more与当前请求结果的has_more不同，则更新记录
          await videoShotCursorCollection.where({ cursor: nextPageCursor }).update({
            has_more: loadData.has_more
          })
        }
      }
    } else {
      // 无下页数据
    }
		
    if (loadData.list.length === 0 || loadData.errno !== 0) {
			console.log('loadData.list为空')
			return {
        success: true,
        pageNum,
        cursor
      };
    }

    // 批量将图片URL添加到videoPuzzleCollection（视频封面和拼图信息表）
    // 1. 从loadData.list中的path提取所有fsid并去重
    const fsids = [...new Set(loadData.list.map(item => {
      // 匹配 fsid_数字_ 后面跟着 cover 或 screenshot，之后可能有其他字符，最后以.jpg结尾
      const match = item.path.match(/fsid_(\d+)_(cover|screenshot)(?:_[^.]*)?\.jpg/);
      return match ? parseInt(match[1]) : null;
    }).filter(Boolean))];
    /**
      这个正则表达式的解释：
      fsid_(\d+)_ : 匹配 "fsid_" 后面的数字（fsid）
      (cover|screenshot) : 匹配 "cover" 或 "screenshot"
      (?:_[^.]*)? : 可选的匹配，以_开头的任意字符（除了.），问号表示这部分是可选的
      \.jpg : 以 .jpg 结尾
      这样就能匹配以下所有情况：
      fsid_675229137169485_screenshot.jpg
      fsid_675229137169485_cover.jpg
      fsid_675229137169485_screenshot_1731854798382_29.jpg
      fsid_675229137169485_screenshot_xxxxx.jpg
      fsid_675229137169485_cover_xxxxx.jpg
     */
    //console.log(`fsids`, fsids)

    // 2. 从videoPuzzleCollection中查询出所有的fsid是否有记录
    const { data: videoPuzzleData } = await videoPuzzleCollection.where({
      video_fsid: dbCmd.in(fsids)
    }).get()

    // 3. 将已存在记录的fsid存入Set中，方便快速查找
    const existingFsids = new Set(videoPuzzleData.map(item => item.video_fsid))

    // 4. 创建一个Map来存储每个fsid对应的图片URL
    const fsidUrlMap = new Map();

    // 遍历loadData.list，将每个fsid对应的cover和screenshot URL存储到Map中
    loadData.list.forEach(item => {
      const match = item.path.match(/fsid_(\d+)_(cover|screenshot)\.jpg/);
      if (match) {
        const [, fsid, type] = match;
        if (!fsidUrlMap.has(parseInt(fsid))) {
          fsidUrlMap.set(parseInt(fsid), {});
        }
        // 使用thumburl[1]作为高清图片URL
        fsidUrlMap.get(parseInt(fsid))[`${type}_url`] = item.thumburl[1];
      }
    });

    // 5. 分离需要更新和需要插入的数据
    const updateData = [];
    const insertData = [];

    fsidUrlMap.forEach((urls, fsid) => {
      // 只要有puzzle_url就创建记录，cover_url可选
      if (urls.screenshot_url) {
        const record = {
          video_fsid: fsid,
          puzzle_url: urls.screenshot_url
        };
        
        // 如果有cover_url，则添加到记录中
        if (urls.cover_url) {
          record.cover_url = urls.cover_url;
        }
        
        if (existingFsids.has(fsid)) {
          updateData.push(record);
        } else {
          insertData.push({...record, create_time: Date.now()});
        }
      }
    });

    //console.log(`updateData`, updateData)
    //console.log(`insertData`, insertData)

    // 5. 批量更新已存在的记录
    if (updateData.length > 0) {
      for (const item of updateData) {
        await videoPuzzleCollection.where({
          video_fsid: item.video_fsid
        }).update({
          cover_url: item.cover_url,
          puzzle_url: item.puzzle_url,
          update_time: Date.now()
        })
      }
      console.log(`已更新 ${updateData.length} 条记录`)
    }

    // 6. 批量插入新记录
    if (insertData.length > 0) {
      await videoPuzzleCollection.add(insertData)
      console.log(`已插入 ${insertData.length} 条新记录`)
    }

    return {
      success: true,
      pageNum,
      cursor
    };

  } catch (error) {
    console.error(`第${pageNum}页请求失败:`, error)
    throw error
  }
}

async function loadAlbumFiles(
	album_id = "",
	cursor = "",
  cookie = "",
) {

	// 一刻相册的请求头
	let headers = {
		"Cookie": cookie,
		"Host": "photo.baidu.com",
		"Origin": "https://photo.baidu.com",
		"Referer": `https://photo.baidu.com/photo/web/album/${album_id}`
	}

	// querys参数只能是Sting类型
	const clienttype = "70"; // 客户端类型 70为Web
	const bdstoken = `${photoConfig.bdstoken}`; // 
	// cursor变量已在函数参数中声明，无需再次声明
	//const cursor = cursor; // 光标，用于请求下一页。（比如请求第二页，需要把第一页返回data里的cursor值带上才可以请求第二页）
	const need_amount = "1"; // 默认
	const limit = "100"; // 默认
	const passwd = "";

	// 构建 form-data 字符串
	let formData = '';
	formData += `cursor=${encodeURIComponent(cursor)}&`;
	formData += `album_id=${encodeURIComponent(album_id)}&`;
	formData += `need_amount=${encodeURIComponent(need_amount)}&`;
	formData += `limit=${encodeURIComponent(limit)}`;
	formData += `&passwd=${encodeURIComponent(passwd)}`;

	const apiUrl = `https://photo.baidu.com/youai/album/v1/listfile?clienttype=${clienttype}&bdstoken=${bdstoken}`

	try {
		const res = await uniCloud.httpclient.request(apiUrl, {
			method: 'POST',
			headers: {
				"Content-Type": "application/x-www-form-urlencoded", // 此类型在['https://photo.baidu.com/youai/album/v1/listfile']接口，控制台中看Network > api接口 > Header > Request Headers 中查看
				...headers
			},
			timeout: 15000, // 超时时间，单位为毫秒
			content: formData,
			dataType: 'json' // 此处指定为json表示将此请求的返回值解析为json
		});

		//console.log('res', res)
		return createResponse(STATE_CODE.SUCCESS, "请求成功", res.data)

	} catch (error) {

		return createResponse(STATE_CODE.FAIL, "请求失败", error)
	}
}

module.exports = {
	_before: function () { // 通用预处理器
	
	},
	_timing: async function (param) {
	  console.log('触发时间：', param.Time)
		console.log('triggered by timing')
		
		await processVideoScreenshots()
		console.log('自动更新视频封面和视频截帧拼图URL的云函数，每1小时触发一次（每小时的23分触发，如08:23:00、09:23:00）')
		
		return { trigger_time: param.Time }
	},
  processVideoScreenshots
} 
# 自动更新电视剧剧集文件封面的任务




先给你看我的几处数据，之后需要你帮我实现需求
```json
// 电视剧剧集信息数据
[
    {
        "_id": "66671e76c3b5c965024c5038",
        "album_id": "3021756111842291636",
        "show_name": "《想再見你》",
        "episodes": [
            {
                "_id": "66671efc09664cbba087daa5",
                "episode_number": 1,
                "episode_name": "_想再見你EP1_網路劇_第一集_起床的那個漢堡蛋_美乃滋才是關鍵_BREAKFAST_会_Taiwan_LGBTQ_web_series_EP1",
                "video_fsid": 745971276044344,
                "cover_fsid": 961742312487028
            }
        ]
    }
]

// 一刻相册中的相册文件数据（因为图片是动态的，所以需要用“一刻相册中的相册文件数据”的thumburl定时更新“我自己的相册文件”的thumburl）
[
	{
	    "album_id": "3021756111842291636",
	    "fsid": 745971276044344,
		"category": 1,// 1视频
	    "thumburl": [
	        "https://pcsdata.baidu.com/thumbnail/3ffc2b337if32691c008ae30fc9e9303?fid=1815907562-16051585-745971276044344&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-cSwB3iZBxPxA4MnwrKYymmq7Ltw%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=299007291682689158&dp-callid=0&time=1718035200&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
	        "https://pcsdata.baidu.com/thumbnail/3ffc2b337if32691c008ae30fc9e9303?fid=1815907562-16051585-745971276044344&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-cSwB3iZBxPxA4MnwrKYymmq7Ltw%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=299007291682689158&dp-callid=0&time=1718035200&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
	    ]
	},
    {
        "album_id": "3021756111842291636",
        "fsid": 961742312487028,
		"category": 3,// 3图片
        "thumburl": [
            "https://pcsdata.baidu.com/thumbnail/8e1cde9d6ka87b91de7dc63559a2f9a5?fid=1815907562-16051585-138226811855149&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-%2B2SVuN1npSTDP%2B5XmLUpu%2FqM6HQ%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=299007291682689158&dp-callid=0&time=1718035200&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
            "https://pcsdata.baidu.com/thumbnail/8e1cde9d6ka87b91de7dc63559a2f9a5?fid=1815907562-16051585-138226811855149&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-%2B2SVuN1npSTDP%2B5XmLUpu%2FqM6HQ%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=299007291682689158&dp-callid=0&time=1718035200&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
        ]
    }
]

// 我自己的 相册文件 数据库表的数据结构
[
	{
		"_id": "66671efc09664cbba087daa5",
	    "album_id": "3021756111842291636",
	    "fsid": 745971276044344,
		"category": 1,// 1视频
	    "thumburl": [
	        "https://pcsdata.baidu.com/thumbnail/3ffc2b337if32691c008ae30fc9e9303?fid=1815907562-16051585-745971276044344&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-3A5QBEjDaS573olJxGJNDApC9ek%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=298194827779849405&dp-callid=0&time=1718031600&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
	        "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/uploads/photobaidu/covers/jPhoUjq5p8k29ccN1_title_745971276044344.jpg"
	    ]
	},
	{
		"_id": "66671efc09664cbba087daa5",
	    "album_id": "3021756111842291636",
	    "fsid": 961742312487028,
		"category": 3,// 3图片
	    "thumburl": [
	        "https://pcsdata.baidu.com/thumbnail/3ffc2b337if32691c008ae30fc9e9303?fid=1815907562-16051585-745971276044344&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-3A5QBEjDaS573olJxGJNDApC9ek%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=298194827779849405&dp-callid=0&time=1718031600&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
	        "https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/uploads/photobaidu/covers/jPhoUjq5p8k29ccN1_title_745971276044344.jpg"
	    ]
	}
]
```
然后我需要通过"电视剧剧集信息数据"来使用"一刻相册中的相册文件数据"去更新"我自己的 相册文件 数据"。
// （电视剧剧集信息数据）episodes中的video_fsid和cover_fsid都对应（一刻相册中的相册文件数据）fsid和（我自己的相册文件数据）fsid
// 我的逻辑是这样的，episodes代表电视剧剧集信息，如下
// cover_fsid代表这个视频封面文件的fsid，从（一刻相册中的相册文件数据）找到这个fsid项的thumburl，然后更新（我自己的相册文件数据）这个fisd项的thumburl
// video_fsid代表这个视频文件的fsid，从（一刻相册中的相册文件数据）找到这个（video_fsid的cover_fsid对应的fsid）项的thumburl，然后更新（我自己的相册文件数据）这个fisd项的thumburl（因为视频文件的封面需要用cover_fsid对应的fsid项的信息去更新thumburl）
// 这样吧，我在下面的数据中用注释表达
```json
"episodes": [// 集数信息
	{
		"_id": "66671efc09664cbba087daa5",
		"episode_number": 1,
		"episode_name": "_想再見你EP1_網路劇_第一集_起床的那個漢堡蛋_美乃滋才是關鍵_BREAKFAST_会_Taiwan_LGBTQ_web_series_EP1",
		"video_fsid": 745971276044344,// 第一集视频文件的fsid
		"cover_fsid": 961742312487028 // 第一集视频封面文件的fsid
	}
]
// 如何更新"我自己的相册文件"的数据？列如下面
// 1. 拿到第一集视频文件的fsid的视频封面文件的fsid的“一刻相册中的相册文件数据”的项
// 2. 将拿到的“一刻相册中的相册文件数据”（视频封面文件的fsid项）去更新"我自己的相册文件"的两项数据（第一集视频文件的fsid项 和 第一集视频封面文件的fsid）
// 2.1. 第一集视频文件的fsid项的thumburl[0] = 第一集视频封面文件的fsid项的thumburl[0]（注意这是从"一刻相册中的相册文件数据"项找到的，因为我前面给你解释了，图片是动态的，也有过期时间）
// 2.2. 第一集视频封面文件的fsid项的thumburl[0] = 第一集视频封面文件的fsid项的thumburl[0]（注意这是从"一刻相册中的相册文件数据"项找到的，因为我前面给你解释了，图片是动态的，也有过期时间）
```
现在你应该明白了我的意思，帮我实现



# GPT 下面代码测试成功了，是对的
```javascript
function updateMyAlbumFiles(tvSeriesData, momentAlbumFiles, myAlbumFiles) {
    // 迭代电视剧剧集信息数据的每个剧集
    tvSeriesData.forEach(tvSeries => {
        tvSeries.episodes.forEach(episode => {
            // 对于每个剧集，找到对应的一刻相册中的相册文件数据项
            const coverItem = momentAlbumFiles.find(item => item.fsid === episode.cover_fsid);
            if (coverItem) {
                // 更新我自己的相册文件数据库表中的封面文件thumburl
                const myCoverFile = myAlbumFiles.find(item => item.fsid === episode.cover_fsid);
                if (myCoverFile) {
                    myCoverFile.thumburl[0] = coverItem.thumburl[0];
                }
                
                // 更新我自己的相册文件数据库表中的视频文件thumburl
                const myVideoFile = myAlbumFiles.find(item => item.fsid === episode.video_fsid);
                if (myVideoFile) {
                    myVideoFile.thumburl[0] = coverItem.thumburl[0];
                }
            }
        });
    });
    
    // 返回更新后的我自己的相册文件数据
    return myAlbumFiles;
}

// 假设您已经有了这三个数组的数据
const tvSeriesData = [/* 电视剧剧集信息数据 */];
const momentAlbumFiles = [/* 一刻相册中的相册文件数据 */];
const myAlbumFiles = [/* 我自己的相册文件 数据库表的数据 */];

// 调用函数来更新数据
const updatedMyAlbumFiles = updateMyAlbumFiles(tvSeriesData, momentAlbumFiles, myAlbumFiles);

// 在这里可以进行后续操作，例如保存更新后的数据到数据库
```

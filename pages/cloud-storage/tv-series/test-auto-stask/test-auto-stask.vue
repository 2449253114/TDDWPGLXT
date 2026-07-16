<template>
	<view>
		<button type="primary" class="uni-button" style="width: 100px;"
			@click="testStask">测试自动化任务</button>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				
			}
		},
		methods: {
			testStask() {// 测试成功了
				// 假设您已经有了这三个数组的数据
				//const tvSeriesData = [/* 电视剧剧集信息数据 */];
				//const momentAlbumFiles = [/* 一刻相册中的相册文件数据 */];
				//const myAlbumFiles = [/* 我自己的相册文件 数据库表的数据 */];
				
				const tvSeriesData = [/* 电视剧剧集信息数据 */
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
				];
				const momentAlbumFiles = [/* 一刻相册中的相册文件数据 */
					{
					    "album_id": "3021756111842291636",
					    "fsid": 745971276044344,
						"category": 1,// 1视频
					    "thumburl": [
					        "category=1视频_https://pcsdata.baidu.com/thumbnail/3ffc2b337if32691c008ae30fc9e9303?fid=1815907562-16051585-745971276044344&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-cSwB3iZBxPxA4MnwrKYymmq7Ltw%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=299007291682689158&dp-callid=0&time=1718035200&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
					        "https://pcsdata.baidu.com/thumbnail/3ffc2b337if32691c008ae30fc9e9303?fid=1815907562-16051585-745971276044344&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-cSwB3iZBxPxA4MnwrKYymmq7Ltw%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=299007291682689158&dp-callid=0&time=1718035200&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
					    ]
					},
					{
					    "album_id": "3021756111842291636",
					    "fsid": 961742312487028,
						"category": 3,// 3图片
					    "thumburl": [
					        "category=3图片_https://pcsdata.baidu.com/thumbnail/8e1cde9d6ka87b91de7dc63559a2f9a5?fid=1815907562-16051585-138226811855149&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-%2B2SVuN1npSTDP%2B5XmLUpu%2FqM6HQ%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=299007291682689158&dp-callid=0&time=1718035200&bus_no=26&size=c800_u800&quality=100&vuk=-&ft=video",
					        "https://pcsdata.baidu.com/thumbnail/8e1cde9d6ka87b91de7dc63559a2f9a5?fid=1815907562-16051585-138226811855149&rt=pr&sign=FDTAER-yUdy3dSFZ0SVxtzShv1zcMqd-%2B2SVuN1npSTDP%2B5XmLUpu%2FqM6HQ%3D&expires=48h&chkv=0&chkbd=0&chkpc=&dp-logid=299007291682689158&dp-callid=0&time=1718035200&bus_no=26&size=c1600_u1600&quality=100&vuk=-&ft=video"
					    ]
					}
				];
				const myAlbumFiles = [/* 我自己的相册文件 数据库表的数据 */
					{
						"_id": "66671efc09664cbba087daa5",
						"album_id": "3021756111842291636",
						"fsid": 745971276044344,
						"category": 1,// 1视频
						"thumburl": [
							"test",
							"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/uploads/photobaidu/covers/jPhoUjq5p8k29ccN1_title_745971276044344.jpg"
						]
					},
					{
						"_id": "66671efc09664cbba087daa5",
						"album_id": "3021756111842291636",
						"fsid": 961742312487028,
						"category": 3,// 3图片
						"thumburl": [
							"test",
							"https://mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.cdn.bspapp.com/uploads/photobaidu/covers/jPhoUjq5p8k29ccN1_title_745971276044344.jpg"
						]
					}
				];
				
				
				// 调用函数来更新数据
				const updatedMyAlbumFiles = this.updateMyAlbumFiles(tvSeriesData, momentAlbumFiles, myAlbumFiles);
				
				console.log('updatedMyAlbumFiles', updatedMyAlbumFiles)
			},
			updateMyAlbumFiles(tvSeriesData, momentAlbumFiles, myAlbumFiles) {
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
		}
	}
</script>

<style>

</style>

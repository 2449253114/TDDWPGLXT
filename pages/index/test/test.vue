<template>
	<view>
		<button @click="auto_update_file_cover">自动更新文件封面</button>

		<button @click="testA" type="primary">testA</button>
		
		<button @click="testB" type="primary">testB</button>
		
		
	</view>
</template>

<script>
	const {
		auto_update_file_cover
	} = require('./admin-auto-task/index')
	export default {
		data() {
			return {
				m3u8Record: {
					sub_account_cookie_ids: []
				}
			}
		},
		methods: {
			auto_update_file_cover,

			testA() {
				let hourlyData = [{
						"_id": "hourly_slot_0",
						"hourly_slot": "00:00:00 - 00:59:59",
						"request_count": 99
					},
					{
						"_id": "hourly_slot_1",
						"hourly_slot": "01:00:00 - 01:59:59",
						"request_count": 99
					},
					{
						"_id": "hourly_slot_2",
						"hourly_slot": "02:00:00 - 02:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_3",
						"hourly_slot": "03:00:00 - 03:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_4",
						"hourly_slot": "04:00:00 - 04:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_5",
						"hourly_slot": "05:00:00 - 05:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_6",
						"hourly_slot": "06:00:00 - 06:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_7",
						"hourly_slot": "07:00:00 - 07:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_8",
						"hourly_slot": "08:00:00 - 08:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_9",
						"hourly_slot": "09:00:00 - 09:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_10",
						"hourly_slot": "10:00:00 - 10:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_11",
						"hourly_slot": "11:00:00 - 11:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_12",
						"hourly_slot": "12:00:00 - 12:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_13",
						"hourly_slot": "13:00:00 - 13:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_14",
						"hourly_slot": "14:00:00 - 14:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_15",
						"hourly_slot": "15:00:00 - 15:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_16",
						"hourly_slot": "16:00:00 - 16:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_17",
						"hourly_slot": "17:00:00 - 17:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_18",
						"hourly_slot": "18:00:00 - 18:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_19",
						"hourly_slot": "19:00:00 - 19:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_20",
						"hourly_slot": "20:00:00 - 20:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_21",
						"hourly_slot": "21:00:00 - 21:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_22",
						"hourly_slot": "22:00:00 - 22:59:59",
						"request_count": 0
					},
					{
						"_id": "hourly_slot_23",
						"hourly_slot": "23:00:00 - 23:59:59",
						"request_count": 0
					}
				]

				// // 更新请求次数的函数
				// function updateHourlyRequestCount() {
				// 	// 获取当前时间
				// 	const now = new Date();
				// 	const currentHour = now.getHours();

				// 	// 遍历每个时间段
				// 	// hourlyData.forEach(item => {
				// 	// 	// 解析时间段的起始和结束小时
				// 	// 	const [startHourStr, endHourStr] = item.hourly_slot.split(' - ');
				// 	// 	const startHour = parseInt(startHourStr.substring(0, 2), 10);
				// 	// 	const endHour = parseInt(endHourStr.substring(0, 2), 10);

				// 	// 	// 确定当前时间是否在该时间段内
				// 	// 	if (currentHour >= startHour && currentHour < endHour) {
				// 	// 		// 更新当前时间段的请求计数
				// 	// 		item.request_count++;
				// 	// 	} else {
				// 	// 		// 重置其他时间段的请求计数
				// 	// 		item.request_count = 0;
				// 	// 	}
				// 	// });


				// 	// 找到当前时间对应的时间段索引
				// 	//let index = Math.floor(currentHour / 1); // 假设每个小时为一个时间段

				// 	// 更新当前时间段的请求计数
				// 	//hourlyData[index].request_count++;


				// 	// 需求调整：这样，你直接通过hourlyData的item._id值来找对应时间段，如hourly_slot_0则为00:00:00 - 00:59:59时间段内的。这样就不要去找hourly_slot字段的值了

				// }


				// 更新请求次数的函数
				function updateHourlyRequestCount(hourlyData) {
					// 获取当前时间
					const now = new Date(Date.now());
					const currentHour = now.getHours();

					console.log("currentHour", currentHour)

					// 计算当前时间对应的时间段_id
					let _id = `hourly_slot_${currentHour}`;

					// 创建一个映射表，用于快速查找
					let idToIndexMap = {};
					hourlyData.forEach((item, index) => {
						idToIndexMap[item._id] = index;
					});

					// 使用映射表找到对应索引
					let index = idToIndexMap[_id];

					// 更新当前时间段的请求计数
					hourlyData[index].request_count++;

					// 可选：再次遍历确认除当前时段外的其他时段request_count重置为0
					hourlyData.forEach((item, i) => {
						if (i !== index) {
							item.request_count = 0;
						}
					});
					
					return hourlyData
				}

				// 假设这是一次请求
				const newHourlyData = updateHourlyRequestCount(hourlyData);
				console.log(newHourlyData);

			},
			
			
			
			testB() {
				
				const photoConfig = {
					"headers": {
						// 这个Cookie是抓的Web端
						//"Cookie": "BIDUPSID=C6FF1A0FA68F50915CC0E431973FC719; PSTM=1693624019; BAIDUID=40F14108017EB6641D57F1DA67B48673:FG=1; BAIDUID_BFESS=40F14108017EB6641D57F1DA67B48673:FG=1; ZFY=Xp592oYhjmGCZmNwoZBgEk0hCwPwIzAsvxUVTsgAU58:C; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%221815907562%22%2C%22first_id%22%3A%2218c91cebcada6f-009f1d0798fdf2-26031051-1440000-18c91cebcae2589%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%7D%2C%22%24device_id%22%3A%2218c91cebcada6f-009f1d0798fdf2-26031051-1440000-18c91cebcae2589%22%7D; H_PS_PSSID=39733_39842_39935_39937_39942_39938_39996_39990_40008_40041; Hm_lvt_829488e8924d8de8d4420f2bbed270ca=1703506069; csrfToken=KmwdLtmt-PXrLKXQ91p1fJKP; BDUSS=ml0WUFvWFRNZWRJSjNjNk90WFdpallNblZnOWppenEzV2gydzFZdGRNVE9XN0psSVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM7OimXOzoplY; BDUSS_BFESS=ml0WUFvWFRNZWRJSjNjNk90WFdpallNblZnOWppenEzV2gydzFZdGRNVE9XN0psSVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM7OimXOzoplY; STOKEN=cc27463179bc702c84f6ab660c54ea667345f5bfc2c5b90056bf05aad88b85f3; PANWEB=1; PANWEB.sig=mEnYrSeaQqssYZire89rFPmLY9htA0FzmyWp6jBsV1U; Hm_lpvt_829488e8924d8de8d4420f2bbed270ca=1703684873; PANPSC=12251217843546114402%3AzzpCDGVh21K4ust%2BbawFFlcS2d9ns3O5PSeaW42QQxD7f3W8srjvRx353onjfJd5COfgdHnp148lc4YfRg60ihYmCLWIjT%2F8Fl7owtXleijihEIzmOtMnRn%2BOGYsIE0xYqZdy9zZ13lsfZ87u8WyL5Uakz0OGYGxy1YK4WK3w7VSq30u3lTLiFE4rv%2BwgXJCRxInW3klfekGH82i2qqYWIh32wT%2B23rM4SrOAfwkSukv2YLFpzeLmb0gRlTm2Fs1",
						// 这个Cookie是抓的App客户端
						"Cookie": "BDUSS=RJLTB1U2FZeWpobXJpWVJIczR0cTA2LUZDblZzZ0h1cnhJTW4zRm1ack1SbTFtRVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMy5RWbMuUVmSF; STOKEN=ed669022ee6f1b7a00632905969ae933556e772d15f8dd9b9b7b1e4d2525a38d;",
						"Host": "photo.baidu.com",
						"Referer": "https://photo.baidu.com/photo/web/home",
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
					},
					// 这个数组将存储多个子账号的 Cookie 和 ID
					subAccountCookies: [
						{
							id: "17343209464",
							cookie: "BDUSS=VaWTItQ1pRWTdnMWI5aEJ6QVNFemkyVi1tcXRjZmwxY1NtdzdsUlhEcEF2RUJtRVFBQUFBJCQAAAAAAAAAAAEAAADZS3bwxdbF1k1lbmdUQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAvGWZALxlmZ1; STOKEN=1a1c1e3239cd9b58a2cae9a7264ac47588b2bdc569257c7b649487b9295e705b;"
						},{
							id: "17384203028a1",
							cookie: "BDUSS=msxVG5oOFNWSExOZHZ3UGV5MlY4US16N3RzU2dncS1sRHZ0UjdNdG85b1IyYmxtRVFBQUFBJCQAAAAAAQAAAAEAAACWkgmOMTczODQyMDMwMjhhMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFMkmYRTJJmS; STOKEN=2e8445e77d326da753253eb31c78ec6176b07f6e44b5d3f8d7c2d4aefbd8a04a;"
						},{
							id: "17384203028a2",
							cookie: "BDUSS=mpPLThtSElialA0UFQyb01rejJjeklsdUJja1VBZG1ET2dsQTlwcmVCQUplcjFtRVFBQUFBJCQAAAAAAQAAAAEAAAAXVhWOMTczODQyMDMwMjhhMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAntlWYJ7ZVmT; STOKEN=b5fe34f1ff5e5d21d014b8b765f00b5c605d22f2999a798a93aa5cb1ae83ca28;"
						},{
							id: "19282422641a1",
							cookie: "BDUSS=Gp1UFJpRTA5Nk5FeUI3MWFOVUE4dUdkUmtGT05IUnpZaTBzRmZKMzRrRDZlcjFtRUFBQUFBJCQAAAAAAQAAAAEAAAASGSCOMTkyODI0MjI2NDFhMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPrtlWb67ZVmV; STOKEN=e1c80eaa91fac0429dc4ce463139d71e4fd9587eb9e5de8905993930ceb48870;"
						},{
							id: "19282422641a2",
							cookie: "BDUSS=mpaYjdtWGJJN1dUcXNEMH5TLVB3a29ncGp6RUtPbllqbGlCMGtnQjJINk54NzVtRVFBQUFBJCQAAAAAAQAAAAEAAACchS-OMTkyODI0MjI2NDFhMgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI06l2aNOpdmT; STOKEN=bf1494c66865a736dcde06ce10b01c69047ff78e2645a4012a1ba3740c02cc8e;"
						}
					]
				}
				
				// const m3u8Record = {
				// 	sub_account_cookie_ids: []
				// }
				
				const m3u8Record = this.m3u8Record
				
				
				// 检查 m3u8Record 是否存在以及是否有 sub_account_cookie_ids 属性
				let usedCookieIds = (m3u8Record && m3u8Record.sub_account_cookie_ids) || []
				
				// 先判断是否已经记录了5个不同的 Cookie ID，如果是，则清空集合
				if (usedCookieIds.length >= 5) {
					usedCookieIds = []
				}
				
				// 从 photoConfig.subAccountCookies 中过滤掉已经使用的 Cookie
				const availableCookies = photoConfig.subAccountCookies.filter(cookieObj => !usedCookieIds.includes(cookieObj.id));
				
				// 从过滤后的数组中随机选择一个 Cookie 对象
				const randomCookieObj = availableCookies[Math.floor(Math.random() * availableCookies.length)];
				
				// 更新请求头中的 Cookie
				//headers.Cookie = randomCookieObj.cookie;
				const newCookie = randomCookieObj.cookie;
				
				// 记录新的 Cookie ID，确保不会重复
				if (!usedCookieIds.includes(randomCookieObj.id)) {
				    usedCookieIds.push(randomCookieObj.id);
				}
				
				console.log("usedCookieIds", usedCookieIds)
				
				this.m3u8Record.sub_account_cookie_ids = usedCookieIds
				console.log("sub_account_cookie_ids", this.m3u8Record.sub_account_cookie_ids)
				
				
			}


		}
	}
</script>

<style>

</style>
<template>
	<view>
		<button @click="requestStreamingPeriodically" type="primary" size="mini">开始测试每{{ seconds }}秒请求一次流</button>

		<uni-datetime-picker return-type="timestamp" v-model="taskStartTime"></uni-datetime-picker>

		<uni-tag text="请求结果"></uni-tag>

		<uni-easyinput type="textarea" auto-height :maxlength="-1" v-model="JSON.stringify(jsonResult)"
			trim="end"></uni-easyinput>

		<uni-tag type="error" text="抛出错误"></uni-tag>
		<uni-card :is-shadow="false">
			<text class="uni-body">{{ message }}</text>
		</uni-card>

		<button @click="stopRequest" type="warn" size="mini">停止请求任务</button>

		<uni-tag type="default" :text="`共请求了 ${requestCount} 次`"></uni-tag>


		<uni-datetime-picker return-type="timestamp" v-model="taskEndTime"></uni-datetime-picker>

	</view>
</template>

<script>
	let intervalId = 0;

	export default {
		data() {
			return {
				jsonResult: {
					"querys": {
						"fsid": "744277785399084", // 必须string类型 
						"album_id": "3021756111842291636", // 必须string类型
						"uk": "1815907562", // 必须string类型
						"tid": "317180053559151726" // 必须string类型
					}
				},
				message: "",
				requestCount: 0, // 添加请求计数器
				seconds: 50, // 每多少秒请求一次
				taskStartTime: 0, // 任务开始的时间
				taskEndTime: 0, // 任务结束时间
			}
		},
		onReady() {
			const today = new Date(); // 获取当前日期
			const dayOfWeek = today.getDay(); // 获取今天是星期几，返回值是0（周日）到6（周六）

			let dailyMovieCount = 0; // 默认设置为0

			// 检查今天是周一、周三还是周五（1、3、5）
			if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
				dailyMovieCount = 1; // 如果是，设置为1
			}

			console.log("获取今天是星期几：" + dayOfWeek)

		},
		methods: {
			async requestStreamingPeriodically() {
				this.taskStartTime = Date.now();

				const {
					seconds
				} = this

				// 使用 setInterval 创建一个每seconds秒执行一次的定时器
				intervalId = setInterval(async () => {
					await this.requestStreaming();
				}, seconds * 1000); // 毫秒


				// 怎么实现已经请求了多少次的统计呢？

				// 可以根据需要添加停止定时器的逻辑
				// 例如，当某个条件满足时，调用 clearInterval(intervalId) 来停止定时任务
			},
			async stopRequest() {
				clearInterval(intervalId)
				this.taskEndTime = Date.now()
			},
			async requestStreaming() {
				const todo = uniCloud.importObject("test-request-m3u8")
				try {
					const result = await todo.requestStreaming()

					console.log("result", result)

					this.jsonResult = result

				} catch (error) {
					console.log("error", error.message)

					this.message = error.message

				} finally {
					this.requestCount++; // 递增请求计数器
				}
			}
		}
	}
</script>
<template>
	<view>
		<view class="uni-header">
			<view class="uni-group hide-on-phone">
				<view class="uni-title">列出聊天列表</view>
			</view>
			<view class="uni-group">
				<!-- 输入框 -->
				<input class="uni-search" type="text" v-model="searchVal" @confirm="search" />
				<!-- 搜索按钮 -->
				<button class="uni-button" type="default" size="mini" @click="search">搜索</button>
			</view>
		</view>
		<view class="uni-container">
			<uni-collapse ref="collapse" v-model="value">
				<uni-collapse-item title="TDL 全局配置" :open="false">
					<text>Telegram TDL文档：https://docs.iyear.me/tdl/zh/guide/global-config/</text>
					
					<view class="group">
						<uni-title type="h1" title="代理"></uni-title>
						
						<uni-section title="--proxy" :subTitle="`设置代理。默认值：''，格式：protocol://username:password@host:port`" type="line" padding>
							<uni-easyinput :value="setProxyCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
					</view>
					
				</uni-collapse-item>
				
				<uni-collapse-item title="TDL 导出消息命令" :open="true">
					<text>Telegram TDL文档：https://docs.iyear.me/tdl/zh/guide/tools/export-messages/</text>
					
					<view class="group">
						<uni-title type="h1" title="导出消息"></uni-title>
						
						<uni-section title="所有消息" :subTitle="`将包含媒体的所有消息导出到 tdl-export-groupid-${group_id}.json`" type="line"
							padding>
							<uni-easyinput :value="exportCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
					</view>
					
					<view class="group">
						<uni-title type="h1" title="自定义类型"></uni-title>
						
						<uni-section title="默认时间范围" subTitle="根据特定的时间戳范围进行导出。默认：1970-01-01 - 当前" type="line" padding>
							<uni-easyinput disabled :value="exportCommand" focus placeholder="请输入内容"
								@input="input"></uni-easyinput>
						</uni-section>
					
						<uni-section title="选择时间范围" :subTitle="`根据特定的时间戳范围进行导出。已选：${startTime} - ${endTime}`" type="line"
							padding>
							<uni-datetime-picker v-model="datetimerange" type="datetimerange" @change="dateTimerAngeChange"
								rangeSeparator="至" style="margin-bottom: 10px;" />
							<uni-easyinput :value="datetimerangeExportCommand" focus placeholder="请输入内容"
								@input="input"></uni-easyinput>
						</uni-section>
					
						<uni-section title="默认ID 范围" subTitle="根据特定的消息 ID 范围进行导出。默认：0 - 最新" type="line" padding>
							<uni-easyinput disabled :value="exportCommand" focus placeholder="请输入内容"
								@input="input"></uni-easyinput>
						</uni-section>
					
						<uni-section title="选择ID 范围" subTitle="根据特定的消息 ID 范围进行导出。已选：0 - 1" type="line" padding>
							<uni-row class="uni-row" style="margin-bottom: 10px;">
								<uni-number-box :value="chatidrange[0]" :max="100000"
									@change="chatIdRangeChange('startID', $event)" background="#2979FF" color="#fff"
									style="margin-right: 10px;" />
								<uni-number-box :value="chatidrange[1]" :max="100000"
									@change="chatIdRangeChange('endID', $event)" background="#005928" color="#fff" />
							</uni-row>
							<uni-easyinput :value="chatidrangeExportCommand" focus placeholder="请输入内容"
								@input="input"></uni-easyinput>
						</uni-section>
					
						<uni-section title="最新" subTitle="导出最后 100 条媒体文件" type="line" padding>
							<uni-row class="uni-row" style="margin-bottom: 10px;">
								<uni-number-box v-model="lastCount" :max="100000" background="#2979FF" color="#fff"
									style="margin-right: 10px;" />
							</uni-row>
							<uni-easyinput :value="lastCountExportCommand" focus placeholder="请输入内容"
								@input="input"></uni-easyinput>
						</uni-section>
					</view>
				</uni-collapse-item>
				
				<uni-collapse-item title="TDL 下载媒体文件" :open="true">
					<text>Telegram TDL文档：https://docs.iyear.me/tdl/zh/guide/download/</text>
					
					<view class="group">
						<uni-title type="h1" title="下载"></uni-title>
						
						<uni-section title="从链接下载" subTitle="点击官方客户端的 “复制链接” 按钮获取消息链接。" type="line" padding>
							<uni-easyinput :value="downloadFromLinkCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
						
						<uni-section title="从 JSON 下载" subTitle="首次从JSON下载, 也可以直接用恢复/重新下载命令" type="line" padding>
							<uni-easyinput :value="downloadFromJSONCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
						
						<uni-section title="自定义参数" subTitle="使用每个任务8个线程，512KiB（最大）的分块大小，4个并发任务下载：" type="line" padding>
							<uni-easyinput :value="downloadConcurrencyCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
						
						<uni-section title="反序下载" subTitle="按反序下载文件（从最新到最旧）" type="line" padding>
							<uni-easyinput :value="downloadDescCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
						
						<uni-section title="自动跳过" subTitle="在下载时跳过相同的文件（即名称和大小相同）。" type="line" padding>
							<uni-easyinput :value="downloadSkipSameCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
						
						<uni-title type="h1" title="恢复/重新开始下载"></uni-title>
						
						<uni-section title="恢复下载" subTitle="在不需要交互的情况下恢复下载：" type="line" padding>
							<uni-easyinput :value="downloadContinueCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
						
						<uni-section title="重新开始下载" subTitle="在不需要交互的情况下重新开始下载：" type="line" padding>
							<uni-easyinput :value="downloadRestartCommand" focus placeholder="请输入内容" @input="input"></uni-easyinput>
						</uni-section>
						
					</view>
					
				</uni-collapse-item>
			</uni-collapse>
			


		</view>
	</view>
</template>

<script>
	const {
		tdlConfig
	} = require('./../common/config.js')
	export default {
		data() {
			return {
				group_id: 0,
				searchVal: '',
				tdlConfig,
				datetimerange: ["2021-07-08 0:01:10", "2021-08-08 23:59:59"],
				chatidrange: [0, 1],
				lastCount: 100,
			};
		},
		computed: {
			// 导出消息命令
			exportCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} chat export -c ${this.group_id}`;
			},
			// 时间范围导出消息命令
			datetimerangeExportCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} chat export -c ${this.group_id} -i ${this.startTime},${this.endTime}`;
			},
			startTime() { // 开始时间范围
				const startTime = new Date(this.datetimerange[0]).getTime() / 1000;
				return startTime
			},
			endTime() { // 结束时间范围
				const endTime = new Date(this.datetimerange[1]).getTime() / 1000;
				return endTime
			},
			// 消息ID范围导出消息命令
			chatidrangeExportCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				const startID = this.chatidrange[0]
				const endID = this.chatidrange[1]
				return `tdl -n ${username} ${proxy} chat export -c ${this.group_id} -T id -i ${startID},${endID}`;
			},
			// 消息ID范围选择
			chatIdRangeChange(type, value) {
				if (type == 'startID') this.chatidrange[0] = value
				if (type == 'endID') this.chatidrange[1] = value
			},
			// 最新：导出最后 100 条媒体文件
			lastCountExportCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} chat export -c ${this.group_id} -T last -i ${this.lastCount}`;
			},
			// 从链接下载，消息链接示例
			downloadFromLinkCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} -u https://t.me/telegram/1 -u https://t.me/telegram/2`;
			},
			// 从 JSON 下载
			downloadFromJSONCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} dl -f ./tdl-export-groupid-${this.group_id}.json`;
			},
			// 自定义参数：并发下载
			downloadConcurrencyCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} dl -f ./tdl-export-groupid-${this.group_id}.json --continue -t 8 -s 524288 -l 4`;
			},
			// 反序下载：按反序下载文件（从最新到最旧）
			downloadDescCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} dl -f ./tdl-export-groupid-${this.group_id}.json --continue --desc`;
			},
			// 自动跳过：在下载时跳过相同的文件（即名称和大小相同）。
			downloadSkipSameCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} dl -f ./tdl-export-groupid-${this.group_id}.json --continue --skip-same`;
			},
			// 恢复下载：在不需要交互的情况下恢复下载：
			downloadContinueCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} dl -f ./tdl-export-groupid-${this.group_id}.json --continue`;
			},
			// 重新开始下载：在不需要交互的情况下重新开始下载：
			downloadRestartCommand() {
				// 移除 username 前的 "@" 字符
				const username = this.tdlConfig.username.replace('@', '');
				const proxy = this.tdlConfig.proxy
				return `tdl -n ${username} ${proxy} dl -f ./tdl-export-groupid-${this.group_id}.json --restart`;
			},
			// 设置代理。默认值：""。格式：protocol://username:password@host:port
			setProxyCommand() {
				// 移除 username 前的 "@" 字符
				const proxy = this.tdlConfig.proxy;
				return `tdl ${proxy}`;
			}
		},
		onLoad: function(options) {
			this.group_id = options.group_id
			this.searchVal = options.group_id
		},
		methods: {
			dateTimerAngeChange(e) {
				// e = ["2021-07-08 00:01:10","2021-08-08 23:59:59"]  
				console.log('change事件:', e);

				// 将日期时间字符串转换为时间戳（秒）
				const startTime = new Date(e[0]).getTime() / 1000;
				const endTime = new Date(e[1]).getTime() / 1000;

				console.log('startTime:', startTime);
				console.log('endTime:', endTime);
			},
		}
	}
</script>

<style lang="scss">

</style>
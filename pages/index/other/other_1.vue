<template>
	<view>
		<view class="title">请输入批发贴吧号.txt的内容</view>
		<uni-easyinput trim focus :maxlength="-1" type="textarea" v-model="textValue" @input="input"></uni-easyinput>

		<view style="display: flex;flex-direction: column;">
			<span>您输入的内容是：</span>
			<uni-easyinput trim :maxlength="-1" type="textarea" v-model="displayText"></uni-easyinput>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				textValue: '',
				displayText: '' // 用于存储解析后的输入框内容
			}
		},
		methods: {
			input(e) {
				//console.log('输入内容：', e);
				if (e == '' || e == undefined) return

				const text = e
				const lines = text.split('\n');
				const result = [];

				lines.forEach(line => {
					const parts = line.split('----');
					const formattedLine = `${parts[0]}\t${parts[1]}\t\t${parts[2]}\t${parts[3]}`;
					result.push(formattedLine);
				});

				result.forEach(line => console.log(line));

				this.displayText = result.join('\n')

				uni.showToast({
					title: `共 ${ result.length } 个账号`
				})

			},
		}
	}
</script>

<style>

</style>
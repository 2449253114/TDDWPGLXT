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
				<!-- 添加按钮 -->
				<button class="uni-button" type="primary" size="mini">添加</button>
				<!-- 批量删除按钮 -->
				<button class="uni-button" type="warn" size="mini" @click="delTable">批量删除</button>
			</view>
		</view>
		<view class="uni-container">
			<!-- 表格组件 -->
			<uni-table :loading="false" border stripe type="selection" @selection-change="selectionChange">
				<uni-tr>
					<!-- 表头列 -->
					<uni-th width="150" align="center">群组ID</uni-th>
					<uni-th width="150" align="center">类型</uni-th>
					<uni-th align="center">名字</uni-th>
					<uni-th align="center">操作</uni-th>
				</uni-tr>
				<uni-tr v-for="(item ,index) in chatListData" :key="index">
					<!-- 表格数据列 -->
					<uni-td>{{item.id}}</uni-td>
					<uni-td>{{item.type}}</uni-td>
					<uni-td>
						<view class="name">{{item.visible_name}}</view>
					</uni-td>
					<uni-td>
						<view class="uni-group">
							<!-- 编辑按钮 -->
							<button class="uni-button" size="mini" type="primary" @click="navigateTo(item.id)">查看导出消息</button>
							<!-- 删除按钮 -->
							<button class="uni-button" size="mini" type="warn">删除</button>
						</view>
					</uni-td>
				</uni-tr>
			</uni-table>
		</view>
	</view>
</template>

<script>
	const { chatLsData } = require('../common/chat-ls.js');
	console.log(chatLsData);
	export default {
		data() {
			return {
				// 聊天列表数据
				chatListData: chatLsData,
				selectedIndexs: [],
				searchVal: ''
			};
		},
		// 在这里写个计算属性，当chatList发送变化时，需要过滤数据

		// 页面加载时的处理函数
		onLoad() {
			// 重置选中项数组
			this.selectedIndexs = []
		},
		methods: {
			navigateTo(group_id) {
				// 获取当前页面栈数组
				let pages = getCurrentPages();
				// 获取当前页面的页面对象
				let currentPage = pages[pages.length - 1];
				// 获取页面的URL
				let currentUrl = currentPage.$page.fullPath;
				
				// 如果需要包括域名等信息，可以使用window.location （完整的URL）
				let fullUrl = window.location.href;
				
				console.log('当前页面的URL:', currentUrl);
				console.log('完整的URL:', fullUrl);
				
				// 目标页面的路径
				const targetPath = '/pages/telegram/tdl/chat-exoprt/chat-exoprt';
				// 替换当前页面的URL部分为目标页面的路径，构造新的URL
				const targetUrl = fullUrl.replace(currentUrl, targetPath);
						
				// #ifdef H5
				if (targetUrl.indexOf('http') === 0) {
					return window.open(`${targetUrl}?group_id=${group_id}`)
				}
				// #endif
			},
			
			
			// 多选处理
			selectedItems() {
				return this.selectedIndexs.map(i => this.chatListData[i])
			},

			// 多选事件处理函数
			selectionChange(e) {
				this.selectedIndexs = e.detail.index
			},

			// 批量删除函数
			delTable() {
				this.selectedItems();
			}

		}
	}
</script>

<style lang="scss">

</style>
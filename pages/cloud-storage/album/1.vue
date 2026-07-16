<template>
	<view>
		<div class="photo-list">
			<div class="photo-item" v-for="(item,index) in data" :key="index">
				<div class="img-container">
					<!-- thumburl [0] 一刻相册缩略图、[1] 原图大图-已上传uniCloud -->
					<image class="photo-img" :src="item.thumburl[0]" mode="heightFix" />
					<!-- 仅视频显示 -->
					<div v-if="item.category == 1" class="video-duration">
						<image class="start" src="@/static/yike/icon-play-start.png" mode="aspectFill" />
						<div class="duration">{{ item.duration_format }}</div>
					</div>
					<!-- 仅草稿箱显示❌  发布状态：0 草稿箱 1 已发布 -->
					<div v-if="item.status == 0" class="flie-status">
						{{ options.status_valuetotext[item.status] == '已发布' ? '✅' : '' }}
					</div>
				</div>
				<div class="img-mask"></div>
				<div class="mask" style="display: none;"></div>
				
				<!-- 没选中当前项的时候css是check-btn，选中是check-btn item-checked checked，也就是说check-btn这个div是可以点击的，点击则记录index到selectedIndexs中，再点击则中selectedIndexs中删除，并且还要实现一个全选的功能 -->
				<div class="check-btn"></div>
				
				<div class="file-detail">
					<div class="person">
						<div class="person-container">
							<div class="shadow"></div>
							<image class="img" :src="item.thumburl[0]" mode="aspectFill">
								<div class="info name yk-popover__reference">Porsch</div>
						</div>
						<!-- 点击人物头像 打开换绑人物弹窗 弹窗在最下面 -->
					</div>
					<div class="yk-album__item--text file_size">{{ item.bytes }}</div>
					<div class="yk-album__item--date">
						<uni-dateformat :threshold="[0, 0]" :date="item.ctime*1000"
							format="yyyy/MM/dd"></uni-dateformat>
					</div>
				</div>
			</div>
		</div>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				data: []
				selectedIndexs: [],
			}
		},
		methods: {
			
		}
	}
</script>


<template>
	<view class="xdd-sort-data-content">
		<view v-if="sortable" class="arrow-box">
			<text class="arrow up" :class="{ active: ascending }" @click.stop="ascendingFn"></text>
			<text class="arrow down" :class="{ active: descending }" @click.stop="descendingFn"></text>
		</view>
	</view>
</template>

<script>
	export default {
		name: "sort-data",
		props: {
			sortable: {
				type: Boolean,
				default: false
			},
		},
		data() {
			return {
				border: false,
				ascending: false,
				descending: false
			};
		},
		methods: {
			ascendingFn() {
				this.clearOther()
				this.ascending = !this.ascending
				this.descending = false
				this.$emit('sort-change', {
					order: this.ascending ? 'ascending' : null
				})
			},
			descendingFn() {
				this.clearOther()
				this.descending = !this.descending
				this.ascending = false
				this.$emit('sort-change', {
					order: this.descending ? 'descending' : null
				})
			},
			clearOther() {
				
			},
		}
	}
</script>

<style lang="scss">
	$border-color: #ebeef5;
	$uni-primary: #007aff !default;

	.xdd-sort-data-content {
		display: flex;
		align-items: center;
	}

	.arrow-box {
		width: 20px;
	}

	.arrow {
		display: block;
		position: relative;
		width: 10px;
		height: 8px;
		// border: 1px red solid;
		left: 5px;
		overflow: hidden;
		cursor: pointer;
	}

	.down {
		top: 3px;

		::after {
			content: '';
			width: 8px;
			height: 8px;
			position: absolute;
			left: 2px;
			top: -5px;
			transform: rotate(45deg);
			background-color: #ccc;
		}

		&.active {
			::after {
				background-color: $uni-primary;
			}
		}
	}

	.up {
		::after {
			content: '';
			width: 8px;
			height: 8px;
			position: absolute;
			left: 2px;
			top: 5px;
			transform: rotate(45deg);
			background-color: #ccc;
		}

		&.active {
			::after {
				background-color: $uni-primary;
			}
		}
	}
</style>
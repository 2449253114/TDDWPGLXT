点击排序按钮，显示隐藏下面的div
```
<button class="uni-button" type="default" size="mini" @click="">排序</button>
<div role="tooltip" id="yk-popover" class="yk-popover yk-popper album-popover"
	style="top: 70px; left: 70px;">
	<div class="type-list">
		<div class="type-item">
			<span class="mr-5">创建时间</span>
			<sortData class="mr-5" sortable @sort-change="sortChange($event, 'ctime')" />
			<filterData filterType="timestamp" @change="filterChange($event, 'ctime')" />
		</div>
		<div class="type-item">
			<span class="mr-5">发布状态</span>
			<filterData filter-type="select" :filter-data="options.filterData.status_localdata"
				@change="filterChange($event, 'status')" />
		</div>
		<div class="type-item current-type-item">
			<span class="mr-5">文件大小</span>
			<sortData class="mr-5" sortable @sort-change="sortChange($event, 'size')" />
		</div>
		<div class="type-item">
			<span class="mr-5">视频时长</span>
			<sortData class="mr-5" sortable
				@sort-change="sortChange($event, 'duration_ms_long')" />
		</div>
	</div>
	<div class="popper__arrow"></div>
</div>
```



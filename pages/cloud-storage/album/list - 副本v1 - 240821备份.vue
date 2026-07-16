<template>
  <view>
    <view class="uni-header">
      <view class="uni-group">
        <view class="uni-title"></view>
        <view class="uni-sub-title"></view>
      </view>
      <view class="uni-group">
        <input class="uni-search" type="text" v-model="query" @confirm="search" placeholder="请输入搜索内容" />
        <button class="uni-button" type="default" size="mini" @click="search">搜索</button>
        <button class="uni-button" type="default" size="mini" @click="navigateTo('./add')">新增</button>
        <button class="uni-button" type="default" size="mini" :disabled="!selectedIndexs.length" @click="delTable">批量删除</button>
        <download-excel class="hide-on-phone" :fields="exportExcel.fields" :data="exportExcelData" :type="exportExcel.type" :name="exportExcel.filename">
          <button class="uni-button" type="primary" size="mini">导出 Excel</button>
        </download-excel>
      </view>
    </view>
	<view class="uni-header">
		<view class="uni-title m-l-10">
			<text>文件总数：{{ totalCounts.totalFileCount }}</text>
			<text>图片总数：{{ totalCounts.totalPicCount }}</text>
			<text>视频总数：{{ totalCounts.totalVideoCount }}</text>
		</view>
	</view>	
    <view class="uni-container">
      <unicloud-db ref="udb" :collection="collectionList" field="album_id,create_time,title,custom_title,pic_count,video_count,total_count,price,status,cover_info" :where="where" page-data="replace"
        :orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
        v-slot:default="{data,pagination,loading,error,options}" :options="options" loadtime="manual" @load="onqueryload">
        <uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe type="selection" @selection-change="selectionChange">
          <uni-tr>
            <uni-th width="175px" align="center" sortable @sort-change="sortChange($event, 'cover_info')">相册封面</uni-th>  
			<!-- <uni-th align="center" sortable @sort-change="sortChange($event, 'album_id')">album_id</uni-th> -->
            <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'title')" sortable @sort-change="sortChange($event, 'title')">相册名称</uni-th>
            <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'custom_title')" sortable @sort-change="sortChange($event, 'custom_title')">APP相册名称</uni-th>
			<uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'pic_count')" sortable @sort-change="sortChange($event, 'pic_count')">图片数量</uni-th>
            <uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'video_count')" sortable @sort-change="sortChange($event, 'video_count')">视频数量</uni-th>
            <uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'total_count')" sortable @sort-change="sortChange($event, 'total_count')">总数量</uni-th>
            <!-- <uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'price')" sortable @sort-change="sortChange($event, 'price')">价格</uni-th> -->
            <uni-th align="center" filter-type="select" :filter-data="options.filterData.status_localdata" @filter-change="filterChange($event, 'status')">发布状态</uni-th>
			<uni-th align="center" filter-type="timestamp" @filter-change="filterChange($event, 'create_time')" sortable @sort-change="sortChange($event, 'create_time')">创建时间</uni-th>
            <!-- <uni-th align="center" sortable @sort-change="sortChange($event, 'cover_info')">cover_info</uni-th> -->
            <uni-th align="center">操作</uni-th>
          </uni-tr>
          <uni-tr v-for="(item,index) in data" :key="index">
			<uni-td align="center">
				<!-- thumburl [0] 一刻相册缩略图、[1] 原图大图-已上传uniCloud -->
				<image :src="item.cover_info.thumburl[0]" style="width: 165px;height: 165px;" mode="aspectFill"/>
				<text class="album_id">{{item.album_id}}</text>
			</uni-td>  
            <!-- <uni-td align="center">{{item.album_id}}</uni-td> -->
            <uni-td align="center">{{item.title}}</uni-td>
			<uni-td align="center">{{item.custom_title}}</uni-td>
            <uni-td align="center">{{item.pic_count}}</uni-td>
            <uni-td align="center">{{item.video_count}}</uni-td>
            <uni-td align="center">{{item.total_count}}</uni-td>
            <!-- <uni-td align="center">{{item.price}}</uni-td> -->
            <uni-td align="center">{{options.status_valuetotext[item.status]}}</uni-td>
			<!-- 
			<uni-td align="center">
				<uni-dateformat :threshold="[0, 0]" :date="item.create_time*1000"
					format="yyyy/MM/dd"></uni-dateformat>
			</uni-td>
			 -->
            <uni-td align="center">
              <view class="uni-group">
                <button @click="navigateTo('./edit?id='+item._id, false)" class="uni-button" size="mini" type="primary">修改</button>
                <button @click="confirmDelete(item._id)" class="uni-button" size="mini" type="warn">删除</button>
              </view>
            </uni-td>
          </uni-tr>
        </uni-table>
        <view class="uni-pagination-box">
          <uni-pagination show-icon :page-size="pagination.size" v-model="pagination.current" :total="pagination.count" @change="onPageChanged" />
        </view>
      </unicloud-db>
    </view>
  </view>
</template>

<script>
  import { enumConverter, filterToWhere } from '@/js_sdk/validator/yike-albums.js';

  const db = uniCloud.database()
  // 表查询配置
  const dbOrderBy = '' // 排序字段
  const dbSearchFields = [] // 模糊搜索字段，支持模糊搜索的字段列表。联表查询格式: 主表字段名.副表字段名，例如用户表关联角色表 role.role_name
  // 分页配置
  const pageSize = 20
  const pageCurrent = 1

  const orderByMapping = {
    "ascending": "asc",
    "descending": "desc"
  }

  export default {
    data() {
      return {
        collectionList: "yike-albums",
        query: '',
        where: '',
        orderby: dbOrderBy,
        orderByFieldName: "",
        selectedIndexs: [],
        options: {
          pageSize,
          pageCurrent,
          filterData: {
            "status_localdata": [
              {
                "value": 0,
                "text": "草稿箱"
              },
              {
                "value": 1,
                "text": "已发布"
              },
              {
                "value": 2,
                "text": "审核中"
              }
            ]
          },
          ...enumConverter
        },
        imageStyles: {
          width: 64,
          height: 64
        },
        exportExcel: {
          "filename": "yike-albums.xls",
          "type": "xls",
          "fields": {
            "album_id": "album_id",
            "create_time": "create_time",
            "相册名称": "title",
			"APP相册名称": "custom_title",
            "图片数量": "pic_count",
            "视频数量": "video_count",
            "总数量（图片和视频）": "total_count",
            "价格": "price",
            "发布状态": "status",
            "cover_info": "cover_info"
          }
        },
        exportExcelData: [],
		totalCounts: {
			totalFileCount: 0,
			totalPicCount: 0,
			totalVideoCount: 0
		}
      }
    },
    onLoad() {
      this._filter = {}
    },
    onReady() {
      this.$refs.udb.loadData()
	  this.getAlbmuFilesTotal()
    },
    methods: {
      onqueryload(data) {
        this.exportExcelData = data
		console.log("data", data)
      },
      getWhere() {
        const query = this.query.trim()
        if (!query) {
          return ''
        }
        const queryRe = new RegExp(query, 'i')
        return dbSearchFields.map(name => queryRe + '.test(' + name + ')').join(' || ')
      },
      search() {
        const newWhere = this.getWhere()
        this.where = newWhere
        this.$nextTick(() => {
          this.loadData()
        })
      },
      loadData(clear = true) {
        this.$refs.udb.loadData({
          clear
        })
      },
      onPageChanged(e) {
        this.selectedIndexs.length = 0
        this.$refs.table.clearSelection()
        this.$refs.udb.loadData({
          current: e.current
        })
      },
      navigateTo(url, clear) {
        // clear 表示刷新列表时是否清除页码，true 表示刷新并回到列表第 1 页，默认为 true
        uni.navigateTo({
          url,
          events: {
            refreshData: () => {
              this.loadData(clear)
            }
          }
        })
      },
      // 多选处理
      selectedItems() {
        var dataList = this.$refs.udb.dataList
        return this.selectedIndexs.map(i => dataList[i]._id)
      },
      // 批量删除
      delTable() {
        this.$refs.udb.remove(this.selectedItems(), {
          success:(res) => {
            this.$refs.table.clearSelection()
          }
        })
      },
      // 多选
      selectionChange(e) {
        this.selectedIndexs = e.detail.index
      },
      confirmDelete(id) {
        this.$refs.udb.remove(id, {
          success:(res) => {
            this.$refs.table.clearSelection()
          }
        })
      },
      sortChange(e, name) {
        this.orderByFieldName = name;
        if (e.order) {
          this.orderby = name + ' ' + orderByMapping[e.order]
        } else {
          this.orderby = ''
        }
        this.$refs.table.clearSelection()
        this.$nextTick(() => {
          this.$refs.udb.loadData()
        })
      },
      filterChange(e, name) {
        this._filter[name] = {
          type: e.filterType,
          value: e.filter
        }
        let newWhere = filterToWhere(this._filter, db.command)
        if (Object.keys(newWhere).length) {
          this.where = newWhere
        } else {
          this.where = ''
        }
        this.$nextTick(() => {
          this.$refs.udb.loadData()
        })
      },
	  // 获取所有相册的文件总数
	  async getAlbmuFilesTotal() {
		  
		  this.totalCounts = await calculateAlbumCounts()
		  
		  /**
		   * 计算相册中文件、图片和视频的总数
		   * 此函数首先从数据库获取相册总数，然后获取相册列表，
		   * 最后使用 reduce 方法计算所有相册的文件、图片和视频的总数。
		   * 
		   * @async
		   * @function calculateAlbumCounts
		   * @returns {Object} 包含文件总数、图片总数和视频总数的对象
		   */
		  async function calculateAlbumCounts() {
		      // 相册集合名称
		      const albumCollectionName = 'yike-albums';
		      // 相册集合
		      const albumCollection = db.collection(albumCollectionName);
		      
		      // 获取相册总数
		      const { result: albumCountResult } = await albumCollection.count();
		      const totalAlbums = albumCountResult.total;
		      console.log('相册总数:', totalAlbums);
		      
		      // 获取相册列表
		      const { result: albumListResult } = await albumCollection.limit(totalAlbums).get();
		      
		      console.log('相册列表结果:', albumListResult);
		      
		      // 使用 reduce 方法计算文件、图片和视频的总数
		      const totalCounts = albumListResult.data.reduce((counts, album) => {
		          counts.totalFileCount += album.total_count || 0;
		          counts.totalPicCount += album.pic_count || 0;
		          counts.totalVideoCount += album.video_count || 0;
		          return counts;
		      }, { totalFileCount: 0, totalPicCount: 0, totalVideoCount: 0 });
		      
		      console.log('文件总数:', totalCounts.totalFileCount);
		      console.log('图片总数:', totalCounts.totalPicCount);
		      console.log('视频总数:', totalCounts.totalVideoCount);
		  
		      // 返回计算结果
		      return totalCounts;
		  }
	  },
	  
    }
  }
</script>

<style scoped>
	.album_id {
		font-size: 12px;
		color: rgba(33, 33, 33, 0.75);
	}
</style>

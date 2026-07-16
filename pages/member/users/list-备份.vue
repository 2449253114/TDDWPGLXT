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
    <view class="uni-container">
      <unicloud-db ref="udb" :collection="collectionList" field="is_internal_user,surplus_movie_count,score,vip,device_oaid,register_date" :where="where" page-data="replace"
        :orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
        v-slot:default="{data,pagination,loading,error,options}" :options="options" loadtime="manual" @load="onqueryload">
        <uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe type="selection" @selection-change="selectionChange">
          <uni-tr>
			  <uni-th align="center" sortable @sort-change="sortChange($event, 'vip')">内部用户</uni-th>
            <uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'surplus_movie_count')" sortable @sort-change="sortChange($event, 'surplus_movie_count')">剩余次数<!-- 当日剩余观看次数 --></uni-th>
            <uni-th align="center" filter-type="range" @filter-change="filterChange($event, 'score')" sortable @sort-change="sortChange($event, 'score')">金币</uni-th>
            <uni-th align="center" sortable @sort-change="sortChange($event, 'vip')">会员</uni-th>
            <uni-th width="200px" align="center" filter-type="timestamp" @filter-change="filterChange($event, 'vip_expire_date')" sortable @sort-change="sortChange($event, 'vip_expire_date')">会员有效期至</uni-th>
            <uni-th width="200px" align="center" filter-type="timestamp" @filter-change="filterChange($event, 'register_date')" sortable @sort-change="sortChange($event, 'register_date')">注册时间</uni-th>
            <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'device_oaid')" sortable @sort-change="sortChange($event, 'device_oaid')">设备oaid</uni-th>
			<uni-th width="200px" align="center">操作</uni-th>
          </uni-tr>
          <uni-tr v-for="(item,index) in data" :key="index">
			<uni-td align="center">{{item.is_internal_user == true ? '✅' : '❌'}}</uni-td>
            <uni-td align="center">{{item.surplus_movie_count}}</uni-td>
            <uni-td align="center">{{item.score}}</uni-td>
            <uni-td align="center">{{item.vip == true ? '✅' : '❌'}}</uni-td>
            <uni-td align="center">
			  <uni-dateformat :threshold="[0, 0]" :date="item.vip_expire_date"></uni-dateformat>
            </uni-td>
            <uni-td align="center">
              <uni-dateformat :threshold="[0, 0]" :date="item.register_date"></uni-dateformat>
            </uni-td>
			<uni-td align="center">{{formatDeviceOaid(item.device_oaid, 'WithHim')}}</uni-td>
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
  import { enumConverter, filterToWhere } from '@/js_sdk/validator/user-accounts.js';

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
        collectionList: "user-accounts",
        query: '',
        where: '',
        orderby: dbOrderBy,
        orderByFieldName: "",
        selectedIndexs: [],
        options: {
          pageSize,
          pageCurrent,
          filterData: {},
          ...enumConverter
        },
        imageStyles: {
          width: 64,
          height: 64
        },
        exportExcel: {
          "filename": "user-accounts.xls",
          "type": "xls",
          "fields": {
			"内部用户": "is_internal_user",
            "当日剩余观看次数": "surplus_movie_count",
            "积分": "score",
            "会员": "vip",
            "会员到期": "vip_due_date",
            "设备oaid": "device_oaid",
            "注册时间": "register_date"
          }
        },
        exportExcelData: []
      }
    },
    onLoad() {
      this._filter = {}
    },
    onReady() {
      this.$refs.udb.loadData()
    },
    methods: {
      onqueryload(data) {
        this.exportExcelData = data
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
	  formatDeviceOaid(deviceOaid, prefixToRemove) {
	    // 移除指定前缀
		let cleanedOaid = deviceOaid.replace(prefixToRemove, '');
	
		// 计算保留的长度
		let halfLength = Math.ceil(cleanedOaid.length / 2);// 保留转为*号的数量
	
		// 获取前三位和后四位
		let firstThree = cleanedOaid.slice(0, 3);
		let lastFour = cleanedOaid.slice(-4);
	
		// 使用 * 填充中间部分
		let middleStars = '*'.repeat(halfLength);
	
		// 拼接结果
		let formattedOaid = `${firstThree}${middleStars}${lastFour}`;
	
		return formattedOaid;
	  }
    }
  }
</script>

<style>
</style>

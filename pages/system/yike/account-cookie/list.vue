<template>
  <view>
    <view class="uni-header">
      <view class="uni-group">
        <view class="uni-title"></view>
        <view class="uni-sub-title"></view>
				<button class="uni-button" type="primary" size="mini" @click="showAccountsDialog">导出CK账号</button>
				<button class="uni-button" type="warn" size="mini" @click="findExpiredAccounts">查询过期账号</button>
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
      <unicloud-db ref="udb" :collection="collectionList" field="user_name,cookie,status,create_date" :where="where" page-data="replace"
        :orderby="orderby" :getcount="true" :page-size="options.pageSize" :page-current="options.pageCurrent"
        v-slot:default="{data,pagination,loading,error,options}" :options="options" loadtime="manual" @load="onqueryload">
        <uni-table ref="table" :loading="loading" :emptyText="error.message || '没有更多数据'" border stripe type="selection" @selection-change="selectionChange">
          <uni-tr>
            <uni-th width="150" align="center" filter-type="search" @filter-change="filterChange($event, 'user_name')" sortable @sort-change="sortChange($event, 'user_name')">用户名</uni-th>
            <uni-th align="center" filter-type="search" @filter-change="filterChange($event, 'cookie')" sortable @sort-change="sortChange($event, 'cookie')">cookie</uni-th>
            <uni-th width="150" align="center" filter-type="select" :filter-data="options.filterData.status_localdata" @filter-change="filterChange($event, 'status')">账户状态</uni-th>
            <uni-th width="200" align="center" filter-type="timestamp" @filter-change="filterChange($event, 'create_date')" sortable @sort-change="sortChange($event, 'create_date')">创建时间</uni-th>
            <uni-th width="200" align="center">操作</uni-th>
          </uni-tr>
          <uni-tr v-for="(item,index) in data" :key="index">
            <uni-td align="center">{{item.user_name}}</uni-td>
            <uni-td align="center">{{ ellipsis(item.cookie, 75) }}</uni-td>
            <uni-td align="center">{{ options.status_valuetotext[item.status] }} {{ item.status }} {{ item.status == 0 ? '✅' : '❌' }}</uni-td>
            <uni-td align="center">
              <uni-dateformat :threshold="[0, 0]" :date="item.create_date"></uni-dateformat>
            </uni-td>
            <uni-td align="center">
              <view class="uni-group">
                <button @click="navigateTo('./edit?id='+item._id, false)" class="uni-button" size="mini" type="primary">修改</button>
                <!-- 不允许删除，免得手误 -->
								<button :disabled="true" @click="confirmDelete(item._id)" class="uni-button" size="mini" type="warn">删除</button>
              </view>
            </uni-td>
          </uni-tr>
        </uni-table>
        <view class="uni-pagination-box">
          <uni-pagination show-icon :page-size="pagination.size" v-model="pagination.current" :total="pagination.count" @change="onPageChanged" />
        </view>
      </unicloud-db>
    </view>
		
		<!-- 账号导出弹窗 -->
		<uni-popup ref="inputDialog" type="dialog">
			<uni-popup-dialog mode="input" title="账号信息" placeholder="账号信息" :value="formattedAccounts" confirmText="复制" cancelText="关闭" @confirm="copyAccountsInfo"></uni-popup-dialog>
		</uni-popup>
		
		<!-- 过期账号弹窗 -->
		<uni-popup ref="expiredDialog" type="dialog">
			<uni-popup-dialog mode="base" title="过期账号信息" :content="expiredAccountsInfo" confirmText="导出账号" cancelText="关闭" @confirm="exportExpiredAccounts" @close="closeExpiredDialog" :before-close="true">
				<template v-slot:default>
					<view class="dialog-content">
						<text>{{expiredAccountsInfo}}</text>
						<button v-if="expiredAccounts.length > 0" class="uni-button" type="warn" size="mini" style="margin-top: 15px;" @click="deleteExpiredAccounts">删除这些账号</button>
					</view>
				</template>
			</uni-popup-dialog>
		</uni-popup>
  </view>
</template>

<script>
  import { enumConverter, filterToWhere } from '@/js_sdk/validator/yike-account-cookie.js';
  // 引入uni-popup组件
  import uniPopup from '@/uni_modules/uni-popup/components/uni-popup/uni-popup.vue';
  import uniPopupDialog from '@/uni_modules/uni-popup/components/uni-popup-dialog/uni-popup-dialog.vue';

  const db = uniCloud.database()
	const dbCmd = db.command;
	
	const accountCookieCollectionName = 'yike-account-cookie';
	const accountCookieCollection = db.collection(accountCookieCollectionName)
	
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
    components: {
      uniPopup,
      uniPopupDialog
    },
    data() {
      return {
        collectionList: "yike-account-cookie",
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
                "text": "正常"
              },
              {
                "value": 1,
                "text": "cookie过期"
              },
              {
                "value": 2,
                "text": "账户异常"
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
          "filename": "yike-account-cookie.xls",
          "type": "xls",
          "fields": {
            "用户名": "user_name",
            "cookie": "cookie",
            "账户状态": "status",
            "创建时间": "create_date"
          }
        },
        exportExcelData: [],
				formattedAccounts: '',  // 用于存储格式化后的账号信息
				expiredAccounts: [], // 存储过期账号
				expiredAccountsInfo: '' // 过期账号信息显示文本
      }
    },
    onLoad() {
      this._filter = {}
    },
    onReady() {
      this.$refs.udb.loadData()
    },
    methods: {
      ellipsis(str, length) {
      	if (str.length > length) {
      		return str.slice(0, length) + '...';
      	}
      	return str;
      },
      onqueryload(data) {
      	this.exportExcelData = data
				//this.batchUpdateStatus()
      	// 示例使用
      	const formattedData = this.formatAccountData(data);
      	console.log(formattedData);
      },
      showAccountsDialog() {
      	// 生成格式化的账号数据，每行一个账号信息
      	const formattedData = this.formatAccountData(this.exportExcelData);
      	this.formattedAccounts = formattedData.join('\n');
      	this.$refs.inputDialog.open(); // 打开弹窗
      },
      /**
       * 格式化账号数据为指定格式：百度号----密码----CK
       * 
       * 该函数接收一个包含账号信息的数组，并返回一个格式化后的字符串数组。每个字符串包含：
       * 1. 百度号（user_name）：从 `user_name` 字段提取。
       * 2. 密码（物联卡注册账号）：在此示例中使用固定值 "物联卡注册账号"（可根据实际需要修改）。
       * 3. CK（BDUSS）：从 `cookie` 字符串中提取 BDUSS 值。
       * 
       * 导出的格式为：`百度号----密码----CK`，例如：
       * "活泼开朗的小灵通（一刻相册）----物联卡注册账号----BDUSS=pFNjF...;"
       * 
       * @param {Array} data - 包含账号信息的对象数组
       * @returns {Array} 格式化后的账号信息字符串数组
       */
      formatAccountData(data) {
      	return data.map(account => {
      		// 提取 user_name
      		const userName = account.user_name;
      
      		// 假设物联卡注册账号为固定值 "物联卡注册账号"
      		const iotAccount = "物联卡注册账号";
      
      		// 从 cookie 中提取 BDUSS
      		const bdussMatch = account.cookie.match(/BDUSS=([^;]+)/);
      		const bduss = bdussMatch ? `BDUSS=${bdussMatch[1]};` : "";
      
      		// 按照指定格式输出：百度号----密码----CK
      		return `${userName}----${iotAccount}----${bduss}`;
      	});
      },
			// 批量更新 status 字段为 0 （仅在开发期间补充status字段使用）
			async batchUpdateStatus() {
			  try {
			    // 使用 where 条件筛选出所有 _id 存在的文档
			    let res = await accountCookieCollection.where({
			      _id: dbCmd.exists(true) // 条件：_id 字段存在
			    }).update({
			      status: 0 // 将 status 字段更新为 0
			    });
			
			    // 输出更新结果
			    console.log('批量更新成功', res);
			  } catch (err) {
			    // 捕获并输出错误
			    console.error('批量更新失败', err);
			  }
			},
			/**
			 * 查询status字段为1已过期的ck账号，并使用uni-popup显示总数量和提供两个功能
			 * 1. 将这些账号导出，仅账号名，每行一个
			 * 2. 删除这些过期账号
			 */
			async findExpiredAccounts() {
				try {
					// 查询status为1的账号
					const { result } = await accountCookieCollection.where({
						status: 1 // 已过期的账号
					}).limit(1000).get();
					
					this.expiredAccounts = result.data || [];
					const count = this.expiredAccounts.length;
					
					if (count > 0) {
						// 构建显示信息
						this.expiredAccountsInfo = `共找到 ${count} 个过期账号。\n\n您可以选择导出这些账号或删除它们。`;
					} else {
						this.expiredAccountsInfo = '没有找到过期账号。';
					}
					
					// 显示弹窗
					this.$refs.expiredDialog.open();
				} catch (err) {
					console.error('查询过期账号失败', err);
					uni.showToast({
						title: '查询失败，请重试',
						icon: 'none'
					});
				}
			},
			
			/**
			 * 导出过期账号，仅账号名，每行一个
			 */
			exportExpiredAccounts() {
				if (this.expiredAccounts.length === 0) {
					return;
				}
				
				// 提取账号名并格式化
				const accountNames = this.expiredAccounts.map(account => account.user_name).join('\n');
				
				// 复制到剪贴板
				uni.setClipboardData({
					data: accountNames,
					success: () => {
						uni.showToast({
							title: '账号已复制到剪贴板',
							icon: 'success'
						});
					}
				});
			},
			
			/**
			 * 删除过期账号
			 */
			async deleteExpiredAccounts() {
				if (this.expiredAccounts.length === 0) {
					return;
				}
				
				uni.showModal({
					title: '确认删除',
					content: `确定要删除这 ${this.expiredAccounts.length} 个过期账号吗？此操作不可恢复！`,
					success: async (res) => {
						if (res.confirm) {
							try {
								// 提取所有过期账号的ID
								const ids = this.expiredAccounts.map(account => account._id);
								
								// 批量删除
								const { deleteResult: result } = await accountCookieCollection.where({
									_id: dbCmd.in(ids)
								}).remove();
								
								uni.showToast({
									title: `成功删除 ${deleteResult.deleted} 个账号`,
									icon: 'success'
								});
								
								// 关闭弹窗并刷新数据
								this.$refs.expiredDialog.close();
								this.loadData();
							} catch (err) {
								console.error('删除过期账号失败', err);
								uni.showToast({
									title: '删除失败，请重试',
									icon: 'none'
								});
							}
						}
					}
				});
			},
			
			/**
			 * 关闭过期账号弹窗
			 */
			closeExpiredDialog() {
				this.$refs.expiredDialog.close();
			},
			
			/**
			 * 复制账号信息到剪贴板
			 */
			copyAccountsInfo() {
				uni.setClipboardData({
					data: this.formattedAccounts,
					success: () => {
						uni.showToast({
							title: '账号信息已复制',
							icon: 'success'
						});
					}
				});
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
      }
    }
  }
</script>

<style>
</style>

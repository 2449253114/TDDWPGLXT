<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
	  <uni-forms-item name="album_type" label="相册类型">
	    <uni-data-checkbox v-model="formData.album_type" :localdata="formOptions.album_type_localdata"></uni-data-checkbox>
	  </uni-forms-item>		
      <uni-forms-item name="album_id" label="album_id">
        <uni-easyinput placeholder="一刻相册_相册id" v-model="formData.album_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="create_time" label="创建时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.create_time * 1000" @change="changeTimestamp"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="title" label="相册名称">
        <uni-easyinput placeholder="一刻相册 相册名称" v-model="formData.title"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="custom_title" label="APP相册名称">
        <uni-easyinput placeholder="自定义 APP相册名称" v-model="formData.custom_title"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="top_days" label="置顶天数">
        <uni-easyinput placeholder="置顶天数，用于控制相册在列表中的置顶时长，置顶有效期计算方式：create_time + 置顶天数时长 < 现在的时间，则在数据返回前，把当前item项放到数组前面" type="number" v-model="formData.top_days"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="status" label="发布状态">
        <uni-data-checkbox v-model="formData.status" :localdata="formOptions.status_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <view class="uni-button-group">
        <button type="primary" class="uni-button" style="width: 100px;" @click="submit">提交</button>
        <navigator open-type="navigateBack" style="margin-left: 15px;">
          <button class="uni-button" style="width: 100px;">返回</button>
        </navigator>
      </view>
    </uni-forms>
  </view>
</template>

<script>
  import { validator } from '@/js_sdk/validator/yike-albums.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'yike-albums';

  function getValidator(fields) {
    let result = {}
    for (let key in validator) {
      if (fields.includes(key)) {
        result[key] = validator[key]
      }
    }
    return result
  }

  

  export default {
    data() {
      let formData = {
		"album_type": 0,
        "album_id": "",
        "create_time": null,
        "title": "",
        "custom_title": "",
        "top_days": 0,
        "status": 0
      }
      return {
        formData,
        formOptions: {
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
          ],
		  "album_type_localdata": [
		  	{
		  	  "value": 0,
		  	  "text": "一刻相册"
		  	},
		  	{
		  	  "value": 1,
		  	  "text": "网剧相册"
		  	}
		  ]
        },
        rules: {
          ...getValidator(Object.keys(formData))
        }
      }
    },
    onLoad(e) {
      if (e.id) {
        const id = e.id
        this.formDataId = id
        this.getDetail(id)
      }
    },
    onReady() {
      this.$refs.form.setRules(this.rules)
    },
    methods: {
      changeTimestamp(timestamp) {
		console.log("timestamp", timestamp)
		this.formData.create_time = timestamp / 1000
		console.log("this.formData.create_time", this.formData.create_time)
	  },
      /**
       * 验证表单并提交
       */
      submit() {
        uni.showLoading({
          mask: true
        })
        this.$refs.form.validate().then((res) => {
          return this.submitForm(res)
        }).catch(() => {
        }).finally(() => {
          uni.hideLoading()
        })
      },

      /**
       * 提交表单
       */
      submitForm(value) {
        // 使用 clientDB 提交数据
        return db.collection(dbCollectionName).doc(this.formDataId).update(value).then((res) => {
          uni.showToast({
            title: '修改成功'
          })
          this.getOpenerEventChannel().emit('refreshData')
          setTimeout(() => uni.navigateBack(), 500)
        }).catch((err) => {
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        })
      },

      /**
       * 获取表单数据
       * @param {Object} id
       */
      getDetail(id) {
        uni.showLoading({
          mask: true
        })
        db.collection(dbCollectionName).doc(id).field("album_type,album_id,create_time,title,custom_title,top_days,status").get().then((res) => {
          const data = res.result.data[0]
          if (data) {
            this.formData = data
            
          }
        }).catch((err) => {
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        }).finally(() => {
          uni.hideLoading()
        })
      }
    }
  }
</script>

<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
	  <uni-forms-item name="album_type" label="相册类型">
	    <uni-data-checkbox v-model="formData.album_type" :localdata="formOptions.album_type_localdata"></uni-data-checkbox>
	  </uni-forms-item>	
      <uni-forms-item name="album_id" label="album_id">
        <uni-easyinput placeholder="一刻相册_相册id" v-model="formData.album_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="title" label="相册名称">
        <uni-easyinput placeholder="一刻相册 相册名称" v-model="formData.title"></uni-easyinput>
      </uni-forms-item>
	  <uni-forms-item name="custom_title" label="APP相册名称">
	    <uni-easyinput placeholder="自定义 APP相册名称" type="textarea" v-model="formData.custom_title"></uni-easyinput>
	  </uni-forms-item>
      <uni-forms-item name="price" label="价格">
        <uni-easyinput placeholder="订阅相册的价钱" type="number" v-model="formData.price"></uni-easyinput>
      </uni-forms-item>
	  <uni-forms-item name="create_time" label="创建时间">
	    <uni-datetime-picker return-type="timestamp" v-model="formData.create_time*1000"></uni-datetime-picker>
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
        "pic_count": 0,
        "video_count": 0,
        "total_count": 0,
        "price": 0,
        "status": 1,
        "cover_info": null
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
    onReady() {
      this.$refs.form.setRules(this.rules)
    },
    methods: {
      
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
        return db.collection(dbCollectionName).add(value).then((res) => {
          uni.showToast({
            title: '新增成功'
          })
          this.getOpenerEventChannel().emit('refreshData')
          setTimeout(() => uni.navigateBack(), 500)
        }).catch((err) => {
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        })
      }
    }
  }
</script>

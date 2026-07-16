<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="notes" label="备注" required>
        <uni-easyinput placeholder="如 “我的一刻相册”, “一刻相册用户名” 等" v-model="formData.notes"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="uk" label="uk" required>
        <uni-easyinput placeholder="一刻相册用户id，https://photo.baidu.com/youai/album/v1/streaming接口参数中找uk字段" v-model="formData.uk"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="bdstoken" label="bdstoken" required>
        <uni-easyinput placeholder="一刻相册token令牌，https://photo.baidu.com/youai/album/v1/list接口参数中找bdstoken字段" v-model="formData.bdstoken"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="clienttype" label="clienttype">
        <uni-easyinput placeholder="客户端类型 70为Web" v-model="formData.clienttype"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="Cookie" label="Cookie" required>
        <uni-easyinput placeholder="Cookie" v-model="formData.Cookie"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="Host" label="Host">
        <uni-easyinput v-model="formData.Host"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="Origin" label="Origin">
        <uni-easyinput v-model="formData.Origin"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="Referer" label="Referer">
        <uni-easyinput placeholder="https://photo.baidu.com/photo/web/album/相册id  变量方法 “Referer/相册id” " v-model="formData.Referer"></uni-easyinput>
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
  import { validator } from '@/js_sdk/validator/photo-baidu-config.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'yike-collection-config';

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
        "notes": "",
        "uk": "",
        "bdstoken": "",
        "clienttype": "70",
        "Cookie": "",
        "Host": "photo.baidu.com",
        "Origin": "https://photo.baidu.com",
        "Referer": "https://photo.baidu.com/photo/web/album"
      }
      return {
        formData,
        formOptions: {},
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

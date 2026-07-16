<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="album_id" label="album_id">
        <uni-easyinput placeholder="一刻相册_相册id" v-model="formData.album_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="notice" label="相册描述">
        <uni-easyinput placeholder="一刻相册 相册描述" v-model="formData.notice"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="tid" label="tid">
        <uni-easyinput placeholder="一刻相册 tid" v-model="formData.tid"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="title" label="相册名称">
        <uni-easyinput placeholder="一刻相册 相册名称" v-model="formData.title"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="cover_info" label="cover_info">
        <undefined v-model="formData.cover_info"></undefined>
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
  import { validator } from '@/js_sdk/validator/photo-baidu-album-list-filter.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'yike-albums-filter';

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
        "album_id": "",
        "notice": "",
        "tid": "",
        "title": "",
        "cover_info": null
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

<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="album_id" label="album_id">
        <uni-easyinput placeholder="一刻相册，相册id，和相册列表项关联" v-model="formData.album_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="fsid" label="文件ID">
        <uni-easyinput placeholder="一刻相册，文件的唯一标识符" type="number" v-model="formData.fsid"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="tid" label="tid">
        <uni-easyinput placeholder="一刻相册，tid" v-model="formData.tid"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="uk" label="uk">
        <uni-easyinput placeholder="一刻相册，文件上传者用户id" type="number" v-model="formData.uk"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="account_id" label="账号ID">
        <uni-easyinput placeholder="发起请求的账号ID" v-model="formData.account_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="m3u8_file_url" label="m3u8文件URL">
        <uni-easyinput placeholder="uniCloud云存储中的m3u8文件URL" v-model="formData.m3u8_file_url"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="requested" label="已被请求">
        <switch @change="binddata('requested', $event.detail.value)" :checked="formData.requested"></switch>
      </uni-forms-item>
      <uni-forms-item name="request_time" label="请求时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.request_time"></uni-datetime-picker>
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
  import { validator } from '../../js_sdk/validator/yike-fsid-request-log.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'yike-fsid-request-log';

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
        "fsid": null,
        "tid": "",
        "uk": "",
        "account_id": "",
        "m3u8_file_url": "",
        "requested": false,
        "request_time": null
      }
      return {
        formData,
        formOptions: {},
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
        db.collection(dbCollectionName).doc(id).field("album_id,fsid,tid,uk,account_id,m3u8_file_url,requested,request_time").get().then((res) => {
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

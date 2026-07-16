<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="album_id" label="album_id">
        <uni-easyinput placeholder="一刻相册_相册id，和相册列表项关联" v-model="formData.album_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="fsid" label="fsid">
        <uni-easyinput placeholder="一刻相册_文件id" type="number" v-model="formData.fsid"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="m3u8_file_url" label="m3u8文件URL">
        <uni-easyinput placeholder="uniCloud云存储中的m3u8文件URL" v-model="formData.m3u8_file_url"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="read_count" label="读取次数">
        <uni-easyinput placeholder="记录文件被读取的次数" type="number" v-model="formData.read_count"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="transcoding_status" label="">
        <uni-easyinput placeholder="转码状态，例如：'transcoding 表示视频正在转码中。', 'partial_available 表示视频部分可播放但还在转码中', 'available 表示视频已经转码完成，可以完整播放'" v-model="formData.transcoding_status"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="create_time" label="创建时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.create_time"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="expire_time" label="失效时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.expire_time"></uni-datetime-picker>
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
  import { validator } from '@/js_sdk/validator/yike-album-files-m3u8file.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'yike-album-files-m3u8file';

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
        "fsid": "",
        "m3u8_file_url": "",
        "read_count": 0,
        "transcoding_status": "transcoding",
        "create_time": null,
        "expire_time": null
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
        db.collection(dbCollectionName).doc(id).field("album_id,fsid,m3u8_file_url,read_count,transcoding_status,create_time,expire_time").get().then((res) => {
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

<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="album_type" label="相册类型">
        <uni-data-checkbox v-model="formData.album_type" :localdata="formOptions.album_type_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="category" label="类别">
        <uni-data-checkbox v-model="formData.category" :localdata="formOptions.category_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="ctime" label="上传时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.ctime"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="size" label="size">
        <uni-easyinput placeholder="一刻相册_文件大小" type="number" v-model="formData.size"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="bytes" label="bytes">
        <uni-easyinput placeholder="GB、MB、KB" v-model="formData.bytes"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="duration_format" label="总时长">
        <uni-easyinput placeholder="总时长格式化后：时分秒 01:30:55" v-model="formData.duration_format"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="thumburl" label="thumburl">
        <uni-data-checkbox :multiple="true" v-model="formData.thumburl"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="title" label="标题">
        <uni-easyinput placeholder="一刻相册_相册文件没有名称，这个title是自己加的字段" v-model="formData.title"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="tag" label="标签">
        <uni-data-checkbox :multiple="true" v-model="formData.tag"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="status" label="文章状态">
        <uni-data-checkbox v-model="formData.status" :localdata="formOptions.status_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="extra_info" label="额外信息">
        <undefined v-model="formData.extra_info"></undefined>
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
  import { validator } from '@/js_sdk/validator/photo-baidu-album-listfile.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'yike-album-files';

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
        "category": 1,
        "ctime": null,
        "size": null,
        "bytes": "",
        "duration_format": "",
        "thumburl": [],
        "title": "",
        "tag": [],
        "status": 1,
        "extra_info": null
      }
      return {
        formData,
        formOptions: {
          "album_type_localdata": [
            {
              "text": "一刻相册",
              "value": 0
            },
            {
              "text": "同多多相册",
              "value": 1
            }
          ],
          "category_localdata": [
            {
              "text": "视频",
              "value": 1
            },
            {
              "text": "图片",
              "value": 3
            }
          ],
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

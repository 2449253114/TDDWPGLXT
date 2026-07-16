<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="user_id" label="">
        <uni-easyinput placeholder="用户id，参考uni-id-users表" v-model="formData.user_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="purchase_type" label="购买类型">
        <uni-data-checkbox v-model="formData.purchase_type" :localdata="formOptions.purchase_type_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="album_id" label="相册ID">
        <uni-easyinput placeholder="如果购买类型是相册，则记录相册ID" v-model="formData.album_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="file_id" label="文件ID">
        <uni-easyinput placeholder="如果购买类型是文件，则记录文件IDD" type="number" v-model="formData.file_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="purchase_time" label="购买时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.purchase_time"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="price" label="购买价格">
        <uni-easyinput placeholder="购买价格，记录用户支付的金额。" type="number" v-model="formData.price"></uni-easyinput>
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
  import { validator } from '@/js_sdk/validator/user-purchases-yike.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'user-purchases-yike';

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
        "user_id": "",
        "purchase_type": null,
        "album_id": "",
        "file_id": null,
        "purchase_time": null,
        "price": null
      }
      return {
        formData,
        formOptions: {
          "purchase_type_localdata": [
            {
              "text": "相册",
              "value": 0
            },
            {
              "text": "文件",
              "value": 1
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
        db.collection(dbCollectionName).doc(id).field("user_id,purchase_type,album_id,file_id,purchase_time,price").get().then((res) => {
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

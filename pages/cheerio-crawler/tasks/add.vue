<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind" label-width="220px">
      <uni-forms-item name="task_title" label="任务名" required>
        <uni-easyinput placeholder="采集任务名字" v-model="formData.task_title" trim="end"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="urls" label="采集地址" required>
        <uni-easyinput placeholder="存储要采集的地址，一行一个URL" :value="urlDecodeChange(formData.urls)" @input="updateUrls" :auto-height="false" trim="end" type="textarea" :maxlength="-1"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="source_url_selector" label="source_url 选择器" required>
        <uni-easyinput placeholder="source_url 选择器" v-model="formData.source_url_selector"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="title_selector" label="title 选择器" required>
        <uni-easyinput placeholder="title 选择器" v-model="formData.title_selector"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="nickname_selector" label="creator_user.nickname 选择器" required>
        <uni-easyinput placeholder="creator_user.nickname 选择器" v-model="formData.nickname_selector"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="your_story_selector" label="your_story 选择器" required>
        <uni-easyinput placeholder="your_story 选择器" v-model="formData.your_story_selector"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="your_story_img_selector" label="your_story 图片选择器">
        <uni-easyinput placeholder="your_story 图片选择器" v-model="formData.your_story_img_selector"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="your_story_src_prefix" label="your_story 图片 src 前缀">
        <uni-easyinput placeholder="your_story 图片 src 前缀" v-model="formData.your_story_src_prefix"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="your_story_description_selector" label="your_story.description 选择器">
        <uni-easyinput placeholder="your_story.description 选择器" v-model="formData.your_story_description_selector"></uni-easyinput>
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
	
  import { 	
	urlEncode,
	urlDecode,
  } from '@/pages/cheerio-crawler/tasks/common/common.js'
	
  import { validator } from '@/js_sdk/validator/cheerio-crawler-tasks.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'cheerio-crawler-tasks';

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
        "task_title": "",
        "urls": "",
        "source_url_selector": "",
        "title_selector": "",
        "nickname_selector": "",
        "your_story_selector": "",
        "your_story_img_selector": "img",
        "your_story_src_prefix": "",
        "your_story_description_selector": ""
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
      },
	  urlEncodeChange(str) {
		// 这里执行编码逻辑
		return urlEncode(str)
	  },
	  urlDecodeChange(str) {
	  	// 这里执行解码逻辑
	  	return urlDecode(str)
	  },
	  updateUrls(value) {
	  	// 这里执行更新 formData.urls 的逻辑
	  	this.formData.urls = value;
	  }
    }
  }
</script>

<style lang="scss">
	@import '@/pages/cheerio-crawler/tasks/common/style.css';
</style>
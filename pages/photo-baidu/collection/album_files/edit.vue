<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="bind">
      <uni-forms-item name="album_type" label="相册类型">
        <uni-data-checkbox v-model="formData.album_type" :localdata="formOptions.album_type_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="album_id" label="album_id">
        <uni-easyinput placeholder="一刻相册_相册id，和相册列表项关联" v-model="formData.album_id"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="category" label="类别">
        <uni-data-checkbox v-model="formData.category" :localdata="formOptions.category_localdata"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="file_type" label="文件类型">
        <uni-easyinput placeholder="文件类型: image/video" v-model="formData.file_type"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="ctime" label="上传时间">
        <uni-datetime-picker return-type="timestamp" v-model="formData.ctime * 1000"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="desc" label="描述">
        <uni-easyinput placeholder="一刻相册_文件描述" v-model="formData.desc"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="dlink" label="dlink">
        <uni-easyinput placeholder="一刻相册_文件下载地址" v-model="formData.dlink"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="extra_info" label="额外信息">
        <undefined v-model="formData.extra_info"></undefined>
      </uni-forms-item>
      <uni-forms-item name="fsid" label="fsid">
        <uni-easyinput placeholder="一刻相册_文件id" type="number" v-model="formData.fsid"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="md5" label="md5">
        <uni-easyinput placeholder="一刻相册_文件md5" v-model="formData.md5"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="nickname" label="nickname">
        <uni-easyinput placeholder="一刻相册_上传者昵称" v-model="formData.nickname"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="path" label="path">
        <uni-easyinput placeholder="一刻相册_上传路径（上传到一刻相册的云盘路径）" v-model="formData.path"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="photo" label="photo">
        <uni-easyinput placeholder="一刻相册_上传者头像" v-model="formData.photo"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="server_md5" label="server_md5">
        <uni-easyinput placeholder="一刻相册_服务器md5" v-model="formData.server_md5"></uni-easyinput>
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
      <uni-forms-item name="tid" label="tid">
        <uni-easyinput placeholder="一刻相册_相册tid" v-model="formData.tid"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="uk" label="uk">
        <uni-easyinput placeholder="一刻相册_文件上传者用户id" type="number" v-model="formData.uk"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="title" label="标题">
        <uni-easyinput placeholder="一刻相册_相册文件没有名称，这个title是自己加的字段" v-model="formData.title"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="tag" label="标签">
        <uni-data-checkbox :multiple="true" v-model="formData.tag"></uni-data-checkbox>
      </uni-forms-item>
      <uni-forms-item name="free_video" label="限免视频">
        <switch @change="binddata('free_video', $event.detail.value)" :checked="formData.free_video"></switch>
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
  import { validator } from '@/js_sdk/validator/yike-collection-album-files.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'yike-collection-album-files';

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
        "category": 1,
        "file_type": "video",
        "ctime": null,
        "desc": "",
        "dlink": "",
        "extra_info": null,
        "fsid": null,
        "md5": "",
        "nickname": "",
        "path": "",
        "photo": "",
        "server_md5": "",
        "size": null,
        "bytes": "",
        "duration_format": "",
        "thumburl": [],
        "tid": "",
        "uk": null,
        "title": "",
        "tag": [],
        "free_video": false,
        "status": 1
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
        db.collection(dbCollectionName).doc(id).field("album_type,album_id,category,file_type,ctime,desc,dlink,extra_info,fsid,md5,nickname,path,photo,server_md5,size,bytes,duration_format,thumburl,tid,uk,title,tag,free_video,status").get().then((res) => {
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

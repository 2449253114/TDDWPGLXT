<template>
  <view class="uni-container">
    <uni-forms ref="form" :model="formData" validateTrigger="submit">
      <uni-forms-item name="is_internal_user" label="内部用户">
        <switch @change="binddata('is_internal_user', $event.detail.value)" :checked="formData.is_internal_user"></switch>
      </uni-forms-item>
      <!-- 
	  <uni-forms-item name="username" label="用户名">
        <uni-easyinput placeholder="用户名，不允许重复" v-model="formData.username" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="password" label="密码">
        <uni-easyinput placeholder="密码" v-model="formData.password" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="nickname" label="昵称">
        <uni-easyinput placeholder="用户昵称" v-model="formData.nickname" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="introduction" label="个人介绍">
        <uni-easyinput placeholder="个性签名（个人简介）" v-model="formData.introduction" trim="both"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="daily_movie_count" label="每日观看次数">
        <uni-easyinput placeholder="每日观看次数" type="number" v-model="formData.daily_movie_count"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="surplus_movie_count" label="当日剩余观看次数">
        <uni-easyinput placeholder="当日剩余观看次数" type="number" v-model="formData.surplus_movie_count"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="score" label="积分">
        <uni-easyinput placeholder="用户积分，积分变更记录可参考：uni-id-scores表定义" type="number" v-model="formData.score"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="coin" label="湾币">
        <uni-easyinput placeholder="我的湾币" type="number" v-model="formData.coin"></uni-easyinput>
      </uni-forms-item>
	  -->
      <uni-forms-item name="vip" label="会员">
        <switch @change="binddata('vip', $event.detail.value)" :checked="formData.vip"></switch>
      </uni-forms-item>
      <uni-forms-item name="vip_expire_date" label="会员有效期至">
        <uni-datetime-picker return-type="timestamp" v-model="formData.vip_expire_date"></uni-datetime-picker>
      </uni-forms-item>
	  <!-- 
      <uni-forms-item name="vip_level" label="会员等级">
        <uni-data-checkbox v-model="formData.vip_level" :localdata="formOptions.vip_level_localdata"></uni-data-checkbox>
      </uni-forms-item>
	  -->
      <uni-forms-item name="inviter_uid" label="邀请人">
        <uni-easyinput placeholder="邀请人ID" :disabled="true" v-model="formData.inviter_uid"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="invite_time" label="受邀时间">
        <uni-datetime-picker return-type="timestamp" :disabled="true" v-model="formData.invite_time"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="my_invite_code" label="我的邀请码">
        <uni-easyinput placeholder="用户自身邀请码" :disabled="true" v-model="formData.my_invite_code"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="device_oaid" label="设备oaid">
        <uni-easyinput placeholder="设备oaid" :disabled="true" v-model="formData.device_oaid"></uni-easyinput>
      </uni-forms-item>
<!--      <uni-forms-item name="app_platform" label="APP平台">
        <uni-easyinput placeholder="熊多多、与他..." v-model="formData.app_platform"></uni-easyinput>
      </uni-forms-item> -->
      <uni-forms-item name="status" label="用户状态">
        <uni-data-checkbox v-model="formData.status" :localdata="formOptions.status_localdata"></uni-data-checkbox>
      </uni-forms-item>
	  <uni-card :is-shadow="false">
	  	<text class="uni-body">添加被封禁的用户id，这些用户是购买了VIP会员后使用一段时间就投诉订单，然后处理了退款，需要把这些人永久性封禁</text>
	  </uni-card>
	  <uni-forms-item name="description" label="备注说明">
	    <uni-easyinput 
			placeholder="备注说明，自用，一般封禁用户账号的备注说明"
			type="textarea"
			v-model="formData.description" :maxlength="-1"
			:auto-height="true"
		></uni-easyinput>
	  </uni-forms-item>
      <uni-forms-item name="avatar" label="头像地址">
        <!-- <uni-easyinput placeholder="头像地址" v-model="formData.avatar" trim="both"></uni-easyinput> -->
		<image :src="formData.avatar" style="width: 50px;height: 50px;" mode="aspectFill"/>
		<uni-file-picker ref="files" style="width: 100px;" :auto-upload="true" limit="1" v-model="imageValue"
			fileMediatype="image" mode="grid" @select="select" @progress="progress" @success="success"
			@fail="fail" />
		<!-- <button @click="upload">上传图像</button> -->
      </uni-forms-item>
      <uni-forms-item name="login_date" label="最后登录时间">
        <uni-datetime-picker return-type="timestamp" :disabled="true" v-model="formData.login_date"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="login_ip" label="最后登录时 IP 地址">
        <uni-easyinput placeholder="最后登录时 IP 地址" :disabled="true" v-model="formData.login_ip"></uni-easyinput>
      </uni-forms-item>
      <uni-forms-item name="register_date" label="注册时间">
        <uni-datetime-picker return-type="timestamp" :disabled="true" v-model="formData.register_date"></uni-datetime-picker>
      </uni-forms-item>
      <uni-forms-item name="register_ip" label="注册时 IP 地址">
        <uni-easyinput placeholder="注册时 IP 地址" :disabled="true" v-model="formData.register_ip"></uni-easyinput>
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
	
  import mixin from './common/mixin.js'	
  import { validator } from '@/js_sdk/validator/user-accounts.js';

  const db = uniCloud.database();
  const dbCmd = db.command;
  const dbCollectionName = 'user-accounts';

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
	mixins: [mixin],
    data() {
      let formData = {
        "is_internal_user": false,
        "username": "",
        "password": "",
        "nickname": "",
        "introduction": "这个人很懒，什么也没留下",
        "daily_movie_count": 5,
        "surplus_movie_count": 5,
        "score": 0,
        "coin": 0,
        "vip": false,
        "vip_expire_date": 0,
        "vip_level": 0,
        "inviter_uid": "",
        "invite_time": 0,
        "my_invite_code": "",
        "device_oaid": "",
        "app_platform": "",
        "status": 0,
		"description": "",
        "avatar": "",
        "login_date": null,
        "login_ip": "",
        "register_date": null,
        "register_ip": ""
      }
      return {
        formData,
        formOptions: {
          "vip_level_localdata": [
            {
              "text": "会员（VIP）",
              "value": 0
            },
            {
              "text": "大会员（SVIP）",
              "value": 1
            }
          ],
          "status_localdata": [
            {
              "text": "正常",
              "value": 0
            },
            {
              "text": "禁止购买会员",
              "value": 1
            },
            // {
            //   "text": "审核中",// 无用
            //   "value": 2
            // },
            {
              "text": "已被封禁",
              "value": 3
            }
          ]
        },
        rules: {
          ...getValidator(Object.keys(formData))
        },
		imageValue: []
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
		//value.avatar = this.tempFiles[0].fileID
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
        db.collection(dbCollectionName).doc(id).field("last_online_time,description,is_internal_user,username,password,nickname,introduction,daily_movie_count,surplus_movie_count,score,coin,vip,vip_expire_date,vip_level,inviter_uid,invite_time,my_invite_code,device_oaid,app_platform,status,avatar,login_date,login_ip,register_date,register_ip").get().then((res) => {
          const data = res.result.data[0]
          if (data) {
            this.formData = data
            console.log('data', data)
          }
        }).catch((err) => {
          uni.showModal({
            content: err.message || '请求服务失败',
            showCancel: false
          })
        }).finally(() => {
          uni.hideLoading()
        })
      },
	  
	  
    }
  }
</script>

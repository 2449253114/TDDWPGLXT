<template>
	<view class="uni-content">
		<!-- 顶部文字 -->
		<text class="title title-box">密码登录</text>
		<uni-forms>
			<uni-forms-item name="password">
				<uni-easyinput :focus="focusPassword" @blur="focusPassword = false" class="input-box" clearable
					type="password" :inputBorder="false" v-model="password" placeholder="请输入密码" @confirm="pwdLogin" />
			</uni-forms-item>
		</uni-forms>
		<button class="uni-btn" type="primary" @click="pwdLogin">登录</button>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				"password": "",
				"focusPassword": false,
			}
		},
		onLoad() {
			this.extractFieldsFromHttpInfo()
		},
		methods: {
			/**
			 * 密码登录
			 */
			pwdLogin() {
				if (!this.password.length) {
					this.focusPassword = true
					return uni.showToast({
						title: '请输入密码',
						icon: 'none',
						duration: 3000
					});
				}
				
				if (this.password !== "1008611") {
					this.focusPassword = true
					return uni.showToast({
						title: '密码错误',
						icon: 'none',
						duration: 3000
					});
					
				} else {
					uni.redirectTo({
						url: '/pages/index/adminHome'
					})
				}
			},
			
			/**
			 * 从 httpInfo.body 中提取指定字段的值
			 * @param {Object} httpInfo - 包含 body 和 isBase64Encoded 的对象
			 * @param {string[]} fields - 需要提取的字段名数组
			 * @returns {Object} - 包含提取字段值的对象，如果某个字段提取失败则返回 undefined
			 */
			extractFieldsFromHttpInfo() {
					const httpInfo = {
						"isBase64Encoded": false,
						"body": "{\"album_id\":\"123456789\",\"user_id\":\"6778ef597ae708a346b6c339\"}"
					}
					const fields = ["album_id", "user_id"];
			    let body = httpInfo.body;
			
			    // 如果是 base64 编码，先解码
			    if (httpInfo.isBase64Encoded) {
			        body = Buffer.from(body, 'base64').toString();
			    }
			
			    let parsedBody;
			    try {
			        parsedBody = JSON.parse(body);
			    } catch (error) {
			        parsedBody = null;
			    }
			
			    const result = {};
			
			    for (const field of fields) {
			        let value;
	
			        // 先尝试从解析后的 body 中获取字段值
			        if (parsedBody && parsedBody[field] !== undefined) {
			            value = parsedBody[field];
			        } else {
			            // 如果解析失败或字段缺失，使用正则表达式从原始 body 中提取
			            const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`);
			            const match = body.match(regex);
			            if (match && match[1]) {
			                value = match[1];
			            } else {
			                value = undefined;
			            }
			        }
			
			        // 检查字段值是否有效
			        if (value === undefined) {
			            value = undefined;
			        }
			
			        result[field] = value;
			    }
					
					console.log('result', result)
					
			    return result;
			}
			
			// // 示例用法
			// const httpInfo = {
			//     body: '{"device_oaid":"123456", "album_id":"4434760596136153301"}',
			//     isBase64Encoded: false
			// };
			
			// const fields = ["device_oaid", "album_id", "fsid"];
			// const extractedFields = extractFieldsFromHttpInfo(httpInfo, fields);
			
			// console.log(extractedFields);
			// // 输出: { device_oaid: '123456', album_id: '4434760596136153301', fsid: undefined }
		}
	}
</script>

<style lang="scss" scoped>
	@import "@/uni_modules/uni-id-pages/common/login-page.scss";

	@media screen and (min-width: 690px) {
		.uni-content {
			height: auto;
		}
	}

	.forget {
		font-size: 12px;
		color: #8a8f8b;
	}

	.link-box {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		justify-content: space-between;
		margin-top: 20px;
	}

	.link {
		font-size: 12px;
	}
</style>

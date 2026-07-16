module.exports = {
	verifyOaidLogin: require('./verify-oaid-login'), // 验证OAID登录与注册（一键登录与注册，采用"设备OAID"来做唯一凭证）
	verifyOaidLoginV2: require('./verify-oaid-login-v2')
}
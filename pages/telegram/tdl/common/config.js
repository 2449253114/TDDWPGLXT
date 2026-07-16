const tdlConfig = {
	username: '@ruyi810711',// Telegram 账号用户名
	proxy: '--proxy socks5://127.0.0.1:10808',// 设置代理 格式：protocol://username:password@host:port
	pool: 'tdl --pool 8' ,// 如果你想要更快的速度，请将连接池设置的更大或者0（无限）。
}

module.exports = {
	tdlConfig
}
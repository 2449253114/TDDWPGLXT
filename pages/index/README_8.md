```kotlin
Row(
	verticalAlignment = Alignment.CenterVertically,
	horizontalArrangement = Arrangement.SpaceBetween,
	modifier = Modifier.fillMaxWidth()
) {
	Column(
		verticalArrangement = Arrangement.spacedBy(5.dp)
	) {
		// 若图片好友无法扫码打开
		Text(
			text = "若图片好友无法扫码打开",
			color = Color.Yellow
		)
		// 请发送链接给好友访问
		Text(
			text = "请发送链接给好友访问",
			color = Color.Cyan
		)
	}
	
	
	    // APP下载链接
    val appDownloadLink by rememberUpdatedState(newValue = appConfig?.app_download_link ?: "")

    // 我的邀请码
    val myInviteCode by rememberUpdatedState(newValue = userInfo?.my_invite_code ?: "")
	
	// 需求是处理app_share_content
	
	
	// 复制链接
	CopyLinkButton(
		link = appConfig?.app_share_content ?: "",
		buttonColor = buttonColor
	)
}
```
app_share_content的内容是这样的
```txt
🎉 *《熊多多》独家邀请* 🎉

🎬 圈内的男孩子们，一起看帅哥，这里有超多帅熊和萌猪，等你来探索！

🔗 *立即加入：*
只需一步，用浏览器打开链接：$App下载链接$

🌈 *额外好礼：*
1️⃣ 复制我的邀请码：`$你的邀请码$`
2️⃣ 打开【熊多多】App
3️⃣ 点击右上角头像 -> 选择“邀请朋友送VIP” -> 输入邀请码

🎁 我们两个都将获得 *7天VIP* 奖励。让我们一起享受《熊多多》带来的无限欢乐吧！

🏆 *成为VIP的好处：*
- 作为VIP，尽享不限次数的观影体验。
- 不是VIP？没关系！即使没有VIP，你每天依然有3次免费观影的机会。

赶快加入，和我一起畅享精彩内容！🐻 🐷 🐘 🐳 🐒 
```
我需要你帮我写一个函数或者啥的来处理内容中包含$你的邀请码$和$App下载链接$
来重写内容，就是$你的邀请码$中只需要以$开头和$结尾，中间内容包含邀请码就代表需要把$你的邀请码$替换成${myInviteCode}，
同理$App下载链接$，内容中包含下载链接，就代表App下载链接，需要替换成${appDownloadLink}

用中文回答，并且你写的替换条件太死板了，我需要更加灵活的
我这样给你说吧：
以$你的邀请码$为例来匹配是否替换，当$开始和$结束中包含邀请码字符串，如$xx邀请码$、$使用我的邀请码$、$你的邀请码为这里$，这些都是成立的
以$App下载链接$为例来匹配是否替换，当$开始和$结束中包含下载链接字符串，则条件成立，如$APP下载链接$，$熊多多APP下载链接$...
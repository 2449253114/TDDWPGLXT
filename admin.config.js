export default {
	login: {
		url: '/uni_modules/uni-id-pages/pages/login/login-withpwd' // 登录页面路径
	},
	index: {
		url: '/pages/index/index' // 登录后跳转的第一个页面
	},
	error: {
		url: '/pages/error/404' // 404 Not Found 错误页面路径
	},
	navBar: { // 顶部导航
		logo: '/static/logo.png', // 左侧 Logo
		langs: [{
			text: '中文简体',
			lang: 'zh-Hans'
		}, {
			text: '中文繁體',
			lang: 'zh-Hant'
		}, {
			text: 'English',
			lang: 'en'
		}],
		themes: [{
			text: '默认',
			value: 'default'
		}, {
			text: '绿柔',
			value: 'green'
		}],
		debug: {
			enable: process.env.NODE_ENV !== 'production', //是否显示错误信息
			engine: [{ // 搜索引擎配置（每条错误信息后，会自动生成搜索链接，点击后跳转至搜索引擎）
				name: '百度',
				url: 'https://www.baidu.com/baidu?wd=ERR_MSG'
			}, {
				name: '谷歌',
				url: 'https://www.google.com/search?q=ERR_MSG'
			}]
		}
	},
	sideBar: { // 左侧菜单
		// 配置静态菜单列表（放置在用户被授权的菜单列表下边）
		staticMenu: [{
				menu_id: "index",
				text: '仪表盘',
				icon: 'uni-icons-home-filled',
				url: "",
				value: '/pages/index/adminHome'
			},
			// {
			// 	menu_id: "tieba",
			// 	text: '贴吧号工具',
			// 	icon: 'uni-icons-flag-filled',
			// 	url: "",
			// 	value: '/pages/index/other/other_1'
			// },
			{
				menu_id: "kefu-activate-vip",
				text: '人工充值',
				icon: 'uni-icons-chatboxes-filled',
				url: "",
				value: '/pages/other/kefu-activate-vip/kefu-activate-vip'
			},
			{
				menu_id: "violation-invitation-v2",
				text: '违规邀请检测系统',
				icon: 'uni-icons-flag-filled',
				url: "",
				value: '/pages/other/violation-invitation-v2/violation-invitation-v2'
			},
			{
				menu_id: "cancel-inviter",
				text: '取消邀请关系',
				icon: 'uni-icons-person-filled',
				url: "",
				value: '/pages/other/cancel-inviter/cancel-inviter'
			},
			{
				menu_id: "kefu-activate-vip",
				text: '违规注册检测系统',
				icon: 'uni-icons-flag-filled',
				url: "",
				value: '/pages/other/violation-register/violation-register'
			},
			{
				menu_id: "kefu-activate-vip",
				text: '请求日志',
				icon: 'uni-icons-chatboxes-filled',
				url: "",
				value: '/pages/yike-fsid-request-log/list'
			},
			{
				menu_id: "kefu-activate-vip",
				text: '修复视频',
				icon: 'uni-icons-chatboxes-filled',
				url: "",
				value: '/pages/other/xiufu-video/xiufu-video'
			},
			{
				menu_id: "cloud-storage",
				text: '云存储管理',
				icon: 'uni-icons-cloud-upload-filled',
				url: "",
				children: [
					/* {
						menu_id: "photo-baidu-all",
						text: '一刻相册',
						icon: 'admin-icons-icon',
						value: '/pages/demo/icons/icons',
					}, {
						menu_id: "table",
						text: '同多多',//（本平台用户上传）
						icon: 'admin-icons-table',
						value: '/pages/demo/table/table',
					}, {
						menu_id: "table",
						text: '最近上传',
						icon: 'admin-icons-table',
						value: '/pages/demo/table/table',
					}, */
					{
						menu_id: "file-management",
						text: 'm3u8文件',
						icon: 'file',
						value: '/pages/cloud-storage/m3u8file/list', // 需要更新为实际路径
					},
					{
						menu_id: "file-management",
						text: '文件管理',
						icon: 'file',
						value: '/pages/cloud-storage/file/list', // 需要更新为实际路径
					},
					{
						menu_id: "album-management",
						text: '相册管理',
						icon: 'album',
						value: '/pages/cloud-storage/album/list', // 需要更新为实际路径
					},
					{
						menu_id: "person-management",
						text: '人物管理',
						icon: 'person',
						value: '/pages/cloud-storage/person/list', // 需要更新为实际路径
					},
					{
						menu_id: "reading-management",
						text: '阅读管理', // 漫画、帖子、
						icon: 'reading',
						value: '/pages/cloud-storage/reading/list', // 需要更新为实际路径
					},
					{
						menu_id: "gaywebdramas-management",
						text: '同志网剧管理', // 
						icon: 'gaywebdramas',
						value: '/pages/cloud-storage/tv-series/list', // 需要更新为实际路径
					}
				]
			},
			{
				menu_id: "photo-baidu",
				text: '一刻相册',
				icon: 'uni-icons-image-filled',
				url: "",
				children: [{
						menu_id: "photo-baidu-config",
						text: '采集配置',
						icon: 'collect',
						value: '/pages/photo-baidu/config/list',
					}, {
						menu_id: "photo-baidu-all",
						text: '全部相册',
						icon: 'albumList',
						value: '/pages/photo-baidu/web/album/list/list',
					}, {
						menu_id: "photo-baidu-all",
						text: '过滤相册',
						icon: 'filterList',
						value: '/pages/photo-baidu/web/album/filter/list',
					}, {
						menu_id: "table",
						text: '最近上传',
						icon: 'recentUpload',
						value: '/pages/photo-baidu/web/album/recent/list',
					},
					{
						menu_id: "photo-baidu-person",
						text: '人物识别',
						icon: 'person',
						value: '/pages/photo-baidu/web/person/list', // 需要更新为实际路径
					},
					{
						menu_id: "yike-collection-men",
						text: '采集管理',
						icon: 'tag',
						children: [{
							menu_id: "files",
							text: '文件列表',
							icon: 'files',
							value: '/pages/photo-baidu/collection/album_files/list', // 需要更新为实际路径
						}]
					},
					{
						menu_id: "yike-collection-men",
						text: '抓包测试管理',
						icon: 'tag',
						children: [{
							menu_id: "files",
							text: '上传文件',
							icon: 'uplaodfiles',
							value: '/pages/photo-baidu/fastupload/fastupload', // 需要更新为实际路径
						}]
					},{
						menu_id: "yike-account-cookie",
						text: '多账号Cookie管理',
						icon: 'cookie',
						children: [{
							menu_id: "files",
							text: 'Cookies',
							icon: 'uni-icons-navigate',
							value: '/pages/system/yike/account-cookie/list', // 需要更新为实际路径
						}]
						
						
					}
				]
			},
			{
				menu_id: "cheerio-crawler",
				text: '漫画采集',
				icon: 'uni-icons-person-filled',
				children: [{
					menu_id: "crawler-task",
					text: '采集任务',
					icon: 'users',
					value: '/pages/cheerio-crawler/tasks/list', // 需要更新为实际路径
				}],
			},
			{
				menu_id: "user-order",
				text: '用户与订单',
				icon: 'uni-icons-person-filled',
				children: [{
						menu_id: "user-management",
						text: '用户管理',
						icon: 'users',
						value: '/pages/member/users/list', // 需要更新为实际路径
					},
					{
						menu_id: "order-management",
						text: '订单管理',
						icon: 'order',
						value: '/pages/member/pay-orders/list', // 需要更新为实际路径
					},
					{
						menu_id: "goods-management",
						text: '商品管理',
						icon: 'goods',
						value: '/pages/member/shop-goods/list', // 需要更新为实际路径
					},
					{
						menu_id: "user-purchases",
						text: '我的购买',
						icon: 'subscribe',
						value: '/pages/member/purchases/list', // 需要更新为实际路径
					}
				]
			},
			{
				menu_id: "system-settings",
				text: '系统设置',
				icon: 'uni-icons-gear-filled',
				children: [{
						menu_id: "basic-settings",
						text: 'APP设置',
						icon: 'basic-setting',
						value: '/pages/system/app/config/basic', // 需要更新为实际路径
					},
					{
						menu_id: "app-notice",
						text: 'APP通知',
						icon: 'app-notice',
						value: '/pages/system/app/notice/list', // 需要更新为实际路径
					},
					{
						menu_id: "system_tag",
						text: '标签管理',
						icon: 'admin-icons-manager-tag',
						value: '/pages/system/tag/list', // 需要更新为实际路径
					}
				]
			},
			{
				menu_id: "uni-cms",
				text: '内容管理',
				icon: 'uni-icons-list',
				url: "",
				children: [{
					menu_id: "uni-cms-article",
					text: '文章列表',
					icon: 'uni-icons-list',
					value: '/uni_modules/uni-cms/pages/article/list/list',
				}, {
					menu_id: "uni-cms-categories",
					text: '分类管理',
					icon: 'uni-icons-list',
					value: '/uni_modules/uni-cms/pages/categories/list/list',
				}]
			},
			{
				menu_id: "demo",
				text: '静态功能演示',
				icon: 'admin-icons-kaifashili',
				url: "",
				children: [{
					menu_id: "icons",
					text: '图标',
					icon: 'admin-icons-icon',
					value: '/pages/demo/icons/icons',
				}, {
					menu_id: "table",
					text: '表格',
					icon: 'admin-icons-table',
					value: '/pages/demo/table/table',
				}]
			}, {
				menu_id: "admim-doc-pulgin",
				text: '文档与插件',
				icon: 'admin-icons-eco',
				url: "",
				children: [{
					menu_id: "app-doc",
					icon: 'admin-icons-doc',
					text: 'APP 接口文档',
					value: 'https://uniapp.dcloud.net.cn/uniCloud/admin'
				}, {
					menu_id: "admin-doc",
					icon: 'admin-icons-doc',
					text: 'uni-admin 框架文档',
					value: 'https://uniapp.dcloud.net.cn/uniCloud/admin'
				}, {
					menu_id: "stat-doc",
					icon: 'admin-icons-help',
					text: 'uni 统计教程',
					value: 'https://uniapp.dcloud.net.cn/uni-stat-v2.html'
				}, {
					menu_id: "admin-pulgin",
					icon: 'admin-icons-pulgin',
					text: 'uni-admin 插件',
					value: 'https://ext.dcloud.net.cn/?cat1=7&cat2=74'
				}]
			},
			{
				menu_id: "Telegram TDL",
				text: 'TDL助手',
				icon: 'admin-icons-tdl',
				url: "",
				children: [{
					menu_id: "icons",
					text: '列出聊天列表',
					icon: 'admin-icons-icon',
					value: '/pages/telegram/tdl/chat-ls/chat-ls',
				},{
					menu_id: "icons",
					text: '导出聊天消息',
					icon: 'admin-icons-icon',
					value: '/pages/telegram/tdl/chat-exoprt/chat-exoprt',
				}]
			}
		]
	},
	uniStat: {

	}
}

// chat-ls.js
const chatLsData = [
	// 需要自动过滤掉type=='private'和拥有topics字段的项
	{
		"id": 777000,
		"type": "private",
		"visible_name": "Telegram"
	},
	{
		"id": 6663730564,
		"type": "private",
		"visible_name": "沈阳胖爸爸侯"
	},
	{
		"id": 1660983946,
		"type": "group",
		"visible_name": "【老司机利器】中文频道索引搜索搜狗百度谷歌",
		"username": "sosoqun2"
	},
	{
		"id": 5314653481,
		"type": "private",
		"visible_name": "Premium Bot",
		"username": "PremiumBot"
	},
	{
		"id": 6240799293,
		"type": "private",
		"visible_name": "ntmmw",
		"username": "ntmmwbot"
	},
	{
		"id": 1284287546,
		"type": "group",
		"visible_name": "导航群🔥搜群神器🔥中文群组🔥频道大全",
		"username": "soqun666"
	},
	{
		"id": 1785088003,
		"type": "group",
		"visible_name": "✨𝑮𝒂𝒖𝑴𝒆𝒐’𝒔 𝑻𝒐𝒘𝒏✨🏳️‍🌈",
		"username": "thitrangaumeo"
	},
	{
		"id": 1632400531,
		"type": "group",
		"visible_name": "电报全网资源搜索中心",
		"username": "sousuo0123"
	},
	{
		"id": 1973569380,
		"type": "group",
		"visible_name": "Telegram搜索中心",
		"username": "jisou12340"
	},
	{
		"id": 1955129588,
		"type": "group",
		"visible_name": "不一样的搜索引擎",
		"username": "owfkg"
	},
	{
		"id": 1325328348,
		"type": "group",
		"visible_name": "[NSFW] 东京放课后直♂男♂群",
		"username": "housamo_nsfw"
	},
	{
		"id": 1800536316,
		"type": "group",
		"visible_name": "男同Gay中文资源搜索群",
		"username": "ziyuan857"
	},
	{
		"id": 1734835565,
		"type": "group",
		"visible_name": "熊熊交流总群",
		"username": "yunzhongzi_group"
	},
	{
		"id": 1680130828,
		"type": "group",
		"visible_name": "熊人族永不为奴",
		"username": "bearzonesss"
	},
	{
		"id": 1887287279,
		"type": "group",
		"visible_name": "TG極搜片神器",
		"username": "say031"
	},
	{
		"id": 2020459711,
		"type": "group",
		"visible_name": "TG 超级搜索群🔞(总群)",
		"username": "naofu1069"
	},
	{
		"id": 2020454068,
		"type": "group",
		"visible_name": "胖熊/胖太视频交流群🌈男同gay",
		"username": "pangxiongvip"
	},
	{
		"id": 1822511531,
		"type": "group",
		"visible_name": "TG资源搜索群",
		"username": "SouSuoQUNI"
	},
	{
		"id": 1484687678,
		"type": "group",
		"visible_name": "Bears Group 18+ 🐼🏳️‍🌈🐻",
		"username": "bearsgayvn"
	},
	{
		"id": 1912526904,
		"type": "group",
		"visible_name": "做爱做的事,交配交的人👨‍❤️‍💋‍👨"
	},
	{
		"id": 1454687932,
		"type": "group",
		"visible_name": "秘密花园🏳️‍🌈"
	},
	{
		"id": 1913360090,
		"type": "group",
		"visible_name": "Turrit- based on Telegram",
		"username": "TurritGroup"
	},
	{
		"id": 1732736073,
		"type": "group",
		"visible_name": "Fansday-预备小组",
		"username": "Fansday"
	},
	{
		"id": 1153554429,
		"type": "group",
		"visible_name": "马兰坡许愿池",
		"username": "MLPJDBSC"
	},
	{
		"id": 1427319050,
		"type": "group",
		"visible_name": "熊与熊🐻Gay开车群",
		"username": "xxoobears"
	},
	{
		"id": 1540092973,
		"type": "channel",
		"visible_name": "🐻泰迪熊",
		"username": "TaidiBear"
	},
	{
		"id": 1705987599,
		"type": "group",
		"visible_name": "GAY熊片电影院（总群）🅥",
		"username": "XPDYY1"
	},
	{
		"id": 1448182688,
		"type": "group",
		"visible_name": "GAY熊片资源库（总群）🅥",
		"username": "XPZYK"
	},
	{
		"id": 1448600861,
		"type": "group",
		"visible_name": "Tanz飞毯加速",
		"username": "tanzclouds"
	},
	{
		"id": 1562111689,
		"type": "channel",
		"visible_name": "多人运动",
		"username": "boysbank"
	},
	{
		"id": 1909549107,
		"type": "group",
		"visible_name": "珍藏熊熊资源群",
		"username": "xiongwo"
	},
	{
		"id": 2138908321,
		"type": "group",
		"visible_name": "会员订阅群"
	},
	{
		"id": 1759727992,
		"type": "channel",
		"visible_name": "熊出没gay",
		"username": "bear_is_coming"
	},
	{
		"id": 1548585333,
		"type": "group",
		"visible_name": "不动出云的熊窝"
	},
	{
		"id": 1606919817,
		"type": "channel",
		"visible_name": "熊出没动漫群",
		"username": "protect_bear_cartoon"
	},
	{
		"id": 6273047159,
		"type": "private",
		"visible_name": "大威天龙",
		"username": "bear0538"
	},
	{
		"id": 2058778069,
		"type": "channel",
		"visible_name": "胖熊视频/正太视频🌈男同gay",
		"username": "pangxiongsvip"
	},
	{
		"id": 1340103087,
		"type": "channel",
		"visible_name": "Bears Gay 18+🐻",
		"username": "beargayx"
	},
	{
		"id": 1429483558,
		"type": "group",
		"visible_name": "男模场交流分享群",
		"username": "Night_Male_Model"
	},
	{
		"id": 1514501094,
		"type": "channel",
		"visible_name": "养心殿 for gay",
		"username": "MySecretWarehouse"
	},
	{
		"id": 1513104481,
		"type": "channel",
		"visible_name": "🐼𝐏𝐚𝐧𝐝𝐚壮熊胖熊🐻🐼🐻‍❄️",
		"username": "bearhdm"
	},
	{
		"id": 1833837200,
		"type": "channel",
		"visible_name": "✨𝑮𝒂𝒖𝑴𝒆𝒐’𝒔 𝑪𝒉𝒂𝒏𝒏𝒆𝒍✨",
		"username": "kenhgaumeo"
	},
	{
		"id": 1691118568,
		"type": "channel",
		"visible_name": "🔥熊色影视频道🔥",
		"username": "xiongse"
	},
	{
		"id": 1875861623,
		"type": "channel",
		"visible_name": "polla",
		"username": "Dontwatchjustgive"
	},
	{
		"id": 1571969300,
		"type": "group",
		"visible_name": "武汉同志spa交流群",
		"username": "WHspaGroup"
	},
	{
		"id": 1530974244,
		"type": "channel",
		"visible_name": "4horlover",
		"username": "horlover_tg"
	},
	{
		"id": 1966687434,
		"type": "group",
		"visible_name": "中年 肉壮 男男资源群"
	},
	{
		"id": 1904320625,
		"type": "group",
		"visible_name": "精选资源群"
	},
	{
		"id": 1546729518,
		"type": "group",
		"visible_name": "Beard Project(danji)视频分享 Chat"
	},
	{
		"id": 1591171215,
		"type": "channel",
		"visible_name": "熊叔大叔老头馆频道@xs419",
		"username": "xs419"
	},
	{
		"id": 1632440622,
		"type": "channel",
		"visible_name": "熊狒の放映室🏳️‍🌈",
		"username": "bearvideo520"
	},
	{
		"id": 1782503851,
		"type": "channel",
		"visible_name": "秘密基地🏳️‍🌈",
		"username": "bearsex520"
	},
	{
		"id": 1886315521,
		"type": "group",
		"visible_name": "🐻(主群)熊熊的纸飞机🐻",
		"username": "xxdzfj"
	},
	{
		"id": 1636024497,
		"type": "group",
		"visible_name": "Fansday-Chatroom"
	},
	{
		"id": 1441335829,
		"type": "channel",
		"visible_name": "日本鈣片｜JapaneseGayPorn",
		"username": "asiangaypornography"
	},
	{
		"id": 1936440516,
		"type": "channel",
		"visible_name": "精选壮胖熊资源大叔帅哥 Gay Bear",
		"username": "xiongtv"
	},
	{
		"id": 2060570333,
		"type": "group",
		"visible_name": "视频合购群"
	},
	{
		"id": 2098079967,
		"type": "channel",
		"visible_name": "胖熊杂货铺资源频道",
		"username": "shipinhegou"
	},
	{
		"id": 2208233645,
		"type": "group",
		"visible_name": "国产电影熊出没"
	},
	{
		"id": 1224624669,
		"type": "channel",
		"visible_name": "Telegram Tips",
		"username": "TelegramTips"
	},
	{
		"id": 2103604291,
		"type": "channel",
		"visible_name": "可楽～的x同步频道"
	},
	{
		"id": 1838635806,
		"type": "group",
		"visible_name": "🐻(漫画)熊熊的纸飞机🐻",
		"username": "xmdzfj"
	},
	{
		"id": 1737401869,
		"type": "channel",
		"visible_name": "武汉同志spa交流频道",
		"username": "WHspaChannel"
	},
	{
		"id": 1751616404,
		"type": "channel",
		"visible_name": "熊片大杂烩",
		"username": "yunzhongzi_movieC"
	},
	{
		"id": 1857500715,
		"type": "channel",
		"visible_name": "男上加男👨‍❤️‍👨",
		"username": "homoobears"
	},
	{
		"id": 1878449649,
		"type": "channel",
		"visible_name": "熊熊熊🐻"
	},
	{
		"id": 1185926862,
		"type": "channel",
		"visible_name": "马栏山汉化组",
		"username": "MLSHHZ"
	},
	{
		"id": 1552119726,
		"type": "channel",
		"visible_name": "熊片B",
		"username": "yunzhongzi_movieB"
	},
	{
		"id": 1968493400,
		"type": "channel",
		"visible_name": "🔞 肌肉熊豬大叔肉壯 GV 收藏 🐻🐷💪🏻️ Gay",
		"username": "gaybearsex"
	},
	{
		"id": 1859752712,
		"type": "channel",
		"visible_name": "B叔视频储存柜",
		"username": "BLC113XX"
	},
	{
		"id": 1381368146,
		"type": "channel",
		"visible_name": "🐔(频道)鸟类繁衍协会"
	},
	{
		"id": 1526231633,
		"type": "channel",
		"visible_name": "默默小倉庫",
		"username": "SilenceBox"
	},
	{
		"id": 1531854574,
		"type": "channel",
		"visible_name": "低调肉壮胖🐻🐷🐵",
		"username": "didiaoQ"
	},
	{
		"id": 1244082471,
		"type": "channel",
		"visible_name": "GAY熊片资源库（亚洲）🅥",
		"username": "XPZYKY"
	},
	{
		"id": 2205912981,
		"type": "channel",
		"visible_name": "新搜索群。",
		"username": "sososoossosossoooos"
	},
	{
		"id": 1773153875,
		"type": "channel",
		"visible_name": "Fansday-OnlyfansBackup"
	},
	{
		"id": 2177240161,
		"type": "group",
		"visible_name": "吃鸡",
		"username": "jisojisojisojiso"
	},
	{
		"id": 4203772716,
		"type": "group",
		"visible_name": "吃鸡",
		"username": "-"
	},
	{
		"id": 7016621267,
		"type": "private"
	},
	{
		"id": 1215043254,
		"type": "channel",
		"visible_name": "马可西亚斯-NSFW",
		"username": "godaddynsfw"
	},
	{
		"id": 7233705808,
		"type": "private",
		"visible_name": "一诺 张"
	},
	{
		"id": 4249246996,
		"type": "group",
		"visible_name": "待更新-24年n月",
		"username": "-"
	},
	{
		"id": 6205570216,
		"type": "private",
		"visible_name": "猪肉肠好吃😋",
		"username": "ruyi810711"
	},
	{
		"id": 1877875443,
		"type": "channel",
		"visible_name": "GV黄金时代-视频分享",
		"username": "theGreatOldDaysofNipponGV"
	},
	{
		"id": 1911248454,
		"type": "channel",
		"visible_name": "胖熊叔的作品预览群"
	},
	{
		"id": 2144655704,
		"type": "channel",
		"visible_name": "熊部落",
		"username": "hdmbear"
	},
	{
		"id": 4146714938,
		"type": "group",
		"visible_name": "国产电影熊出没",
		"username": "-"
	},
	{
		"id": 7076204400,
		"type": "private"
	},
	{
		"id": 1227174268,
		"type": "channel",
		"visible_name": "老爹汉化组",
		"username": "ldlocalization"
	},
	{
		"id": 1140557462,
		"type": "channel",
		"visible_name": "秘密的藏宝箱♂",
		"username": "TTreasures"
	},
	{
		"id": 1646676183,
		"type": "channel",
		"visible_name": "熊狒馆",
		"username": "BearLab"
	},
	{
		"id": 1581420102,
		"type": "channel",
		"visible_name": "Fansday-已更新",
		"username": "Fansday_Warehouse"
	},
	{
		"id": 4288983703,
		"type": "group",
		"visible_name": "筛选---熊色影视频道---https://t.me/xiongse",
		"username": "-"
	},
	{
		"id": 4227549468,
		"type": "group",
		"visible_name": "筛选-盲盒-https://t.me/ssssilly",
		"username": "-"
	},
	{
		"id": 4141862512,
		"type": "group",
		"visible_name": "[101]Gloomybark@gloomybark",
		"username": "-"
	},
	{
		"id": 1743632235,
		"type": "channel",
		"visible_name": "九灭的自留地",
		"username": "jyuichi0619"
	},
	{
		"id": 6549939461,
		"type": "private"
	},
	{
		"id": 1167569280,
		"type": "channel",
		"visible_name": "熊狒爱好者协会",
		"username": "BearTube"
	},
	{
		"id": 1908783728,
		"type": "group",
		"visible_name": "我的群组"
	},
	{
		"id": 4137229639,
		"type": "group",
		"visible_name": "[02]弯屌熊叔@lb123333",
		"username": "-"
	},
	{
		"id": 1299850551,
		"type": "channel",
		"visible_name": "熊狒档案室",
		"username": "BearLib"
	},
	{
		"id": 6915701063,
		"type": "private",
		"visible_name": "SOSO搜搜 🔍 电报资源搜索"
	},
	{
		"id": 1867649274,
		"type": "channel",
		"visible_name": "B叔G片儲藏室",
		"username": "BLC113XXX"
	},
	{
		"id": 4121719182,
		"type": "group",
		"visible_name": "[43][110]Qmoa@qmoaliu和Q@qqqqq_oo",
		"username": "-"
	},
	{
		"id": 4121797790,
		"type": "group",
		"visible_name": "[110]Q@qqqqq_oo",
		"username": "-"
	},
	{
		"id": 1798673537,
		"type": "channel",
		"visible_name": "Telegram Premium",
		"username": "premium"
	},
	{
		"id": 6953599771,
		"type": "private",
		"visible_name": "艺辉 代",
		"username": "du_hare"
	},
	{
		"id": 1812281561,
		"type": "channel",
		"visible_name": "熊熊熊🉐熊熊熊",
		"username": "bearvideo2024"
	},
	{
		"id": 1531200668,
		"type": "channel",
		"visible_name": "456MOV丨出现英文私信 或看频道资料",
		"username": "GAY456MOV"
	},
	{
		"id": 4133956419,
		"type": "group",
		"visible_name": "[106]壮壮的someone@someonezhuang",
		"username": "-"
	},
	{
		"id": 4121970233,
		"type": "group",
		"visible_name": "[105]Kenny@theyoungdad",
		"username": "-"
	},
	{
		"id": 4175324614,
		"type": "group",
		"visible_name": "[104]sbx86@sbx86",
		"username": "-"
	},
	{
		"id": 4177461230,
		"type": "group",
		"visible_name": "[103]MJD筋肉雄汁@csleederek",
		"username": "-"
	},
	{
		"id": 4106710805,
		"type": "group",
		"visible_name": "[102]@gen2021",
		"username": "-"
	},
	{
		"id": 4145561464,
		"type": "group",
		"visible_name": "[100]Stangkuma@owlsome91",
		"username": "-"
	},
	{
		"id": 4123453080,
		"type": "group",
		"visible_name": "[99]Ageofantonio@ageofantonio",
		"username": "-"
	},
	{
		"id": 4180200922,
		"type": "group",
		"visible_name": "[98]TAKASABRO@taka_sab",
		"username": "-"
	},
	{
		"id": 4115921047,
		"type": "group",
		"visible_name": "[95]benz@benzto",
		"username": "-"
	},
	{
		"id": 4100311892,
		"type": "group",
		"visible_name": "[91]Porsch@porsch.pchral",
		"username": "-"
	},
	{
		"id": 2078058625,
		"type": "group",
		"visible_name": "[90]Val@that1bear"
	},
	{
		"id": 4111978758,
		"type": "group",
		"visible_name": "[89]チマキ@chimakiad",
		"username": "-"
	},
	{
		"id": 4142032588,
		"type": "group",
		"visible_name": "[85]Vic@vicofsex",
		"username": "-"
	},
	{
		"id": 4165033619,
		"type": "group",
		"visible_name": "[83]futoshio@futoshio",
		"username": "-"
	},
	{
		"id": 4179651224,
		"type": "group",
		"visible_name": "[82]龍龍龍@dragonlovebear",
		"username": "-"
	},
	{
		"id": 4187368847,
		"type": "group",
		"visible_name": "[81]銀次郎@gin_07214545",
		"username": "-"
	},
	{
		"id": 4117724010,
		"type": "group",
		"visible_name": "[79]BlackCat@blackcat7141",
		"username": "-"
	},
	{
		"id": 4134669955,
		"type": "group",
		"visible_name": "[77]Wei@tommy_weiii",
		"username": "-"
	},
	{
		"id": 4198982200,
		"type": "group",
		"visible_name": "[74]KalebKevins@kalebkevins",
		"username": "-"
	},
	{
		"id": 4185757243,
		"type": "group",
		"visible_name": "[73]mofu@fumo6_rope_4もふ(太郎)",
		"username": "-"
	},
	{
		"id": 4140908049,
		"type": "group",
		"visible_name": "[70]王小谦本谦@wxq924482497",
		"username": "-"
	},
	{
		"id": 4191268015,
		"type": "group",
		"visible_name": "[66]赤熊AKAKUMA@aka_kuma79",
		"username": "-"
	},
	{
		"id": 4187281918,
		"type": "group",
		"visible_name": "[62]ATR@helloattr",
		"username": "-"
	},
	{
		"id": 4114110673,
		"type": "group",
		"visible_name": "[58]UncleYasu@yasuharutakemura",
		"username": "-"
	},
	{
		"id": 4135687192,
		"type": "group",
		"visible_name": "[56]huzzbearz@huzzbearz",
		"username": "-"
	},
	{
		"id": 4185744702,
		"type": "group",
		"visible_name": "[53]TWPDS@twpds",
		"username": "-"
	},
	{
		"id": 4182965176,
		"type": "group",
		"visible_name": "[47]BK_bear@bankhamnoi",
		"username": "-"
	},
	{
		"id": 4126295591,
		"type": "group",
		"visible_name": "[45]04Raff_england@england04",
		"username": "-"
	},
	{
		"id": 4100804376,
		"type": "group",
		"visible_name": "[42]Leo@leo-japan",
		"username": "-"
	},
	{
		"id": 4105283953,
		"type": "group",
		"visible_name": "[33]SnazzYourSnizz@snazzyoursnizz",
		"username": "-"
	},
	{
		"id": 4164088414,
		"type": "group",
		"visible_name": "[32]givemeawhiff@givemeawhiff",
		"username": "-"
	},
	{
		"id": 4159841082,
		"type": "group",
		"visible_name": "[31]stockydudes",
		"username": "-"
	},
	{
		"id": 4120034330,
		"type": "group",
		"visible_name": "[30]monstercub",
		"username": "-"
	},
	{
		"id": 4103050604,
		"type": "group",
		"visible_name": "[29]他噗@topbbcock",
		"username": "-"
	},
	{
		"id": 4136021580,
		"type": "group",
		"visible_name": "[28]yiyiyongjiang@u16157939",
		"username": "-"
	},
	{
		"id": 4142108544,
		"type": "group",
		"visible_name": "[27]Bear@auanmhee",
		"username": "-"
	},
	{
		"id": 4102419151,
		"type": "group",
		"visible_name": "[25]剛士_takeshi(トントン)@gaytonton",
		"username": "-"
	},
	{
		"id": 4193261452,
		"type": "group",
		"visible_name": "[24]Guillermo \u0026 Jair@gmnpc",
		"username": "-"
	},
	{
		"id": 4184688019,
		"type": "group",
		"visible_name": "[23]小胖翔@bear543259",
		"username": "-"
	},
	{
		"id": 4113473398,
		"type": "group",
		"visible_name": "[21]楠楠@Nannan_Bear",
		"username": "-"
	},
	{
		"id": 4113612987,
		"type": "group",
		"visible_name": "[20]MEATYHENRI@meatyhenri",
		"username": "-"
	},
	{
		"id": 4185996369,
		"type": "group",
		"visible_name": "[19]Duelcub@duelcub",
		"username": "-"
	},
	{
		"id": 4168864247,
		"type": "group",
		"visible_name": "[18]thiccbunzcub@thiccbunzcub",
		"username": "-"
	},
	{
		"id": 4170081868,
		"type": "group",
		"visible_name": "[17]赤熊 AKA KUMA@blue_armor79",
		"username": "-"
	},
	{
		"id": 4160505536,
		"type": "group",
		"visible_name": "[16]LoveLittleCat@lovelittlecat",
		"username": "-"
	},
	{
		"id": 4185065400,
		"type": "group",
		"visible_name": "[15]真壁なをと-Nawoto-@nanao9307",
		"username": "-"
	},
	{
		"id": 4180807651,
		"type": "group",
		"visible_name": "[14]BEAR MUSCLE@musclebearbkk",
		"username": "-"
	},
	{
		"id": 4173587227,
		"type": "group",
		"visible_name": "[13]熊教授@iD9xFuvnjbc79Fn",
		"username": "-"
	},
	{
		"id": 4147401610,
		"type": "group",
		"visible_name": "[12]BK_bear@bankhamnoi",
		"username": "-"
	},
	{
		"id": 4166658413,
		"type": "group",
		"visible_name": "[11]000bozuhige000@bozuhige",
		"username": "-"
	},
	{
		"id": 4010515448,
		"type": "group",
		"visible_name": "[07]BulkyMax@bulkymax",
		"username": "-"
	},
	{
		"id": 2124204147,
		"type": "channel",
		"visible_name": "我的频道"
	},
	{
		"id": 4118433710,
		"type": "group",
		"visible_name": "[05]#たかしエロ親父@ikuiku_takashi",
		"username": "-"
	},
	{
		"id": 2047446094,
		"type": "group",
		"visible_name": "[03]Eric@eric.yummy"
	},
	{
		"id": 4183400807,
		"type": "group",
		"visible_name": "[03]Eric@eric.yummy",
		"username": "-"
	},
	{
		"id": 1684762915,
		"type": "channel",
		"visible_name": "Beard Project(danji日厂)",
		"username": "danjivideo"
	},
	{
		"id": 5770101555,
		"type": "private",
		"visible_name": "🔍极搜-中文搜索"
	},
	{
		"id": 1826599955,
		"type": "channel",
		"visible_name": "影院"
	},
	{
		"id": 6186454166,
		"type": "private",
		"visible_name": "小猪地瓜",
		"username": "dgxz1"
	},
	{
		"id": 1540457323,
		"type": "channel",
		"visible_name": "熊熊家族资源",
		"username": "db1069"
	},
	{
		"id": 1798763882,
		"type": "channel",
		"visible_name": "小方的xp",
		"username": "fangfangfangya"
	},
	{
		"id": 6663730564,
		"type": "private",
		"visible_name": "沈阳胖爸爸侯"
	},
	{
		"id": 1711489989,
		"type": "channel",
		"visible_name": "Trust’tm"
	},
	{
		"id": 4033732664,
		"type": "group",
		"visible_name": "我的群组",
		"username": "-"
	},
	{
		"id": 6375497626,
		"type": "private",
		"visible_name": "SOSO搜搜🔍中文搜索🔞"
	},
	{
		"id": 328770467,
		"type": "private",
		"visible_name": "Fansday 主理人",
		"username": "FansdayGM"
	},
	{
		"id": 6307962976,
		"type": "private",
		"visible_name": "入群门卫",
		"username": "MenWeiBot"
	},
	{
		"id": 883561272,
		"type": "group",
		"visible_name": "我的群test",
		"username": "-"
	},
	{
		"id": 1724297475,
		"type": "channel",
		"visible_name": "啥都没有"
	},
	{
		"id": 1515558122,
		"type": "channel",
		"visible_name": "啥都没有"
	},
	{
		"id": 6240799293,
		"type": "private",
		"visible_name": "ntmmw",
		"username": "ntmmwbot"
	},
	{
		"id": 957768471,
		"type": "group",
		"visible_name": "我的群组1test",
		"username": "-"
	},
	{
		"id": 5999698067,
		"type": "private",
		"visible_name": "叔 群",
		"username": "BH_20232"
	},
	{
		"id": 5962610686,
		"type": "private",
		"visible_name": "熊 叔",
		"username": "lb123333"
	},
	{
		"id": 5589377314,
		"type": "private",
		"visible_name": "左岸机器人",
		"username": "zuoan_bot"
	},
	{
		"id": 1853035824,
		"type": "channel",
		"visible_name": "个人保存",
		"username": "xiongpd"
	},
	{
		"id": 1564621840,
		"type": "channel",
		"visible_name": "盲盒",
		"username": "ssssilly"
	},
	{
		"id": 1669845530,
		"type": "channel",
		"visible_name": "同志视频免费分享群。",
		"username": "tgm106944685"
	},
	{
		"id": 1472186109,
		"type": "channel",
		"visible_name": "日曜日汉化组存档",
		"username": "silyuiti"
	},
	{
		"id": 1530877245,
		"type": "channel",
		"visible_name": "【非官方备份】黑夜汉化组"
	},
	{
		"id": 1617819075,
		"type": "channel",
		"visible_name": "熊先生#男男#GAY",
		"username": "xiongxs"
	},
	{
		"id": 1545578635,
		"type": "channel",
		"visible_name": "GAY熊片电影院（亚洲）🅥",
		"username": "XPDYYY"
	},
	{
		"id": 1587025848,
		"type": "channel",
		"visible_name": "GAY熊片资源库（欧美）🅥",
		"username": "XPZYKO"
	},
	{
		"id": 1747978408,
		"type": "channel",
		"visible_name": "享熊居",
		"username": "xxiongju"
	}
]

function filterChatLsData(data) {
	return data.filter(item => {
		return item.type !== 'private' &&
			!item.hasOwnProperty('topics') &&
			!/\[\d+\]/.test(item.visible_name);
	});
}

// 导出过滤后的数据
module.exports = {
	chatLsData: filterChatLsData(chatLsData)
};
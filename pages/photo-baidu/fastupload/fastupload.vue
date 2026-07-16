<template>
	<view>
		<button @click="selectAndUploadFile">选择文件并上传</button>
		<text>{{ block_list.length }}</text>
		<view class="">
			{{ 'Generated logid:' + generateLogId() }}
		</view>
		<view class="">
			{{ 'generated UploadId: ' + generateUploadId() }}
		</view>
		<view>
			前端JavaScript中，浏览器环境，不支持自己设置Cookie，Host，Origin，Referer等参数，
			被浏览器限制了，如果需要自定义请求头设置这些，必须使用服务器，在后端请求，如服务器上运行
			node.js后端等。
		</view>
	</view>
</template>

<script>
	
	
	
	import axios from 'axios';
	// 计算文件md5
	import SparkMD5 from 'spark-md5';
	export default {
		data() {
			return {
				file_md5: "",
				block_list: ["72084c54f110fb70d4ed20de8d7049d2", "a844eefe57b32d88c9fbcd5a12cc5760",
					"06aecefc43c4fbcce392644b41b32690", "58ea1833a8b699cdf4e11ce370d04071",
					"b008d8554523f34c3cee8ce90d851dd6", "4a749d70668ca56f19b3799d9c005938",
					"622a792d83a85ebd04ee1f37402f39b1", "069950edddd39fa47bb2f399a921d70c",
					"1b1352b3adac73262d0a7acfea7265d5", "c42b05b821076fd3140e222727a95a0a",
					"f9451023cbef4188c8f0d7f06ad33298", "95c859d10bc9e21b946b7f2432d2f98c",
					"d232ab714b114f781847cdd46b5b93fd", "d1082b880dc3ebaee2a7fb947769a7cd",
					"4f63d3db8a965c03ded3ec4b7c8903a6", "c5d2631efb6f1664e26f1b4a850811c8",
					"7a56427fd95dd60355f6b4fa0757c25e", "5bcc4baf2ecc94e1d709809018f8fc07",
					"67e8a4cf8eb99ff170863facca212c4b", "c947a7fed79a1dc8433c8d88871e700f",
					"0c8a495cb9e0b724ac8e794ccc59230b", "c557e4f1a6f5fc73cf2b651187bcfa41",
					"a8390980c044e6bae664e7ba3fba67fc", "93e9ab66381a5e6c58d280c5a68b8227",
					"902d8e5b1e421d819e04cef77f0e6525", "c4523a55fb5b1075315806df1156dadb",
					"a544637d7770bc1b8276dd97505cf59a", "4f4c67dc8efa2d68dd11b5b7c885bb23",
					"d7093ff01abf0edc522977bc86953271", "fd613387530332a06007cc1ea31eb738",
					"1cb027b22f9e94553355bde21f52bafc", "140fb006187f9afd086d97ebc80bcd39",
					"840c2564e6eac4bd9e1dcbe114921b0c", "db07d95c1eec15c07b76f507569bac4f",
					"59935b4683612cb783cac535b4c67a20", "92e84c44296c41c295b219edc1a51942",
					"1d7bc4b026001b4ac2b8b7cc31eccca5", "1d14cd69114f127a2b9b827b2d062c18",
					"874e31c55703e1b8885917d67e4284ba", "423fb61d2109cd7f05237784af0d0b7d",
					"c602e597acf52c819cc3c4e56ff31e11", "c882c090a2fe268754cf3e747725c870",
					"85433160e2c9507f181aeec8fe56cfc6", "80301093483962154626aee7e04cddd1",
					"93dfdb3a1788fd4c016790af27c729b7", "82f2a053a5d66ecfc8bae92126f53964",
					"8bb170819b2fa96ffadd4ef9e22fe47d", "a8afc14bf2a3c6562110a51fe19f3e2f",
					"8ad3490da802910102b773dbbd9bd5e4", "ce32bcd362759fae86736173602fc4cf",
					"3602f146d5178483c283b1c0d0a80fb9", "69eefd1ac2f1fdd6219eff140fabaca5",
					"0400c7bdd5f1bc2aef0d64e6a12a0ea8", "3543f581c01ac0cf30bb66d208ae3539",
					"558b70bcac1a1980c3b81800ac923cef", "22b59386989b74e736e2f4b6f6e68d0b",
					"811dcbffe51447321e9a4820f6c2eee2", "1a9153c8de200167af91c900213d69a1",
					"93e1a4b21db2f5cd804153acf7d81e13", "6ae3a5194abaec1c582ec21cab5b311f",
					"25644095cfbbc508f959d4713098e690", "e79eede030907bd63693f7acc0c0ffcc",
					"d2836bb63b3c725af1c46b9af4c49bdd", "81acf65603f3d097db6071750815e86d",
					"65d1580068cb7b8601403b0ea8060c99", "7e68bfd07d48447514d48023418210d2",
					"d34e2cd522f645ebe5a2827e279e03ac", "17543fabd68d645a9c064170d096ef57",
					"ac90154298862932795caf9da493bb2d", "89900cf8578df9f69977f9c35a0e05b5",
					"48077581e97c7066785a86b9865f04f5", "31e4c1b5dbfa67eef27b55fdcacffb1e",
					"98bf58d71c08966d6bbe69c86e9b4ffb", "713b4b37b62103116e6255db8658d5ae",
					"71c0d57f683f8fd6734c93bdab594ea8", "a8c7bf07cea9a96761e5dce5914e3d4c",
					"b02f9990b814ec1fe06e117aafc1369a", "adcbf8fd5a81e4432ed2fd497d52433a",
					"ee7a786215eb7290b0429b3f1596c59c", "955b7ea45f3bd445e7d90a74206ae6cd",
					"945cfa2ece0bce9c076ab68031b260ac", "c5c99587fb83fc292dbc44dc47b90c41",
					"0ce13246e380b060c126533c7357f15e", "d421a8e5c7b88418c66d13bf9bb6cbfc",
					"c00501bef77c19b426269986768e09b5", "6a5b7246cf422339748a3532a8781116",
					"2a305569c6cf970e25708ef12d685af6", "c06bc49dcb0db957bcbbd52094f37155",
					"59cb768bd9ed46c3258f955f25e9fe2d", "1af625a858046c1a5c273a855032dd02",
					"7fa1c15ea1c53b89dd9b965bcede2fc8", "7e875b927373d5df04d6857f51cde935",
					"282d7781029634bb4ad36dc01e047239", "bff065d71bd2adacb3fd0888b75aee38",
					"959a30c5e621c083d8320b12c6755a85", "614f019db57453a64a571472ffca9513",
					"8a15bf063fa6fdda7b5a29b6854e3ff6", "48355b38f67ec1c896937b37f5780b5e",
					"c9c93cd73a4282637afd021edcdc72c7", "dad7e4e978fda0b4a2f21a39c36b6893",
					"1a09a2d624b57b903634a24cd1518108", "25323b2703a2044d27d3d84345505014",
					"26d1a863c77d672d77fa029331b19ef1", "01bfe68449092e8169aff09129cd634b",
					"60aa7378fae77d04e985464c7f8cd9d3", "38b52a4ae483bbbc3635032891edd261",
					"f1058a0f7a4cba4b3f8c0b9f4a8001b6", "15b7831a930279689eb9d757ba28c67e",
					"2d53778e13d8bc8f1e2e6a14526924cb", "9b98a40c48b357c63a965f909b9c6c37",
					"05cc3979c82d41adac4401d3041504b7", "6e3870e49d136be745b3cd3f63b76cb3"
				],
				headers: {
					Cookie: "-; BIDUPSID=C6FF1A0FA68F50915CC0E431973FC719; PSTM=1693624019; BAIDUID=40F14108017EB6641D57F1DA67B48673:FG=1; BDUSS=DZGdW5xT3BpNU9Ib3JxOEFZdEJsNlZ2eTRpRX5DeXgxMX5VRXZqbW1iOUdsN2RsSVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYKkGVGCpBle; BAIDUID_BFESS=40F14108017EB6641D57F1DA67B48673:FG=1; BDUSS_BFESS=DZGdW5xT3BpNU9Ib3JxOEFZdEJsNlZ2eTRpRX5DeXgxMX5VRXZqbW1iOUdsN2RsSVFBQUFBJCQAAAAAAAAAAAEAAADCbDU41tzI59LiZW5qb3kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEYKkGVGCpBle; ZFY=fnDIoWR2CAZbr0DKqArrLJbWy3qmH49KgxzXZAgBv9o:C; H_PS_PSSID=40211_40079_40365_40352_40366_40374_40446_40300_40465_40460_40457_40317_39662_40499; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%221815907562%22%2C%22first_id%22%3A%2218d12b95afdd2a-0af7b5097dada5-26031051-1440000-18d12b95afe1afb%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E8%87%AA%E7%84%B6%E6%90%9C%E7%B4%A2%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC%22%2C%22%24latest_referrer%22%3A%22https%3A%2F%2Fwww.google.com.hk%2F%22%7D%2C%22%24device_id%22%3A%2218d12b95afdd2a-0af7b5097dada5-26031051-1440000-18d12b95afe1afb%22%7D",
					Host: "xafj-cm10.pcs.baidu.com", // 不通用
					Origin: "https://photo.baidu.com",
					Referer: "https://photo.baidu.com/photo/web/fastupload" // 不通用
				},
				fs_id: "",// 一刻相册的文件id

				// Query String Parameters
				// method: upload
				// app_id: 16051585
				// channel: chunlei
				// clienttype: 70
				// web: 1
				// logid: MTcxMTQ1MDM4NDg4MTAuNzQ4ODg2NzE5OTEyMjE0OQ==
				// path: %2Fxhamster_%E6%97%A5%E6%9C%AC%E8%A7%86%E9%A2%91.mp4
				// uploadid: P1-MTAuOTIuMTcwLjc2OjE3MTE0NTAyNjU6ODkwNzEzNjUyMDQyNDg3OTU3NQ==
				// partseq: 108
			}
		},
		methods: {
			async uploadFile(file) {
				const { Cookie } = this.headers
				
				const appid = 16051585; // 一刻相册账号appid
				const uploadid = this.generateUploadId(); // 上传文件用的唯一上传id
				const path = `/${file.name}`;
				
				const chunkSize = 4194304; // 分片大小，4MB（一刻相册官方计算分片代码）
				const totalChunks = Math.ceil(file.size / chunkSize);
				
				// 第一步上传文件分片
				for (let i = 0; i < totalChunks; i++) {
					const start = i * chunkSize;
					const end = Math.min(file.size, start + chunkSize);
					const chunk = file.slice(start, end); // 当前分片


					const logid = this.generateLogId(); // 当前分片的上传日志id
					const partseq = i; // 表示这是分片上传中的一个具体片段序号

					const formData = new FormData();
					formData.append('file', chunk, file.name);

					const preURL = `https://xafj-cm10.pcs.baidu.com/rest/2.0/pcs/superfile2`
					const apiURL =
						`${preURL}?method=upload&app_id=${appid}&channel=chunlei&clienttype=70&web=1&logid=${logid}&path=${path}&uploadid=${uploadid}&partseq=${partseq}`
						
					try {
						const response = await axios.post(apiURL, formData, {
							headers: {
								'Content-Type': 'multipart/form-data; boundary=---011000010111000001101001',
								Cookie: Cookie, // 设置需要的cookie
								Host: 'xafj-cm10.pcs.baidu.com',
								Origin: 'https://photo.baidu.com',
								Referer: 'https://photo.baidu.com/photo/web/fastupload'
								// 其他header可以在这里设置，除了Referer
							},
							// 如果需要携带cookie，请确保设置了withCredentials
							withCredentials: true,
						});

						// 检查response的状态
						if (response.status === 200) {
							console.log(`Chunk ${i + 1}/${totalChunks} uploaded successfully`, response.data);
						} else {
							console.error(`Chunk ${i + 1}/${totalChunks} upload failed`, response.data);
						}
					} catch (error) {
						console.error(`Chunk ${i + 1}/${totalChunks} upload error`, error);
					}
				}

				// 所有分片上传完成后，可能需要发送一个请求来合并文件
				console.log('All chunks uploaded successfully');
				// 发送合并请求的代码...
				
				
				const media_info = this.generateMediaInfo(file, this.file_md5)
				
				// 第二步，所有分片上传完成后，预创建文件
				try {
					const preURL = `https://photo.baidu.com/youai/file/v1/precreate`
					const apiURL = `${preURL}?clienttype=70&bdstoken=13bdc62b1ebc1957d59e5d7837b4b442`
					
					const formData = new FormData();
					formData.append('autoinit', 1);
					formData.append('block_list', this.block_list);
					formData.append('isdir', 0);
					formData.append('rtype', 1);
					formData.append('ctype', 11);
					formData.append('path', path);
					formData.append('size', file.size);
					formData.append('slice-md5', this.file_md5);
					formData.append('content-md5', this.file_md5);
					formData.append('local_ctime', Math.round(Date.now() / 1000));
					formData.append('local_mtime', Math.round(Date.now() / 1000)); // 秒级单位
					formData.append('media_info', media_info);
					
					const response = await axios.post(apiURL, formData, {
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							Cookie: Cookie, // 设置需要的cookie
							Host: 'photo.baidu.com',
							Origin: 'https://photo.baidu.com',
							Referer: 'https://photo.baidu.com/photo/web/fastupload'
							// 其他header可以在这里设置，除了Referer
						},
						// 如果需要携带cookie，请确保设置了withCredentials
						withCredentials: true,
					});
					
					// 检查response的状态
					if (response.status === 200) {
						console.log(`precreate file successfully`, response.data);
					} else {
						console.error(`precreate file failed`, response.data);
					}

				} catch (error) {
					console.error(`precreate file error`, error);
				}
				

				// 第三步，创建文件
				try {
					const preURL = `https://photo.baidu.com/youai/file/v1/create`
					const apiURL = `${preURL}?clienttype=70&bdstoken=13bdc62b1ebc1957d59e5d7837b4b442`
					
					const formData = new FormData();
					formData.append('path', path);
					formData.append('size', file.size);
					formData.append('uploadid', uploadid);
					formData.append('block_list', this.block_list);
					formData.append('isdir', 0);
					formData.append('rtype', 1);
					formData.append('ctype', 11);
					formData.append('content-md5', this.file_md5);
					formData.append('media_info', media_info);
					
					const response = await axios.post(apiURL, formData, {
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							Cookie: Cookie, // 设置需要的cookie
							Host: 'photo.baidu.com',
							Origin: 'https://photo.baidu.com',
							Referer: 'https://photo.baidu.com/photo/web/fastupload'
							// 其他header可以在这里设置，除了Referer
						},
						// 如果需要携带cookie，请确保设置了withCredentials
						withCredentials: true,
					});
					
					// 检查response的状态
					if (response.status === 200) {
						console.log(`precreate file successfully`, response.data);
						
						this.fs_id = response.data.data.fs_id
						
					} else {
						console.error(`precreate file failed`, response.data);
					}
					
				} catch (error) {
					console.error(`create file error`, error);
				}
				
				// 第四步，添加文件到相册
				try {
					const preURL = `https://photo.baidu.com/youai/album/v1/addfile`
					const apiURL = `${preURL}?clienttype=70&bdstoken=13bdc62b1ebc1957d59e5d7837b4b442&album_id=3436260472656981206&tid=317114238939563969&list=${[{fsid: fs_id}]}`
					
					const response = await axios.post(apiURL, formData, {
						headers: {
							Cookie: Cookie, // 设置需要的cookie
							Host: 'photo.baidu.com',
							Referer: 'https://photo.baidu.com/photo/web/fastupload'
						},
						// 如果需要携带cookie，请确保设置了withCredentials
						withCredentials: true,
					});
					
					
					// 检查response的状态
					if (response.status === 200) {
						console.log(`addfile file successfully`, response.data);
						
					} else {
						console.error(`addfile file failed`, response.data);
					}
					
					
				} catch (error) {
					console.error(`addfile file error`, error);
				}
				

			},

			// 计算文件的MD5值
			calculateMD5(file) {
				// 如果文件足够小，你可以一次性读取整个文件然后计算MD5值。这样的操作更简单，但对于大文件来说可能会导致浏览器占用大量内存，因此通常不推荐这种方式。而是推荐分片读取再计算文件md5
				return new Promise((resolve, reject) => {
					const blobSlice = File.prototype.slice; // 使用File API中的slice方法来分片读取文件
					const chunkSize = 4194304; // 设置每个分片的大小为4MB（一刻相册官方计算分片代码）
					const chunks = Math.ceil(file.size / chunkSize); // 计算文件需要被分成多少个分片
					let currentChunk = 0; // 当前正在处理的分片索引
					const chunkMD5s = []; // 存储每个分片的MD5值
					const spark = new SparkMD5.ArrayBuffer(); // 创建一个新的spark-md5对象，用于计算MD5（用于计算整个文件的MD5）
					const fileReader = new FileReader(); // 创建FileReader对象，用于读取文件

					// 当文件分片读取完成时触发
					fileReader.onload = function(e) {
						console.log('read chunk nr', currentChunk + 1, 'of', chunks); // 输出当前读取的分片信息
						// 计算并存储当前分片的MD5值
						const currentChunkArrayBuffer = e.target.result;
						const sparkChunk = new SparkMD5.ArrayBuffer();
						sparkChunk.append(currentChunkArrayBuffer);
						const chunkMD5 = sparkChunk.end();
						chunkMD5s.push(chunkMD5);

						spark.append(e.target.result); // 将读取到的分片数据追加到spark-md5对象中
						currentChunk++; // 增加当前分片的索引

						// 如果还有更多分片需要读取，则继续读取下一个分片
						if (currentChunk < chunks) {
							loadNext();
						} else {
							// 如果所有分片都已经读取完毕，计算整个文件的MD5值
							const fileMD5 = spark.end();
							// 输出计算得到的MD5哈希值
							console.log('computed hash', fileMD5); // Compute hash
							// 返回整个文件的MD5值和分片的MD5值列表
							resolve({
								fileMD5,
								chunkMD5s
							});
						}
					};

					// 如果读取文件发生错误
					fileReader.onerror = function() {
						console.warn('oops, something went wrong.');
						reject();
					};

					// 定义一个函数用于加载下一个分片
					function loadNext() {
						// 计算当前分片的起始位置
						const start = currentChunk * chunkSize;
						// 计算当前分片的结束位置
						const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
						// 使用FileReader对象读取当前分片的内容
						fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
					}

					// 开始读取第一个分片
					loadNext();
				});
			},

			// 计算整个文件的MD5值
			calculateFullMD5(file) {
				return new Promise((resolve, reject) => {
					const fileReader = new FileReader();

					// 当文件读取完成时触发
					fileReader.onload = function(e) {
						const fileContents = e.target.result;
						const spark = new SparkMD5.ArrayBuffer();
						spark.append(fileContents);
						const fileMD5 = spark.end(); // 计算MD5
						resolve(fileMD5); // 返回MD5值
					};

					// 如果读取文件发生错误
					fileReader.onerror = function() {
						console.warn('oops, something went wrong.');
						reject(fileReader.error);
					};

					// 读取文件内容
					fileReader.readAsArrayBuffer(file);
				});
			},


			generateMediaInfo(file, fileMD5) {
				// 假设除了MD5，我们还包括了文件大小
				const fileSize = file.size;
				// 假设我们还包括了文件类型
				const fileType = file.type;
				
				// 创建一个对象来表示媒体信息
				const mediaInfo = {
					md5: fileMD5,
					size: fileSize,
					type: fileType
				};
				
				// 将对象转换为JSON字符串
				const mediaInfoString = JSON.stringify(mediaInfo);
				// 对JSON字符串进行Base64编码
				const base64MediaInfo = btoa(mediaInfoString);
				
				return base64MediaInfo
			},

			// 生成日志Id
			generateLogId() {
				// 获取当前Unix时间戳（毫秒级别）
				const timestamp = Math.round(Date.now());
				// 额外的数据，看起来像是一串随机的数字，你可能需要根据具体的业务逻辑来生成这部分
				const extraData = Math.random().toString().slice(1, 18);

				// 将Unix时间戳和额外的数据拼接起来，然后转换为Base64编码
				let logId = btoa(`${timestamp}.${extraData}`);

				logId = logId.replace(/\+/g, '-').replace(/\//g, '_'); // 替换字符以符合URL安全规则

				return logId;
			},

			generateUploadId() {
				// 假设的IP地址和时间戳，你需要根据实际情况替换它们
				const ip = '39.144.59.165';
				const timestamp = Math.round(Date.now()); // Unix时间戳（毫秒级别）

				// 生成随机数部分，这里使用随机数填充，你可能需要替换为你的业务逻辑生成的值
				const randomPart = Math.random().toString().slice(2);

				// 拼接成完整的uploadid
				const uploadId = `${ip}:${timestamp}:${randomPart}`;

				// 整个uploadId进行base64编码
				const base64UploadId = `P1-${btoa(uploadId)}`;

				return base64UploadId;
			},


			// 选择文件并开始上传
			selectAndUploadFile() {
				const input = document.createElement('input');
				input.type = 'file';
				input.onchange = async (e) => {
					const file = e.target.files[0];
					if (file) {
						console.log('file', file)

						// 计算文件的MD5值
						const {
							fileMD5,
							chunkMD5s
						} = await this.calculateMD5(file);
						console.log('File MD5 hash:', fileMD5);
						console.log('Chunk MD5 hashes:', chunkMD5s);
						this.block_list = chunkMD5s
						this.file_md5 = fileMD5


						await this.uploadFile(file);
					}
				};
				input.click();
			}
		}
	}
</script>

<style>

</style>
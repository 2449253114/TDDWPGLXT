// 生成指定长度范围的随机字母和数字组合的字符串
function generateRandomString(minLength, maxLength) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}


/**
 * 将毫秒数转换为时分秒格式的字符串。
 *
 * @param {number} durationMs 持续时间，以毫秒为单位。
 * @returns {string} 返回格式化的时分秒字符串。
 *
 * 如果小时数为零，则仅返回分钟和秒；否则，返回小时、分钟和秒。
 */
function convertDuration(durationMs) {
    let seconds = Math.floor(durationMs / 1000); // 转换为秒
    let minutes = Math.floor(seconds / 60); // 转换为分钟
    seconds = seconds % 60; // 剩余的秒数
    let hours = Math.floor(minutes / 60); // 转换为小时
    minutes = minutes % 60; // 剩余的分钟数

    // 格式化为两位数字
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    // 根据是否有小时来返回不同的格式
    if (hours === "00") {
        return `${minutes}:${seconds}`; // 仅分钟和秒
    } else {
        return `${hours}:${minutes}:${seconds}`; // 小时、分钟和秒
    }
}
/* 
// 使用示例
const duration = convertDuration(1321104); // 22:01
console.log(duration); // 输出 "00:22:01" 
 */



/**
 * 将文件大小单位从 Byte 转换为 KB、MB 或 GB，并在转换后显示相应的单位
 * 
 * 将字节大小转换为易读的格式（如 KB, MB, GB）。
 *
 * @param {number} bytes 字节大小。
 * @returns {string} 返回格式化后的字符串表示。
 *
 * 该函数根据输入的字节大小计算对应的 KB、MB 或 GB 大小，并保留两位小数点。
 * 它首先判断字节大小属于哪个范围（KB、MB、GB），然后进行相应的转换。
 * 最终返回带有适当单位的字符串。
 */
function formatFileSize(bytes) {
    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    if (bytes < KB) {
        return bytes + ' B'; // 字节
    } else if (bytes < MB) {
        return (bytes / KB).toFixed(2) + ' KB'; // 千字节
    } else if (bytes < GB) {
        return (bytes / MB).toFixed(2) + ' MB'; // 兆字节
    } else {
        return (bytes / GB).toFixed(2) + ' GB'; // 吉字节
    }
}

// 使用示例
// const fileSize = formatFileSize(188366232); // "179.62 MB"
// console.log(fileSize);


export {
	generateRandomString,
	convertDuration,
	formatFileSize
}
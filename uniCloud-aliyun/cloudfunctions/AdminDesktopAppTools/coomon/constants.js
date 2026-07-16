const db = uniCloud.database();
const dbCmd = db.command;

// 数据库表
const yikeAccountCookieCollectionName = 'yike-account-cookie';  // 一刻相册账号Cookie数据库表名
const yikeAccountCookieCollection = db.collection(yikeAccountCookieCollectionName);

// 全部相册文件
const fileCollectionName = 'yike-album-files';
const fileCollection = db.collection(fileCollectionName);

// 相册文件 - m3u8文件
const m3u8FileCollectionName = 'yike-album-files-m3u8file';
const m3u8FileCollection = db.collection(m3u8FileCollectionName);

module.exports = {
  dbCmd,
	fileCollection,
	m3u8FileCollection,
  yikeAccountCookieCollection
};

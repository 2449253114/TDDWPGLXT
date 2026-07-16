'use strict';
exports.main = async (event, context) => {
	//event为客户端上传的参数
	console.log('event : ', event)

	const {
		fileList
	} = event

	try {
		const result = await uniCloud.deleteFile({
			fileList: fileList
		});
		return result;
	} catch (error) {
		console.error('文件删除失败:', error);
		throw error;
		//return { message: error.message }
	}
};
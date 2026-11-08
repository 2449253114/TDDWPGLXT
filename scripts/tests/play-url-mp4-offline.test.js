/**
 * app-photo-baidu 的 play-url-mp4 已停用的行为测试，本地 Node 直接运行，不连接数据库：
 *   node scripts/tests/play-url-mp4-offline.test.js
 *
 * 加载整个云对象 index.obj.js：本地不存在的 uniCloud 公共模块（如 auto-update-album-cover）以空对象代替；
 * 数据库集合与请求信息一旦被访问就抛错，用来证明停用后的接口既不读请求、也不查库。
 */
'use strict'

const assert = require('assert')
const path = require('path')
const Module = require('module')

const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const OBJECT_PATH = path.join(PROJECT_ROOT, 'uniCloud-aliyun/cloudfunctions/app-photo-baidu/index.obj.js')

const originalLoad = Module._load
Module._load = function (request) {
	try {
		return originalLoad.apply(this, arguments)
	} catch (error) {
		// 只放过本地不存在的第三方或 uniCloud 公共模块；相对路径的业务模块找不到时照常报错
		if (error.code === 'MODULE_NOT_FOUND' && !request.startsWith('.')) return {}
		throw error
	}
}

const accessed = []
const forbidden = (label) => new Proxy({}, {
	get(_, property) {
		accessed.push(`${label}.${String(property)}`)
		throw new Error(`不应访问 ${label}.${String(property)}`)
	}
})
global.uniCloud = new Proxy({
	database: () => ({ collection: (name) => forbidden(`collection(${name})`), command: {} })
}, { get: (target, property) => target[property] || (() => ({})) })

const cloudObject = require(OBJECT_PATH)
Module._load = originalLoad

;(async () => {
	const res = await cloudObject['play-url-mp4'].call(forbidden('this'))
	assert.deepStrictEqual(res, { code: 1005, message: '该播放方式已停用，请更新到最新版本后观看', data: null })
	assert.deepStrictEqual(accessed, [], '停用后的接口不应读取请求或访问数据库')
	assert.strictEqual(typeof cloudObject['play-url-m3u8'], 'function', 'App 使用的 play-url-m3u8 路由应保持不变')
	assert.strictEqual(cloudObject.getPlayUrlMP4, undefined, '原 mp4 实现不应以其他方法名导出')
	console.log('ok   play-url-mp4 已停用：返回明确提示，不读请求、不查库；play-url-m3u8 仍在\n\n1/1 通过')
})().catch((error) => {
	console.log(`FAIL ${error.stack.split('\n').slice(0, 3).join('\n     ')}\n\n0/1 通过`)
	process.exit(1)
})

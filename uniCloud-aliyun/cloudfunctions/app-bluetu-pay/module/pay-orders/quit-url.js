/**
 * @tutorial https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/quit_url
 * 
 * 取消支付后跳转地址
 * 请求Query参数：
 * @param {String} out_trade_no 商户订单号 (必填)
 * 
 * 跳转地址
 * @return {String} url https://fc-mp-9909fa0f-9b68-46fb-afbb-997488dc33b3.next.bspapp.com/app-bluetu-pay/quit_url?out_trade_no=JBCZ1697772862597098
 */
module.exports = async function() {
	// 获取url化时的http信息
	const httpInfo = this.getHttpInfo()
	// 获取HTTP请求的Query参数, 如 ?id=123
	const queryParam = httpInfo.queryStringParameters
	
	// 生成HTML内容
	const htmlContent = `
		<!DOCTYPE html>
		<html lang="en">
		  <head>
		    <meta charset="UTF-8" />
		    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
		    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<link rel="stylesheet" href="https://mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.cdn.bspapp.com/withhim/index.css">
			<link rel="stylesheet" href="https://mp-6b369ed8-6b37-4d6c-b0dc-baffe1a09079.cdn.bspapp.com/withhim/order_details.css">
		    <title>支付结果</title>
		  </head>
		  <body>
		    <p>取消支付，订单号：${queryParam.out_trade_no}</p>
		  </body>
		</html>
	`;
	
	// 返回html内容
	return {
		data: {
			pay_status: 0,// 支付状态：0：未支付、 1：已支付
			pay_status_content: "未支付", // 支付状态文本
		},
		body: htmlContent
	}
}
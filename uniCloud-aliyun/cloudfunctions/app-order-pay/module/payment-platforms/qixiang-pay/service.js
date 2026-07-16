const qixiangPayApi = require("./api");
const { createResponse } = require("../../../common/response");

/**
 * 七相支付服务逻辑
 */
const qixiangPayService = {
  /**
   * 创建订单
   * @param {Object} orderData 订单数据
   * @returns {Promise<Object>} 创建订单结果
   */
  createOrder: async (orderData) => {
    try {
      const result = await qixiangPayApi.createOrder(orderData);
      if (result.code === 1) {
        return createResponse(200, "Order created successfully", {
          payurl: result.payurl,
          qrcode: result.qrcode,
        });
      } else {
        return createResponse(500, result.msg || "Failed to create order");
      }
    } catch (error) {
      return createResponse(500, error.message);
    }
  },
};

module.exports = qixiangPayService;
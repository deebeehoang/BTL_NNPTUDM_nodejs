const crypto = require('crypto');
const https = require('https');
const MOMO_CONFIG = require('./momo');

/**
 * MoMo Payment Service
 */
class MoMoService {
    /**
     * Generate signature for MoMo API
     * @param {Object} params - Parameters for signature
     * @returns {string} - HMAC SHA256 signature
     */
    static generateSignature(params) {
        const {
            accessKey,
            amount,
            extraData,
            ipnUrl,
            orderId,
            orderInfo,
            partnerCode,
            redirectUrl,
            requestId,
            requestType
        } = params;

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

        console.log('--------------------RAW SIGNATURE----------------');
        console.log(rawSignature);

        const signature = crypto
            .createHmac('sha256', MOMO_CONFIG.SECRET_KEY)
            .update(rawSignature)
            .digest('hex');

        console.log('--------------------SIGNATURE----------------');
        console.log(signature);

        return signature;
    }

    /**
     * Create payment request to MoMo
     * @param {Object} paymentData - Payment data
     * @returns {Promise<Object>} - Payment response
     */
    static async createPayment(paymentData) {
        return new Promise((resolve, reject) => {
            const {
                orderId,
                orderInfo,
                amount,
                extraData = ""
            } = paymentData;

            const requestId = MOMO_CONFIG.PARTNER_CODE + new Date().getTime();
            const finalOrderId = orderId || requestId;

            const params = {
                accessKey: MOMO_CONFIG.ACCESS_KEY,
                amount: amount.toString(),
                extraData: extraData,
                ipnUrl: MOMO_CONFIG.IPN_URL,
                orderId: finalOrderId,
                orderInfo: orderInfo,
                partnerCode: MOMO_CONFIG.PARTNER_CODE,
                redirectUrl: MOMO_CONFIG.REDIRECT_URL,
                requestId: requestId,
                requestType: MOMO_CONFIG.REQUEST_TYPE
            };

            const signature = this.generateSignature(params);

            const requestBody = JSON.stringify({
                partnerCode: MOMO_CONFIG.PARTNER_CODE,
                accessKey: MOMO_CONFIG.ACCESS_KEY,
                requestId: requestId,
                amount: amount.toString(),
                orderId: finalOrderId,
                orderInfo: orderInfo,
                redirectUrl: MOMO_CONFIG.REDIRECT_URL,
                ipnUrl: MOMO_CONFIG.IPN_URL,
                extraData: extraData,
                requestType: MOMO_CONFIG.REQUEST_TYPE,
                signature: signature,
                lang: MOMO_CONFIG.LANG
            });

            console.log('MoMo Request Body:', requestBody);

            const options = {
                hostname: 'test-payment.momo.vn',
                port: 443,
                path: '/v2/gateway/api/create',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const req = https.request(options, (res) => {
                console.log(`MoMo API Status: ${res.statusCode}`);
                console.log(`MoMo API Headers: ${JSON.stringify(res.headers)}`);
                
                res.setEncoding('utf8');
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        console.log('MoMo Response:', response);
                        
                        if (response.resultCode === 0) {
                            resolve({
                                success: true,
                                data: {
                                    requestId: requestId,
                                    orderId: finalOrderId,
                                    payUrl: response.payUrl,
                                    qrCodeUrl: response.qrCodeUrl,
                                    deeplink: response.deeplink
                                }
                            });
                        } else {
                            reject({
                                success: false,
                                message: response.message || 'Payment creation failed',
                                resultCode: response.resultCode
                            });
                        }
                    } catch (error) {
                        reject({
                            success: false,
                            message: 'Failed to parse MoMo response',
                            error: error.message
                        });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('MoMo API Error:', error);
                reject({
                    success: false,
                    message: 'MoMo API request failed',
                    error: error.message
                });
            });

            console.log('Sending MoMo payment request...');
            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Query payment status from MoMo
     * @param {string} requestId - Request ID
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Query response
     */
    static async queryPayment(requestId, orderId) {
        return new Promise((resolve, reject) => {
            const params = {
                accessKey: MOMO_CONFIG.ACCESS_KEY,
                orderId: orderId,
                partnerCode: MOMO_CONFIG.PARTNER_CODE,
                requestId: requestId
            };

            const rawSignature = `accessKey=${params.accessKey}&orderId=${params.orderId}&partnerCode=${params.partnerCode}&requestId=${params.requestId}`;
            const signature = crypto
                .createHmac('sha256', MOMO_CONFIG.SECRET_KEY)
                .update(rawSignature)
                .digest('hex');

            const requestBody = JSON.stringify({
                partnerCode: MOMO_CONFIG.PARTNER_CODE,
                accessKey: MOMO_CONFIG.ACCESS_KEY,
                requestId: requestId,
                orderId: orderId,
                signature: signature,
                lang: MOMO_CONFIG.LANG
            });

            const options = {
                hostname: 'test-payment.momo.vn',
                port: 443,
                path: '/v2/gateway/api/query',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const req = https.request(options, (res) => {
                res.setEncoding('utf8');
                let body = '';
                
                res.on('data', (chunk) => {
                    body += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        resolve(response);
                    } catch (error) {
                        reject({
                            success: false,
                            message: 'Failed to parse MoMo query response',
                            error: error.message
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject({
                    success: false,
                    message: 'MoMo query request failed',
                    error: error.message
                });
            });

            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Verify MoMo callback signature
     * @param {Object} callbackData - Callback data from MoMo
     * @returns {boolean} - Signature verification result
     */
    static verifyCallbackSignature(callbackData) {
        const {
            accessKey: callbackAccessKey,
            amount,
            extraData,
            message,
            orderId,
            orderInfo,
            orderType,
            partnerCode,
            payType,
            requestId,
            responseTime,
            resultCode,
            transId
        } = callbackData;

        // MoMo không gửi accessKey trong IPN callback, nên sử dụng từ config
        const accessKey = callbackAccessKey || MOMO_CONFIG.ACCESS_KEY;

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

        const signature = crypto
            .createHmac('sha256', MOMO_CONFIG.SECRET_KEY)
            .update(rawSignature)
            .digest('hex');

        return signature === callbackData.signature;
    }
}

module.exports = MoMoService;

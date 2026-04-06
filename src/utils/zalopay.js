require('dotenv').config();

// Cấu hình ZaloPay - Sandbox
// Trim để loại bỏ khoảng trắng thừa trong biến môi trường
const getCallbackUrl = () => {
  const url = (process.env.ZALO_CALLBACK_URL || 'http://localhost:5000/api/payment/zalo-callback').trim();
  console.log('🔗 Callback URL:', url);
  return url;
};

module.exports = {
  app_id: process.env.ZALO_APP_ID || '2554',
  key1: process.env.ZALO_KEY1 || 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn',
  key2: process.env.ZALO_KEY2 || 'trMrHtvjo6myautxWwi88URgVk2EVVfY',
  endpoint: 'https://sb-openapi.zalopay.vn/v2/create',
  callback_url: getCallbackUrl(),
  redirect_url: (process.env.ZALO_REDIRECT_URL || 'http://localhost:5000/payment.html').trim()
};
  
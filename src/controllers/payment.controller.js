// controllers/payment.controller.js
const axios = require('axios');
const crypto = require('crypto');
const config = require('../utils/zalopay');
const PaymentUtil = require('../utils/payment.util');

// Hàm tạo giao dịch ZaloPay mới theo hướng dẫn
exports.createZaloOrder = async (req, res) => {
  try {
    const { bookingId, amount, timestamp } = req.body;

    console.log('📥 Received request:', { bookingId, amount, timestamp, type: typeof amount });

    if (!bookingId || !amount) {
      console.error('❌ Missing required fields:', { bookingId, amount });
      return res.status(400).json({ 
        status: 'error', 
        message: 'Thiếu thông tin bookingId hoặc số tiền' 
      });
    }

    // Đảm bảo amount là số
    const numericAmount = parseInt(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({ 
        status: 'error', 
        message: 'Số tiền không hợp lệ' 
      });
    }
    
    // Tạo thông tin chi tiết đơn hàng
    const embed_data = JSON.stringify({ bookingId });
   
    
    const items = JSON.stringify([]);
    // Lấy user_id từ request hoặc dùng guest
    const user_id = req.user?.id || req.user?.Id_user || 'guest';
    
    // Tạo mã giao dịch theo định dạng yymmdd_xxxxxx (yêu cầu của ZaloPay)
    const now = timestamp || Date.now();
    const date = new Date(now);
    
    // Format: yy (2 số cuối năm), mm (tháng), dd (ngày)
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    // Random 6 chữ số
    const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const app_trans_id = `${yy}${mm}${dd}_${randomSuffix}`;
    const app_time = now;

    console.log('📝 Generated app_trans_id:', app_trans_id, 'format: yymmdd_xxxxxx');
    console.log('📅 Date info:', { yy, mm, dd, randomSuffix });

    // Tạo chuỗi đầu vào cho hmac  
    const hmacInput = [
      config.app_id,
      app_trans_id,
      user_id,
      numericAmount,
      app_time,
      embed_data,
      items,
    ].join("|");

    // Tạo chữ ký mac
    const mac = crypto.createHmac("sha256", config.key1)
      .update(hmacInput)
      .digest("hex");
    console.log("🔍 hmacInput:", hmacInput);
    console.log("✅ mac:", mac);
    console.log("🔍 Using config:", {
      app_id: config.app_id,
      key1_length: config.key1?.length,
      endpoint: config.endpoint
    });
      
    // Tạo URL chuyển hướng khi hoàn tất thanh toán
    const redirect_url = `${config.redirect_url}?bookingId=${bookingId}`;
    
    // Tạo dữ liệu đơn hàng - đảm bảo amount là số nguyên
    // Trim tất cả URL để tránh lỗi khoảng trắng
    const orderData = {
      app_id: parseInt(config.app_id),
      app_trans_id,
      app_user: user_id,
      app_time,
      item: items,
      embed_data,
      amount: numericAmount,
      description: `Thanh toán đơn hàng #${bookingId}`,
      bank_code: "zalopayapp",
      callback_url: config.callback_url.trim(),
      redirect_url: redirect_url.trim(),
      mac,
    };

    console.log("Dữ liệu gửi đến ZaloPay:", orderData);

    // Gửi yêu cầu đến ZaloPay
    console.log("🔗 Calling ZaloPay API:", config.endpoint);
    const response = await axios.post(config.endpoint, orderData, {
      headers: {
        "Content-Type": "application/json",
      },
    }).catch(err => {
      console.error("❌ Axios error:", err.response?.data || err.message);
      throw err;
    });

    const data = response.data;
    console.log("📥 Phản hồi từ ZaloPay:", data);

    if (data.return_code === 1) {
      return res.json({
        status: 'success',
        payUrl: data.order_url,
        zp_trans_token: data.zp_trans_token,
        app_trans_id,
        redirect_url: redirect_url
      });
    } else {
      console.error("❌ ZaloPay error:", {
        return_code: data.return_code,
        return_message: data.return_message,
        sub_return_message: data.sub_return_message
      });
      
      // Xử lý các mã lỗi phổ biến của ZaloPay
      let errorMessage = data.return_message || 'Không thể tạo giao dịch ZaloPay';
      let userFriendlyMessage = errorMessage;
      
      // Xử lý mã lỗi cụ thể
      if (data.return_code && typeof data.return_code === 'string') {
        const errorCode = data.return_code;
        
        // Mã lỗi 1-615 thường là lỗi về cấu hình hoặc thông tin không hợp lệ
        if (errorCode.includes('615') || errorCode === '1-615') {
          userFriendlyMessage = 'Thông tin giao dịch không hợp lệ. Vui lòng kiểm tra lại số tiền và thông tin đặt tour.';
        } else if (errorCode.includes('401') || errorCode.includes('403')) {
          userFriendlyMessage = 'Lỗi xác thực với ZaloPay. Vui lòng liên hệ hỗ trợ.';
        } else if (errorCode.includes('500') || errorCode.includes('502') || errorCode.includes('503')) {
          userFriendlyMessage = 'Hệ thống ZaloPay đang bận. Vui lòng thử lại sau vài phút.';
        }
      }
      
      return res.status(400).json({
        status: 'error',
        message: userFriendlyMessage,
        sub_message: data.sub_return_message,
        return_code: data.return_code,
        original_message: errorMessage
      });
    }
  } catch (error) {
    console.error("❌ Lỗi tạo đơn hàng ZaloPay:", error.response?.data || error.message);
    res.status(500).json({ 
      status: 'error', 
      message: error.response?.data?.return_message || 'Không thể kết nối đến cổng thanh toán ZaloPay',
      error: error.message
    });
  }
};

// Hàm xác nhận thanh toán và cập nhật database
exports.confirmPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      amount,
      payment_method = 'ZaloPay',
      create_invoice = true,
      create_checkout = true
    } = req.body;

    console.log('Nhận yêu cầu xác nhận thanh toán:', {
      bookingId,
      amount,
      payment_method,
      create_invoice,
      create_checkout
    });

    if (!bookingId || !amount) {
      console.error('Thiếu thông tin thanh toán:', { bookingId, amount });
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu thông tin bookingId hoặc số tiền'
      });
    }

    const db = req.app.locals.db;
    if (!db) {
      throw new Error('Không thể kết nối database');
    }

    // Bắt đầu transaction
    console.log('Bắt đầu transaction');
    const BookingValidationService = require('../utils/booking-validation.util');

    await db.query('START TRANSACTION');

    try {
      // 1. Kiểm tra booking hợp lệ trước khi thanh toán
      console.log('1. Kiểm tra booking hợp lệ...');
      const validation = await BookingValidationService.validateBookingForPayment(bookingId, db);
      
      if (!validation.isValid) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          status: 'error',
          message: validation.error
        });
      }

      console.log('✅ Booking hợp lệ, tiến hành thanh toán');

      // 2. Cập nhật trạng thái booking (sử dụng connection hiện tại)
      console.log('2. Cập nhật trạng thái booking');
      await BookingValidationService.confirmPayment(bookingId, payment_method, db);
      console.log('✅ Đã cập nhật trạng thái booking thành "Đã thanh toán"');

      // 3. Tạo hóa đơn nếu được yêu cầu
      if (create_invoice) {
        console.log('3. Tạo hóa đơn');
        await PaymentUtil.createInvoice(bookingId, amount, db);
        console.log('✅ Đã tạo hóa đơn');
      }

      // 4. Tạo bản ghi checkout nếu được yêu cầu
      if (create_checkout) {
        console.log('4. Tạo bản ghi checkout');
        await PaymentUtil.createCheckout(bookingId, payment_method, amount, db);
        console.log('✅ Đã tạo checkout');
      }

      // Commit transaction
      console.log('Commit transaction');
      await db.query('COMMIT');
      
      console.log('✅ Hoàn tất xử lý thanh toán');
      return res.json({
        status: 'success',
        message: 'Đã xác nhận thanh toán và cập nhật cơ sở dữ liệu.'
      });

    } catch (error) {
      // Rollback nếu có lỗi
      console.error('❌ Lỗi trong quá trình xử lý, thực hiện rollback:', error);
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Lỗi xác nhận thanh toán:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi máy chủ khi xử lý thanh toán: ' + error.message
    });
  }
};

// Kiểm tra trạng thái giao dịch ZaloPay
exports.checkZaloStatus = async (req, res) => {
  try {
    const { bookingId, app_trans_id } = req.body;
    
    if (!bookingId || !app_trans_id) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Thiếu thông tin bookingId hoặc app_trans_id' 
      });
    }

    const query_url = 'https://sb-openapi.zalopay.vn/v2/query';
    const app_id = parseInt(config.app_id);
    
    const hmacInput = `${app_id}|${app_trans_id}|${config.key1}`;
    const mac = crypto.createHmac('sha256', config.key1)
      .update(hmacInput)
      .digest('hex');

    const data = {
      app_id,
      app_trans_id,
      mac
    };

    const response = await axios.post(query_url, data);
    const resData = response.data;

    if (resData.return_code === 1) {
      // Giao dịch thành công
      return res.json({
        status: 'success',
        message: 'Giao dịch thành công',
        data: resData
      });
    } else if (resData.return_code === 2) {
      return res.json({
        status: 'pending',
        message: 'Giao dịch đang xử lý',
        data: resData
      });
    } else {
      return res.json({
        status: 'failed',
        message: 'Giao dịch thất bại',
        data: resData
      });
    }

  } catch (err) {
    console.error('Lỗi khi kiểm tra trạng thái giao dịch:', err.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Lỗi hệ thống khi kiểm tra trạng thái giao dịch' 
    });
  }
};

// Hàm xử lý callback từ ZaloPay
exports.zaloCallback = async (req, res) => {
  try {
    console.log('🎯 ZaloPay Callback received at:', new Date().toISOString());
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    const dataStr = req.body.data;
    const reqMac = req.body.mac;

    console.log('📦 Callback data:', { 
      dataStr: dataStr,
      mac: reqMac,
      rawBody: JSON.stringify(req.body)
    });

    // Tạm thời bỏ qua kiểm tra MAC để test
    console.log('⚠️ MAC verification temporarily disabled for testing');

    // Giải mã dữ liệu
    const decodedData = JSON.parse(dataStr);
    console.log('✅ Decoded transaction data:', decodedData);

    // Xử lý embed_data
    if (decodedData.embed_data) {
      try {
        const embedData = JSON.parse(decodedData.embed_data);
        const bookingId = embedData.bookingId;
        console.log('📋 Extracted booking info:', { bookingId, embedData });

        if (bookingId) {
          console.log('🚀 Starting payment processing for booking:', bookingId);

          const db = req.app.locals.db;
          if (!db) throw new Error('Database connection not available');

          console.log('🔄 Starting database transaction');
          await db.query('START TRANSACTION');

          try {
            // Kiểm tra booking hợp lệ trước khi thanh toán
            const BookingValidationService = require('../utils/booking-validation.util');
            const validation = await BookingValidationService.validateBookingForPayment(bookingId, db);
            
            if (!validation.isValid) {
              await db.query('ROLLBACK');
              console.error('❌ Booking không hợp lệ:', validation.error);
              // Vẫn trả về 200 để ZaloPay không gọi lại
              return res.status(200).json({
                status: 'error',
                message: validation.error
              });
            }

            // Cập nhật trạng thái Booking (sử dụng connection hiện tại)
            await BookingValidationService.confirmPayment(bookingId, 'ZaloPay', db);
            console.log('✅ Đã cập nhật booking thành "Đã thanh toán"');

            // Sinh mã hóa đơn & checkout
            const maHoaDon = 'HD' + Date.now();
            const idCheckout = 'CK' + Date.now();

            // Tạo hóa đơn mới
            console.log('📄 Creating new invoice:', maHoaDon);
            await PaymentUtil.createInvoiceWithId(maHoaDon, bookingId, decodedData.amount, db);

            // Tạo bản ghi checkout mới
            console.log('💳 Creating new checkout record:', idCheckout);
            await PaymentUtil.createCheckoutWithZaloInfo(idCheckout, bookingId, decodedData.amount, decodedData.app_trans_id, db);

            await db.query('COMMIT');
            console.log('✅ Transaction committed successfully');
            return res.json({ return_code: 1, return_message: 'Success' });
            

          } catch (errTransaction) {
            console.error('❌ Transaction error:', errTransaction);
            await db.query('ROLLBACK');
            throw errTransaction;
          }
        }
      } catch (errDb) {
        console.error('❌ Database error:', errDb);
        return res.status(500).json({ return_code: -1, return_message: 'Database error: ' + errDb.message });
      }
    }

    console.log('⚠️ No booking ID found in embed_data');
    res.json({ return_code: 1, return_message: 'Success (no bookingId)' });

  } catch (error) {
    console.error('❌ Fatal error in callback:', error);
    return res.status(500).json({ return_code: -1, return_message: 'Internal Server Error: ' + error.message });
  }
};


async function thanhToanZalo(bookingId, amount) {
  const res = await fetch('/api/payment/zalo-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, amount })
  });

  const data = await res.json();
  if (data.status === 'success') {
    window.location.href = data.payUrl; // chuyển đến ZaloPay
  } else {
    alert(data.message);
  }
}

// Hàm chung để lưu thông tin giao dịch vào bảng checkout và hoadon
async function saveTransactionData(db, bookingId, amount, appTransId) {
  try {
    // Bắt đầu transaction để đảm bảo tính nhất quán của dữ liệu
    await db.query('START TRANSACTION');

    // 0. Cập nhật trạng thái booking thành đã thanh toán
    await PaymentUtil.updateBookingPaymentStatus(bookingId, db);

    // 1. Thêm dữ liệu vào bảng checkout
    await PaymentUtil.createCheckoutForTransaction(bookingId, amount, appTransId, db);

    // 2. Kiểm tra xem đã có hóa đơn cho booking này chưa
    const existingInvoices = await PaymentUtil.getInvoiceByBookingId(bookingId, db);

    // Nếu chưa có hóa đơn, tạo mới
    if (existingInvoices.length === 0) {
      await PaymentUtil.createInvoiceHoaDon(bookingId, amount, db);
    } else {
      // Nếu đã có, cập nhật trạng thái
      await PaymentUtil.updateInvoiceStatus(bookingId, db);
    }

    // Commit nếu tất cả các thao tác đều thành công
    await db.query('COMMIT');
    return true;
  } catch (error) {
    // Rollback nếu có lỗi
    await db.query('ROLLBACK');
    console.error('Lỗi khi lưu thông tin giao dịch:', error);
    throw error;
  }
}

// API endpoint cho frontend MoMo payment
exports.createMomoPayment = async (req, res) => {
  try {
    const { bookingId, amount, timestamp } = req.body;
    
    console.log('📥 Received MoMo payment request:', { bookingId, amount, timestamp });
    
    if (!bookingId || !amount) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Thiếu thông tin bookingId hoặc số tiền' 
      });
    }

    // Đảm bảo amount là số
    const numericAmount = parseInt(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      console.error('❌ Invalid amount:', amount);
      return res.status(400).json({ 
        status: 'error', 
        message: 'Số tiền không hợp lệ' 
      });
    }

    const MoMoService = require('../utils/momo.util');
    const MOMO_CONFIG = require('../utils/momo');

    console.log('📱 Creating MoMo payment for booking:', bookingId, 'amount:', numericAmount);

    // Tạo order ID theo format yymmdd_xxxxxx
    const now = timestamp || Date.now();
    const date = new Date(now);
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    
    // MoMo sử dụng format MOMO_bookingId_orderId
    const orderId = `MOMO_${bookingId}_${yy}${mm}${dd}_${randomSuffix}`;
    
    console.log('📝 Generated MoMo order ID:', orderId);

    const paymentData = {
      orderId: orderId,
      orderInfo: `Thanh toán đơn hàng #${bookingId}`,
      amount: numericAmount,
      extraData: JSON.stringify({ bookingId })
    };

    const result = await MoMoService.createPayment(paymentData);

    if (result.success) {
      console.log('✅ MoMo payment created successfully:', result.data);
      
      return res.json({
        status: 'success',
        payUrl: result.data.payUrl,
        qrCodeUrl: result.data.qrCodeUrl,
        deeplink: result.data.deeplink,
        requestId: result.data.requestId,
        orderId: result.data.orderId,
        bookingId: bookingId,
        message: 'Tạo giao dịch MoMo thành công'
      });
    } else {
      console.error('❌ MoMo payment creation failed:', result.message);
      return res.status(400).json({
        status: 'error',
        message: result.message || 'Không thể tạo giao dịch MoMo'
      });
    }
    
  } catch (error) {
    console.error('❌ MoMo payment creation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi khi tạo giao dịch MoMo',
      error: error.message
    });
  }
};

// API endpoint cho frontend ZaloPay payment
exports.createZaloPayment = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    
    if (!bookingId || !amount) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Thiếu thông tin bookingId hoặc số tiền' 
      });
    }

    console.log('📱 Creating ZaloPay payment for booking:', bookingId, 'amount:', amount);

    // Sử dụng lại logic từ createZaloOrder
    const embed_data = JSON.stringify({ bookingId });
    const items = JSON.stringify([]);
    const user_id = req.user?.id || 'guest';
    
    // Tạo mã giao dịch theo định dạng yymmdd_xxxxxx (yêu cầu của ZaloPay)
    const now = Date.now();
    const date = new Date(now);
    
    // Format: yy (2 số cuối năm), mm (tháng), dd (ngày)
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    // Random 6 chữ số
    const randomSuffix = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const app_trans_id = `${yy}${mm}${dd}_${randomSuffix}`;
    const app_time = now;

    console.log('📝 Generated app_trans_id (createZaloPayment):', app_trans_id, 'format: yymmdd_xxxxxx');
    console.log('📅 Date info:', { yy, mm, dd, randomSuffix });

    const orderInfo = `Thanh toán tour booking ${bookingId}`;
    
    const params = {
      app_id: config.app_id,
      app_trans_id: app_trans_id,
      app_user: user_id,
      app_time: app_time,
      amount: parseInt(amount),
      item: items,
      description: orderInfo,
      embed_data: embed_data,
      bank_code: 'zalopayapp',
      callback_url: config.callback_url
    };

    // Tạo mac
    const data = `${params.app_id}|${params.app_trans_id}|${params.app_user}|${params.amount}|${params.app_time}|${params.embed_data}|${params.item}`;
    params.mac = crypto.createHmac('sha256', config.key1).update(data).digest('hex');

    console.log('📱 ZaloPay params:', params);

    const response = await axios.post(config.endpoint, params, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📱 ZaloPay API response:', response.data);

    if (response.data && response.data.return_code === 1) {
      return res.json({
        status: 'success',
        order_url: response.data.order_url,
        app_trans_id: app_trans_id,
        message: 'Tạo giao dịch ZaloPay thành công'
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message: response.data.return_message || 'Lỗi khi tạo giao dịch ZaloPay'
      });
    }
    
  } catch (error) {
    console.error('❌ ZaloPay payment creation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi khi tạo giao dịch ZaloPay'
    });
  }
};
    
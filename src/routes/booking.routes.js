const express = require('express');
const bookingController = require('../controllers/booking.controller');
const { authenticateToken } = require('../utils/auth.util');
const router = express.Router();

// Middleware xác thực
router.use(authenticateToken);

// Lấy tất cả bookings (admin)
router.get('/', bookingController.getAllBookings);

// Lấy booking của user hiện tại
router.get('/user/me', bookingController.getUserBookings);

// Lấy booking theo ID
router.get('/:id', bookingController.getBookingById);

// Tạo booking mới
router.post('/', bookingController.createBooking);

// Cập nhật trạng thái booking
router.put('/:id/status', bookingController.updateBookingStatus);

// Thêm dịch vụ vào booking
router.post('/:id/services', bookingController.addServices);

// Tạo hóa đơn cho booking
router.post('/:id/invoice', bookingController.createInvoice);

// Xử lý thanh toán
router.post('/:id/payment', bookingController.processPayment);

// Hủy booking
router.delete('/:id', bookingController.cancelBooking);

// Route hủy tour trực tiếp
router.post('/:id/cancel', bookingController.cancelBooking);

module.exports = router; 
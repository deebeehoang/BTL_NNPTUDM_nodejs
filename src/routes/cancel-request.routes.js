const express = require('express');
const router = express.Router();
const CancelRequestController = require('../controllers/cancel-request.controller');
const { authenticateToken } = require('../utils/auth.util');

// Middleware xác thực để đảm bảo người dùng đã đăng nhập
router.use(authenticateToken);

// Route cho khách hàng
// Tạo yêu cầu hủy mới
router.post('/', CancelRequestController.createCancelRequest);

// Lấy chi tiết yêu cầu hủy theo ID
router.get('/:id', CancelRequestController.getCancelRequestById);

// Lấy thông tin yêu cầu hủy theo mã booking
router.get('/booking/:bookingId', CancelRequestController.getCancelRequestByBookingId);

// Routes chỉ dành cho admin
// Lấy tất cả yêu cầu hủy
router.get('/', CancelRequestController.getAllCancelRequests);

// Xử lý yêu cầu hủy (chấp nhận/từ chối)
router.put('/:id/process', CancelRequestController.processCancelRequest);

module.exports = router; 
// routes/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken } = require('../utils/auth.util');

// Không cần auth cho callback (ZaloPay gọi từ bên ngoài)
router.post('/zalo-callback', paymentController.zaloCallback);

// Các route cần authentication
router.post('/zalo-create', authenticateToken, paymentController.createZaloOrder);
router.post('/zalo-status', authenticateToken, paymentController.checkZaloStatus);
router.post('/bookings/:bookingId/payment', authenticateToken, paymentController.confirmPayment);

// Routes cho frontend payment
router.post('/momo/create', authenticateToken, paymentController.createMomoPayment);
router.post('/zalopay/create', authenticateToken, paymentController.createZaloPayment);

module.exports = router;

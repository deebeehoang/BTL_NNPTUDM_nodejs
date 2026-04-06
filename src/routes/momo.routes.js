const express = require('express');
const router = express.Router();
const MoMoController = require('../controllers/momo.controller');
const authMiddleware = require('../utils/auth.util');

/**
 * MoMo Payment Routes
 */

// Create MoMo payment
router.post('/create', 
    authMiddleware.authenticateToken,
    MoMoController.createPayment
);

// Handle MoMo payment return (redirect from MoMo)
router.get('/return', MoMoController.handleReturn);

// Handle MoMo IPN (Instant Payment Notification)
router.post('/ipn', MoMoController.handleIPN);

// Query payment status
router.get('/query/:requestId/:orderId', MoMoController.queryPayment);

module.exports = router;

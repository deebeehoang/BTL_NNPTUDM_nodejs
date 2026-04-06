const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../utils/auth.util');
const CustomerController = require('../controllers/customer.controller');

router.get('/me', authenticateToken, CustomerController.getMe);
router.put('/me', authenticateToken, CustomerController.updateMe);

module.exports = router;
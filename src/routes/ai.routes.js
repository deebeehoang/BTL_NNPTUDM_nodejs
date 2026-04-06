const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');

/**
 * AI Chat Routes
 * Tất cả routes đều public (không cần authentication)
 */

// Health check
router.get('/health', AIController.healthCheck);

// Chat với AI
router.post('/chat', AIController.chat);

module.exports = router;


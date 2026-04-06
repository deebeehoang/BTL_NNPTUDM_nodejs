const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chat.controller');

router.get('/users/list', ChatController.getUsersList);
router.get('/history/:userId', ChatController.getHistory);
router.get('/conversation/:user1/:user2', ChatController.getConversation);
router.post('/send', ChatController.sendMessage);
router.post('/mark-read/:adminId/:customerId', ChatController.markAsRead);
router.get('/unread/:userId', ChatController.getUnreadCount);
router.delete('/message/:messageId', ChatController.deleteMessage);
router.delete('/conversation/:user1/:user2', ChatController.deleteConversation);
router.get('/stats', ChatController.getStats);
router.get('/search', ChatController.searchMessages);

module.exports = router;
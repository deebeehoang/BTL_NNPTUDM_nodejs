const express = require('express');
const router = express.Router();
const TicketController = require('../controllers/ticket.controller');
const { authenticateToken, isAdmin } = require('../utils/auth.util');

// Admin-only ticket routes
router.get('/', authenticateToken, isAdmin, TicketController.getAllTickets);
// Route này phải đặt trước /:id để tránh conflict
router.post('/auto-update-expired', authenticateToken, isAdmin, TicketController.autoUpdateExpiredTickets);
router.get('/:id', authenticateToken, isAdmin, TicketController.getTicketById);
router.delete('/:id', authenticateToken, isAdmin, TicketController.deleteTicket);
router.put('/:id', authenticateToken, isAdmin, TicketController.updateTicket);
router.patch('/:id/status', authenticateToken, isAdmin, TicketController.updateTicketStatus);

module.exports = router;
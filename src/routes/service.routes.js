const express = require('express');
const ServiceController = require('../controllers/service.controller');
const { authenticateToken, isAdmin } = require('../utils/auth.util');

const router = express.Router();

// Public routes
router.get('/', ServiceController.getAllServices);
router.get('/search', ServiceController.searchServices);
router.get('/:id', ServiceController.getServiceById);

// Admin routes
router.post('/', authenticateToken, isAdmin, ServiceController.createService);
router.put('/:id', authenticateToken, isAdmin, ServiceController.updateService);
router.delete('/:id', authenticateToken, isAdmin, ServiceController.deleteService);

// Booking related routes
router.get('/booking/:bookingId', authenticateToken, ServiceController.getServicesForBooking);
router.post('/booking/:bookingId/service/:serviceId', authenticateToken, ServiceController.addServiceToBooking);
router.delete('/booking/:bookingId/service/:serviceId', authenticateToken, ServiceController.removeServiceFromBooking);

module.exports = router;
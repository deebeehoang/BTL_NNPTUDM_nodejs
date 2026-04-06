const express = require('express');
const DestinationController = require('../controllers/destination.controller');
const { authenticateToken, isAdmin } = require('../utils/auth.util');
const { destinationUpload } = require('../utils/upload.util');

const router = express.Router();

// Public routes
router.get('/', DestinationController.getAllDestinations);
router.get('/search', DestinationController.searchDestinations);

// Tours-destinations management routes for admin
router.get('/tours/available', authenticateToken, isAdmin, DestinationController.getAvailableTours);
router.get('/tours/:tourId/destinations', authenticateToken, isAdmin, DestinationController.getTourDestinations);
router.post('/tours/:tourId/destinations/:destinationId', authenticateToken, isAdmin, DestinationController.addDestinationToTour);
router.put('/tours/:tourId/destinations/:destinationId', authenticateToken, isAdmin, DestinationController.updateDestinationOrder);
router.delete('/tours/:tourId/destinations/:destinationId', authenticateToken, isAdmin, DestinationController.removeDestinationFromTour);

// Get destination by ID - must be after other specific routes
router.get('/:id', DestinationController.getDestinationById);

// Admin only routes
router.post('/', authenticateToken, isAdmin, destinationUpload.single('hinh_anh'), DestinationController.createDestination);
router.put('/:id', authenticateToken, isAdmin, destinationUpload.single('hinh_anh'), DestinationController.updateDestination);
router.delete('/:id', authenticateToken, isAdmin, DestinationController.deleteDestination);

module.exports = router;
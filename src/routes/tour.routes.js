const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tour.controller');
const authMiddleware = require('../utils/auth.util');

// GET all tours
router.get('/', tourController.getAllTours);

// GET all tours directly from database (admin only)
router.get('/database/all', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.getAllToursFromDatabase);

// Debug route for table structure (admin only)
router.get('/debug/table-structure', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.checkDatabaseStructure);

// Search tours
router.get('/search', tourController.searchTours);

// GET featured tours
router.get('/featured', tourController.getFeaturedTours);

// GET popular tours
router.get('/popular', tourController.getPopularTours);

// GET popular destinations
router.get('/destinations/popular', tourController.getPopularDestinations);

// Lọc tour theo điểm đến
router.get('/destination/:destinationId', tourController.getToursByDestination);

// GET tour directly from Tour_du_lich table without joining with Dia_danh
router.get('/direct/:id', tourController.getTourDirectFromTable);

// Debug route - Đặt TRƯỚC các route có tham số động
router.get('/debug/check-structure', tourController.checkDatabaseStructure);

// Tour schedules - Đặt trước route có tham số
router.get('/schedules/available', tourController.getAvailableSchedules);
router.get('/schedules/popular', tourController.getPopularSchedules);
router.get('/schedules', authMiddleware.authenticateToken, tourController.getAllSchedules);
router.post('/schedules', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.createSchedule);
router.get('/schedules/:lichId', tourController.getScheduleById);
router.put('/schedules/:lichId', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.updateSchedule);
router.delete('/schedules/:lichId', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.deleteSchedule);
router.get('/schedules/:lichId/available-seats', tourController.getAvailableSeats);

// GET tour by ID - Đặt sau các route cụ thể
router.get('/:id', tourController.getTourById);

// Get upcoming schedules for a tour
router.get('/:tourId/upcoming-schedules', tourController.getUpcomingSchedules);

// Get destinations for a tour
router.get('/:tourId/destinations', tourController.getTourDestinations);

// Protected routes - Yêu cầu quyền Admin
router.post('/', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.createTour);
router.put('/:id', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.updateTour);
router.delete('/:id', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.deleteTour);

// Tour destinations
router.post('/:tourId/destinations/:destinationId', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.addDestinationToTour);
router.delete('/:tourId/destinations/:destinationId', authMiddleware.authenticateToken, authMiddleware.isAdmin, tourController.removeDestinationFromTour);

module.exports = router;
const express = require('express');
const AdminController = require('../controllers/admin.controller');
const TourController = require('../controllers/tour.controller');
const { authenticateToken, isAdmin } = require('../utils/auth.util');

const router = express.Router();

// All admin routes need authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

// Dashboard
router.get('/dashboard-stats', AdminController.getDashboardStats);

// Tour management - sử dụng controller từ tour.controller.js
router.get('/tours', TourController.getAllTours);
router.get('/tours/:id', TourController.getTourById);
router.post('/tours', TourController.createTour);
router.put('/tours/:id', TourController.updateTour);
router.delete('/tours/:id', TourController.deleteTour);
router.post('/tours/schedules', TourController.createSchedule);
router.post('/tours/:tourId/destinations/:destinationId', TourController.addDestinationToTour);
router.delete('/tours/:tourId/destinations/:destinationId', TourController.removeDestinationFromTour);

// Customer management
router.get('/customers', AdminController.getAllCustomers);
router.get('/customers/:id', AdminController.getCustomerById);

// Reports
router.get('/reports/sales', AdminController.generateSalesReport);

// Revenue routes
router.get('/revenue/monthly/:year', AdminController.getMonthlyRevenue);
router.get('/revenue/yearly', AdminController.getYearlyRevenue);

// Quản lý địa danh
router.get('/dia-danh', AdminController.getAllDiaDanh);
router.post('/dia-danh', AdminController.createDiaDanh);
router.put('/dia-danh/:id', AdminController.updateDiaDanh);
router.delete('/dia-danh/:id', AdminController.deleteDiaDanh);

// Quản lý lịch khởi hành
router.get('/lich-khoi-hanh', AdminController.getAllLichKhoiHanh);
router.post('/lich-khoi-hanh', AdminController.createLichKhoiHanh);
router.put('/lich-khoi-hanh/:id', AdminController.updateLichKhoiHanh);
router.delete('/lich-khoi-hanh/:id', AdminController.deleteLichKhoiHanh);

// Quản lý xác nhận thanh toán
router.get('/pending-payments', AdminController.getPendingPayments);
router.get('/booking/:bookingId/payment-details', AdminController.getBookingForPaymentConfirmation);
router.post('/confirm-payment/:bookingId', AdminController.confirmPayment);

module.exports = router;
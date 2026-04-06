const express = require('express');
const router = express.Router();
const TourItineraryController = require('../controllers/tourItinerary.controller');
const authMiddleware = require('../utils/auth.util');

/**
 * Tour Itinerary Routes
 */

// Lấy danh sách lịch trình theo tour (public)
router.get('/tour/:Ma_tour/itinerary', TourItineraryController.getByTourId);

// Lấy thông tin một ngày cụ thể (public)
router.get('/itinerary/:Ma_itinerary', TourItineraryController.getById);

// Tạo một ngày mới (Admin only)
router.post(
  '/tour/:Ma_tour/itinerary',
  authMiddleware.authenticateToken,
  authMiddleware.isAdmin,
  TourItineraryController.create
);

// Cập nhật thông tin một ngày (Admin only)
router.put(
  '/itinerary/:Ma_itinerary',
  authMiddleware.authenticateToken,
  authMiddleware.isAdmin,
  TourItineraryController.update
);

// Xóa một ngày (Admin only)
router.delete(
  '/itinerary/:Ma_itinerary',
  authMiddleware.authenticateToken,
  authMiddleware.isAdmin,
  TourItineraryController.delete
);

// Tự động tạo các ngày theo Thoi_gian (Admin only)
router.post(
  '/tour/:Ma_tour/itinerary/generate',
  authMiddleware.authenticateToken,
  authMiddleware.isAdmin,
  TourItineraryController.autoGenerate
);

// Reorder các ngày (Admin only)
router.put(
  '/tour/:Ma_tour/itinerary/reorder',
  authMiddleware.authenticateToken,
  authMiddleware.isAdmin,
  TourItineraryController.reorder
);

// ===== LỊCH TRÌNH THEO LỊCH KHỞI HÀNH =====

// Lấy danh sách lịch trình theo lịch khởi hành (public)
router.get('/schedule/:Ma_lich/itinerary', TourItineraryController.getByScheduleId);

// Tạo một ngày mới cho lịch khởi hành (Admin only)
router.post(
  '/schedule/:Ma_lich/itinerary',
  authMiddleware.authenticateToken,
  authMiddleware.isAdmin,
  TourItineraryController.createForSchedule
);

module.exports = router;


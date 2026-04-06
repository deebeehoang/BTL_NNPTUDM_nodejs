const express = require('express');
const AdminGuideController = require('../controllers/admin-guide.controller');
const { authenticateToken, isAdmin } = require('../utils/auth.util');

const router = express.Router();

// Tất cả routes đều cần authentication và quyền Admin
router.use(authenticateToken);
router.use(isAdmin);

/**
 * @route   GET /api/admin/guides/available
 * @desc    Lấy danh sách hướng dẫn viên rảnh trong khoảng thời gian
 * @access  Private (Admin only)
 * @query   date_from - Ngày bắt đầu (YYYY-MM-DD)
 * @query   date_to - Ngày kết thúc (YYYY-MM-DD)
 * 
 * LƯU Ý: Route này phải được đăng ký TRƯỚC route /guides/:ma_huong_dan_vien
 * để tránh Express match "available" như một ma_huong_dan_vien
 */
router.get('/guides/available', AdminGuideController.getAvailableGuides);

/**
 * @route   GET /api/admin/guides
 * @desc    Lấy danh sách tất cả hướng dẫn viên
 * @access  Private (Admin only)
 * @query   status - Filter theo trạng thái (Hoat_dong, Nghi_phep, Nghi_viec, all)
 * @query   search - Tìm kiếm theo tên, SĐT, email
 */
router.get('/guides', AdminGuideController.getAllGuides);

/**
 * @route   POST /api/admin/guides
 * @desc    Tạo tài khoản hướng dẫn viên mới
 * @access  Private (Admin only)
 */
router.post('/guides', AdminGuideController.createGuide);

/**
 * @route   GET /api/admin/guides/:ma_huong_dan_vien
 * @desc    Lấy thông tin chi tiết hướng dẫn viên
 * @access  Private (Admin only)
 */
router.get('/guides/:ma_huong_dan_vien', AdminGuideController.getGuideById);

/**
 * @route   PUT /api/admin/guides/:ma_huong_dan_vien
 * @desc    Cập nhật thông tin hướng dẫn viên
 * @access  Private (Admin only)
 */
router.put('/guides/:ma_huong_dan_vien', AdminGuideController.updateGuide);

/**
 * @route   DELETE /api/admin/guides/:ma_huong_dan_vien
 * @desc    Xóa/Vô hiệu hóa hướng dẫn viên
 * @access  Private (Admin only)
 */
router.delete('/guides/:ma_huong_dan_vien', AdminGuideController.deleteGuide);

/**
 * @route   PUT /api/admin/schedules/:ma_lich/assign-guide
 * @desc    Phân công hướng dẫn viên cho lịch
 * @access  Private (Admin only)
 */
router.put('/schedules/:ma_lich/assign-guide', AdminGuideController.assignGuideToSchedule);

module.exports = router;


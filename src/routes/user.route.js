const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticateToken } = require('../utils/auth.util');

// Middleware xác thực cho tất cả các routes
router.use(authenticateToken);

// Lấy danh sách người dùng
router.get('/', UserController.getAllUsers);

// Xem chi tiết người dùng
router.get('/:ma_khach_hang', UserController.getUserDetails);

// Cập nhật thông tin người dùng
router.put('/:ma_khach_hang', UserController.updateUser);

// Block/Unblock người dùng
router.post('/:ma_khach_hang/block', UserController.blockUser);

// Xóa người dùng (giữ lại để tương thích)
router.delete('/:ma_khach_hang', UserController.deleteUser);

module.exports = router;

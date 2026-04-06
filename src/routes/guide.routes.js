const express = require('express');
const GuideController = require('../controllers/guide.controller');
const { authenticateToken } = require('../utils/auth.util');
const { certificateUpload, avatarUpload } = require('../utils/upload.util');

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(authenticateToken);

/**
 * @route   GET /api/guide/profile/:id_user
 * @desc    Lấy thông tin hướng dẫn viên
 * @access  Private (Guide hoặc Admin)
 */
router.get('/profile/:id_user', GuideController.getProfile);


router.put('/profile/:id_user', avatarUpload.single('anh_dai_dien'), GuideController.updateProfile);


router.get('/schedules/:ma_huong_dan_vien', GuideController.getSchedules);


router.get('/schedule/:ma_lich/bookings', GuideController.getScheduleBookings);


router.get('/reviews/:ma_huong_dan_vien', GuideController.getReviews);

router.get('/stats/:ma_huong_dan_vien', GuideController.getStats);


router.get('/certificates/:ma_huong_dan_vien', GuideController.getCertificates);


router.post('/certificates', certificateUpload.single('file'), GuideController.addCertificate);


router.delete('/certificates/:ma_chung_chi', GuideController.deleteCertificate);

module.exports = router;


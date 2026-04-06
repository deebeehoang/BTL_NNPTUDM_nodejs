const Guide = require('../schemas/guide.schema');
const GuideUtil = require('../utils/guide.util');
const bcrypt = require('bcrypt');
const User = require('../schemas/user.schema');

/**
 * Admin Guide Controller - Xử lý các request Admin quản lý Hướng dẫn viên
 */
class AdminGuideController {
  /**
   * Lấy danh sách tất cả hướng dẫn viên
   * GET /api/admin/guides
   */
  static async getAllGuides(req, res) {
    try {
      const { status, search } = req.query;
      
      const filters = {};
      if (status && status !== 'all') {
        filters.status = status;
      }
      if (search) {
        filters.search = search;
      }
      
      const guides = await Guide.getAll(filters);
      
      // Lấy thống kê cho mỗi guide
      const guidesWithStats = await Promise.all(
        guides.map(async (guide) => {
          const stats = await Guide.getStats(guide.Ma_huong_dan_vien);
          return {
            ...guide,
            stats
          };
        })
      );
      
      res.json({
        status: 'success',
        results: guidesWithStats.length,
        data: { guides: guidesWithStats }
      });
    } catch (error) {
      console.error('Error getting all guides:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy danh sách hướng dẫn viên',
        error: error.message
      });
    }
  }

  /**
   * Lấy thông tin chi tiết hướng dẫn viên
   * GET /api/admin/guides/:ma_huong_dan_vien
   */
  static async getGuideById(req, res) {
    try {
      const { ma_huong_dan_vien } = req.params;
      
      const guide = await Guide.findById(ma_huong_dan_vien);
      
      if (!guide) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy hướng dẫn viên'
        });
      }
      
      const stats = await Guide.getStats(ma_huong_dan_vien);
      
      res.json({
        status: 'success',
        data: {
          guide: {
            ...guide,
            stats
          }
        }
      });
    } catch (error) {
      console.error('Error getting guide by id:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy thông tin hướng dẫn viên',
        error: error.message
      });
    }
  }

  /**
   * Tạo tài khoản hướng dẫn viên mới
   * POST /api/admin/guides
   */
  static async createGuide(req, res) {
    try {
      const {
        id_user, email, password, ten_huong_dan_vien, ngay_sinh,
        gioi_tinh, dia_chi, so_dien_thoai, cccd, ngon_ngu,
        kinh_nghiem, chung_chi, anh_dai_dien, trang_thai = 'Hoat_dong'
      } = req.body;
      
      if (!id_user || !email || !password || !ten_huong_dan_vien || !ngay_sinh || 
          !gioi_tinh || !so_dien_thoai || !cccd) {
        return res.status(400).json({ status: 'error', message: 'Thiếu thông tin bắt buộc' });
      }
      
      const existingUser = await User.findById(id_user);
      if (existingUser) {
        return res.status(400).json({ status: 'error', message: 'Tên tài khoản đã tồn tại' });
      }
      
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ status: 'error', message: 'Email đã tồn tại' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const ma_huong_dan_vien = `HDV${Date.now()}`;
      
      await GuideUtil.createGuideWithAccount({
        id_user, email, hashedPassword, ma_huong_dan_vien, ten_huong_dan_vien,
        ngay_sinh, gioi_tinh, dia_chi, so_dien_thoai, cccd,
        ngon_ngu, kinh_nghiem, chung_chi, anh_dai_dien, trang_thai
      });
      
      const guide = await Guide.findById(ma_huong_dan_vien);
      
      res.status(201).json({
        status: 'success',
        message: 'Tạo hướng dẫn viên thành công',
        data: { guide }
      });
    } catch (error) {
      console.error('Error creating guide:', error);
      res.status(500).json({ status: 'error', message: 'Lỗi khi tạo hướng dẫn viên', error: error.message });
    }
  }

  /**
   * Cập nhật thông tin hướng dẫn viên
   * PUT /api/admin/guides/:ma_huong_dan_vien
   */
  static async updateGuide(req, res) {
    try {
      const { ma_huong_dan_vien } = req.params;
      
      const guide = await Guide.findById(ma_huong_dan_vien);
      
      if (!guide) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy hướng dẫn viên'
        });
      }
      
      const updatedGuide = await Guide.update(ma_huong_dan_vien, req.body);
      
      res.json({
        status: 'success',
        message: 'Cập nhật thông tin thành công',
        data: { guide: updatedGuide }
      });
    } catch (error) {
      console.error('Error updating guide:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi cập nhật thông tin',
        error: error.message
      });
    }
  }

  /**
   * Xóa/Vô hiệu hóa hướng dẫn viên
   * DELETE /api/admin/guides/:ma_huong_dan_vien
   */
  static async deleteGuide(req, res) {
    try {
      const { ma_huong_dan_vien } = req.params;
      
      const guide = await Guide.findById(ma_huong_dan_vien);
      if (!guide) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy hướng dẫn viên' });
      }
      
      const hasSchedules = await GuideUtil.hasUpcomingSchedules(ma_huong_dan_vien);
      if (hasSchedules) {
        return res.status(400).json({ status: 'error', message: 'Không thể xóa hướng dẫn viên đang có lịch sắp tới' });
      }
      
      const success = await Guide.delete(ma_huong_dan_vien);
      if (!success) {
        return res.status(500).json({ status: 'error', message: 'Không thể xóa hướng dẫn viên' });
      }
      
      res.json({ status: 'success', message: 'Xóa hướng dẫn viên thành công' });
    } catch (error) {
      console.error('Error deleting guide:', error);
      res.status(500).json({ status: 'error', message: 'Lỗi khi xóa hướng dẫn viên', error: error.message });
    }
  }

  /**
   * Phân công hướng dẫn viên cho lịch
   * PUT /api/admin/schedules/:ma_lich/assign-guide
   */
  static async assignGuideToSchedule(req, res) {
    try {
      const { ma_lich } = req.params;
      const { ma_huong_dan_vien } = req.body;
      
      // Cho phép gỡ HDV (ma_huong_dan_vien = null, '', hoặc undefined)
      const shouldRemoveGuide = !ma_huong_dan_vien || ma_huong_dan_vien === 'null' || ma_huong_dan_vien === '';
      
      // Kiểm tra lịch tồn tại
      const schedule = await GuideUtil.getScheduleById(ma_lich);
      
      if (!schedule) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy lịch'
        });
      }
      
      // Nếu muốn gỡ hướng dẫn viên
      if (shouldRemoveGuide) {
        await GuideUtil.removeGuideFromSchedule(ma_lich);
        
        // Emit socket event
        const io = req.app.get('io');
        const adminSockets = req.app.get('adminSockets');
        if (io && adminSockets) {
          Object.values(adminSockets).forEach(adminSocket => {
            adminSocket.emit('schedule_guide_updated', {
              ma_lich,
              ma_huong_dan_vien: null
            });
          });
        }
        
        return res.json({
          status: 'success',
          message: 'Đã gỡ hướng dẫn viên khỏi lịch'
        });
      }
      
      // Kiểm tra hướng dẫn viên tồn tại
      const guide = await Guide.findById(ma_huong_dan_vien);
      if (!guide) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy hướng dẫn viên'
        });
      }
      
      // Kiểm tra hướng dẫn viên có rảnh không
      const dateFrom = req.body.date_from || schedule.Ngay_bat_dau || schedule.Ngay_khoi_hanh;
      const dateTo = req.body.date_to || schedule.Ngay_ket_thuc;
      
      const isAvailable = await Guide.isAvailable(
        ma_huong_dan_vien,
        dateFrom,
        dateTo,
        ma_lich
      );
      
      if (!isAvailable) {
        const conflictingSchedules = await GuideUtil.getConflictingSchedules(ma_huong_dan_vien, ma_lich, dateFrom, dateTo);
        
        let errorMessage = 'Hướng dẫn viên đã có lịch trùng thời gian trong khoảng thời gian này';
        if (conflictingSchedules.length > 0) {
          const conflict = conflictingSchedules[0];
          errorMessage += ` (Lịch: ${conflict.Ma_lich}, từ ${conflict.Ngay_bat_dau} đến ${conflict.Ngay_ket_thuc})`;
        }
        
        return res.status(400).json({
          status: 'error',
          message: errorMessage
        });
      }
      
      // Phân công
      await GuideUtil.assignGuideToSchedule(ma_lich, ma_huong_dan_vien);
      
      // Emit socket event để thông báo cho guide
      const io = req.app.get('io');
      const guideSockets = req.app.get('guideSockets');
      const adminSockets = req.app.get('adminSockets');
      
      if (io) {
        // Tìm guide socket qua guideSockets (sử dụng Ma_huong_dan_vien)
        if (guideSockets && guideSockets[ma_huong_dan_vien]) {
          guideSockets[ma_huong_dan_vien].emit('guide_assigned', {
            ma_lich,
            ma_huong_dan_vien,
            schedule: {
              Ma_lich: schedule.Ma_lich,
              Ma_tour: schedule.Ma_tour,
              Ngay_bat_dau: schedule.Ngay_bat_dau || schedule.Ngay_khoi_hanh,
              Ngay_ket_thuc: schedule.Ngay_ket_thuc,
              So_cho: schedule.So_cho,
              Ma_huong_dan_vien: ma_huong_dan_vien
            },
            message: 'Bạn đã được phân công cho lịch khởi hành mới'
          });
        }
        
        // Thông báo cho admin
        if (adminSockets) {
          Object.values(adminSockets).forEach(adminSocket => {
            adminSocket.emit('schedule_guide_updated', {
              ma_lich,
              ma_huong_dan_vien
            });
          });
        }
      }
      
      res.json({
        status: 'success',
        message: 'Phân công hướng dẫn viên thành công'
      });
    } catch (error) {
      console.error('Error assigning guide to schedule:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi phân công hướng dẫn viên',
        error: error.message
      });
    }
  }

  /**
   * Lấy danh sách hướng dẫn viên rảnh trong khoảng thời gian
   * GET /api/admin/guides/available
   * @query date_from - Ngày bắt đầu
   * @query date_to - Ngày kết thúc
   * @query exclude_schedule - Schedule ID để exclude (khi đang edit)
   * @query ma_tour - Mã tour (nếu có, để kiểm tra trùng tour)
   */
  static async getAvailableGuides(req, res) {
    try {
      const { date_from, date_to, exclude_schedule, ma_tour } = req.query;
      
      if (!date_from || !date_to) {
        return res.status(400).json({
          status: 'error',
          message: 'Thiếu thông tin ngày bắt đầu hoặc ngày kết thúc'
        });
      }
      
      const guides = await Guide.getAvailableGuides(
        date_from, 
        date_to, 
        exclude_schedule || null,
        ma_tour || null
      );
      
      res.json({
        status: 'success',
        results: guides.length,
        data: { guides }
      });
    } catch (error) {
      console.error('Error getting available guides:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy danh sách hướng dẫn viên rảnh',
        error: error.message
      });
    }
  }
}

module.exports = AdminGuideController;


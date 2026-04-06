const Booking = require('../schemas/booking.schema');
const AdminUtil = require('../utils/admin.util');

/**
 * Admin Controller
 */
class AdminController {
  /**
   * Get admin dashboard statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getDashboardStats(req, res) {
    try {
      const [revenueStats, tourStats, topCustomer, topTour] = await Promise.all([
        AdminUtil.getRevenueStats(),
        AdminUtil.getTourStats(),
        AdminUtil.getTopCustomers(),
        AdminUtil.getTopTours()
      ]);

      res.json({
        status: 'success',
        data: {
          tourStats: {
            total: tourStats?.total_tours || 0,
            available: tourStats?.available_tours || 0,
            full: tourStats?.full_tours || 0,
            upcoming: tourStats?.upcoming_tours || 0
          },
          monthlyBookings: revenueStats?.total_orders || 0,
          totalRevenue: revenueStats?.total_revenue || 0,
          pendingOrders: revenueStats?.pending_orders || 0,
          completedOrders: revenueStats?.completed_orders || 0,
          topCustomer,
          topTour
        }
      });
    } catch (error) {
      console.error('Chi tiết lỗi khi lấy thống kê dashboard:', error);
      res.status(500).json({
        status: 'error',
        message: 'Không thể lấy dữ liệu thống kê',
        error: error.message
      });
    }
  }
  
  /**
   * Get all customers (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllCustomers(req, res) {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ status: 'error', message: 'Not authorized to perform this action' });
      }
      
      const customers = await AdminUtil.getAllCustomers();
      
      res.status(200).json({
        status: 'success',
        results: customers.length,
        data: { customers }
      });
    } catch (error) {
      console.error('Get all customers error:', error);
      res.status(500).json({ status: 'error', message: 'Error getting customers', error: error.message });
    }
  }
  
  /**
   * Get a specific customer by ID (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getCustomerById(req, res) {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ status: 'error', message: 'Not authorized to perform this action' });
      }
      
      const customerId = req.params.id;
      const customer = await AdminUtil.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({ status: 'error', message: 'Customer not found' });
      }
      
      const bookings = await Booking.getByCustomerId(customerId);
      
      res.status(200).json({
        status: 'success',
        data: { customer, bookings }
      });
    } catch (error) {
      console.error(`Get customer ${req.params.id} error:`, error);
      res.status(500).json({ status: 'error', message: 'Error getting customer details', error: error.message });
    }
  }
  
  /**
   * Generate sales report (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async generateSalesReport(req, res) {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ status: 'error', message: 'Not authorized to perform this action' });
      }
      
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ status: 'error', message: 'Start date and end date are required' });
      }
      
      const bookings = await AdminUtil.getBookingsInDateRange(startDate, endDate);
      
      const totalRevenue = bookings.reduce((sum, booking) => sum + parseFloat(booking.Tong_tien), 0);
      
      const statusCounts = bookings.reduce((acc, booking) => {
        const status = booking.Trang_thai;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      const tourRevenue = bookings.reduce((acc, booking) => {
        const tourName = booking.Ten_tour;
        acc[tourName] = (acc[tourName] || 0) + parseFloat(booking.Tong_tien);
        return acc;
      }, {});
      
      res.status(200).json({
        status: 'success',
        data: {
          report: { startDate, endDate, totalBookings: bookings.length, totalRevenue, statusCounts, tourRevenue, bookings }
        }
      });
    } catch (error) {
      console.error('Generate sales report error:', error);
      res.status(500).json({ status: 'error', message: 'Error generating sales report', error: error.message });
    }
  }

  static async getMonthlyRevenue(req, res) {
    try {
      const year = parseInt(req.params.year) || new Date().getFullYear();
      const results = await AdminUtil.getMonthlyRevenue(year);

      const monthlyRevenue = Array(12).fill(0);
      results.forEach(row => {
        monthlyRevenue[row.month - 1] = parseFloat(row.revenue);
      });

      res.json({ status: 'success', data: monthlyRevenue });
    } catch (error) {
      console.error('Lỗi khi lấy doanh thu theo tháng:', error);
      res.status(500).json({ status: 'error', message: 'Không thể lấy dữ liệu doanh thu theo tháng' });
    }
  }

  static async getYearlyRevenue(req, res) {
    try {
      const results = await AdminUtil.getYearlyRevenue();

      const yearlyRevenue = {};
      results.forEach(row => {
        yearlyRevenue[row.year] = parseFloat(row.revenue);
      });

      res.json({ status: 'success', data: yearlyRevenue });
    } catch (error) {
      console.error('Lỗi khi lấy doanh thu theo năm:', error);
      res.status(500).json({ status: 'error', message: 'Không thể lấy dữ liệu doanh thu theo năm' });
    }
  }

  /**
   * Get all địa danh
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllDiaDanh(req, res) {
    try {
      const diadanh = await AdminUtil.getAllDiaDanh();
      res.json({ status: 'success', data: diadanh });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách địa danh:', error);
      res.status(500).json({ status: 'error', message: 'Không thể lấy danh sách địa danh', error: error.message });
    }
  }

  static async createDiaDanh(req, res) {
    try {
      const { ten_dia_danh, mo_ta, hinh_anh, tinh_thanh } = req.body;
      const result = await AdminUtil.createDiaDanh({ ten_dia_danh, mo_ta, hinh_anh, tinh_thanh });

      res.status(201).json({
        status: 'success',
        message: 'Đã thêm địa danh mới',
        data: { id: result.insertId, ten_dia_danh, mo_ta, hinh_anh, tinh_thanh }
      });
    } catch (error) {
      console.error('Lỗi khi thêm địa danh:', error);
      res.status(500).json({ status: 'error', message: 'Không thể thêm địa danh', error: error.message });
    }
  }

  static async updateDiaDanh(req, res) {
    try {
      const { id } = req.params;
      const { ten_dia_danh, mo_ta, hinh_anh, tinh_thanh } = req.body;
      const result = await AdminUtil.updateDiaDanh(id, { ten_dia_danh, mo_ta, hinh_anh, tinh_thanh });

      if (result.affectedRows === 0) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy địa danh' });
      }

      res.json({
        status: 'success',
        message: 'Đã cập nhật địa danh',
        data: { id, ten_dia_danh, mo_ta, hinh_anh, tinh_thanh }
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật địa danh:', error);
      res.status(500).json({ status: 'error', message: 'Không thể cập nhật địa danh', error: error.message });
    }
  }

  static async deleteDiaDanh(req, res) {
    try {
      const { id } = req.params;
      const result = await AdminUtil.deleteDiaDanh(id);

      if (result.affectedRows === 0) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy địa danh' });
      }

      res.json({ status: 'success', message: 'Đã xóa địa danh' });
    } catch (error) {
      console.error('Lỗi khi xóa địa danh:', error);
      res.status(500).json({ status: 'error', message: 'Không thể xóa địa danh', error: error.message });
    }
  }

  /**
   * Get all lịch khởi hành
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllLichKhoiHanh(req, res) {
    try {
      const lichkhoihanh = await AdminUtil.getAllLichKhoiHanh();
      res.json({ status: 'success', data: lichkhoihanh });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lịch khởi hành:', error);
      res.status(500).json({ status: 'error', message: 'Không thể lấy danh sách lịch khởi hành', error: error.message });
    }
  }

  static async createLichKhoiHanh(req, res) {
    try {
      const { ma_tour, ngay_khoi_hanh, so_cho, ghi_chu } = req.body;
      const result = await AdminUtil.createLichKhoiHanh({ ma_tour, ngay_khoi_hanh, so_cho, ghi_chu });

      res.status(201).json({
        status: 'success',
        message: 'Đã thêm lịch khởi hành mới',
        data: { id: result.insertId, ma_tour, ngay_khoi_hanh, so_cho, ghi_chu }
      });
    } catch (error) {
      console.error('Lỗi khi thêm lịch khởi hành:', error);
      res.status(500).json({ status: 'error', message: 'Không thể thêm lịch khởi hành', error: error.message });
    }
  }

  static async updateLichKhoiHanh(req, res) {
    try {
      const { id } = req.params;
      const { ma_tour, ngay_khoi_hanh, so_cho, ghi_chu } = req.body;
      const result = await AdminUtil.updateLichKhoiHanh(id, { ma_tour, ngay_khoi_hanh, so_cho, ghi_chu });

      if (result.affectedRows === 0) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy lịch khởi hành' });
      }

      res.json({
        status: 'success',
        message: 'Đã cập nhật lịch khởi hành',
        data: { id, ma_tour, ngay_khoi_hanh, so_cho, ghi_chu }
      });
    } catch (error) {
      console.error('Lỗi khi cập nhật lịch khởi hành:', error);
      res.status(500).json({ status: 'error', message: 'Không thể cập nhật lịch khởi hành', error: error.message });
    }
  }

  static async deleteLichKhoiHanh(req, res) {
    try {
      const { id } = req.params;
      const result = await AdminUtil.deleteLichKhoiHanh(id);

      if (result.affectedRows === 0) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy lịch khởi hành' });
      }

      res.json({ status: 'success', message: 'Đã xóa lịch khởi hành' });
    } catch (error) {
      console.error('Lỗi khi xóa lịch khởi hành:', error);
      res.status(500).json({ status: 'error', message: 'Không thể xóa lịch khởi hành', error: error.message });
    }
  }

  /**
   * Lấy danh sách booking chờ xác nhận thanh toán
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getPendingPayments(req, res) {
    try {
      const bookings = await AdminUtil.getPendingPayments();

      res.status(200).json({
        status: 'success',
        results: bookings.length,
        data: { bookings }
      });
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách booking chờ thanh toán:', error);
      res.status(500).json({ status: 'error', message: 'Không thể lấy danh sách booking chờ thanh toán', error: error.message });
    }
  }

  /**
   * Xác nhận thanh toán cho booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async confirmPayment(req, res) {
    try {
      const { bookingId } = req.params;
      const { phuong_thuc_thanh_toan = 'Admin xác nhận' } = req.body;

      const result = await AdminUtil.confirmPayment(bookingId, phuong_thuc_thanh_toan);

      if (!result) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy booking hoặc booking đã được xử lý' });
      }

      res.status(200).json({
        status: 'success',
        message: 'Xác nhận thanh toán thành công',
        data: {
          booking: result.booking,
          hoaDon: {
            maHoaDon: result.hoaDon.maHoaDon,
            ngayLap: new Date().toISOString(),
            tongTien: result.hoaDon.tongTien,
            trangThai: 'Đã thanh toán'
          },
          ve: {
            tongSoVe: result.veList.length,
            danhSachVe: result.veList
          },
          checkout: {
            checkoutId: result.checkoutId,
            phuongThucThanhToan: phuong_thuc_thanh_toan,
            ngayTra: new Date().toISOString(),
            trangThai: 'Thành công'
          }
        }
      });
    } catch (error) {
      console.error('❌ Lỗi khi xác nhận thanh toán:', error);
      res.status(500).json({ status: 'error', message: 'Có lỗi xảy ra khi xác nhận thanh toán', error: error.message });
    }
  }

  /**
   * Lấy chi tiết booking để xác nhận thanh toán
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getBookingForPaymentConfirmation(req, res) {
    try {
      const { bookingId } = req.params;
      const result = await AdminUtil.getBookingForPaymentConfirmation(bookingId);

      if (!result) {
        return res.status(404).json({ status: 'error', message: 'Không tìm thấy booking' });
      }

      const { booking, services } = result;

      const giaNguoiLon = parseFloat(booking.Gia_nguoi_lon);
      const giaTreEm = parseFloat(booking.Gia_tre_em);
      const soNguoiLon = parseInt(booking.So_nguoi_lon);
      const soTreEm = parseInt(booking.So_tre_em);

      const tongTienNguoiLon = giaNguoiLon * soNguoiLon;
      const tongTienTreEm = giaTreEm * soTreEm;
      const tongTienTour = tongTienNguoiLon + tongTienTreEm;
      const tongTienDichVu = services.reduce((sum, s) => sum + parseFloat(s.Thanh_tien), 0);
      const tongTienTruocKhuyenMai = tongTienTour + tongTienDichVu;

      let giamGia = 0;
      if (booking.Ma_khuyen_mai && booking.Gia_tri_khuyen_mai) {
        giamGia = tongTienTruocKhuyenMai * (parseFloat(booking.Gia_tri_khuyen_mai) / 100);
      }

      const tongTienSauKhuyenMai = tongTienTruocKhuyenMai - giamGia;

      res.status(200).json({
        status: 'success',
        data: {
          booking: {
            ...booking,
            chiTietGia: {
              giaNguoiLon, giaTreEm, soNguoiLon, soTreEm,
              tongTienNguoiLon, tongTienTreEm, tongTienTour,
              tongTienDichVu, tongTienTruocKhuyenMai, giamGia, tongTienSauKhuyenMai
            },
            services
          }
        }
      });
    } catch (error) {
      console.error('❌ Lỗi khi lấy chi tiết booking:', error);
      res.status(500).json({ status: 'error', message: 'Không thể lấy chi tiết booking', error: error.message });
    }
  }
}

module.exports = AdminController;
const YeuCauHuy = require('../schemas/yeu_cau_huy.schema');
const Booking = require('../schemas/booking.schema');

/**
 * Controller quản lý yêu cầu hủy tour
 */
class CancelRequestController {
  /**
   * Tạo mới yêu cầu hủy tour
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createCancelRequest(req, res) {
    try {
      const { Ma_booking, Ly_do } = req.body;
      
      if (!Ma_booking) {
        return res.status(400).json({
          status: 'error',
          message: 'Thiếu mã booking'
        });
      }
      
      // Kiểm tra booking có tồn tại không
      const booking = await Booking.getById(Ma_booking);
      if (!booking) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy booking'
        });
      }
      
      // Kiểm tra booking có thuộc về người dùng hiện tại không
      if (booking.Id_user !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền thực hiện hành động này'
        });
      }
      
      // Kiểm tra xem đã có yêu cầu hủy chưa
      const existingRequest = await YeuCauHuy.getByBookingId(Ma_booking);
      if (existingRequest && existingRequest.Trang_thai === 'Dang_xu_ly') {
        return res.status(400).json({
          status: 'error',
          message: 'Đã tồn tại yêu cầu hủy đang chờ xử lý cho booking này'
        });
      }
      
      // Cập nhật trạng thái booking
      await Booking.updateCancelRequestStatus(Ma_booking, 'Cho_xu_ly_huy');
      
      // Tạo yêu cầu hủy mới
      const newRequest = await YeuCauHuy.create({
        Ma_booking,
        Ly_do: Ly_do || 'Không có lý do'
      });
      
      res.status(201).json({
        status: 'success',
        message: 'Yêu cầu hủy tour đã được tạo và đang chờ xử lý',
        data: { request: newRequest }
      });
    } catch (error) {
      console.error('Lỗi khi tạo yêu cầu hủy:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi tạo yêu cầu hủy',
        error: error.message
      });
    }
  }
  
  /**
   * Lấy danh sách tất cả yêu cầu hủy (chỉ admin)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllCancelRequests(req, res) {
    try {
      // Kiểm tra quyền admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền truy cập'
        });
      }
      
      const requests = await YeuCauHuy.getAll();
      
      res.status(200).json({
        status: 'success',
        results: requests.length,
        data: { requests }
      });
    } catch (error) {
      console.error('Lỗi khi lấy danh sách yêu cầu hủy:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy danh sách yêu cầu hủy',
        error: error.message
      });
    }
  }
  
  /**
   * Lấy thông tin chi tiết của một yêu cầu hủy
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getCancelRequestById(req, res) {
    try {
      const maYeuCau = req.params.id;
      const request = await YeuCauHuy.getById(maYeuCau);
      
      if (!request) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy yêu cầu hủy'
        });
      }
      
      // Kiểm tra quyền truy cập
      const booking = await Booking.getById(request.Ma_booking);
      if (booking.Id_user !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền truy cập thông tin này'
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: { request }
      });
    } catch (error) {
      console.error('Lỗi khi lấy thông tin yêu cầu hủy:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy thông tin yêu cầu hủy',
        error: error.message
      });
    }
  }
  
  /**
   * Admin xử lý yêu cầu hủy (chấp nhận hoặc từ chối)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async processCancelRequest(req, res) {
    try {
      // Kiểm tra quyền admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền thực hiện hành động này'
        });
      }
      
      const maYeuCau = req.params.id;
      const { action, Ly_do_tu_choi } = req.body;
      
      if (!action || (action !== 'accept' && action !== 'reject')) {
        return res.status(400).json({
          status: 'error',
          message: 'Hành động không hợp lệ. Chọn "accept" hoặc "reject"'
        });
      }
      
      // Kiểm tra yêu cầu hủy có tồn tại không
      const request = await YeuCauHuy.getById(maYeuCau);
      if (!request) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy yêu cầu hủy'
        });
      }
      
      // Kiểm tra trạng thái hiện tại
      if (request.Trang_thai !== 'Dang_xu_ly') {
        return res.status(400).json({
          status: 'error',
          message: `Yêu cầu hủy này đã được xử lý với trạng thái: ${request.Trang_thai}`
        });
      }
      
      // Xử lý yêu cầu
      const trangThai = action === 'accept' ? 'Da_chap_nhan' : 'Da_tu_choi';
      const result = await YeuCauHuy.updateStatus(
        maYeuCau, 
        trangThai, 
        req.user.adminId || req.user.Id_admin, 
        action === 'reject' ? Ly_do_tu_choi : null
      );
      
      res.status(200).json({
        status: 'success',
        message: action === 'accept' 
          ? 'Đã chấp nhận yêu cầu hủy tour' 
          : 'Đã từ chối yêu cầu hủy tour',
        data: { result }
      });
    } catch (error) {
      console.error('Lỗi khi xử lý yêu cầu hủy:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi xử lý yêu cầu hủy',
        error: error.message
      });
    }
  }
  
  /**
   * Lấy thông tin yêu cầu hủy theo mã booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getCancelRequestByBookingId(req, res) {
    try {
      const maBooking = req.params.bookingId;
      
      // Kiểm tra booking có tồn tại không
      const booking = await Booking.getById(maBooking);
      if (!booking) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy booking'
        });
      }
      
      // Kiểm tra booking có thuộc về người dùng hiện tại không
      if (booking.Id_user !== req.user.id && req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Không có quyền truy cập thông tin này'
        });
      }
      
      const request = await YeuCauHuy.getByBookingId(maBooking);
      
      if (!request) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy yêu cầu hủy cho booking này'
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: { request }
      });
    } catch (error) {
      console.error('Lỗi khi lấy thông tin yêu cầu hủy theo booking:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy thông tin yêu cầu hủy',
        error: error.message
      });
    }
  }
}

module.exports = CancelRequestController; 
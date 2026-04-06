const TourItinerary = require('../schemas/tourItinerary.schema');
const Tour = require('../schemas/tour.schema');
const TourUtil = require('../utils/tour.util');

/**
 * Tour Itinerary Controller
 */
class TourItineraryController {
  /**
   * Lấy danh sách lịch trình theo tour
   * GET /api/tour/:Ma_tour/itinerary
   */
  static async getByTourId(req, res) {
    try {
      const { Ma_tour } = req.params;

      if (!Ma_tour) {
        return res.status(400).json({
          status: 'error',
          message: 'Ma_tour là bắt buộc'
        });
      }

      const itinerary = await TourItinerary.getByTourId(Ma_tour);

      res.status(200).json({
        status: 'success',
        results: itinerary.length,
        data: { itinerary }
      });
    } catch (error) {
      console.error('Get itinerary by tour ID error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy danh sách lịch trình',
        error: error.message
      });
    }
  }

  /**
   * Tạo một ngày mới trong lịch trình
   * POST /api/tour/:Ma_tour/itinerary
   */
  static async create(req, res) {
    try {
      const { Ma_tour } = req.params;
      const { Ngay_thu, Tieu_de, Mo_ta, Thoi_gian_hoat_dong, Dia_diem } = req.body;

      // Validate
      if (!Ngay_thu || !Tieu_de) {
        return res.status(400).json({
          status: 'error',
          message: 'Ngay_thu và Tieu_de là bắt buộc'
        });
      }

      // Kiểm tra tour có tồn tại không
      const tour = await Tour.getById(Ma_tour);
      if (!tour) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy tour'
        });
      }

      const newItinerary = await TourItinerary.create(Ma_tour, {
        Ngay_thu,
        Tieu_de,
        Mo_ta,
        Thoi_gian_hoat_dong,
        Dia_diem
      });

      res.status(201).json({
        status: 'success',
        message: 'Tạo lịch trình thành công',
        data: { itinerary: newItinerary }
      });
    } catch (error) {
      console.error('Create itinerary error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Lỗi khi tạo lịch trình',
        error: error.message
      });
    }
  }

  /**
   * Cập nhật thông tin một ngày
   * PUT /api/itinerary/:Ma_itinerary
   */
  static async update(req, res) {
    try {
      const { Ma_itinerary } = req.params;
      const { Tieu_de, Mo_ta, Ngay_thu, Thoi_gian_hoat_dong, Dia_diem } = req.body;

      console.log('🔄 [ITINERARY CONTROLLER] Update request received');
      console.log('🔄 [ITINERARY CONTROLLER] Ma_itinerary:', Ma_itinerary);
      console.log('🔄 [ITINERARY CONTROLLER] Request body:', req.body);

      if (!Ma_itinerary) {
        return res.status(400).json({
          status: 'error',
          message: 'Ma_itinerary là bắt buộc'
        });
      }

      const updatedItinerary = await TourItinerary.update(Ma_itinerary, {
        Tieu_de,
        Mo_ta,
        Ngay_thu,
        Thoi_gian_hoat_dong,
        Dia_diem
      });

      console.log('✅ [ITINERARY CONTROLLER] Update successful:', updatedItinerary);

      res.status(200).json({
        status: 'success',
        message: 'Cập nhật lịch trình thành công',
        data: { itinerary: updatedItinerary }
      });
    } catch (error) {
      console.error('❌ [ITINERARY CONTROLLER] Update itinerary error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Lỗi khi cập nhật lịch trình',
        error: error.message
      });
    }
  }

  /**
   * Xóa một ngày
   * DELETE /api/itinerary/:Ma_itinerary
   */
  static async delete(req, res) {
    try {
      const { Ma_itinerary } = req.params;

      if (!Ma_itinerary) {
        return res.status(400).json({
          status: 'error',
          message: 'Ma_itinerary là bắt buộc'
        });
      }

      const deleted = await TourItinerary.delete(Ma_itinerary);

      if (!deleted) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy lịch trình'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Xóa lịch trình thành công'
      });
    } catch (error) {
      console.error('Delete itinerary error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi xóa lịch trình',
        error: error.message
      });
    }
  }

  /**
   * Tự động tạo các ngày theo Thoi_gian của tour
   * POST /api/tour/:Ma_tour/itinerary/generate
   */
  static async autoGenerate(req, res) {
    try {
      const { Ma_tour } = req.params;
      const { numberOfDays } = req.body;

      if (!Ma_tour) {
        return res.status(400).json({
          status: 'error',
          message: 'Ma_tour là bắt buộc'
        });
      }

      // Kiểm tra tour có tồn tại không
      const tour = await Tour.getById(Ma_tour);
      if (!tour) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy tour'
        });
      }

      const days = numberOfDays || tour.Thoi_gian || 1;

      const createdDays = await TourItinerary.autoGenerateByTourDays(Ma_tour, days);

      res.status(201).json({
        status: 'success',
        message: `Đã tự động tạo ${createdDays.length} ngày lịch trình`,
        data: { itinerary: createdDays }
      });
    } catch (error) {
      console.error('Auto-generate itinerary error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Lỗi khi tự động tạo lịch trình',
        error: error.message
      });
    }
  }

  /**
   * Lấy thông tin một ngày cụ thể
   * GET /api/itinerary/:Ma_itinerary
   */
  static async getById(req, res) {
    try {
      const { Ma_itinerary } = req.params;

      if (!Ma_itinerary) {
        return res.status(400).json({
          status: 'error',
          message: 'Ma_itinerary là bắt buộc'
        });
      }

      const itinerary = await TourItinerary.getById(Ma_itinerary);

      if (!itinerary) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy lịch trình'
        });
      }

      res.status(200).json({
        status: 'success',
        data: { itinerary }
      });
    } catch (error) {
      console.error('Get itinerary by ID error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy thông tin lịch trình',
        error: error.message
      });
    }
  }

  /**
   * Reorder các ngày
   * PUT /api/tour/:Ma_tour/itinerary/reorder
   */
  static async reorder(req, res) {
    try {
      const { Ma_tour } = req.params;
      const { itineraryIds } = req.body;

      if (!itineraryIds || !Array.isArray(itineraryIds)) {
        return res.status(400).json({
          status: 'error',
          message: 'itineraryIds phải là một mảng'
        });
      }

      await TourItinerary.reorder(itineraryIds);

      res.status(200).json({
        status: 'success',
        message: 'Sắp xếp lại lịch trình thành công'
      });
    } catch (error) {
      console.error('Reorder itinerary error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi sắp xếp lại lịch trình',
        error: error.message
      });
    }
  }

  /**
   * Lấy danh sách lịch trình theo lịch khởi hành
   * GET /api/schedule/:Ma_lich/itinerary
   */
  static async getByScheduleId(req, res) {
    try {
      const { Ma_lich } = req.params;

      if (!Ma_lich) {
        return res.status(400).json({
          status: 'error',
          message: 'Ma_lich là bắt buộc'
        });
      }

      const itinerary = await TourItinerary.getByScheduleId(Ma_lich);

      res.status(200).json({
        status: 'success',
        results: itinerary.length,
        data: { itinerary }
      });
    } catch (error) {
      console.error('Get itinerary by schedule ID error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy danh sách lịch trình',
        error: error.message
      });
    }
  }

  /**
   * Tạo một ngày mới cho lịch khởi hành
   * POST /api/schedule/:Ma_lich/itinerary
   */
  static async createForSchedule(req, res) {
    try {
      const { Ma_lich } = req.params;
      const { Ngay_thu, Tieu_de, Mo_ta, Thoi_gian_hoat_dong, Dia_diem } = req.body;

      // Validate
      if (!Ngay_thu || !Tieu_de) {
        return res.status(400).json({
          status: 'error',
          message: 'Ngay_thu và Tieu_de là bắt buộc'
        });
      }

      // Lấy thông tin lịch khởi hành để lấy Ma_tour
      const schedule = await TourUtil.getScheduleInfo(Ma_lich);

      if (!schedule) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy lịch khởi hành'
        });
      }

      const maTour = schedule.Ma_tour;

      // Lấy thông tin tour để kiểm tra số ngày
      const tour = await Tour.getById(maTour);
      if (!tour) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy tour'
        });
      }

      // Kiểm tra số ngày không vượt quá tổng số ngày của tour
      if (Ngay_thu > tour.Thoi_gian) {
        return res.status(400).json({
          status: 'error',
          message: `Số ngày (${Ngay_thu}) không được vượt quá tổng số ngày của tour (${tour.Thoi_gian})`
        });
      }

      const newItinerary = await TourItinerary.create(maTour, {
        Ngay_thu,
        Tieu_de,
        Mo_ta,
        Thoi_gian_hoat_dong,
        Dia_diem,
        Ma_lich
      });

      res.status(201).json({
        status: 'success',
        message: 'Tạo lịch trình thành công',
        data: { itinerary: newItinerary }
      });
    } catch (error) {
      console.error('Create itinerary for schedule error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Lỗi khi tạo lịch trình',
        error: error.message
      });
    }
  }
}

module.exports = TourItineraryController;


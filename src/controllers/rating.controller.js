const Rating = require('../schemas/rating.schema');
const Booking = require('../schemas/booking.schema');
const Tour = require('../schemas/tour.schema');
const RatingUtil = require('../utils/rating.util');

/**
 * Rating Controller
 */
class RatingController {
  /**
   * Get ratings by tour ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getRatingsByTour(req, res) {
    try {
      const { tourId } = req.params;
      
      const ratings = await Rating.getByTour(tourId);
      
      // Calculate average rating
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.So_sao, 0) / ratings.length 
        : 0;
      
      res.status(200).json({
        status: 'success',
        results: ratings.length,
        data: { 
          ratings,
          averageRating: parseFloat(averageRating.toFixed(1))
        }
      });
    } catch (error) {
      console.error('Get ratings by tour error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting ratings by tour',
        error: error.message
      });
    }
  }

  /**
   * Get all ratings (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllRatings(req, res) {
    try {
      // Ensure user is an admin
      if (req.user && req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }
      
      // Lấy filters từ query params
      const filters = {
        tour: req.query.tour || '',
        rating: req.query.rating || '',
        sort: req.query.sort || 'newest',
        search: req.query.search || ''
      };
      
      const ratings = await Rating.getAll(filters);
      
      res.status(200).json({
        status: 'success',
        results: ratings.length,
        data: { ratings }
      });
    } catch (error) {
      console.error('Get all ratings error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting ratings',
        error: error.message
      });
    }
  }

  /**
   * Get rating by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getRatingById(req, res) {
    try {
      const ratingId = req.params.id;
      const rating = await Rating.getById(ratingId);
      
      if (!rating) {
        return res.status(404).json({
          status: 'error',
          message: 'Rating not found'
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: { rating }
      });
    } catch (error) {
      console.error(`Get rating ${req.params.id} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting rating',
        error: error.message
      });
    }
  }


  /**
   * Get user's ratings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserRatings(req, res) {
    try {
      const customerId = req.user.customerId || req.user.Ma_khach_hang;
      
      if (!customerId) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer ID not found'
        });
      }
      
      const ratings = await Rating.getByCustomerId(customerId);
      
      res.status(200).json({
        status: 'success',
        results: ratings.length,
        data: { ratings }
      });
    } catch (error) {
      console.error('Get user ratings error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting user ratings',
        error: error.message
      });
    }
  }

  /**
   * Create a new rating
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async createRating(req, res) {
    try {
      const { bookingId, diem_danh_gia, noi_dung_danh_gia, criteria_ratings, photos } = req.body;
      const customerId = req.user.customerId || req.user.Ma_khach_hang;
      
      if (!customerId) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer ID not found'
        });
      }
      
      // Validate required fields
      if (!bookingId || !diem_danh_gia) {
        return res.status(400).json({
          status: 'error',
          message: 'Booking ID and rating score are required'
        });
      }
      
      // Check if customer can rate this booking
      const canRateResult = await Rating.canRatebooking(bookingId, customerId);
      
      if (!canRateResult.canRate) {
        return res.status(400).json({
          status: 'error',
          message: canRateResult.reason,
          data: canRateResult.existingRating || null
        });
      }
      
      // Get booking details to extract tour ID
      const bookingDetails = await Booking.getBookingDetails(bookingId);
      if (!bookingDetails || !bookingDetails.tour) {
        return res.status(404).json({
          status: 'error',
          message: 'Booking or tour not found'
        });
      }
      
      // Generate rating ID
      const ratingId = `DG${Date.now()}`;
      
      // Create rating data
      const ratingData = {
        ma_danh_gia: ratingId,
        ma_tour: bookingDetails.tour.Ma_tour,
        ma_khach_hang: customerId,
        ma_booking: bookingId,
        diem_danh_gia: parseInt(diem_danh_gia),
        noi_dung_danh_gia: noi_dung_danh_gia || null,
        ngay_danh_gia: new Date(),
        diem_dich_vu: criteria_ratings?.service || 0,
        diem_huong_dan_vien: criteria_ratings?.guide || 0,
        diem_phuong_tien: criteria_ratings?.transport || 0,
        diem_gia_ca: criteria_ratings?.value || 0,
        hinh_anh: photos ? JSON.stringify(photos) : null
      };
      
      // Create rating
      const newRating = await Rating.create(ratingData);
      
      res.status(201).json({
        status: 'success',
        message: 'Rating created successfully',
        data: { rating: newRating }
      });
    } catch (error) {
      console.error('Create rating error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error creating rating',
        error: error.message
      });
    }
  }

  /**
   * Update a rating
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateRating(req, res) {
    try {
      const ratingId = req.params.id;
      
      // Debug: Log request info
      console.log('Update rating request:', {
        ratingId,
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        hasFiles: !!req.files,
        filesCount: req.files ? req.files.length : 0,
        contentType: req.headers['content-type']
      });
      
      // Handle both JSON and FormData
      // With multer, req.body will contain form fields
      // If req.body is undefined, it means multer didn't parse it (might be JSON request)
      if (!req.body) {
        return res.status(400).json({
          status: 'error',
          message: 'Request body is missing. Please use FormData for file uploads or JSON for text-only updates.'
        });
      }
      
      const diem_danh_gia = req.body.diem_danh_gia ? parseInt(req.body.diem_danh_gia) : undefined;
      const noi_dung_danh_gia = req.body.noi_dung_danh_gia || undefined;
      const diem_dich_vu = req.body.diem_dich_vu ? parseInt(req.body.diem_dich_vu) : undefined;
      const diem_huong_dan_vien = req.body.diem_huong_dan_vien ? parseInt(req.body.diem_huong_dan_vien) : undefined;
      const diem_phuong_tien = req.body.diem_phuong_tien ? parseInt(req.body.diem_phuong_tien) : undefined;
      const diem_gia_ca = req.body.diem_gia_ca ? parseInt(req.body.diem_gia_ca) : undefined;
      
      const customerId = req.user.customerId || req.user.Ma_khach_hang;
      
      if (!customerId) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer ID not found'
        });
      }
      
      // Get existing rating
      const existingRating = await Rating.getById(ratingId);
      if (!existingRating) {
        return res.status(404).json({
          status: 'error',
          message: 'Rating not found'
        });
      }
      
      // Check if user owns this rating (unless admin)
      if (req.user.role !== 'Admin' && existingRating.Ma_khach_hang !== customerId) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to update this rating'
        });
      }
      
      // Handle image uploads
      let imagePaths = [];
      
      // Get existing images to keep
      // Multer với FormData sẽ tạo array nếu có nhiều field cùng tên 'existing_images'
      if (req.body.existing_images) {
        // Handle both array and single value
        let existingImages;
        if (Array.isArray(req.body.existing_images)) {
          existingImages = req.body.existing_images;
        } else if (typeof req.body.existing_images === 'string') {
          // If it's a string, try to split by comma or use as single value
          existingImages = req.body.existing_images.includes(',') 
            ? req.body.existing_images.split(',').map(img => img.trim())
            : [req.body.existing_images];
        } else {
          existingImages = [req.body.existing_images];
        }
        imagePaths = existingImages.filter(img => img && img.trim() && img !== 'undefined' && img !== 'null');
      } else if (existingRating.Hinh_anh) {
        // If no existing_images in request, keep current images
        const currentImages = existingRating.Hinh_anh.split(',').map(img => img.trim()).filter(img => img);
        imagePaths = currentImages;
      }
      
      // Add new uploaded images
      if (req.files && req.files.length > 0) {
        const newImagePaths = req.files.map(file => `/uploads/ratings/${file.filename}`);
        imagePaths = [...imagePaths, ...newImagePaths];
      }
      
      // Limit to 5 images
      if (imagePaths.length > 5) {
        imagePaths = imagePaths.slice(0, 5);
      }
      
      // Prepare update data
      const updateData = {};
      if (diem_danh_gia !== undefined) updateData.So_sao = diem_danh_gia;
      if (noi_dung_danh_gia !== undefined) updateData.Binh_luan = noi_dung_danh_gia;
      if (diem_dich_vu !== undefined) updateData.Diem_dich_vu = diem_dich_vu;
      if (diem_huong_dan_vien !== undefined) updateData.Diem_huong_dan_vien = diem_huong_dan_vien;
      if (diem_phuong_tien !== undefined) updateData.Diem_phuong_tien = diem_phuong_tien;
      if (diem_gia_ca !== undefined) updateData.Diem_gia_ca = diem_gia_ca;
      
      // Update images if provided
      if (imagePaths.length > 0 || req.body.existing_images !== undefined || req.files) {
        updateData.Hinh_anh = imagePaths.join(',');
      }
      
      console.log('Update rating data:', {
        ratingId,
        updateData,
        imageCount: imagePaths.length,
        filesCount: req.files ? req.files.length : 0
      });
      
      // Update rating
      const updatedRating = await Rating.update(ratingId, updateData);
      
      res.status(200).json({
        status: 'success',
        message: 'Rating updated successfully',
        data: { rating: updatedRating }
      });
    } catch (error) {
      console.error(`Update rating ${req.params.id} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error updating rating',
        error: error.message
      });
    }
  }

  /**
   * Delete a rating
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteRating(req, res) {
    try {
      const ratingId = req.params.id;
      
      // Admin có thể xóa bất kỳ đánh giá nào
      if (req.user.role !== 'Admin') {
        const customerId = req.user.customerId || req.user.Ma_khach_hang;
        
        if (!customerId) {
          return res.status(400).json({
            status: 'error',
            message: 'Customer ID not found'
          });
        }
        
        // Get existing rating
        const existingRating = await Rating.getById(ratingId);
        if (!existingRating) {
          return res.status(404).json({
            status: 'error',
            message: 'Rating not found'
          });
        }
        
        // Check if user owns this rating
        if (existingRating.Ma_khach_hang !== customerId) {
          return res.status(403).json({
            status: 'error',
            message: 'Not authorized to delete this rating'
          });
        }
      }
      
      // Lấy thông tin tour trước khi xóa để cập nhật stats
      const existingRating = await Rating.getById(ratingId);
      const tourId = existingRating ? existingRating.Ma_tour : null;
      
      // Delete rating
      const deleted = await Rating.delete(ratingId);
      
      if (!deleted) {
        return res.status(500).json({
          status: 'error',
          message: 'Failed to delete rating'
        });
      }
      
      // Cập nhật điểm đánh giá trung bình của tour
      if (tourId) {
        await Rating.updateTourRating(tourId);
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Rating deleted successfully'
      });
    } catch (error) {
      console.error(`Delete rating ${req.params.id} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error deleting rating',
        error: error.message
      });
    }
  }

  /**
   * Delete all ratings for a tour (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteRatingsByTour(req, res) {
    try {
      // Chỉ admin mới có quyền xóa tất cả đánh giá của tour
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }

      const { tourId } = req.params;

      if (!tourId) {
        return res.status(400).json({
          status: 'error',
          message: 'Tour ID is required'
        });
      }

      // Kiểm tra tour có tồn tại không
      const tour = await Tour.getById(tourId);
      if (!tour) {
        return res.status(404).json({
          status: 'error',
          message: 'Tour not found'
        });
      }

      // Xóa tất cả đánh giá của tour
      const deletedCount = await RatingUtil.deleteRatingsByTourId(tourId);

      // Cập nhật điểm đánh giá trung bình của tour
      await Rating.updateTourRating(tourId);

      res.status(200).json({
        status: 'success',
        message: `Đã xóa ${deletedCount} đánh giá của tour`,
        data: {
          deletedCount: deletedCount
        }
      });
    } catch (error) {
      console.error(`Delete ratings by tour ${req.params.tourId} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error deleting ratings by tour',
        error: error.message
      });
    }
  }

  /**
   * Check if user can rate a booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async checkCanRate(req, res) {
    try {
      const { bookingId } = req.params;
      const customerId = req.user.customerId || req.user.Ma_khach_hang;
      
      if (!customerId) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer ID not found'
        });
      }
      
      const canRateResult = await Rating.canRatebooking(bookingId, customerId);
      
      res.status(200).json({
        status: 'success',
        data: canRateResult
      });
    } catch (error) {
      console.error(`Check can rate booking ${req.params.bookingId} error:`, error);
      res.status(500).json({
        status: 'error',
        message: 'Error checking rating eligibility',
        error: error.message
      });
    }
  }

  /**
   * Get recent ratings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getRecentRatings(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      
      const ratings = await Rating.getRecentRatings(limit, offset);
      
      res.status(200).json({
        status: 'success',
        results: ratings.length,
        data: { ratings }
      });
    } catch (error) {
      console.error('Get recent ratings error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting recent ratings',
        error: error.message
      });
    }
  }

  /**
   * Check if user can rate a booking
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async canRateBooking(req, res) {
    try {
      const { bookingId } = req.params;
      const customerId = req.user.customerId || req.user.Ma_khach_hang;
      
      if (!customerId) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer ID not found'
        });
      }
      
      const canRateResult = await Rating.canRatebooking(bookingId, customerId);
      
      res.status(200).json({
        status: 'success',
        data: canRateResult
      });
    } catch (error) {
      console.error('Check can rate error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error checking rating permission',
        error: error.message
      });
    }
  }
  static async getRatingStats(req, res) {
    try {
      // Ensure user is an admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to perform this action'
        });
      }
      
      // Get overall statistics
      const overallStats = await RatingUtil.getOverallStats();
      
      // Get top rated tours
      const topRatedTours = await RatingUtil.getTopRatedTours(10);
      
      res.status(200).json({
        status: 'success',
        data: {
          overallStats,
          topRatedTours
        }
      });
    } catch (error) {
      console.error('Get rating stats error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting rating statistics',
        error: error.message
      });
    }
  }
}

module.exports = RatingController;

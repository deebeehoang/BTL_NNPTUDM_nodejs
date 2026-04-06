const pool = require('../utils/database');

/**
 * Guide Model - Quản lý Hướng dẫn viên
 */
class Guide {
  /**
   * Tìm hướng dẫn viên theo Id_user
   * @param {string} userId - User ID
   * @returns {Object|null} - Guide data or null if not found
   */
  static async findByUserId(userId) {
    try {
      const [rows] = await pool.query(
        `SELECT h.*, t.Email, t.Loai_tai_khoan
         FROM huong_dan_vien h
         JOIN tai_khoan t ON h.Id_user = t.Id_user
         WHERE h.Id_user = ?`,
        [userId]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error finding guide by userId:', error);
      throw error;
    }
  }

  /**
   * Tìm hướng dẫn viên theo Ma_huong_dan_vien
   * @param {string} guideId - Guide ID
   * @returns {Object|null} - Guide data or null if not found
   */
  static async findById(guideId) {
    try {
      const [rows] = await pool.query(
        `SELECT h.*, t.Email, t.Loai_tai_khoan
         FROM huong_dan_vien h
         JOIN tai_khoan t ON h.Id_user = t.Id_user
         WHERE h.Ma_huong_dan_vien = ?`,
        [guideId]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error finding guide by id:', error);
      throw error;
    }
  }

  /**
   * Lấy tất cả hướng dẫn viên
   * @param {Object} filters - Filters (status, search)
   * @returns {Array} - List of guides
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT h.*, t.Email, t.Loai_tai_khoan
        FROM huong_dan_vien h
        JOIN tai_khoan t ON h.Id_user = t.Id_user
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.status && filters.status !== 'all') {
        query += ' AND h.Trang_thai = ?';
        params.push(filters.status);
      }
      
      if (filters.search) {
        query += ' AND (h.Ten_huong_dan_vien LIKE ? OR h.So_dien_thoai LIKE ? OR t.Email LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      query += ' ORDER BY h.Ngay_tham_gia DESC';
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting all guides:', error);
      throw error;
    }
  }

  /**
   * Tạo hướng dẫn viên mới
   * @param {Object} guideData - Guide data
   * @returns {Object} - Created guide
   */
  static async create(guideData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Tạo mã hướng dẫn viên
      const ma_huong_dan_vien = guideData.ma_huong_dan_vien || `HDV${Date.now()}`;
      
      // Insert vào bảng huong_dan_vien
      await connection.query(
        `INSERT INTO huong_dan_vien (
          Ma_huong_dan_vien, Id_user, Ten_huong_dan_vien, Ngay_sinh, 
          Gioi_tinh, Dia_chi, So_dien_thoai, Cccd, Ngon_ngu, 
          Kinh_nghiem, Chung_chi, Anh_dai_dien, Trang_thai, Ngay_tham_gia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ma_huong_dan_vien,
          guideData.id_user,
          guideData.ten_huong_dan_vien,
          guideData.ngay_sinh,
          guideData.gioi_tinh,
          guideData.dia_chi || null,
          guideData.so_dien_thoai,
          guideData.cccd,
          guideData.ngon_ngu || null,
          guideData.kinh_nghiem || null,
          guideData.chung_chi || null,
          guideData.anh_dai_dien || null,
          guideData.trang_thai || 'Hoat_dong',
          guideData.ngay_tham_gia || new Date()
        ]
      );
      
      await connection.commit();
      
      return await this.findById(ma_huong_dan_vien);
    } catch (error) {
      await connection.rollback();
      console.error('Error creating guide:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Cập nhật thông tin hướng dẫn viên
   * @param {string} guideId - Guide ID
   * @param {Object} guideData - Updated guide data
   * @returns {Object} - Updated guide
   */
  static async update(guideId, guideData) {
    try {
      const updateFields = [];
      const params = [];
      
      // Mapping từ frontend field names sang database column names
      const fieldMapping = {
        'ten_huong_dan_vien': 'Ten_huong_dan_vien',
        'ngay_sinh': 'Ngay_sinh',
        'gioi_tinh': 'Gioi_tinh',
        'dia_chi': 'Dia_chi',
        'so_dien_thoai': 'So_dien_thoai',
        'cccd': 'Cccd',
        'ngon_ngu': 'Ngon_ngu',
        'kinh_nghiem': 'Kinh_nghiem',
        'chung_chi': 'Chung_chi',
        'anh_dai_dien': 'Anh_dai_dien',
        'trang_thai': 'Trang_thai'
      };
      
      const allowedFields = [
        'Ten_huong_dan_vien', 'Ngay_sinh', 'Gioi_tinh', 'Dia_chi',
        'So_dien_thoai', 'Cccd', 'Ngon_ngu', 'Kinh_nghiem',
        'Chung_chi', 'Anh_dai_dien', 'Trang_thai'
      ];
      
      for (const field of allowedFields) {
        const dbField = field;
        const lowerField = field.toLowerCase();
        const camelField = lowerField.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        
        // Kiểm tra nhiều format: camelCase, snake_case, Pascal_case
        let value = guideData[camelField] || guideData[lowerField] || guideData[field] || guideData[fieldMapping[lowerField]];
        
        if (value !== undefined && value !== null && value !== '') {
          updateFields.push(`${dbField} = ?`);
          params.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        return await this.findById(guideId);
      }
      
      params.push(guideId);
      
      console.log('Updating guide:', guideId, 'Fields:', updateFields, 'Values:', params.slice(0, -1));
      
      await pool.query(
        `UPDATE huong_dan_vien SET ${updateFields.join(', ')} WHERE Ma_huong_dan_vien = ?`,
        params
      );
      
      console.log('Guide updated successfully');
      
      return await this.findById(guideId);
    } catch (error) {
      console.error('Error updating guide:', error);
      throw error;
    }
  }

  /**
   * Xóa/Vô hiệu hóa hướng dẫn viên
   * @param {string} guideId - Guide ID
   * @returns {boolean} - Success status
   */
  static async delete(guideId) {
    try {
      // Thay vì xóa, đặt trạng thái là Nghi_viec
      const [result] = await pool.query(
        'UPDATE huong_dan_vien SET Trang_thai = ? WHERE Ma_huong_dan_vien = ?',
        ['Nghi_viec', guideId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting guide:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách lịch được phân công cho hướng dẫn viên
   * @param {string} guideId - Guide ID
   * @param {Object} filters - Filters (status, date_from, date_to)
   * @returns {Array} - List of schedules
   */
  static async getSchedules(guideId, filters = {}) {
    try {
      let query = `
        SELECT 
          l.Ma_lich,
          l.Ma_tour,
          l.Ngay_bat_dau as Ngay_khoi_hanh,
          l.Ngay_ket_thuc,
          l.So_cho,
          l.So_cho_con_lai,
          l.Trang_thai,
          t.Ten_tour,
          t.Ma_tour,
          COUNT(DISTINCT b.Ma_booking) as So_booking,
          COALESCE(SUM(b.So_nguoi_lon + b.So_tre_em), 0) as Tong_so_khach
        FROM Lich_khoi_hanh l
        JOIN Tour_du_lich t ON l.Ma_tour = t.Ma_tour
        LEFT JOIN Chi_tiet_booking ctb ON l.Ma_lich = ctb.Ma_lich
        LEFT JOIN Booking b ON ctb.Ma_booking = b.Ma_booking 
          AND b.Trang_thai_booking NOT IN ('Da_huy', 'Hủy', 'Het_han')
        WHERE l.Ma_huong_dan_vien = ?
      `;
      
      const params = [guideId];
      
      if (filters.status) {
        if (filters.status === 'sap_dien_ra') {
          query += ' AND l.Ngay_bat_dau > NOW()';
        } else if (filters.status === 'dang_dien_ra') {
          query += ' AND l.Ngay_bat_dau <= NOW() AND l.Ngay_ket_thuc >= NOW()';
        } else if (filters.status === 'da_dien_ra') {
          query += ' AND l.Ngay_ket_thuc < NOW()';
        }
      }
      
      query += ' GROUP BY l.Ma_lich, l.Ma_tour, l.Ngay_bat_dau, l.Ngay_ket_thuc, l.So_cho, l.So_cho_con_lai, l.Trang_thai, t.Ten_tour, t.Ma_tour';
      query += ' ORDER BY l.Ngay_bat_dau DESC';
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting guide schedules:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách booking của một lịch
   * @param {string} scheduleId - Schedule ID (Ma_lich)
   * @returns {Array} - List of bookings
   */
  static async getScheduleBookings(scheduleId) {
    try {
      const [rows] = await pool.query(
        `SELECT 
          b.Ma_booking,
          b.Ngay_dat,
          b.So_nguoi_lon,
          b.So_tre_em,
          b.Tong_tien,
          b.Trang_thai_booking,
          kh.Ten_khach_hang,
          kh.Dia_chi,
          t.Email as Email_khach_hang,
          t.Id_user
        FROM Booking b
        JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
        JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
        LEFT JOIN tai_khoan t ON kh.Id_user = t.Id_user
        WHERE ctb.Ma_lich = ?
          AND b.Trang_thai_booking NOT IN ('Da_huy', 'Hủy', 'Het_han')
        ORDER BY b.Ngay_dat DESC`,
        [scheduleId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting schedule bookings:', error);
      throw error;
    }
  }

  /**
   * Lấy đánh giá của hướng dẫn viên
   * @param {string} guideId - Guide ID
   * @param {Object} filters - Filters (rating, date_from, date_to)
   * @returns {Array} - List of ratings
   */
  static async getRatings(guideId, filters = {}) {
    try {
      let query = `
        SELECT 
          d.Id_review AS Ma_danh_gia,
          d.Diem_huong_dan_vien,
          d.Binh_luan AS Noi_dung,
          d.Ngay_danh_gia,
          kh.Ten_khach_hang,
          t.Ten_tour,
          l.Ma_lich,
          l.Ngay_bat_dau as Ngay_khoi_hanh
        FROM danh_gia d
        JOIN Booking b ON d.Ma_booking = b.Ma_booking
        JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
        JOIN Lich_khoi_hanh l ON ctb.Ma_lich = l.Ma_lich
        JOIN Tour_du_lich t ON l.Ma_tour = t.Ma_tour
        JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
        WHERE (l.Ma_huong_dan_vien = ? OR d.Ma_huong_dan_vien = ?)
          AND d.Diem_huong_dan_vien IS NOT NULL
          AND d.Diem_huong_dan_vien > 0
      `;
      
      const params = [guideId, guideId];
      
      if (filters.rating) {
        query += ' AND d.Diem_huong_dan_vien = ?';
        params.push(parseInt(filters.rating));
      }
      
      if (filters.date_from) {
        query += ' AND d.Ngay_danh_gia >= ?';
        params.push(filters.date_from);
      }
      
      if (filters.date_to) {
        query += ' AND d.Ngay_danh_gia <= ?';
        params.push(filters.date_to);
      }
      
      query += ' ORDER BY d.Ngay_danh_gia DESC';
      
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting guide ratings:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê của hướng dẫn viên
   * @param {string} guideId - Guide ID
   * @returns {Object} - Statistics
   */
  static async getStats(guideId) {
    try {
      // Số tour được phân công
      const [tourCount] = await pool.query(
        `SELECT COUNT(*) as total_tours
         FROM Lich_khoi_hanh
         WHERE Ma_huong_dan_vien = ?`,
        [guideId]
      );
      
      // Đánh giá trung bình - lấy từ Diem_huong_dan_vien trong bảng danh_gia
      // Lấy từ cả 2 nguồn: Ma_huong_dan_vien trong danh_gia và Ma_huong_dan_vien trong Lich_khoi_hanh
      const [avgRating] = await pool.query(
        `SELECT 
          AVG(d.Diem_huong_dan_vien) as avg_rating,
          COUNT(*) as total_ratings
         FROM danh_gia d
         JOIN Booking b ON d.Ma_booking = b.Ma_booking
         JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
         JOIN Lich_khoi_hanh l ON ctb.Ma_lich = l.Ma_lich
         WHERE (l.Ma_huong_dan_vien = ? OR d.Ma_huong_dan_vien = ?)
           AND d.Diem_huong_dan_vien IS NOT NULL
           AND d.Diem_huong_dan_vien > 0`,
        [guideId, guideId]
      );
      
      // Tổng số khách đã dẫn
      const [totalGuests] = await pool.query(
        `SELECT COALESCE(SUM(b.So_nguoi_lon + b.So_tre_em), 0) as total_guests
         FROM Booking b
         JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
         JOIN Lich_khoi_hanh l ON ctb.Ma_lich = l.Ma_lich
         WHERE l.Ma_huong_dan_vien = ?
           AND b.Trang_thai_booking NOT IN ('Da_huy', 'Hủy', 'Het_han')`,
        [guideId]
      );
      
      // Số booking
      const [bookingCount] = await pool.query(
        `SELECT COUNT(DISTINCT b.Ma_booking) as total_bookings
         FROM Booking b
         JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
         JOIN Lich_khoi_hanh l ON ctb.Ma_lich = l.Ma_lich
         WHERE l.Ma_huong_dan_vien = ?
           AND b.Trang_thai_booking NOT IN ('Da_huy', 'Hủy', 'Het_han')`,
        [guideId]
      );
      
      return {
        total_tours: tourCount[0]?.total_tours || 0,
        avg_rating: parseFloat(avgRating[0]?.avg_rating || 0).toFixed(1),
        total_ratings: avgRating[0]?.total_ratings || 0,
        total_guests: totalGuests[0]?.total_guests || 0,
        total_bookings: bookingCount[0]?.total_bookings || 0
      };
    } catch (error) {
      console.error('Error getting guide stats:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra hướng dẫn viên có rảnh trong khoảng thời gian
   * @param {string} guideId - Guide ID
   * @param {Date} dateFrom - Ngày bắt đầu
   * @param {Date} dateTo - Ngày kết thúc
   * @param {string} excludeScheduleId - Schedule ID để exclude (khi đang edit)
   * @returns {boolean} - True nếu rảnh
   */
  static async isAvailable(guideId, dateFrom, dateTo, excludeScheduleId = null) {
    try {
      let excludeCondition = '';
      const params = [guideId, dateFrom, dateFrom, dateTo, dateTo, dateFrom, dateTo];
      
      // Exclude schedule hiện tại khi đang edit
      if (excludeScheduleId) {
        excludeCondition = ' AND Ma_lich != ?';
        params.push(excludeScheduleId);
      }
      
      const [rows] = await pool.query(
        `SELECT COUNT(*) as count
         FROM Lich_khoi_hanh
         WHERE Ma_huong_dan_vien = ?
           ${excludeCondition}
           AND (
             -- Lịch mới bắt đầu trong khoảng thời gian của lịch cũ
             (Ngay_bat_dau >= ? AND Ngay_bat_dau <= ?)
             -- Lịch mới kết thúc trong khoảng thời gian của lịch cũ
             OR (Ngay_ket_thuc >= ? AND Ngay_ket_thuc <= ?)
             -- Lịch mới bao trùm hoàn toàn lịch cũ
             OR (Ngay_bat_dau <= ? AND Ngay_ket_thuc >= ?)
           )`,
        params
      );
      
      return rows[0]?.count === 0;
    } catch (error) {
      console.error('Error checking guide availability:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách hướng dẫn viên rảnh trong khoảng thời gian
   * @param {Date} dateFrom - Ngày bắt đầu
   * @param {Date} dateTo - Ngày kết thúc
   * @param {string} excludeScheduleId - Schedule ID để exclude (khi đang edit)
   * @param {string} ma_tour - Mã tour (nếu có, để kiểm tra trùng tour)
   * @returns {Array} - List of available guides
   */
  static async getAvailableGuides(dateFrom, dateTo, excludeScheduleId = null, ma_tour = null) {
    try {
      // Params cho query chính (kiểm tra trùng lịch bất kỳ)
      const mainParams = [dateFrom, dateFrom, dateTo, dateTo, dateFrom, dateTo];
      let excludeCondition = '';
      
      // Exclude current schedule if editing (to allow keeping current guide)
      if (excludeScheduleId) {
        excludeCondition = ' AND l.Ma_lich != ?';
        mainParams.push(excludeScheduleId);
      }
      
      // Nếu có ma_tour, thêm điều kiện loại bỏ HDV đã có lịch của cùng tour trong khoảng thời gian
      let sameTourCondition = '';
      const sameTourParams = [];
      
      if (ma_tour) {
        sameTourCondition = `
          AND h.Ma_huong_dan_vien NOT IN (
            SELECT DISTINCT l2.Ma_huong_dan_vien
            FROM Lich_khoi_hanh l2
            WHERE l2.Ma_huong_dan_vien IS NOT NULL
              AND l2.Ma_tour = ?
              ${excludeScheduleId ? ' AND l2.Ma_lich != ?' : ''}
              AND (
                (l2.Ngay_bat_dau >= ? AND l2.Ngay_bat_dau <= ?)
                OR (l2.Ngay_ket_thuc >= ? AND l2.Ngay_ket_thuc <= ?)
                OR (l2.Ngay_bat_dau <= ? AND l2.Ngay_ket_thuc >= ?)
              )
          )`;
        
        sameTourParams.push(ma_tour);
        if (excludeScheduleId) {
          sameTourParams.push(excludeScheduleId);
        }
        sameTourParams.push(dateFrom, dateTo, dateFrom, dateTo, dateFrom, dateTo);
      }
      
      // Kết hợp tất cả params: mainParams trước, sau đó sameTourParams
      const allParams = [...mainParams, ...sameTourParams];
      
      const [rows] = await pool.query(
        `SELECT h.*, t.Email
         FROM huong_dan_vien h
         JOIN tai_khoan t ON h.Id_user = t.Id_user
         WHERE h.Trang_thai = 'Hoat_dong'
           AND h.Ma_huong_dan_vien NOT IN (
             SELECT DISTINCT l.Ma_huong_dan_vien
             FROM Lich_khoi_hanh l
             WHERE l.Ma_huong_dan_vien IS NOT NULL
               ${excludeCondition}
               AND (
                 -- Lịch mới bắt đầu trong khoảng thời gian của lịch cũ
                 (l.Ngay_bat_dau >= ? AND l.Ngay_bat_dau <= ?)
                 -- Lịch mới kết thúc trong khoảng thời gian của lịch cũ
                 OR (l.Ngay_ket_thuc >= ? AND l.Ngay_ket_thuc <= ?)
                 -- Lịch mới bao trùm hoàn toàn lịch cũ
                 OR (l.Ngay_bat_dau <= ? AND l.Ngay_ket_thuc >= ?)
               )
           )
           ${sameTourCondition}
         ORDER BY h.Ten_huong_dan_vien`,
        allParams
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting available guides:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách chứng chỉ của hướng dẫn viên
   * @param {string} guideId - Guide ID
   * @returns {Array} - List of certificates
   */
  static async getCertificates(guideId) {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM chung_chi_huong_dan_vien 
         WHERE Ma_huong_dan_vien = ? 
         ORDER BY Ngay_cap DESC, Ngay_tao DESC`,
        [guideId]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting certificates:', error);
      throw error;
    }
  }

  /**
   * Thêm chứng chỉ mới
   * @param {Object} certificateData - Certificate data
   * @returns {Object} - Created certificate
   */
  static async addCertificate(certificateData) {
    try {
      const {
        ma_huong_dan_vien,
        ten_chung_chi,
        loai_chung_chi,
        noi_cap,
        ngay_cap,
        ngay_het_han,
        file_chung_chi
      } = certificateData;
      
      const [result] = await pool.query(
        `INSERT INTO chung_chi_huong_dan_vien (
          Ma_huong_dan_vien, Ten_chung_chi, Loai_chung_chi, 
          Noi_cap, Ngay_cap, Ngay_het_han, File_chung_chi, Trang_thai
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Hoat_dong')`,
        [ma_huong_dan_vien, ten_chung_chi, loai_chung_chi, 
         noi_cap, ngay_cap, ngay_het_han, file_chung_chi]
      );
      
      const [certificate] = await pool.query(
        'SELECT * FROM chung_chi_huong_dan_vien WHERE Ma_chung_chi = ?',
        [result.insertId]
      );
      
      return certificate[0];
    } catch (error) {
      console.error('Error adding certificate:', error);
      throw error;
    }
  }

  /**
   * Xóa chứng chỉ
   * @param {number} certificateId - Certificate ID
   * @returns {boolean} - Success status
   */
  static async deleteCertificate(certificateId) {
    try {
      const [result] = await pool.query(
        'DELETE FROM chung_chi_huong_dan_vien WHERE Ma_chung_chi = ?',
        [certificateId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting certificate:', error);
      throw error;
    }
  }

  /**
   * Cập nhật chứng chỉ
   * @param {number} certificateId - Certificate ID
   * @param {Object} certificateData - Updated certificate data
   * @returns {Object} - Updated certificate
   */
  static async updateCertificate(certificateId, certificateData) {
    try {
      const updateFields = [];
      const params = [];
      
      const allowedFields = [
        'Ten_chung_chi', 'Loai_chung_chi', 'Noi_cap', 
        'Ngay_cap', 'Ngay_het_han', 'File_chung_chi', 'Trang_thai'
      ];
      
      for (const field of allowedFields) {
        const camelField = field.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        if (certificateData[camelField] !== undefined || certificateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          params.push(certificateData[camelField] || certificateData[field]);
        }
      }
      
      if (updateFields.length === 0) {
        const [certificate] = await pool.query(
          'SELECT * FROM chung_chi_huong_dan_vien WHERE Ma_chung_chi = ?',
          [certificateId]
        );
        return certificate[0];
      }
      
      params.push(certificateId);
      
      await pool.query(
        `UPDATE chung_chi_huong_dan_vien SET ${updateFields.join(', ')} WHERE Ma_chung_chi = ?`,
        params
      );
      
      const [certificate] = await pool.query(
        'SELECT * FROM chung_chi_huong_dan_vien WHERE Ma_chung_chi = ?',
        [certificateId]
      );
      
      return certificate[0];
    } catch (error) {
      console.error('Error updating certificate:', error);
      throw error;
    }
  }
}

module.exports = Guide;


const pool = require('../utils/database');

/**
 * Rating Model
 */
class Rating {
  /**
   * Get ratings by tour ID
   * @param {string} tourId - Tour ID
   * @returns {Promise<Array>} Array of ratings
   */
  static async getByTour(tourId) {
    try {
      // Kiểm tra database hiện tại đang sử dụng
      try {
        const [currentDb] = await pool.query(`SELECT DATABASE() as db`);
        const currentDbName = currentDb[0]?.db;
        console.log(`📊 Current database connection: ${currentDbName || 'unknown'}`);
        
        if (currentDbName && currentDbName !== 'travel_test003') {
          console.warn(`⚠️ WARNING: Đang kết nối đến database '${currentDbName}' thay vì 'travel_test003'`);
        }
      } catch (dbCheckError) {
        console.warn('⚠️ Không thể kiểm tra database hiện tại:', dbCheckError.message);
      }
      
      // Tên bảng là danh_gia (chữ thường) theo thông tin từ user
      let tableName = 'danh_gia';
      let columns = [];
      
      // Kiểm tra các cột trong bảng danh_gia từ database đang kết nối
      // Sử dụng DATABASE() để lấy database hiện tại thay vì hardcode
      try {
        // Thử DESCRIBE trước (nhanh hơn và chính xác với database đang kết nối)
        try {
          const [descResult] = await pool.query(`DESCRIBE danh_gia`);
          columns = descResult.map(row => ({ COLUMN_NAME: row.Field }));
          console.log(`✅ Got columns from DESCRIBE: ${columns.length} columns`);
        } catch (descError) {
          // Nếu DESCRIBE thất bại, thử INFORMATION_SCHEMA với database hiện tại
          const [currentDb] = await pool.query(`SELECT DATABASE() as db`);
          const currentDbName = currentDb[0]?.db;
          
          if (currentDbName) {
            const [cols] = await pool.query(
              `SELECT COLUMN_NAME 
               FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = ? 
                 AND TABLE_NAME = 'danh_gia'
               ORDER BY ORDINAL_POSITION`,
              [currentDbName]
            );
            if (cols.length > 0) {
              columns = cols;
              console.log(`✅ Found table: danh_gia in database ${currentDbName} with ${cols.length} columns`);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Lỗi khi kiểm tra cột:', error.message);
      }
      
      const columnNames = columns.length > 0 ? columns.map(col => col.COLUMN_NAME) : [];
      console.log(`📋 Columns found in ${tableName}:`, columnNames);
      
      // Xây dựng danh sách các cột cần SELECT dựa trên cột thực sự tồn tại
      const selectFields = [
        'dg.Id_review',
        'dg.Ma_tour',
        'dg.Ma_khach_hang'
      ];
      
      // Chỉ thêm các cột nếu chúng tồn tại (nếu đã kiểm tra được)
      // Nếu không kiểm tra được (columnNames.length === 0), không SELECT các cột optional để tránh lỗi
      if (columnNames.length > 0) {
        // Đã kiểm tra được, chỉ SELECT các cột tồn tại
        if (columnNames.includes('Ma_booking')) {
          selectFields.push('dg.Ma_booking');
        } else {
          selectFields.push('NULL as Ma_booking');
        }
      } else {
        // Không kiểm tra được, bỏ qua cột Ma_booking để tránh lỗi
        selectFields.push('NULL as Ma_booking');
      }
      
      selectFields.push('dg.So_sao', 'dg.Binh_luan', 'dg.Ngay_danh_gia');
      
      if (columnNames.length > 0) {
        // Đã kiểm tra được
        if (columnNames.includes('Diem_dich_vu')) {
          selectFields.push('dg.Diem_dich_vu');
        } else {
          selectFields.push('NULL as Diem_dich_vu');
        }
        
        if (columnNames.includes('Diem_huong_dan_vien')) {
          selectFields.push('dg.Diem_huong_dan_vien');
        } else {
          selectFields.push('NULL as Diem_huong_dan_vien');
        }
        
        if (columnNames.includes('Diem_phuong_tien')) {
          selectFields.push('dg.Diem_phuong_tien');
        } else {
          selectFields.push('NULL as Diem_phuong_tien');
        }
        
        if (columnNames.includes('Diem_gia_ca')) {
          selectFields.push('dg.Diem_gia_ca');
        } else {
          selectFields.push('NULL as Diem_gia_ca');
        }
        
        if (columnNames.includes('Hinh_anh')) {
          selectFields.push('dg.Hinh_anh');
        } else {
          selectFields.push('NULL as Hinh_anh');
        }
      } else {
        // Không kiểm tra được, bỏ qua các cột optional
        selectFields.push('NULL as Diem_dich_vu');
        selectFields.push('NULL as Diem_huong_dan_vien');
        selectFields.push('NULL as Diem_phuong_tien');
        selectFields.push('NULL as Diem_gia_ca');
        selectFields.push('NULL as Hinh_anh');
      }
      
      selectFields.push('kh.Ten_khach_hang', 't.Ten_tour');
      
      // Luôn dùng Ma_tour trực tiếp từ bảng danh_gia vì nó đã có sẵn
      // Đơn giản và chính xác hơn việc JOIN qua Ma_booking
      // Sử dụng tên bảng danh_gia (chữ thường)
      let query = `
        SELECT 
          ${selectFields.join(',\n          ')}
        FROM danh_gia dg
        JOIN tour_du_lich t ON dg.Ma_tour = t.Ma_tour
        LEFT JOIN khach_hang kh ON dg.Ma_khach_hang = kh.Ma_khach_hang
        WHERE dg.Ma_tour = ?
        ORDER BY dg.Ngay_danh_gia DESC
      `;
      
      // Kiểm tra xem có dữ liệu trong bảng không
      try {
        // Query trực tiếp để xem tất cả dữ liệu
        const [allData] = await pool.query(`SELECT * FROM ${tableName} LIMIT 10`);
        const [allRatings] = await pool.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const [ratingsForTour] = await pool.query(`SELECT COUNT(*) as total FROM ${tableName} WHERE Ma_tour = ?`, [tourId]);
        const [allTourIds] = await pool.query(`SELECT DISTINCT Ma_tour FROM ${tableName} LIMIT 10`);
        
        console.log(`📊 Using table name: ${tableName}`);
        console.log(`📊 Total ratings in database: ${allRatings[0]?.total || 0}`);
        console.log(`📊 Ratings for tour ${tourId}: ${ratingsForTour[0]?.total || 0}`);
        console.log(`📊 Sample Ma_tour in ${tableName}:`, allTourIds.map(r => r.Ma_tour));
        console.log(`📊 All data in ${tableName} (first 10 rows):`, allData.length > 0 ? allData : 'No data');
        
        // Nếu không có dữ liệu, thử kiểm tra xem có bảng nào khác không
        if (allRatings[0]?.total === 0) {
          console.warn('⚠️ Không tìm thấy dữ liệu trong bảng danh_gia');
          // Kiểm tra database hiện tại
          try {
            const [currentDb] = await pool.query(`SELECT DATABASE() as db`);
            console.log(`📊 Current database: ${currentDb[0]?.db || 'unknown'}`);
          } catch (e) {
            console.warn('⚠️ Không thể kiểm tra database hiện tại');
          }
          
          // Thử tìm các bảng có tên tương tự trong database travel_test003
          try {
            const [tables] = await pool.query(
              `SELECT TABLE_NAME 
               FROM INFORMATION_SCHEMA.TABLES 
               WHERE TABLE_SCHEMA = 'travel_test003' 
                 AND (TABLE_NAME LIKE '%danh%' OR TABLE_NAME LIKE '%rating%' OR TABLE_NAME LIKE '%review%')`
            );
            console.log(`📋 Tables with 'danh', 'rating', or 'review' in name in travel_test003:`, tables.map(t => t.TABLE_NAME));
          } catch (e) {
            console.warn('⚠️ Không thể tìm các bảng tương tự:', e.message);
          }
        }
      } catch (debugError) {
        console.error('❌ Lỗi khi kiểm tra dữ liệu:', debugError.message);
        console.error('❌ SQL Error:', debugError.sql);
      }
      
      // Thực thi query với tên bảng đã xác định
      let ratings = [];
      try {
        console.log('🔍 Query ratings for tour:', tourId);
        console.log('📝 Using table:', tableName);
        const [result] = await pool.query(query, [tourId]);
        ratings = result;
        console.log(`✅ Query successful, found ${ratings.length} ratings`);
      } catch (error) {
        console.error('❌ Query failed:', error.message);
        console.error('❌ SQL:', error.sql);
        throw error;
      }
      
      console.log(`✅ Found ${ratings.length} ratings for tour ${tourId}`);
      if (ratings.length > 0) {
        console.log('📋 First rating sample:', JSON.stringify(ratings[0], null, 2));
      }
      return ratings;
    } catch (error) {
      console.error('Error getting ratings by tour:', error);
      throw error;
    }
  }

  /**
   * Get all ratings with filters
   * @param {Object} filters - Filter options { tour, rating, sort, search }
   * @returns {Array} - List of all ratings
   */
  static async getAll(filters = {}) {
    let query = `
      SELECT r.*, k.Ten_khach_hang, t.Ten_tour, b.Ma_booking
      FROM danh_gia r
      LEFT JOIN Khach_hang k ON r.Ma_khach_hang = k.Ma_khach_hang
      LEFT JOIN Tour_du_lich t ON r.Ma_tour = t.Ma_tour
      LEFT JOIN Booking b ON r.Ma_booking = b.Ma_booking
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter theo tour
    if (filters.tour) {
      query += ' AND r.Ma_tour = ?';
      params.push(filters.tour);
    }
    
    // Filter theo số sao
    if (filters.rating) {
      query += ' AND r.So_sao = ?';
      params.push(parseInt(filters.rating));
    }
    
    // Filter theo tìm kiếm
    if (filters.search) {
      query += ' AND (k.Ten_khach_hang LIKE ? OR r.Binh_luan LIKE ? OR t.Ten_tour LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Sort
    switch (filters.sort) {
      case 'oldest':
        query += ' ORDER BY r.Ngay_danh_gia ASC';
        break;
      case 'highest':
        query += ' ORDER BY r.So_sao DESC, r.Ngay_danh_gia DESC';
        break;
      case 'lowest':
        query += ' ORDER BY r.So_sao ASC, r.Ngay_danh_gia DESC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY r.Ngay_danh_gia DESC';
        break;
    }
    
    const [rows] = await pool.query(query, params);
    return rows;
  }

  /**
   * Get rating by ID
   * @param {string} id - Rating ID
   * @returns {Object|null} - Rating data or null if not found
   */
  static async getById(id) {
    const [rows] = await pool.query(
      `SELECT r.*, k.Ten_khach_hang, t.Ten_tour, b.Ma_booking
       FROM danh_gia r
       JOIN khach_hang k ON r.Ma_khach_hang = k.Ma_khach_hang
       JOIN tour_du_lich t ON r.Ma_tour = t.Ma_tour
       JOIN booking b ON r.Ma_booking = b.Ma_booking
       WHERE r.Id_review = ?`,
      [id]
    );
    
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get ratings by tour ID
   * @param {string} tourId - Tour ID
   * @returns {Array} - List of ratings for the tour
   */
  static async getByTourId(tourId) {
    const [rows] = await pool.query(
      `SELECT r.*, k.Ten_khach_hang, b.Ma_booking
       FROM danh_gia r
       JOIN khach_hang k ON r.Ma_khach_hang = k.Ma_khach_hang
       JOIN booking b ON r.Ma_booking = b.Ma_booking
       WHERE r.Ma_tour = ?
       ORDER BY r.Ngay_danh_gia DESC`,
      [tourId]
    );
    
    return rows;
  }

  /**
   * Get ratings by customer ID
   * @param {string} customerId - Customer ID
   * @returns {Array} - List of ratings by customer
   */
  static async getByCustomerId(customerId) {
    const [rows] = await pool.query(
      `SELECT r.*, t.Ten_tour, b.Ma_booking
       FROM danh_gia r
       JOIN tour_du_lich t ON r.Ma_tour = t.Ma_tour
       JOIN booking b ON r.Ma_booking = b.Ma_booking
       WHERE r.Ma_khach_hang = ?
       ORDER BY r.Ngay_danh_gia DESC`,
      [customerId]
    );
    
    return rows;
  }

  /**
   * Get rating by booking ID
   * @param {string} bookingId - booking ID
   * @returns {Object|null} - Rating data or null if not found
   */
  static async getBybookingId(bookingId) {
    const [rows] = await pool.query(
      `SELECT r.*, k.Ten_khach_hang, t.Ten_tour
       FROM danh_gia r
       JOIN khach_hang k ON r.Ma_khach_hang = k.Ma_khach_hang
       JOIN tour_du_lich t ON r.Ma_tour = t.Ma_tour
       WHERE r.Ma_booking = ?`,
      [bookingId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Create a new rating
   * @param {Object} ratingData - Rating data
   * @returns {Object} - Newly created rating
   */
  static async create(ratingData) {
    try {
      const {
        ma_danh_gia,
        ma_tour,
        ma_khach_hang,
        ma_booking,
        diem_danh_gia,
        noi_dung_danh_gia,
        ngay_danh_gia,
        diem_dich_vu,
        diem_huong_dan_vien,
        diem_phuong_tien,
        diem_gia_ca,
        hinh_anh
      } = ratingData;

      // Validate required fields
      if (!ma_tour || !ma_khach_hang || !ma_booking || !diem_danh_gia) {
        throw new Error('Thiếu thông tin bắt buộc khi tạo đánh giá');
      }

      // Validate rating score (1-5)
      if (diem_danh_gia < 1 || diem_danh_gia > 5) {
        throw new Error('Điểm đánh giá phải từ 1 đến 5 sao');
      }

      const query = `
        INSERT INTO danh_gia (
          Ma_tour,
          Ma_khach_hang,
          Ma_booking,
          So_sao,
          Binh_luan,
          Ngay_danh_gia,
          Diem_dich_vu,
          Diem_huong_dan_vien,
          Diem_phuong_tien,
          Diem_gia_ca,
          Hinh_anh
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        ma_tour,
        ma_khach_hang,
        ma_booking,
        diem_danh_gia,
        noi_dung_danh_gia || null,
        ngay_danh_gia || new Date(),
        diem_dich_vu || 0,
        diem_huong_dan_vien || 0,
        diem_phuong_tien || 0,
        diem_gia_ca || 0,
        hinh_anh || null
      ];

      const [result] = await pool.query(query, values);

      // Cập nhật điểm đánh giá trung bình cho tour
      await this.updateTourRating(ma_tour);

      // Return the created rating using the auto-generated ID
      return await this.getById(result.insertId);
    } catch (error) {
      console.error('Lỗi khi tạo đánh giá:', error);
      throw error;
    }
  }

  /**
   * Update tour rating average and count
   * @param {string} tourId - Tour ID
   */
  static async updateTourRating(tourId) {
    try {
      // Calculate average rating and count for the tour
      const [stats] = await pool.query(
        `SELECT 
          AVG(So_sao) as average_rating,
          COUNT(*) as rating_count
         FROM danh_gia 
         WHERE Ma_tour = ?`,
        [tourId]
      );

      const averageRating = stats[0].average_rating || 0;
      const ratingCount = stats[0].rating_count || 0;

      // Update tour table
      await pool.query(
        `UPDATE tour_du_lich 
         SET Diem_danh_gia_trung_binh = ?, 
             So_luong_danh_gia = ?
         WHERE Ma_tour = ?`,
        [averageRating, ratingCount, tourId]
      );

      console.log(`✅ Đã cập nhật điểm đánh giá cho tour ${tourId}: ${parseFloat(averageRating).toFixed(2)} (${ratingCount} đánh giá)`);
    } catch (error) {
      console.error('Lỗi khi cập nhật điểm đánh giá tour:', error);
    }
  }

  /**
   * Update a rating
   * @param {string} id - Rating ID
   * @param {Object} ratingData - Updated rating data
   * @returns {Object} - Updated rating
   */
  static async update(id, ratingData) {
    try {
      const { 
        So_sao,
        diem_danh_gia, 
        Binh_luan,
        noi_dung_danh_gia, 
        Diem_dich_vu,
        diem_dich_vu, 
        Diem_huong_dan_vien,
        diem_huong_dan_vien, 
        Diem_phuong_tien,
        diem_phuong_tien, 
        Diem_gia_ca,
        diem_gia_ca,
        Hinh_anh,
        hinh_anh
      } = ratingData;

      // Use uppercase or lowercase field names
      const so_sao = So_sao || diem_danh_gia;
      const binh_luan = Binh_luan || noi_dung_danh_gia;
      const diem_dich_vu_value = Diem_dich_vu || diem_dich_vu;
      const diem_huong_dan_vien_value = Diem_huong_dan_vien || diem_huong_dan_vien;
      const diem_phuong_tien_value = Diem_phuong_tien || diem_phuong_tien;
      const diem_gia_ca_value = Diem_gia_ca || diem_gia_ca;
      const hinh_anh_value = Hinh_anh || hinh_anh;

      // Validate rating scores if provided
      if (so_sao !== undefined && (so_sao < 1 || so_sao > 5)) {
        throw new Error('Điểm đánh giá phải từ 1 đến 5 sao');
      }

      const updateFields = [];
      const values = [];

      if (so_sao !== undefined) {
        updateFields.push('So_sao = ?');
        values.push(so_sao);
      }

      if (binh_luan !== undefined) {
        updateFields.push('Binh_luan = ?');
        values.push(binh_luan);
      }

      if (diem_dich_vu_value !== undefined) {
        updateFields.push('Diem_dich_vu = ?');
        values.push(diem_dich_vu_value);
      }

      if (diem_huong_dan_vien_value !== undefined) {
        updateFields.push('Diem_huong_dan_vien = ?');
        values.push(diem_huong_dan_vien_value);
      }

      if (diem_phuong_tien_value !== undefined) {
        updateFields.push('Diem_phuong_tien = ?');
        values.push(diem_phuong_tien_value);
      }

      if (diem_gia_ca_value !== undefined) {
        updateFields.push('Diem_gia_ca = ?');
        values.push(diem_gia_ca_value);
      }

      if (hinh_anh_value !== undefined) {
        updateFields.push('Hinh_anh = ?');
        values.push(hinh_anh_value);
      }

      if (updateFields.length === 0) {
        throw new Error('Không có dữ liệu để cập nhật');
      }

      values.push(id);

      const query = `UPDATE danh_gia SET ${updateFields.join(', ')} WHERE Id_review = ?`;
      await pool.query(query, values);

      // Update tour rating average after rating update
      const updatedRating = await this.getById(id);
      if (updatedRating && updatedRating.Ma_tour) {
        await this.updateTourRating(updatedRating.Ma_tour);
      }

      return updatedRating;
    } catch (error) {
      console.error('Lỗi khi cập nhật đánh giá:', error);
      throw error;
    }
  }

  /**
   * Delete a rating
   * @param {string} id - Rating ID
   * @returns {boolean} - Success status
   */
  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM danh_gia WHERE Id_review = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Delete all ratings for a tour
   * @param {string} tourId - Tour ID
   * @returns {number} - Number of deleted ratings
   */
  static async deleteByTour(tourId) {
    const [result] = await pool.query(
      'DELETE FROM danh_gia WHERE Ma_tour = ?',
      [tourId]
    );
    
    return result.affectedRows;
  }

  /**
   * Get average rating for a tour
   * @param {string} tourId - Tour ID
   * @returns {Object} - Average rating and count
   */
  static async getAverageRating(tourId) {
    const [rows] = await pool.query(
      `SELECT 
        AVG(Diem_danh_gia) as diem_trung_binh,
        COUNT(*) as so_luong_danh_gia
       FROM danh_gia 
       WHERE Ma_tour = ?`,
      [tourId]
    );
    
    const result = rows[0];
    return {
      diem_trung_binh: result.diem_trung_binh ? parseFloat(result.diem_trung_binh).toFixed(1) : 0,
      so_luong_danh_gia: result.so_luong_danh_gia
    };
  }

  /**
   * Get rating statistics for a tour
   * @param {string} tourId - Tour ID
   * @returns {Object} - Rating statistics
   */
  static async getRatingStats(tourId) {
    const [rows] = await pool.query(
      `SELECT 
        Diem_danh_gia,
        COUNT(*) as so_luong
       FROM danh_gia 
       WHERE Ma_tour = ?
       GROUP BY Diem_danh_gia
       ORDER BY Diem_danh_gia DESC`,
      [tourId]
    );
    
    const stats = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };
    
    rows.forEach(row => {
      stats[row.Diem_danh_gia] = row.so_luong;
    });
    
    return stats;
  }

  /**
   * Check if customer can rate a booking
   * @param {string} bookingId - booking ID
   * @param {string} customerId - Customer ID
   * @returns {Object} - Can rate status and booking info
   */
  static async canRatebooking(bookingId, customerId) {
    try {
      // Check if booking exists and belongs to customer
      const [bookingRows] = await pool.query(
        `SELECT b.*, l.Ngay_ket_thuc, t.Ten_tour
         FROM booking b
         JOIN chi_tiet_booking cb ON b.Ma_booking = cb.Ma_booking
         JOIN lich_khoi_hanh l ON cb.Ma_lich = l.Ma_lich
         JOIN tour_du_lich t ON l.Ma_tour = t.Ma_tour
         WHERE b.Ma_booking = ? AND b.Ma_khach_hang = ? AND (b.Trang_thai_booking = 'Đã thanh toán' OR b.Trang_thai_booking = 'Paid')`,
        [bookingId, customerId]
      );
      
      if (bookingRows.length === 0) {
        return {
          canRate: false,
          reason: 'Không tìm thấy booking hoặc booking chưa thanh toán'
        };
      }
      
      const booking = bookingRows[0];
      
      // Allow rating immediately after payment (removed tour end date check)
      // Khách hàng có thể đánh giá ngay sau khi thanh toán thành công
      
      // Check if already rated
      const existingRating = await this.getBybookingId(bookingId);
      if (existingRating) {
        return {
          canRate: false,
          reason: 'Bạn đã đánh giá tour này rồi',
          existingRating: existingRating
        };
      }
      
      return {
        canRate: true,
        booking: booking
      };
    } catch (error) {
      console.error('Lỗi khi kiểm tra quyền đánh giá:', error);
      return {
        canRate: false,
        reason: 'Lỗi hệ thống'
      };
    }
  }

  /**
   * Get recent ratings with pagination
   * @param {number} limit - Number of ratings to return
   * @param {number} offset - Offset for pagination
   * @returns {Array} - List of recent ratings
   */
  static async getRecentRatings(limit = 10, offset = 0) {
    const [rows] = await pool.query(
      `SELECT r.*, k.Ten_khach_hang, t.Ten_tour, t.Hinh_anh
       FROM danh_gia r
       JOIN khach_hang k ON r.Ma_khach_hang = k.Ma_khach_hang
       JOIN tour_du_lich t ON r.Ma_tour = t.Ma_tour
       ORDER BY r.Ngay_danh_gia DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    return rows;
  }
}

module.exports = Rating;

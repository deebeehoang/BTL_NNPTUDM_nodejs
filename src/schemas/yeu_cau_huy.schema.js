const pool = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Model Yêu cầu hủy tour
 */
class YeuCauHuy {
  /**
   * Tạo mới yêu cầu hủy tour
   * @param {Object} data - Dữ liệu yêu cầu hủy
   * @returns {Object} - Yêu cầu hủy đã được tạo
   */
  static async create(data) {
    try {
      const { Ma_booking, Ly_do } = data;
      
      // Tạo mã yêu cầu
      const Ma_yeu_cau = `YCH${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      const query = `
        INSERT INTO Yeu_cau_huy (
          Ma_yeu_cau,
          Ma_booking,
          Ngay_yeu_cau,
          Ly_do,
          Trang_thai
        ) VALUES (?, ?, NOW(), ?, 'Dang_xu_ly')
      `;
      
      // Cập nhật trạng thái booking sang Cho_xu_ly_huy
      await pool.query(
        'UPDATE Booking SET Trang_thai_booking = ? WHERE Ma_booking = ?',
        ['Cho_xu_ly_huy', Ma_booking]
      );
      
      const [result] = await pool.query(query, [Ma_yeu_cau, Ma_booking, Ly_do]);
      
      return {
        Ma_yeu_cau,
        Ma_booking,
        Ngay_yeu_cau: new Date(),
        Ly_do,
        Trang_thai: 'Dang_xu_ly'
      };
    } catch (error) {
      console.error('Lỗi khi tạo yêu cầu hủy:', error);
      throw error;
    }
  }

  /**
   * Lấy tất cả yêu cầu hủy 
   * @returns {Array} - Danh sách yêu cầu hủy
   */
  static async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT y.*, 
               b.Ma_khach_hang, 
               k.Ten_khach_hang, 
               t.Ten_tour,
               l.Ngay_bat_dau, 
               l.Ngay_ket_thuc
        FROM Yeu_cau_huy y
        JOIN Booking b ON y.Ma_booking = b.Ma_booking
        JOIN Khach_hang k ON b.Ma_khach_hang = k.Ma_khach_hang
        JOIN Chi_tiet_booking cb ON b.Ma_booking = cb.Ma_booking
        JOIN Lich_khoi_hanh l ON cb.Ma_lich = l.Ma_lich
        JOIN Tour_du_lich t ON l.Ma_tour = t.Ma_tour
        ORDER BY y.Ngay_yeu_cau DESC
      `);
      
      return rows;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách yêu cầu hủy:', error);
      throw error;
    }
  }

  /**
   * Lấy yêu cầu hủy theo mã
   * @param {string} maYeuCau - Mã yêu cầu hủy
   * @returns {Object} - Thông tin yêu cầu hủy
   */
  static async getById(maYeuCau) {
    try {
      const [rows] = await pool.query(`
        SELECT y.*, 
               b.Ma_khach_hang, 
               k.Ten_khach_hang, 
               t.Ten_tour,
               l.Ngay_bat_dau, 
               l.Ngay_ket_thuc,
               b.Tong_tien
        FROM Yeu_cau_huy y
        JOIN Booking b ON y.Ma_booking = b.Ma_booking
        JOIN Khach_hang k ON b.Ma_khach_hang = k.Ma_khach_hang
        JOIN Chi_tiet_booking cb ON b.Ma_booking = cb.Ma_booking
        JOIN Lich_khoi_hanh l ON cb.Ma_lich = l.Ma_lich
        JOIN Tour_du_lich t ON l.Ma_tour = t.Ma_tour
        WHERE y.Ma_yeu_cau = ?
      `, [maYeuCau]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi lấy thông tin yêu cầu hủy:', error);
      throw error;
    }
  }

  /**
   * Lấy yêu cầu hủy theo mã booking
   * @param {string} maBooking - Mã booking
   * @returns {Object} - Thông tin yêu cầu hủy
   */
  static async getByBookingId(maBooking) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM Yeu_cau_huy
        WHERE Ma_booking = ?
        ORDER BY Ngay_yeu_cau DESC
      `, [maBooking]);
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi lấy thông tin yêu cầu hủy theo booking:', error);
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái yêu cầu hủy 
   * @param {string} maYeuCau - Mã yêu cầu hủy
   * @param {string} trangThai - Trạng thái mới ('Da_chap_nhan', 'Da_tu_choi')
   * @param {string} idAdmin - ID của admin xử lý
   * @param {string} lyDoTuChoi - Lý do từ chối (nếu có)
   * @returns {Object} - Kết quả cập nhật
   */
  static async updateStatus(maYeuCau, trangThai, idAdmin, lyDoTuChoi = null) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Lấy thông tin yêu cầu hủy
      const [rows] = await connection.query(
        'SELECT * FROM Yeu_cau_huy WHERE Ma_yeu_cau = ?',
        [maYeuCau]
      );
      
      if (rows.length === 0) {
        throw new Error('Không tìm thấy yêu cầu hủy');
      }
      
      const maBooking = rows[0].Ma_booking;
      
      // Cập nhật yêu cầu hủy
      await connection.query(
        `UPDATE Yeu_cau_huy 
         SET Trang_thai = ?, 
             Id_admin = ?, 
             Ly_do_tu_choi = ?, 
             Ngay_xu_ly = NOW() 
         WHERE Ma_yeu_cau = ?`,
        [trangThai, idAdmin, lyDoTuChoi, maYeuCau]
      );
      
      // Cập nhật trạng thái booking nếu được chấp nhận
      if (trangThai === 'Da_chap_nhan') {
        // Lấy thông tin booking để biết số chỗ và lịch khởi hành
        const [bookingInfo] = await connection.query(
          `SELECT b.So_nguoi_lon, b.So_tre_em, cdb.Ma_lich
           FROM Booking b
           JOIN Chi_tiet_booking cdb ON b.Ma_booking = cdb.Ma_booking
           WHERE b.Ma_booking = ?`,
          [maBooking]
        );
        
        await connection.query(
          'UPDATE Booking SET Trang_thai_booking = ? WHERE Ma_booking = ?',
          ['Da_huy', maBooking]
        );
        
        // Cập nhật trạng thái vé
        await connection.query(
          'UPDATE Ve SET Trang_thai_ve = ? WHERE Ma_booking = ?',
          ['Da_huy', maBooking]
        );
        
        // Tăng So_cho_con_lai và cập nhật Trang_thai cho lịch khởi hành
        if (bookingInfo.length > 0) {
          const { So_nguoi_lon, So_tre_em, Ma_lich } = bookingInfo[0];
          const totalSeats = So_nguoi_lon + So_tre_em;
          
          // Kiểm tra xem cột So_cho_con_lai có tồn tại không
          const [soChoConLaiColumn] = await connection.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'Lich_khoi_hanh' 
               AND COLUMN_NAME = 'So_cho_con_lai'`
          );
          const hasSoChoConLai = soChoConLaiColumn.length > 0;
          
          // Kiểm tra xem cột Trang_thai có tồn tại không
          const [trangThaiColumn] = await connection.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'Lich_khoi_hanh' 
               AND COLUMN_NAME = 'Trang_thai'`
          );
          const hasTrangThai = trangThaiColumn.length > 0;
          
          if (hasSoChoConLai) {
            // Tính lại số chỗ còn lại sau khi hủy booking
            const bookingCondition = `(b.Trang_thai_booking = 'Đã thanh toán' OR (b.Trang_thai_booking = 'Chờ thanh toán' AND (b.expires_at IS NULL OR b.expires_at > NOW())))`;
            
            const [updatedScheduleRows] = await connection.query(
              `SELECT 
                 l.So_cho,
                 COALESCE(SUM(
                   CASE 
                     WHEN ${bookingCondition}
                     THEN (b.So_nguoi_lon + b.So_tre_em)
                     ELSE 0
                   END
                 ), 0) AS bookedSeats
               FROM Lich_khoi_hanh l
               LEFT JOIN Chi_tiet_booking cb ON cb.Ma_lich = l.Ma_lich
               LEFT JOIN Booking b ON b.Ma_booking = cb.Ma_booking
               WHERE l.Ma_lich = ?
               GROUP BY l.Ma_lich, l.So_cho`,
              [Ma_lich]
            );
            
            if (updatedScheduleRows.length > 0) {
              const updatedSchedule = updatedScheduleRows[0];
              const newAvailableSeats = Math.max(0, updatedSchedule.So_cho - updatedSchedule.bookedSeats);
              
              // Cập nhật So_cho_con_lai và Trang_thai
              if (hasTrangThai) {
                // Nếu So_cho_con_lai > 0 và Trang_thai = 'Hết chỗ' → cập nhật thành 'Còn chỗ'
                await connection.query(
                  `UPDATE Lich_khoi_hanh 
                   SET So_cho_con_lai = ?,
                       Trang_thai = CASE
                         WHEN CURDATE() < Ngay_bat_dau THEN
                           CASE WHEN ? > 0 AND Trang_thai = 'Hết chỗ' THEN 'Còn chỗ'
                                ELSE Trang_thai
                           END
                         WHEN CURDATE() = Ngay_bat_dau THEN 'Đang diễn ra'
                         WHEN CURDATE() > Ngay_ket_thuc THEN 'Đã diễn ra'
                         ELSE Trang_thai
                       END
                   WHERE Ma_lich = ?`,
                  [newAvailableSeats, newAvailableSeats, Ma_lich]
                );
              } else {
                await connection.query(
                  `UPDATE Lich_khoi_hanh 
                   SET So_cho_con_lai = ? 
                   WHERE Ma_lich = ?`,
                  [newAvailableSeats, Ma_lich]
                );
              }
              
              console.log(`✅ Đã tăng So_cho_con_lai cho lịch ${Ma_lich}: ${newAvailableSeats} (đã trả lại ${totalSeats} chỗ)`);
            }
          }
        }
      } else if (trangThai === 'Da_tu_choi') {
        // Khôi phục trạng thái booking
        await connection.query(
          'UPDATE Booking SET Trang_thai_booking = ? WHERE Ma_booking = ?',
          ['Da_thanh_toan', maBooking]
        );
      }
      
      await connection.commit();
      
      return {
        success: true,
        message: trangThai === 'Da_chap_nhan' 
          ? 'Đã chấp nhận yêu cầu hủy tour' 
          : 'Đã từ chối yêu cầu hủy tour'
      };
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi cập nhật trạng thái yêu cầu hủy:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = YeuCauHuy; 
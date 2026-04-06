const db = require('./database');
const pool = require('./database');

/**
 * Service để tự động hủy các booking hết hạn và trả lại số chỗ
 */
class BookingCleanupService {
  /**
   * Hủy các booking hết hạn và trả lại số chỗ
   */
  static async cancelExpiredBookings() {
    let connection = null;
    try {
      // Thử kết nối database với error handling
      try {
        connection = await pool.getConnection();
      } catch (connError) {
        if (connError.code === 'ECONNREFUSED' || connError.code === 'ETIMEDOUT') {
          console.warn('⚠️ [CLEANUP] Không thể kết nối database. MySQL server có thể đang tắt.');
          return { cancelled: 0, seatsReleased: 0, error: 'Database connection failed' };
        }
        throw connError;
      }

      await connection.beginTransaction();

      console.log('🕐 [CLEANUP] Bắt đầu kiểm tra booking hết hạn...');

      // Lấy tên bảng booking chính xác
      const [tables] = await connection.query(
        `SELECT TABLE_NAME 
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND LOWER(TABLE_NAME) = 'booking'`
      );
      const bookingTableName = tables.length > 0 ? tables[0].TABLE_NAME : 'booking';

      // Kiểm tra xem cột expires_at có tồn tại không
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = 'expires_at'`,
        [bookingTableName]
      );
      
      const hasExpiresAt = columns.length > 0;
      
      // Tìm các booking đã hết hạn
      // Nếu có cột expires_at: dùng expires_at < NOW()
      // Nếu không: dùng Ngay_dat < NOW() - INTERVAL 10 MINUTE (booking quá 10 phút)
      let expiredBookingsQuery;
      if (hasExpiresAt) {
        expiredBookingsQuery = `
          SELECT b.Ma_booking, b.So_nguoi_lon, b.So_tre_em, cdb.Ma_lich
          FROM \`${bookingTableName}\` b
          JOIN Chi_tiet_booking cdb ON b.Ma_booking = cdb.Ma_booking
          WHERE b.Trang_thai_booking = 'Chờ thanh toán'
            AND b.expires_at IS NOT NULL
            AND b.expires_at < NOW()`;
      } else {
        // Nếu không có expires_at, hủy các booking "Chờ thanh toán" quá 10 phút
        expiredBookingsQuery = `
          SELECT b.Ma_booking, b.So_nguoi_lon, b.So_tre_em, cdb.Ma_lich
          FROM \`${bookingTableName}\` b
          JOIN Chi_tiet_booking cdb ON b.Ma_booking = cdb.Ma_booking
          WHERE b.Trang_thai_booking = 'Chờ thanh toán'
            AND b.Ngay_dat < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`;
      }
      
      const [expiredBookings] = await connection.query(expiredBookingsQuery, []);

      if (expiredBookings.length === 0) {
        console.log('✅ [CLEANUP] Không có booking nào hết hạn');
        await connection.commit();
        return { cancelled: 0, seatsReleased: 0 };
      }

      console.log(`📋 [CLEANUP] Tìm thấy ${expiredBookings.length} booking hết hạn`);

      let totalSeatsReleased = 0;
      const cancelledBookings = [];

      // Nhóm booking theo Ma_lich để cập nhật số chỗ hiệu quả
      const scheduleUpdates = {};

      for (const booking of expiredBookings) {
        const { Ma_booking, So_nguoi_lon, So_tre_em, Ma_lich } = booking;
        const totalSeats = So_nguoi_lon + So_tre_em;

        // Cập nhật trạng thái booking thành "Het_han" (Hết hạn) thay vì "Hủy"
        // Để booking vẫn hiển thị trong lịch sử với thông báo hết hạn
        // Chỉ cập nhật expires_at nếu cột tồn tại
        if (hasExpiresAt) {
          await connection.query(
            `UPDATE \`${bookingTableName}\` 
             SET Trang_thai_booking = 'Het_han',
                 expires_at = NULL
             WHERE Ma_booking = ?`,
            [Ma_booking]
          );
        } else {
          await connection.query(
            `UPDATE \`${bookingTableName}\` 
             SET Trang_thai_booking = 'Het_han'
             WHERE Ma_booking = ?`,
            [Ma_booking]
          );
        }

        cancelledBookings.push(Ma_booking);

        // Tính tổng số chỗ cần trả lại cho mỗi lịch
        if (!scheduleUpdates[Ma_lich]) {
          scheduleUpdates[Ma_lich] = 0;
        }
        scheduleUpdates[Ma_lich] += totalSeats;
        totalSeatsReleased += totalSeats;

        console.log(`❌ [CLEANUP] Đã hủy booking ${Ma_booking}, trả lại ${totalSeats} chỗ cho lịch ${Ma_lich}`);
      }

      // Cập nhật So_cho_con_lai trong database nếu cột tồn tại
      // Kiểm tra xem cột So_cho_con_lai có tồn tại không
      const [soChoConLaiColumn] = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'Lich_khoi_hanh' 
           AND COLUMN_NAME = 'So_cho_con_lai'`
      );
      
      const hasSoChoConLai = soChoConLaiColumn.length > 0;
      
      // Tính lại số chỗ còn lại cho mỗi lịch đã bị ảnh hưởng
      for (const [maLich, seatsToRelease] of Object.entries(scheduleUpdates)) {
        const [scheduleInfo] = await connection.query(
          'SELECT So_cho FROM Lich_khoi_hanh WHERE Ma_lich = ?',
          [maLich]
        );

        if (scheduleInfo.length === 0) {
          console.warn(`⚠️ [CLEANUP] Không tìm thấy lịch ${maLich}`);
          continue;
        }

        const totalSeats = scheduleInfo[0].So_cho;
        
        if (hasSoChoConLai) {
          // Tính lại số chỗ còn lại sau khi hủy booking hết hạn
          // Sử dụng cùng điều kiện booking như đã xác định ở đầu hàm
          const bookingCondition = hasExpiresAt ? 
            `(b.Trang_thai_booking = 'Đã thanh toán' OR (b.Trang_thai_booking = 'Chờ thanh toán' AND (b.expires_at IS NULL OR b.expires_at > NOW())))` :
            `(b.Trang_thai_booking = 'Đã thanh toán' OR (b.Trang_thai_booking = 'Chờ thanh toán' AND b.Ngay_dat > DATE_SUB(NOW(), INTERVAL 10 MINUTE)))`;
          
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
             LEFT JOIN \`${bookingTableName}\` b ON b.Ma_booking = cb.Ma_booking
             WHERE l.Ma_lich = ?
             GROUP BY l.Ma_lich, l.So_cho`,
            [maLich]
          );
          
          if (updatedScheduleRows.length > 0) {
            const updatedSchedule = updatedScheduleRows[0];
            const newAvailableSeats = Math.max(0, updatedSchedule.So_cho - updatedSchedule.bookedSeats);
            
            // Kiểm tra xem cột Trang_thai có tồn tại không
            const [trangThaiColumn] = await connection.query(
              `SELECT COLUMN_NAME 
               FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'Lich_khoi_hanh' 
                 AND COLUMN_NAME = 'Trang_thai'`
            );
            const hasTrangThai = trangThaiColumn.length > 0;
            
            // Cập nhật So_cho_con_lai và Trang_thai
            if (hasTrangThai) {
              // Nếu So_cho_con_lai > 0 và Trang_thai = 'Hết chỗ' → cập nhật thành 'Còn chỗ'
              // Chỉ cập nhật nếu lịch chưa diễn ra (CURDATE() < Ngay_bat_dau)
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
                [newAvailableSeats, newAvailableSeats, maLich]
              );
            } else {
              await connection.query(
                `UPDATE Lich_khoi_hanh 
                 SET So_cho_con_lai = ? 
                 WHERE Ma_lich = ?`,
                [newAvailableSeats, maLich]
              );
            }
            
            console.log(`✅ [CLEANUP] Đã cập nhật So_cho_con_lai trong database: ${newAvailableSeats} cho lịch ${maLich} (đã trả lại ${seatsToRelease} chỗ)`);
          }
        } else {
          console.log(`✅ [CLEANUP] Đã trả lại ${seatsToRelease} chỗ cho lịch ${maLich}. Số chỗ còn lại sẽ được tính toán tự động từ So_cho (${totalSeats})`);
        }
      }

      await connection.commit();

      console.log(`🎉 [CLEANUP] Hoàn thành! Đã hủy ${cancelledBookings.length} booking và trả lại ${totalSeatsReleased} chỗ`);

      return {
        cancelled: cancelledBookings.length,
        seatsReleased: totalSeatsReleased,
        bookingIds: cancelledBookings
      };
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('❌ [CLEANUP] Lỗi khi rollback:', rollbackError);
        }
      }
      console.error('❌ [CLEANUP] Lỗi khi hủy booking hết hạn:', error.message || error);
      // Không throw error để cron job không bị dừng
      return { cancelled: 0, seatsReleased: 0, error: error.message || 'Unknown error' };
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          console.error('❌ [CLEANUP] Lỗi khi release connection:', releaseError);
        }
      }
    }
  }

  /**
   * Kiểm tra và log số chỗ còn lại cho tất cả lịch khởi hành (không cập nhật So_cho_con_lai)
   * Số chỗ sẽ được tính toán trực tiếp từ So_cho mỗi lần query
   */
  static async syncAvailableSeats() {
    let connection = null;
    try {
      try {
        connection = await pool.getConnection();
      } catch (connError) {
        if (connError.code === 'ECONNREFUSED' || connError.code === 'ETIMEDOUT') {
          console.warn('⚠️ [SYNC] Không thể kết nối database. MySQL server có thể đang tắt.');
          return { checked: 0, error: 'Database connection failed' };
        }
        throw connError;
      }

      console.log('🔄 [SYNC] Kiểm tra số chỗ còn lại (không cập nhật So_cho_con_lai)...');

      // Lấy tên bảng booking chính xác
      const [tables] = await connection.query(
        `SELECT TABLE_NAME 
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND LOWER(TABLE_NAME) = 'booking'`
      );
      const bookingTableName = tables.length > 0 ? tables[0].TABLE_NAME : 'booking';

      // Lấy tất cả lịch khởi hành
      const [schedules] = await connection.query(
        'SELECT Ma_lich, So_cho FROM Lich_khoi_hanh'
      );

      let checked = 0;

      for (const schedule of schedules) {
        const { Ma_lich, So_cho } = schedule;

        // Tính số chỗ đã đặt (chỉ tính booking chưa hủy)
        const [bookingRows] = await connection.query(
          `SELECT SUM(b.So_nguoi_lon + b.So_tre_em) as total_booked
           FROM Chi_tiet_booking cdb
           JOIN \`${bookingTableName}\` b ON cdb.Ma_booking = b.Ma_booking
           WHERE cdb.Ma_lich = ? 
             AND b.Trang_thai_booking NOT IN ('Da_huy', 'Hủy')`,
          [Ma_lich]
        );

        const totalBooked = bookingRows[0]?.total_booked || 0;
        const availableSeats = Math.max(0, So_cho - totalBooked);

        // Chỉ log, không cập nhật So_cho_con_lai
        console.log(`📊 [SYNC] Lịch ${Ma_lich}: Tổng ${So_cho}, Đã đặt ${totalBooked}, Còn lại ${availableSeats}`);

        checked++;
      }

      console.log(`✅ [SYNC] Đã kiểm tra số chỗ cho ${checked} lịch khởi hành (số chỗ được tính toán tự động)`);
      return { checked };
    } catch (error) {
      console.error('❌ [SYNC] Lỗi khi kiểm tra số chỗ:', error.message || error);
      return { checked: 0, error: error.message || 'Unknown error' };
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          console.error('❌ [SYNC] Lỗi khi release connection:', releaseError);
        }
      }
    }
  }

  /**
   * Cập nhật trạng thái lịch khởi hành theo thời gian
   * Chạy mỗi ngày lúc 00:00
   */
  static async updateScheduleStatus() {
    let connection = null;
    try {
      try {
        connection = await pool.getConnection();
      } catch (connError) {
        if (connError.code === 'ECONNREFUSED' || connError.code === 'ETIMEDOUT') {
          console.warn('⚠️ [STATUS] Không thể kết nối database. MySQL server có thể đang tắt.');
          return { updated: 0, error: 'Database connection failed' };
        }
        throw connError;
      }

      await connection.beginTransaction();

      console.log('🔄 [STATUS] Bắt đầu cập nhật trạng thái lịch khởi hành...');

      // Kiểm tra xem cột Trang_thai có tồn tại không
      const [trangThaiColumn] = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'Lich_khoi_hanh' 
           AND COLUMN_NAME = 'Trang_thai'`
      );
      
      const hasTrangThai = trangThaiColumn.length > 0;
      
      if (!hasTrangThai) {
        console.log('⚠️ [STATUS] Cột Trang_thai chưa tồn tại trong bảng Lich_khoi_hanh. Bỏ qua cập nhật.');
        await connection.commit();
        return { updated: 0 };
      }

      // Kiểm tra xem cột So_cho_con_lai có tồn tại không
      const [soChoConLaiColumn] = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'Lich_khoi_hanh' 
           AND COLUMN_NAME = 'So_cho_con_lai'`
      );
      const hasSoChoConLai = soChoConLaiColumn.length > 0;

      // Cập nhật trạng thái cho tất cả lịch khởi hành
      let updateQuery;
      if (hasSoChoConLai) {
        updateQuery = `
          UPDATE Lich_khoi_hanh
          SET Trang_thai = 
            CASE
              WHEN CURDATE() < Ngay_bat_dau THEN 
                CASE WHEN COALESCE(So_cho_con_lai, So_cho) > 0 THEN 'Còn chỗ' ELSE 'Hết chỗ' END
              WHEN CURDATE() = Ngay_bat_dau THEN 'Đang diễn ra'
              WHEN CURDATE() > Ngay_ket_thuc THEN 'Đã diễn ra'
              ELSE 
                CASE WHEN COALESCE(So_cho_con_lai, So_cho) > 0 THEN 'Còn chỗ' ELSE 'Hết chỗ' END
            END
        `;
      } else {
        updateQuery = `
          UPDATE Lich_khoi_hanh
          SET Trang_thai = 
            CASE
              WHEN CURDATE() < Ngay_bat_dau THEN 'Còn chỗ'
              WHEN CURDATE() = Ngay_bat_dau THEN 'Đang diễn ra'
              WHEN CURDATE() > Ngay_ket_thuc THEN 'Đã diễn ra'
              ELSE 'Còn chỗ'
            END
        `;
      }

      const [result] = await connection.query(updateQuery);
      const updatedCount = result.affectedRows || 0;

      await connection.commit();

      console.log(`✅ [STATUS] Đã cập nhật trạng thái cho ${updatedCount} lịch khởi hành`);

      return { updated: updatedCount };
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('❌ [STATUS] Lỗi khi rollback:', rollbackError);
        }
      }
      console.error('❌ [STATUS] Lỗi khi cập nhật trạng thái lịch khởi hành:', error.message || error);
      return { updated: 0, error: error.message || 'Unknown error' };
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseError) {
          console.error('❌ [STATUS] Lỗi khi release connection:', releaseError);
        }
      }
    }
  }
}

module.exports = BookingCleanupService;


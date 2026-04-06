const db = require('./database');

class BookingUtil {
  /**
   * Tìm khách hàng theo userId
   */
  static async findCustomerByUserId(userId, connection) {
    const conn = connection || db;
    const [rows] = await conn.query(
      'SELECT * FROM Khach_hang WHERE Id_user = ?',
      [userId]
    );
    return rows[0] || null;
  }

  /**
   * Lock lịch khởi hành (FOR UPDATE) để tránh race condition
   */
  static async lockScheduleForUpdate(maLich, connection) {
    const [rows] = await connection.query({
      sql: 'SELECT * FROM Lich_khoi_hanh WHERE Ma_lich = ? FOR UPDATE',
      values: [maLich],
      timeout: 10000
    });
    return rows[0] || null;
  }

  /**
   * Kiểm tra cột tồn tại trong bảng
   */
  static async columnExists(tableName, columnName, connection) {
    const conn = connection || db;
    const [rows] = await conn.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );
    return rows.length > 0;
  }

  /**
   * Tính tổng số chỗ đã đặt cho lịch khởi hành
   */
  static async getTotalBookedSeats(maLich, hasExpiresAt, connection) {
    const conn = connection || db;
    let bookingQuery;
    if (hasExpiresAt) {
      bookingQuery = `
        SELECT SUM(b.So_nguoi_lon + b.So_tre_em) as total_booked
        FROM Chi_tiet_booking cdb
        JOIN Booking b ON cdb.Ma_booking = b.Ma_booking
        WHERE cdb.Ma_lich = ? 
          AND (
            b.Trang_thai_booking = 'Đã thanh toán'
            OR (
              b.Trang_thai_booking = 'Chờ thanh toán'
              AND (b.expires_at IS NULL OR b.expires_at > NOW())
            )
          )
      `;
    } else {
      bookingQuery = `
        SELECT SUM(b.So_nguoi_lon + b.So_tre_em) as total_booked
        FROM Chi_tiet_booking cdb
        JOIN Booking b ON cdb.Ma_booking = b.Ma_booking
        WHERE cdb.Ma_lich = ? 
          AND (
            b.Trang_thai_booking = 'Đã thanh toán'
            OR (
              b.Trang_thai_booking = 'Chờ thanh toán'
              AND b.Ngay_dat > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
            )
          )
      `;
    }

    const [rows] = await conn.query({
      sql: bookingQuery,
      values: [maLich],
      timeout: 10000
    });
    return rows[0]?.total_booked || 0;
  }

  /**
   * Lấy tên bảng Booking thực tế trong database
   */
  static async getBookingTableName(connection) {
    const conn = connection || db;
    try {
      const [tables] = await conn.query(
        `SELECT TABLE_NAME 
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND (TABLE_NAME = 'Booking' OR TABLE_NAME = 'booking')`
      );
      return tables.length > 0 ? tables[0].TABLE_NAME : 'Booking';
    } catch {
      return 'Booking';
    }
  }

  /**
   * Insert booking vào database
   */
  static async insertBooking(booking, hasExpiresAt, bookingTableName, connection) {
    let query, values;
    if (hasExpiresAt) {
      query = `
        INSERT INTO ${bookingTableName} (
          Ma_booking, Ngay_dat, So_nguoi_lon, So_tre_em,
          Ma_khuyen_mai, Trang_thai_booking, Tong_tien,
          Ma_khach_hang, Id_user, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      values = [
        booking.Ma_booking, booking.Ngay_dat, booking.So_nguoi_lon,
        booking.So_tre_em, booking.Ma_khuyen_mai, booking.Trang_thai_booking,
        booking.Tong_tien, booking.Ma_khach_hang, booking.Id_user, booking.expires_at
      ];
    } else {
      query = `
        INSERT INTO ${bookingTableName} (
          Ma_booking, Ngay_dat, So_nguoi_lon, So_tre_em,
          Ma_khuyen_mai, Trang_thai_booking, Tong_tien,
          Ma_khach_hang, Id_user
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      values = [
        booking.Ma_booking, booking.Ngay_dat, booking.So_nguoi_lon,
        booking.So_tre_em, booking.Ma_khuyen_mai, booking.Trang_thai_booking,
        booking.Tong_tien, booking.Ma_khach_hang, booking.Id_user
      ];
    }

    const result = await connection.query({
      sql: query,
      values,
      timeout: 30000
    });
    return result;
  }

  /**
   * Verify booking đã được insert
   */
  static async verifyBookingExists(bookingId, bookingTableName, connection) {
    const [rows] = await connection.query(
      `SELECT * FROM ${bookingTableName} WHERE Ma_booking = ?`,
      [bookingId]
    );
    return rows[0] || null;
  }

  /**
   * Insert chi tiết booking (liên kết booking với lịch khởi hành)
   */
  static async insertChiTietBooking(bookingId, maLich, connection) {
    await connection.query({
      sql: 'INSERT INTO Chi_tiet_booking (Ma_booking, Ma_lich) VALUES (?, ?)',
      values: [bookingId, maLich],
      timeout: 15000
    });

    // Verify
    const [rows] = await connection.query(
      'SELECT * FROM Chi_tiet_booking WHERE Ma_booking = ? AND Ma_lich = ?',
      [bookingId, maLich]
    );
    if (rows.length === 0) {
      throw new Error(`Chi_tiet_booking for ${bookingId} was not inserted into database`);
    }
  }

  /**
   * Cập nhật So_cho_con_lai và Trang_thai cho lịch khởi hành
   */
  static async updateScheduleAvailability(maLich, hasExpiresAt, connection) {
    // Kiểm tra cột So_cho_con_lai
    const hasSoChoConLai = await BookingUtil.columnExists('Lich_khoi_hanh', 'So_cho_con_lai', connection);
    if (!hasSoChoConLai) return;

    const bookingCondition = hasExpiresAt
      ? `(b.Trang_thai_booking = 'Đã thanh toán' OR (b.Trang_thai_booking = 'Chờ thanh toán' AND (b.expires_at IS NULL OR b.expires_at > NOW())))`
      : `(b.Trang_thai_booking = 'Đã thanh toán' OR (b.Trang_thai_booking = 'Chờ thanh toán' AND b.Ngay_dat > DATE_SUB(NOW(), INTERVAL 10 MINUTE)))`;

    const calculateQuery = `
      SELECT 
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
       GROUP BY l.Ma_lich, l.So_cho
    `;

    const [rows] = await connection.query(calculateQuery, [maLich]);
    if (rows.length === 0) return;

    const { So_cho, bookedSeats } = rows[0];
    const newAvailableSeats = Math.max(0, So_cho - bookedSeats);

    const hasTrangThai = await BookingUtil.columnExists('Lich_khoi_hanh', 'Trang_thai', connection);

    if (hasTrangThai) {
      await connection.query(
        `UPDATE Lich_khoi_hanh 
         SET So_cho_con_lai = ?,
             Trang_thai = CASE
               WHEN CURDATE() < Ngay_bat_dau THEN
                 CASE WHEN ? = 0 THEN 'Hết chỗ' 
                      WHEN ? > 0 AND Trang_thai = 'Hết chỗ' THEN 'Còn chỗ'
                      ELSE Trang_thai
                 END
               WHEN CURDATE() = Ngay_bat_dau THEN 'Đang diễn ra'
               WHEN CURDATE() > Ngay_ket_thuc THEN 'Đã diễn ra'
               ELSE Trang_thai
             END
         WHERE Ma_lich = ?`,
        [newAvailableSeats, newAvailableSeats, newAvailableSeats, maLich]
      );
    } else {
      await connection.query(
        'UPDATE Lich_khoi_hanh SET So_cho_con_lai = ? WHERE Ma_lich = ?',
        [newAvailableSeats, maLich]
      );
    }
  }

  /**
   * Lấy thông tin booking chi tiết (cho notification)
   */
  static async getBookingDetailsForNotification(bookingId, connection) {
    const conn = connection || db;
    const [rows] = await conn.query(
      `SELECT 
        b.Ma_booking, b.Ngay_dat, b.So_nguoi_lon, b.So_tre_em,
        b.Tong_tien, b.Trang_thai_booking,
        kh.Ten_khach_hang,
        t.Ten_tour,
        lkh.Ngay_bat_dau, lkh.Ngay_ket_thuc
      FROM Booking b
      JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
      JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
      JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
      JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
      WHERE b.Ma_booking = ?`,
      [bookingId]
    );
    return rows[0] || null;
  }

  /**
   * Lấy mã hướng dẫn viên của lịch khởi hành
   */
  static async getScheduleGuideId(maLich, connection) {
    const conn = connection || db;
    const [rows] = await conn.query(
      'SELECT Ma_huong_dan_vien FROM lich_khoi_hanh WHERE Ma_lich = ?',
      [maLich]
    );
    return rows[0]?.Ma_huong_dan_vien || null;
  }
}

module.exports = BookingUtil;

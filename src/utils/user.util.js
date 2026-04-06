const db = require('./database');

class UserUtil {
  /**
   * Lấy danh sách tất cả người dùng với thông tin booking/hóa đơn
   */
  static async getAllUsersWithStats() {
    const [rows] = await db.query(
      `SELECT 
          kh.Ma_khach_hang,
          kh.Ten_khach_hang,
          tk.Email,
          tk.Id_user,
          COALESCE(tk.status, 'Active') AS status,
          (SELECT COUNT(*) FROM Booking b WHERE b.Ma_khach_hang = kh.Ma_khach_hang) AS so_booking,
          (SELECT COUNT(*) FROM Hoa_don h 
           JOIN Booking b2 ON h.Ma_booking = b2.Ma_booking 
           WHERE b2.Ma_khach_hang = kh.Ma_khach_hang) AS so_hoa_don
      FROM Khach_hang kh
      JOIN tai_khoan tk ON kh.Id_user = tk.Id_user
      ORDER BY kh.Ten_khach_hang`
    );
    return rows;
  }

  /**
   * Lấy thông tin chi tiết người dùng theo mã khách hàng
   */
  static async getUserDetailsByCustomerId(maKhachHang) {
    const [rows] = await db.query(
      `SELECT * FROM Khach_hang kh
       JOIN tai_khoan tk ON kh.Id_user = tk.Id_user
       WHERE kh.Ma_khach_hang = ?`,
      [maKhachHang]
    );
    return rows[0] || null;
  }

  /**
   * Lấy danh sách booking của khách hàng kèm tên tour
   */
  static async getUserBookingsWithTourName(maKhachHang) {
    const [rows] = await db.query(
      `SELECT 
          b.Ma_booking,
          b.Ngay_dat,
          b.Trang_thai_booking,
          b.Tong_tien,
          t.Ten_tour
      FROM Booking b
      LEFT JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
      LEFT JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
      LEFT JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
      WHERE b.Ma_khach_hang = ?
      ORDER BY b.Ngay_dat DESC`,
      [maKhachHang]
    );
    return rows;
  }

  /**
   * Lấy thông tin khách hàng theo mã
   */
  static async getCustomerById(maKhachHang) {
    const [rows] = await db.query(
      'SELECT * FROM Khach_hang WHERE Ma_khach_hang = ?',
      [maKhachHang]
    );
    return rows[0] || null;
  }

  /**
   * Cập nhật thông tin khách hàng (transaction)
   */
  static async updateCustomerInfo(maKhachHang, { Ten_khach_hang, Email, Dia_chi, Ngay_sinh, CCCD }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy Id_user
      const [khachHang] = await connection.query(
        'SELECT Id_user FROM Khach_hang WHERE Ma_khach_hang = ?',
        [maKhachHang]
      );
      if (khachHang.length === 0) throw new Error('Không tìm thấy khách hàng');
      const idUser = khachHang[0].Id_user;

      // Cập nhật thông tin khách hàng
      await connection.query(
        `UPDATE Khach_hang 
         SET Ten_khach_hang = ?, Dia_chi = ?, Ngay_sinh = ?, CCCD = ?
         WHERE Ma_khach_hang = ?`,
        [Ten_khach_hang, Dia_chi, Ngay_sinh, CCCD, maKhachHang]
      );

      // Cập nhật email nếu có
      if (Email) {
        const [existingEmail] = await connection.query(
          'SELECT * FROM tai_khoan WHERE Email = ? AND Id_user != ?',
          [Email, idUser]
        );
        if (existingEmail.length > 0) {
          throw new Error('Email đã được sử dụng bởi tài khoản khác');
        }
        await connection.query(
          'UPDATE tai_khoan SET Email = ? WHERE Id_user = ?',
          [Email, idUser]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Cập nhật trạng thái tài khoản (block/unblock)
   */
  static async updateAccountStatus(userId, newStatus) {
    await db.query(
      'UPDATE Tai_khoan SET status = ? WHERE Id_user = ?',
      [newStatus, userId]
    );
  }

  /**
   * Lấy thông tin tài khoản theo Id_user
   */
  static async getAccountByUserId(userId) {
    const [rows] = await db.query(
      'SELECT * FROM Tai_khoan WHERE Id_user = ?',
      [userId]
    );
    return rows[0] || null;
  }

  /**
   * Đếm booking của khách hàng
   */
  static async countBookingsByCustomer(maKhachHang) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM Booking WHERE Ma_khach_hang = ?',
      [maKhachHang]
    );
    return rows[0].count;
  }

  /**
   * Xóa khách hàng và tài khoản (transaction)
   */
  static async deleteCustomerAndAccount(maKhachHang, idUser) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('DELETE FROM Khach_hang WHERE Ma_khach_hang = ?', [maKhachHang]);
      await connection.query('DELETE FROM tai_khoan WHERE Id_user = ?', [idUser]);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = UserUtil;

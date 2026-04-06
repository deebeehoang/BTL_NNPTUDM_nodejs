const db = require('./database');

class PaymentUtil {
  /**
   * Tạo hóa đơn cho booking
   */
  static async createInvoice(bookingId, amount, conn) {
    const connection = conn || db;
    const [result] = await connection.query(
      `INSERT INTO hoa_don (Ma_booking, Ngay_lap, Tong_tien, Trang_thai_hoa_don)
       VALUES (?, NOW(), ?, 'Đã thanh toán')`,
      [bookingId, amount]
    );
    return result;
  }

  /**
   * Tạo hóa đơn với mã tùy chỉnh
   */
  static async createInvoiceWithId(maHoaDon, bookingId, amount, conn) {
    const connection = conn || db;
    await connection.query(
      `INSERT INTO hoa_don 
        (Ma_hoa_don, Ma_booking, Ngay_lap, Tong_tien, Trang_thai_hoa_don)
       VALUES (?, ?, NOW(), ?, 'Đã thanh toán')`,
      [maHoaDon, bookingId, amount]
    );
  }

  /**
   * Tạo bản ghi checkout
   */
  static async createCheckout(bookingId, paymentMethod, amount, conn) {
    const connection = conn || db;
    const [result] = await connection.query(
      `INSERT INTO checkout (Ma_booking, Phuong_thuc_thanh_toan, Ngay_tra, So_tien, Trang_thai)
       VALUES (?, ?, NOW(), ?, 'Thành công')`,
      [bookingId, paymentMethod, amount]
    );
    return result;
  }

  /**
   * Tạo bản ghi checkout với ID và zp_trans_id
   */
  static async createCheckoutWithZaloInfo(idCheckout, bookingId, amount, zpTransId, conn) {
    const connection = conn || db;
    await connection.query(
      `INSERT INTO checkout 
        (ID_checkout, Ma_booking, Phuong_thuc_thanh_toan, Ngay_tra, So_tien, Trang_thai, zp_trans_id)
       VALUES (?, ?, 'ZaloPay', NOW(), ?, 'Thành công', ?)`,
      [idCheckout, bookingId, amount, zpTransId]
    );
  }

  /**
   * Cập nhật trạng thái booking thành đã thanh toán (ZaloPay)
   */
  static async updateBookingPaymentStatus(bookingId, conn) {
    const connection = conn || db;
    await connection.query(
      `UPDATE booking 
       SET Trang_thai_booking = 'Đã thanh toán', 
           Phuong_thuc_thanh_toan = 'zalopay',
           Ngay_thanh_toan = NOW()
       WHERE Ma_booking = ?`,
      [bookingId]
    );
  }

  /**
   * Tạo checkout cho saveTransactionData
   */
  static async createCheckoutForTransaction(bookingId, amount, appTransId, conn) {
    const connection = conn || db;
    await connection.query(
      `INSERT INTO checkout 
        (Ma_booking, Phuong_thuc_thanh_toan, Ngay_tra, So_tien, Trang_thai, zp_trans_id) 
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [bookingId, 'ZaloPay', amount, 'success', appTransId]
    );
  }

  /**
   * Kiểm tra hóa đơn đã tồn tại cho booking
   */
  static async getInvoiceByBookingId(bookingId, conn) {
    const connection = conn || db;
    const [rows] = await connection.query(
      'SELECT Ma_hoa_don FROM hoadon WHERE Ma_booking = ?',
      [bookingId]
    );
    return rows;
  }

  /**
   * Tạo hóa đơn mới (bảng hoadon)
   */
  static async createInvoiceHoaDon(bookingId, amount, conn) {
    const connection = conn || db;
    await connection.query(
      `INSERT INTO hoadon 
        (Ma_booking, Ngay_lap, Tong_tien, Trang_thai_hoa_don) 
       VALUES (?, NOW(), ?, ?)`,
      [bookingId, amount, 'đã thanh toán']
    );
  }

  /**
   * Cập nhật trạng thái hóa đơn
   */
  static async updateInvoiceStatus(bookingId, conn) {
    const connection = conn || db;
    await connection.query(
      `UPDATE hoadon 
       SET Trang_thai_hoa_don = 'đã thanh toán', 
           Ngay_lap = NOW() 
       WHERE Ma_booking = ?`,
      [bookingId]
    );
  }

  // ==================== MoMo IPN Methods ====================

  /**
   * Lấy thông tin booking với chi tiết tour cho MoMo IPN
   */
  static async getBookingWithTourDetails(bookingId, conn) {
    const connection = conn || db;
    const [rows] = await connection.query(
      `SELECT 
          b.*,
          ctb.Ma_lich,
          t.Gia_nguoi_lon,
          t.Gia_tre_em
      FROM Booking b
      JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
      JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
      JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
      WHERE b.Ma_booking = ?`,
      [bookingId]
    );
    return rows[0] || null;
  }

  /**
   * Kiểm tra hóa đơn đã tồn tại (bảng Hoa_don)
   */
  static async getInvoiceByBookingIdHoaDon(bookingId, conn) {
    const connection = conn || db;
    const [rows] = await connection.query(
      'SELECT Ma_hoa_don FROM Hoa_don WHERE Ma_booking = ?',
      [bookingId]
    );
    return rows;
  }

  /**
   * Tạo hóa đơn (bảng Hoa_don) với mã tùy chỉnh
   */
  static async createInvoiceHoaDonWithId(maHoaDon, bookingId, tongTien, conn) {
    const connection = conn || db;
    await connection.query(
      `INSERT INTO Hoa_don (Ma_hoa_don, Ma_booking, Ngay_lap, Tong_tien, Trang_thai_hoa_don)
       VALUES (?, ?, NOW(), ?, 'Đã thanh toán')`,
      [maHoaDon, bookingId, tongTien]
    );
  }

  /**
   * Lấy vé theo booking
   */
  static async getTicketsByBookingId(bookingId, conn) {
    const connection = conn || db;
    const [rows] = await connection.query(
      'SELECT So_ve FROM Ve WHERE Ma_booking = ?',
      [bookingId]
    );
    return rows;
  }

  /**
   * Tạo vé
   */
  static async createTicket(soVe, bookingId, maLich, giaVe, conn) {
    const connection = conn || db;
    await connection.query(
      `INSERT INTO Ve (So_ve, Ma_booking, Ma_lich, Gia_ve, Trang_thai_ve)
       VALUES (?, ?, ?, ?, 'Chua_su_dung')`,
      [soVe, bookingId, maLich, giaVe]
    );
  }

  /**
   * Lấy checkout theo booking
   */
  static async getCheckoutByBookingId(bookingId, conn) {
    const connection = conn || db;
    const [rows] = await connection.query(
      'SELECT ID_checkout FROM Checkout WHERE Ma_booking = ?',
      [bookingId]
    );
    return rows;
  }

  /**
   * Tạo checkout cho MoMo
   */
  static async createMoMoCheckout(checkoutId, bookingId, tongTien, conn) {
    const connection = conn || db;
    await connection.query(
      `INSERT INTO Checkout (ID_checkout, Ma_booking, Phuong_thuc_thanh_toan, Ngay_tra, So_tien, Trang_thai)
       VALUES (?, ?, 'MoMo', NOW(), ?, 'Thành công')`,
      [checkoutId, bookingId, tongTien]
    );
  }
}

module.exports = PaymentUtil;

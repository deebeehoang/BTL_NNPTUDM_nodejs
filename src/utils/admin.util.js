const db = require('./database');

class AdminUtil {
  // ==================== Dashboard Stats ====================

  static async getRevenueStats() {
    const [rows] = await db.query(`
      SELECT 
        COUNT(CASE 
          WHEN (b.Trang_thai_booking = 'Đã thanh toán' OR b.Trang_thai = 'Đã thanh toán')
          AND b.Trang_thai_booking NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy')
          AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy'))
          THEN 1 
        END) as total_orders,
        COALESCE(SUM(CASE 
          WHEN (b.Trang_thai_booking = 'Đã thanh toán' OR b.Trang_thai = 'Đã thanh toán')
          AND b.Trang_thai_booking NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy')
          AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy'))
          THEN b.Tong_tien 
          ELSE 0 
        END), 0) as total_revenue,
        COUNT(CASE 
          WHEN (b.Trang_thai_booking = 'Chờ thanh toán' OR b.Trang_thai = 'Chờ thanh toán')
          AND (b.Trang_thai_booking IS NULL OR b.Trang_thai_booking = 'Chờ thanh toán')
          AND (b.Trang_thai IS NULL OR b.Trang_thai = 'Chờ thanh toán')
          AND b.Trang_thai_booking NOT IN ('Đã thanh toán', 'Het_han', 'Da_huy', 'Hủy', 'Đã hủy', 'pending')
          AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Đã thanh toán', 'Het_han', 'Da_huy', 'Hủy', 'Đã hủy', 'pending'))
          THEN 1 
        END) as pending_orders,
        COUNT(CASE 
          WHEN (b.Trang_thai_booking = 'Đã thanh toán' OR b.Trang_thai = 'Đã thanh toán')
          AND b.Trang_thai_booking NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy')
          AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy'))
          THEN 1 
        END) as completed_orders
      FROM Booking b
      WHERE b.Ngay_dat >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
    `);
    return rows[0];
  }

  static async getTourStats() {
    const [rows] = await db.query(`
      SELECT 
        COUNT(*) as total_tours,
        SUM(CASE WHEN Tinh_trang = 'Còn chỗ' THEN 1 ELSE 0 END) as available_tours,
        SUM(CASE WHEN Tinh_trang = 'Hết chỗ' THEN 1 ELSE 0 END) as full_tours,
        SUM(CASE WHEN Tinh_trang = 'Sắp mở' THEN 1 ELSE 0 END) as upcoming_tours
      FROM Tour_du_lich
    `);
    return rows[0];
  }

  static async getTopCustomers() {
    const [rows] = await db.query(`
      SELECT 
        kh.Ten_khach_hang,
        COUNT(*) as total_bookings,
        COALESCE(SUM(b.Tong_tien), 0) as total_spent
      FROM Booking b
      JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
      WHERE (b.Trang_thai_booking = 'Đã thanh toán' OR b.Trang_thai = 'Đã thanh toán')
      AND b.Trang_thai_booking NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy')
      AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy'))
      GROUP BY kh.Ma_khach_hang, kh.Ten_khach_hang
      ORDER BY total_bookings DESC
      LIMIT 1
    `);
    return rows[0] || null;
  }

  static async getTopTours() {
    const [rows] = await db.query(`
      SELECT 
        t.Ten_tour,
        COUNT(*) as total_bookings,
        t.Tinh_trang as tour_status
      FROM Booking b
      JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
      JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
      JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
      WHERE (b.Trang_thai_booking = 'Đã thanh toán' OR b.Trang_thai = 'Đã thanh toán')
      AND b.Trang_thai_booking NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy')
      AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy'))
      GROUP BY t.Ma_tour, t.Ten_tour, t.Tinh_trang
      ORDER BY total_bookings DESC
      LIMIT 1
    `);
    return rows[0] || null;
  }

  // ==================== Customer Management ====================

  static async getAllCustomers() {
    const [rows] = await db.execute(
      `SELECT k.*, t.Email, t.Loai_tai_khoan
       FROM Khach_hang k
       JOIN Tai_khoan t ON k.Id_user = t.Id_user`
    );
    return rows;
  }

  static async getCustomerById(customerId) {
    const [rows] = await db.execute(
      `SELECT k.*, t.Email, t.Loai_tai_khoan
       FROM Khach_hang k
       JOIN Tai_khoan t ON k.Id_user = t.Id_user
       WHERE k.Ma_khach_hang = ?`,
      [customerId]
    );
    return rows[0] || null;
  }

  // ==================== Sales Report ====================

  static async getBookingsInDateRange(startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT b.*, k.Ten_khach_hang, t.Ten_tour
       FROM Booking b
       JOIN Khach_hang k ON b.Ma_khach_hang = k.Ma_khach_hang
       JOIN Chi_tiet_booking cb ON b.Ma_booking = cb.Ma_booking
       JOIN Lich_khoi_hanh l ON cb.Ma_lich = l.Ma_lich
       JOIN Tour_du_lich t ON l.Ma_tour = t.Ma_tour
       WHERE b.Ngay_dat BETWEEN ? AND ?
       ORDER BY b.Ngay_dat DESC`,
      [startDate, endDate]
    );
    return rows;
  }

  // ==================== Revenue ====================

  static async getMonthlyRevenue(year) {
    const [rows] = await db.query(
      `SELECT 
        MONTH(Ngay_lap) as month,
        SUM(Tong_tien) as revenue
      FROM Hoa_don
      WHERE YEAR(Ngay_lap) = ? 
        AND Trang_thai_hoa_don = 'Đã thanh toán'
      GROUP BY MONTH(Ngay_lap)
      ORDER BY month`,
      [year]
    );
    return rows;
  }

  static async getYearlyRevenue() {
    const [rows] = await db.query(`
      SELECT 
        YEAR(Ngay_lap) as year,
        SUM(Tong_tien) as revenue
      FROM Hoa_don
      WHERE Trang_thai_hoa_don = 'Đã thanh toán'
      GROUP BY YEAR(Ngay_lap)
      ORDER BY year DESC
      LIMIT 5
    `);
    return rows;
  }

  // ==================== Địa Danh (Destinations) ====================

  static async getAllDiaDanh() {
    const [rows] = await db.query('SELECT * FROM Dia_danh');
    return rows;
  }

  static async createDiaDanh({ ten_dia_danh, mo_ta, hinh_anh, tinh_thanh }) {
    const [result] = await db.query(
      'INSERT INTO Dia_danh (Ten_dia_danh, Mo_ta, Hinh_anh, Tinh_thanh) VALUES (?, ?, ?, ?)',
      [ten_dia_danh, mo_ta, hinh_anh, tinh_thanh]
    );
    return result;
  }

  static async updateDiaDanh(id, { ten_dia_danh, mo_ta, hinh_anh, tinh_thanh }) {
    const [result] = await db.query(
      'UPDATE Dia_danh SET Ten_dia_danh = ?, Mo_ta = ?, Hinh_anh = ?, Tinh_thanh = ? WHERE Ma_dia_danh = ?',
      [ten_dia_danh, mo_ta, hinh_anh, tinh_thanh, id]
    );
    return result;
  }

  static async deleteDiaDanh(id) {
    const [result] = await db.query('DELETE FROM Dia_danh WHERE Ma_dia_danh = ?', [id]);
    return result;
  }

  // ==================== Lịch Khởi Hành (Schedules) ====================

  static async getAllLichKhoiHanh() {
    const [rows] = await db.query(`
      SELECT lkh.*, t.Ten_tour 
      FROM Lich_khoi_hanh lkh
      JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
    `);
    return rows;
  }

  static async createLichKhoiHanh({ ma_tour, ngay_khoi_hanh, so_cho, ghi_chu }) {
    const [result] = await db.query(
      'INSERT INTO Lich_khoi_hanh (Ma_tour, Ngay_khoi_hanh, So_cho, Ghi_chu) VALUES (?, ?, ?, ?)',
      [ma_tour, ngay_khoi_hanh, so_cho, ghi_chu]
    );
    return result;
  }

  static async updateLichKhoiHanh(id, { ma_tour, ngay_khoi_hanh, so_cho, ghi_chu }) {
    const [result] = await db.query(
      'UPDATE Lich_khoi_hanh SET Ma_tour = ?, Ngay_khoi_hanh = ?, So_cho = ?, Ghi_chu = ? WHERE Ma_lich = ?',
      [ma_tour, ngay_khoi_hanh, so_cho, ghi_chu, id]
    );
    return result;
  }

  static async deleteLichKhoiHanh(id) {
    const [result] = await db.query('DELETE FROM Lich_khoi_hanh WHERE Ma_lich = ?', [id]);
    return result;
  }

  // ==================== Payment Management ====================

  static async getPendingPayments() {
    const [rows] = await db.query(`
      SELECT 
        b.Ma_booking,
        b.Ngay_dat,
        b.So_nguoi_lon,
        b.So_tre_em,
        b.Tong_tien,
        b.Trang_thai_booking,
        b.Trang_thai,
        b.Phuong_thuc_thanh_toan,
        b.Ngay_thanh_toan,
        kh.Ten_khach_hang,
        tk.Email,
        t.Ten_tour,
        lkh.Ngay_bat_dau,
        lkh.Ngay_ket_thuc,
        lkh.So_cho
      FROM Booking b
      JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
      JOIN Tai_khoan tk ON kh.Id_user = tk.Id_user
      JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
      JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
      JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
      WHERE (b.Trang_thai_booking = 'Chờ thanh toán' OR b.Trang_thai = 'Chờ thanh toán')
         OR (b.Trang_thai_booking = 'Chờ xác nhận' OR b.Trang_thai = 'Chờ xác nhận' OR b.Trang_thai_booking = 'Cho_xac_nhan')
         OR (b.Trang_thai_booking = 'Đã thanh toán' OR b.Trang_thai = 'Đã thanh toán')
         OR (b.Trang_thai_booking = 'Het_han' OR b.Trang_thai = 'Het_han')
      ORDER BY b.Ngay_dat DESC
    `);
    return rows;
  }

  static async confirmPayment(bookingId, phuongThucThanhToan) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Check booking exists and is pending
      const [bookings] = await connection.query(`
        SELECT 
          b.*,
          kh.Ten_khach_hang,
          t.Ten_tour,
          lkh.Ngay_bat_dau,
          lkh.Ngay_ket_thuc,
          lkh.So_cho
        FROM Booking b
        JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
        JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
        JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
        JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
        WHERE b.Ma_booking = ? 
          AND (b.Trang_thai_booking = 'Chờ thanh toán' OR b.Trang_thai = 'Chờ thanh toán')
      `, [bookingId]);

      if (bookings.length === 0) {
        await connection.rollback();
        return null;
      }

      const booking = bookings[0];

      // 2. Update booking status
      await connection.query(`
        UPDATE Booking 
        SET 
          Trang_thai_booking = 'Đã thanh toán',
          Trang_thai = 'Đã thanh toán',
          Phuong_thuc_thanh_toan = ?,
          Ngay_thanh_toan = NOW()
        WHERE Ma_booking = ?
      `, [phuongThucThanhToan, bookingId]);

      // 3. Create invoice
      const maHoaDon = `HD${Date.now().toString().slice(-8)}`;
      await connection.query(`
        INSERT INTO Hoa_don (Ma_hoa_don, Ma_booking, Ngay_lap, Tong_tien, Trang_thai_hoa_don)
        VALUES (?, ?, NOW(), ?, 'Đã thanh toán')
      `, [maHoaDon, bookingId, booking.Tong_tien]);

      // 4. Create tickets
      const soNguoiLon = parseInt(booking.So_nguoi_lon);
      const soTreEm = parseInt(booking.So_tre_em);

      const [tourInfo] = await connection.query(`
        SELECT Gia_nguoi_lon, Gia_tre_em 
        FROM Tour_du_lich t
        JOIN Lich_khoi_hanh lkh ON t.Ma_tour = lkh.Ma_tour
        JOIN Chi_tiet_booking ctb ON lkh.Ma_lich = ctb.Ma_lich
        WHERE ctb.Ma_booking = ?
      `, [bookingId]);

      const giaNguoiLon = parseFloat(tourInfo[0].Gia_nguoi_lon);
      const giaTreEm = parseFloat(tourInfo[0].Gia_tre_em);

      for (let i = 1; i <= soNguoiLon; i++) {
        const soVe = `VE${Date.now()}${i}`;
        await connection.query(`
          INSERT INTO Ve (So_ve, Ma_booking, Ma_lich, Gia_ve, Trang_thai_ve)
          SELECT ?, ?, ctb.Ma_lich, ?, 'Chua_su_dung'
          FROM Chi_tiet_booking ctb
          WHERE ctb.Ma_booking = ?
        `, [soVe, bookingId, giaNguoiLon, bookingId]);
      }

      for (let i = 1; i <= soTreEm; i++) {
        const soVe = `VE${Date.now()}${soNguoiLon + i}`;
        await connection.query(`
          INSERT INTO Ve (So_ve, Ma_booking, Ma_lich, Gia_ve, Trang_thai_ve)
          SELECT ?, ?, ctb.Ma_lich, ?, 'Chua_su_dung'
          FROM Chi_tiet_booking ctb
          WHERE ctb.Ma_booking = ?
        `, [soVe, bookingId, giaTreEm, bookingId]);
      }

      // 5. Create checkout record
      const checkoutId = `CO${Date.now().toString().slice(-8)}`;
      await connection.query(`
        INSERT INTO Checkout (ID_checkout, Ma_booking, Phuong_thuc_thanh_toan, Ngay_tra, So_tien, Trang_thai)
        VALUES (?, ?, ?, NOW(), ?, 'Thành công')
      `, [checkoutId, bookingId, phuongThucThanhToan, booking.Tong_tien]);

      await connection.commit();

      // 6. Get updated booking info
      const [updatedBooking] = await connection.query(`
        SELECT 
          b.*,
          kh.Ten_khach_hang,
          t.Ten_tour,
          lkh.Ngay_bat_dau,
          lkh.Ngay_ket_thuc,
          hd.Ma_hoa_don,
          hd.Ngay_lap as Ngay_lap_hoa_don
        FROM Booking b
        JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
        JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
        JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
        JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
        JOIN Hoa_don hd ON b.Ma_booking = hd.Ma_booking
        WHERE b.Ma_booking = ?
      `, [bookingId]);

      // 7. Get created tickets
      const [veList] = await connection.query(`
        SELECT So_ve, Gia_ve, Trang_thai_ve
        FROM Ve
        WHERE Ma_booking = ?
        ORDER BY So_ve
      `, [bookingId]);

      return {
        booking: updatedBooking[0],
        hoaDon: { maHoaDon, tongTien: booking.Tong_tien },
        veList,
        checkoutId,
        soNguoiLon,
        soTreEm,
        tongTien: booking.Tong_tien
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // ==================== Booking Detail for Payment ====================

  static async getBookingForPaymentConfirmation(bookingId) {
    const [bookings] = await db.query(`
      SELECT 
        b.*,
        kh.Ten_khach_hang,
        tk.Email,
        kh.Dia_chi,
        kh.Cccd,
        t.Ten_tour,
        t.Gia_nguoi_lon,
        t.Gia_tre_em,
        lkh.Ngay_bat_dau,
        lkh.Ngay_ket_thuc,
        lkh.So_cho,
        km.Ten_km as Ten_khuyen_mai,
        km.Gia_tri as Gia_tri_khuyen_mai
      FROM Booking b
      JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
      JOIN Tai_khoan tk ON kh.Id_user = tk.Id_user
      JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
      JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
      JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
      LEFT JOIN Khuyen_mai km ON b.Ma_khuyen_mai = km.Ma_km
      WHERE b.Ma_booking = ?
    `, [bookingId]);

    if (bookings.length === 0) return null;

    const booking = bookings[0];

    const [services] = await db.query(`
      SELECT 
        dv.Ten_dich_vu,
        dv.Gia,
        ctdv.So_luong,
        ctdv.Thanh_tien
      FROM Chi_tiet_dich_vu ctdv
      JOIN Dich_vu dv ON ctdv.Ma_dich_vu = dv.Ma_dich_vu
      WHERE ctdv.Ma_booking = ?
    `, [bookingId]);

    return { booking, services };
  }
}

module.exports = AdminUtil;

const pool = require('./database');

class PromotionUtil {
  static async ensureTourKhuyenMaiTable() {
    await pool.query(`CREATE TABLE IF NOT EXISTS Tour_KhuyenMai (
      Ma_tour VARCHAR(50) NOT NULL,
      Ma_km VARCHAR(50) NOT NULL,
      PRIMARY KEY (Ma_tour, Ma_km),
      FOREIGN KEY (Ma_tour) REFERENCES Tour_du_lich(Ma_tour),
      FOREIGN KEY (Ma_km) REFERENCES khuyen_mai(Ma_km)
    )`);
  }

  static async getAllForAdmin() {
    await this.ensureTourKhuyenMaiTable();
    const [rows] = await pool.query(`
      SELECT km.*, 
             COUNT(tk.Ma_tour) as so_tour_ap_dung,
             GROUP_CONCAT(tk.Ma_tour) as danh_sach_tour
      FROM khuyen_mai km
      LEFT JOIN Tour_KhuyenMai tk ON km.Ma_km = tk.Ma_km
      GROUP BY km.Ma_km
      ORDER BY km.Ngay_bat_dau DESC
    `);
    return rows;
  }

  static async getStats() {
    await this.ensureTourKhuyenMaiTable();
    const [usageStats] = await pool.query(`
      SELECT 
        km.Ma_km, km.Ten_km, km.Gia_tri,
        COUNT(b.Ma_booking) as so_luot_su_dung,
        COALESCE(SUM(b.Tong_tien), 0) as tong_doanh_thu,
        COALESCE(SUM(b.Tong_tien * km.Gia_tri / 100), 0) as tong_giam_gia
      FROM khuyen_mai km
      LEFT JOIN Booking b ON b.Ma_khuyen_mai = km.Ma_km
      GROUP BY km.Ma_km
    `);
    const [totalStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT km.Ma_km) as tong_so_km,
        COUNT(DISTINCT b.Ma_booking) as tong_so_booking,
        COALESCE(SUM(b.Tong_tien), 0) as tong_doanh_thu,
        COALESCE(SUM(b.Tong_tien * km.Gia_tri / 100), 0) as tong_giam_gia
      FROM khuyen_mai km
      LEFT JOIN Booking b ON b.Ma_khuyen_mai = km.Ma_km
    `);
    return { usageStats, totalStats: totalStats[0] };
  }

  static async createOrUpdateGlobal({ Ma_km, Ten_km, Mo_ta, Gia_tri, Ngay_bat_dau, Ngay_ket_thuc }) {
    const code = Ma_km || 'GLOBAL_PERCENT';
    const [upd] = await pool.query(
      `UPDATE khuyen_mai SET Ten_km=?, Mo_ta=?, Gia_tri=?, Ngay_bat_dau=?, Ngay_ket_thuc=? WHERE Ma_km=?`,
      [Ten_km || 'Giảm giá toàn site', Mo_ta || 'Giảm theo % toàn site', Gia_tri, Ngay_bat_dau || null, Ngay_ket_thuc || null, code]
    );
    if (upd.affectedRows === 0) {
      await pool.query(
        `INSERT INTO khuyen_mai (Ma_km, Ten_km, Mo_ta, Gia_tri, Ngay_bat_dau, Ngay_ket_thuc) VALUES (?, ?, ?, ?, ?, ?)`,
        [code, Ten_km || 'Giảm giá toàn site', Mo_ta || 'Giảm theo % toàn site', Gia_tri, Ngay_bat_dau || null, Ngay_ket_thuc || null]
      );
    }
  }

  static async createOrUpdateCoupon({ Ma_km, Ten_km, Mo_ta, Gia_tri, Ngay_bat_dau, Ngay_ket_thuc }) {
    const [upd] = await pool.query(
      `UPDATE khuyen_mai SET Ten_km=?, Mo_ta=?, Gia_tri=?, Ngay_bat_dau=?, Ngay_ket_thuc=? WHERE Ma_km=?`,
      [Ten_km || Ma_km, Mo_ta || 'Coupon giảm theo %', Gia_tri, Ngay_bat_dau || null, Ngay_ket_thuc || null, Ma_km]
    );
    if (upd.affectedRows === 0) {
      await pool.query(
        `INSERT INTO khuyen_mai (Ma_km, Ten_km, Mo_ta, Gia_tri, Ngay_bat_dau, Ngay_ket_thuc) VALUES (?, ?, ?, ?, ?, ?)`,
        [Ma_km, Ten_km || Ma_km, Mo_ta || 'Coupon giảm theo %', Gia_tri, Ngay_bat_dau || null, Ngay_ket_thuc || null]
      );
    }
  }

  static async updatePromotion(ma_km, { Ten_km, Mo_ta, Gia_tri, Ngay_bat_dau, Ngay_ket_thuc }) {
    const [result] = await pool.query(
      `UPDATE khuyen_mai SET Ten_km=?, Mo_ta=?, Gia_tri=?, Ngay_bat_dau=?, Ngay_ket_thuc=? WHERE Ma_km=?`,
      [Ten_km, Mo_ta, Gia_tri, Ngay_bat_dau, Ngay_ket_thuc, ma_km]
    );
    return result;
  }

  static async deletePromotion(ma_km) {
    const [bookings] = await pool.query(
      `SELECT COUNT(*) as count FROM Booking WHERE Ma_khuyen_mai = ?`, [ma_km]
    );
    if (bookings[0].count > 0) {
      throw new Error('Không thể xóa khuyến mãi đã được sử dụng trong đơn hàng. Vui lòng ẩn thay vì xóa.');
    }
    await this.ensureTourKhuyenMaiTable();
    await pool.query(`DELETE FROM Tour_KhuyenMai WHERE Ma_km = ?`, [ma_km]);
    const [result] = await pool.query(`DELETE FROM khuyen_mai WHERE Ma_km = ?`, [ma_km]);
    return result;
  }

  static async hidePromotion(ma_km) {
    const [result] = await pool.query(
      `UPDATE khuyen_mai SET Ngay_ket_thuc = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE Ma_km = ?`, [ma_km]
    );
    return result;
  }

  static async attachToTour(Ma_tour, Ma_km) {
    const [tourExists] = await pool.query('SELECT Ma_tour FROM Tour_du_lich WHERE Ma_tour = ?', [Ma_tour]);
    if (tourExists.length === 0) throw new Error(`Tour ${Ma_tour} không tồn tại`);

    const [couponExists] = await pool.query('SELECT Ma_km FROM khuyen_mai WHERE Ma_km = ?', [Ma_km]);
    if (couponExists.length === 0) throw new Error(`Coupon ${Ma_km} không tồn tại`);

    await this.ensureTourKhuyenMaiTable();
    await pool.query(`REPLACE INTO Tour_KhuyenMai (Ma_tour, Ma_km) VALUES (?, ?)`, [Ma_tour, Ma_km]);
  }

  static async detachFromTour(Ma_tour, Ma_km) {
    await this.ensureTourKhuyenMaiTable();
    const [result] = await pool.query(
      `DELETE FROM Tour_KhuyenMai WHERE Ma_tour = ? AND Ma_km = ?`, [Ma_tour, Ma_km]
    );
    return result;
  }

  static async getActiveForCustomer() {
    await this.ensureTourKhuyenMaiTable();
    const [rows] = await pool.query(`
      SELECT km.*, 
             GROUP_CONCAT(t.Ten_tour) as danh_sach_tour,
             CASE 
               WHEN km.Ma_km = 'GLOBAL_PERCENT' THEN 'Toàn site'
               ELSE 'Tour cụ thể'
             END as loai_ap_dung
      FROM khuyen_mai km
      LEFT JOIN Tour_KhuyenMai tk ON km.Ma_km = tk.Ma_km
      LEFT JOIN Tour_du_lich t ON tk.Ma_tour = t.Ma_tour
      WHERE (km.Ngay_bat_dau IS NULL OR km.Ngay_bat_dau <= NOW())
        AND (km.Ngay_ket_thuc IS NULL OR km.Ngay_ket_thuc >= NOW())
      GROUP BY km.Ma_km
      ORDER BY km.Gia_tri DESC
    `);
    return rows;
  }

  static async validateCoupon(ma_km) {
    const [rows] = await pool.query(`
      SELECT km.*, 
             CASE 
               WHEN km.Ma_km = 'GLOBAL_PERCENT' THEN 'Toàn site'
               ELSE 'Tour cụ thể'
             END as loai_ap_dung
      FROM khuyen_mai km
      WHERE km.Ma_km = ?
        AND (km.Ngay_bat_dau IS NULL OR km.Ngay_bat_dau <= NOW())
        AND (km.Ngay_ket_thuc IS NULL OR km.Ngay_ket_thuc >= NOW())
    `, [ma_km]);
    return rows[0] || null;
  }

  static async getApplicableForTour(ma_tour) {
    await this.ensureTourKhuyenMaiTable();
    const [globalRows] = await pool.query(`
      SELECT * FROM khuyen_mai 
      WHERE Ma_km = 'GLOBAL_PERCENT'
        AND (Ngay_bat_dau IS NULL OR Ngay_bat_dau <= NOW())
        AND (Ngay_ket_thuc IS NULL OR Ngay_ket_thuc >= NOW())
    `);
    const [tourKm] = await pool.query(`
      SELECT km.* FROM Tour_KhuyenMai tk 
      JOIN khuyen_mai km ON tk.Ma_km = km.Ma_km 
      WHERE tk.Ma_tour = ?
        AND (km.Ngay_bat_dau IS NULL OR km.Ngay_bat_dau <= NOW())
        AND (km.Ngay_ket_thuc IS NULL OR km.Ngay_ket_thuc >= NOW())
    `, [ma_tour]);
    return { global: globalRows[0] || null, coupon: tourKm[0] || null };
  }
}

module.exports = PromotionUtil;

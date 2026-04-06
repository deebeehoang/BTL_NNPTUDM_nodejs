const db = require('./database');

class RatingUtil {
  /**
   * Xóa tất cả đánh giá của tour
   */
  static async deleteRatingsByTourId(tourId) {
    const [result] = await db.query(
      'DELETE FROM danh_gia WHERE Ma_tour = ?',
      [tourId]
    );
    return result.affectedRows;
  }

  /**
   * Lấy thống kê tổng quan đánh giá
   */
  static async getOverallStats() {
    const [rows] = await db.query(
      `SELECT 
        COUNT(*) as total_ratings,
        AVG(So_sao) as average_rating,
        COUNT(CASE WHEN So_sao = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN So_sao = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN So_sao = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN So_sao = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN So_sao = 1 THEN 1 END) as one_star
       FROM danh_gia`
    );
    return rows[0];
  }

  /**
   * Lấy top tour được đánh giá cao nhất
   */
  static async getTopRatedTours(limit = 10) {
    const [rows] = await db.query(
      `SELECT 
        t.Ma_tour,
        t.Ten_tour,
        t.Diem_danh_gia_trung_binh,
        t.So_luong_danh_gia
       FROM Tour_du_lich t
       WHERE t.So_luong_danh_gia > 0
       ORDER BY t.Diem_danh_gia_trung_binh DESC, t.So_luong_danh_gia DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }
}

module.exports = RatingUtil;

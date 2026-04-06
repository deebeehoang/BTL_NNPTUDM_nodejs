const db = require('./database');

class GuideUtil {
  static async findUserAccount(userId, role = 'Huong_dan_vien') {
    const [rows] = await db.query(
      'SELECT * FROM tai_khoan WHERE Id_user = ? AND Loai_tai_khoan = ?',
      [userId, role]
    );
    return rows[0] || null;
  }

  static async getScheduleGuide(maLich) {
    const [rows] = await db.query(
      'SELECT Ma_huong_dan_vien FROM Lich_khoi_hanh WHERE Ma_lich = ?',
      [maLich]
    );
    return rows[0] || null;
  }

  static async getCertificateById(maChungChi) {
    const [rows] = await db.query(
      'SELECT * FROM chung_chi_huong_dan_vien WHERE Ma_chung_chi = ?',
      [maChungChi]
    );
    return rows[0] || null;
  }

  // ==================== Admin Guide Management ====================

  static async createGuideWithAccount({ id_user, email, hashedPassword, ma_huong_dan_vien, ten_huong_dan_vien, ngay_sinh, gioi_tinh, dia_chi, so_dien_thoai, cccd, ngon_ngu, kinh_nghiem, chung_chi, anh_dai_dien, trang_thai }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        'INSERT INTO tai_khoan (Id_user, Password, Email, Loai_tai_khoan) VALUES (?, ?, ?, ?)',
        [id_user, hashedPassword, email, 'Huong_dan_vien']
      );

      await connection.query(
        `INSERT INTO huong_dan_vien (
          Ma_huong_dan_vien, Id_user, Ten_huong_dan_vien, Ngay_sinh, 
          Gioi_tinh, Dia_chi, So_dien_thoai, Cccd, Ngon_ngu, 
          Kinh_nghiem, Chung_chi, Anh_dai_dien, Trang_thai, Ngay_tham_gia
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ma_huong_dan_vien, id_user, ten_huong_dan_vien, ngay_sinh,
          gioi_tinh, dia_chi || null, so_dien_thoai, cccd,
          ngon_ngu || null, kinh_nghiem || null, chung_chi || null,
          anh_dai_dien || null, trang_thai, new Date()
        ]
      );

      await connection.commit();
      return { id_user, ma_huong_dan_vien };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async hasUpcomingSchedules(maHuongDanVien) {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM lich_khoi_hanh WHERE Ma_huong_dan_vien = ? AND Ngay_ket_thuc >= CURDATE()',
      [maHuongDanVien]
    );
    return rows[0].count > 0;
  }

  static async getScheduleById(maLich) {
    const [rows] = await db.query(
      'SELECT * FROM Lich_khoi_hanh WHERE Ma_lich = ?',
      [maLich]
    );
    return rows[0] || null;
  }

  static async removeGuideFromSchedule(maLich) {
    await db.query(
      'UPDATE Lich_khoi_hanh SET Ma_huong_dan_vien = NULL WHERE Ma_lich = ?',
      [maLich]
    );
  }

  static async getConflictingSchedules(maHuongDanVien, excludeMaLich, ngayBatDau, ngayKetThuc) {
    const [rows] = await db.query(
      `SELECT Ma_lich, Ngay_bat_dau, Ngay_ket_thuc, Ma_tour
       FROM Lich_khoi_hanh
       WHERE Ma_huong_dan_vien = ?
         AND Ma_lich != ?
         AND (
           (Ngay_bat_dau >= ? AND Ngay_bat_dau <= ?)
           OR (Ngay_ket_thuc >= ? AND Ngay_ket_thuc <= ?)
           OR (Ngay_bat_dau <= ? AND Ngay_ket_thuc >= ?)
         )
       LIMIT 1`,
      [maHuongDanVien, excludeMaLich, ngayBatDau, ngayKetThuc, ngayBatDau, ngayKetThuc, ngayBatDau, ngayKetThuc]
    );
    return rows;
  }

  static async assignGuideToSchedule(maLich, maHuongDanVien) {
    await db.query(
      'UPDATE Lich_khoi_hanh SET Ma_huong_dan_vien = ? WHERE Ma_lich = ?',
      [maHuongDanVien, maLich]
    );
  }
}

module.exports = GuideUtil;

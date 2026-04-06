const pool = require('./database');

class TourUtil {
  static async getTableColumns(tableName) {
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ?`,
      [tableName]
    );
    return columns.map(col => col.COLUMN_NAME);
  }

  static async getTableStructure(tableName) {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);
    return columns;
  }

  static async getAllTours({ search, tourType, limit, page }) {
    const columnNames = await TourUtil.getTableColumns('Tour_du_lich');
    const hasDiemDanhGia = columnNames.includes('Diem_danh_gia_trung_binh');
    const hasSoLuongDanhGia = columnNames.includes('So_luong_danh_gia');

    const ratingFields = [
      hasDiemDanhGia
        ? 'COALESCE(t.Diem_danh_gia_trung_binh, 0) as Diem_danh_gia_trung_binh'
        : '0 as Diem_danh_gia_trung_binh',
      hasSoLuongDanhGia
        ? 'COALESCE(t.So_luong_danh_gia, 0) as So_luong_danh_gia'
        : '0 as So_luong_danh_gia'
    ];

    let sql = `
      SELECT t.*, d.Mo_ta,
             ${ratingFields.join(',\n             ')}
      FROM Tour_du_lich t
      LEFT JOIN Chi_tiet_tour_dia_danh ctd ON t.Ma_tour = ctd.Ma_tour AND ctd.Thu_tu = 1
      LEFT JOIN Dia_danh d ON ctd.Ma_dia_danh = d.Ma_dia_danh
    `;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('t.Ten_tour COLLATE utf8mb4_general_ci LIKE ?');
      params.push(`%${search}%`);
    }
    if (tourType) {
      conditions.push('t.Loai_tour = ?');
      params.push(tourType);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const perPage = limit ? parseInt(limit) : 12;
    const currentPage = page ? parseInt(page) : 1;
    const offset = (currentPage - 1) * perPage;

    if (!isNaN(perPage) && perPage > 0) {
      sql += ` LIMIT ${perPage} OFFSET ${offset}`;
    }

    let countSql = sql.replace(/SELECT[\s\S]*?FROM/i, 'SELECT COUNT(*) as total FROM');
    countSql = countSql.replace(/ORDER BY[\s\S]*$/i, '');
    countSql = countSql.replace(/LIMIT[\s\S]*$/i, '');
    const [countResult] = await pool.query(countSql, params);
    const totalTours = countResult[0]?.total || 0;

    const [rows] = await pool.query(sql, params);

    return { rows, totalTours, currentPage, perPage };
  }

  static async getTourWithDescription(tourId) {
    const [rows] = await pool.query(
      `SELECT t.*, d.Mo_ta 
       FROM tour_du_lich t
       LEFT JOIN chi_tiet_tour_dia_danh ctd ON t.Ma_tour = ctd.Ma_tour AND ctd.Thu_tu = 1
       LEFT JOIN dia_danh d ON ctd.Ma_dia_danh = d.Ma_dia_danh
       WHERE t.Ma_tour = ?`,
      [tourId]
    );
    if (rows.length === 0) return null;
    if (!rows[0].Mo_ta) rows[0].Mo_ta = 'Đang cập nhật mô tả...';
    return rows[0];
  }

  static async searchTours({ search, minPrice, maxPrice, destination, type, sort }) {
    const conditions = [];
    const params = [];

    if (search) { conditions.push('Ten_tour LIKE ?'); params.push(`%${search}%`); }
    if (minPrice) { conditions.push('Gia_nguoi_lon >= ?'); params.push(minPrice); }
    if (maxPrice) { conditions.push('Gia_nguoi_lon <= ?'); params.push(maxPrice); }
    if (destination) { conditions.push('Diem_den = ?'); params.push(destination); }
    if (type) { conditions.push('Loai_tour = ?'); params.push(type); }

    let query = 'SELECT * FROM tour_du_lich';
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

    const sortMap = {
      price_asc: 'Gia_nguoi_lon ASC',
      price_desc: 'Gia_nguoi_lon DESC',
      duration_asc: 'So_ngay ASC',
      duration_desc: 'So_ngay DESC'
    };
    query += ' ORDER BY ' + (sortMap[sort] || 'Ma_tour DESC');

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getAllToursFromDatabase() {
    const [rows] = await pool.query('SELECT * FROM tour_du_lich');
    return rows;
  }

  static async getPopularTours(limit) {
    const [rows] = await pool.query(
      `SELECT t.*, d.Mo_ta 
       FROM tour_du_lich t
       LEFT JOIN chi_tiet_tour_dia_danh ctd ON t.Ma_tour = ctd.Ma_tour AND ctd.Thu_tu = 1
       LEFT JOIN dia_danh d ON ctd.Ma_dia_danh = d.Ma_dia_danh
       WHERE t.Tinh_trang = "Còn chỗ" 
       ORDER BY t.Gia_nguoi_lon 
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

  static async getAvailableSchedules(isAdmin) {
    const columnNames = await TourUtil.getTableColumns('Lich_khoi_hanh');
    const hasTrangThai = columnNames.includes('Trang_thai');

    let query;
    if (hasTrangThai) {
      if (isAdmin) {
        query = `
          SELECT l.*, t.Ten_tour, t.Tinh_trang as TrangThaiTour
          FROM Lich_khoi_hanh l
          LEFT JOIN tour_du_lich t ON l.Ma_tour = t.Ma_tour
          WHERE (t.Tinh_trang != 'Đã hủy' OR t.Tinh_trang IS NULL)
          ORDER BY l.Ngay_bat_dau ASC
        `;
      } else {
        query = `
          SELECT l.*, t.Ten_tour, t.Tinh_trang as TrangThaiTour
          FROM Lich_khoi_hanh l
          LEFT JOIN tour_du_lich t ON l.Ma_tour = t.Ma_tour
          WHERE (t.Tinh_trang != 'Đã hủy' OR t.Tinh_trang IS NULL)
            AND (l.Trang_thai IS NULL OR l.Trang_thai != 'Đã diễn ra')
          ORDER BY l.Ngay_bat_dau ASC
        `;
      }
    } else {
      query = `
        SELECT l.*, t.Ten_tour, t.Tinh_trang as TrangThaiTour
        FROM Lich_khoi_hanh l
        LEFT JOIN tour_du_lich t ON l.Ma_tour = t.Ma_tour
        WHERE (t.Tinh_trang != 'Đã hủy' OR t.Tinh_trang IS NULL)
          AND (l.Ngay_ket_thuc >= CURDATE())
        ORDER BY l.Ngay_bat_dau ASC
      `;
    }

    const [rows] = await pool.query(query);
    return rows;
  }

  static async getTourDirectFromTable(tourId) {
    const [rows] = await pool.query(
      'SELECT * FROM tour_du_lich WHERE Ma_tour = ?',
      [tourId]
    );
    return rows[0] || null;
  }

  static async getToursByDestination(destinationId) {
    const [rows] = await pool.query(
      `SELECT t.* FROM tour_du_lich t
       JOIN chi_tiet_tour_dia_danh ctd ON t.Ma_tour = ctd.Ma_tour
       WHERE ctd.Ma_dia_danh = ?`,
      [destinationId]
    );
    return rows;
  }

  /**
   * Lấy thông tin lịch khởi hành (Ma_tour, Ngay_bat_dau, Ngay_ket_thuc)
   */
  static async getScheduleInfo(maLich) {
    const [rows] = await pool.query(
      'SELECT Ma_tour, Ngay_bat_dau, Ngay_ket_thuc FROM Lich_khoi_hanh WHERE Ma_lich = ?',
      [maLich]
    );
    return rows[0] || null;
  }
}

module.exports = TourUtil;

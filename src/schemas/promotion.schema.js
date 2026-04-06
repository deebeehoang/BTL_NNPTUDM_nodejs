const pool = require('../utils/database');

/**
 * Promotion Model
 */
class Promotion {
  /**
   * Get all promotions
   * @returns {Array} - List of all promotions
   */
  static async getAll() {
    const [rows] = await pool.query(
      'SELECT * FROM khuyen_mai'
    );
    return rows;
  }

  /**
   * Get a promotion by code
   * @param {string} code - Promotion code
   * @returns {Object|null} - Promotion data or null if not found
   */
  static async getByCode(code) {
    const [rows] = await pool.query(
      'SELECT * FROM khuyen_mai WHERE Ma_km = ?',
      [code]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  }

  /**
   * Create a new promotion
   * @param {Object} promotionData - Promotion data
   * @returns {Object} - Newly created promotion
   */
  static async create(promotionData) {
    const {
      Ma_km,
      Ten_km,
      Mo_ta,
      Gia_tri,
      Ngay_bat_dau,
      Ngay_ket_thuc
    } = promotionData;

    const query = `
      INSERT INTO khuyen_mai (
        Ma_km,
        Ten_km,
        Mo_ta,
        Gia_tri,
        Ngay_bat_dau,
        Ngay_ket_thuc
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      Ma_km,
      Ten_km,
      Mo_ta,
      Gia_tri,
      Ngay_bat_dau,
      Ngay_ket_thuc
    ];

    const [result] = await pool.query(query, values);
    return result;
  }

  /**
   * Update a promotion
   * @param {string} code - Promotion code
   * @param {Object} promotionData - Updated promotion data
   * @returns {Object} - Updated promotion
   */
  static async update(code, promotionData) {
    const {
      Ten_km,
      Mo_ta,
      Gia_tri,
      Ngay_bat_dau,
      Ngay_ket_thuc
    } = promotionData;

    const query = `
      UPDATE khuyen_mai
      SET Ten_km = ?,
          Mo_ta = ?,
          Gia_tri = ?,
          Ngay_bat_dau = ?,
          Ngay_ket_thuc = ?
      WHERE Ma_km = ?
    `;

    const values = [
      Ten_km,
      Mo_ta,
      Gia_tri,
      Ngay_bat_dau,
      Ngay_ket_thuc,
      code
    ];

    await pool.query(query, values);
    
    const [rows] = await pool.query(
      'SELECT * FROM khuyen_mai WHERE Ma_km = ?',
      [code]
    );
    
    return rows[0];
  }

  /**
   * Delete a promotion
   * @param {string} code - Promotion code
   * @returns {boolean} - Success status
   */
  static async delete(code) {
    const [result] = await pool.query(
      'DELETE FROM khuyen_mai WHERE Ma_km = ?',
      [code]
    );
    
    return result.affectedRows > 0;
  }
}

module.exports = Promotion; 
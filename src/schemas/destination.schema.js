const pool = require('../utils/database');

/**
 * Destination Model
 */
class Destination {
  /**
   * Get all destinations
   * @returns {Array} - List of all destinations
   */
  static async getAll() {
    const [rows] = await pool.query(
      'SELECT * FROM dia_danh'
    );
    return rows;
  }

  /**
   * Get a destination by ID
   * @param {string} id - Destination ID
   * @returns {Object|null} - Destination data or null if not found
   */
  static async getById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM dia_danh WHERE Ma_dia_danh = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  }

  /**
   * Create a new destination
   * @param {Object} destinationData - Destination data
   * @returns {Object} - Newly created destination
   */
  static async create(destinationData) {
    const { ma_dia_danh, ten_dia_danh, mo_ta, hinh_anh } = destinationData;
    
    await pool.query(
      'INSERT INTO dia_danh (Ma_dia_danh, Ten_dia_danh, Mo_ta, Hinh_anh) VALUES (?, ?, ?, ?)',
      [ma_dia_danh, ten_dia_danh, mo_ta, hinh_anh || null]
    );
    
    return await this.getById(ma_dia_danh);
  }

  /**
   * Update a destination
   * @param {string} id - Destination ID
   * @param {Object} destinationData - Updated destination data
   * @returns {Object} - Updated destination
   */
  static async update(id, destinationData) {
    const { ten_dia_danh, mo_ta, hinh_anh } = destinationData;
    
    // If image is not provided, don't update it
    if (hinh_anh) {
      await pool.query(
        'UPDATE dia_danh SET Ten_dia_danh = ?, Mo_ta = ?, Hinh_anh = ? WHERE Ma_dia_danh = ?',
        [ten_dia_danh, mo_ta, hinh_anh, id]
      );
    } else {
      await pool.query(
        'UPDATE dia_danh SET Ten_dia_danh = ?, Mo_ta = ? WHERE Ma_dia_danh = ?',
        [ten_dia_danh, mo_ta, id]
      );
    }
    
    return await this.getById(id);
  }

  /**
   * Delete a destination
   * @param {string} id - Destination ID
   * @returns {boolean} - Success status
   */
  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM dia_danh WHERE Ma_dia_danh = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Search destinations by name
   * @param {string} keyword - Search keyword
   * @returns {Array} - Search results
   */
  static async searchByName(keyword) {
    const [rows] = await pool.query(
      'SELECT * FROM dia_danh WHERE Ten_dia_danh LIKE ?',
      [`%${keyword}%`]
    );
    
    return rows;
  }

  /**
   * Get tours that include a specific destination
   * @param {string} destinationId - Destination ID
   * @returns {Array} - List of tours
   */
  static async getToursWithDestination(destinationId) {
    const [rows] = await pool.query(
      `SELECT t.* 
       FROM Tour_du_lich t
       JOIN chi_tiet_tour_dia_danh ct ON t.Ma_tour = ct.Ma_tour
       WHERE ct.Ma_dia_danh = ?`,
      [destinationId]
    );
    
    return rows;
  }

  /**
   * Get available tours for adding destination
   * @returns {Array} - List of all available tours 
   */
  static async getAvailableTours() {
    const [rows] = await pool.query(
      'SELECT Ma_tour, Ten_tour FROM Tour_du_lich WHERE Tinh_trang != "Hủy"'
    );
    return rows;
  }

  /**
   * Get tour destinations with order information
   * @param {string} tourId - Tour ID
   * @returns {Array} - List of destinations for the tour with their order
   */
  static async getTourDestinationsWithOrder(tourId) {
    const [rows] = await pool.query(
      `SELECT d.*, ct.Thu_tu
       FROM dia_danh d
       JOIN chi_tiet_tour_dia_danh ct ON d.Ma_dia_danh = ct.Ma_dia_danh
       WHERE ct.Ma_tour = ?
       ORDER BY ct.Thu_tu`,
      [tourId]
    );
    
    return rows;
  }

  /**
   * Add a destination to a tour
   * @param {string} tourId - Tour ID
   * @param {string} destinationId - Destination ID
   * @param {number} order - Order in the tour
   * @returns {boolean} - Success status
   */
  static async addDestinationToTour(tourId, destinationId, order) {
    const [result] = await pool.query(
      'INSERT INTO chi_tiet_tour_dia_danh (Ma_tour, Ma_dia_danh, Thu_tu) VALUES (?, ?, ?)',
      [tourId, destinationId, order]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Update destination order in a tour
   * @param {string} tourId - Tour ID
   * @param {string} destinationId - Destination ID
   * @param {number} newOrder - New order in the tour
   * @returns {boolean} - Success status
   */
  static async updateDestinationOrder(tourId, destinationId, newOrder) {
    const [result] = await pool.query(
      'UPDATE chi_tiet_tour_dia_danh SET Thu_tu = ? WHERE Ma_tour = ? AND Ma_dia_danh = ?',
      [newOrder, tourId, destinationId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Remove a destination from a tour
   * @param {string} tourId - Tour ID
   * @param {string} destinationId - Destination ID
   * @returns {boolean} - Success status
   */
  static async removeDestinationFromTour(tourId, destinationId) {
    const [result] = await pool.query(
      'DELETE FROM chi_tiet_tour_dia_danh WHERE Ma_tour = ? AND Ma_dia_danh = ?',
      [tourId, destinationId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get popular destinations
   * @param {number} limit - Number of popular destinations to get
   * @returns {Array} - Array of popular destination objects
   */
  static async getPopularDestinations(limit = 5) {
    try {
      console.log(`Getting ${limit} popular destinations`);
      
      // Truy vấn cơ sở dữ liệu để lấy các địa điểm phổ biến
      const [rows] = await pool.query(
        `SELECT d.* 
         FROM dia_danh d
         LEFT JOIN chi_tiet_tour_dia_danh ctd ON d.Ma_dia_danh = ctd.Ma_dia_danh
         GROUP BY d.Ma_dia_danh
         ORDER BY COUNT(ctd.Ma_tour) DESC
         LIMIT ?`,
        [limit]
      );
      
      console.log(`Found ${rows.length} popular destinations`);
      
      if (rows.length === 0) {
        // Nếu không có kết quả, lấy các địa điểm bất kỳ
        console.log('No popular destinations found, fetching random destinations');
        const [alternateRows] = await pool.query(
          'SELECT * FROM dia_danh ORDER BY RAND() LIMIT ?',
          [limit]
        );
        return alternateRows;
      }
      
      return rows;
    } catch (error) {
      console.error('Error in getPopularDestinations:', error);
      return []; // Trả về mảng rỗng nếu có lỗi
    }
  }
}

module.exports = Destination;
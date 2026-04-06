const pool = require('../utils/database');

/**
 * Service Model
 */
class Service {
  /**
   * Get all services
   * @returns {Array} - List of all services
   */
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM Dich_vu');
    return rows;
  }

  /**
   * Get a service by ID
   * @param {string} id - Service ID
   * @returns {Object|null} - Service data or null if not found
   */
  static async getById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM Dich_vu WHERE Ma_dich_vu = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create a new service
   * @param {Object} serviceData - Service data
   * @returns {Object} - Newly created service
   */
  static async create(serviceData) {
    const { ma_dich_vu, ten_dich_vu, mo_ta, gia } = serviceData;
    
    await pool.query(
      'INSERT INTO Dich_vu (Ma_dich_vu, Ten_dich_vu, Mo_ta, Gia) VALUES (?, ?, ?, ?)',
      [ma_dich_vu, ten_dich_vu, mo_ta, gia]
    );
    
    return await this.getById(ma_dich_vu);
  }

  /**
   * Update a service
   * @param {string} id - Service ID
   * @param {Object} serviceData - Updated service data
   * @returns {Object} - Updated service
   */
  static async update(id, serviceData) {
    const { ten_dich_vu, mo_ta, gia } = serviceData;
    
    await pool.query(
      'UPDATE Dich_vu SET Ten_dich_vu = ?, Mo_ta = ?, Gia = ? WHERE Ma_dich_vu = ?',
      [ten_dich_vu, mo_ta, gia, id]
    );
    
    return await this.getById(id);
  }

  /**
   * Delete a service
   * @param {string} id - Service ID
   * @returns {boolean} - Success status
   */
  static async delete(id) {
    const [result] = await pool.query(
      'DELETE FROM Dich_vu WHERE Ma_dich_vu = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Get services for a specific booking
   * @param {string} bookingId - Booking ID
   * @returns {Array} - List of services with details
   */
  static async getServicesForBooking(bookingId) {
    const [rows] = await pool.execute(
      `SELECT s.*, c.So_luong, c.Thanh_tien 
       FROM Dich_vu s
       JOIN Chi_tiet_dich_vu c ON s.Ma_dich_vu = c.Ma_dich_vu
       WHERE c.Ma_booking = ?`,
      [bookingId]
    );
    
    return rows;
  }

  /**
   * Add service to booking
   * @param {Object} data - Service booking data
   * @returns {boolean} - Success status
   */
  static async addServiceToBooking(data) {
    const { ma_booking, ma_dich_vu, so_luong, thanh_tien } = data;
    
    const [result] = await pool.execute(
      'INSERT INTO Chi_tiet_dich_vu (Ma_booking, Ma_dich_vu, So_luong, Thanh_tien) VALUES (?, ?, ?, ?)',
      [ma_booking, ma_dich_vu, so_luong, thanh_tien]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Remove service from booking
   * @param {string} bookingId - Booking ID
   * @param {string} serviceId - Service ID
   * @returns {boolean} - Success status
   */
  static async removeServiceFromBooking(bookingId, serviceId) {
    const [result] = await pool.execute(
      'DELETE FROM Chi_tiet_dich_vu WHERE Ma_booking = ? AND Ma_dich_vu = ?',
      [bookingId, serviceId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Search services by name
   * @param {string} keyword - Search keyword
   * @returns {Array} - Search results
   */
  static async searchByName(keyword) {
    const [rows] = await pool.execute(
      'SELECT * FROM Dich_vu WHERE Ten_dich_vu LIKE ?',
      [`%${keyword}%`]
    );
    
    return rows;
  }
}

module.exports = Service;
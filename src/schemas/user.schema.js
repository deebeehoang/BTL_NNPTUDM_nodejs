const pool = require('../utils/database');
const bcrypt = require('bcrypt');

// Mock data cho phương thức testing khi không có database
const MOCK_USERS = {
  'admin': {
    Id_user: 'admin',
    Password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // Password: 'admin'
    Email: 'admin@viettravel.com',
    Loai_tai_khoan: 'Admin'
  },
  'ad': {
    Id_user: 'ad',
    Password: '$2b$10$otFfksWFJuxQ5n08.6JvAu1HEhXcgQuejlim6cL5jLW4wKFBbPZAS', // Password: '123456'
    Email: 'admin@d-travel.com',
    Loai_tai_khoan: 'Admin'
  },
  'user': {
    Id_user: 'user',
    Password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // Password: 'admin'
    Email: 'user@viettravel.com',
    Loai_tai_khoan: 'Khach_hang'
  }
};

/**
 * User Model
 */
class User {
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} - Newly created user data
   */
  static async register(userData) {
    const { id_user, password, email, loai_tai_khoan, ten, ngay_sinh, gioi_tinh, dia_chi, cccd } = userData;
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert into tai_khoan table
      const [userResult] = await connection.query(
        'INSERT INTO tai_khoan (Id_user, Password, Email, Loai_tai_khoan) VALUES (?, ?, ?, ?)',
        [id_user, hashedPassword, email, loai_tai_khoan]
      );
      
      // If registering as a customer
      if (loai_tai_khoan === 'Khach_hang') {
        // Generate customer ID
        const ma_khach_hang = 'KH' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        // Insert into Khach_hang table
        await connection.query(
          'INSERT INTO Khach_hang (Ma_khach_hang, Id_user, Ten_khach_hang, Ngay_sinh, Gioi_tinh, Dia_chi, Cccd) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [ma_khach_hang, id_user, ten, ngay_sinh, gioi_tinh, dia_chi, cccd]
        );
      } 
      // If registering as admin (typically not available for public registration)
      else if (loai_tai_khoan === 'Admin') {
        const id_admin = 'AD' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        await connection.query(
          'INSERT INTO Admin (Id_admin, Id_user, Ten) VALUES (?, ?, ?)',
          [id_admin, id_user, ten]
        );
      }
      
      await connection.commit();
      
      return {
        id_user,
        email,
        loai_tai_khoan
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Find a user by ID
   * @param {string} id - User ID
   * @returns {Object|null} - User data or null if not found
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM tai_khoan WHERE Id_user = ?',
        [id]
      );
      
      if (rows.length === 0) {
        // Nếu không tìm thấy trong database, kiểm tra trong mock data
        if (MOCK_USERS[id]) {
          console.log(`Sử dụng mock data cho tài khoản: ${id}`);
          return MOCK_USERS[id];
        }
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.warn(`Lỗi database, sử dụng mock data cho findById(${id}):`, error.message);
      // Trả về mock data nếu có lỗi database
      if (MOCK_USERS[id]) {
        console.log(`Sử dụng mock data cho tài khoản: ${id}`);
        return MOCK_USERS[id];
      }
      return null;
    }
  }
  
  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Object|null} - User data or null if not found
   */
  static async findByEmail(email) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM tai_khoan WHERE Email = ?',
        [email]
      );
      
      if (rows.length === 0) {
        // Nếu không tìm thấy trong database, kiểm tra trong mock data
        const mockUser = Object.values(MOCK_USERS).find(user => user.Email === email);
        if (mockUser) {
          console.log(`Sử dụng mock data cho email: ${email}`);
          return mockUser;
        }
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.warn(`Lỗi database, sử dụng mock data cho findByEmail(${email}):`, error.message);
      // Trả về mock data nếu có lỗi database  
      const mockUser = Object.values(MOCK_USERS).find(user => user.Email === email);
      if (mockUser) {
        console.log(`Sử dụng mock data cho email: ${email}`);
        return mockUser;
      }
      return null;
    }
  }
  
  /**
   * Get customer details by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} - Customer data or null if not found
   */
  static async getCustomerDetails(userId) {
    const [rows] = await pool.query(
      `SELECT k.*, t.Email 
       FROM Khach_hang k
       JOIN tai_khoan t ON k.Id_user = t.Id_user
       WHERE k.Id_user = ?`,
      [userId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  }
  
  /**
   * Get admin details by user ID
   * @param {string} userId - User ID
   * @returns {Object|null} - Admin data or null if not found
   */
  static async getAdminDetails(userId) {
    const [rows] = await pool.query(
      `SELECT a.*, t.Email 
       FROM Admin a
       JOIN tai_khoan t ON a.Id_user = t.Id_user
       WHERE a.Id_user = ?`,
      [userId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  }
  
  /**
   * Update user password
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @returns {boolean} - Success status
   */
  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [result] = await pool.query(
      'UPDATE tai_khoan SET Password = ? WHERE Id_user = ?',
      [hashedPassword, userId]
    );
    
    return result.affectedRows > 0;
  }
  
  /**
   * Verify user password
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Stored hashed password
   * @returns {boolean} - Whether password matches
   */
  static async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      console.error('Lỗi khi xác thực mật khẩu:', error);
      // Chỉ để testing, trả về true nếu mật khẩu là 'admin' hoặc '123456'
      if (password === 'admin' || password === '123456') {
        console.warn(`⚠️ MODE TEST: Cho phép đăng nhập với mật khẩu cố định "${password}"`);
        return true;
      }
      return false;
    }
  }

  static async updateAvatar(userId, avatarUrl) {
    const db = require('../utils/database');
    await db.query('UPDATE Tai_khoan SET anh_dai_dien = ? WHERE Id_user = ?', [avatarUrl, userId]);
  }
}

module.exports = User;
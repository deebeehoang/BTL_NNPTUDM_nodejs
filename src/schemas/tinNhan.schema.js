const pool = require('../utils/database');

/**
 * TinNhan Model - Quản lý tin nhắn
 */
class TinNhan {
  /**
   * Lấy tin nhắn mới nhất và số tin chưa đọc cho danh sách chat
   * @param {string|null} adminId - ID admin (nếu có)
   * @returns {Array} - Danh sách partner kèm tin nhắn mới nhất
   */
  static async getChatPartners(adminId) {
    const unreadToClause = adminId
      ? `tn4.Id_nguoi_nhan = ?`
      : `tn4.Id_nguoi_nhan IN (SELECT tk2.Id_user FROM Tai_khoan tk2 WHERE tk2.Loai_tai_khoan = 'Admin')`;

    const sql = `
      SELECT 
        t.partner_id AS Id_user,
        kh.Ten_khach_hang,
        tk.Email,
        tk.anh_dai_dien,
        (
          SELECT tn2.Noi_dung 
          FROM Tin_nhan tn2 
          WHERE (tn2.Id_nguoi_gui = t.partner_id OR tn2.Id_nguoi_nhan = t.partner_id)
          ORDER BY tn2.Thoi_gian DESC 
          LIMIT 1
        ) AS last_message,
        (
          SELECT tn3.Thoi_gian 
          FROM Tin_nhan tn3 
          WHERE (tn3.Id_nguoi_gui = t.partner_id OR tn3.Id_nguoi_nhan = t.partner_id)
          ORDER BY tn3.Thoi_gian DESC 
          LIMIT 1
        ) AS last_message_time,
        (
          SELECT COUNT(*) 
          FROM Tin_nhan tn4 
          WHERE tn4.Id_nguoi_gui = t.partner_id 
            AND ${unreadToClause}
            AND tn4.Da_doc = 0
        ) AS unread_count
      FROM (
        SELECT DISTINCT 
          CASE 
            WHEN tn.Id_nguoi_gui IN (SELECT tk1.Id_user FROM Tai_khoan tk1 WHERE tk1.Loai_tai_khoan = 'Admin') THEN tn.Id_nguoi_nhan
            ELSE tn.Id_nguoi_gui
          END AS partner_id
        FROM Tin_nhan tn
      ) t
      JOIN Tai_khoan tk ON tk.Id_user = t.partner_id
      LEFT JOIN Khach_hang kh ON kh.Id_user = t.partner_id
      ORDER BY last_message_time DESC
    `;

    const params = adminId ? [adminId] : [];
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Lấy tất cả tin nhắn (dành cho admin)
   * @returns {Array} - Danh sách tin nhắn
   */
  static async getAllMessages() {
    const sql = `
      SELECT tn.*, 
        COALESCE(kh.Ten_khach_hang, tn.Id_nguoi_gui) AS Ten_nguoi_gui,
        COALESCE(kh2.Ten_khach_hang, tn.Id_nguoi_nhan) AS Ten_nguoi_nhan
      FROM Tin_nhan tn
      LEFT JOIN Khach_hang kh ON kh.Id_user = tn.Id_nguoi_gui
      LEFT JOIN Khach_hang kh2 ON kh2.Id_user = tn.Id_nguoi_nhan
      ORDER BY tn.Thoi_gian ASC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  }

  /**
   * Lấy tin nhắn giữa user và admin
   * @param {string} userId - ID người dùng
   * @returns {Array} - Danh sách tin nhắn
   */
  static async getMessagesByUser(userId) {
    const sql = `
      SELECT tn.*, 
        COALESCE(kh.Ten_khach_hang, tn.Id_nguoi_gui) AS Ten_nguoi_gui,
        COALESCE(kh2.Ten_khach_hang, tn.Id_nguoi_nhan) AS Ten_nguoi_nhan
      FROM Tin_nhan tn
      LEFT JOIN Khach_hang kh ON kh.Id_user = tn.Id_nguoi_gui
      LEFT JOIN Khach_hang kh2 ON kh2.Id_user = tn.Id_nguoi_nhan
      WHERE (Id_nguoi_gui = ? AND Id_nguoi_nhan = 'admin01')
         OR (Id_nguoi_nhan = ? AND Id_nguoi_gui = 'admin01')
      ORDER BY tn.Thoi_gian ASC
    `;
    const [rows] = await pool.query(sql, [userId, userId]);
    return rows;
  }

  /**
   * Lấy tin nhắn giữa 2 người dùng
   * @param {string} user1 - ID người dùng 1
   * @param {string} user2 - ID người dùng 2
   * @returns {Array} - Danh sách tin nhắn
   */
  static async getConversation(user1, user2) {
    const sql = `
      SELECT tn.*, 
        COALESCE(kh.Ten_khach_hang, tn.Id_nguoi_gui) AS Ten_nguoi_gui,
        COALESCE(kh2.Ten_khach_hang, tn.Id_nguoi_nhan) AS Ten_nguoi_nhan
      FROM Tin_nhan tn
      LEFT JOIN Khach_hang kh ON kh.Id_user = tn.Id_nguoi_gui
      LEFT JOIN Khach_hang kh2 ON kh2.Id_user = tn.Id_nguoi_nhan
      WHERE (Id_nguoi_gui = ? AND Id_nguoi_nhan = ?) 
         OR (Id_nguoi_gui = ? AND Id_nguoi_nhan = ?)
      ORDER BY tn.Thoi_gian ASC
    `;
    const [rows] = await pool.query(sql, [user1, user2, user2, user1]);
    return rows;
  }

  /**
   * Gửi tin nhắn mới
   * @param {string} nguoiGui - ID người gửi
   * @param {string} nguoiNhan - ID người nhận
   * @param {string} noiDung - Nội dung tin nhắn
   * @returns {Object} - Kết quả insert
   */
  static async create(nguoiGui, nguoiNhan, noiDung) {
    const sql = `
      INSERT INTO Tin_nhan (Id_nguoi_gui, Id_nguoi_nhan, Noi_dung, Thoi_gian, Da_doc)
      VALUES (?, ?, ?, NOW(), 0)
    `;
    const [result] = await pool.query(sql, [nguoiGui, nguoiNhan, noiDung]);
    return result;
  }

  /**
   * Đánh dấu đã đọc tin nhắn từ customer gửi cho admin
   * @param {string} adminId - ID admin
   * @param {string} customerId - ID khách hàng
   * @returns {Object} - Kết quả update
   */
  static async markAsRead(adminId, customerId) {
    const sql = `
      UPDATE Tin_nhan 
      SET Da_doc = 1 
      WHERE Id_nguoi_gui = ? 
      AND (Id_nguoi_nhan = ? OR Id_nguoi_nhan = 'admin01')
      AND Da_doc = 0
    `;
    const [result] = await pool.query(sql, [customerId, adminId]);
    return result;
  }

  /**
   * Đếm số tin nhắn chưa đọc
   * @param {string} userId - ID người nhận
   * @returns {number} - Số tin chưa đọc
   */
  static async getUnreadCount(userId) {
    const sql = `
      SELECT COUNT(*) as unread_count
      FROM Tin_nhan
      WHERE Id_nguoi_nhan = ? AND Da_doc = 0
    `;
    const [rows] = await pool.query(sql, [userId]);
    return rows[0]?.unread_count ?? 0;
  }

  /**
   * Xóa một tin nhắn theo ID
   * @param {string} messageId - ID tin nhắn
   * @returns {Object} - Kết quả delete
   */
  static async deleteById(messageId) {
    const sql = `DELETE FROM Tin_nhan WHERE Id_tin = ?`;
    const [result] = await pool.query(sql, [messageId]);
    return result;
  }

  /**
   * Xóa toàn bộ hội thoại giữa 2 người
   * @param {string} user1 - ID người dùng 1
   * @param {string} user2 - ID người dùng 2
   * @returns {Object} - Kết quả delete
   */
  static async deleteConversation(user1, user2) {
    const sql = `
      DELETE FROM Tin_nhan 
      WHERE (Id_nguoi_gui = ? AND Id_nguoi_nhan = ?) 
         OR (Id_nguoi_gui = ? AND Id_nguoi_nhan = ?)
    `;
    const [result] = await pool.query(sql, [user1, user2, user2, user1]);
    return result;
  }

  /**
   * Lấy thống kê tin nhắn
   * @returns {Object} - Thống kê
   */
  static async getStats() {
    const sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN Id_nguoi_gui <> 'admin01' THEN Id_nguoi_gui END) as total_customers,
        COUNT(*) as total_messages,
        COUNT(CASE WHEN Da_doc = 0 AND Id_nguoi_nhan = 'admin01' THEN 1 END) as unread_messages,
        COUNT(CASE WHEN DATE(Thoi_gian) = CURDATE() THEN 1 END) as today_messages,
        COUNT(CASE WHEN DATE(Thoi_gian) = CURDATE() - INTERVAL 1 DAY THEN 1 END) as yesterday_messages
      FROM Tin_nhan
    `;
    const [rows] = await pool.query(sql);
    return rows[0] || {};
  }

  /**
   * Tìm kiếm tin nhắn theo nội dung
   * @param {string} keyword - Từ khóa tìm kiếm
   * @param {string|null} userId - ID người dùng (lọc theo user nếu có)
   * @returns {Array} - Danh sách tin nhắn tìm được
   */
  static async search(keyword, userId) {
    let sql = `
      SELECT tn.*, 
        COALESCE(kh.Ten_khach_hang, tn.Id_nguoi_gui) AS Ten_nguoi_gui,
        COALESCE(kh2.Ten_khach_hang, tn.Id_nguoi_nhan) AS Ten_nguoi_nhan
      FROM Tin_nhan tn
      LEFT JOIN Khach_hang kh ON kh.Id_user = tn.Id_nguoi_gui
      LEFT JOIN Khach_hang kh2 ON kh2.Id_user = tn.Id_nguoi_nhan
      WHERE Noi_dung LIKE ?
    `;
    let params = [`%${keyword}%`];

    if (userId) {
      sql += ` AND (Id_nguoi_gui = ? OR Id_nguoi_nhan = ?)`;
      params.push(userId, userId);
    }

    sql += ` ORDER BY Thoi_gian DESC LIMIT 50`;

    const [rows] = await pool.query(sql, params);
    return rows;
  }
}

module.exports = TinNhan;

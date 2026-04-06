const pool = require('../utils/database');

/**
 * Booking Model
 */
class Booking {
  // Helper function để lấy tên bảng booking chính xác
  static async getBookingTableName() {
    try {
      const [tables] = await pool.query(
        `SELECT TABLE_NAME 
         FROM INFORMATION_SCHEMA.TABLES 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND LOWER(TABLE_NAME) = 'booking'`
      );
      if (tables.length > 0) {
        return tables[0].TABLE_NAME;
      }
    } catch (error) {
      console.warn('⚠️ Không thể kiểm tra tên bảng booking');
    }
    return 'booking'; // Mặc định
  }
  /**
   * Get all bookings
   * @returns {Array} - List of all bookings
   */
static async getAll(filters = {}) {
  // Lấy tên bảng chính xác
  const bookingTableName = await Booking.getBookingTableName();
  console.log(`📋 [Booking.getAll] Using table name: ${bookingTableName}`);

  let query = `
    SELECT 
      b.Ma_booking,
      b.Ngay_dat,
      b.So_nguoi_lon,
      b.So_tre_em,
      b.Ma_khuyen_mai,
      b.Tong_tien,
      b.Ma_khach_hang,
      b.Id_user,
      b.Trang_thai_booking,
      b.Trang_thai,
      kh.Ten_khach_hang
    FROM \`${bookingTableName}\` b
    LEFT JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
    WHERE 1=1
  `;
  
  const params = [];
  
  // Filter theo trạng thái
  if (filters.status && filters.status !== 'all') {
    // Chỉ lấy đúng trạng thái được chọn, loại trừ các trạng thái khác
    if (filters.status === 'Chờ thanh toán') {
      // Chỉ lấy booking có trạng thái "Chờ thanh toán" - ít nhất một trong hai cột phải là "Chờ thanh toán"
      // Và không có cột nào có giá trị khác (pending, Đã thanh toán, Het_han, Da_huy, Hủy, Đã hủy)
      query += ` AND (
        b.Trang_thai_booking = 'Chờ thanh toán' 
        OR b.Trang_thai = 'Chờ thanh toán'
      )`;
      // Loại trừ các trạng thái khác - đảm bảo không có cột nào có giá trị không phải "Chờ thanh toán"
      query += ` AND (b.Trang_thai_booking IS NULL OR b.Trang_thai_booking = 'Chờ thanh toán')`;
      query += ` AND (b.Trang_thai IS NULL OR b.Trang_thai = 'Chờ thanh toán')`;
      query += ` AND b.Trang_thai_booking NOT IN ('Đã thanh toán', 'Het_han', 'Da_huy', 'Hủy', 'Đã hủy', 'pending')`;
      query += ` AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Đã thanh toán', 'Het_han', 'Da_huy', 'Hủy', 'Đã hủy', 'pending'))`;
    } else if (filters.status === 'Đã thanh toán') {
      // Chỉ lấy booking đã thanh toán
      // Nếu Trang_thai_booking = 'Đã thanh toán' thì hiển thị (bất kể Trang_thai)
      // Hoặc nếu Trang_thai = 'Đã thanh toán' thì cũng hiển thị
      query += ` AND (
        b.Trang_thai_booking = 'Đã thanh toán' 
        OR b.Trang_thai = 'Đã thanh toán'
      )`;
      // Loại trừ các trạng thái hủy
      query += ` AND b.Trang_thai_booking NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy')`;
      query += ` AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Het_han', 'Da_huy', 'Hủy', 'Đã hủy'))`;
    } else if (filters.status === 'Đã hủy') {
      // Lấy booking đã hủy (có thể có nhiều giá trị: 'Đã hủy', 'Hủy', 'Da_huy')
      query += ` AND (
        b.Trang_thai_booking IN ('Đã hủy', 'Hủy', 'Da_huy')
        OR b.Trang_thai IN ('Đã hủy', 'Hủy', 'Da_huy')
      )`;
    } else {
      // Các trạng thái khác - exact match
      query += ` AND (b.Trang_thai_booking = ? OR b.Trang_thai = ?)`;
      params.push(filters.status, filters.status);
    }
  }
  
  // Tìm kiếm theo mã booking hoặc tên khách hàng
  if (filters.query) {
    query += ` AND (b.Ma_booking LIKE ? OR kh.Ten_khach_hang LIKE ?)`;
    const searchTerm = `%${filters.query}%`;
    params.push(searchTerm, searchTerm);
  }
  
  query += ` ORDER BY b.Ngay_dat DESC`;
  
  console.log(`🔍 [Booking.getAll] Query: ${query}`);
  console.log(`🔍 [Booking.getAll] Params:`, params);
  
  const [rows] = await pool.query(query, params);
  
  console.log(`📊 [Booking.getAll] Found ${rows.length} bookings`);
  if (rows.length > 0) {
    console.log(`📊 [Booking.getAll] Sample booking:`, {
      Ma_booking: rows[0].Ma_booking,
      Trang_thai_booking: rows[0].Trang_thai_booking,
      Trang_thai: rows[0].Trang_thai,
      Ten_khach_hang: rows[0].Ten_khach_hang
    });
  }
  
  return rows;
}


  /**
   * Get a booking by ID
   * @param {string} id - Booking ID
   * @returns {Object|null} - Booking data or null if not found
   */
  static async getById(id) {
    const bookingTableName = await Booking.getBookingTableName();
    const [rows] = await pool.query(
      `SELECT * FROM \`${bookingTableName}\` WHERE Ma_booking = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  }

  /**
   * Get bookings by customer ID
   * @param {string} customerId - Customer ID
   * @returns {Array} - List of bookings
   */
  static async getByCustomerId(customerId) {
    const bookingTableName = await Booking.getBookingTableName();
    const [rows] = await pool.query(
      `SELECT * FROM \`${bookingTableName}\` WHERE Ma_khach_hang = ? ORDER BY Ngay_dat DESC`,
      [customerId]
    );
    
    return rows;
  }

  /**
   * Check if user has a pending booking for the same schedule
   * @param {String} userId - User ID
   * @param {String} maLichKhoiHanh - Schedule ID
   * @param {Object} connection - Database connection (optional)
   * @returns {Object|null} - Existing pending booking or null
   */
  static async getPendingBookingBySchedule(userId, maLichKhoiHanh, connection = null) {
    try {
      // Kiểm tra booking "Chờ thanh toán" cho cùng Ma_lich
      // CHỈ chặn khi booking đang "Chờ thanh toán"
      // Cho phép đặt lại nếu booking đã "Đã thanh toán", "Het_han", "Da_huy", "Hủy"
      // Join với Chi_tiet_booking để lấy Ma_lich (lưu ý: cột là Ma_lich, không phải Ma_lich_khoi_hanh)
      // Logic: CHỈ tìm booking có trạng thái "Chờ thanh toán"
      // Loại trừ các trạng thái khác: "Đã thanh toán", "Het_han", "Da_huy", "Hủy"
      // Nếu booking có một trong các trạng thái trên thì cho phép đặt lại
      // Logic: Chỉ tìm booking có trạng thái "Chờ thanh toán" và KHÔNG có các trạng thái khác
      // Nếu booking có trạng thái "Het_han", "Đã thanh toán", "Da_huy", "Hủy" thì KHÔNG match
      const bookingTableName = await Booking.getBookingTableName();
      const query = `
        SELECT b.* 
        FROM \`${bookingTableName}\` b
        INNER JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
        WHERE b.Id_user = ? 
          AND ctb.Ma_lich = ?
          AND (
            (b.Trang_thai_booking = 'Chờ thanh toán' AND (b.Trang_thai IS NULL OR b.Trang_thai = 'Chờ thanh toán'))
            OR (b.Trang_thai = 'Chờ thanh toán' AND (b.Trang_thai_booking IS NULL OR b.Trang_thai_booking = 'Chờ thanh toán'))
          )
          AND (b.Trang_thai_booking IS NULL OR b.Trang_thai_booking NOT IN ('Đã thanh toán', 'Het_han', 'Da_huy', 'Hủy'))
          AND (b.Trang_thai IS NULL OR b.Trang_thai NOT IN ('Đã thanh toán', 'Het_han', 'Da_huy', 'Hủy'))
        LIMIT 1
      `;
      
      let rows;
      if (connection) {
        [rows] = await connection.query(query, [userId, maLichKhoiHanh]);
      } else {
        [rows] = await pool.query(query, [userId, maLichKhoiHanh]);
      }
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error checking pending booking:', error);
      throw error;
    }
  }

  /**
   * Create a new booking
   * @param {Object} bookingData - Booking data
   * @returns {Object} - Newly created booking
   */
  static async create(bookingData, connection) {
    try {
      console.log('📝 Dữ liệu booking nhận vào model:', bookingData);

      const {
        Ma_booking,
        Ngay_dat,
        So_nguoi_lon,
        So_tre_em,
        Ma_khuyen_mai,
        Trang_thai_booking,
        Tong_tien,
        Ma_khach_hang,
        Id_user
      } = bookingData;

      // Validate required fields
      if (!Ma_booking || !Ngay_dat || !So_nguoi_lon || !Trang_thai_booking || 
          !Tong_tien || !Ma_khach_hang || !Id_user) {
        throw new Error('Thiếu thông tin bắt buộc khi tạo booking');
      }

      const query = `
        INSERT INTO Booking (
          Ma_booking,
          Ngay_dat,
          So_nguoi_lon,
          So_tre_em,
          Ma_khuyen_mai,
          Trang_thai_booking,
          Tong_tien,
          Ma_khach_hang,
          Id_user
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        Ma_booking,
        Ngay_dat,
        So_nguoi_lon,
        So_tre_em || 0,
        Ma_khuyen_mai || null,
        Trang_thai_booking,
        Tong_tien,
        Ma_khach_hang,
        Id_user
      ];

      console.log('🔍 Query:', query);
      console.log('📊 Values:', values);

      const [result] = await connection.query(query, values);
      return result;
    } catch (error) {
      console.error('❌ Lỗi khi tạo booking trong model:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   * @param {string} bookingId - Booking ID
   * @param {string} status - New status
   * @returns {Object} - Updated booking
   */
  static async updateStatus(bookingId, status) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Cập nhật trạng thái booking
      await connection.query(
        'UPDATE Booking SET Trang_thai_booking = ? WHERE Ma_booking = ?',
        [status, bookingId]
      );
      
      // Nếu trạng thái là hủy, cập nhật trạng thái vé
      if (status === 'Da_huy') {
        await connection.query(
          'UPDATE Ve SET Trang_thai_ve = ? WHERE Ma_booking = ?',
          ['Da_huy', bookingId]
        );
      }
      
      await connection.commit();
      
      // Lấy thông tin booking đã cập nhật
      const bookingTableName = await Booking.getBookingTableName();
      const [rows] = await connection.query(
        `SELECT * FROM \`${bookingTableName}\` WHERE Ma_booking = ?`,
        [bookingId]
      );
      
      return rows[0];
    } catch (error) {
      await connection.rollback();
      console.error('Lỗi khi cập nhật trạng thái booking:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get user bookings
   * @param {number} userId - User ID
   * @returns {Array} - List of user bookings
   */
  static async getUserBookings(userId) {
    // Kiểm tra xem cột expires_at có tồn tại không
    const [expiresAtColumn] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'Booking' 
         AND COLUMN_NAME = 'expires_at'`
    );
    const hasExpiresAt = expiresAtColumn.length > 0;
    
    // Nếu có expires_at, thêm vào SELECT, nếu không tính từ Ngay_dat + 10 phút
    const expiresAtField = hasExpiresAt 
      ? 'b.expires_at' 
      : 'DATE_ADD(b.Ngay_dat, INTERVAL 10 MINUTE) as expires_at';
    
    const bookingTableName = await Booking.getBookingTableName();
    const query = `
      SELECT b.*, t.Ten_tour, l.Ngay_bat_dau, l.Ngay_ket_thuc, 
              ${expiresAtField},
              (SELECT SUM(So_luong) FROM Chi_tiet_dich_vu WHERE Ma_booking = b.Ma_booking) as So_dich_vu_da_dat
       FROM \`${bookingTableName}\` b
       JOIN Chi_tiet_booking cb ON b.Ma_booking = cb.Ma_booking
       JOIN Lich_khoi_hanh l ON cb.Ma_lich = l.Ma_lich
       JOIN Tour_du_lich t ON l.Ma_tour = t.Ma_tour
       WHERE b.Id_user = ?
       ORDER BY b.Ngay_dat DESC`;
    
    const [rows] = await pool.query(query, [userId]);
    
    return rows;
  }

  /**
   * Add services to booking
   * @param {string} bookingId - Booking ID
   * @param {Array} services - Array of { ma_dich_vu, so_luong }
   * @returns {boolean} - Success status
   */
  static async addServices(bookingId, services) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      for (const service of services) {
        // Get service price
        const [serviceRows] = await connection.query(
          'SELECT Gia FROM Dich_vu WHERE Ma_dich_vu = ?',
          [service.ma_dich_vu]
        );
        
        if (serviceRows.length === 0) {
          throw new Error(`Service with ID ${service.ma_dich_vu} not found`);
        }
        
        const servicePrice = serviceRows[0].Gia;
        const totalPrice = servicePrice * service.so_luong;
        
        // Check if service already exists for this booking
        const [existingRows] = await connection.query(
          'SELECT * FROM Chi_tiet_dich_vu WHERE Ma_booking = ? AND Ma_dich_vu = ?',
          [bookingId, service.ma_dich_vu]
        );
        
        if (existingRows.length > 0) {
          // Update existing service
          await connection.query(
            'UPDATE Chi_tiet_dich_vu SET So_luong = ?, Thanh_tien = ? WHERE Ma_booking = ? AND Ma_dich_vu = ?',
            [service.so_luong, totalPrice, bookingId, service.ma_dich_vu]
          );
        } else {
          // Add new service
          await connection.query(
            'INSERT INTO Chi_tiet_dich_vu (Ma_booking, Ma_dich_vu, So_luong, Thanh_tien) VALUES (?, ?, ?, ?)',
            [bookingId, service.ma_dich_vu, service.so_luong, totalPrice]
          );
        }
        
        // Update booking total price
        await connection.query(
          'UPDATE Booking SET Tong_tien = Tong_tien + ? WHERE Ma_booking = ?',
          [totalPrice, bookingId]
        );
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get booking details including tour information
   * @param {string} bookingId - Booking ID
   * @returns {Object} - Booking details
   */
  static async getBookingDetails(bookingId) {
    try {
      const bookingTableName = await Booking.getBookingTableName();
      
      const [bookingRows] = await pool.query(
        `SELECT b.*, k.Ten_khach_hang, k.Cccd, k.Dia_chi, k.Ngay_sinh, k.Gioi_tinh,
                COALESCE(b.Id_user, k.Id_user) as Id_user,
                t.Email as Email_tai_khoan
         FROM \`${bookingTableName}\` b
         JOIN Khach_hang k ON b.Ma_khach_hang = k.Ma_khach_hang
         LEFT JOIN Tai_khoan t ON (COALESCE(b.Id_user, k.Id_user) = t.Id_user)
         WHERE b.Ma_booking = ?`,
        [bookingId]
      );
    
    if (bookingRows.length === 0) {
      return null;
    }
    
    // Get tour details with schedule and guide information
    const [tourRows] = await pool.query(
      `SELECT 
         t.*, 
         l.Ma_lich,
         l.Ngay_bat_dau, 
         l.Ngay_ket_thuc,
         l.So_cho,
         l.Ma_huong_dan_vien,
         h.Ten_huong_dan_vien,
         h.Anh_dai_dien AS guide_avatar,
         h.So_dien_thoai AS guide_phone,
         h.Ngon_ngu AS guide_languages,
         h.Kinh_nghiem AS guide_experience,
         COALESCE((
           SELECT AVG(d.Diem_huong_dan_vien)
           FROM danh_gia d
           LEFT JOIN Booking b2 ON d.Ma_booking = b2.Ma_booking
           LEFT JOIN Chi_tiet_booking ctb2 ON b2.Ma_booking = ctb2.Ma_booking
           LEFT JOIN Lich_khoi_hanh l2 ON ctb2.Ma_lich = l2.Ma_lich
           WHERE (d.Ma_huong_dan_vien = l.Ma_huong_dan_vien OR l2.Ma_huong_dan_vien = l.Ma_huong_dan_vien)
             AND d.Diem_huong_dan_vien IS NOT NULL
             AND d.Diem_huong_dan_vien > 0
         ), 0) AS guide_avg_rating,
         COALESCE((
           SELECT COUNT(DISTINCT d.Id_review)
           FROM danh_gia d
           LEFT JOIN Booking b2 ON d.Ma_booking = b2.Ma_booking
           LEFT JOIN Chi_tiet_booking ctb2 ON b2.Ma_booking = ctb2.Ma_booking
           LEFT JOIN Lich_khoi_hanh l2 ON ctb2.Ma_lich = l2.Ma_lich
           WHERE (d.Ma_huong_dan_vien = l.Ma_huong_dan_vien OR l2.Ma_huong_dan_vien = l.Ma_huong_dan_vien)
             AND d.Diem_huong_dan_vien IS NOT NULL
             AND d.Diem_huong_dan_vien > 0
         ), 0) AS guide_rating_count
       FROM Tour_du_lich t
       JOIN Lich_khoi_hanh l ON t.Ma_tour = l.Ma_tour
       JOIN Chi_tiet_booking cb ON l.Ma_lich = cb.Ma_lich
       LEFT JOIN huong_dan_vien h ON l.Ma_huong_dan_vien = h.Ma_huong_dan_vien
       WHERE cb.Ma_booking = ?`,
      [bookingId]
    );
    
    // Get itinerary/schedule details từ bảng tour_itinerary
    // Ưu tiên lấy lịch trình theo Ma_lich của booking, nếu không có thì lấy lịch trình tour chung
    let itinerary = null;
    if (tourRows.length > 0 && tourRows[0].Ma_tour) {
      try {
        const maLich = tourRows[0].Ma_lich; // Lấy Ma_lich từ schedule của booking
        const maTour = tourRows[0].Ma_tour;
        
        console.log(`🔍 [BOOKING] Getting itinerary for booking ${bookingId}`);
        console.log(`🔍 [BOOKING] Ma_tour: ${maTour}, Ma_lich: ${maLich}`);
        
        // Kiểm tra xem cột Ma_lich có tồn tại trong bảng tour_itinerary không
        const [columnCheck] = await pool.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'tour_itinerary' 
             AND COLUMN_NAME = 'Ma_lich'`
        );
        
        const hasMaLichColumn = columnCheck.length > 0;
        console.log(`🔍 [BOOKING] Has Ma_lich column: ${hasMaLichColumn}`);
        
        let itineraryRows = [];
        
        if (hasMaLichColumn && maLich) {
          // Ưu tiên: Lấy lịch trình theo Ma_lich (lịch trình cụ thể cho lịch khởi hành này)
          console.log(`🔍 [BOOKING] Querying itinerary for Ma_tour=${maTour} AND Ma_lich=${maLich}`);
          const [scheduleItineraryRows] = await pool.query(
            `SELECT * FROM tour_itinerary 
             WHERE Ma_tour = ? AND Ma_lich = ? 
             ORDER BY Ngay_thu ASC`,
            [maTour, maLich]
          );
          
          console.log(`🔍 [BOOKING] Found ${scheduleItineraryRows.length} itinerary items for schedule ${maLich}`);
          
          if (scheduleItineraryRows.length > 0) {
            itineraryRows = scheduleItineraryRows;
            console.log(`✅ [BOOKING] Loaded ${itineraryRows.length} itinerary items for schedule ${maLich}`);
          } else {
            // Fallback: Lấy lịch trình tour chung (Ma_lich IS NULL)
            console.log(`⚠️ [BOOKING] No schedule-specific itinerary found, trying general tour itinerary...`);
            const [tourItineraryRows] = await pool.query(
              `SELECT * FROM tour_itinerary 
               WHERE Ma_tour = ? AND (Ma_lich IS NULL OR Ma_lich = '') 
               ORDER BY Ngay_thu ASC`,
              [maTour]
            );
            
            console.log(`🔍 [BOOKING] Found ${tourItineraryRows.length} general itinerary items for tour ${maTour}`);
            
            if (tourItineraryRows.length > 0) {
              itineraryRows = tourItineraryRows;
              console.log(`✅ [BOOKING] Loaded ${itineraryRows.length} general itinerary items for tour ${maTour}`);
            }
          }
        } else {
          // Nếu không có cột Ma_lich hoặc không có Ma_lich, lấy lịch trình tour chung
          console.log(`⚠️ [BOOKING] No Ma_lich column or Ma_lich is null, loading general tour itinerary...`);
          const [tourItineraryRows] = await pool.query(
            `SELECT * FROM tour_itinerary WHERE Ma_tour = ? ORDER BY Ngay_thu ASC`,
            [maTour]
          );
          
          console.log(`🔍 [BOOKING] Found ${tourItineraryRows.length} general itinerary items for tour ${maTour}`);
          
          if (tourItineraryRows.length > 0) {
            itineraryRows = tourItineraryRows;
          }
        }
        
        if (itineraryRows.length > 0) {
          itinerary = itineraryRows;
          console.log(`✅ [BOOKING] Final itinerary set with ${itinerary.length} items`);
          console.log(`🔍 [BOOKING] First itinerary item:`, JSON.stringify(itinerary[0], null, 2));
        } else {
          console.log(`⚠️ [BOOKING] No itinerary rows found, checking old Lich_trinh table...`);
          // Fallback: Kiểm tra bảng Lich_trinh cũ nếu có
          const [tableCheck] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM information_schema.tables 
             WHERE table_schema = DATABASE() 
             AND table_name = 'Lich_trinh'`
          );
          
          if (tableCheck.length > 0 && tableCheck[0].count > 0) {
            const [oldItineraryRows] = await pool.query(
              `SELECT * FROM Lich_trinh WHERE Ma_tour = ? ORDER BY Ngay, Buoi, Gio`,
              [tourRows[0].Ma_tour]
            );
            itinerary = oldItineraryRows;
            console.log(`✅ [BOOKING] Loaded ${oldItineraryRows.length} items from old Lich_trinh table`);
          } else {
            console.log(`⚠️ [BOOKING] No itinerary found in any table`);
          }
        }
      } catch (error) {
        // Nếu bảng không tồn tại, bỏ qua và tiếp tục
        console.error('❌ [BOOKING] Error getting itinerary:', error.message);
        console.error('❌ [BOOKING] Error stack:', error.stack);
        itinerary = null;
      }
    } else {
      console.log(`⚠️ [BOOKING] No tour rows found or no Ma_tour`);
    }
    
    console.log(`🔍 [BOOKING] Final itinerary before return:`, itinerary ? `${itinerary.length} items` : 'null');
    
    // Get tickets
    const [ticketRows] = await pool.query(
      'SELECT * FROM Ve WHERE Ma_booking = ?',
      [bookingId]
    );
    
    // Get services
    const [serviceRows] = await pool.query(
      `SELECT dv.*, ct.So_luong, ct.Thanh_tien
       FROM Dich_vu dv
       JOIN Chi_tiet_dich_vu ct ON dv.Ma_dich_vu = ct.Ma_dich_vu
       WHERE ct.Ma_booking = ?`,
      [bookingId]
    );
    
      const result = {
        booking: bookingRows[0],
        tour: tourRows.length > 0 ? tourRows[0] : null,
        schedule: tourRows.length > 0 ? {
          Ma_lich: tourRows[0].Ma_lich,
          Ngay_bat_dau: tourRows[0].Ngay_bat_dau,
          Ngay_ket_thuc: tourRows[0].Ngay_ket_thuc,
          So_cho: tourRows[0].So_cho
        } : null,
        guide: tourRows.length > 0 && tourRows[0].Ma_huong_dan_vien ? {
          Ma_huong_dan_vien: tourRows[0].Ma_huong_dan_vien,
          Ten_huong_dan_vien: tourRows[0].Ten_huong_dan_vien,
          Anh_dai_dien: tourRows[0].guide_avatar,
          So_dien_thoai: tourRows[0].guide_phone,
          Ngon_ngu: tourRows[0].guide_languages,
          Kinh_nghiem: tourRows[0].guide_experience,
          avg_rating: tourRows[0].guide_avg_rating,
          rating_count: tourRows[0].guide_rating_count
        } : null,
        itinerary: itinerary,
        tickets: ticketRows,
        services: serviceRows
      };
      
      console.log(`✅ [BOOKING] Returning result with itinerary:`, itinerary ? `${itinerary.length} items` : 'null');
      if (itinerary && itinerary.length > 0) {
        console.log(`🔍 [BOOKING] Sample itinerary item:`, {
          Ma_itinerary: itinerary[0].Ma_itinerary,
          Ma_tour: itinerary[0].Ma_tour,
          Ma_lich: itinerary[0].Ma_lich,
          Ngay_thu: itinerary[0].Ngay_thu,
          Tieu_de: itinerary[0].Tieu_de
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in getBookingDetails:', error);
      throw error;
    }
  }

  /**
   * Create invoice for booking
   * @param {string} bookingId - Booking ID
   * @param {Object} invoiceData - Invoice data
   * @returns {Object} - Created invoice
   */
  static async createInvoice(bookingId, invoiceData) {
    const { ma_hoa_don, ngay_thanh_toan, hinh_thuc_thanh_toan } = invoiceData;
    
    // Get booking total price
    const bookingTableName = await Booking.getBookingTableName();
    const [bookingRows] = await pool.query(
      `SELECT Tong_tien FROM \`${bookingTableName}\` WHERE Ma_booking = ?`,
      [bookingId]
    );
    
    if (bookingRows.length === 0) {
      throw new Error('Booking not found');
    }
    
    const tongTien = bookingRows[0].Tong_tien;
    
    // Create invoice
    await pool.query(
      'INSERT INTO Hoa_don (Ma_hoa_don, Ngay_thanh_toan, Hinh_thuc_thanh_toan, Tong_tien, Ma_booking) VALUES (?, ?, ?, ?, ?)',
      [ma_hoa_don, ngay_thanh_toan, hinh_thuc_thanh_toan, tongTien, bookingId]
    );
    
    // Update booking status
    await pool.query(
      "UPDATE Booking SET Trang_thai_booking = 'Đã thanh toán' WHERE Ma_booking = ?",
      [bookingId]
    );
    
    // Return created invoice
    const [rows] = await pool.query(
      'SELECT * FROM Hoa_don WHERE Ma_hoa_don = ?',
      [ma_hoa_don]
    );
    
    return rows[0];
  }

  /**
   * Process payment for a booking
   * @param {Object} paymentData - Payment data
   * @returns {Object} - Created payment record
   */
  static async processPayment(paymentData) {
    const { id_checkout, ma_booking, phuong_thuc_thanh_toan, ngay_tra, so_tien, trang_thai } = paymentData;
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Create checkout record
      await connection.query(
        'INSERT INTO Checkout (Id_checkout, Ma_booking, Phuong_thuc_thanh_toan, Ngay_tra, So_tien, Trang_thai) VALUES (?, ?, ?, ?, ?, ?)',
        [id_checkout, ma_booking, phuong_thuc_thanh_toan, ngay_tra, so_tien, trang_thai]
      );
      
      // Update booking status if payment is successful
      if (trang_thai === 'Đã thanh toán') {
        await connection.query(
          'UPDATE Booking SET Trang_thai_booking = "Đã thanh toán" WHERE Ma_booking = ?',
          [ma_booking]
        );
        
        // Update invoice status if exists
        await connection.query(
          'UPDATE Hoa_don SET Trang_thai_hoa_don = "Đã thanh toán" WHERE Ma_booking = ?',
          [ma_booking]
        );
      }
      
      await connection.commit();
      
      const [rows] = await pool.query(
        'SELECT * FROM Checkout WHERE Id_checkout = ?',
        [id_checkout]
      );
      
      return rows[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a booking
   * @param {string} id - Booking ID
   * @returns {boolean} - Success status
   */
  static async delete(id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Delete associated records first
      await connection.query('DELETE FROM Chi_tiet_dich_vu WHERE Ma_booking = ?', [id]);
      await connection.query('DELETE FROM Ve WHERE Ma_booking = ?', [id]);
      await connection.query('DELETE FROM Chi_tiet_booking WHERE Ma_booking = ?', [id]);
      await connection.query('DELETE FROM Checkout WHERE Ma_booking = ?', [id]);
      await connection.query('DELETE FROM Hoa_don WHERE Ma_booking = ?', [id]);
      
      // Delete the booking itself
      const bookingTableName = await Booking.getBookingTableName();
      const [result] = await connection.query(`DELETE FROM \`${bookingTableName}\` WHERE Ma_booking = ?`, [id]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Add service detail to booking
   * @param {string} bookingId - Booking ID
   * @param {string} serviceId - Service ID
   * @param {number} quantity - Service quantity
   * @param {Object} connection - Database connection
   * @returns {boolean} - Success status
   */
  static async addServiceDetail(bookingId, serviceId, quantity, connection) {
    try {
      console.log(`Thêm dịch vụ ${serviceId} vào booking ${bookingId} với số lượng ${quantity}`);
      
      // Get service price
      const [serviceRows] = await connection.query(
        'SELECT Gia FROM Dich_vu WHERE Ma_dich_vu = ?',
        [serviceId]
      );
      
      if (serviceRows.length === 0) {
        throw new Error(`Không tìm thấy dịch vụ với mã ${serviceId}`);
      }
      
      const servicePrice = serviceRows[0].Gia;
      const totalPrice = servicePrice * quantity;
      
      // Add service detail
      await connection.query(
        'INSERT INTO Chi_tiet_dich_vu (Ma_booking, Ma_dich_vu, So_luong, Thanh_tien) VALUES (?, ?, ?, ?)',
        [bookingId, serviceId, quantity, totalPrice]
      );
      
      return true;
    } catch (error) {
      console.error('Lỗi khi thêm chi tiết dịch vụ:', error);
      throw error;
    }
  }

  /**
   * Update booking cancel status
   * @param {string} bookingId - Booking ID
   * @param {string} newStatus - New status
   * @returns {boolean} - Success status
   */
  static async updateCancelStatus(bookingId, newStatus) {
    const [result] = await pool.query(
      'UPDATE Booking SET Trang_thai_booking = ? WHERE Ma_booking = ?',
      [newStatus, bookingId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Cập nhật trạng thái booking khi có yêu cầu hủy
   * @param {string} bookingId - Booking ID
   * @param {string} status - Trạng thái mới ('Cho_xu_ly_huy', 'Da_huy', hoặc trạng thái khác)
   * @returns {Object} - Booking đã cập nhật
   */
  static async updateCancelRequestStatus(bookingId, status) {
    try {
      await pool.query(
        'UPDATE Booking SET Trang_thai_booking = ? WHERE Ma_booking = ?',
        [status, bookingId]
      );
      
      // Cập nhật trạng thái vé nếu booking bị hủy
      if (status === 'Da_huy') {
        await pool.query(
          'UPDATE Ve SET Trang_thai_ve = ? WHERE Ma_booking = ?',
          ['Da_huy', bookingId]
        );
      }
      
      const bookingTableName = await Booking.getBookingTableName();
      const [rows] = await pool.query(
        `SELECT * FROM \`${bookingTableName}\` WHERE Ma_booking = ?`,
        [bookingId]
      );
      
      return rows[0];
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái booking:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách booking chờ xác nhận thanh toán
   * @returns {Array} - List of pending payment bookings
   */
  static async getPendingPayments() {
    const [rows] = await pool.query(`
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
        t_account.Email,
        t.Ten_tour,
        lkh.Ngay_bat_dau,
        lkh.Ngay_ket_thuc,
        lkh.So_cho
      FROM \`${await Booking.getBookingTableName()}\` b
      JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
      LEFT JOIN tai_khoan t_account ON kh.Id_user = t_account.Id_user
      JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
      JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
      JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
      WHERE b.Trang_thai_booking = 'Chờ thanh toán' 
         OR b.Trang_thai = 'Chờ thanh toán'
      ORDER BY b.Ngay_dat DESC
    `);
    
    return rows;
  }

  /**
   * Lấy chi tiết booking để xác nhận thanh toán
   * @param {string} bookingId - Booking ID
   * @returns {Object} - Booking details for payment confirmation
   */
  static async getBookingForPaymentConfirmation(bookingId) {
    const [bookings] = await pool.query(`
      SELECT 
        b.*,
        kh.Ten_khach_hang,
        t_account.Email,
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
      FROM \`${await Booking.getBookingTableName()}\` b
      JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
      LEFT JOIN tai_khoan t_account ON kh.Id_user = t_account.Id_user
      JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
      JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
      JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
      LEFT JOIN Khuyen_mai km ON b.Ma_khuyen_mai = km.Ma_km
      WHERE b.Ma_booking = ?
    `, [bookingId]);

    if (bookings.length === 0) {
      return null;
    }

    const booking = bookings[0];

    // Lấy danh sách dịch vụ đã đặt
    const [services] = await pool.query(`
      SELECT 
        dv.Ten_dich_vu,
        dv.Gia,
        ctdv.So_luong,
        ctdv.Thanh_tien
      FROM Chi_tiet_dich_vu ctdv
      JOIN Dich_vu dv ON ctdv.Ma_dich_vu = dv.Ma_dich_vu
      WHERE ctdv.Ma_booking = ?
    `, [bookingId]);

    // Tính toán chi tiết giá
    const giaNguoiLon = parseFloat(booking.Gia_nguoi_lon);
    const giaTreEm = parseFloat(booking.Gia_tre_em);
    const soNguoiLon = parseInt(booking.So_nguoi_lon);
    const soTreEm = parseInt(booking.So_tre_em);

    const tongTienNguoiLon = giaNguoiLon * soNguoiLon;
    const tongTienTreEm = giaTreEm * soTreEm;
    const tongTienTour = tongTienNguoiLon + tongTienTreEm;

    const tongTienDichVu = services.reduce((sum, service) => sum + parseFloat(service.Thanh_tien), 0);
    const tongTienTruocKhuyenMai = tongTienTour + tongTienDichVu;

    let giamGia = 0;
    if (booking.Ma_khuyen_mai && booking.Gia_tri_khuyen_mai) {
      giamGia = tongTienTruocKhuyenMai * (parseFloat(booking.Gia_tri_khuyen_mai) / 100);
    }

    const tongTienSauKhuyenMai = tongTienTruocKhuyenMai - giamGia;

    return {
      ...booking,
      chiTietGia: {
        giaNguoiLon,
        giaTreEm,
        soNguoiLon,
        soTreEm,
        tongTienNguoiLon,
        tongTienTreEm,
        tongTienTour,
        tongTienDichVu,
        tongTienTruocKhuyenMai,
        giamGia,
        tongTienSauKhuyenMai
      },
      services
    };
  }

  /**
   * Xác nhận thanh toán cho booking
   * @param {string} bookingId - Booking ID
   * @param {Object} paymentData - Payment confirmation data
   * @returns {Object} - Confirmation result
   */
  static async confirmPayment(bookingId, paymentData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const { phuong_thuc_thanh_toan = 'Admin xác nhận', ghi_chu } = paymentData;

      console.log('💰 Confirming payment for booking:', bookingId);

      // 1. Kiểm tra booking có tồn tại và đang chờ thanh toán
      const [bookings] = await connection.query(`
        SELECT 
          b.*,
          kh.Ten_khach_hang,
          t.Ten_tour,
          lkh.Ngay_bat_dau,
          lkh.Ngay_ket_thuc,
          lkh.So_cho
        FROM \`${await Booking.getBookingTableName()}\` b
        JOIN Khach_hang kh ON b.Ma_khach_hang = kh.Ma_khach_hang
        JOIN Chi_tiet_booking ctb ON b.Ma_booking = ctb.Ma_booking
        JOIN Lich_khoi_hanh lkh ON ctb.Ma_lich = lkh.Ma_lich
        JOIN Tour_du_lich t ON lkh.Ma_tour = t.Ma_tour
        WHERE b.Ma_booking = ? 
          AND (b.Trang_thai_booking = 'Chờ thanh toán' OR b.Trang_thai = 'Chờ thanh toán')
      `, [bookingId]);

      if (bookings.length === 0) {
        throw new Error('Không tìm thấy booking hoặc booking đã được xử lý');
      }

      const booking = bookings[0];

      // 2. Cập nhật trạng thái booking
      await connection.query(`
        UPDATE Booking 
        SET 
          Trang_thai_booking = 'Đã thanh toán',
          Trang_thai = 'Đã thanh toán',
          Phuong_thuc_thanh_toan = ?,
          Ngay_thanh_toan = NOW()
        WHERE Ma_booking = ?
      `, [phuong_thuc_thanh_toan, bookingId]);

      // 3. Tạo hóa đơn
      const maHoaDon = `HD${Date.now().toString().slice(-8)}`;
      await connection.query(`
        INSERT INTO Hoa_don (Ma_hoa_don, Ma_booking, Ngay_lap, Tong_tien, Trang_thai_hoa_don)
        VALUES (?, ?, NOW(), ?, 'Đã thanh toán')
      `, [maHoaDon, bookingId, booking.Tong_tien]);

      // 4. Tạo vé cho từng người
      const soNguoiLon = parseInt(booking.So_nguoi_lon);
      const soTreEm = parseInt(booking.So_tre_em);

      // Lấy giá vé từ tour
      const [tourInfo] = await connection.query(`
        SELECT Gia_nguoi_lon, Gia_tre_em 
        FROM Tour_du_lich t
        JOIN Lich_khoi_hanh lkh ON t.Ma_tour = lkh.Ma_tour
        JOIN Chi_tiet_booking ctb ON lkh.Ma_lich = ctb.Ma_lich
        WHERE ctb.Ma_booking = ?
      `, [bookingId]);

      const giaNguoiLon = parseFloat(tourInfo[0].Gia_nguoi_lon);
      const giaTreEm = parseFloat(tourInfo[0].Gia_tre_em);

      const veList = [];

      // Tạo vé cho người lớn
      for (let i = 1; i <= soNguoiLon; i++) {
        const soVe = `VE${Date.now()}${i}`;
        await connection.query(`
          INSERT INTO Ve (So_ve, Ma_booking, Ma_lich, Gia_ve, Trang_thai_ve)
          SELECT ?, ?, ctb.Ma_lich, ?, 'Chua_su_dung'
          FROM Chi_tiet_booking ctb
          WHERE ctb.Ma_booking = ?
        `, [soVe, bookingId, giaNguoiLon, bookingId]);
        
        veList.push({ So_ve: soVe, Gia_ve: giaNguoiLon, Trang_thai_ve: 'Chua_su_dung' });
      }

      // Tạo vé cho trẻ em
      for (let i = 1; i <= soTreEm; i++) {
        const soVe = `VE${Date.now()}${soNguoiLon + i}`;
        await connection.query(`
          INSERT INTO Ve (So_ve, Ma_booking, Ma_lich, Gia_ve, Trang_thai_ve)
          SELECT ?, ?, ctb.Ma_lich, ?, 'Chua_su_dung'
          FROM Chi_tiet_booking ctb
          WHERE ctb.Ma_booking = ?
        `, [soVe, bookingId, giaTreEm, bookingId]);
        
        veList.push({ So_ve: soVe, Gia_ve: giaTreEm, Trang_thai_ve: 'Chua_su_dung' });
      }

      // 5. Tạo bản ghi checkout
      const checkoutId = `CO${Date.now().toString().slice(-8)}`;
      await connection.query(`
        INSERT INTO Checkout (ID_checkout, Ma_booking, Phuong_thuc_thanh_toan, Ngay_tra, So_tien, Trang_thai)
        VALUES (?, ?, ?, NOW(), ?, 'Thành công')
      `, [checkoutId, bookingId, phuong_thuc_thanh_toan, booking.Tong_tien]);

      // 6. Cập nhật So_cho_con_lai trong database nếu cột tồn tại
      // Lấy Ma_lich từ booking
      const [lichInfo] = await connection.query(`
        SELECT Ma_lich 
        FROM Chi_tiet_booking 
        WHERE Ma_booking = ?
      `, [bookingId]);
      
      if (lichInfo.length > 0) {
        const maLich = lichInfo[0].Ma_lich;
        
        // Kiểm tra xem cột So_cho_con_lai có tồn tại không
        const [soChoConLaiColumn] = await connection.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'Lich_khoi_hanh' 
             AND COLUMN_NAME = 'So_cho_con_lai'`
        );
        
        if (soChoConLaiColumn.length > 0) {
          // Kiểm tra xem cột expires_at có tồn tại không
          const [expiresAtColumn] = await connection.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = 'Booking' 
               AND COLUMN_NAME = 'expires_at'`
          );
          const hasExpiresAt = expiresAtColumn.length > 0;
          
          // Tính lại số chỗ còn lại sau khi thanh toán
          const bookingCondition = hasExpiresAt ? 
            `(b.Trang_thai_booking = 'Đã thanh toán' OR (b.Trang_thai_booking = 'Chờ thanh toán' AND (b.expires_at IS NULL OR b.expires_at > NOW())))` :
            `(b.Trang_thai_booking = 'Đã thanh toán' OR (b.Trang_thai_booking = 'Chờ thanh toán' AND b.Ngay_dat > DATE_SUB(NOW(), INTERVAL 10 MINUTE)))`;
          
          const [updatedScheduleRows] = await connection.query(
            `SELECT 
               l.So_cho,
               COALESCE(SUM(
                 CASE 
                   WHEN ${bookingCondition}
                   THEN (b.So_nguoi_lon + b.So_tre_em)
                   ELSE 0
                 END
               ), 0) AS bookedSeats
             FROM Lich_khoi_hanh l
             LEFT JOIN Chi_tiet_booking cb ON cb.Ma_lich = l.Ma_lich
             LEFT JOIN Booking b ON b.Ma_booking = cb.Ma_booking
             WHERE l.Ma_lich = ?
             GROUP BY l.Ma_lich, l.So_cho`,
            [maLich]
          );
          
          if (updatedScheduleRows.length > 0) {
            const updatedSchedule = updatedScheduleRows[0];
            const newAvailableSeats = Math.max(0, updatedSchedule.So_cho - updatedSchedule.bookedSeats);
            
            await connection.query(
              `UPDATE Lich_khoi_hanh 
               SET So_cho_con_lai = ? 
               WHERE Ma_lich = ?`,
              [newAvailableSeats, maLich]
            );
            
            console.log(`✅ Đã cập nhật So_cho_con_lai trong database sau thanh toán: ${newAvailableSeats} cho lịch ${maLich}`);
          }
        }
      }

      await connection.commit();

      return {
        booking: booking,
        hoaDon: {
          maHoaDon,
          ngayLap: new Date().toISOString(),
          tongTien: booking.Tong_tien,
          trangThai: 'Đã thanh toán'
        },
        ve: {
          tongSoVe: veList.length,
          danhSachVe: veList
        },
        checkout: {
          checkoutId,
          phuongThucThanhToan: phuong_thuc_thanh_toan,
          ngayTra: new Date().toISOString(),
          trangThai: 'Thành công'
        }
      };

    } catch (error) {
      await connection.rollback();
      console.error('❌ Error confirming payment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update payment information for booking
   * @param {string} bookingId - Booking ID
   * @param {Object} paymentInfo - Payment information
   * @returns {boolean} - Success status
   */
  static async updatePaymentInfo(bookingId, paymentInfo) {
    try {
      const connection = await pool.getConnection();
      
      const updateFields = [];
      const values = [];
      
      if (paymentInfo.Phuong_thuc_thanh_toan) {
        updateFields.push('Phuong_thuc_thanh_toan = ?');
        values.push(paymentInfo.Phuong_thuc_thanh_toan);
      }
      
      if (paymentInfo.MoMo_request_id) {
        updateFields.push('MoMo_request_id = ?');
        values.push(paymentInfo.MoMo_request_id);
      }
      
      if (paymentInfo.MoMo_order_id) {
        updateFields.push('MoMo_order_id = ?');
        values.push(paymentInfo.MoMo_order_id);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No payment information to update');
      }
      
      values.push(bookingId);
      
      const query = `UPDATE Booking SET ${updateFields.join(', ')} WHERE Ma_booking = ?`;
      await connection.query(query, values);
      
      connection.release();
      return true;
    } catch (error) {
      console.error('Update payment info error:', error);
      throw error;
    }
  }

  /**
   * Update payment status for booking
   * @param {string} bookingId - Booking ID
   * @param {Object} paymentStatus - Payment status information
   * @param {Object} externalConnection - Database connection from outside (optional)
   * @returns {boolean} - Success status
   */
  static async updatePaymentStatus(bookingId, paymentStatus, externalConnection = null) {
    const useExternalConnection = externalConnection !== null;
    const connection = useExternalConnection ? externalConnection : await pool.getConnection();
    
    try {
      const updateFields = [];
      const values = [];
      
      if (paymentStatus.Trang_thai_booking) {
        updateFields.push('Trang_thai_booking = ?');
        values.push(paymentStatus.Trang_thai_booking);
      }
      
      if (paymentStatus.Trang_thai) {
        updateFields.push('Trang_thai = ?');
        values.push(paymentStatus.Trang_thai);
      }
      
      if (paymentStatus.Ngay_thanh_toan) {
        updateFields.push('Ngay_thanh_toan = ?');
        values.push(paymentStatus.Ngay_thanh_toan);
      }
      
      if (paymentStatus.MoMo_trans_id) {
        updateFields.push('MoMo_trans_id = ?');
        values.push(paymentStatus.MoMo_trans_id);
      }
      
      if (paymentStatus.MoMo_amount) {
        updateFields.push('MoMo_amount = ?');
        values.push(paymentStatus.MoMo_amount);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No payment status to update');
      }
      
      values.push(bookingId);
      
      const query = `UPDATE Booking SET ${updateFields.join(', ')} WHERE Ma_booking = ?`;
      await connection.query(query, values);
      
      if (!useExternalConnection) {
        connection.release();
      }
      return true;
    } catch (error) {
      console.error('Update payment status error:', error);
      if (!useExternalConnection) {
        connection.release();
      }
      throw error;
    }
  }
}

module.exports = Booking;
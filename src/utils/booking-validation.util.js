const db = require('./database');
const pool = require('./database');

/**
 * Service để kiểm tra và xác thực booking khi thanh toán
 */
class BookingValidationService {
  /**
   * Kiểm tra booking có hợp lệ để thanh toán không
   * @param {string} bookingId - Mã booking
   * @param {Object} externalConnection - Database connection từ bên ngoài (optional)
   * @returns {Object} - { isValid: boolean, booking: Object, error: string }
   */
  static async validateBookingForPayment(bookingId, externalConnection = null) {
    const useExternalConnection = externalConnection !== null;
    const connection = useExternalConnection ? externalConnection : await pool.getConnection();
    
    try {
      // Lấy thông tin booking
      const [bookings] = await connection.query(
        `SELECT b.*, cdb.Ma_lich
         FROM Booking b
         LEFT JOIN Chi_tiet_booking cdb ON b.Ma_booking = cdb.Ma_booking
         WHERE b.Ma_booking = ?`,
        [bookingId]
      );

      if (!bookings || bookings.length === 0) {
        return {
          isValid: false,
          booking: null,
          error: 'Không tìm thấy booking'
        };
      }

      const booking = bookings[0];

      // Kiểm tra trạng thái booking
      if (booking.Trang_thai_booking === 'Đã thanh toán') {
        return {
          isValid: false,
          booking: booking,
          error: 'Booking đã được thanh toán rồi'
        };
      }

      if (booking.Trang_thai_booking === 'Hủy' || booking.Trang_thai_booking === 'Da_huy') {
        return {
          isValid: false,
          booking: booking,
          error: 'Booking đã bị hủy'
        };
      }

      // Kiểm tra booking có hết hạn không
      if (booking.expires_at) {
        const expiresAt = new Date(booking.expires_at);
        const now = new Date();

        if (now > expiresAt) {
          return {
            isValid: false,
            booking: booking,
            error: 'Booking đã hết hạn thanh toán. Vui lòng đặt tour lại.'
          };
        }
      }

      // Kiểm tra trạng thái phải là "Chờ thanh toán"
      if (booking.Trang_thai_booking !== 'Chờ thanh toán') {
        return {
          isValid: false,
          booking: booking,
          error: `Booking không ở trạng thái "Chờ thanh toán". Trạng thái hiện tại: ${booking.Trang_thai_booking}`
        };
      }

      return {
        isValid: true,
        booking: booking,
        error: null
      };
    } catch (error) {
      console.error('Error validating booking:', error);
      return {
        isValid: false,
        booking: null,
        error: error.message
      };
    } finally {
      if (!useExternalConnection) {
        connection.release();
      }
    }
  }

  /**
   * Cập nhật trạng thái booking thành "Đã thanh toán"
   * Không cần trả lại chỗ vì đã tạm trừ từ đầu
   * @param {string} bookingId - Mã booking
   * @param {string} paymentMethod - Phương thức thanh toán
   * @param {Object} connection - Database connection (optional, nếu có sẽ dùng connection hiện tại)
   * @returns {boolean} - Success status
   */
  static async confirmPayment(bookingId, paymentMethod = 'Unknown', connection = null) {
    const useExternalConnection = connection !== null;
    const conn = connection || await pool.getConnection();

    try {
      if (!useExternalConnection) {
        await conn.beginTransaction();
      }

      // Kiểm tra booking hợp lệ trước (chỉ khi dùng connection mới)
      // Nếu dùng external connection, validation đã được kiểm tra ở ngoài
      if (!useExternalConnection) {
        const validation = await this.validateBookingForPayment(bookingId);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }
      }

      // Cập nhật trạng thái booking
      await conn.query(
        `UPDATE Booking 
         SET Trang_thai_booking = 'Đã thanh toán',
             Phuong_thuc_thanh_toan = ?,
             Ngay_thanh_toan = NOW(),
             expires_at = NULL
         WHERE Ma_booking = ?`,
        [paymentMethod, bookingId]
      );

      console.log(`✅ Đã cập nhật booking ${bookingId} thành "Đã thanh toán"`);

      if (!useExternalConnection) {
        await conn.commit();
      }

      return true;
    } catch (error) {
      if (!useExternalConnection) {
        await conn.rollback();
      }
      console.error('Error confirming payment:', error);
      throw error;
    } finally {
      if (!useExternalConnection) {
        conn.release();
      }
    }
  }
}

module.exports = BookingValidationService;


const cron = require('node-cron');
const BookingCleanupService = require('./booking-cleanup.util');
const Ticket = require('../schemas/ticket.schema');

/**
 * Service quản lý các cron job
 */
class CronService {
  /**
   * Khởi động tất cả cron jobs
   */
  static start() {
    console.log('⏰ [CRON] Đang khởi động cron jobs...');

    // Cron job: Hủy booking hết hạn mỗi 1 phút
    // Format: * * * * * (mỗi phút)
    cron.schedule('* * * * *', async () => {
      try {
        console.log('🕐 [CRON] Chạy job hủy booking hết hạn...');
        await BookingCleanupService.cancelExpiredBookings();
      } catch (error) {
        console.error('❌ [CRON] Lỗi khi chạy job hủy booking hết hạn:', error);
      }
    });

    console.log('✅ [CRON] Đã đăng ký job hủy booking hết hạn (chạy mỗi phút)');

    // Cron job: Đồng bộ số chỗ còn lại mỗi 5 phút (backup)
    // Format: */5 * * * * (mỗi 5 phút)
    cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('🔄 [CRON] Chạy job đồng bộ số chỗ còn lại...');
        await BookingCleanupService.syncAvailableSeats();
      } catch (error) {
        console.error('❌ [CRON] Lỗi khi chạy job đồng bộ số chỗ:', error);
      }
    });

    console.log('✅ [CRON] Đã đăng ký job đồng bộ số chỗ còn lại (chạy mỗi 5 phút)');

    // Cron job: Cập nhật trạng thái lịch khởi hành mỗi ngày lúc 00:00
    // Format: 0 0 * * * (00:00 mỗi ngày)
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('🕐 [CRON] Chạy job cập nhật trạng thái lịch khởi hành...');
        await BookingCleanupService.updateScheduleStatus();
      } catch (error) {
        console.error('❌ [CRON] Lỗi khi chạy job cập nhật trạng thái lịch khởi hành:', error);
      }
    });

    console.log('✅ [CRON] Đã đăng ký job cập nhật trạng thái lịch khởi hành (chạy mỗi ngày lúc 00:00)');

    // Cron job: Tự động cập nhật trạng thái vé đã hết hạn mỗi ngày lúc 01:00
    // Format: 0 1 * * * (01:00 mỗi ngày)
    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('🎫 [CRON] Chạy job tự động cập nhật trạng thái vé đã hết hạn...');
        const result = await Ticket.autoUpdateExpiredTickets();
        console.log(`✅ [CRON] Đã cập nhật ${result.updated} vé từ "Chưa sử dụng" thành "Đã sử dụng"`);
      } catch (error) {
        console.error('❌ [CRON] Lỗi khi chạy job tự động cập nhật trạng thái vé:', error);
      }
    });

    console.log('✅ [CRON] Đã đăng ký job tự động cập nhật trạng thái vé (chạy mỗi ngày lúc 01:00)');

    // Chạy ngay khi server khởi động để cập nhật vé đã hết hạn
    // (Chỉ chạy một lần khi server start, không phải cron job)
    setTimeout(async () => {
      try {
        console.log('🎫 [STARTUP] Chạy job tự động cập nhật trạng thái vé khi server khởi động...');
        const result = await Ticket.autoUpdateExpiredTickets();
        if (result.updated > 0) {
          console.log(`✅ [STARTUP] Đã cập nhật ${result.updated} vé từ "Chưa sử dụng" thành "Đã sử dụng" khi khởi động server`);
        } else {
          console.log('✅ [STARTUP] Không có vé nào cần cập nhật khi khởi động server');
        }
      } catch (error) {
        console.error('❌ [STARTUP] Lỗi khi chạy job tự động cập nhật trạng thái vé khi khởi động:', error);
      }
    }, 5000); // Chạy sau 5 giây khi server khởi động

    console.log('🎉 [CRON] Tất cả cron jobs đã được khởi động thành công!');
  }

  /**
   * Dừng tất cả cron jobs (nếu cần)
   */
  static stop() {
    console.log('⏹️ [CRON] Dừng tất cả cron jobs...');
    // node-cron tự động quản lý, không cần stop manual
  }
}

module.exports = CronService;


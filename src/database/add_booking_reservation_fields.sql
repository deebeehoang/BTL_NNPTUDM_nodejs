-- Migration script để thêm các trường cần thiết cho hệ thống đặt tour tạm giữ chỗ

-- 1. Thêm trường expires_at vào bảng Booking để lưu thời gian hết hạn
ALTER TABLE Booking 
ADD COLUMN IF NOT EXISTS expires_at DATETIME NULL COMMENT 'Thời gian hết hạn booking (10 phút sau khi tạo)';

-- 2. Thêm trường So_cho_con_lai vào bảng Lich_khoi_hanh để lưu số chỗ còn lại
-- Nếu đã có thì bỏ qua, nếu chưa có thì thêm
ALTER TABLE Lich_khoi_hanh 
ADD COLUMN IF NOT EXISTS So_cho_con_lai INT NULL COMMENT 'Số chỗ còn lại (tính toán từ So_cho - số chỗ đã đặt)';

-- 3. Cập nhật So_cho_con_lai cho tất cả lịch khởi hành hiện có
UPDATE Lich_khoi_hanh l
SET So_cho_con_lai = l.So_cho - COALESCE((
    SELECT SUM(b.So_nguoi_lon + b.So_tre_em)
    FROM Chi_tiet_booking cdb
    JOIN Booking b ON cdb.Ma_booking = b.Ma_booking
    WHERE cdb.Ma_lich = l.Ma_lich 
      AND b.Trang_thai_booking NOT IN ('Da_huy', 'Hủy')
), 0);

-- 4. Đảm bảo So_cho_con_lai không âm
UPDATE Lich_khoi_hanh 
SET So_cho_con_lai = GREATEST(So_cho_con_lai, 0) 
WHERE So_cho_con_lai < 0;

-- 5. Tạo index để tối ưu query
CREATE INDEX IF NOT EXISTS idx_booking_expires_at ON Booking(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_trang_thai ON Booking(Trang_thai_booking);
CREATE INDEX IF NOT EXISTS idx_lich_so_cho_con_lai ON Lich_khoi_hanh(So_cho_con_lai);

-- 6. Thêm comment cho các trạng thái booking
-- Trạng thái có thể là: 'Chờ thanh toán', 'Đã thanh toán', 'Da_huy', 'Hủy', 'Het_han'


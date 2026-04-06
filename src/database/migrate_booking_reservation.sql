-- Migration script để thêm các trường cần thiết cho hệ thống đặt tour tạm giữ chỗ
-- Chạy script này để cập nhật database

USE travel_test003;

-- 1. Thêm trường expires_at vào bảng Booking (nếu chưa có)
SET @dbname = DATABASE();
SET @tablename = 'Booking';
SET @columnname = 'expires_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATETIME NULL COMMENT ''Thời gian hết hạn booking (10 phút sau khi tạo)''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Thêm trường So_cho_con_lai vào bảng Lich_khoi_hanh (nếu chưa có)
SET @tablename = 'Lich_khoi_hanh';
SET @columnname = 'So_cho_con_lai';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL COMMENT ''Số chỗ còn lại (tính toán từ So_cho - số chỗ đã đặt)''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

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
SET So_cho_con_lai = GREATEST(COALESCE(So_cho_con_lai, So_cho), 0) 
WHERE So_cho_con_lai IS NULL OR So_cho_con_lai < 0;

-- 5. Đảm bảo So_cho_con_lai không NULL (set giá trị mặc định)
UPDATE Lich_khoi_hanh 
SET So_cho_con_lai = So_cho 
WHERE So_cho_con_lai IS NULL;

-- 6. Tạo index để tối ưu query (nếu chưa có)
-- Kiểm tra và tạo index cho expires_at
SET @indexname = 'idx_booking_expires_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_schema = @dbname)
      AND (table_name = 'Booking')
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON Booking(expires_at)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Kiểm tra và tạo index cho Trang_thai_booking
SET @indexname = 'idx_booking_trang_thai';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_schema = @dbname)
      AND (table_name = 'Booking')
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON Booking(Trang_thai_booking)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Kiểm tra và tạo index cho So_cho_con_lai
SET @indexname = 'idx_lich_so_cho_con_lai';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_schema = @dbname)
      AND (table_name = 'Lich_khoi_hanh')
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON Lich_khoi_hanh(So_cho_con_lai)')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

SELECT 'Migration completed successfully!' AS Status;


-- Migration script để thêm trường Trang_thai vào bảng Lich_khoi_hanh
-- Trạng thái: 'Còn chỗ', 'Hết chỗ', 'Đang diễn ra', 'Đã diễn ra'

USE travel_test003;

-- 1. Thêm trường Trang_thai vào bảng Lich_khoi_hanh (nếu chưa có)
SET @dbname = DATABASE();
SET @tablename = 'Lich_khoi_hanh';
SET @columnname = 'Trang_thai';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) DEFAULT NULL COMMENT ''Trạng thái lịch khởi hành: Còn chỗ, Hết chỗ, Đang diễn ra, Đã diễn ra''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Cập nhật trạng thái ban đầu cho tất cả lịch khởi hành hiện có
-- Dựa vào So_cho_con_lai và ngày tháng
UPDATE Lich_khoi_hanh
SET Trang_thai = 
  CASE
    WHEN CURDATE() < Ngay_bat_dau THEN 
      CASE WHEN COALESCE(So_cho_con_lai, So_cho) > 0 THEN 'Còn chỗ' ELSE 'Hết chỗ' END
    WHEN CURDATE() = Ngay_bat_dau THEN 'Đang diễn ra'
    WHEN CURDATE() > Ngay_ket_thuc THEN 'Đã diễn ra'
    ELSE 
      CASE WHEN COALESCE(So_cho_con_lai, So_cho) > 0 THEN 'Còn chỗ' ELSE 'Hết chỗ' END
  END
WHERE Trang_thai IS NULL;

-- 3. Tạo index để tối ưu query theo trạng thái
CREATE INDEX IF NOT EXISTS idx_lich_trang_thai ON Lich_khoi_hanh(Trang_thai);
CREATE INDEX IF NOT EXISTS idx_lich_ngay_bat_dau ON Lich_khoi_hanh(Ngay_bat_dau);
CREATE INDEX IF NOT EXISTS idx_lich_ngay_ket_thuc ON Lich_khoi_hanh(Ngay_ket_thuc);


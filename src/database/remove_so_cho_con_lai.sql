-- Script để xóa cột So_cho_con_lai nếu đã thêm (rollback)
-- Chỉ chạy nếu bạn muốn quay lại cách tính toán trực tiếp

USE travel_test003;

-- Xóa cột So_cho_con_lai nếu đã có
SET @dbname = DATABASE();
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
  CONCAT('ALTER TABLE ', @tablename, ' DROP COLUMN ', @columnname),
  'SELECT 1'
));
PREPARE dropColumnIfExists FROM @preparedStatement;
EXECUTE dropColumnIfExists;
DEALLOCATE PREPARE dropColumnIfExists;

-- Xóa index nếu có
DROP INDEX IF EXISTS idx_lich_so_cho_con_lai ON Lich_khoi_hanh;

SELECT 'Column So_cho_con_lai removed successfully!' AS Status;




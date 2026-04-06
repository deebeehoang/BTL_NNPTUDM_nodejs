-- Thêm cột status vào bảng Tai_khoan để quản lý trạng thái tài khoản
-- Chạy file này trong MySQL để cập nhật schema

ALTER TABLE Tai_khoan
ADD COLUMN status VARCHAR(20) DEFAULT 'Active' COMMENT 'Trạng thái tài khoản: Active hoặc Blocked';

-- Tạo index cho status để tìm kiếm nhanh hơn
CREATE INDEX idx_status ON Tai_khoan(status);

-- Cập nhật tất cả tài khoản hiện có thành Active
UPDATE Tai_khoan SET status = 'Active' WHERE status IS NULL;

-- Kiểm tra kết quả
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Tai_khoan' 
AND COLUMN_NAME = 'status';


-- Thêm các cột mới vào bảng Tai_khoan để hỗ trợ đăng nhập Google
-- Chạy file này trong MySQL để cập nhật schema

ALTER TABLE Tai_khoan
ADD COLUMN google_id VARCHAR(255) NULL COMMENT 'Mã người dùng Google',
ADD COLUMN ten_hien_thi VARCHAR(255) NULL COMMENT 'Tên hiển thị từ Google',
ADD COLUMN anh_dai_dien VARCHAR(500) NULL COMMENT 'Ảnh đại diện từ Google';

-- Tạo index cho google_id để tìm kiếm nhanh hơn
CREATE INDEX idx_google_id ON Tai_khoan(google_id);

-- Kiểm tra kết quả
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Tai_khoan' 
AND COLUMN_NAME IN ('google_id', 'ten_hien_thi', 'anh_dai_dien');


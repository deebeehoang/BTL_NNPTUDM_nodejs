-- Script để cập nhật lại dữ liệu bảng Tour_du_lich
USE travel_test001;

-- Tạm thời tắt kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 0;

-- Xóa dữ liệu hiện tại trong bảng Tour_du_lich 
DELETE FROM Tour_du_lich;

-- Dữ liệu mẫu cho bảng Tour_du_lich
INSERT INTO Tour_du_lich (Ma_tour, Ten_tour, Thoi_gian, Tinh_trang, Loai_tour, Gia_co_ban, Hinh_anh) VALUES
('TOUR001', 'Du lịch Đà Nẵng - Hội An - Huế 5 ngày 4 đêm', 5, 'Còn chỗ', 'trong_nuoc', 5000000, 'images/tours/danang.jpg'),
('TOUR002', 'Du lịch Hạ Long - Ninh Bình 4 ngày 3 đêm', 4, 'Còn chỗ', 'trong_nuoc', 4500000, 'images/tours/halong.jpg'),
('TOUR003', 'Du lịch Phú Quốc 3 ngày 2 đêm', 3, 'Sắp mở', 'trong_nuoc', 3500000, 'images/tours/phuquoc.jpg'),
('TOUR004', 'Du lịch Thailand 5 ngày 4 đêm', 5, 'Còn chỗ', 'nuoc_ngoai', 8000000, 'images/tours/thailand.jpg'),
('TOUR005', 'Du lịch Singapore - Malaysia 6 ngày 5 đêm', 6, 'Hết chỗ', 'nuoc_ngoai', 12000000, 'images/tours/singapore.jpg'),
('TOUR006', 'Du lịch Nhật Bản 7 ngày 6 đêm', 7, 'Còn chỗ', 'nuoc_ngoai', 25000000, 'images/tours/japan.jpg'),
('TOUR007', 'Du lịch Đà Lạt 3 ngày 2 đêm', 3, 'Còn chỗ', 'trong_nuoc', 2500000, 'images/tours/dalat.jpg'),
('TOUR008', 'Du lịch Sapa - Fansipan 4 ngày 3 đêm', 4, 'Còn chỗ', 'trong_nuoc', 3800000, 'images/tours/sapa.jpg'),
('TOUR009', 'Du lịch Quy Nhơn - Phú Yên 4 ngày 3 đêm', 4, 'Còn chỗ', 'trong_nuoc', 4200000, 'images/tours/quynhon.jpg'),
('TOUR010', 'Du lịch Hàn Quốc 5 ngày 4 đêm', 5, 'Còn chỗ', 'nuoc_ngoai', 15000000, 'images/tours/korea.jpg');

-- Bật lại kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 1; 
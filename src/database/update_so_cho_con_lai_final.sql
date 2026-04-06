-- Script để cập nhật lại So_cho_con_lai cho tất cả lịch khởi hành
-- Dựa trên logic: So_cho_con_lai = So_cho - bookedSeats
-- bookedSeats = tổng số chỗ từ booking "Đã thanh toán" + booking "Chờ thanh toán" chưa hết hạn

USE travel_test003;

-- ============================================
-- PHẦN 1: Nếu database CÓ cột expires_at
-- ============================================
-- Chạy phần này nếu database có cột expires_at trong bảng Booking

-- Tạo bảng tạm để tính bookedSeats (với expires_at)
DROP TEMPORARY TABLE IF EXISTS temp_booked_seats;

CREATE TEMPORARY TABLE temp_booked_seats AS
SELECT 
  cb.Ma_lich,
  COALESCE(SUM(
    CASE 
      -- Tính booking "Đã thanh toán"
      WHEN b.Trang_thai_booking = 'Đã thanh toán' THEN (b.So_nguoi_lon + b.So_tre_em)
      -- Tính booking "Chờ thanh toán" chưa hết hạn (expires_at IS NULL hoặc expires_at > NOW())
      WHEN b.Trang_thai_booking = 'Chờ thanh toán' 
           AND (b.expires_at IS NULL OR b.expires_at > NOW()) 
      THEN (b.So_nguoi_lon + b.So_tre_em)
      ELSE 0
    END
  ), 0) AS bookedSeats
FROM Chi_tiet_booking cb
LEFT JOIN Booking b ON cb.Ma_booking = b.Ma_booking
GROUP BY cb.Ma_lich;

-- Cập nhật So_cho_con_lai
UPDATE Lich_khoi_hanh l
LEFT JOIN temp_booked_seats t ON t.Ma_lich = l.Ma_lich
SET l.So_cho_con_lai = GREATEST(0, l.So_cho - COALESCE(t.bookedSeats, 0));

-- Xóa bảng tạm
DROP TEMPORARY TABLE IF EXISTS temp_booked_seats;

-- ============================================
-- PHẦN 2: Nếu database KHÔNG có cột expires_at
-- ============================================
-- Chạy phần này nếu database KHÔNG có cột expires_at trong bảng Booking
-- (Bỏ qua phần này nếu đã chạy phần 1)

/*
-- Tạo bảng tạm để tính bookedSeats (không có expires_at)
DROP TEMPORARY TABLE IF EXISTS temp_booked_seats;

CREATE TEMPORARY TABLE temp_booked_seats AS
SELECT 
  cb.Ma_lich,
  COALESCE(SUM(
    CASE 
      -- Tính booking "Đã thanh toán"
      WHEN b.Trang_thai_booking = 'Đã thanh toán' THEN (b.So_nguoi_lon + b.So_tre_em)
      -- Tính booking "Chờ thanh toán" trong 10 phút gần nhất
      WHEN b.Trang_thai_booking = 'Chờ thanh toán' 
           AND b.Ngay_dat > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
      THEN (b.So_nguoi_lon + b.So_tre_em)
      ELSE 0
    END
  ), 0) AS bookedSeats
FROM Chi_tiet_booking cb
LEFT JOIN Booking b ON cb.Ma_booking = b.Ma_booking
GROUP BY cb.Ma_lich;

-- Cập nhật So_cho_con_lai
UPDATE Lich_khoi_hanh l
LEFT JOIN temp_booked_seats t ON t.Ma_lich = l.Ma_lich
SET l.So_cho_con_lai = GREATEST(0, l.So_cho - COALESCE(t.bookedSeats, 0));

-- Xóa bảng tạm
DROP TEMPORARY TABLE IF EXISTS temp_booked_seats;
*/

-- ============================================
-- PHẦN 3: Hiển thị kết quả để kiểm tra
-- ============================================
SELECT 
  l.Ma_lich,
  l.Ma_tour,
  l.So_cho,
  l.So_cho_con_lai AS So_cho_con_lai_updated,
  COALESCE(booked.bookedSeats, 0) AS bookedSeats,
  (l.So_cho - COALESCE(booked.bookedSeats, 0)) AS calculatedAvailableSeats,
  CASE 
    WHEN l.So_cho_con_lai = (l.So_cho - COALESCE(booked.bookedSeats, 0)) THEN '✅ Đúng'
    ELSE '❌ Sai'
  END AS Status
FROM Lich_khoi_hanh l
LEFT JOIN (
  SELECT 
    cb.Ma_lich,
    COALESCE(SUM(
      CASE 
        WHEN b.Trang_thai_booking = 'Đã thanh toán' THEN (b.So_nguoi_lon + b.So_tre_em)
        WHEN b.Trang_thai_booking = 'Chờ thanh toán' 
             AND (b.expires_at IS NULL OR b.expires_at > NOW())
        THEN (b.So_nguoi_lon + b.So_tre_em)
        ELSE 0
      END
    ), 0) AS bookedSeats
  FROM Chi_tiet_booking cb
  LEFT JOIN Booking b ON cb.Ma_booking = b.Ma_booking
  GROUP BY cb.Ma_lich
) AS booked ON booked.Ma_lich = l.Ma_lich
ORDER BY l.Ma_lich;

SELECT 'So_cho_con_lai đã được cập nhật thành công!' AS Status;


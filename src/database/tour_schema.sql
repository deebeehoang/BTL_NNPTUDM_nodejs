CREATE DATABASE IF NOT EXISTS travel_test003 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE travel_test003;

CREATE TABLE Tai_khoan (
    Id_user VARCHAR(50) NOT NULL PRIMARY KEY,
    Password VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL,
    Loai_tai_khoan VARCHAR(20) NOT NULL CHECK (Loai_tai_khoan IN ('Admin', 'Khach_hang'))
);


CREATE TABLE Admin (
    Id_admin VARCHAR(50) NOT NULL PRIMARY KEY,
    Id_user VARCHAR(50) NOT NULL UNIQUE,
    Ten VARCHAR(50) NOT NULL,
    FOREIGN KEY (Id_user) REFERENCES Tai_khoan(Id_user)
);

CREATE TABLE Khach_hang (
    Ma_khach_hang VARCHAR(20) NOT NULL PRIMARY KEY,
    Id_user VARCHAR(50) NOT NULL UNIQUE,
    Ten_khach_hang VARCHAR(50) NOT NULL,
    Ngay_sinh DATE NOT NULL,
    Gioi_tinh VARCHAR(10) NOT NULL,
    Dia_chi VARCHAR(100) NOT NULL,
    Cccd VARCHAR(15) NOT NULL,
    FOREIGN KEY (Id_user) REFERENCES Tai_khoan(Id_user)
);

CREATE TABLE Khuyen_mai (
    Ma_km VARCHAR(50) PRIMARY KEY,
    Ten_km VARCHAR(100),
    Mo_ta TEXT,
    Gia_tri DECIMAL(10,2),
    Ngay_bat_dau DATE,
    Ngay_ket_thuc DATE
);

CREATE TABLE Tour_du_lich (
    Ma_tour VARCHAR(50) NOT NULL PRIMARY KEY,
    Ten_tour VARCHAR(100) NOT NULL,
    Thoi_gian INT NOT NULL,
    Tinh_trang VARCHAR(20) NOT NULL,
    Gia_nguoi_lon DECIMAL(18,2) NOT NULL,
    Gia_tre_em DECIMAL(18,2) NOT NULL,
    Loai_tour VARCHAR(50) NOT NULL DEFAULT 'trong_nuoc' CHECK (Loai_tour IN ('trong_nuoc', 'nuoc_ngoai')),
    Hinh_anh VARCHAR(255) NULL,
    Mo_ta VARCHAR(255) NULL
);

CREATE TABLE Lich_khoi_hanh (
    Ma_lich VARCHAR(50) NOT NULL PRIMARY KEY,
    Ma_tour VARCHAR(50) NOT NULL,
    Ngay_bat_dau DATE NOT NULL,
    Ngay_ket_thuc DATE NOT NULL,
    So_cho INT NOT NULL,
    FOREIGN KEY (Ma_tour) REFERENCES Tour_du_lich(Ma_tour)
);

CREATE TABLE Dia_danh (
    Ma_dia_danh VARCHAR(20) NOT NULL PRIMARY KEY,
    Ten_dia_danh VARCHAR(50) NOT NULL,
    Mo_ta VARCHAR(500) NOT NULL,
    Hinh_anh VARCHAR(255) NULL  
);

CREATE TABLE Chi_tiet_tour_dia_danh (
    Ma_tour VARCHAR(50) NOT NULL,
    Ma_dia_danh VARCHAR(20) NOT NULL,
    Thu_tu INT NOT NULL,
    PRIMARY KEY (Ma_tour, Ma_dia_danh),
    FOREIGN KEY (Ma_tour) REFERENCES Tour_du_lich(Ma_tour),
    FOREIGN KEY (Ma_dia_danh) REFERENCES Dia_danh(Ma_dia_danh)
);

CREATE TABLE Booking (
    Ma_booking VARCHAR(50) NOT NULL PRIMARY KEY,
    Ngay_dat DATETIME NOT NULL,
    So_nguoi_lon INT NOT NULL,
    So_tre_em INT NOT NULL,
    Ma_khuyen_mai VARCHAR(50) NULL,
    Trang_thai_booking VARCHAR(20) NOT NULL,
    Tong_tien DECIMAL(18,2) NOT NULL,
    Ma_khach_hang VARCHAR(20) NOT NULL,
    Id_user VARCHAR(50) NOT NULL,
    FOREIGN KEY (Ma_khuyen_mai) REFERENCES Khuyen_mai(Ma_km),
    FOREIGN KEY (Ma_khach_hang) REFERENCES Khach_hang(Ma_khach_hang),
    FOREIGN KEY (Id_user) REFERENCES Tai_khoan(Id_user)
);

CREATE TABLE Chi_tiet_booking (
    Ma_booking VARCHAR(50) NOT NULL,
    Ma_lich VARCHAR(50) NOT NULL,
    PRIMARY KEY (Ma_booking, Ma_lich),
    FOREIGN KEY (Ma_booking) REFERENCES Booking(Ma_booking),
    FOREIGN KEY (Ma_lich) REFERENCES Lich_khoi_hanh(Ma_lich)
);

CREATE TABLE Ve (
    So_ve VARCHAR(50) NOT NULL PRIMARY KEY,
    Ma_booking VARCHAR(50) NOT NULL,
    Ma_lich VARCHAR(50) NOT NULL,
    Gia_ve DECIMAL(18, 2) NOT NULL,
    Trang_thai_ve VARCHAR(20) DEFAULT 'Chua_su_dung' 
    CHECK (Trang_thai_ve IN ('Chua_su_dung', 'Da_su_dung', 'Da_huy')),
    FOREIGN KEY (Ma_booking) REFERENCES Booking(Ma_booking),
    FOREIGN KEY (Ma_lich) REFERENCES Lich_khoi_hanh(Ma_lich)
);

CREATE TABLE Dich_vu (
    Ma_dich_vu VARCHAR(50) NOT NULL PRIMARY KEY,
    Ten_dich_vu VARCHAR(100) NOT NULL,
    Mo_ta VARCHAR(500) NULL,
    Gia DECIMAL(18,2) NOT NULL
);

CREATE TABLE Chi_tiet_dich_vu (
    Ma_booking VARCHAR(50) NOT NULL,
    Ma_dich_vu VARCHAR(50) NOT NULL,
    So_luong INT NOT NULL,
    Thanh_tien DECIMAL(18,2) NOT NULL,
    PRIMARY KEY (Ma_booking, Ma_dich_vu),
    FOREIGN KEY (Ma_booking) REFERENCES Booking(Ma_booking),
    FOREIGN KEY (Ma_dich_vu) REFERENCES Dich_vu(Ma_dich_vu)
);

CREATE TABLE Hoa_don (
    Ma_hoa_don VARCHAR(20) NOT NULL PRIMARY KEY,
    Ma_booking VARCHAR(50) NOT NULL,
    Ngay_lap DATETIME NOT NULL,
    Tong_tien DECIMAL(18,2) NOT NULL,
    Trang_thai_hoa_don VARCHAR(20) NOT NULL,
    FOREIGN KEY (Ma_booking) REFERENCES Booking(Ma_booking)
);

CREATE TABLE Checkout (
    ID_checkout VARCHAR(50) NOT NULL PRIMARY KEY,
    Ma_booking VARCHAR(50) NOT NULL,
    Phuong_thuc_thanh_toan VARCHAR(50) NOT NULL,
    Ngay_tra DATETIME NOT NULL,
    So_tien DECIMAL(18,2) NOT NULL,
    Trang_thai VARCHAR(20) NOT NULL,
    FOREIGN KEY (Ma_booking) REFERENCES Booking(Ma_booking)
);

CREATE TABLE Yeu_cau_huy (
    Ma_yeu_cau VARCHAR(50) NOT NULL PRIMARY KEY,
    Ma_booking VARCHAR(50) NOT NULL,
    Ngay_yeu_cau DATETIME NOT NULL,
    Ly_do TEXT,
    Trang_thai VARCHAR(20) NOT NULL DEFAULT 'Dang_xu_ly' CHECK (Trang_thai IN ('Dang_xu_ly', 'Da_chap_nhan', 'Da_tu_choi')),
    Ly_do_tu_choi TEXT,
    Ngay_xu_ly DATETIME,
    Id_admin VARCHAR(50),
    FOREIGN KEY (Ma_booking) REFERENCES Booking(Ma_booking),
    FOREIGN KEY (Id_admin) REFERENCES Admin(Id_admin)
);

CREATE TABLE Danh_gia (
    Id_review INT AUTO_INCREMENT PRIMARY KEY,
    Ma_tour VARCHAR(50),
    Ma_khach_hang VARCHAR(20),
    So_sao INT CHECK (So_sao BETWEEN 1 AND 5),
    Binh_luan TEXT,
    Ngay_danh_gia DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Ma_tour) REFERENCES Tour_du_lich(Ma_tour),
    FOREIGN KEY (Ma_khach_hang) REFERENCES Khach_hang(Ma_khach_hang)
);

CREATE TABLE Tin_nhan ( 
    Id_tin INT NOT NULL AUTO_INCREMENT,
    Id_nguoi_gui VARCHAR(50) NOT NULL,
    Id_nguoi_nhan VARCHAR(50) NOT NULL,
    Noi_dung TEXT,
    Thoi_gian DATETIME DEFAULT CURRENT_TIMESTAMP,
    Da_doc BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (Id_tin),
    FOREIGN KEY (Id_nguoi_gui) 
        REFERENCES Tai_khoan(Id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (Id_nguoi_nhan) 
        REFERENCES Tai_khoan(Id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT
);
ALTER TABLE Booking 
ADD COLUMN Trang_thai VARCHAR(50) DEFAULT 'Chờ thanh toán',
ADD COLUMN Phuong_thuc_thanh_toan VARCHAR(50),
ADD COLUMN Ngay_thanh_toan DATETIME;


ALTER TABLE tour_du_lich
ADD COLUMN IF NOT EXISTS Diem_danh_gia_trung_binh DECIMAL(3,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS So_luong_danh_gia INT DEFAULT 0;

ALTER TABLE danh_gia 
ADD COLUMN IF NOT EXISTS Diem_dich_vu INT DEFAULT 0 CHECK (Diem_dich_vu BETWEEN 0 AND 5),
ADD COLUMN IF NOT EXISTS Diem_huong_dan_vien INT DEFAULT 0 CHECK (Diem_huong_dan_vien BETWEEN 0 AND 5),
ADD COLUMN IF NOT EXISTS Diem_phuong_tien INT DEFAULT 0 CHECK (Diem_phuong_tien BETWEEN 0 AND 5),
ADD COLUMN IF NOT EXISTS Diem_gia_ca INT DEFAULT 0 CHECK (Diem_gia_ca BETWEEN 0 AND 5),
ADD COLUMN IF NOT EXISTS Hinh_anh TEXT NULL,
ADD COLUMN IF NOT EXISTS Ma_booking VARCHAR(50) NULL AFTER Ma_khach_hang;


UPDATE tour_du_lich
SET Diem_danh_gia_trung_binh = 5.00,
    So_luong_danh_gia = 0
WHERE Diem_danh_gia_trung_binh IS NULL;
ALTER TABLE Booking
ADD COLUMN MoMo_request_id VARCHAR(255) NULL,
ADD COLUMN MoMo_order_id VARCHAR(255) NULL,
ADD COLUMN MoMo_trans_id VARCHAR(255) NULL,
ADD COLUMN MoMo_amount DECIMAL(18,2) NULL;
-- ======================
-- DỮ LIỆU MẪU
-- ======================
INSERT INTO Tai_khoan VALUES ('admin01', 'hashed_password_1', 'admin@example.com', 'Admin');
INSERT INTO Tai_khoan VALUES ('user01', 'hashed_password_2', 'khach1@example.com', 'Khach_hang');

INSERT INTO Admin VALUES ('ad01', 'admin01', 'Nguyễn Văn A');
INSERT INTO Khach_hang VALUES ('kh01', 'user01', 'Lê Thị B', '1995-05-20', 'Nữ', '123 Lê Lợi, TP.HCM', '123456789012');

INSERT INTO Tour_du_lich (Ma_tour, Ten_tour, Thoi_gian, Tinh_trang, Loai_tour, Gia_nguoi_lon, Gia_tre_em, Hinh_anh) 
VALUES ('T001', 'Tour Đà Lạt 3N2Đ', 3, 'Còn chỗ', 'trong_nuoc', 1500000, 0, NULL);

INSERT INTO Lich_khoi_hanh VALUES ('LKH001', 'T001', '2025-05-01', '2025-05-03', 40);

INSERT INTO Dia_danh VALUES ('DD01', 'Thung Lũng Tình Yêu', 'Địa danh nổi tiếng tại Đà Lạt', NULL);
INSERT INTO Dia_danh VALUES ('DD02', 'Đồi Chè Cầu Đất', 'Điểm check-in hot tại Đà Lạt', NULL);
INSERT INTO Chi_tiet_tour_dia_danh VALUES ('T001', 'DD01', 1);
INSERT INTO Chi_tiet_tour_dia_danh VALUES ('T001', 'DD02', 2);

INSERT INTO Booking 
(Ma_booking, Ngay_dat, So_nguoi_lon, So_tre_em, Ma_khuyen_mai, Trang_thai_booking, Tong_tien, Ma_khach_hang, Id_user)
VALUES ('B001', CURRENT_TIMESTAMP, 2, 1, NULL, 'Chờ thanh toán', 4000000, 'kh01', 'user01');

INSERT INTO Chi_tiet_booking VALUES ('B001', 'LKH001');

INSERT INTO Ve (So_ve, Ma_booking, Ma_lich, Gia_ve, Trang_thai_ve) 
VALUES ('VE001', 'B001', 'LKH001', 2000000, 'Chua_su_dung'),
       ('VE002', 'B001', 'LKH001', 2000000, 'Chua_su_dung');

INSERT INTO Dich_vu VALUES 
('DV001', 'Đưa đón sân bay', 'Dịch vụ đưa đón tận nơi', 300000),
('DV002', 'Bữa ăn đặc biệt', 'Bữa ăn dành riêng cho khách VIP', 500000);

INSERT INTO Chi_tiet_dich_vu VALUES 
('B001', 'DV001', 1, 300000),
('B001', 'DV002', 2, 1000000);




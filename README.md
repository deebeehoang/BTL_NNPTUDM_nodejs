# Travel Website - Hướng dẫn cài đặt và sử dụng

Đây là một website quản lý tour du lịch được phát triển bằng Node.js và MySQL.

## Yêu cầu hệ thống

- Node.js (v14.0.0 trở lên)
- MySQL (v5.7 trở lên)
- npm hoặc yarn

## Cài đặt

1. **Clone repository**

```bash
git clone <repository-url>
cd travel-website
```

2. **Cài đặt các phụ thuộc**

```bash
npm install
```

3. **Cấu hình cơ sở dữ liệu**

- Tạo cơ sở dữ liệu MySQL
- Cập nhật thông tin kết nối trong file `.env`

```
# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root          # Cập nhật username
DB_PASSWORD=          # Cập nhật password
DB_NAME=travel_test001

# Authentication Configuration
JWT_SECRET=your_jwt_secret_key
```

4. **Khởi tạo cơ sở dữ liệu**

Sử dụng file SQL có sẵn để tạo schema và dữ liệu mẫu:

```bash
mysql -u root -p < src/database/tour_schema.sql
```

Hoặc mở MySQL Workbench và thực thi nội dung của file `src/database/tour_schema.sql`

## Chạy ứng dụng

```bash
npm start
```

Sau khi chạy, ứng dụng sẽ được khởi động tại `http://localhost:3000`

## Tài khoản mẫu

1. **Tài khoản Admin**
   - Tên đăng nhập: admin01
   - Mật khẩu: hashed_password_1

2. **Tài khoản Người dùng**
   - Tên đăng nhập: user01
   - Mật khẩu: hashed_password_2
   - Tên đăng nhập: user02
   - Mật khẩu: hashed_password_2

## Cấu trúc thư mục

- `public/`: Giao diện người dùng, HTML, CSS, JS
- `src/`: Mã nguồn phía server
  - `config/`: Cấu hình ứng dụng và database
  - `controllers/`: Xử lý logic
  - `middlewares/`: Các middleware
  - `models/`: Các model tương tác với database
  - `routes/`: Định nghĩa các route API
  - `database/`: Schema và dữ liệu mẫu

## Chức năng chính

1. **Quản lý Tour**
   - Xem danh sách tour
   - Tìm kiếm tour
   - Thêm/sửa/xóa tour (Admin)

2. **Quản lý Đặt Tour**
   - Đặt tour
   - Theo dõi trạng thái đặt tour
   - Hủy tour

3. **Quản lý Người dùng**
   - Đăng ký, đăng nhập
   - Quản lý thông tin cá nhân

## Lưu ý khi gặp lỗi:

Nếu gặp lỗi "Error: ER_NOT_SUPPORTED_AUTH_MODE: Client does not support authentication protocol requested by server; consider upgrading MySQL client", hãy thực hiện lệnh sau trong MySQL:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
FLUSH PRIVILEGES;
```

Thay `password` bằng mật khẩu của bạn.

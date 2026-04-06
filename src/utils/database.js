const mysql = require('mysql2/promise');
const config = require('./config');

// Tạo một mock pool object cho trường hợp MySQL không khả dụng
const createMockPool = () => {
  console.warn('⚠️ Sử dụng mock database pool vì không thể kết nối đến MySQL');
  
  // Tạo một đối tượng giả lập các phương thức của pool
  return {
    query: async () => {
      console.warn('⚠️ Đang sử dụng mock database - không có kết nối thực đến MySQL');
      return [[], []]; // Trả về mảng rỗng cho tất cả các truy vấn
    },
    getConnection: async () => {
      console.warn('⚠️ Đang sử dụng mock connection - không có kết nối thực đến MySQL');
      return {
        query: async () => [[], []],
        release: () => console.log('Mock connection released')
      };
    },
    end: async () => {
      console.log('Mock pool ended');
    }
  };
};

// Cố gắng tạo pool kết nối MySQL thực
let pool;
try {
  pool = mysql.createPool({
    host: config.database.host || 'localhost',
    port: config.database.port || 3306,
    user: config.database.user || 'root',
    password: config.database.password || '',
    database: config.database.name || 'travel_test001',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });
  
  console.log('Đã tạo pool kết nối MySQL - đang thử kết nối...');
} catch (err) {
  console.error('Lỗi khi tạo MySQL pool:', err.message);
  pool = createMockPool();
}

// Kiểm tra kết nối khi khởi động - bọc trong try-catch
try {
  // Kiểm tra kết nối nhưng đặt timeout để tránh chờ quá lâu
  const checkConnection = async () => {
    try {
      const connection = await pool.getConnection();
      console.log('Kết nối MySQL thành công!');
      console.log(`Database: ${config.database.name || 'travel_test001'}`);
      
      // Đặt charset và collation cho kết nối
      await connection.query("SET NAMES 'utf8mb4'");
      await connection.query("SET CHARACTER SET utf8mb4");
      await connection.query("SET SESSION collation_connection = 'utf8mb4_unicode_ci'");
      
      // Kiểm tra charset
      const [charsetRows] = await connection.query("SHOW VARIABLES LIKE 'character_set%'");
      // console.log('MySQL character settings:');
      charsetRows.forEach(row => {
        console.log(`${row.Variable_name}: ${row.Value}`);
      });
      
      connection.release();
    } catch (err) {
      console.error('Không thể kết nối với MySQL:', err.message);
      console.error('Vui lòng kiểm tra lại cấu hình database trong file .env');
      
      // Chuyển sang sử dụng mock pool
      pool = createMockPool();
    }
  };
  
  // Chạy hàm kiểm tra kết nối với timeout ngắn
  const connectionPromise = checkConnection();
  setTimeout(() => {
    // console.log('⚠️ Tiếp tục khởi động ứng dụng mà không cần chờ kết nối MySQL...');
  }, 3000); // 3 giây timeout
} catch (err) {
  console.error('Lỗi khi kiểm tra kết nối MySQL:', err.message);
  // Đảm bảo sử dụng mock pool nếu có lỗi
  pool = createMockPool();
}



module.exports = pool; 
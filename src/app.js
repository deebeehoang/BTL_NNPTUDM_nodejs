const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('./utils/passport');

const app = express();

require('dotenv').config();

// Kiểm tra và thiết lập JWT_SECRET nếu chưa có
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ CẢNH BÁO: Biến môi trường JWT_SECRET không được thiết lập!');
  console.warn('⚠️ Sử dụng giá trị mặc định cho JWT_SECRET. Điều này KHÔNG AN TOÀN cho môi trường sản xuất!');
  process.env.JWT_SECRET = 'your_jwt_secret_key';
} else {
  console.log('✅ JWT_SECRET đã được thiết lập:', process.env.JWT_SECRET.substring(0, 3) + '***' + process.env.JWT_SECRET.substring(process.env.JWT_SECRET.length - 3));
}

// Import database connection
const db = require('./utils/database');


// ==============================================
// MULTER CONFIGURATION
// ==============================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Multer parse body sau khi xử lý file, nên cần đọc từ req.body
    // Nhưng trong destination function, req.body có thể chưa được parse
    // Nên ta sẽ đọc từ query string hoặc header nếu có
    let type = req.body?.type || req.query?.type || 'tours';
    
    // Debug: log toàn bộ req để xem
    console.log('Upload type from body:', req.body?.type);
    console.log('Upload type from query:', req.query?.type);
    console.log('Final upload type:', type);
    
    let folderName;
    if (type === 'avatar') {
      folderName = 'avatar';
    } else if (type === 'destination' || type === 'destinations') {
      folderName = 'destination';
    } else {
      folderName = 'tours';
    }
    
    console.log('Folder name for upload:', folderName);
    
    const dir = path.join(__dirname, '../public/images/uploads', folderName);
    console.log('Upload directory:', dir);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// ==============================================
// DATABASE CONNECTION CHECK
// ==============================================
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ Kết nối database thành công!');
    
    try {
      await connection.query('SELECT 1 FROM Tour_du_lich LIMIT 1');
    } catch (error) {
      console.error('❌ Lỗi khi kiểm tra bảng Tour_du_lich:', error.message);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Lỗi kết nối database:', error.message);
    console.error('Vui lòng kiểm tra lại cấu hình database trong file .env');
  }
})();

// Quick debug: log tin_nhan table columns to align schema
(async () => {
  try {
    const [rows] = await db.query("SHOW COLUMNS FROM tin_nhan");
    console.log('📋 Columns in tin_nhan:', rows.map(r => `${r.Field}:${r.Type}`).join(', '));
  } catch (e) {
    console.warn('ℹ️ Không thể lấy cấu trúc bảng tin_nhan:', e.message);
  }
})();

// ==============================================
// MIDDLEWARE
// ==============================================
app.use(cors({
    origin: true,
    credentials: true
}));
// Body parser - but skip for multipart/form-data (let multer handle it)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // Skip body parsing for multipart/form-data, let multer handle it
    return next();
  }
  // Use body parser for other content types
  bodyParser.json()(req, res, next);
});

// JSON and URL-encoded body parsers (skip for multipart)
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  express.json()(req, res, next);
});

app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_key_change_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Gắn db vào app.locals
app.locals.db = db;

// ==============================================
// IMPORT ROUTES
// ==============================================
const authRoutes = require('./routes/auth.routes');
const tourRoutes = require('./routes/tour.routes');
const destinationRoutes = require('./routes/destination.routes');
const serviceRoutes = require('./routes/service.routes');
const bookingRoutes = require('./routes/booking.routes');
const ticketRoutes = require('./routes/ticket.routes');
const adminRoutes = require('./routes/admin.routes');
const customerRoutes = require('./routes/customer.routes');
const cancelRequestRoutes = require('./routes/cancel-request.routes');
const paymentRoutes = require('./routes/payment.routes');
const userRoutes = require('./routes/user.route');
const chatRoutes = require('./routes/chat');
const promotionRoutes = require('./routes/promotion.routes');
const ratingRoutes = require('./routes/rating.routes');
const momoRoutes = require('./routes/momo.routes');
const guideRoutes = require('./routes/guide.routes');
const adminGuideRoutes = require('./routes/admin-guide.routes');
const tourItineraryRoutes = require('./routes/tourItinerary.routes');
const mapRoutes = require('./routes/map.routes');

// ==============================================
// UPLOAD ROUTE
// ==============================================
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Không có file được upload'
      });
    }

    const type = req.body.type || 'tours';
    let folderName;
    if (type === 'avatar') {
      folderName = 'avatar';
    } else if (type === 'destination' || type === 'destinations') {
      folderName = 'destination';
    } else {
      folderName = 'tours';
    }
    // Trả về đường dẫn đúng với static files (thêm /images vào đầu)
    const imageUrl = `/images/uploads/${folderName}/${req.file.filename}`;

    console.log('File uploaded successfully:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      imageUrl: imageUrl,
      type: type
    });

    res.json({
      status: 'success',
      message: 'File uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi upload file',
      error: error.message
    });
  }
});

// ==============================================
// GOOGLE OAUTH CALLBACK ROUTE (phải đặt trước API routes)
// ==============================================
// Route này xử lý callback trực tiếp từ Google OAuth
// Google redirect về /auth/google/callback theo cấu hình GOOGLE_CALLBACK_URL
app.get('/auth/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: '/auth.html?error=google_auth_failed' }),
    async (req, res) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.redirect('/auth.html?error=user_not_found');
            }

            // Tạo JWT token
            const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
            const token = jwt.sign(
                { id: user.Id_user, role: user.Loai_tai_khoan },
                jwtSecret,
                { expiresIn: '24h' }
            );

            // Chuyển hướng với token trong URL
            const redirectUrl = `/auth.html?token=${token}&id=${user.Id_user}&email=${encodeURIComponent(user.Email || '')}&role=${user.Loai_tai_khoan}`;
            res.redirect(redirectUrl);
        } catch (error) {
            console.error('❌ Lỗi trong Google callback:', error);
            res.redirect('/auth.html?error=server_error');
        }
    }
);

// ==============================================
// API ROUTES
// ==============================================
app.use('/api/auth', authRoutes);
app.use('/api/tours', tourRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/cancel-requests', cancelRequestRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/payment/momo', momoRoutes);
// Public route for MoMo redirect (without /api prefix)
app.use('/payment/momo', momoRoutes);
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/guide', guideRoutes);
app.use('/api/admin', adminGuideRoutes);
app.use('/api', tourItineraryRoutes);
app.use('/api/map', mapRoutes);

// ==============================================
// CONTENT-TYPE MIDDLEWARE
// ==============================================
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  const originalSendFile = res.sendFile;

  res.send = function(body) {
    if (typeof body === 'string' && body.trim().startsWith('<!DOCTYPE html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    }
    return originalSend.call(this, body);
  };

  res.json = function(body) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson.call(this, body);
  };

  res.sendFile = function(filePath, options, callback) {
    if (path.extname(filePath) === '.html') {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    }
    return originalSendFile.call(this, filePath, options, callback);
  };

  next();
});

// ==============================================
// STATIC FILES
// ==============================================
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    }
  }
}));

app.use('/images', express.static(path.join(__dirname, '../public/images')));

// (Các phần còn lại của file được giữ nguyên)
// ...

module.exports = { app, db };
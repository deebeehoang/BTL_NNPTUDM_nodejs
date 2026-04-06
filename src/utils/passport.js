const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');
const jwt = require('jsonwebtoken');

// Cấu hình Google OAuth Strategy
// Lưu ý: GOOGLE_CALLBACK_URL trong .env phải khớp với route /auth/google/callback
// Route này sẽ redirect đến /api/auth/google/callback
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const googleId = profile.id;
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const displayName = profile.displayName || profile.name?.givenName || 'Người dùng';
        const photo = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        console.log('🔍 Google profile:', {
            id: googleId,
            email: email,
            displayName: displayName,
            photo: photo
        });

        // Kiểm tra xem người dùng đã đăng nhập bằng Google trước đó chưa
        const [existingUser] = await db.query(
            'SELECT * FROM Tai_khoan WHERE google_id = ?',
            [googleId]
        );

        if (existingUser.length > 0) {
            // Người dùng đã tồn tại với Google ID
            console.log('✅ Tìm thấy người dùng với Google ID:', googleId);
            return done(null, existingUser[0]);
        }

        // Nếu chưa có, kiểm tra xem email đã được sử dụng chưa
        if (email) {
            const [existingEmail] = await db.query(
                'SELECT * FROM Tai_khoan WHERE Email = ?',
                [email]
            );

            if (existingEmail.length > 0) {
                // Email đã tồn tại, cập nhật thông tin Google vào tài khoản hiện có
                console.log('📧 Email đã tồn tại, cập nhật thông tin Google');
                await db.query(
                    'UPDATE Tai_khoan SET google_id = ?, ten_hien_thi = ?, anh_dai_dien = ? WHERE Email = ?',
                    [googleId, displayName, photo, email]
                );
                
                const [updatedUser] = await db.query(
                    'SELECT * FROM Tai_khoan WHERE Email = ?',
                    [email]
                );
                
                return done(null, updatedUser[0]);
            }
        }

        // Tạo tài khoản mới với Google
        console.log('🆕 Tạo tài khoản mới với Google');
        const newUserId = `google_${googleId.substring(0, 20)}_${Date.now()}`;
        
        const [result] = await db.query(
            `INSERT INTO Tai_khoan (Id_user, Email, Loai_tai_khoan, google_id, ten_hien_thi, anh_dai_dien, Password) 
             VALUES (?, ?, 'Khach_hang', ?, ?, ?, '')`,
            [newUserId, email || `${googleId}@google.com`, googleId, displayName, photo]
        );

        const [newUser] = await db.query(
            'SELECT * FROM Tai_khoan WHERE Id_user = ?',
            [newUserId]
        );

        console.log('✅ Đã tạo tài khoản mới:', newUserId);
        return done(null, newUser[0]);

    } catch (error) {
        console.error('❌ Lỗi trong Google OAuth strategy:', error);
        return done(error, null);
    }
}));

// Serialize user để lưu vào session
passport.serializeUser((user, done) => {
    done(null, user.Id_user);
});

// Deserialize user từ session
passport.deserializeUser(async (id, done) => {
    try {
        const [users] = await db.query(
            'SELECT * FROM Tai_khoan WHERE Id_user = ?',
            [id]
        );
        
        if (users.length > 0) {
            done(null, users[0]);
        } else {
            done(new Error('User not found'), null);
        }
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;


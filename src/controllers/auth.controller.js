const User = require('../schemas/user.schema');
const jwt = require('jsonwebtoken');

/**
 * Authentication Controller
 */
class AuthController {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async register(req, res) {
    try {
      const userData = req.body;
      
      // Validate input
      if (!userData.id_user || !userData.password || !userData.email || !userData.loai_tai_khoan) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields'
        });
      }
      
      // Check if user already exists
      const existingUser = await User.findById(userData.id_user);
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'User ID already exists'
        });
      }
      
      // Check if email already exists
      const existingEmail = await User.findByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already exists'
        });
      }
      
      // Create new user
      const newUser = await User.register(userData);
      
      // Generate JWT token
      const token = jwt.sign(
        { id: newUser.id_user, role: newUser.loai_tai_khoan },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(201).json({
        status: 'success',
        data: {
          user: newUser,
          token
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error registering user',
        error: error.message
      });
    }
  }
  
  /**
   * User login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async login(req, res) {
    try {
      const { id_user, password } = req.body;
      
      console.log(`🔑 Đang xử lý đăng nhập cho user: ${id_user}`);
      
      // Validate input
      if (!id_user || !password) {
        console.log('❌ Thiếu thông tin đăng nhập');
        return res.status(400).json({
          status: 'error',
          message: 'Please provide ID and password'
        });
      }
      
      // Check if user exists
      console.log(`🔍 Tìm kiếm user ID: ${id_user} trong database`);
      const user = await User.findById(id_user);
      if (!user) {
        console.log(`❌ Không tìm thấy user: ${id_user}`);
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }
      
      console.log(`✅ Tìm thấy user: ${id_user}, đang kiểm tra mật khẩu`);
      
      // Verify password
      const isPasswordValid = await User.verifyPassword(password, user.Password);
      if (!isPasswordValid) {
        console.log(`❌ Mật khẩu không đúng cho user: ${id_user}`);
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }
      
      console.log(`✅ Xác thực mật khẩu thành công cho user: ${id_user}`);
      
      // Kiểm tra status của tài khoản
      const userStatus = user.status || user.Status || 'Active';
      if (userStatus === 'Blocked' || userStatus === 'blocked') {
        console.log(`🚫 Tài khoản ${id_user} đã bị chặn`);
        return res.status(403).json({
          status: 'error',
          message: 'Tài khoản của bạn đã bị cấm. Vui lòng liên hệ quản trị viên.',
          code: 'ACCOUNT_BLOCKED'
        });
      }
      
      // Kiểm tra JWT_SECRET
      const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
      
      if (!process.env.JWT_SECRET) {
        console.warn('⚠️ CẢNH BÁO: Không tìm thấy JWT_SECRET trong biến môi trường, đang sử dụng khóa mặc định');
      }
      
      // Generate JWT token
      console.log(`🔒 Tạo token JWT cho user: ${id_user}`);
      const token = jwt.sign(
        { id: user.Id_user, role: user.Loai_tai_khoan },
        jwtSecret,
        { expiresIn: '24h' }
      );
      
      // Get user details based on role
      console.log(`🔍 Lấy thông tin chi tiết cho user: ${id_user} với vai trò: ${user.Loai_tai_khoan}`);
      let userDetails = null;
      if (user.Loai_tai_khoan === 'Khach_hang') {
        userDetails = await User.getCustomerDetails(user.Id_user);
      } else if (user.Loai_tai_khoan === 'Admin') {
        userDetails = await User.getAdminDetails(user.Id_user);
      }
      
      console.log(`✅ Đăng nhập thành công cho user: ${id_user}`);
      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.Id_user,
            email: user.Email,
            role: user.Loai_tai_khoan,
            details: userDetails
          },
          token
        }
      });
    } catch (error) {
      console.error('❌ Lỗi đăng nhập:', error);
      console.error('Chi tiết lỗi:', error.stack);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi đăng nhập',
        error: error.message
      });
    }
  }
  
  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user from database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Get user details based on role
      let userDetails = null;
      if (user.Loai_tai_khoan === 'Khach_hang') {
        userDetails = await User.getCustomerDetails(user.Id_user);
      } else if (user.Loai_tai_khoan === 'Admin') {
        userDetails = await User.getAdminDetails(user.Id_user);
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.Id_user,
            email: user.Email,
            role: user.Loai_tai_khoan,
            ten_hien_thi: user.ten_hien_thi || userDetails?.Ten_khach_hang || userDetails?.Ten || null,
            anh_dai_dien: user.anh_dai_dien || null,
            details: userDetails
          }
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error getting user profile',
        error: error.message
      });
    }
  }
  
  /**
   * Update user avatar
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateAvatar(req, res) {
    try {
      const userId = req.user.id;
      const { anh_dai_dien } = req.body;
      
      if (!anh_dai_dien) {
        return res.status(400).json({
          status: 'error',
          message: 'Thiếu đường dẫn ảnh đại diện'
        });
      }

      await User.updateAvatar(userId, anh_dai_dien);

      res.status(200).json({
        status: 'success',
        message: 'Cập nhật ảnh đại diện thành công',
        data: {
          anh_dai_dien: anh_dai_dien
        }
      });
    } catch (error) {
      console.error('Update avatar error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error updating avatar',
        error: error.message
      });
    }
  }

  /**
   * Update user password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updatePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide current and new password'
        });
      }
      
      // Get user from database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Verify current password
      const isPasswordValid = await User.verifyPassword(currentPassword, user.Password);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      await User.updatePassword(userId, newPassword);
      
      res.status(200).json({
        status: 'success',
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error updating password',
        error: error.message
      });
    }
  }
  /**
   * Handle Google OAuth callback
   */
  static async verifyToken(req, res) {
    res.status(200).json({
      status: 'success',
      message: 'Token hợp lệ',
      data: { id: req.user.id, role: req.user.role, loai_tai_khoan: req.user.loai_tai_khoan }
    });
  }

  static async googleCallback(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.redirect('/auth.html?error=user_not_found');
      }

      const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key';
      const token = jwt.sign(
        { id: user.Id_user, role: user.Loai_tai_khoan },
        jwtSecret,
        { expiresIn: '24h' }
      );

      const redirectUrl = `/auth.html?token=${token}&id=${user.Id_user}&email=${encodeURIComponent(user.Email || '')}&role=${user.Loai_tai_khoan}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Lỗi trong Google callback:', error);
      res.redirect('/auth.html?error=server_error');
    }
  }
}

module.exports = AuthController;
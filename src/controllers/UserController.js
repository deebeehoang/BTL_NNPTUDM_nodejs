const UserUtil = require('../utils/user.util');

exports.getAllUsers = async (req, res) => {
    try {
        console.log('Đang lấy danh sách người dùng');
        
        const users = await UserUtil.getAllUsersWithStats();

        console.log('Kết quả truy vấn users:', users);

        if (!users || users.length === 0) {
            console.log('Không có người dùng nào');
            return res.json({ 
                status: 'success', 
                data: { 
                    users: [] 
                } 
            });
        }

        // Format dữ liệu trả về
        const formattedUsers = users.map(user => ({
            ...user,
            so_booking: parseInt(user.so_booking),
            so_hoa_don: parseInt(user.so_hoa_don)
        }));

        console.log('Dữ liệu trả về:', formattedUsers);

        res.json({ 
            status: 'success', 
            data: { 
                users: formattedUsers 
            } 
        });
    } catch (error) {
        console.error('Lỗi getAllUsers:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Lỗi khi tải danh sách người dùng',
            error: error.message 
        });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const ma_khach_hang = req.params.ma_khach_hang;
        console.log('Đang tìm thông tin khách hàng:', ma_khach_hang);

        // Lấy thông tin user
        const userInfo = await UserUtil.getUserDetailsByCustomerId(ma_khach_hang);

        console.log('Kết quả truy vấn userInfo:', userInfo);

        if (!userInfo) {
            console.log('Không tìm thấy thông tin khách hàng');
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thông tin khách hàng'
            });
        }

        // Lấy danh sách booking của người dùng kèm tên tour
        const bookings = await UserUtil.getUserBookingsWithTourName(ma_khach_hang);

        console.log('Kết quả truy vấn bookings:', bookings);

        // Format ngày và dữ liệu trả về
        const formattedUserInfo = {
            ...userInfo,
            Ngay_sinh: userInfo.Ngay_sinh ? new Date(userInfo.Ngay_sinh).toISOString().split('T')[0] : null
        };

        const formattedBookings = bookings.map(booking => ({
            ...booking,
            Ngay_dat: new Date(booking.Ngay_dat).toISOString(),
            Tong_tien: parseFloat(booking.Tong_tien || 0),
            Ten_tour: booking.Ten_tour || null
        }));

        console.log('Dữ liệu trả về:', {
            user: formattedUserInfo,
            bookings: formattedBookings
        });

        res.json({
            status: 'success',
            data: {
                user: formattedUserInfo,
                bookings: formattedBookings
            }
        });
    } catch (error) {
        console.error('Lỗi getUserDetails:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy thông tin chi tiết người dùng',
            error: error.message
        });
    }
};


exports.updateUser = async (req, res) => {
    try {
        const ma_khach_hang = req.params.ma_khach_hang;
        const { Ten_khach_hang, Email, Dia_chi, Ngay_sinh, CCCD } = req.body;

        // Kiểm tra quyền admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Không có quyền thực hiện hành động này'
            });
        }

        // Lấy thông tin khách hàng từ mã
        const khachHang = await UserUtil.getCustomerById(ma_khach_hang);
        
        if (!khachHang) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thông tin khách hàng'
            });
        }

        // Cập nhật thông tin (transaction trong util)
        await UserUtil.updateCustomerInfo(ma_khach_hang, { Ten_khach_hang, Email, Dia_chi, Ngay_sinh, CCCD });

        res.json({
            status: 'success',
            message: 'Cập nhật thông tin thành công'
        });
    } catch (error) {
        console.error('Lỗi updateUser:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Lỗi khi cập nhật thông tin người dùng'
        });
    }
};

// Block/Unblock user thay vì xóa
exports.blockUser = async (req, res) => {
    try {
        const ma_khach_hang = req.params.ma_khach_hang;
        const { action } = req.body; // 'block' hoặc 'unblock'

        // Kiểm tra quyền admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Không có quyền thực hiện hành động này'
            });
        }

        if (!action || (action !== 'block' && action !== 'unblock')) {
            return res.status(400).json({
                status: 'error',
                message: 'Action phải là "block" hoặc "unblock"'
            });
        }

        // Lấy thông tin khách hàng
        const khachHang = await UserUtil.getCustomerById(ma_khach_hang);
        
        if (!khachHang) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thông tin khách hàng'
            });
        }

        const userId = khachHang.Id_user;
        const newStatus = action === 'block' ? 'Blocked' : 'Active';

        // Cập nhật status
        await UserUtil.updateAccountStatus(userId, newStatus);

        // Lấy thông tin tài khoản để gửi thông báo
        const account = await UserUtil.getAccountByUserId(userId);
        
        // Gửi thông báo realtime qua Socket.io nếu user đang online
        const io = req.app.get('io');
        if (io) {
            // Lấy onlineUsers từ app (được set trong app.js)
            const onlineUsers = req.app.get('onlineUsers') || {};
            const userSocket = onlineUsers[userId];
            
            console.log(`🔍 [BLOCK USER] User ID: ${userId}, Online: ${!!userSocket}, Action: ${action}`);
            
            if (userSocket && action === 'block') {
                // Gửi thông báo block đến user
                console.log(`📢 [BLOCK USER] Gửi thông báo block đến user ${userId}`);
                userSocket.emit('accountBlocked', {
                    message: 'Tài khoản của bạn đã bị cấm bởi quản trị viên.',
                    reason: 'Tài khoản đã bị khóa do vi phạm quy định',
                    timestamp: new Date().toISOString()
                });
            } else if (userSocket && action === 'unblock') {
                // Gửi thông báo unblock
                console.log(`📢 [BLOCK USER] Gửi thông báo unblock đến user ${userId}`);
                userSocket.emit('accountUnblocked', {
                    message: 'Tài khoản của bạn đã được mở khóa.',
                    timestamp: new Date().toISOString()
                });
            } else if (action === 'block') {
                console.log(`⚠️ [BLOCK USER] User ${userId} không online, không thể gửi thông báo realtime`);
            }
        } else {
            console.warn('⚠️ [BLOCK USER] Socket.io không khả dụng');
        }

        res.json({
            status: 'success',
            message: action === 'block' ? 'Đã chặn người dùng thành công' : 'Đã gỡ chặn người dùng thành công',
            data: {
                userId: userId,
                status: newStatus
            }
        });
    } catch (error) {
        console.error('Lỗi blockUser:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi cập nhật trạng thái người dùng',
            error: error.message
        });
    }
};

// Giữ lại deleteUser để tương thích ngược (có thể xóa sau)
exports.deleteUser = async (req, res) => {
    try {
        const ma_khach_hang = req.params.ma_khach_hang;

        // Kiểm tra quyền admin
        if (req.user.role !== 'Admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Không có quyền thực hiện hành động này'
            });
        }

        // Lấy thông tin khách hàng
        const khachHang = await UserUtil.getCustomerById(ma_khach_hang);
        
        if (!khachHang) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thông tin khách hàng'
            });
        }

        // Kiểm tra xem người dùng có booking nào không
        const bookingCount = await UserUtil.countBookingsByCustomer(ma_khach_hang);
        
        if (bookingCount > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Không thể xóa người dùng này vì đã có booking. Vui lòng sử dụng chức năng chặn thay thế.'
            });
        }

        // Xóa khách hàng và tài khoản (transaction trong util)
        await UserUtil.deleteCustomerAndAccount(ma_khach_hang, khachHang.Id_user);

        res.json({
            status: 'success',
            message: 'Xóa người dùng thành công'
        });
    } catch (error) {
        console.error('Lỗi deleteUser:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi xóa người dùng',
            error: error.message
        });
    }
};

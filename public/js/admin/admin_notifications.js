// Admin Notifications - Realtime booking notifications
(function() {
    'use strict';

    let socket = null;
    let notifications = []; // Lưu trữ danh sách thông báo
    let unreadCount = 0;

    // Khởi tạo socket.io connection
    function initSocket() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

        if (!token || !user || (user.loai_tai_khoan !== 'Admin' && user.role !== 'Admin')) {
            console.log('⚠️ Không phải admin, không kết nối socket');
            return;
        }

        // Kiểm tra xem đã có socket từ chat-admin.js chưa
        // Nếu có thì dùng chung, nếu không thì tạo mới
        if (window.adminSocket) {
            console.log('✅ Sử dụng socket connection có sẵn từ chat-admin.js');
            socket = window.adminSocket;
        } else {
            console.log('🔌 Tạo socket connection mới cho notifications');
            socket = io();
            window.adminSocket = socket; // Lưu để dùng chung
        }

        // Đảm bảo admin đã online
        const adminId = user.id_user || user.Id_user || user.userId || user.id;
        
        // Đăng ký event listener cho new_booking TRƯỚC khi emit adminOnline
        // Để không bỏ lỡ thông báo nào
        // Sử dụng removeAllListeners để tránh duplicate listeners
        socket.removeAllListeners('new_booking');
        socket.on('new_booking', (bookingData) => {
            console.log('📢 [NOTIFICATION] Nhận thông báo booking mới:', bookingData);
            console.log('📢 [NOTIFICATION] Dữ liệu booking:', JSON.stringify(bookingData));
            addNotification(bookingData);
            updateBadge();
            showNotificationToast(bookingData);
        });

        // Đăng ký event listener cho disconnect
        socket.on('disconnect', () => {
            console.log('❌ [NOTIFICATION] Đã ngắt kết nối socket.io');
        });

        // Đăng ký lại event listener khi reconnect
        socket.on('reconnect', () => {
            console.log('🔄 [NOTIFICATION] Socket đã reconnect, đăng ký lại admin online');
            if (adminId) {
                socket.emit('adminOnline', adminId);
            }
        });

        // Đảm bảo admin đã online
        if (adminId) {
            if (socket.connected) {
                console.log('📢 [NOTIFICATION] Socket đã connected, đăng ký admin online với ID:', adminId);
                socket.emit('adminOnline', adminId);
            } else {
                // Nếu chưa connected, đợi connect rồi mới emit
                socket.once('connect', () => {
                    console.log('✅ [NOTIFICATION] Socket đã kết nối, đăng ký admin online với ID:', adminId);
                    socket.emit('adminOnline', adminId);
                });
            }
        }

        // Test connection - gửi ping để kiểm tra
        if (socket.connected) {
            socket.emit('test_notification', { message: 'Notification system ready', adminId: adminId });
        }

        // Log để debug
        console.log('🔔 [NOTIFICATION] Đã khởi tạo notification system');
        console.log('🔔 [NOTIFICATION] Socket connected:', socket.connected);
        console.log('🔔 [NOTIFICATION] Socket ID:', socket.id);
        console.log('🔔 [NOTIFICATION] Admin ID:', adminId);
        console.log('🔔 [NOTIFICATION] Event listeners đã đăng ký: new_booking, disconnect, reconnect');
    }

    // Thêm thông báo mới vào danh sách
    function addNotification(bookingData) {
        const notification = {
            id: bookingData.bookingId + '_' + Date.now(),
            bookingId: bookingData.bookingId,
            customerName: bookingData.customerName,
            tourName: bookingData.tourName,
            ngayDat: bookingData.ngayDat,
            soNguoiLon: bookingData.soNguoiLon,
            soTreEm: bookingData.soTreEm,
            tongTien: bookingData.tongTien,
            trangThai: bookingData.trangThai,
            ngayKhoiHanh: bookingData.ngayKhoiHanh,
            ngayKetThuc: bookingData.ngayKetThuc,
            timestamp: bookingData.timestamp || new Date().toISOString(),
            read: false
        };

        notifications.unshift(notification); // Thêm vào đầu danh sách
        unreadCount++;
        
        // Giới hạn số lượng thông báo (giữ tối đa 50 thông báo)
        if (notifications.length > 50) {
            notifications = notifications.slice(0, 50);
        }

        renderNotifications();
    }

    // Cập nhật badge số lượng thông báo chưa đọc
    function updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Hiển thị toast notification
    function showNotificationToast(bookingData) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const toast = document.createElement('div');
        toast.className = 'alert alert-info alert-dismissible fade show';
        toast.style.minWidth = '300px';
        toast.innerHTML = `
            <strong><i class="fas fa-bell me-2"></i>Đặt tour mới!</strong><br>
            <small>Khách hàng: ${bookingData.customerName}</small><br>
            <small>Tour: ${bookingData.tourName}</small><br>
            <small>Tổng tiền: ${formatCurrency(bookingData.tongTien)}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        alertContainer.appendChild(toast);

        // Tự động ẩn sau 5 giây
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    // Render danh sách thông báo
    function renderNotifications() {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;

        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="px-3 py-2 text-muted text-center">
                    <small>Chưa có thông báo mới</small>
                </div>
            `;
            return;
        }

        const markAllReadBtn = document.getElementById('markAllAsRead');
        if (markAllReadBtn) {
            markAllReadBtn.style.display = unreadCount > 0 ? 'block' : 'none';
        }

        notificationList.innerHTML = notifications.map(notif => {
            const timeAgo = getTimeAgo(notif.timestamp);
            const isUnread = !notif.read;
            
            return `
                <li>
                    <a class="dropdown-item ${isUnread ? 'bg-light' : ''}" href="#" data-booking-id="${notif.bookingId}" data-notification-id="${notif.id}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="fw-bold ${isUnread ? 'text-primary' : ''}">
                                    <i class="fas fa-calendar-check me-2"></i>${notif.tourName}
                                </div>
                                <small class="text-muted">
                                    <i class="fas fa-user me-1"></i>${notif.customerName}
                                </small><br>
                                <small class="text-muted">
                                    <i class="fas fa-money-bill-wave me-1"></i>${formatCurrency(notif.tongTien)}
                                </small><br>
                                <small class="text-muted">
                                    <i class="fas fa-clock me-1"></i>${timeAgo}
                                </small>
                            </div>
                            ${isUnread ? '<span class="badge bg-primary rounded-pill ms-2">Mới</span>' : ''}
                        </div>
                    </a>
                </li>
            `;
        }).join('');

        // Thêm event listeners cho các thông báo
        notificationList.querySelectorAll('a[data-booking-id]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const bookingId = link.getAttribute('data-booking-id');
                const notificationId = link.getAttribute('data-notification-id');
                
                // Đánh dấu đã đọc
                markAsRead(notificationId);
                
                // Hiển thị modal chi tiết
                showBookingDetail(bookingId);
            });
        });
    }

    // Đánh dấu thông báo đã đọc
    function markAsRead(notificationId) {
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            unreadCount = Math.max(0, unreadCount - 1);
            updateBadge();
            renderNotifications();
        }
    }

    // Đánh dấu tất cả đã đọc
    function markAllAsRead() {
        notifications.forEach(notif => {
            if (!notif.read) {
                notif.read = true;
            }
        });
        unreadCount = 0;
        updateBadge();
        renderNotifications();
    }

    // Hiển thị modal chi tiết booking
    function showBookingDetail(bookingId) {
        console.log('🔍 [NOTIFICATION] Hiển thị chi tiết booking:', bookingId);
        
        const modalElement = document.getElementById('bookingDetailModal');
        const modalContent = document.getElementById('bookingDetailContent');
        const viewBookingLink = document.getElementById('viewBookingLink');

        if (!modalElement) {
            console.error('❌ [NOTIFICATION] Không tìm thấy modal element bookingDetailModal');
            alert('Không thể hiển thị chi tiết booking. Modal không tồn tại.');
            return;
        }

        if (!modalContent) {
            console.error('❌ [NOTIFICATION] Không tìm thấy modal content element');
            return;
        }

        // Kiểm tra Bootstrap có sẵn không
        if (typeof bootstrap === 'undefined') {
            console.error('❌ [NOTIFICATION] Bootstrap chưa được load');
            alert('Bootstrap chưa được tải. Vui lòng refresh trang.');
            return;
        }

        // Lấy hoặc tạo modal instance
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }

        // Hiển thị loading
        modalContent.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-2">Đang tải thông tin booking...</p>
            </div>
        `;

        // Cập nhật link xem chi tiết - chuyển đến tab bookings
        viewBookingLink.href = '#';
        viewBookingLink.onclick = (e) => {
            e.preventDefault();
            // Đóng modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailModal'));
            if (modal) modal.hide();
            
            // Chuyển đến tab bookings
            const bookingsNav = document.getElementById('navBookings');
            if (bookingsNav) {
                bookingsNav.click();
                // Scroll đến booking nếu có
                setTimeout(() => {
                    const bookingRow = document.querySelector(`[data-booking-id="${bookingId}"]`);
                    if (bookingRow) {
                        bookingRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        bookingRow.style.backgroundColor = '#fff3cd';
                        setTimeout(() => {
                            bookingRow.style.backgroundColor = '';
                        }, 3000);
                    }
                }, 500);
            }
        };

        // Hiển thị modal trước
        console.log('🔍 [NOTIFICATION] Đang hiển thị modal...');
        modal.show();

        // Tải thông tin booking
        const token = localStorage.getItem('token');
        console.log('🔍 [NOTIFICATION] Đang tải thông tin booking:', bookingId);
        
        fetch(`/api/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('🔍 [NOTIFICATION] Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('🔍 [NOTIFICATION] Booking data received:', data);
            if (data.status === 'success' && data.data) {
                const booking = data.data.booking || data.data;
                console.log('🔍 [NOTIFICATION] Rendering booking detail:', booking);
                renderBookingDetail(booking, modalContent);
            } else {
                console.error('❌ [NOTIFICATION] API response không hợp lệ:', data);
                modalContent.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Không thể tải thông tin booking. ${data.message || 'Vui lòng thử lại sau.'}
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('❌ [NOTIFICATION] Lỗi khi tải chi tiết booking:', error);
            modalContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Đã xảy ra lỗi khi tải thông tin: ${error.message}
                </div>
            `;
        });
    }

    // Render chi tiết booking trong modal
    function renderBookingDetail(booking, container) {
        const ngayDat = new Date(booking.Ngay_dat || booking.ngay_dat).toLocaleString('vi-VN');
        const tongTien = booking.Tong_tien || booking.tong_tien || 0;
        const soNguoiLon = booking.So_nguoi_lon || booking.so_nguoi_lon || 0;
        const soTreEm = booking.So_tre_em || booking.so_tre_em || 0;
        const trangThai = booking.Trang_thai_booking || booking.trang_thai_booking || booking.Trang_thai || 'Chưa xác định';

        container.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <strong><i class="fas fa-hashtag me-2"></i>Mã booking:</strong>
                    <p class="mb-0">${booking.Ma_booking || booking.ma_booking}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <strong><i class="fas fa-calendar me-2"></i>Ngày đặt:</strong>
                    <p class="mb-0">${ngayDat}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <strong><i class="fas fa-users me-2"></i>Số người lớn:</strong>
                    <p class="mb-0">${soNguoiLon} người</p>
                </div>
                <div class="col-md-6 mb-3">
                    <strong><i class="fas fa-child me-2"></i>Số trẻ em:</strong>
                    <p class="mb-0">${soTreEm} người</p>
                </div>
                <div class="col-md-6 mb-3">
                    <strong><i class="fas fa-money-bill-wave me-2"></i>Tổng tiền:</strong>
                    <p class="mb-0 text-primary fw-bold">${formatCurrency(tongTien)}</p>
                </div>
                <div class="col-md-6 mb-3">
                    <strong><i class="fas fa-info-circle me-2"></i>Trạng thái:</strong>
                    <p class="mb-0">
                        <span class="badge ${getStatusBadgeClass(trangThai)}">${trangThai}</span>
                    </p>
                </div>
                ${booking.Ten_khach_hang || booking.ten_khach_hang ? `
                <div class="col-12 mb-3">
                    <strong><i class="fas fa-user me-2"></i>Khách hàng:</strong>
                    <p class="mb-0">${booking.Ten_khach_hang || booking.ten_khach_hang}</p>
                </div>
                ` : ''}
                ${booking.Ten_tour || booking.ten_tour ? `
                <div class="col-12 mb-3">
                    <strong><i class="fas fa-map-marked-alt me-2"></i>Tour:</strong>
                    <p class="mb-0">${booking.Ten_tour || booking.ten_tour}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount || 0);
    }

    // Get time ago
    function getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000); // seconds

        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
        return time.toLocaleDateString('vi-VN');
    }

    // Get status badge class
    function getStatusBadgeClass(status) {
        const statusLower = (status || '').toLowerCase();
        if (statusLower.includes('đã thanh toán') || statusLower.includes('thanh toán')) {
            return 'bg-success';
        }
        if (statusLower.includes('chờ thanh toán') || statusLower.includes('chờ')) {
            return 'bg-warning text-dark';
        }
        if (statusLower.includes('hủy') || statusLower.includes('hết hạn')) {
            return 'bg-danger';
        }
        return 'bg-secondary';
    }

    // Khởi tạo khi DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        // Đợi một chút để đảm bảo chat-admin.js đã tạo socket
        setTimeout(() => {
            initSocket();
            renderNotifications();

            // Event listener cho nút đánh dấu tất cả đã đọc
            const markAllReadBtn = document.getElementById('markAllAsRead');
            if (markAllReadBtn) {
                markAllReadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    markAllAsRead();
                });
            }
        }, 100); // Đợi 100ms để chat-admin.js tạo socket trước
    });

})();


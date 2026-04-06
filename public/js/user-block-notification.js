// user-block-notification.js
// Xử lý thông báo realtime khi user bị block/unblock

(function() {
    'use strict';

    // Kiểm tra xem user đã đăng nhập chưa
    let userId = null;
    let socket = null;
    
    try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
            const user = JSON.parse(userJson);
            userId = user && (user.Id_user || user.id_user || user.id);
        }
    } catch (e) {
        console.error('Lỗi khi đọc thông tin user:', e);
    }

    // Chỉ khởi tạo socket nếu user đã đăng nhập
    if (!userId) {
        console.log('User chưa đăng nhập, không khởi tạo socket cho block notification');
        return;
    }

    // Kiểm tra xem đã có socket từ chat-client.js chưa
    // Nếu có thì dùng chung để tránh tạo nhiều connections
    if (window.userSocket) {
        console.log('✅ [BLOCK NOTIFICATION] Sử dụng socket connection có sẵn từ chat-client.js');
        socket = window.userSocket;
    } else {
        // Kết nối Socket.io
        socket = io();
        window.userSocket = socket; // Lưu để dùng chung
        console.log(`🔌 [BLOCK NOTIFICATION] Tạo socket connection mới cho user ${userId}...`);
    }

    // Đăng ký event listeners TRƯỚC khi emit userOnline
    // Lắng nghe sự kiện accountBlocked
    socket.on('accountBlocked', (data) => {
        console.log('🚫 [BLOCK NOTIFICATION] Nhận thông báo account bị block:', data);
        
        // Hiển thị thông báo
        showBlockNotification(data);
        
        // Tự động logout sau 3 giây
        setTimeout(() => {
            handleLogout();
        }, 3000);
    });

    // Lắng nghe sự kiện accountUnblocked
    socket.on('accountUnblocked', (data) => {
        console.log('✅ [BLOCK NOTIFICATION] Nhận thông báo account được unblock:', data);
        
        // Hiển thị thông báo unblock
        showUnblockNotification(data);
    });

    // Hàm để emit userOnline
    function emitUserOnline() {
        if (socket && socket.connected) {
            socket.emit("userOnline", userId);
            console.log(`📢 [BLOCK NOTIFICATION] Đã emit userOnline với userId: ${userId}, socket ID: ${socket.id}`);
        } else {
            console.warn(`⚠️ [BLOCK NOTIFICATION] Socket chưa connected, không thể emit userOnline`);
        }
    }

    // Đợi socket kết nối xong rồi mới emit userOnline
    socket.on('connect', () => {
        console.log(`✅ [BLOCK NOTIFICATION] Socket đã kết nối, socket ID: ${socket.id}`);
        emitUserOnline();
    });

    // Nếu socket đã connected sẵn (trường hợp hiếm)
    if (socket.connected) {
        console.log(`✅ [BLOCK NOTIFICATION] Socket đã connected sẵn`);
        emitUserOnline();
    }

    // Hàm hiển thị thông báo block
    function showBlockNotification(data) {
        // Tạo modal hoặc banner thông báo
        const notificationHTML = `
            <div id="block-notification-modal" class="block-notification-overlay">
                <div class="block-notification-modal">
                    <div class="block-notification-icon">
                        <i class="fas fa-ban"></i>
                    </div>
                    <h3>Tài khoản của bạn đã bị cấm</h3>
                    <p>${data.message || 'Tài khoản của bạn đã bị cấm bởi quản trị viên.'}</p>
                    ${data.reason ? `<p class="text-muted"><small>Lý do: ${data.reason}</small></p>` : ''}
                    <p class="text-muted"><small>Bạn sẽ được đăng xuất tự động trong vài giây...</small></p>
                    <button class="btn btn-primary mt-3" onclick="handleLogout()">Đăng xuất ngay</button>
                </div>
            </div>
        `;

        // Thêm vào body
        document.body.insertAdjacentHTML('beforeend', notificationHTML);

        // Thêm CSS nếu chưa có
        if (!document.getElementById('block-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'block-notification-styles';
            style.textContent = `
                .block-notification-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: fadeIn 0.3s ease;
                }

                .block-notification-modal {
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.3s ease;
                }

                .block-notification-icon {
                    font-size: 64px;
                    color: #dc3545;
                    margin-bottom: 20px;
                }

                .block-notification-modal h3 {
                    color: #dc3545;
                    margin-bottom: 15px;
                    font-weight: 600;
                }

                .block-notification-modal p {
                    color: #333;
                    margin-bottom: 10px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(30px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Hàm hiển thị thông báo unblock
    function showUnblockNotification(data) {
        // Sử dụng SweetAlert2 nếu có, hoặc alert thông thường
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Tài khoản đã được mở khóa',
                text: data.message || 'Tài khoản của bạn đã được mở khóa. Bạn có thể tiếp tục sử dụng dịch vụ.',
                confirmButtonText: 'Đồng ý',
                timer: 5000,
                timerProgressBar: true
            });
        } else {
            alert(data.message || 'Tài khoản của bạn đã được mở khóa.');
        }
    }

    // Hàm xử lý logout
    function handleLogout() {
        // Xóa token và user info
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.clear();

        // Ngắt kết nối socket
        if (socket) {
            socket.disconnect();
        }

        // Redirect về trang đăng nhập
        window.location.href = '/auth.html?blocked=true';
    }

    // Expose handleLogout để có thể gọi từ HTML
    window.handleLogout = handleLogout;

    // Xử lý khi socket disconnect
    socket.on('disconnect', () => {
        console.log('🔌 [BLOCK NOTIFICATION] Socket đã ngắt kết nối');
    });

    // Xử lý khi socket reconnect
    socket.on('reconnect', () => {
        console.log(`🔄 [BLOCK NOTIFICATION] Socket đã kết nối lại, socket ID: ${socket.id}`);
        if (userId) {
            socket.emit("userOnline", userId);
            console.log(`📢 [BLOCK NOTIFICATION] Đã emit userOnline lại sau reconnect với userId: ${userId}`);
        }
    });

    // Xử lý lỗi kết nối
    socket.on('connect_error', (error) => {
        console.error('❌ [BLOCK NOTIFICATION] Lỗi kết nối socket:', error);
    });

    // Debug: Log tất cả events để kiểm tra
    socket.onAny((eventName, ...args) => {
        if (eventName === 'accountBlocked' || eventName === 'accountUnblocked') {
            console.log(`📨 [BLOCK NOTIFICATION] Nhận event: ${eventName}`, args);
        }
    });

})();


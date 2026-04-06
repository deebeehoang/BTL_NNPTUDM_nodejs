// adminMclient.js - Quản lý người dùng trong dashboard admin
let editingUser = null;

function loadUsers() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Không tìm thấy token đăng nhập');
        return;
    }

    fetch(`${CONFIG.API_BASE_URL}/users`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error('Lỗi khi tải dữ liệu');
        }
        return res.json();
    })
        .then(data => {
        console.log('Dữ liệu người dùng:', data);
            const tbody = document.getElementById('usersList');
            tbody.innerHTML = '';
            const users = data.data.users;

            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Không có người dùng nào</td></tr>';
                return;
            }

            users.forEach(user => {
                const tr = document.createElement('tr');
            tr.setAttribute('data-user', JSON.stringify(user));
                tr.innerHTML = `
                <td>${user.Ten_khach_hang || 'N/A'}</td>
                <td>${user.Email || 'N/A'}</td>
                <td>${user.so_booking || 0}</td>
                <td>${user.so_hoa_don || 0}</td>
                <td>
                    <span class="badge ${user.status === 'Blocked' ? 'bg-danger' : 'bg-success'}">${user.status === 'Blocked' ? 'Đã chặn' : 'Hoạt động'}</span>
                </td>
                <td>
                    <button class="btn btn-info btn-sm" onclick="viewUser(this)">Xem</button>
                    <button class="btn btn-warning btn-sm" onclick="editUser(this)">Sửa</button>
                    ${user.status === 'Blocked' 
                        ? `<button class="btn btn-success btn-sm" onclick="toggleBlockUser(this, 'unblock')">Gỡ chặn</button>`
                        : `<button class="btn btn-danger btn-sm" onclick="toggleBlockUser(this, 'block')">Chặn</button>`
                    }
                    </td>
                `;
                tbody.appendChild(tr);
            console.log('User data:', user);
            });
        })
        .catch(err => {
            console.error('Lỗi tải danh sách người dùng:', err);
            const tbody = document.getElementById('usersList');
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger">Không thể tải dữ liệu người dùng: ' + err.message + '</td></tr>';
    });
}

// Hàm mở tab người dùng và tải dữ liệu
function loadUsersTab() {
    // Ẩn tất cả các section khác
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Hiển thị section người dùng
    const usersSection = document.getElementById('usersSection');
    if (usersSection) {
        usersSection.classList.add('active');
    }
    
    // Cập nhật tiêu đề
    const title = document.getElementById('sectionTitle');
    if (title) title.textContent = 'Quản lý người dùng';
    
    // Tải dữ liệu người dùng
    loadUsers();
}

// Xem chi tiết người dùng
async function viewUser(button) {
    const userRow = button.closest('tr');
    const userData = JSON.parse(userRow.getAttribute('data-user'));
    
    if (!userData || !userData.Ma_khach_hang) {
        showAlert('error', 'Không thể tải thông tin người dùng');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/${encodeURIComponent(userData.Ma_khach_hang)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi tải thông tin người dùng');
        }

        const data = await response.json();
        
        if (data.status !== 'success') {
            throw new Error(data.message || 'Lỗi khi tải thông tin người dùng');
        }

        const user = data.data.user;
        const bookings = data.data.bookings || [];

        // Tạo nội dung modal
        const modalContent = `
            <div class="modal fade" id="userDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chi tiết người dùng</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <h6>Thông tin cá nhân</h6>
                                    <p><strong>Mã khách hàng:</strong> ${user.Ma_khach_hang}</p>
                                    <p><strong>Họ tên:</strong> ${user.Ten_khach_hang || 'N/A'}</p>
                                    <p><strong>Email:</strong> ${user.Email || 'N/A'}</p>
                                    <p><strong>CCCD:</strong> ${user.CCCD || 'N/A'}</p>
                                    <p><strong>Địa chỉ:</strong> ${user.Dia_chi || 'N/A'}</p>
                                    <p><strong>Ngày sinh:</strong> ${user.Ngay_sinh ? new Date(user.Ngay_sinh).toLocaleDateString('vi-VN') : 'N/A'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Thống kê</h6>
                                    <p><strong>Tổng số booking:</strong> ${userData.so_booking || 0}</p>
                                    <p><strong>Tổng số hóa đơn:</strong> ${userData.so_hoa_don || 0}</p>
                                </div>
                            </div>
                            <div class="booking-history">
                                <h6>Lịch sử đặt tour</h6>
                                <div class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Mã booking</th>
                                                <th>Tên tour</th>
                                                <th>Ngày đặt</th>
                                                <th>Trạng thái</th>
                                                <th>Tổng tiền</th>
                                               
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${bookings.length > 0 ? bookings.map(booking => `
                                                <tr>
                                                    <td>${booking.Ma_booking || 'N/A'}</td>
                                                    <td>${booking.Ten_tour || 'N/A'}</td>
                                                    <td>${booking.Ngay_dat ? new Date(booking.Ngay_dat).toLocaleDateString('vi-VN') : 'N/A'}</td>
                                                    <td>${formatBookingStatus(booking.Trang_thai_booking)}</td>
                                                    <td>${booking.Tong_tien ? booking.Tong_tien.toLocaleString('vi-VN') + 'đ' : 'N/A'}</td>
                                                  
                                                </tr>
                                            `).join('') : '<tr><td colspan="5" class="text-center">Chưa có booking nào</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Thêm modal vào body
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('userDetailModal'));
        modal.show();

        // Xóa modal khi đóng
        document.getElementById('userDetailModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });

    } catch (error) {
        console.error('Lỗi khi tải thông tin người dùng:', error);
        showAlert('error', error.message || 'Không thể tải thông tin chi tiết người dùng');
    }
}

// Format trạng thái booking
function formatBookingStatus(status) {
    const statusMap = {
        'Cho_xac_nhan': 'Chờ xác nhận',
        'Da_xac_nhan': 'Đã xác nhận',
        'Da_huy': 'Đã hủy',
        'Hoan_thanh': 'Hoàn thành',
        'Cho_xu_ly_huy': 'Chờ xử lý hủy'
    };
    return statusMap[status] || status;
}

// Chỉnh sửa thông tin người dùng
async function editUser(button) {
    const userRow = button.closest('tr');
    const userData = JSON.parse(userRow.getAttribute('data-user'));
    
    if (!userData || !userData.Ma_khach_hang) {
        showAlert('error', 'Không thể tải thông tin người dùng');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/${encodeURIComponent(userData.Ma_khach_hang)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi tải thông tin người dùng');
        }

        const data = await response.json();
        const user = data.data.user;
        editingUser = user;

        // Tạo form chỉnh sửa
        const modalContent = `
            <div class="modal fade" id="editUserModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chỉnh sửa thông tin người dùng</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <div class="mb-3">
                                    <label class="form-label">Mã khách hàng</label>
                                    <input type="text" class="form-control" value="${user.Ma_khach_hang}" disabled>
                                </div>
                                <div class="mb-3">
                                    <label for="Ten_khach_hang" class="form-label">Họ tên</label>
                                    <input type="text" class="form-control" id="Ten_khach_hang" value="${user.Ten_khach_hang || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="Email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="Email" value="${user.Email || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label for="CCCD" class="form-label">CCCD</label>
                                    <input type="text" class="form-control" id="CCCD" value="${user.CCCD || ''}">
                                </div>
                                <div class="mb-3">
                                    <label for="Dia_chi" class="form-label">Địa chỉ</label>
                                    <input type="text" class="form-control" id="Dia_chi" value="${user.Dia_chi || ''}">
                                </div>
                                <div class="mb-3">
                                    <label for="Ngay_sinh" class="form-label">Ngày sinh</label>
                                    <input type="date" class="form-control" id="Ngay_sinh" value="${user.Ngay_sinh || ''}">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                            <button type="button" class="btn btn-primary" onclick="saveUserChanges()">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Thêm modal vào body
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
        modal.show();

        // Xóa modal khi đóng
        document.getElementById('editUserModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
            editingUser = null;
        });

    } catch (error) {
        console.error('Lỗi khi tải thông tin người dùng:', error);
        showAlert('error', error.message || 'Không thể tải thông tin chi tiết người dùng');
    }
}

// Lưu thay đổi thông tin người dùng
async function saveUserChanges() {
    if (!editingUser) {
        showAlert('error', 'Không có thông tin người dùng để cập nhật');
        return;
    }

    const updatedData = {
        Ten_khach_hang: document.getElementById('Ten_khach_hang').value,
        Email: document.getElementById('Email').value,
        CCCD: document.getElementById('CCCD').value,
        Dia_chi: document.getElementById('Dia_chi').value,
        Ngay_sinh: document.getElementById('Ngay_sinh').value
    };

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/${encodeURIComponent(editingUser.Ma_khach_hang)}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('success', 'Cập nhật thông tin thành công');
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            loadUsers(); // Tải lại danh sách người dùng
        } else {
            throw new Error(data.message || 'Lỗi khi cập nhật thông tin');
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin:', error);
        showAlert('error', error.message || 'Không thể cập nhật thông tin người dùng');
    }
}

// Block/Unblock người dùng
async function toggleBlockUser(button, action) {
    const userRow = button.closest('tr');
    const userData = JSON.parse(userRow.getAttribute('data-user'));
    
    if (!userData || !userData.Ma_khach_hang) {
        showAlert('error', 'Không thể xác định người dùng');
        return;
    }

    const actionText = action === 'block' ? 'chặn' : 'gỡ chặn';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} người dùng ${userData.Ten_khach_hang}?`)) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('error', 'Vui lòng đăng nhập lại');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/${encodeURIComponent(userData.Ma_khach_hang)}/block`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Lỗi khi ${actionText} người dùng`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            showAlert('success', data.message || `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} người dùng thành công`);
            // Reload danh sách để cập nhật trạng thái
            loadUsers();
        } else {
            showAlert('error', data.message || `Lỗi khi ${actionText} người dùng`);
        }
    } catch (error) {
        console.error(`Lỗi khi ${actionText} người dùng:`, error);
        showAlert('error', error.message || 'Không thể kết nối với máy chủ');
    }
}

// Xoá người dùng (giữ lại để tương thích, nhưng khuyến khích dùng block)
async function deleteUser(button) {
    const userRow = button.closest('tr');
    const userData = JSON.parse(userRow.getAttribute('data-user'));
    
    if (!userData || !userData.Ma_khach_hang) {
        showAlert('error', 'Không thể xác định người dùng cần xóa');
        return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xoá người dùng ${userData.Ten_khach_hang}?\n\nLưu ý: Chức năng xóa chỉ dành cho tài khoản chưa có booking. Để vô hiệu hóa tài khoản, vui lòng sử dụng chức năng "Chặn".`)) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('error', 'Vui lòng đăng nhập lại');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/users/${encodeURIComponent(userData.Ma_khach_hang)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi xóa người dùng');
        }

        const data = await response.json();

        if (data.status === 'success') {
            showAlert('success', 'Xoá người dùng thành công');
            userRow.remove(); // Xóa dòng khỏi bảng
        } else {
            showAlert('error', data.message || 'Lỗi khi xoá người dùng');
        }
    } catch (error) {
        console.error('Lỗi khi xoá người dùng:', error);
        showAlert('error', error.message || 'Không thể kết nối với máy chủ');
    }
}

// Hiển thị thông báo
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container') || document.body;
    container.insertAdjacentElement('afterbegin', alertDiv);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Gắn vào window để dùng từ admin.js
window.loadUsersTab = loadUsersTab;
window.viewUser = viewUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.toggleBlockUser = toggleBlockUser;
window.saveUserChanges = saveUserChanges;

// Profile Page JavaScript - Modern Implementation
// Kiểm tra cấu hình API_URL từ config.js
if (typeof window.API_URL === 'undefined') {
    window.API_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '/api';
    console.log('API_URL được thiết lập từ CONFIG:', window.API_URL);
}

// State management
let profileData = {
    customer: null,
    account: null,
    isEditMode: false
};

// Utility functions
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Initialize page
// Function to setup navbar scroll effect
function setupNavbarScrollEffect() {
  window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  // Setup navbar scroll effect
  setupNavbarScrollEffect();
    // Tải navbar và footer
    if (typeof loadNavbar === 'function') loadNavbar();
    if (typeof loadFooter === 'function') loadFooter();
    
    // Hiển thị trạng thái đang tải
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.classList.remove('d-none');
    }
    
    // Kiểm tra đăng nhập
    if (!isLoggedIn()) {
        if (loadingSpinner) loadingSpinner.classList.add('d-none');
        const notLoggedIn = document.getElementById('not-logged-in');
        const profileCard = document.getElementById('profile-card');
        if (notLoggedIn) notLoggedIn.classList.remove('d-none');
        if (profileCard) profileCard.classList.add('d-none');
        return;
    }
    
    // Load thông tin khách hàng
    loadCustomerInfo();

    // Setup event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // Edit/Cancel buttons
    const editBtn = document.getElementById('edit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (editBtn) {
        editBtn.addEventListener('click', () => switchToEditMode());
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => switchToViewMode());
    }

    // Form submit
    const customerForm = document.getElementById('customer-form');
    if (customerForm) {
        customerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (customerForm.checkValidity()) {
                updateCustomerInfo();
            } else {
                customerForm.classList.add('was-validated');
            }
        });
    }

    // Avatar upload
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarPreview = document.getElementById('avatar-preview');
    
    if (avatarUpload && avatarPreview) {
        // Click vào ảnh để mở file picker
        avatarPreview.addEventListener('click', function() {
            avatarUpload.click();
        });

        // Xử lý khi chọn file
        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleAvatarUpload(file);
            }
        });
    }

    // Toggle system info
    const toggleSystemInfo = document.getElementById('toggle-system-info');
    if (toggleSystemInfo) {
        toggleSystemInfo.addEventListener('click', function() {
            const content = document.getElementById('system-info-content');
            const icon = this.querySelector('i');
            if (content) {
                content.classList.toggle('d-none');
                if (icon) {
                    icon.classList.toggle('fa-chevron-down');
                    icon.classList.toggle('fa-chevron-up');
                }
            }
        });
    }

    // Real-time validation
    setupRealTimeValidation();
}

// Setup real-time form validation
function setupRealTimeValidation() {
    const inputs = ['ten_khach_hang', 'ngay_sinh', 'gioi_tinh', 'cccd', 'dia_chi'];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                if (this.classList.contains('is-invalid')) {
                    validateField(this);
                }
            });
        }
    });
}

// Validate individual field
function validateField(field) {
    const isValid = field.checkValidity();
    
    if (isValid) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
    } else {
        field.classList.remove('is-valid');
        field.classList.add('is-invalid');
    }
    
    return isValid;
}

// Load customer information
async function loadCustomerInfo() {
    try {
        const loadingSpinner = document.getElementById('loading-spinner');
        const profileCard = document.getElementById('profile-card');
        const notLoggedIn = document.getElementById('not-logged-in');
        
        if (loadingSpinner) loadingSpinner.classList.remove('d-none');
        if (profileCard) profileCard.classList.add('d-none');
        if (notLoggedIn) notLoggedIn.classList.add('d-none');
        
        const API_URL = window.API_URL || '/api';
        const token = localStorage.getItem('token');
        
        if (!token) {
            throw new Error('Chưa đăng nhập');
        }

        const response = await fetch(`${API_URL}/customers/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 404 && errorData.data && errorData.data.account) {
                // Có tài khoản nhưng chưa có thông tin khách hàng
                profileData.account = errorData.data.account;
                displayProfileData();
                return;
            }
            throw new Error(errorData.message || 'Không thể tải thông tin');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            profileData.customer = data.data.customer;
            profileData.account = data.data.account;
            displayProfileData();
        } else {
            throw new Error(data.message || 'Không thể tải thông tin');
        }
    } catch (error) {
        console.error('Lỗi khi tải thông tin khách hàng:', error);
        showAlert('Không thể tải thông tin. Vui lòng thử lại sau.', 'danger');
        
        const loadingSpinner = document.getElementById('loading-spinner');
        const notLoggedIn = document.getElementById('not-logged-in');
        if (loadingSpinner) loadingSpinner.classList.add('d-none');
        if (notLoggedIn) notLoggedIn.classList.remove('d-none');
    }
}

// Display profile data
function displayProfileData() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const profileCard = document.getElementById('profile-card');
    
    if (loadingSpinner) loadingSpinner.classList.add('d-none');
    if (profileCard) profileCard.classList.remove('d-none');

    const account = profileData.account;
    const customer = profileData.customer;

    // Display avatar and user info
    const avatarPreview = document.getElementById('avatar-preview');
    const userDisplayName = document.getElementById('user-display-name');
    const userEmail = document.getElementById('user-email');

    if (avatarPreview) {
        if (account && account.anh_dai_dien) {
            let avatarSrc = account.anh_dai_dien;
            if (!avatarSrc.startsWith('http')) {
                if (avatarSrc.startsWith('/uploads')) {
                    avatarSrc = avatarSrc.replace('/uploads', '/images/uploads');
                } else if (!avatarSrc.startsWith('/images')) {
                    avatarSrc = `/images${avatarSrc}`;
                }
            }
            avatarPreview.src = avatarSrc;
        } else {
            // Default avatar
            avatarPreview.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23ddd" width="150" height="150"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="50" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E%3F%3C/text%3E%3C/svg%3E';
        }
        avatarPreview.onerror = function() {
            this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23ddd" width="150" height="150"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="50" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E%3F%3C/text%3E%3C/svg%3E';
        };
    }

    if (userDisplayName) {
        const displayName = account?.ten_hien_thi || customer?.Ten_khach_hang || account?.id_user || 'Người dùng';
        userDisplayName.textContent = displayName;
    }

    if (userEmail) {
        userEmail.textContent = account?.email || 'Chưa có email';
    }

    // Display view mode data
    if (customer) {
        document.getElementById('view-ten_khach_hang').textContent = customer.Ten_khach_hang || '-';
        
        if (customer.Ngay_sinh) {
            const date = new Date(customer.Ngay_sinh);
            document.getElementById('view-ngay_sinh').textContent = date.toLocaleDateString('vi-VN');
        } else {
            document.getElementById('view-ngay_sinh').textContent = '-';
        }
        
        document.getElementById('view-gioi_tinh').textContent = customer.Gioi_tinh || '-';
        document.getElementById('view-cccd').textContent = customer.Cccd || '-';
        document.getElementById('view-dia_chi').textContent = customer.Dia_chi || '-';
    } else {
        // No customer data yet
        document.getElementById('view-ten_khach_hang').textContent = '-';
        document.getElementById('view-ngay_sinh').textContent = '-';
        document.getElementById('view-gioi_tinh').textContent = '-';
        document.getElementById('view-cccd').textContent = '-';
        document.getElementById('view-dia_chi').textContent = '-';
    }

    // System info (hidden by default)
    if (account) {
        document.getElementById('view-id-user').textContent = account.id_user || '-';
        document.getElementById('view-customer-id').textContent = customer?.Ma_khach_hang || '-';
        document.getElementById('view-account-type').textContent = account.loai_tai_khoan || '-';
    }

    // Populate edit form
    if (customer) {
        document.getElementById('ten_khach_hang').value = customer.Ten_khach_hang || '';
        
        if (customer.Ngay_sinh) {
            const date = new Date(customer.Ngay_sinh);
            document.getElementById('ngay_sinh').value = date.toISOString().split('T')[0];
        }
        
        document.getElementById('gioi_tinh').value = customer.Gioi_tinh || 'Nam';
        document.getElementById('cccd').value = customer.Cccd || '';
        document.getElementById('dia_chi').value = customer.Dia_chi || '';
    }

    // Reset to view mode (không reload data để tránh vòng lặp)
    if (!profileData.isEditMode) {
        const viewMode = document.getElementById('view-mode');
        const editMode = document.getElementById('edit-mode');
        
        if (viewMode) viewMode.classList.remove('d-none');
        if (editMode) editMode.classList.add('d-none');
    }
}

// Switch to edit mode
function switchToEditMode() {
    profileData.isEditMode = true;
    
    const viewMode = document.getElementById('view-mode');
    const editMode = document.getElementById('edit-mode');
    
    if (viewMode) viewMode.classList.add('d-none');
    if (editMode) editMode.classList.remove('d-none');
    
    // Reset validation states
    const form = document.getElementById('customer-form');
    if (form) {
        form.classList.remove('was-validated');
        const inputs = form.querySelectorAll('.form-control, .form-select');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
    }
    
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Switch to view mode
function switchToViewMode() {
    profileData.isEditMode = false;
    
    const viewMode = document.getElementById('view-mode');
    const editMode = document.getElementById('edit-mode');
    
    if (viewMode) viewMode.classList.remove('d-none');
    if (editMode) editMode.classList.add('d-none');
    
    // Reset form values về giá trị ban đầu từ profileData (không reload từ API)
    if (profileData.customer) {
        const customer = profileData.customer;
        const tenKhachHangEl = document.getElementById('ten_khach_hang');
        const ngaySinhEl = document.getElementById('ngay_sinh');
        const gioiTinhEl = document.getElementById('gioi_tinh');
        const cccdEl = document.getElementById('cccd');
        const diaChiEl = document.getElementById('dia_chi');
        
        if (tenKhachHangEl) tenKhachHangEl.value = customer.Ten_khach_hang || '';
        
        if (ngaySinhEl && customer.Ngay_sinh) {
            const date = new Date(customer.Ngay_sinh);
            ngaySinhEl.value = date.toISOString().split('T')[0];
        }
        
        if (gioiTinhEl) gioiTinhEl.value = customer.Gioi_tinh || 'Nam';
        if (cccdEl) cccdEl.value = customer.Cccd || '';
        if (diaChiEl) diaChiEl.value = customer.Dia_chi || '';
    }
    
    // Clear validation states
    const form = document.getElementById('customer-form');
    if (form) {
        form.classList.remove('was-validated');
        const inputs = form.querySelectorAll('.form-control, .form-select');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
    }
}

// Update customer information
async function updateCustomerInfo() {
    try {
        const saveBtn = document.getElementById('save-btn');
        const originalBtnText = saveBtn ? saveBtn.innerHTML : '';
        
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Đang lưu...';
        }
        
        // Validate all fields
        const form = document.getElementById('customer-form');
        if (!form || !form.checkValidity()) {
            form.classList.add('was-validated');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnText;
            }
            return;
        }

        // Collect form data
        const customerData = {
            ten_khach_hang: document.getElementById('ten_khach_hang').value.trim(),
            ngay_sinh: document.getElementById('ngay_sinh').value,
            gioi_tinh: document.getElementById('gioi_tinh').value,
            cccd: document.getElementById('cccd').value.trim(),
            dia_chi: document.getElementById('dia_chi').value.trim()
        };

        // Validate required fields
        if (!customerData.ten_khach_hang || !customerData.ngay_sinh || !customerData.gioi_tinh || 
            !customerData.cccd || !customerData.dia_chi) {
            showAlert('Vui lòng điền đầy đủ thông tin bắt buộc.', 'warning');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnText;
            }
            return;
        }

        // Format date
        try {
            const dateObj = new Date(customerData.ngay_sinh);
            if (isNaN(dateObj.getTime())) {
                throw new Error('Ngày sinh không hợp lệ');
            }
            customerData.ngay_sinh = dateObj.toISOString().split('T')[0];
        } catch (dateError) {
            showAlert('Ngày sinh không đúng định dạng.', 'warning');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnText;
            }
            return;
        }

        const API_URL = window.API_URL || '/api';
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/customers/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(customerData)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Không thể cập nhật thông tin');
        }

        if (data.status === 'success') {
            // Show success message
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Thành công!',
                    text: 'Cập nhật thông tin thành công',
                    icon: 'success',
                    confirmButtonText: 'Đóng',
                    timer: 2000,
                    timerProgressBar: true
                });
            } else {
                showAlert('Cập nhật thông tin thành công!', 'success');
            }
            
            // Reload data (loadCustomerInfo sẽ tự động gọi displayProfileData và set view mode)
            await loadCustomerInfo();
            
            // Đảm bảo ở view mode sau khi reload
            profileData.isEditMode = false;
            const viewMode = document.getElementById('view-mode');
            const editMode = document.getElementById('edit-mode');
            if (viewMode) viewMode.classList.remove('d-none');
            if (editMode) editMode.classList.add('d-none');
        } else {
            throw new Error(data.message || 'Có lỗi xảy ra');
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật thông tin:', error);
        const errorMessage = error.message || 'Không thể cập nhật thông tin. Vui lòng thử lại sau.';
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Lỗi!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'Đóng'
            });
        } else {
            showAlert(errorMessage, 'danger');
        }
    } finally {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Lưu thay đổi';
        }
    }
}

// Handle avatar upload
function handleAvatarUpload(file) {
    // Validate file
    if (file.size > 5 * 1024 * 1024) {
        showAlert('Kích thước file không được vượt quá 5MB', 'warning');
        return;
    }

    if (!file.type.startsWith('image/')) {
        showAlert('Vui lòng chọn file ảnh', 'warning');
        return;
    }

    // Show preview
    const avatarPreview = document.getElementById('avatar-preview');
    if (avatarPreview) {
        const reader = new FileReader();
        reader.onload = function(e) {
            avatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Upload avatar
    uploadAvatar(file);
}

// Upload avatar to server
async function uploadAvatar(file) {
    try {
        const avatarPreview = document.getElementById('avatar-preview');
        if (avatarPreview) {
            avatarPreview.style.opacity = '0.5';
        }

        const API_URL = window.API_URL || '/api';
        const token = localStorage.getItem('token');
        
        if (!token) {
            showAlert('Bạn chưa đăng nhập', 'warning');
            return;
        }

        // Create FormData
        const formData = new FormData();
        formData.append('image', file);
        formData.append('type', 'avatar');

        // Upload image
        const uploadResponse = await fetch(`${API_URL}/upload?type=avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('Không thể upload ảnh');
        }

        const uploadData = await uploadResponse.json();
        
        if (uploadData.status !== 'success') {
            throw new Error(uploadData.message || 'Lỗi khi upload ảnh');
        }

        // Get image URL
        let imageUrl = uploadData.imageUrl || `/images/uploads/avatar/${uploadData.filename}`;
        
        // Ensure correct path format
        if (!imageUrl.startsWith('http')) {
            if (imageUrl.startsWith('/uploads')) {
                imageUrl = imageUrl.replace('/uploads', '/images/uploads');
            } else if (!imageUrl.startsWith('/images')) {
                imageUrl = `/images${imageUrl}`;
            }
        }
        
        const fullImageUrl = imageUrl;

        // Update avatar in database
        const updateResponse = await fetch(`${API_URL}/auth/profile/avatar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                anh_dai_dien: fullImageUrl
            })
        });

        if (!updateResponse.ok) {
            throw new Error('Không thể cập nhật ảnh đại diện');
        }

        const updateData = await updateResponse.json();
        
        if (updateData.status === 'success') {
            // Update localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.anh_dai_dien = fullImageUrl;
            localStorage.setItem('user', JSON.stringify(user));

            // Update preview
            if (avatarPreview) {
                let previewSrc = fullImageUrl;
                if (!previewSrc.startsWith('http')) {
                    if (previewSrc.startsWith('/uploads')) {
                        previewSrc = previewSrc.replace('/uploads', '/images/uploads');
                    } else if (!previewSrc.startsWith('/images')) {
                        previewSrc = `/images${previewSrc}`;
                    }
                }
                avatarPreview.src = previewSrc;
                avatarPreview.style.opacity = '1';
            }

            // Update account data
            if (profileData.account) {
                profileData.account.anh_dai_dien = fullImageUrl;
            }

            // Show success message
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Thành công!',
                    text: 'Cập nhật ảnh đại diện thành công',
                    icon: 'success',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } else {
                showAlert('Cập nhật ảnh đại diện thành công!', 'success');
            }
            
            // Reload navbar to update avatar
            if (typeof loadNavbar === 'function') {
                loadNavbar();
            }
        } else {
            throw new Error(updateData.message || 'Có lỗi xảy ra');
        }
    } catch (error) {
        console.error('Lỗi khi upload ảnh đại diện:', error);
        const avatarPreview = document.getElementById('avatar-preview');
        if (avatarPreview) {
            avatarPreview.style.opacity = '1';
        }
        
        const errorMessage = error.message || 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại sau.';
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Lỗi!',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'Đóng'
            });
        } else {
            showAlert(errorMessage, 'danger');
        }
    }
}

// Show alert message
function showAlert(message, type) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: type === 'warning' || type === 'danger' ? 'Cảnh báo!' : 'Thông báo',
            text: message,
            icon: type === 'success' ? 'success' : 
                 type === 'info' ? 'info' : 
                 type === 'warning' ? 'warning' : 'error',
            confirmButtonText: 'Đóng',
            timer: type === 'success' ? 2000 : undefined,
            timerProgressBar: type === 'success'
        });
        return;
    }
    
    // Fallback alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Export functions for global access
window.loadCustomerInfo = loadCustomerInfo;
window.switchToEditMode = switchToEditMode;
window.switchToViewMode = switchToViewMode;

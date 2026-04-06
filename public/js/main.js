// Update ratings section visibility based on login status
function updateRatingsSectionVisibility() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    
    const ratingsSection = document.getElementById('myRatings');
    const ratingsNavLink = document.querySelector('a[href="#myRatings"]');
    
    if (token && user && user.loai_tai_khoan === 'Khach_hang') {
        // Show ratings section for customers
        if (ratingsSection) {
            ratingsSection.style.display = 'block';
        }
        if (ratingsNavLink) {
            ratingsNavLink.style.display = 'block';
        }
        
        // Load ratings if not already loaded
        const container = document.getElementById('myRatingsContent');
        if (container && container.innerHTML.includes('spinner-border')) {
            loadUserRatings();
        }
    } else {
        // Hide ratings section for non-customers
        if (ratingsSection) {
            ratingsSection.style.display = 'none';
        }
        if (ratingsNavLink) {
            ratingsNavLink.style.display = 'none';
        }
    }
}

// Load user ratings when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateRatingsSectionVisibility();
    initializeStarRatings();
    
    // Check for payment success parameter and show notification
    checkPaymentSuccess();
    
    // Listen for storage changes (login/logout from other tabs)
    window.addEventListener('storage', function(e) {
        if (e.key === 'token' || e.key === 'user') {
            updateRatingsSectionVisibility();
        }
    });
    
    // Listen for custom login/logout events
    window.addEventListener('userLogin', function() {
        updateRatingsSectionVisibility();
    });
    
    window.addEventListener('userLogout', function() {
        updateRatingsSectionVisibility();
    });
});

// Check for payment success and show notification
function checkPaymentSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    const bookingId = urlParams.get('bookingId');
    const method = urlParams.get('method');
    
    if (payment === 'success') {
        // Remove query parameters from URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Show success notification using Bootstrap toast
        showPaymentSuccessToast(bookingId, method);
    }
}

// Show payment success toast notification
function showPaymentSuccessToast(bookingId, method) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'payment-success-toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Thanh toán thành công!</strong>
                    ${bookingId ? `<br><small>Mã booking: ${bookingId}</small>` : ''}
                    ${method ? `<br><small>Phương thức: ${method}</small>` : ''}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000 // Show for 5 seconds
    });
    
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Load user ratings
async function loadUserRatings() {
    try {
        console.log('🔍 Loading user ratings...');
        
        const response = await apiRequest('/ratings/my-ratings');
        
        if (response.status === 'success') {
            displayUserRatings(response.data.ratings || []);
        } else {
            throw new Error(response.message || 'Không thể tải đánh giá');
        }
    } catch (error) {
        console.error('❌ Error loading user ratings:', error);
        displayNoRatings();
    }
}

// Display user ratings
function displayUserRatings(ratings) {
    const container = document.getElementById('myRatingsContent');
    
    if (!ratings || ratings.length === 0) {
        displayNoRatings();
        return;
    }
    
    let html = '';
    ratings.forEach(rating => {
        const ratingDate = new Date(rating.Ngay_danh_gia).toLocaleDateString('vi-VN');
        const stars = generateStarsHTML(rating.So_sao);
        
        html += `
            <div class="rating-item">
                <div class="rating-header">
                    <div class="rating-tour-info">
                        <div class="rating-tour-name">${rating.Ten_tour || 'Tour'}</div>
                        <div class="rating-date">
                            <i class="fas fa-calendar me-1"></i>${ratingDate}
                        </div>
                    </div>
                </div>
                
                <div class="rating-stars">${stars}</div>
                
                ${rating.Binh_luan ? `
                    <div class="rating-comment">
                        <i class="fas fa-quote-left me-2"></i>${rating.Binh_luan}
                    </div>
                ` : ''}
                
                <div class="rating-criteria">
                    <div class="criteria-item">
                        <div class="criteria-label">Dịch vụ</div>
                        <div class="criteria-score">${rating.Diem_dich_vu || 0}/5</div>
                    </div>
                    <div class="criteria-item">
                        <div class="criteria-label">Hướng dẫn viên</div>
                        <div class="criteria-score">${rating.Diem_huong_dan_vien || 0}/5</div>
                    </div>
                    <div class="criteria-item">
                        <div class="criteria-label">Phương tiện</div>
                        <div class="criteria-score">${rating.Diem_phuong_tien || 0}/5</div>
                    </div>
                    <div class="criteria-item">
                        <div class="criteria-label">Giá cả</div>
                        <div class="criteria-score">${rating.Diem_gia_ca || 0}/5</div>
                    </div>
                </div>
                
                <div class="rating-actions">
                    <button class="btn btn-edit-rating" data-rating-id="${rating.Id_review}" data-booking-id="${rating.Ma_booking}" data-tour-name="${(rating.Ten_tour || '').replace(/"/g, '&quot;')}" data-tour-date="${ratingDate}" data-overall-rating="${rating.So_sao}" data-comment="${(rating.Binh_luan || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" data-dich-vu="${rating.Diem_dich_vu || 0}" data-huong-dan-vien="${rating.Diem_huong_dan_vien || 0}" data-phuong-tien="${rating.Diem_phuong_tien || 0}" data-gia-ca="${rating.Diem_gia_ca || 0}" data-hinh-anh="${(rating.Hinh_anh || '').replace(/"/g, '&quot;')}">
                        <i class="fas fa-edit me-1"></i>Chỉnh sửa
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners to edit buttons
    container.querySelectorAll('.btn-edit-rating').forEach(btn => {
        btn.addEventListener('click', function() {
            const ratingId = this.dataset.ratingId;
            const bookingId = this.dataset.bookingId;
            const tourName = this.dataset.tourName;
            const tourDate = this.dataset.tourDate;
            const overallRating = parseInt(this.dataset.overallRating) || 0;
            const comment = this.dataset.comment || '';
            const dichVu = parseInt(this.dataset.dichVu) || 0;
            const huongDanVien = parseInt(this.dataset.huongDanVien) || 0;
            const phuongTien = parseInt(this.dataset.phuongTien) || 0;
            const giaCa = parseInt(this.dataset.giaCa) || 0;
            const hinhAnh = this.dataset.hinhAnh || '';
            
            editRating(ratingId, bookingId, tourName, tourDate, overallRating, comment, dichVu, huongDanVien, phuongTien, giaCa, hinhAnh);
        });
    });
}

// Display no ratings message
function displayNoRatings() {
    const container = document.getElementById('myRatingsContent');
    container.innerHTML = `
        <div class="no-ratings">
            <i class="fas fa-star"></i>
            <h4>Chưa có đánh giá nào</h4>
            <p>Bạn chưa đánh giá tour nào. Hãy đặt tour và trải nghiệm để có thể đánh giá!</p>
            <a href="alltour.html" class="btn btn-primary">
                <i class="fas fa-search me-1"></i>Khám phá tour
            </a>
        </div>
    `;
}

// Generate stars HTML
function generateStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Sao đầy
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // Sao nửa
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Sao rỗng
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Edit rating function
function editRating(ratingId, bookingId, tourName, tourDate, overallRating, comment, dichVu, huongDanVien, phuongTien, giaCa, hinhAnh = '') {
    console.log('📝 Editing rating:', { ratingId, bookingId, tourName, overallRating, hinhAnh });
    
    // Set form values
    const editRatingIdEl = document.getElementById('editRatingId');
    const editBookingIdEl = document.getElementById('editBookingId');
    const editTourNameEl = document.getElementById('editTourName');
    const editTourDateEl = document.getElementById('editTourDate');
    const editCommentEl = document.getElementById('editComment');
    
    if (!editRatingIdEl || !editBookingIdEl || !editTourNameEl || !editTourDateEl || !editCommentEl) {
        console.error('❌ Edit rating modal elements not found');
        showAlert('error', 'Không thể mở form chỉnh sửa đánh giá. Vui lòng tải lại trang.');
        return;
    }
    
    editRatingIdEl.value = ratingId || '';
    editBookingIdEl.value = bookingId || '';
    editTourNameEl.textContent = tourName || 'Tour';
    editTourDateEl.textContent = tourDate || '';
    editCommentEl.value = comment || '';
    
    // Initialize image arrays
    window.editRatingImages = {
        existing: [], // Existing images from server
        new: []      // New uploaded images
    };
    
    // Load existing images
    if (hinhAnh) {
        const imageUrls = hinhAnh.split(',').map(img => img.trim()).filter(img => img);
        window.editRatingImages.existing = imageUrls;
    }
    
    // Show modal first
    const modalElement = document.getElementById('editRatingModal');
    if (!modalElement) {
        console.error('❌ Edit rating modal not found');
        showAlert('error', 'Không thể mở form chỉnh sửa đánh giá. Vui lòng tải lại trang.');
        return;
    }
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    
    // Wait for modal to be shown before setting star ratings
    modalElement.addEventListener('shown.bs.modal', function onModalShown() {
        // Remove listener to avoid multiple calls
        modalElement.removeEventListener('shown.bs.modal', onModalShown);
        
        // Set overall rating
        setStarRating('overallRating', overallRating || 0);
        const overallRatingElement = document.getElementById('overallRatingValue');
        if (overallRatingElement) {
            overallRatingElement.value = overallRating || 0;
        }
        
        // Set criteria ratings
        setStarRating('dich_vu', dichVu || 0);
        const dichVuElement = document.getElementById('dich_vu_rating');
        if (dichVuElement) {
            dichVuElement.value = dichVu || 0;
        }
        
        setStarRating('huong_dan_vien', huongDanVien || 0);
        const huongDanVienElement = document.getElementById('huong_dan_vien_rating');
        if (huongDanVienElement) {
            huongDanVienElement.value = huongDanVien || 0;
        }
        
        setStarRating('phuong_tien', phuongTien || 0);
        const phuongTienElement = document.getElementById('phuong_tien_rating');
        if (phuongTienElement) {
            phuongTienElement.value = phuongTien || 0;
        }
        
        setStarRating('gia_ca', giaCa || 0);
        const giaCaElement = document.getElementById('gia_ca_rating');
        if (giaCaElement) {
            giaCaElement.value = giaCa || 0;
        }
        
        // Re-initialize star ratings for the modal
        initializeStarRatings();
        
        // Initialize image upload
        initializeEditImageUpload();
        
        // Display existing images
        displayEditImages();
        
        // Force show upload area (in case it's hidden)
        const uploadArea = document.getElementById('editUploadArea');
        const uploadSection = uploadArea ? uploadArea.closest('.mb-3') : null;
        if (uploadArea) {
            uploadArea.style.display = 'flex';
            uploadArea.style.visibility = 'visible';
            uploadArea.style.opacity = '1';
        }
        if (uploadSection) {
            uploadSection.style.display = 'block';
            uploadSection.style.visibility = 'visible';
            uploadSection.style.opacity = '1';
        }
    }, { once: true });
}

// Set star rating
function setStarRating(containerId, rating) {
    let container;
    
    // Try to find by ID first
    container = document.getElementById(containerId);
    
    // If not found by ID, try to find by data-criteria attribute
    if (!container) {
        container = document.querySelector(`[data-criteria="${containerId}"]`);
    }
    
    if (!container) {
        console.warn(`Container with id or data-criteria '${containerId}' not found`);
        return;
    }
    const stars = container.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Initialize star rating interactions
function initializeStarRatings() {
    // Overall rating stars (in modal)
    const overallStars = document.querySelectorAll('#overallRating .star');
    overallStars.forEach((star, index) => {
        // Remove existing listeners to avoid duplicates
        const newStar = star.cloneNode(true);
        star.parentNode.replaceChild(newStar, star);
        
        newStar.addEventListener('click', function() {
            const rating = index + 1;
            setStarRating('overallRating', rating);
            const overallRatingElement = document.getElementById('overallRatingValue');
            if (overallRatingElement) {
                overallRatingElement.value = rating;
            }
        });
    });
    
    // Criteria rating stars (in modal)
    const criteriaContainers = document.querySelectorAll('.criteria-stars');
    criteriaContainers.forEach(container => {
        const stars = container.querySelectorAll('.star');
        const criteria = container.dataset.criteria;
        
        stars.forEach((star, index) => {
            // Remove existing listeners to avoid duplicates
            const newStar = star.cloneNode(true);
            star.parentNode.replaceChild(newStar, star);
            
            newStar.addEventListener('click', function() {
                const rating = index + 1;
                setStarRating(criteria, rating);
                const ratingElement = document.getElementById(`${criteria}_rating`);
                if (ratingElement) {
                    ratingElement.value = rating;
                }
            });
        });
    });
    
    // Save edit rating button
    const saveEditRatingBtn = document.getElementById('saveEditRating');
    if (saveEditRatingBtn) {
        // Remove existing listeners to avoid duplicates
        const newBtn = saveEditRatingBtn.cloneNode(true);
        saveEditRatingBtn.parentNode.replaceChild(newBtn, saveEditRatingBtn);
        
        newBtn.addEventListener('click', async function() {
            await saveEditRating();
        });
    }
}

// Initialize star ratings when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStarRatings);
} else {
    initializeStarRatings();
}

// Re-initialize when modal is shown (in case modal is dynamically added)
document.addEventListener('shown.bs.modal', function(event) {
    if (event.target.id === 'editRatingModal') {
        initializeStarRatings();
    }
});

// Initialize image upload for edit modal
function initializeEditImageUpload() {
    const uploadArea = document.getElementById('editUploadArea');
    const fileInput = document.getElementById('editImageInput');
    
    if (!uploadArea || !fileInput) return;
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleEditImageFiles(e.dataTransfer.files);
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        handleEditImageFiles(e.target.files);
        e.target.value = ''; // Reset input
    });
}

// Handle image files for edit
function handleEditImageFiles(files) {
    const maxImages = 5;
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    Array.from(files).forEach(file => {
        if (window.editRatingImages.existing.length + window.editRatingImages.new.length >= maxImages) {
            showAlert('warning', 'Tối đa 5 ảnh được phép');
            return;
        }
        
        if (!file.type.startsWith('image/')) {
            showAlert('warning', 'Chỉ chấp nhận file ảnh');
            return;
        }
        
        if (file.size > maxSize) {
            showAlert('warning', `Ảnh ${file.name} vượt quá 5MB`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            window.editRatingImages.new.push({
                file: file,
                preview: e.target.result
            });
            displayEditImages();
        };
        reader.readAsDataURL(file);
    });
}

// Display images in edit modal
function displayEditImages() {
    const preview = document.getElementById('editPhotoPreview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    // Display existing images
    window.editRatingImages.existing.forEach((imageUrl, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'edit-photo-item existing';
        photoItem.innerHTML = `
            <img src="${getImageUrl(imageUrl)}" alt="Ảnh ${index + 1}" onerror="this.src='images/placeholder.jpg'">
            <button type="button" class="edit-photo-remove" onclick="removeEditExistingImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.appendChild(photoItem);
    });
    
    // Display new images
    window.editRatingImages.new.forEach((imageData, index) => {
        const photoItem = document.createElement('div');
        photoItem.className = 'edit-photo-item';
        photoItem.innerHTML = `
            <img src="${imageData.preview}" alt="Ảnh mới ${index + 1}">
            <button type="button" class="edit-photo-remove" onclick="removeEditNewImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.appendChild(photoItem);
    });
}

// Remove existing image
function removeEditExistingImage(index) {
    window.editRatingImages.existing.splice(index, 1);
    displayEditImages();
}

// Remove new image
function removeEditNewImage(index) {
    window.editRatingImages.new.splice(index, 1);
    displayEditImages();
}

// Export functions for global access
window.removeEditExistingImage = removeEditExistingImage;
window.removeEditNewImage = removeEditNewImage;

// Get image URL helper
function getImageUrl(imagePath) {
    if (!imagePath) return 'images/placeholder.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return 'images' + imagePath;
    if (imagePath.startsWith('uploads/')) return 'images/' + imagePath;
    if (imagePath.startsWith('/images/')) return imagePath.substring(1);
    if (!imagePath.startsWith('images/')) return 'images/uploads/' + imagePath;
    return imagePath;
}

// Save edited rating
async function saveEditRating() {
    try {
        const ratingId = document.getElementById('editRatingId').value;
        const overallRating = document.getElementById('overallRatingValue').value;
        const comment = document.getElementById('editComment').value;
        const dichVu = document.getElementById('dich_vu_rating').value;
        const huongDanVien = document.getElementById('huong_dan_vien_rating').value;
        const phuongTien = document.getElementById('phuong_tien_rating').value;
        const giaCa = document.getElementById('gia_ca_rating').value;
        
        // Prepare FormData for file upload
        const formData = new FormData();
        formData.append('diem_danh_gia', parseInt(overallRating));
        formData.append('noi_dung_danh_gia', comment);
        formData.append('diem_dich_vu', parseInt(dichVu));
        formData.append('diem_huong_dan_vien', parseInt(huongDanVien));
        formData.append('diem_phuong_tien', parseInt(phuongTien));
        formData.append('diem_gia_ca', parseInt(giaCa));
        
        // Add existing images (keep these)
        const existingImages = window.editRatingImages.existing || [];
        existingImages.forEach((imgUrl, index) => {
            formData.append(`existing_images[${index}]`, imgUrl);
        });
        
        // Add new images
        const newImages = window.editRatingImages.new || [];
        newImages.forEach((imageData, index) => {
            formData.append('images', imageData.file);
        });
        
        console.log('💾 Saving rating edit with images:', {
            existing: existingImages.length,
            new: newImages.length
        });
        
        const token = localStorage.getItem('token');
        const apiUrl = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) 
            ? CONFIG.API_BASE_URL 
            : '/api';
        
        const response = await fetch(`${apiUrl}/ratings/${ratingId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Show success message
            showAlert('success', 'Đánh giá đã được cập nhật thành công!');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editRatingModal'));
            modal.hide();
            
            // Reset image arrays
            window.editRatingImages = { existing: [], new: [] };
            
            // Reload ratings
            loadUserRatings();
        } else {
            throw new Error(result.message || 'Không thể cập nhật đánh giá');
        }
    } catch (error) {
        console.error('❌ Error saving rating:', error);
        showAlert('error', 'Lỗi khi cập nhật đánh giá: ' + error.message);
    }
}

// Show alert function
function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer') || createAlertContainer();
    
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';
    
    const alertHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="${icon} me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const alert = alertContainer.querySelector('.alert:last-child');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// Create alert container if not exists
function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alertContainer';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}

// main.js - Chức năng chính của trang web

// Constants
window.API_URL = CONFIG.API_BASE_URL || '/api';

// DOM Elements
const popularDestinations = document.getElementById('popularDestinations');
const welcomeMessage = document.getElementById('welcomeMessage');

// Hàm helper để thực hiện API request với token
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    // Thêm token vào headers nếu có
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const requestOptions = {
        method: options.method || 'GET',
        headers: headers,
        ...options
    };
    
    // Xóa headers khỏi options để tránh trùng lặp
    delete requestOptions.headers;
    requestOptions.headers = headers;
    
    try {
        const response = await fetch(`${window.API_URL}${endpoint}`, requestOptions);
        
        if (!response.ok) {
            // Nếu là lỗi 401 Unauthorized, có thể token hết hạn
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Có thể thêm logic để redirect về trang login
            }
            
            const errorData = await response.json().catch(() => ({
                status: 'error',
                message: `HTTP error ${response.status}: ${response.statusText}`
            }));
            
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API request error for ${endpoint}:`, error);
        throw error;
    }
}

// Xử lý lỗi runtime.lastError
(function() {
    // Danh sách các mẫu lỗi cần chặn
    const errorPatterns = [
        'runtime.lastError',
        'Receiving end does not exist',
        'Could not establish connection'
    ];

    // Xử lý lỗi toàn cục
    window.addEventListener('error', function(e) {
        if (e && e.message && errorPatterns.some(pattern => e.message.includes(pattern))) {
            e.preventDefault();
            console.warn('Đã bỏ qua lỗi:', e.message);
            return false;
        }
    }, true);

    // Xử lý các lỗi Promise không bắt được
    window.addEventListener('unhandledrejection', function(e) {
        if (e && e.reason && e.reason.message && 
            errorPatterns.some(pattern => e.reason.message.includes(pattern))) {
            e.preventDefault();
            console.warn('Đã bỏ qua lỗi Promise không xử lý:', e.reason.message);
            return false;
        }
    });

    // Ghi đè phương thức console.error để lọc các lỗi runtime.lastError
    const originalConsoleError = console.error;
    console.error = function(...args) {
        if (args.length > 0 && typeof args[0] === 'string' && 
            errorPatterns.some(pattern => args[0].includes(pattern))) {
            console.warn('Đã ngăn lỗi console.error:', args[0]);
            return;
        }
        originalConsoleError.apply(this, args);
    };
})();

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded - initializing page...');
    
    try {
        // Kiểm tra trạng thái đăng nhập
        console.log('Checking auth status...');
        checkAuthStatus();
        
        // Thiết lập chức năng đăng xuất
        console.log('Setting up logout...');
        setupLogout();
        
        // Tải dữ liệu cho trang
        console.log('Loading data...');
        loadPopularTours();
        loadPopularDestinations();
        loadPopularSchedules();
        setupSearchForm();
        
        // Fallback timeout: nếu sau 5 giây vẫn chưa có tour, hiển thị tour tĩnh
        setTimeout(() => {
            const popularTours = document.getElementById('popularTours');
            if (popularTours && popularTours.children.length === 0) {
                console.log('Timeout: Hiển thị tour tĩnh sau 5 giây');
                displayStaticTours();
            }
        }, 5000);
        
        // Các function để hiển thị thông tin chi tiết tour
        window.showTourDetail = showTourDetail;
        window.searchToursByDestination = searchToursByDestination;
        
        console.log('Page initialization complete');
    } catch (error) {
        console.error('Error during page initialization:', error);
    }
});

// Format tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hàm hiển thị đánh giá trong card tour
function getRatingDisplay(tour) {
    const averageRating = tour.Diem_danh_gia_trung_binh || 0;
    const ratingCount = tour.So_luong_danh_gia || 0;
    
    if (ratingCount === 0) {
        // Hiển thị 5 sao cho tour chưa có đánh giá
        const stars = generateStars(5);
        return `
            <div class="tour-rating mb-2">
                <span class="text-warning">
                    ${stars}
                </span>
                <small class="ms-1 text-muted">
                    5.0 (Chưa có đánh giá)
                </small>
            </div>
        `;
    }
    
    const stars = generateStars(averageRating);
    return `
        <div class="tour-rating mb-2">
            <span class="text-warning">
                ${stars}
            </span>
            <small class="ms-1 text-muted">
                ${parseFloat(averageRating).toFixed(1)} (${ratingCount} đánh giá)
            </small>
        </div>
    `;
}

// Hàm tạo HTML cho sao đánh giá
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Sao đầy
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // Sao nửa
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Sao rỗng
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Format ngày tháng
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN');
}

// Tải danh sách tour nổi bật
async function loadFeaturedTours() {
    try {
        // Gọi API để lấy danh sách tour từ backend
        const data = await apiRequest('/tours/featured');
        
        if (data && data.status === 'success' && data.data) {
            let tours = data.data;
            if (Array.isArray(tours)) {
                displayTours(tours, 'popularTours');
            } else if (tours.tours && Array.isArray(tours.tours)) {
                displayTours(tours.tours, 'popularTours');
            } else {
                console.error('Dữ liệu tour nổi bật không đúng định dạng:', data);
                throw new Error('Không thể tải danh sách tour nổi bật');
            }
        }
    } catch (error) {
        console.error('Lỗi khi tải tour nổi bật:', error);
        // Fallback: hiển thị tour tĩnh
        displayStaticTours();
    }
}

// Tải tour du lịch phổ biến
async function loadPopularTours() {
    try {
        const popularTours = document.getElementById('popularTours');
        if (!popularTours) {
            // Yên lặng bỏ qua nếu container không tồn tại trên trang hiện tại
            return;
        }

        // Hiển thị loading
        popularTours.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-3 text-muted">Đang tải danh sách tour...</p>
            </div>
        `;

        console.log('Đang gọi API lấy tour phổ biến...');
        // Gọi API để lấy danh sách tour phổ biến
        const response = await fetch(`${window.API_URL}/tours/popular?limit=6`);
        console.log('Phản hồi từ API:', response);
        
        if (!response.ok) {
            console.error('Lỗi khi gọi API:', response.status, response.statusText);
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dữ liệu tour phổ biến:', data);
        
        if (data && data.status === 'success' && data.data) {
            // Kiểm tra xem data.data có phải là array không
            let tours = data.data;
            if (Array.isArray(tours)) {
                console.log('Hiển thị tour từ array:', tours);
                displayTours(tours, 'popularTours');
            } else if (tours.tours && Array.isArray(tours.tours)) {
                console.log('Hiển thị tour từ object.tours:', tours.tours);
                displayTours(tours.tours, 'popularTours');
            } else {
                console.error('Dữ liệu không đúng định dạng - không phải array:', data);
                throw new Error('Không thể tải danh sách tour phổ biến');
            }
        } else {
            console.error('Dữ liệu không đúng định dạng:', data);
            throw new Error('Không thể tải danh sách tour phổ biến');
        }
    } catch (error) {
        console.error('Lỗi chi tiết khi tải tour phổ biến:', error);
        // Sử dụng tour nổi bật nếu không lấy được tour phổ biến
        try {
            await loadFeaturedTours();
        } catch (featuredError) {
            console.error('Lỗi khi tải tour nổi bật:', featuredError);
            // Fallback cuối cùng: hiển thị tour tĩnh
            displayStaticTours();
        }
    }
}

// Tải lịch khởi hành phổ biến
async function loadPopularSchedules() {
    try {
        const data = await apiRequest('/tours/schedules/popular');
        
        if (data && data.status === 'success' && data.data && data.data.schedules) {
            console.log('Lịch khởi hành phổ biến:', data.data.schedules);
            // TODO: Nếu cần hiển thị lịch khởi hành phổ biến trên trang chủ
        }
    } catch (error) {
        console.error('Lỗi khi tải lịch khởi hành phổ biến:', error);
    }
}

// Hiển thị danh sách tour
function displayTours(tours, containerId = 'popularTours') {
    console.log(`Bắt đầu hiển thị ${tours?.length || 0} tour vào container ${containerId}`);
    const toursContainer = document.getElementById(containerId);
    
    if (!toursContainer) {
        console.error(`Không tìm thấy container ID: ${containerId}`);
        return;
    }
    
    console.log(`Đã tìm thấy container: ${toursContainer.tagName}#${containerId}`);
    toursContainer.innerHTML = '';
    
    if (!tours || !Array.isArray(tours) || tours.length === 0) {
        console.log('Không có tour để hiển thị hoặc tours không phải array:', tours);
        toursContainer.innerHTML = '<div class="col-12 text-center">Chưa có tour du lịch nào.</div>';
        return;
    }
    
    let tourHtml = '';
    tours.forEach((tour, index) => {
        // Xử lý trường hợp cả camelCase và PascalCase từ API
        const maTour = tour.Ma_tour || tour.ma_tour;
        const tenTour = tour.Ten_tour || tour.ten_tour;
        const thoiGian = tour.Thoi_gian || tour.thoi_gian || '1 ngày';
        const tinhTrang = tour.Tinh_trang || tour.tinh_trang || 'Đang cập nhật';
        let hinhAnh = tour.Hinh_anh || tour.hinh_anh;
        
        console.log(`Xử lý tour ${index + 1}/${tours.length}: ${maTour} - ${tenTour}`);
        
        // Xử lý URL hình ảnh
        if (!hinhAnh || hinhAnh.trim() === '') {
            hinhAnh = 'images/tour-placeholder.jpg';
        } else if (hinhAnh.startsWith('/uploads/')) {
            // Đường dẫn từ database: /uploads/tours/filename.jpg
            hinhAnh = `images${hinhAnh}`;
        } else if (hinhAnh.startsWith('uploads/')) {
            // Đường dẫn không có dấu / đầu
            hinhAnh = `images/${hinhAnh}`;
        } else if (hinhAnh.startsWith('/images/')) {
            // Đường dẫn đã có /images/
            hinhAnh = hinhAnh.substring(1); // Bỏ dấu / đầu
        } else if (!hinhAnh.startsWith('http') && !hinhAnh.startsWith('/')) {
            hinhAnh = '/images/uploads/tours/' + hinhAnh;
        }
        
        // Xử lý mô tả từ API
        const moTa = tour.Mo_ta || tour.mo_ta || 'Khám phá những điểm đến tuyệt vời cùng D-Travel.';
        const giaNguoiLon = tour.Gia_nguoi_lon || tour.gia_nguoi_lon || 0;
        const giaTreEm = tour.Gia_tre_em || tour.gia_tre_em || 0;
        
        // Tạo lớp CSS dựa trên tình trạng tour
        let statusClass = 'success';
        if (tinhTrang === 'Hết chỗ') {
            statusClass = 'danger';
        } else if (tinhTrang === 'Đang cập nhật' || tinhTrang === 'Sắp mở bán') {
            statusClass = 'warning';
        } else if (tinhTrang === 'Hủy') {
            statusClass = 'secondary';
        }
        
        // Tạm thời không có khuyến mãi (sẽ được cập nhật sau khi load promotions)
        const hasDiscount = false;
        const priceDisplay = formatCurrency(giaNguoiLon);
        
        const tourCard = `
            <div class="col-lg-4 col-md-6 mb-4" data-tour-id="${maTour}">
                <div class="card tour-card h-100">
                    <div class="position-relative">
                        <img src="${hinhAnh}" class="card-img-top tour-image" alt="${tenTour}" 
                            onerror="this.src='images/tour-placeholder.jpg'">
                        
                        <div class="tour-price-tag" data-ma-tour="${maTour}" data-base-price="${giaNguoiLon}" style="display: none;">
                          ${formatCurrency(giaNguoiLon)}
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${tenTour}</h5>
                        <div class="tour-info mb-2">
                            <span><i class="far fa-clock me-1"></i> ${thoiGian}</span>
                        </div>
                        ${getRatingDisplay(tour)}
                        <p class="card-text flex-grow-1">${moTa.substring(0, 100)}${moTa.length > 100 ? '...' : ''}</p>
                        
                        <div class="tour-price-section">
                            <div class="price-label">Giá từ:</div>
                            <div class="price-container">
                                <span class="price-discounted">${formatCurrency(giaNguoiLon)}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">/ người lớn</small>
                                <a href="detailtour.html?tour=${maTour}" class="btn btn-book-now">
                                    <i class="fas fa-shopping-cart me-1"></i> Đặt ngay
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        tourHtml += tourCard;
    });
    
    toursContainer.innerHTML = tourHtml;
    console.log(`Đã hiển thị ${tours.length} tour vào container ${containerId}`);
    
    // Load promotions và cập nhật giá sau khi hiển thị tour
    loadPromotionsForTours(tours);
}

// Load promotions cho các tour và cập nhật giá
async function loadPromotionsForTours(tours) {
    for (const tour of tours) {
        const maTour = tour.Ma_tour || tour.ma_tour;
        const giaNguoiLon = tour.Gia_nguoi_lon || tour.gia_nguoi_lon || 0;
        
        try {
            const promotions = await loadTourPromotions(maTour);
            if (promotions) {
                updateTourCardWithPromotion(maTour, giaNguoiLon, promotions);
            }
        } catch (error) {
            console.error(`Error loading promotions for tour ${maTour}:`, error);
        }
    }
}

// Cập nhật tour card với thông tin khuyến mãi
function updateTourCardWithPromotion(maTour, originalPrice, promotions) {
    const tourCard = document.querySelector(`[data-tour-id="${maTour}"]`);
    if (!tourCard) return;
    
    let maxDiscount = 0;
    
    // Check global discount
    if (promotions.global && promotions.global.Gia_tri > maxDiscount) {
        maxDiscount = promotions.global.Gia_tri;
    }
    
    // Check tour-specific coupon
    if (promotions.coupon && promotions.coupon.Gia_tri > maxDiscount) {
        maxDiscount = promotions.coupon.Gia_tri;
    }
    
    if (maxDiscount > 0) {
        const discountedPrice = originalPrice * (1 - maxDiscount / 100);
        
        // Thêm badge giảm giá
        const imageContainer = tourCard.querySelector('.position-relative');
        if (imageContainer && !imageContainer.querySelector('.promotion-badge')) {
            const badge = document.createElement('div');
            badge.className = 'position-absolute top-0 start-0 promotion-badge m-2';
            badge.innerHTML = '<i class="fas fa-tags me-1"></i>Giảm giá';
            imageContainer.appendChild(badge);
        }
        
        // Cập nhật giá
        const priceContainer = tourCard.querySelector('.price-container');
        if (priceContainer) {
            priceContainer.innerHTML = `
                <span class="price-original">${formatCurrency(originalPrice)}</span>
                <span class="price-discounted">${formatCurrency(discountedPrice)}</span>
            `;
        }
    }
}

// Hiển thị dữ liệu tour tĩnh khi API không hoạt động
function displayStaticTours() {
    console.error('Không thể kết nối đến API, hiển thị tour mẫu.');
    
    const popularTours = document.getElementById('popularTours');
    if (!popularTours) return;
    
    // Tour mẫu khi API không hoạt động
    const staticTours = [
        {
            Ma_tour: 'T001',
            Ten_tour: 'Tour Đà Lạt 3N2Đ',
            Thoi_gian: '3 ngày 2 đêm',
            Tinh_trang: 'Còn chỗ',
            Gia_nguoi_lon: 1500000,
            Gia_tre_em: 1200000,
            Hinh_anh: 'images/tour-placeholder.jpg',
            Mo_ta: 'Khám phá thành phố ngàn hoa với những điểm đến nổi tiếng như Thung Lũng Tình Yêu, Đồi Chè Cầu Đất...'
        },
        {
            Ma_tour: 'T002', 
            Ten_tour: 'Tour Phú Quốc 4N3Đ',
            Thoi_gian: '4 ngày 3 đêm',
            Tinh_trang: 'Còn chỗ',
            Gia_nguoi_lon: 2500000,
            Gia_tre_em: 2000000,
            Hinh_anh: 'images/tour-placeholder.jpg',
            Mo_ta: 'Trải nghiệm thiên đường biển đảo với bãi biển trong xanh, ẩm thực hải sản tươi ngon...'
        },
        {
            Ma_tour: 'T003',
            Ten_tour: 'Tour Hạ Long 2N1Đ',
            Thoi_gian: '2 ngày 1 đêm', 
            Tinh_trang: 'Còn chỗ',
            Gia_nguoi_lon: 1800000,
            Gia_tre_em: 1400000,
            Hinh_anh: 'images/tour-placeholder.jpg',
            Mo_ta: 'Du thuyền trên vịnh Hạ Long - Di sản thiên nhiên thế giới với những hòn đảo đá vôi kỳ vĩ...'
        },
        {
            Ma_tour: 'T004',
            Ten_tour: 'Tour Sapa 3N2Đ',
            Thoi_gian: '3 ngày 2 đêm',
            Tinh_trang: 'Còn chỗ', 
            Gia_nguoi_lon: 2000000,
            Gia_tre_em: 1600000,
            Hinh_anh: 'images/tour-placeholder.jpg',
            Mo_ta: 'Khám phá vùng núi Tây Bắc với ruộng bậc thang, văn hóa dân tộc thiểu số độc đáo...'
        },
        {
            Ma_tour: 'T005',
            Ten_tour: 'Tour Huế - Hội An 4N3Đ',
            Thoi_gian: '4 ngày 3 đêm',
            Tinh_trang: 'Còn chỗ',
            Gia_nguoi_lon: 2200000,
            Gia_tre_em: 1800000,
            Hinh_anh: 'images/tour-placeholder.jpg',
            Mo_ta: 'Hành trình khám phá di sản văn hóa với cố đô Huế và phố cổ Hội An...'
        },
        {
            Ma_tour: 'T006',
            Ten_tour: 'Tour Nha Trang 3N2Đ',
            Thoi_gian: '3 ngày 2 đêm',
            Tinh_trang: 'Còn chỗ',
            Gia_nguoi_lon: 1900000,
            Gia_tre_em: 1500000,
            Hinh_anh: 'images/tour-placeholder.jpg',
            Mo_ta: 'Tận hưởng biển xanh cát trắng với các hoạt động thể thao dưới nước thú vị...'
        }
    ];
    
    displayTours(staticTours, 'popularTours');
}

// Tải danh sách điểm đến phổ biến
async function loadPopularDestinations() {
    try {
        // Gọi API để lấy danh sách điểm đến phổ biến
        const data = await apiRequest('/tours/destinations/popular');
        
        if (data && data.status === 'success' && data.data && data.data.destinations) {
            const destinations = data.data.destinations;
            const destinationsContainer = document.getElementById('popularDestinations');
            
            if (!destinationsContainer) return;
            
            destinationsContainer.innerHTML = '';
            
            if (destinations.length === 0) {
                destinationsContainer.innerHTML = '<div class="col-12 text-center">Chưa có điểm đến nào.</div>';
                return;
            }
            
            destinations.forEach(destination => {
                // Xử lý dữ liệu
                const maDiaDanh = destination.Ma_dia_danh || destination.ma_dia_danh;
                const tenDiaDanh = destination.Ten_dia_danh || destination.ten_dia_danh;
                const diaChi = destination.Dia_chi || destination.dia_chi || '';
                let hinhAnh = destination.Hinh_anh || destination.hinh_anh;
                
                // Xử lý URL hình ảnh
                if (!hinhAnh || hinhAnh.trim() === '') {
                    hinhAnh = 'images/destination-placeholder.jpg';
                } else if (!hinhAnh.startsWith('http') && !hinhAnh.startsWith('/')) {
                    hinhAnh = '/images/uploads/destination/' + hinhAnh;
                }
                
                // Lấy tỉnh/thành từ địa chỉ
                const diaDiem = diaChi.split(',').pop().trim() || 'Việt Nam';
                
                const destinationCard = `
                    <div class="col-md-4 mb-4">
                        <div class="destination-card">
                            <img src="${hinhAnh}" alt="${tenDiaDanh}" class="destination-image"
                                onerror="this.src='images/destination-placeholder.jpg'">
                            <div class="destination-overlay">
                                <h3 class="destination-name">${tenDiaDanh}</h3>
                                <p class="destination-info"><i class="fas fa-map-marker-alt me-2"></i>${diaDiem}</p>
                                <a href="/alltour.html?destinationId=${maDiaDanh}" class="destination-btn">Khám phá</a>
                            </div>
                        </div>
                    </div>`;
                
                destinationsContainer.innerHTML += destinationCard;
            });
        } else {
            console.error('Không thể tải dữ liệu điểm đến', data);
            // Hiển thị điểm đến mẫu nếu API thất bại
            displayStaticDestinations();
        }
    } catch (error) {
        console.error('Lỗi khi tải điểm đến phổ biến:', error);
        // Hiển thị điểm đến mẫu nếu có lỗi
        displayStaticDestinations();
    }
}

// Hiển thị các điểm đến tĩnh nếu API không hoạt động
function displayStaticDestinations() {
    console.error('Không thể kết nối đến API, vui lòng thử lại sau.');
}

// Thiết lập form tìm kiếm
function setupSearchForm() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        // Thêm trường số lượng người nếu chưa có
        if (!document.getElementById('peopleCount')) {
            const peopleCountInput = document.createElement('div');
            peopleCountInput.className = 'col-md-2';
            peopleCountInput.innerHTML = `
                <input type="number" class="form-control" id="peopleCount" 
                    placeholder="Số người" min="1" required>
            `;
            
            // Thêm vào form
            const submitButton = searchForm.querySelector('button[type="submit"]').parentElement;
            searchForm.insertBefore(peopleCountInput, submitButton);
        }
        
        // Xử lý sự kiện submit
        searchForm.addEventListener('submit', handleSearch);
    }
}

// Xử lý tìm kiếm
async function handleSearch(e) {
    e.preventDefault();
    
    const searchData = {
        loai_tour: document.getElementById('tourType').value,
        ngay_bat_dau: document.getElementById('startDate').value,
        thoi_gian: document.getElementById('duration').value,
        so_nguoi: document.getElementById('peopleCount').value
    };
    
    try {
        const response = await fetch(`${window.API_URL}/tours/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchData)
        });
        
        const data = await response.json();
        displaySearchResults(data.tours);
    } catch (error) {
        console.error('Error searching tours:', error);
        alert('Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại!');
    }
}

// Hiển thị kết quả tìm kiếm
function displaySearchResults(tours) {
    const tourList = document.getElementById('popularTours');
    if (!tourList) return;
    
    tourList.innerHTML = '';
    
    if (!tours || tours.length === 0) {
        tourList.innerHTML = `
            <div class="col-12 text-center">
                <h4>Không tìm thấy tour phù hợp</h4>
                <p>Vui lòng thử lại với các tiêu chí khác</p>
            </div>
        `;
        return;
    }
    
    tours.forEach(tour => {
        tourList.innerHTML += createTourCard(tour);
    });
}

// Tạo card tour với giao diện đẹp hơn
function createTourCard(tour) {
    // Xử lý trường hợp cả camelCase và PascalCase từ API
    const maTour = tour.Ma_tour || tour.ma_tour;
    const tenTour = tour.Ten_tour || tour.ten_tour;
    const thoiGian = tour.Thoi_gian || tour.thoi_gian || 1;
    const tinhTrang = tour.Tinh_trang || tour.tinh_trang || 'Đang cập nhật';
    const hinhAnh = tour.Hinh_anh || tour.hinh_anh || 'images/tour-placeholder.jpg';
    const moTa = tour.Mo_ta || tour.mo_ta || 'Khám phá những điểm đến tuyệt vời cùng D-Travel.';
    const giaNguoiLon = tour.Gia_nguoi_lon || tour.gia_nguoi_lon || 0;
    const giaTreEm = tour.Gia_tre_em || tour.gia_tre_em || 0;
    
    // Tạo lớp CSS dựa trên tình trạng tour
    let statusClass = 'success';
    if (tinhTrang === 'Hết chỗ') {
        statusClass = 'danger';
    } else if (tinhTrang === 'Đang cập nhật' || tinhTrang === 'Sắp mở bán') {
        statusClass = 'warning';
    }
    
    return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="card tour-card h-100 shadow-sm">
                <div class="position-relative overflow-hidden">
                    <img src="${hinhAnh}" class="card-img-top tour-image" alt="${tenTour}" 
                         onerror="this.src='images/tour-placeholder.jpg'" style="height: 200px; object-fit: cover;">
                    <span class="position-absolute top-0 end-0 badge bg-${statusClass} m-2 py-2 px-3">${tinhTrang}</span>
                    <div class="tour-overlay">
                        <a href="#" class="btn btn-sm btn-light" onclick="showTourDetail('${maTour}'); return false;">
                            <i class="fas fa-eye"></i> Xem chi tiết
                        </a>
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title text-truncate">${tenTour}</h5>
                    <div class="tour-info mb-2">
                        <span><i class="far fa-clock me-1"></i> ${thoiGian} ngày</span>
                        <span class="ms-3"><i class="fas fa-map-marker-alt me-1"></i> Việt Nam</span>
                    </div>
                    <p class="card-text flex-grow-1">${moTa.substring(0, 80)}${moTa.length > 80 ? '...' : ''}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div>
                            <div class="text-primary fw-bold fs-5">${formatCurrency(giaNguoiLon)}</div>
                            <small class="text-muted">/ người lớn</small>
                        </div>
                        <a href="detailtour.html?tour=${maTour}" class="btn btn-primary">
                            <i class="fas fa-info-circle me-1"></i> Xem chi tiết
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
}

// Tìm kiếm tour theo điểm đến
async function searchToursByDestination(destinationId) {
    try {
        const data = await apiRequest(`/tours/destination/${destinationId}`);
        
        if (data.status === 'success') {
            displaySearchResults(data.data);
            // Cuộn đến phần kết quả tìm kiếm
            document.getElementById('tours').scrollIntoView({
                behavior: 'smooth'
            });
        } else {
            throw new Error(data.message || 'Không thể tìm tour theo điểm đến');
        }
    } catch (error) {
        console.error('Error searching tours by destination:', error);
        alert('Có lỗi xảy ra khi tìm kiếm tour. Vui lòng thử lại sau.');
    }
}

// Hiển thị chi tiết tour
async function showTourDetail(tourId) {
    try {
        // Hiển thị modal loading
        createTourDetailModal();
        const tourDetailModal = new bootstrap.Modal(document.getElementById('tourDetailModal'));
        tourDetailModal.show();
        document.getElementById('tourDetailBody').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-3">Đang tải thông tin tour...</p>
            </div>
        `;

        // Gọi API để lấy thông tin chi tiết tour
        const data = await apiRequest(`/tours/${tourId}`);
        
        if (!data || data.status !== 'success' || !data.data || !data.data.tour) {
            throw new Error('Không thể tải thông tin chi tiết tour');
        }
        
        const tour = data.data.tour;

        // Xử lý trường hợp cả camelCase và PascalCase từ API
        const maTour = tour.Ma_tour || tour.ma_tour;
        const tenTour = tour.Ten_tour || tour.ten_tour;
        const thoiGian = tour.Thoi_gian || tour.thoi_gian || '1 ngày';
        const tinhTrang = tour.Tinh_trang || tour.tinh_trang || 'Đang cập nhật';
        let hinhAnh = tour.Hinh_anh || tour.hinh_anh;
        
        // Xử lý URL hình ảnh
        if (!hinhAnh || hinhAnh.trim() === '') {
            hinhAnh = 'images/tour-placeholder.jpg';
        } else if (hinhAnh.startsWith('/uploads/')) {
            // Đường dẫn từ database: /uploads/tours/filename.jpg
            hinhAnh = `images${hinhAnh}`;
        } else if (hinhAnh.startsWith('uploads/')) {
            // Đường dẫn không có dấu / đầu
            hinhAnh = `images/${hinhAnh}`;
        } else if (hinhAnh.startsWith('/images/')) {
            // Đường dẫn đã có /images/
            hinhAnh = hinhAnh.substring(1); // Bỏ dấu / đầu
        } else if (!hinhAnh.startsWith('http') && !hinhAnh.startsWith('/')) {
            hinhAnh = '/images/uploads/tours/' + hinhAnh;
        }
        
        // Xử lý mô tả từ API
        const moTa = tour.Mo_ta || tour.mo_ta || 'Chưa có mô tả cho tour này.';
        const giaNguoiLon = tour.Gia_nguoi_lon || tour.gia_nguoi_lon || 0;
        const giaTreEm = tour.Gia_tre_em || tour.gia_tre_em || 0;
        const loaiTour = tour.Loai_tour || tour.loai_tour || 'Trong nước';
        
        // Tạo lớp CSS dựa trên tình trạng tour
        let statusClass = 'success';
        if (tinhTrang === 'Hết chỗ') {
            statusClass = 'danger';
        } else if (tinhTrang === 'Đang cập nhật' || tinhTrang === 'Sắp mở bán') {
            statusClass = 'warning';
        } else if (tinhTrang === 'Hủy') {
            statusClass = 'secondary';
        }
        
        // Load promotions for this tour
        const promotions = await loadTourPromotions(maTour);
        
        // Hiển thị chi tiết tour trong modal
        document.getElementById('tourDetailTitle').textContent = tenTour;
        document.getElementById('tourDetailBody').innerHTML = `
            <div class="row">
                <div class="col-md-5">
                    <img src="${hinhAnh}" class="img-fluid rounded" alt="${tenTour}" 
                        onerror="this.src='images/tour-placeholder.jpg'">
                    <div class="mt-3">
                        <span class="badge bg-${statusClass} me-2">${tinhTrang}</span>
                        <span><i class="far fa-clock me-1"></i> ${thoiGian}</span>
                    </div>
                </div>
                <div class="col-md-7">
                    <h4>${tenTour}</h4>
                    <p class="text-muted">Mã tour: ${maTour}</p>
                    <div class="mb-3">${moTa}</div>
                    
                    ${promotions ? renderPromotionInfo(promotions) : ''}
                    
                    <div class="tour-info mb-3">
                        <p><strong>Thời gian:</strong> ${thoiGian}</p>
                        <p><strong>Loại tour:</strong> ${loaiTour === 'Trong_nuoc' ? 'Tour trong nước' : 'Tour nước ngoài'}</p>
                        <p><strong>Giá vé:</strong></p>
                        <ul>
                            <li>Người lớn: ${renderPriceWithDiscount(giaNguoiLon, promotions)}</li>
                            <li>Trẻ em: ${renderPriceWithDiscount(giaTreEm, promotions)}</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="row mt-4">
                <div class="col-12">
                    <h5>Lịch khởi hành sắp tới</h5>
                    <div class="table-responsive">
                        <table class="table" id="upcomingSchedulesTable">
                            <thead>
                                <tr>
                                    <th>Mã lịch</th>
                                    <th>Ngày bắt đầu</th>
                                    <th>Ngày kết thúc</th>
                                    <th>Số chỗ còn</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="5" class="text-center">Đang tải lịch khởi hành...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Tải lịch khởi hành sắp tới cho tour
        loadUpcomingSchedules(tourId);
    } catch (error) {
        console.error('Lỗi khi hiển thị chi tiết tour:', error);
        if (document.getElementById('tourDetailBody')) {
            document.getElementById('tourDetailBody').innerHTML = `
                <div class="alert alert-danger">
                    Không thể tải thông tin chi tiết tour. Vui lòng thử lại sau.
                </div>
            `;
        }
    }
}

// Tải lịch khởi hành sắp tới
async function loadUpcomingSchedules(tourId) {
    try {
        const data = await apiRequest(`/tours/${tourId}/upcoming-schedules`);
        
        if (!data || data.status !== 'success' || !data.data) {
            throw new Error('Không thể tải lịch khởi hành');
        }
        
        const schedules = data.data.schedules;
        displayUpcomingSchedules(schedules);
    } catch (error) {
        console.error('Lỗi khi tải lịch khởi hành sắp tới:', error);
        const schedulesTable = document.getElementById('upcomingSchedulesTable').querySelector('tbody');
        schedulesTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    Không thể tải thông tin lịch khởi hành. Vui lòng thử lại sau.
                </td>
            </tr>
        `;
    }
}

// Hiển thị lịch khởi hành sắp tới
function displayUpcomingSchedules(schedules) {
    const schedulesTable = document.getElementById('upcomingSchedulesTable').querySelector('tbody');
    
    if (!schedules || schedules.length === 0) {
        schedulesTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    Không có lịch khởi hành sắp tới nào.
                </td>
            </tr>
        `;
        return;
    }
    
    schedulesTable.innerHTML = '';
    schedules.forEach(schedule => {
        const maLich = schedule.Ma_lich || schedule.ma_lich;
        const ngayBatDau = schedule.Ngay_bat_dau || schedule.ngay_bat_dau;
        const ngayKetThuc = schedule.Ngay_ket_thuc || schedule.ngay_ket_thuc;
        const soCho = schedule.So_cho || schedule.so_cho || 0;
        const bookedSeats = schedule.bookedSeats || 0;
        const availableSeats = soCho - bookedSeats;
        
        schedulesTable.innerHTML += `
            <tr>
                <td>${maLich}</td>
                <td>${formatDate(ngayBatDau)}</td>
                <td>${formatDate(ngayKetThuc)}</td>
                <td>${availableSeats}/${soCho}</td>
                <td>
                    <button class="btn btn-sm btn-primary book-schedule" 
                            data-schedule-id="${maLich}" 
                            ${availableSeats <= 0 ? 'disabled' : ''}>
                        ${availableSeats > 0 ? 'Đặt tour' : 'Hết chỗ'}
                    </button>
                </td>
            </tr>
        `;
    });
    
    // Thêm sự kiện cho các nút đặt tour
    document.querySelectorAll('.book-schedule').forEach(button => {
        button.addEventListener('click', function() {
            const scheduleId = this.getAttribute('data-schedule-id');
            const tourId = document.getElementById('bookTourBtn').getAttribute('data-tour-id');
            bookTour(tourId, scheduleId);
        });
    });
}

// Tạo modal chi tiết tour nếu chưa tồn tại
function createTourDetailModal() {
    if (!document.getElementById('tourDetailModal')) {
        const modalHtml = `
            <div class="modal fade"" id="tourDetailModal" tabindex="-1" aria-labelledby="tourDetailTitle" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="tourDetailTitle">Chi tiết tour</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="tourDetailBody">
                            <!-- Tour details will be loaded here -->
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            <button type="button" class="btn btn-primary" id="bookTourBtn">Đặt Tour</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Xử lý sự kiện nút đặt tour
        document.getElementById('bookTourBtn').addEventListener('click', function() {
            const tourId = this.getAttribute('data-tour-id');
            bookTour(tourId);
        });
    }
}

// Đặt tour - redirect đến trang booking
function bookTour(tourId, scheduleId) {
    // Kiểm tra đăng nhập trước khi đặt tour
    const token = localStorage.getItem('token');
    if (!token) {
        // Lưu thông tin tour muốn đặt vào localStorage để sau khi đăng nhập có thể quay lại
        localStorage.setItem('bookingIntent', JSON.stringify({
            tourId,
            scheduleId
        }));
        
        window.location.href = '/login.html?redirect=booking';
        return;
    }
    
    // Nếu đã đăng nhập, chuyển đến trang booking
    let bookingUrl = `/booking.html?tour=${tourId}`;
    if (scheduleId) {
        bookingUrl += `&schedule=${scheduleId}`;
    }
    
    window.location.href = bookingUrl;
}

// Load và hiển thị footer
function loadFooter() {
    console.log('Loading footer...');
    const footerContainer = document.getElementById('footer-container');
    
    if (!footerContainer) {
        console.error('Không tìm thấy container #footer-container');
        return;
    }
    
    footerContainer.innerHTML = `
        <footer class="bg-dark text-white pt-5 pb-4">
            <div class="container">
                <div class="row">
                    <div class="col-md-4 mb-4">
                        <h4 class="mb-3">D-Travel</h4>
                        <p>Công ty Du lịch D-Travel</p>
                        <p><i class="fas fa-map-marker-alt me-2"></i> 123 Nguyễn Văn Linh, TP. Hồ Chí Minh</p>
                        <p><i class="fas fa-phone me-2"></i> (028) 3123 4567</p>
                        <p><i class="fas fa-envelope me-2"></i> info@dtravel.com</p>
                    </div>
                    <div class="col-md-2 mb-4">
                        <h5 class="mb-3">Liên kết</h5>
                        <ul class="list-unstyled">
                            <li class="mb-2"><a href="index.html" class="text-white">Trang chủ</a></li>
                            <li class="mb-2"><a href="alltour.html" class="text-white">Tour du lịch</a></li>
                            <li class="mb-2"><a href="about.html" class="text-white">Giới thiệu</a></li>
                            <li class="mb-2"><a href="contact.html" class="text-white">Liên hệ</a></li>
                        </ul>
                    </div>
                    <div class="col-md-3 mb-4">
                        <h5 class="mb-3">Tour phổ biến</h5>
                        <ul class="list-unstyled">
                            <li class="mb-2"><a href="#" class="text-white">Tour Đà Lạt</a></li>
                            <li class="mb-2"><a href="#" class="text-white">Tour Phú Quốc</a></li>
                            <li class="mb-2"><a href="#" class="text-white">Tour Nha Trang</a></li>
                            <li class="mb-2"><a href="#" class="text-white">Tour Đà Nẵng</a></li>
                        </ul>
                    </div>
                    <div class="col-md-3 mb-4">
                        <h5 class="mb-3">Đăng ký nhận tin</h5>
                        <p>Nhận thông tin ưu đãi mới nhất từ chúng tôi</p>
                        <div class="input-group mb-3">
                            <input type="email" class="form-control" placeholder="Email của bạn" aria-label="Email của bạn">
                            <button class="btn btn-primary" type="button">Đăng ký</button>
                        </div>
                        <div class="social-links mt-3">
                            <a href="#" class="text-white me-2"><i class="fab fa-facebook-f"></i></a>
                            <a href="#" class="text-white me-2"><i class="fab fa-twitter"></i></a>
                            <a href="#" class="text-white me-2"><i class="fab fa-instagram"></i></a>
                            <a href="#" class="text-white"><i class="fab fa-youtube"></i></a>
                        </div>
                    </div>
                </div>
                <hr class="my-4">
                <div class="row">
                    <div class="col-md-6 text-center text-md-start">
                        <p class="mb-0">&copy; 2024 D-Travel. Tất cả quyền được bảo lưu.</p>
                    </div>
                    <div class="col-md-6 text-center text-md-end">
                        <p class="mb-0">Thiết kế bởi <a href="#" class="text-white">D-Team</a></p>
                    </div>
                </div>
            </div>
        </footer>
    `;
}

// Load promotions for a specific tour
async function loadTourPromotions(tourId) {
    try {
        const response = await fetch(`${window.API_URL}/promotions/applicable/${tourId}`);
        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Error loading tour promotions:', error);
        return null;
    }
}

// Render promotion info
function renderPromotionInfo(promotions) {
    if (!promotions) return '';
    
    let maxDiscount = 0;
    let discountSource = '';
    
    // Check global discount
    if (promotions.global && promotions.global.Gia_tri > maxDiscount) {
        maxDiscount = promotions.global.Gia_tri;
        discountSource = 'toàn site';
    }
    
    // Check tour-specific coupon
    if (promotions.coupon && promotions.coupon.Gia_tri > maxDiscount) {
        maxDiscount = promotions.coupon.Gia_tri;
        discountSource = 'coupon';
    }
    
    if (maxDiscount > 0) {
        return `
            <div class="alert alert-success mb-3">
                <i class="fas fa-tags me-2"></i>
                <strong>🎉 Đang có khuyến mãi!</strong><br>
                Giảm ${maxDiscount}% ${discountSource === 'toàn site' ? 'cho tất cả tour' : `với mã ${promotions.coupon.Ma_km}`}
                ${promotions.coupon && promotions.coupon.Ngay_ket_thuc ? 
                    `<br><small>Hết hạn: ${formatDate(new Date(promotions.coupon.Ngay_ket_thuc))}</small>` : ''}
            </div>
        `;
    }
    
    return '';
}

// Render price with discount - returns only the discounted price
function renderPriceWithDiscount(originalPrice, promotions) {
    if (!promotions) return formatCurrency(originalPrice);
    
    let maxDiscount = 0;
    
    // Check global discount
    if (promotions.global && promotions.global.Gia_tri > maxDiscount) {
        maxDiscount = promotions.global.Gia_tri;
    }
    
    // Check tour-specific coupon
    if (promotions.coupon && promotions.coupon.Gia_tri > maxDiscount) {
        maxDiscount = promotions.coupon.Gia_tri;
    }
    
    if (maxDiscount > 0) {
        const discountedPrice = originalPrice * (1 - maxDiscount / 100);
        return formatCurrency(discountedPrice);
    }
    
    return formatCurrency(originalPrice);
}

// Cung cấp hàm cho global scope
window.loadFooter = loadFooter;
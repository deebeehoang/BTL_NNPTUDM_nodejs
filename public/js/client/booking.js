// Booking functionality for tour detail page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking script loaded');
    
    // Kiểm tra xem đang ở trang detailtour.html không
    if (window.location.pathname.includes('detailtour.html')) {
        console.log('Đang ở trang chi tiết tour, tải dịch vụ bổ sung...');
        loadExtraServices();
    } else if (window.location.pathname.includes('booking.html')) {
        console.log('DEPRECATED: booking.html không còn được sử dụng. Vui lòng chuyển sang detailtour.html');
    } else {
        console.log('Không phải trang đặt tour, bỏ qua việc tải dịch vụ');
        return;
    }
    
    // Lấy thông tin tour từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const tourId = urlParams.get('tour') || urlParams.get('id'); // Hỗ trợ cả 'tour' và 'id'
    const scheduleId = urlParams.get('schedule');
    
    if (tourId) {
        console.log('Tour ID:', tourId);
        loadTourDetail(tourId);
        
        if (scheduleId) {
            console.log('Schedule ID:', scheduleId);
            // Nếu có schedule ID, chọn lịch tương ứng
            selectSchedule(scheduleId);
        }
    } else {
        // Yên lặng bỏ qua nếu không có ID tour trong URL và đang không ở trang chi tiết tour
        if (window.location.pathname.includes('detailtour.html')) {
            console.error('Không tìm thấy ID tour trong URL');
        }
    }
});

// Hàm tải chi tiết tour
async function loadTourDetail(tourId) {
    console.log('Đang tải chi tiết tour với ID:', tourId);
    try {
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        console.log('API URL:', apiUrl);
        const response = await fetch(`${apiUrl}/tours/${tourId}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Không thể tải thông tin tour: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Tour data received:', data);
        
        if (data.status === 'success' && data.data && data.data.tour) {
            displayTourDetail(data.data.tour);
            loadTourSchedules(tourId);
            loadTourRatings(tourId);
        } else {
            throw new Error('Dữ liệu tour không hợp lệ');
        }
    } catch (error) {
        console.error('Lỗi khi tải chi tiết tour:', error);
        document.getElementById('tourDetailContainer').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> Không thể tải thông tin tour. Vui lòng thử lại sau.
            </div>
        `;
    }
}

// Hiển thị thông tin chi tiết tour
function displayTourDetail(tour) {
    console.log('Hiển thị chi tiết tour:', tour);
    // Trang detailtour.html có logic riêng để hiển thị tour detail
    // Function này chỉ để tương thích với code cũ
    // Logic thực tế được xử lý bởi trang detailtour.html
}

// Tải danh sách lịch trình của tour
async function loadTourSchedules(tourId) {
    try {
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        const response = await fetch(`${apiUrl}/tours/${tourId}/upcoming-schedules`);
        if (!response.ok) {
            throw new Error('Không thể tải lịch trình tour');
        }
        
        const data = await response.json();
        if (data.status === 'success' && data.data && data.data.schedules) {
            displaySchedules(data.data.schedules);
        } else {
            throw new Error('Dữ liệu lịch trình không hợp lệ');
        }
    } catch (error) {
        console.error('Lỗi khi tải lịch trình tour:', error);
        if (document.getElementById('scheduleContainer')) {
            document.getElementById('scheduleContainer').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-calendar-times"></i> Không thể tải lịch trình. Vui lòng thử lại sau.
                </div>
            `;
        }
    }
}

// Hiển thị lịch trình của tour
function displaySchedules(schedules) {
    console.log('Hiển thị lịch trình:', schedules);
    // Hiện thực code hiển thị lịch trình tour tại đây
}

// Chọn lịch trình
function selectSchedule(scheduleId) {
    console.log('Chọn lịch trình:', scheduleId);
    // Hiện thực code chọn lịch trình tại đây
}

// Đặt tour
async function bookTour(tourId, scheduleId) {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    if (!token) {
        localStorage.setItem('bookingIntent', JSON.stringify({
            tourId, scheduleId
        }));
        
        window.location.href = '/login.html?redirect=booking';
        return;
    }
    
    // Đảm bảo có thông tin khách hàng
    try {
        console.log('🔍 Tạo thông tin khách hàng nếu chưa có...');
        const customerData = await ensureCustomerInfo();
        if (!customerData) {
            throw new Error('Không thể tạo thông tin khách hàng');
        }
        console.log('✅ Thông tin khách hàng:', customerData);
    } catch (error) {
        console.error('❌ Lỗi khi đảm bảo thông tin khách hàng:', error);
    }
    
    // Nếu đã đăng nhập, chuyển đến trang chi tiết tour
    window.location.href = `/detailtour.html?tour=${tourId}${scheduleId ? `&schedule=${scheduleId}` : ''}`;
}

// Load additional services
async function loadExtraServices() {
    console.log('[DICH VU] Bắt đầu tải dịch vụ bổ sung...');
    try {
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        const response = await fetch(`${apiUrl}/services`);
        console.log('[DICH VU] Kết quả fetch:', response);
        if (!response.ok) {
            throw new Error('Không thể tải danh sách dịch vụ');
        }

        const data = await response.json();
        console.log('[DICH VU] Dữ liệu trả về:', data);
        if (data.status === 'success' && data.data && data.data.services) {
            displayExtraServices(data.data.services);
        } else {
            console.warn('[DICH VU] Không có dịch vụ nào hoặc dữ liệu không đúng:', data);
            const serviceContainer = document.getElementById('extraServices');
            if (serviceContainer) {
                serviceContainer.innerHTML = '<div class="alert alert-info">Không có dịch vụ bổ sung nào.</div>';
            }
        }
    } catch (error) {
        console.error('[DICH VU] Lỗi khi tải dịch vụ:', error);
        const serviceContainer = document.getElementById('extraServices');
        if (serviceContainer) {
            serviceContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> Không thể tải danh sách dịch vụ. Vui lòng thử lại sau.
                </div>
            `;
        }
    }
}

// Display extra services
function displayExtraServices(services) {
    console.log('[DICH VU] Hiển thị dịch vụ:', services);
    const serviceContainer = document.getElementById('extraServices');
    if (!serviceContainer) {
        console.error('[DICH VU] Không tìm thấy div extraServices trong HTML!');
        return;
    }

    let html = '<div class="row">';

    services.forEach(service => {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="form-check">
                            <input class="form-check-input service-checkbox" type="checkbox" 
                                value="${service.Ma_dich_vu}" 
                                data-price="${service.Gia}" 
                                id="service-${service.Ma_dich_vu}">
                            <label class="form-check-label" for="service-${service.Ma_dich_vu}">
                                <h5 class="card-title mb-1">${service.Ten_dich_vu}</h5>
                                <p class="card-text text-muted small mb-2">${service.Mo_ta || ''}</p>
                                <p class="card-text text-primary mb-0">${formatCurrency(service.Gia)}</p>
                            </label>
                        </div>
                        <div class="service-quantity mt-2 d-none">
                            <label class="form-label">Số lượng:</label>
                            <input type="number" class="form-control form-control-sm quantity-input" 
                                min="1" value="1" 
                                id="qty-${service.Ma_dich_vu}">
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    serviceContainer.innerHTML = html;

    // Add event listeners
    document.querySelectorAll('.service-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const serviceId = this.value;
            const qtyInput = document.getElementById(`qty-${serviceId}`).parentElement;
            qtyInput.classList.toggle('d-none', !this.checked);
            updateTotalPrice();
            console.log(`[DICH VU] Đã ${this.checked ? 'chọn' : 'bỏ'} dịch vụ ${serviceId}`);
        });
    });

    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            updateTotalPrice();
            console.log(`[DICH VU] Thay đổi số lượng dịch vụ ${this.id} -> ${this.value}`);
        });
        
        input.addEventListener('input', function() {
            updateTotalPrice();
        });
    });

    console.log('[DICH VU] Đã đăng ký sự kiện cho tất cả dịch vụ');
    
    // Cập nhật tổng tiền lần đầu
    setTimeout(updateTotalPrice, 500);
}

// Update total price including services
function updateTotalPrice() {
    console.log('Đang cập nhật tổng tiền...');
    
    // Lấy thông tin số lượng và giá cơ bản
    const adultCountEl = document.getElementById('so_nguoi_lon');
    const childCountEl = document.getElementById('so_tre_em');
    
    if (!adultCountEl || !childCountEl) {
        console.warn('Không tìm thấy element số lượng người, đang chờ element load...');
        setTimeout(updateTotalPrice, 100);
        return;
    }
    
    const adultCount = parseInt(adultCountEl.value) || 0;
    const childCount = parseInt(childCountEl.value) || 0;
    
    const adultPriceEl = document.getElementById('adult-price');
    const childPriceEl = document.getElementById('child-price');
    
    if (!adultPriceEl) {
        console.warn('Không tìm thấy element giá người lớn, đang chờ element load...');
        // Thử lại sau 100ms
        setTimeout(updateTotalPrice, 100);
        return;
    }
    
    const adultPrice = parseFloat(adultPriceEl.dataset.price) || 0;
    const childPrice = childPriceEl ? parseFloat(childPriceEl.dataset.price) || 0 : 0;
    
    // Tính tổng giá cơ bản
    let totalPrice = (adultPrice * adultCount) + (childPrice * childCount);
    console.log(`Giá cơ bản: ${adultCount} người lớn x ${adultPrice} + ${childCount} trẻ em x ${childPrice} = ${totalPrice}`);
    
    // Tính tổng giá dịch vụ
    let serviceTotal = 0;
    let serviceDetails = [];
    
    document.querySelectorAll('.service-checkbox:checked').forEach(checkbox => {
        const serviceId = checkbox.value;
        const servicePrice = parseFloat(checkbox.dataset.price) || 0;
        const quantity = parseInt(document.getElementById(`qty-${serviceId}`).value) || 1;
        const serviceItemTotal = servicePrice * quantity;
        
        serviceTotal += serviceItemTotal;
        serviceDetails.push({
            id: serviceId,
            price: servicePrice,
            quantity: quantity,
            total: serviceItemTotal
        });
        
        console.log(`Dịch vụ ${serviceId}: ${quantity} x ${servicePrice} = ${serviceItemTotal}`);
    });
    
    totalPrice += serviceTotal;
    console.log(`Tổng dịch vụ: ${serviceTotal}`);
    console.log(`Tổng cộng: ${totalPrice}`);
    
    // Cập nhật hiển thị
    const totalPriceEl = document.getElementById('total-price');
    if (totalPriceEl) {
        totalPriceEl.textContent = formatCurrency(totalPrice);
        
        // Cập nhật phần tóm tắt dịch vụ
        updateServiceSummary(serviceTotal);
    }
}

// Cập nhật phần tóm tắt dịch vụ
function updateServiceSummary(serviceTotal) {
    const summaryContainer = document.getElementById('booking-summary');
    if (!summaryContainer) return;
    
    let serviceSummary = document.getElementById('service-summary');
    
    if (serviceTotal > 0) {
        // Tạo hoặc cập nhật phần tóm tắt dịch vụ
        if (!serviceSummary) {
            // Tạo mới nếu chưa có
            serviceSummary = document.createElement('div');
            serviceSummary.id = 'service-summary';
            serviceSummary.className = 'd-flex justify-content-between mb-2';
            serviceSummary.innerHTML = `
                <span>Dịch vụ bổ sung:</span>
                <span>${formatCurrency(serviceTotal)}</span>
            `;
            
            // Tìm thẻ hr trong booking-summary
            const hrElement = summaryContainer.querySelector('hr');
            
            // Nếu có thẻ hr, chèn sau hr và trước phần tử tổng cộng
            if (hrElement) {
                hrElement.parentNode.insertBefore(serviceSummary, hrElement.nextSibling);
            } else {
                // Nếu không tìm thấy hr, thêm vào cuối container
                summaryContainer.appendChild(serviceSummary);
            }
        } else {
            // Cập nhật nếu đã có
            serviceSummary.querySelector('span:last-child').textContent = formatCurrency(serviceTotal);
        }
    } else {
        // Xóa phần tóm tắt dịch vụ nếu không còn dịch vụ nào
        if (serviceSummary) {
            serviceSummary.remove();
        }
    }
}

// Get selected services
function getSelectedServices() {
    const services = [];
    document.querySelectorAll('.service-checkbox:checked').forEach(checkbox => {
        const serviceId = checkbox.value;
        const quantity = parseInt(document.getElementById(`qty-${serviceId}`).value) || 1;
        services.push({
            ma_dich_vu: serviceId,
            so_luong: quantity
        });
    });
    return services;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Cung cấp hàm cho global scope
window.bookTour = bookTour;

// Tải đánh giá tour
async function loadTourRatings(tourId) {
    try {
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        const response = await fetch(`${apiUrl}/ratings/tour/${tourId}`);
        if (!response.ok) {
            throw new Error('Không thể tải đánh giá tour');
        }
        
        const data = await response.json();
        if (data.status === 'success' && data.data) {
            displayTourRatings(data.data);
        } else {
            throw new Error('Dữ liệu đánh giá không hợp lệ');
        }
    } catch (error) {
        console.error('Lỗi khi tải đánh giá tour:', error);
        const ratingsContainer = document.getElementById('tour-ratings');
        if (ratingsContainer) {
            ratingsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i> Chưa có đánh giá nào cho tour này.
                </div>
            `;
        }
    }
}

// Hiển thị đánh giá tour
function displayTourRatings(ratingData) {
    const ratingsContainer = document.getElementById('tour-ratings');
    if (!ratingsContainer) return;
    
    const { ratings, averageRating, ratingStats } = ratingData;
    
    if (!ratings || ratings.length === 0) {
        ratingsContainer.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Chưa có đánh giá nào cho tour này.
            </div>
        `;
        return;
    }
    
    // Tạo HTML cho đánh giá
    let ratingsHTML = `
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="rating-summary">
                    <h5>Đánh giá trung bình</h5>
                    <div class="average-rating">
                        <span class="rating-number">${parseFloat(averageRating.diem_trung_binh).toFixed(1)}</span>
                        <div class="rating-stars">
                            ${generateStars(parseFloat(averageRating.diem_trung_binh))}
                        </div>
                        <p class="rating-count">Dựa trên ${averageRating.so_luong_danh_gia} đánh giá</p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="rating-breakdown">
                    <h6>Phân bố đánh giá</h6>
                    ${generateRatingBreakdown(ratingStats)}
                </div>
            </div>
        </div>
        <hr>
        <div class="ratings-list">
            <h6>Đánh giá gần đây</h6>
    `;
    
    // Hiển thị từng đánh giá
    ratings.slice(0, 5).forEach(rating => {
        ratingsHTML += createRatingItem(rating);
    });
    
    if (ratings.length > 5) {
        ratingsHTML += `
            <div class="text-center mt-3">
                <button class="btn btn-outline-primary" onclick="showAllRatings()">
                    Xem tất cả ${ratings.length} đánh giá
                </button>
            </div>
        `;
    }
    
    ratingsHTML += '</div>';
    ratingsContainer.innerHTML = ratingsHTML;
}

// Tạo HTML cho một đánh giá
function createRatingItem(rating) {
    const ratingDate = new Date(rating.Ngay_danh_gia).toLocaleDateString('vi-VN');
    
    return `
        <div class="rating-item border-bottom pb-3 mb-3">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${rating.Ten_khach_hang}</h6>
                    <div class="rating-stars text-warning">
                        ${generateStars(rating.Diem_danh_gia)}
                    </div>
                </div>
                <small class="text-muted">${ratingDate}</small>
            </div>
            ${rating.Noi_dung_danh_gia ? `
                <p class="mt-2 mb-0">${rating.Noi_dung_danh_gia}</p>
            ` : ''}
        </div>
    `;
}

// Tạo phân bố đánh giá
function generateRatingBreakdown(stats) {
    let breakdown = '';
    for (let i = 5; i >= 1; i--) {
        const count = stats[i] || 0;
        const percentage = stats[5] + stats[4] + stats[3] + stats[2] + stats[1] > 0 
            ? (count / (stats[5] + stats[4] + stats[3] + stats[2] + stats[1])) * 100 
            : 0;
        
        breakdown += `
            <div class="rating-bar d-flex align-items-center mb-1">
                <span class="me-2">${i} <i class="fas fa-star text-warning"></i></span>
                <div class="progress flex-grow-1 me-2" style="height: 8px;">
                    <div class="progress-bar bg-warning" style="width: ${percentage}%"></div>
                </div>
                <span class="text-muted">${count}</span>
            </div>
        `;
    }
    return breakdown;
}

// Tạo sao đánh giá
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

// Hiển thị tất cả đánh giá
function showAllRatings() {
    // Có thể mở modal hoặc chuyển trang để hiển thị tất cả đánh giá
    console.log('Hiển thị tất cả đánh giá');
} 
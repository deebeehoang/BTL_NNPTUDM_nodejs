// Kiểm tra cấu hình API_URL từ config.js
if (typeof window.API_URL === 'undefined') {
    window.API_URL = CONFIG?.API_BASE_URL || '/api';
    console.log('API_URL được thiết lập từ CONFIG:', window.API_URL);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - API_URL:', window.API_URL);
    console.log('CONFIG:', CONFIG);
    
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    console.log('Token từ localStorage:', token ? 'Đã có token' : 'Không có token');
    
    if (!token) {
        // Nếu chưa đăng nhập, hiển thị thông báo
        document.getElementById('loading-spinner').classList.add('d-none');
        document.getElementById('not-logged-in').classList.remove('d-none');
        return;
    }
    
    // Load dữ liệu booking của người dùng
    loadUserBookings();
});

// Hàm load danh sách booking của người dùng
function loadUserBookings() {
    const token = localStorage.getItem('token');
    
    // Log để debug API URL
    console.log('API URL cho lệnh gọi loadUserBookings:', `${API_URL}/bookings/user/me`);
    
    fetch(`${API_URL}/bookings/user/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể tải dữ liệu booking');
        }
        return response.json();
    })
    .then(data => {
        console.log('Dữ liệu booking:', data);
        
        // Ẩn loading spinner
        document.getElementById('loading-spinner').classList.add('d-none');
        
        if (!data.data || !data.data.bookings || data.data.bookings.length === 0) {
            // Hiển thị thông báo không có booking
            document.getElementById('no-bookings').classList.remove('d-none');
        } else {
            // Tải thông tin tour cho mỗi booking
            const bookings = data.data.bookings;
            const tourPromises = bookings.map(booking => {
                if (booking.Ma_tour) {
                    return fetch(`${API_URL}/tours/${booking.Ma_tour}`)
                        .then(response => response.ok ? response.json() : null)
                        .then(tourData => {
                            if (tourData && tourData.data && tourData.data.tour) {
                                booking.Ten_tour = tourData.data.tour.Ten_tour;
                                booking.Diem_den = tourData.data.tour.Diem_den;
                            }
                            return booking;
                        })
                        .catch(error => {
                            console.error(`Lỗi khi tải thông tin tour ${booking.Ma_tour}:`, error);
                            return booking;
                        });
                } else {
                    return Promise.resolve(booking);
                }
            });
            
            Promise.all(tourPromises)
                .then(updatedBookings => {
                    // Hiển thị danh sách booking với thông tin tour đầy đủ
                    displayBookings(updatedBookings);
                    document.getElementById('bookings-container').classList.remove('d-none');
                });
        }
    })
    .catch(error => {
        console.error('Lỗi khi tải dữ liệu booking:', error);
        document.getElementById('loading-spinner').classList.add('d-none');
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: 'Không thể tải lịch sử đặt tour. Vui lòng thử lại sau.'
        });
    });
}

// Hàm kiểm tra xem tour có thể đánh giá không
async function checkCanRate(bookingId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/ratings/can-rate/${bookingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.data;
        }
        return { canRate: false, reason: 'Không thể kiểm tra quyền đánh giá' };
    } catch (error) {
        console.error('Lỗi khi kiểm tra quyền đánh giá:', error);
        return { canRate: false, reason: 'Lỗi hệ thống' };
    }
}

// Hàm hiển thị danh sách booking
function displayBookings(bookings) {
    const container = document.getElementById('bookings-container');
    container.innerHTML = '';
    
    bookings.forEach(booking => {
        // Format ngày
        const bookingDate = new Date(booking.Ngay_dat).toLocaleDateString('vi-VN');
        const tourStartDate = booking.Ngay_bat_dau ? new Date(booking.Ngay_bat_dau).toLocaleDateString('vi-VN') : 'N/A';
        const tourEndDate = booking.Ngay_ket_thuc ? new Date(booking.Ngay_ket_thuc).toLocaleDateString('vi-VN') : 'N/A';
        
        // Xác định trạng thái và màu sắc
        let statusClass = '';
        let statusText = booking.Trang_thai_booking;
        
        switch(booking.Trang_thai_booking) {
            case 'Da_thanh_toan':
            case 'Đã thanh toán':
                statusClass = 'status-paid';
                statusText = 'Đã thanh toán';
                break;
            case 'Da_huy':
            case 'Hủy':
                statusClass = 'status-cancelled';
                statusText = 'Đã hủy';
                break;
            case 'Het_han':
            case 'Hết hạn':
                statusClass = 'status-expired';
                statusText = 'Hết hạn';
                break;
            default:
                statusClass = 'status-pending';
                statusText = 'Chờ thanh toán';
        }

        // Kiểm tra cả trường Trang_thai nếu có
        if (booking.Trang_thai && booking.Trang_thai === 'Đã thanh toán') {
            statusClass = 'status-paid';
            statusText = 'Đã thanh toán';
        }
        
        // Xác định tên tour
        let tourName = 'Tour #' + booking.Ma_booking;
        if (booking.Ten_tour) {
            tourName = booking.Ten_tour;
        } else if (booking.Ma_tour) {
            tourName = 'Tour #' + booking.Ma_tour;
        }
        
        // Debug: Log thông tin booking để kiểm tra
        console.log('🔍 Debug booking:', {
            Ma_booking: booking.Ma_booking,
            Trang_thai_booking: booking.Trang_thai_booking,
            Trang_thai: booking.Trang_thai,
            isPaid: (booking.Trang_thai_booking === 'Da_thanh_toan' || booking.Trang_thai === 'Đã thanh toán' || booking.Trang_thai_booking === 'Đã thanh toán' || booking.Trang_thai_booking === 'Paid')
        });
        
        // Tính thời gian còn lại cho booking "Chờ thanh toán" hoặc hiển thị thông báo hết hạn
        let countdownHtml = '';
        if (statusClass === 'status-expired' || booking.Trang_thai_booking === 'Het_han' || booking.Trang_thai_booking === 'Hết hạn') {
            // Booking đã hết hạn - không hiển thị countdown, sẽ hiển thị alert trong card body
            countdownHtml = '';
        } else if (statusClass === 'status-pending' && booking.Trang_thai_booking === 'Chờ thanh toán') {
            // Tính expires_at: nếu có expires_at thì dùng, nếu không thì tính từ Ngay_dat + 10 phút
            const expiresAt = booking.expires_at 
                ? new Date(booking.expires_at) 
                : new Date(new Date(booking.Ngay_dat).getTime() + 10 * 60 * 1000);
            
            const now = new Date();
            const timeRemaining = expiresAt - now;
            
            if (timeRemaining > 0) {
                countdownHtml = `
                    <div class="countdown-timer bg-warning">
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <span style="color: #856404; font-weight: bold;">
                                <i class="fas fa-hourglass-half"></i>
                                Còn lại để thanh toán:
                            </span>
                            <span class="countdown-display" data-expires="${expiresAt.toISOString()}" style="color: #856404; font-weight: bold;">
                                ${formatCountdown(timeRemaining)}
                            </span>
                        </div>
                    </div>
                `;
            } else {
                countdownHtml = `
                    <div class="countdown-timer">
                        <div style="text-align: center; color: #c92a2a; font-weight: bold;">
                            <i class="fas fa-exclamation-triangle"></i>
                            Đã hết thời gian thanh toán
                        </div>
                    </div>
                `;
            }
        }
        
        // Xác định class cho card header dựa trên status
        let headerStatusClass = 'status-pending';
        let statusIcon = 'clock';
        if (statusClass === 'status-paid') {
            headerStatusClass = 'status-success';
            statusIcon = 'check-circle';
        } else if (statusClass === 'status-expired') {
            headerStatusClass = 'status-expired';
            statusIcon = 'exclamation-triangle';
        } else if (statusClass === 'status-cancelled') {
            headerStatusClass = 'status-cancelled';
            statusIcon = 'times-circle';
        }

        // Tạo HTML cho booking card theo giao diện mới
        const bookingCard = `
            <div class="tour-card">
                <div class="card-header ${headerStatusClass}">
                    <div class="tour-id">Tour</div>
                    <div class="tour-number">#${booking.Ma_booking}</div>
                    <div class="status-badge ${statusClass.replace('status-', '')}">
                        <i class="fas fa-${statusIcon}"></i>
                        ${statusText}
                    </div>
                </div>
                <div class="card-body">
                    ${countdownHtml ? countdownHtml.replace('countdown-timer mb-3', 'countdown-timer') : ''}
                    ${(statusClass === 'status-expired' || booking.Trang_thai_booking === 'Het_han' || booking.Trang_thai_booking === 'Hết hạn') ? `
                    <div class="alert">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div class="alert-text">
                            <strong>Đã hết thời gian thanh toán</strong><br>
                            Booking này đã hết hạn và không thể thanh toán
                        </div>
                    </div>
                    ` : ''}
                    <div class="tour-details">
                        <div class="detail-item">
                            <i class="far fa-calendar-alt"></i>
                            <span class="detail-text">Ngày khởi hành: ${tourStartDate}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span class="detail-text">${booking.So_nguoi_lon} người lớn, ${booking.So_tre_em} trẻ em</span>
                        </div>
                        <div class="detail-item">
                            <i class="far fa-clock"></i>
                            <i class="fas fa-info-circle" style="color: #6c757d; font-size: 0.9rem;"></i>
                            <span class="detail-text">${calculateDuration(booking.Ngay_bat_dau, booking.Ngay_ket_thuc) || 'Chưa có thông tin'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span class="detail-text">${booking.Diem_den || 'Chưa có thông tin'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-ticket-alt"></i>
                            <div style="flex: 1;">
                                <span class="detail-text">Mã đặt tour:</span>
                                <div class="booking-code">#${booking.Ma_booking}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="price-section">
                        <div class="price">${formatCurrency(booking.Tong_tien).replace('₫', 'đ')}</div>
                        <div class="booking-date">Đặt ngày: ${bookingDate}</div>
                    </div>
                    <div class="action-buttons">
                        ${booking.Trang_thai_booking === 'Da_huy' || booking.Trang_thai_booking === 'Hủy' ? `
                            <button class="btn-action btn-cancel" disabled>
                                <i class="fas fa-times-circle"></i> Tour đã hủy
                            </button>
                        ` : (booking.Trang_thai_booking === 'Het_han' || booking.Trang_thai_booking === 'Hết hạn') ? `
                            <button class="btn-action btn-cancel" disabled>
                                <i class="fas fa-times-circle"></i> Đã hết hạn
                            </button>
                        ` : (booking.Trang_thai_booking === 'Da_thanh_toan' || booking.Trang_thai === 'Đã thanh toán' || booking.Trang_thai_booking === 'Đã thanh toán' || booking.Trang_thai_booking === 'Paid') ? `
                            <button class="btn-action btn-info" onclick="viewBookingDetails('${booking.Ma_booking}')">
                                <i class="fas fa-info-circle"></i> Chi tiết
                            </button>
                            <button class="btn-action btn-rate" onclick="checkAndRateTour('${booking.Ma_booking}')" id="rate-btn-${booking.Ma_booking}">
                                <i class="fas fa-star"></i> Đánh giá
                            </button>
                        ` : `
                            <button class="btn-action btn-payment" onclick="redirectToPayment('${booking.Ma_booking}', ${booking.Tong_tien})">
                                <i class="fas fa-credit-card"></i> Thanh toán ngay
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += bookingCard;
    });
    
    // Khởi động countdown timers cho các booking "Chờ thanh toán"
    startCountdownTimers();
}

// Hàm format thời gian đếm ngược
function formatCountdown(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Hàm khởi động các countdown timers
function startCountdownTimers() {
    const countdownDisplays = document.querySelectorAll('.countdown-display');
    
    countdownDisplays.forEach(display => {
        const expiresAt = new Date(display.getAttribute('data-expires'));
        
        // Cập nhật ngay lập tức
        updateCountdown(display, expiresAt);
        
        // Cập nhật mỗi giây
        const interval = setInterval(() => {
            const updated = updateCountdown(display, expiresAt);
            if (!updated) {
                clearInterval(interval);
                // Reload trang khi hết thời gian
                setTimeout(() => {
                    loadUserBookings();
                }, 2000);
            }
        }, 1000);
    });
}

// Hàm cập nhật countdown
function updateCountdown(display, expiresAt) {
    const now = new Date();
    const timeRemaining = expiresAt - now;
    
    if (timeRemaining > 0) {
        display.textContent = formatCountdown(timeRemaining);
        display.style.color = '#856404';
        return true;
    } else {
        display.textContent = '00:00';
        display.style.color = '#c92a2a';
        
        // Cập nhật parent container
        const timerContainer = display.closest('.countdown-timer');
        if (timerContainer) {
            timerContainer.className = 'countdown-timer';
            timerContainer.style.background = '#fff5f5';
            timerContainer.style.border = '1px solid #ff6b6b';
            timerContainer.innerHTML = `
                <div style="text-align: center; color: #c92a2a; font-weight: bold;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Đã hết thời gian thanh toán
                </div>
            `;
        }
        return false;
    }
}

// Mở modal yêu cầu hủy tour
function openCancelModal(bookingId) {
    // Chức năng này đã bị tạm ngưng
    console.log("Chức năng hủy tour đã bị tạm ngưng");
    return;
    
    /*
    document.getElementById('booking-id').value = bookingId;
    document.getElementById('cancel-reason').value = '';
    
    const cancelModal = new bootstrap.Modal(document.getElementById('cancelRequestModal'));
    cancelModal.show();
    */
}

// Hủy tour trực tiếp
function submitCancelRequest() {
    // Chức năng này đã bị tạm ngưng
    console.log("Chức năng hủy tour đã bị tạm ngưng");
    return;
    
    /*
    const token = localStorage.getItem('token');
    const bookingId = document.getElementById('booking-id').value;
    const reason = document.getElementById('cancel-reason').value.trim();
    
    if (!reason) {
        Swal.fire({
            icon: 'warning',
            title: 'Thiếu thông tin',
            text: 'Vui lòng nhập lý do hủy tour'
        });
        return;
    }
    
    // Hiển thị loading trong nút
    const submitButton = document.getElementById('submit-cancel-request');
    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';
    submitButton.disabled = true;
    
    // Thêm debug log để kiểm tra
    console.log('Đang gửi yêu cầu hủy tour với bookingId:', bookingId, 'và lý do:', reason);
    
    // Sử dụng DELETE request thay vì POST vì backend đã định nghĩa route DELETE
    fetch(`${API_URL}/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            reason: reason
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể hủy tour');
        }
        return response.json();
    })
    .then(data => {
        console.log('Kết quả hủy tour:', data);
        
        // Đóng modal
        bootstrap.Modal.getInstance(document.getElementById('cancelRequestModal')).hide();
        
        // Hiển thị thông báo thành công
        Swal.fire({
            icon: 'success',
            title: 'Thành công',
            text: 'Tour đã được hủy thành công'
        }).then(() => {
            // Tải lại danh sách booking
            loadUserBookings();
        });
    })
    .catch(error => {
        console.error('Lỗi khi hủy tour:', error);
        
        // Hiển thị thông tin lỗi chi tiết hơn cho người dùng
        let errorMessage = 'Không thể hủy tour. ';
        
        if (error.response) {
            // Server trả về lỗi với status code
            errorMessage += `Lỗi server (${error.response.status}): ${error.response.statusText}`;
            console.error('Chi tiết lỗi từ server:', error.response);
        } else if (error.request) {
            // Request đã được gửi nhưng không nhận được phản hồi
            errorMessage += 'Không nhận được phản hồi từ server.';
            console.error('Không nhận được phản hồi:', error.request);
        } else {
            // Có lỗi khi thiết lập request
            errorMessage += error.message || 'Vui lòng thử lại sau.';
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: errorMessage
        });
    })
    .finally(() => {
        // Khôi phục nút submit
        submitButton.innerHTML = originalButtonContent;
        submitButton.disabled = false;
    });
    */
}

// Kiểm tra trạng thái yêu cầu hủy
function checkCancelRequestStatus(bookingId) {
    const token = localStorage.getItem('token');
    
    fetch(`${API_URL}/cancel-requests/booking/${bookingId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể tải thông tin yêu cầu hủy');
        }
        return response.json();
    })
    .then(data => {
        console.log('Thông tin yêu cầu hủy:', data);
        
        if (data.data && data.data.request) {
            displayCancelRequestDetails(data.data.request);
        } else {
            Swal.fire({
                icon: 'info',
                title: 'Thông báo',
                text: 'Không tìm thấy thông tin yêu cầu hủy'
            });
        }
    })
    .catch(error => {
        console.error('Lỗi khi tải thông tin yêu cầu hủy:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: 'Không thể tải thông tin yêu cầu hủy. Vui lòng thử lại sau.'
        });
    });
}

// Hiển thị chi tiết yêu cầu hủy
function displayCancelRequestDetails(request) {
    // Format ngày
    const requestDate = new Date(request.Ngay_yeu_cau).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let processDate = 'Chưa xử lý';
    if (request.Ngay_xu_ly) {
        processDate = new Date(request.Ngay_xu_ly).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Xác định trạng thái và màu sắc
    let statusClass = '';
    let statusText = '';
    
    switch(request.Trang_thai) {
        case 'Dang_xu_ly':
            statusClass = 'bg-warning text-dark';
            statusText = 'Đang xử lý';
            break;
        case 'Da_chap_nhan':
            statusClass = 'bg-success text-white';
            statusText = 'Đã chấp nhận';
            break;
        case 'Da_tu_choi':
            statusClass = 'bg-danger text-white';
            statusText = 'Đã từ chối';
            break;
        default:
            statusClass = 'bg-secondary text-white';
            statusText = request.Trang_thai;
    }
    
    // Tạo HTML cho chi tiết yêu cầu
    const detailsHTML = `
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="text-muted mb-0">Trạng thái yêu cầu:</h6>
                <span class="badge ${statusClass} px-3 py-2">${statusText}</span>
            </div>
        </div>
        
        <div class="mb-3">
            <h6 class="text-muted mb-1">Mã yêu cầu:</h6>
            <p class="mb-0">${request.Ma_yeu_cau}</p>
        </div>
        
        <div class="mb-3">
            <h6 class="text-muted mb-1">Mã booking:</h6>
            <p class="mb-0">${request.Ma_booking}</p>
        </div>
        
        <div class="mb-3">
            <h6 class="text-muted mb-1">Ngày yêu cầu:</h6>
            <p class="mb-0">${requestDate}</p>
        </div>
        
        <div class="mb-3">
            <h6 class="text-muted mb-1">Lý do hủy:</h6>
            <p class="mb-0">${request.Ly_do || 'Không có lý do'}</p>
        </div>
        
        <div class="mb-3">
            <h6 class="text-muted mb-1">Ngày xử lý:</h6>
            <p class="mb-0">${processDate}</p>
        </div>
        
        ${request.Trang_thai === 'Da_tu_choi' ? `
        <div class="alert alert-danger">
            <h6 class="text-danger mb-1">Lý do từ chối:</h6>
            <p class="mb-0">${request.Ly_do_tu_choi || 'Không có lý do từ chối'}</p>
        </div>
        ` : ''}
    `;
    
    // Hiển thị modal với chi tiết
    document.getElementById('cancel-request-details').innerHTML = detailsHTML;
    const detailModal = new bootstrap.Modal(document.getElementById('cancelRequestDetailModal'));
    detailModal.show();
}

// Hàm tính số ngày của tour
function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return "Chưa có thông tin";
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Tính số ngày
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Tính số đêm (số ngày - 1)
    const diffNights = Math.max(0, diffDays - 1);
    
    return `${diffDays} ngày ${diffNights} đêm`;
}

// Format số tiền thành định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hàm chuyển hướng đến trang thanh toán
// Hàm xem chi tiết booking
function viewBookingDetails(bookingId) {
    // Redirect đến trang chi tiết booking
    window.location.href = `booking-detail.html?bookingId=${bookingId}`;
}

function redirectToPayment(bookingId, amount) {
    // Lưu thông tin đặt tour vào sessionStorage
    sessionStorage.setItem('paymentBookingId', bookingId);
    sessionStorage.setItem('paymentAmount', amount);
    
    // Chuyển hướng đến trang thanh toán
    window.location.href = 'payment.html';
}

// Hàm kiểm tra và chuyển đến trang đánh giá
async function checkAndRateTour(bookingId) {
    try {
        // Hiển thị loading
        const rateBtn = document.getElementById(`rate-btn-${bookingId}`);
        const originalText = rateBtn.innerHTML;
        rateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra...';
        rateBtn.disabled = true;
        
        // Kiểm tra quyền đánh giá
        const canRateResult = await checkCanRate(bookingId);
        
        if (canRateResult.canRate) {
            // Chuyển đến trang đánh giá
            window.location.href = `rate-tour.html?bookingId=${bookingId}`;
        } else {
            // Hiển thị thông báo lý do không thể đánh giá
            Swal.fire({
                icon: 'info',
                title: 'Không thể đánh giá',
                text: canRateResult.reason,
                confirmButtonText: 'Đóng'
            });
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra quyền đánh giá:', error);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: 'Không thể kiểm tra quyền đánh giá. Vui lòng thử lại.',
            confirmButtonText: 'Đóng'
        });
    } finally {
        // Khôi phục trạng thái nút
        const rateBtn = document.getElementById(`rate-btn-${bookingId}`);
        if (rateBtn) {
            rateBtn.innerHTML = '<i class="fas fa-star"></i>Đánh giá';
            rateBtn.disabled = false;
        }
    }
} 
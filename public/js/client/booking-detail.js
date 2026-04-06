// Kiểm tra cấu hình API_URL từ config.js
if (typeof window.API_URL === 'undefined') {
    window.API_URL = CONFIG?.API_BASE_URL || '/api';
}

document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html?redirect=booking-detail.html';
        return;
    }

    // Lấy bookingId từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    
    if (!bookingId) {
        showError('Không tìm thấy mã booking');
        return;
    }

    // Load chi tiết booking
    loadBookingDetails(bookingId);
});

// Hàm load chi tiết booking
async function loadBookingDetails(bookingId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Không thể tải thông tin booking');
        }

        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
            displayBookingDetails(data.data);
            
            // Ưu tiên: Sử dụng itinerary từ booking details (đã có lịch trình theo Ma_lich)
            if (data.data.itinerary && data.data.itinerary.length > 0) {
                console.log(`✅ [BOOKING-DETAIL] Using itinerary from booking details: ${data.data.itinerary.length} items`);
                displayItinerary(data.data.itinerary);
            } else if (data.data.tour && data.data.tour.Ma_tour) {
                // Fallback: Nếu không có itinerary trong booking details, load từ API riêng
                console.log(`⚠️ [BOOKING-DETAIL] No itinerary in booking details, loading from API...`);
                await loadItinerary(data.data.tour.Ma_tour);
            } else {
                console.log(`⚠️ [BOOKING-DETAIL] No itinerary available`);
            }
        } else {
            throw new Error(data.message || 'Không tìm thấy thông tin booking');
        }
    } catch (error) {
        console.error('Error loading booking details:', error);
        showError(error.message || 'Lỗi khi tải thông tin booking');
    }
}

// Hàm load itinerary từ API riêng
async function loadItinerary(maTour) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/tour/${maTour}/itinerary`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.data && data.data.itinerary) {
                displayItinerary(data.data.itinerary);
            }
        }
    } catch (error) {
        console.error('Error loading itinerary:', error);
        // Không hiển thị lỗi nếu không load được itinerary
    }
}

// Hàm hiển thị chi tiết booking
function displayBookingDetails(data) {
    const { booking, tour, schedule, guide, itinerary, tickets, services } = data;

    // Ẩn loading, hiển thị content
    document.getElementById('loading-spinner').classList.add('d-none');
    document.getElementById('booking-detail-content').classList.remove('d-none');

    // Hiển thị thông tin Tour
    displayTourInfo(tour);

    // Hiển thị thông tin Lịch khởi hành
    displayScheduleInfo(schedule);

    // Hiển thị Lịch trình chi tiết
    displayItinerary(itinerary);

    // Hiển thị thông tin HDV
    displayGuideInfo(guide);

    // Hiển thị thông tin Booking
    displayBookingInfo(booking, tickets);

    // Hiển thị Dịch vụ đi kèm
    displayServices(services);
}

// Hiển thị thông tin Tour
function displayTourInfo(tour) {
    if (!tour) {
        document.getElementById('tour-info').innerHTML = '<p class="text-muted">Chưa có thông tin tour</p>';
        return;
    }

    // Xử lý đường dẫn hình ảnh tour
    let tourImage = tour.Hinh_anh || tour.Anh_tour || '';
    let imageUrl = '/images/tour-placeholder.jpg'; // Ảnh mặc định
    
    if (tourImage) {
        if (tourImage.startsWith('http://') || tourImage.startsWith('https://')) {
            // URL đầy đủ
            imageUrl = tourImage;
        } else if (tourImage.startsWith('/images/')) {
            // Đã có /images/, dùng trực tiếp
            imageUrl = tourImage;
        } else if (tourImage.startsWith('/uploads/')) {
            // Có /uploads/, thêm /images vào trước
            imageUrl = '/images' + tourImage;
        } else if (tourImage.startsWith('uploads/')) {
            // Có uploads/ không có dấu / đầu
            imageUrl = '/images/' + tourImage;
        } else if (tourImage.startsWith('/')) {
            // Bắt đầu bằng / nhưng không phải /images/ hoặc /uploads/
            imageUrl = '/images' + tourImage;
        } else {
            // Đường dẫn tương đối
            imageUrl = '/images/' + tourImage;
        }
    }

    let html = `
        <img src="${imageUrl}" alt="${tour.Ten_tour || 'Tour'}" class="tour-image" onerror="this.src='/images/tour-placeholder.jpg'">
        <div class="info-row">
            <div class="info-label"><i class="fas fa-map-marked-alt me-2"></i>Tên tour:</div>
            <div class="info-value"><strong>${tour.Ten_tour || 'N/A'}</strong></div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-tag me-2"></i>Mã tour:</div>
            <div class="info-value">${tour.Ma_tour || 'N/A'}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-map-marker-alt me-2"></i>Điểm đến:</div>
            <div class="info-value">${tour.Diem_den || 'N/A'}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-clock me-2"></i>Thời gian:</div>
            <div class="info-value">${tour.Thoi_gian || 'N/A'} ngày ${tour.Thoi_gian ? (tour.Thoi_gian - 1) : 'N/A'} đêm</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-dollar-sign me-2"></i>Giá người lớn:</div>
            <div class="info-value">${formatCurrency(tour.Gia_nguoi_lon || 0)}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-child me-2"></i>Giá trẻ em:</div>
            <div class="info-value">${formatCurrency(tour.Gia_tre_em || 0)}</div>
        </div>
    `;

    if (tour.Mo_ta) {
        html += `
            <div class="info-row">
                <div class="info-label"><i class="fas fa-align-left me-2"></i>Mô tả:</div>
                <div class="info-value">${tour.Mo_ta}</div>
            </div>
        `;
    }

    document.getElementById('tour-info').innerHTML = html;
}

// Hiển thị thông tin Lịch khởi hành
function displayScheduleInfo(schedule) {
    if (!schedule) {
        document.getElementById('schedule-info').innerHTML = '<p class="text-muted">Chưa có thông tin lịch khởi hành</p>';
        return;
    }

    const startDate = schedule.Ngay_bat_dau ? new Date(schedule.Ngay_bat_dau).toLocaleDateString('vi-VN') : 'N/A';
    const endDate = schedule.Ngay_ket_thuc ? new Date(schedule.Ngay_ket_thuc).toLocaleDateString('vi-VN') : 'N/A';

    const html = `
        <div class="info-row">
            <div class="info-label"><i class="fas fa-calendar-check me-2"></i>Ngày bắt đầu:</div>
            <div class="info-value"><strong>${startDate}</strong></div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-calendar-times me-2"></i>Ngày kết thúc:</div>
            <div class="info-value"><strong>${endDate}</strong></div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-chair me-2"></i>Số chỗ:</div>
            <div class="info-value">${schedule.So_cho || 'N/A'}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-barcode me-2"></i>Mã lịch:</div>
            <div class="info-value">${schedule.Ma_lich || 'N/A'}</div>
        </div>
    `;

    document.getElementById('schedule-info').innerHTML = html;
}

// Hiển thị Lịch trình chi tiết
function displayItinerary(itinerary) {
    if (!itinerary || itinerary.length === 0) {
        document.getElementById('itinerary-info').innerHTML = '<p class="text-muted">Chưa có lịch trình chi tiết</p>';
        return;
    }

    let html = '';
    itinerary.forEach((item, index) => {
        // Hỗ trợ cả bảng tour_itinerary mới và Lich_trinh cũ
        const ngayThu = item.Ngay_thu || (index + 1);
        const tieuDe = item.Tieu_de || item.Tieu_de || '';
        const moTa = item.Mo_ta || item.Noi_dung || 'N/A';
        const thoiGian = item.Thoi_gian_hoat_dong || item.Gio || '';
        const diaDiem = item.Dia_diem || '';
        const ngay = item.Ngay ? new Date(item.Ngay).toLocaleDateString('vi-VN') : '';
        const buoi = item.Buoi || '';

        html += `
            <div class="itinerary-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <strong><i class="fas fa-calendar-day me-2"></i>Ngày ${ngayThu}${ngay ? ': ' + ngay : ''}</strong>
                        ${tieuDe ? `<span class="badge bg-primary ms-2">${tieuDe}</span>` : ''}
                        ${buoi ? `<span class="badge bg-secondary ms-2">${buoi}</span>` : ''}
                    </div>
                    ${thoiGian ? `<span class="text-muted"><i class="fas fa-clock me-1"></i>${thoiGian}</span>` : ''}
                </div>
                ${diaDiem ? `<p class="mb-2"><i class="fas fa-map-marker-alt me-2"></i><strong>Địa điểm:</strong> ${diaDiem}</p>` : ''}
                <p class="mb-0">${moTa}</p>
            </div>
        `;
    });

    document.getElementById('itinerary-info').innerHTML = html;
}

// Hiển thị thông tin HDV
function displayGuideInfo(guide) {
    if (!guide) {
        document.getElementById('guide-info').innerHTML = '<p class="text-muted">Chưa có hướng dẫn viên được phân công</p>';
        return;
    }

    // Xử lý đường dẫn avatar HDV
    let avatarUrl = guide.Anh_dai_dien || '/images/placeholder.jpg';
    
    if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://') && !avatarUrl.startsWith('data:')) {
        if (avatarUrl.startsWith('/images/')) {
            // Đã có /images/, dùng trực tiếp
            avatarUrl = avatarUrl;
        } else if (avatarUrl.startsWith('/uploads/')) {
            // Có /uploads/, thêm /images vào trước
            avatarUrl = '/images' + avatarUrl;
        } else if (avatarUrl.startsWith('uploads/')) {
            // Có uploads/ không có dấu / đầu
            avatarUrl = '/images/' + avatarUrl;
        } else if (avatarUrl.startsWith('/')) {
            // Bắt đầu bằng / nhưng không phải /images/ hoặc /uploads/
            avatarUrl = '/images' + avatarUrl;
        } else {
            // Đường dẫn tương đối
            avatarUrl = '/images/' + avatarUrl;
        }
        
        // Xử lý trường hợp trùng lặp /images/images/
        if (avatarUrl.startsWith('/images/images/')) {
            avatarUrl = avatarUrl.replace('/images/images/', '/images/');
        }
    }

    const avgRating = parseFloat(guide.avg_rating) || 0;
    const stars = Math.round(avgRating);
    const starIcons = '★'.repeat(stars) + '☆'.repeat(5 - stars);

    let html = `
        <div class="guide-card">
            <img src="${avatarUrl}" alt="${guide.Ten_huong_dan_vien}" class="guide-avatar" onerror="this.src='/images/placeholder.jpg'">
            <div class="flex-grow-1">
                <h6 class="mb-2"><i class="fas fa-user-tie me-2"></i>${guide.Ten_huong_dan_vien || 'N/A'}</h6>
                ${avgRating > 0 ? `
                    <div class="mb-2">
                        <span class="star-rating">${starIcons}</span>
                        <span class="ms-2">${avgRating.toFixed(1)}/5.0</span>
                        ${guide.rating_count > 0 ? `<span class="text-muted">(${guide.rating_count} đánh giá)</span>` : ''}
                    </div>
                ` : '<p class="text-muted mb-2">Chưa có đánh giá</p>'}
                ${guide.So_dien_thoai ? `
                    <div class="mb-1">
                        <i class="fas fa-phone me-2"></i>${guide.So_dien_thoai}
                    </div>
                ` : ''}
                ${guide.Ngon_ngu ? `
                    <div class="mb-1">
                        <i class="fas fa-language me-2"></i>${guide.Ngon_ngu}
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    if (guide.Kinh_nghiem) {
        html += `
            <div class="mt-3">
                <strong><i class="fas fa-briefcase me-2"></i>Kinh nghiệm:</strong>
                <p class="mt-2">${guide.Kinh_nghiem}</p>
            </div>
        `;
    }

    document.getElementById('guide-info').innerHTML = html;
}

// Hiển thị thông tin Booking
function displayBookingInfo(booking, tickets) {
    if (!booking) {
        document.getElementById('booking-info').innerHTML = '<p class="text-muted">Chưa có thông tin booking</p>';
        return;
    }

    const bookingDate = booking.Ngay_dat ? new Date(booking.Ngay_dat).toLocaleDateString('vi-VN') : 'N/A';
    const paymentDate = booking.Ngay_thanh_toan ? new Date(booking.Ngay_thanh_toan).toLocaleDateString('vi-VN') : 'Chưa thanh toán';
    
    let statusClass = 'status-pending';
    let statusText = booking.Trang_thai_booking || 'Chờ thanh toán';
    
    if (statusText === 'Đã thanh toán' || statusText === 'Da_thanh_toan' || booking.Trang_thai === 'Đã thanh toán') {
        statusClass = 'status-paid';
        statusText = 'Đã thanh toán';
    } else if (statusText === 'Hủy' || statusText === 'Da_huy') {
        statusClass = 'status-cancelled';
        statusText = 'Đã hủy';
    }

    const html = `
        <div class="info-row">
            <div class="info-label"><i class="fas fa-barcode me-2"></i>Mã booking:</div>
            <div class="info-value"><strong>${booking.Ma_booking || 'N/A'}</strong></div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-calendar me-2"></i>Ngày đặt:</div>
            <div class="info-value">${bookingDate}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-users me-2"></i>Số người lớn:</div>
            <div class="info-value">${booking.So_nguoi_lon || 0} người</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-child me-2"></i>Số trẻ em:</div>
            <div class="info-value">${booking.So_tre_em || 0} người</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-ticket-alt me-2"></i>Số vé:</div>
            <div class="info-value">${tickets && tickets.length > 0 ? tickets.length + ' vé' : 'Chưa có vé'}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-money-bill-wave me-2"></i>Tổng tiền:</div>
            <div class="info-value"><strong class="text-primary">${formatCurrency(booking.Tong_tien || 0)}</strong></div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-credit-card me-2"></i>Phương thức thanh toán:</div>
            <div class="info-value">${booking.Phuong_thuc_thanh_toan || 'Chưa thanh toán'}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-calendar-check me-2"></i>Ngày thanh toán:</div>
            <div class="info-value">${paymentDate}</div>
        </div>
        <div class="info-row">
            <div class="info-label"><i class="fas fa-info-circle me-2"></i>Trạng thái:</div>
            <div class="info-value">
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        </div>
    `;

    document.getElementById('booking-info').innerHTML = html;
}

// Hiển thị Dịch vụ đi kèm
function displayServices(services) {
    if (!services || services.length === 0) {
        document.getElementById('services-info').innerHTML = '<p class="text-muted">Không có dịch vụ đi kèm</p>';
        return;
    }

    let html = '';
    let totalServicePrice = 0;

    services.forEach(service => {
        const servicePrice = parseFloat(service.Thanh_tien || 0);
        totalServicePrice += servicePrice;

        html += `
            <div class="service-item">
                <div>
                    <strong>${service.Ten_dich_vu || 'N/A'}</strong>
                    ${service.So_luong ? `<span class="text-muted ms-2">(x${service.So_luong})</span>` : ''}
                    ${service.Mo_ta ? `<p class="text-muted mb-0 mt-1 small">${service.Mo_ta}</p>` : ''}
                </div>
                <div class="text-end">
                    <strong>${formatCurrency(servicePrice)}</strong>
                </div>
            </div>
        `;
    });

    if (totalServicePrice > 0) {
        html += `
            <div class="service-item mt-3" style="background: #e7f3ff; border: 2px solid #007bff;">
                <div><strong>Tổng dịch vụ:</strong></div>
                <div><strong class="text-primary">${formatCurrency(totalServicePrice)}</strong></div>
            </div>
        `;
    }

    document.getElementById('services-info').innerHTML = html;
}

// Hàm format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hàm hiển thị lỗi
function showError(message) {
    document.getElementById('loading-spinner').classList.add('d-none');
    document.getElementById('error-message').classList.remove('d-none');
    document.getElementById('error-text').textContent = message;
}


// Quản lý Lịch trình Tour
let currentTourId = null;
let currentTourName = '';
let currentTourDays = 0;
let itineraryList = [];

// Hàm mở modal quản lý lịch trình
async function manageItinerary(maTour, tenTour, thoiGian) {
    currentTourId = maTour;
    currentTourName = tenTour;
    currentTourDays = thoiGian || 0;

    document.getElementById('itineraryModalLabel').innerHTML = `<i class="fas fa-route me-2"></i>Quản lý Lịch trình: ${tenTour}`;
    document.getElementById('itineraryTourName').textContent = tenTour;
    document.getElementById('itineraryTourDays').textContent = thoiGian || 'Chưa có';

    const modal = new bootstrap.Modal(document.getElementById('itineraryModal'));
    modal.show();

    await loadItinerary();
}

// Hàm load danh sách lịch trình
async function loadItinerary() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/tour/${currentTourId}/itinerary`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Không thể tải lịch trình');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            itineraryList = data.data.itinerary || [];
            renderItineraryList();
        } else {
            throw new Error(data.message || 'Lỗi khi tải lịch trình');
        }
    } catch (error) {
        console.error('Error loading itinerary:', error);
        showAlert('danger', 'Lỗi khi tải lịch trình: ' + error.message);
        itineraryList = [];
        renderItineraryList();
    }
}

// Hàm render danh sách lịch trình
function renderItineraryList() {
    const container = document.getElementById('itineraryListContainer');
    
    if (!itineraryList || itineraryList.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>Chưa có lịch trình. Hãy tạo lịch trình cho tour này.
            </div>
        `;
        return;
    }

    let html = '';
    itineraryList.forEach((day, index) => {
        html += `
            <div class="card mb-3 itinerary-day-card" data-itinerary-id="${day.Ma_itinerary}">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="fas fa-calendar-day me-2"></i>Ngày ${day.Ngay_thu}
                    </h6>
                    <div>
                        <button class="btn btn-sm btn-danger" onclick="deleteItineraryDay(${day.Ma_itinerary})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label"><strong>Tiêu đề:</strong></label>
                        <input type="text" class="form-control itinerary-title" 
                               value="${escapeHtml(day.Tieu_de || '')}" 
                               data-id="${day.Ma_itinerary}"
                               placeholder="Nhập tiêu đề hoạt động...">
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label"><strong>Thời gian hoạt động:</strong></label>
                            <input type="text" class="form-control itinerary-time" 
                                   value="${escapeHtml(day.Thoi_gian_hoat_dong || '')}" 
                                   data-id="${day.Ma_itinerary}"
                                   placeholder="VD: 08:00 - 12:00">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label"><strong>Địa điểm:</strong></label>
                            <input type="text" class="form-control itinerary-location" 
                                   value="${escapeHtml(day.Dia_diem || '')}" 
                                   data-id="${day.Ma_itinerary}"
                                   placeholder="Nhập địa điểm...">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>Mô tả chi tiết:</strong></label>
                        <textarea class="form-control itinerary-description" 
                                  rows="4" 
                                  data-id="${day.Ma_itinerary}"
                                  placeholder="Nhập mô tả chi tiết cho ngày này...">${escapeHtml(day.Mo_ta || '')}</textarea>
                    </div>
                    <div class="text-end">
                        <button class="btn btn-sm btn-primary" onclick="saveItineraryDay(${day.Ma_itinerary})">
                            <i class="fas fa-save me-1"></i>Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Hàm tự động tạo các ngày
async function generateItineraryDays() {
    if (!confirm(`Bạn có chắc muốn tự động tạo ${currentTourDays} ngày lịch trình cho tour này? (Sẽ xóa các ngày hiện có)`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/tour/${currentTourId}/itinerary/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numberOfDays: currentTourDays
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tạo lịch trình');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            showAlert('success', `Đã tự động tạo ${data.data.itinerary.length} ngày lịch trình`);
            await loadItinerary();
        } else {
            throw new Error(data.message || 'Lỗi khi tạo lịch trình');
        }
    } catch (error) {
        console.error('Error generating itinerary:', error);
        showAlert('danger', 'Lỗi khi tạo lịch trình: ' + error.message);
    }
}

// Hàm thêm ngày mới
async function addItineraryDay() {
    const nextDay = itineraryList.length > 0 
        ? Math.max(...itineraryList.map(d => d.Ngay_thu)) + 1 
        : 1;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/tour/${currentTourId}/itinerary`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Ngay_thu: nextDay,
                Tieu_de: `Ngày ${nextDay}`,
                Mo_ta: ''
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể thêm ngày');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            showAlert('success', 'Đã thêm ngày mới');
            await loadItinerary();
        } else {
            throw new Error(data.message || 'Lỗi khi thêm ngày');
        }
    } catch (error) {
        console.error('Error adding itinerary day:', error);
        showAlert('danger', 'Lỗi khi thêm ngày: ' + error.message);
    }
}

// Hàm lưu thay đổi một ngày
async function saveItineraryDay(maItinerary) {
    const card = document.querySelector(`.itinerary-day-card[data-itinerary-id="${maItinerary}"]`);
    if (!card) return;

    const title = card.querySelector('.itinerary-title').value.trim();
    const description = card.querySelector('.itinerary-description').value.trim();
    const time = card.querySelector('.itinerary-time').value.trim();
    const location = card.querySelector('.itinerary-location').value.trim();

    if (!title) {
        showAlert('warning', 'Vui lòng nhập tiêu đề');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/itinerary/${maItinerary}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                Tieu_de: title,
                Mo_ta: description,
                Thoi_gian_hoat_dong: time,
                Dia_diem: location
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể cập nhật');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            showAlert('success', 'Đã lưu thay đổi');
            await loadItinerary();
        } else {
            throw new Error(data.message || 'Lỗi khi cập nhật');
        }
    } catch (error) {
        console.error('Error saving itinerary day:', error);
        showAlert('danger', 'Lỗi khi lưu: ' + error.message);
    }
}

// Hàm xóa một ngày
async function deleteItineraryDay(maItinerary) {
    if (!confirm('Bạn có chắc muốn xóa ngày này?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/itinerary/${maItinerary}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể xóa');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            showAlert('success', 'Đã xóa ngày');
            await loadItinerary();
        } else {
            throw new Error(data.message || 'Lỗi khi xóa');
        }
    } catch (error) {
        console.error('Error deleting itinerary day:', error);
        showAlert('danger', 'Lỗi khi xóa: ' + error.message);
    }
}

// Hàm escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Hàm hiển thị alert
function showAlert(type, message) {
    // Sử dụng hàm showAlert có sẵn trong admin.js hoặc tạo mới
    if (typeof window.showAlert === 'function') {
        window.showAlert(type, message);
    } else {
        alert(message);
    }
}


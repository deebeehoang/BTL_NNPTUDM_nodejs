// Biến toàn cục để lưu trữ dịch vụ đang được chỉnh sửa
let currentEditingService = null;
let allServices = []; // Lưu trữ tất cả dịch vụ để tìm kiếm

// Hàm khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Tải danh sách dịch vụ khi trang được tải
    loadServices();

    // Thêm sự kiện cho nút thêm dịch vụ mới
    document.getElementById('addServiceBtn').addEventListener('click', function() {
        showServiceForm();
    });
    
    // Thêm sự kiện cho nút làm mới
    document.getElementById('refreshServicesBtn').addEventListener('click', function() {
        loadServices();
    });
    
    // Thêm sự kiện cho nút tìm kiếm
    document.getElementById('serviceSearchBtn').addEventListener('click', function() {
        searchServices();
    });
    
    // Thêm sự kiện khi nhấn Enter trong ô tìm kiếm
    document.getElementById('serviceSearchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchServices();
        }
    });
});

// Hàm tải danh sách dịch vụ từ API
function loadServices() {
    // Hiển thị loading
    document.getElementById('servicesList').innerHTML = '<tr><td colspan="5" class="text-center">Đang tải dữ liệu...</td></tr>';
    
    // Gọi API để lấy danh sách dịch vụ
    fetch(`${CONFIG.API_BASE_URL}/services`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể tải danh sách dịch vụ');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            allServices = data.data.services; // Lưu tất cả dịch vụ
            displayServices(data.data.services);
        } else {
            throw new Error(data.message || 'Lỗi khi tải danh sách dịch vụ');
        }
    })
    .catch(error => {
        console.error('Error loading services:', error);
        document.getElementById('servicesList').innerHTML = `<tr><td colspan="5" class="text-danger text-center">Lỗi: ${error.message}</td></tr>`;
        showAlert('danger', `Lỗi: ${error.message}`);
    });
}

// Hàm tìm kiếm dịch vụ
function searchServices() {
    const keyword = document.getElementById('serviceSearchInput').value.trim().toLowerCase();
    
    if (!keyword) {
        // Nếu không có từ khóa, hiển thị tất cả dịch vụ
        displayServices(allServices);
        return;
    }
    
    // Lọc dịch vụ theo từ khóa
    const filteredServices = allServices.filter(service => {
        return service.Ma_dich_vu.toLowerCase().includes(keyword) ||
               service.Ten_dich_vu.toLowerCase().includes(keyword) ||
               (service.Mo_ta && service.Mo_ta.toLowerCase().includes(keyword));
    });
    
    // Hiển thị kết quả tìm kiếm
    displayServices(filteredServices);
}

// Hàm hiển thị danh sách dịch vụ
function displayServices(services) {
    const tableBody = document.getElementById('servicesList');
    
    if (!services || services.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Không có dịch vụ nào</td></tr>';
        return;
    }
    
    let html = '';
    services.forEach(service => {
        html += `
            <tr>
                <td>${service.Ma_dich_vu || ''}</td>
                <td>${service.Ten_dich_vu || ''}</td>
                <td>${service.Mo_ta || ''}</td>
                <td>${formatCurrency(service.Gia)}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editService('${service.Ma_dich_vu}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteService('${service.Ma_dich_vu}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// Hàm hiển thị form thêm/sửa dịch vụ
function showServiceForm(serviceId = null) {
    // Tạo modal nếu chưa tồn tại
    if (!document.getElementById('serviceModal')) {
        const modalHTML = `
            <div class="modal fade" id="serviceModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="serviceModalTitle">Thêm dịch vụ mới</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="serviceForm">
                                <div class="mb-3">
                                    <label for="serviceId" class="form-label">Mã dịch vụ</label>
                                    <input type="text" class="form-control" id="serviceId" required>
                                </div>
                                <div class="mb-3">
                                    <label for="serviceName" class="form-label">Tên dịch vụ</label>
                                    <input type="text" class="form-control" id="serviceName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="serviceDescription" class="form-label">Mô tả</label>
                                    <textarea class="form-control" id="serviceDescription" rows="3"></textarea>
                                </div>
                                <div class="mb-3">
                                    <label for="servicePrice" class="form-label">Giá (VNĐ)</label>
                                    <input type="number" class="form-control" id="servicePrice" required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                            <button type="button" class="btn btn-primary" id="saveServiceBtn">Lưu</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Thêm modal vào body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Thêm sự kiện cho nút lưu
        document.getElementById('saveServiceBtn').addEventListener('click', saveService);
    }
    
    // Cập nhật tiêu đề modal
    const modalTitle = document.getElementById('serviceModalTitle');
    modalTitle.textContent = serviceId ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới';
    
    // Reset form
    document.getElementById('serviceForm').reset();
    
    // Nếu là chỉnh sửa, lấy thông tin dịch vụ
    if (serviceId) {
        document.getElementById('serviceId').disabled = true;
        fetchServiceDetails(serviceId);
    } else {
        document.getElementById('serviceId').disabled = false;
        currentEditingService = null;
    }
    
    // Hiển thị modal
    const serviceModal = new bootstrap.Modal(document.getElementById('serviceModal'));
    serviceModal.show();
}

// Hàm lấy thông tin chi tiết của dịch vụ
function fetchServiceDetails(serviceId) {
    fetch(`${CONFIG.API_BASE_URL}/services/${serviceId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin dịch vụ');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            const service = data.data.service;
            currentEditingService = service;
            
            // Điền thông tin vào form
            document.getElementById('serviceId').value = service.Ma_dich_vu || '';
            document.getElementById('serviceName').value = service.Ten_dich_vu || '';
            document.getElementById('serviceDescription').value = service.Mo_ta || '';
            document.getElementById('servicePrice').value = service.Gia || '';
        } else {
            throw new Error(data.message || 'Lỗi khi lấy thông tin dịch vụ');
        }
    })
    .catch(error => {
        console.error('Error fetching service details:', error);
        showAlert('danger', `Lỗi: ${error.message}`);
    });
}

// Hàm lưu dịch vụ (thêm mới hoặc cập nhật)
function saveService() {
    // Lấy dữ liệu từ form
    const serviceId = document.getElementById('serviceId').value;
    const serviceName = document.getElementById('serviceName').value;
    const serviceDescription = document.getElementById('serviceDescription').value;
    const servicePrice = document.getElementById('servicePrice').value;
    
    // Validate dữ liệu
    if (!serviceId || !serviceName || !servicePrice) {
        showAlert('danger', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
    }
    
    // Tạo đối tượng dữ liệu
    const serviceData = {
        ma_dich_vu: serviceId,
        ten_dich_vu: serviceName,
        mo_ta: serviceDescription,
        gia: parseFloat(servicePrice)
    };
    
    // Xác định phương thức và URL
    const method = currentEditingService ? 'PUT' : 'POST';
    const url = currentEditingService 
        ? `${CONFIG.API_BASE_URL}/services/${currentEditingService.Ma_dich_vu}`
        : `${CONFIG.API_BASE_URL}/services`;
    
    // Gọi API để lưu dịch vụ
    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(serviceData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể lưu dịch vụ');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Đóng modal
            bootstrap.Modal.getInstance(document.getElementById('serviceModal')).hide();
            
            // Hiển thị thông báo thành công
            showAlert('success', currentEditingService ? 'Cập nhật dịch vụ thành công' : 'Thêm dịch vụ mới thành công');
            
            // Tải lại danh sách dịch vụ
            loadServices();
        } else {
            throw new Error(data.message || 'Lỗi khi lưu dịch vụ');
        }
    })
    .catch(error => {
        console.error('Error saving service:', error);
        showAlert('danger', `Lỗi: ${error.message}`);
    });
}

// Hàm chỉnh sửa dịch vụ
function editService(serviceId) {
    showServiceForm(serviceId);
}

// Hàm xóa dịch vụ
function deleteService(serviceId) {
    if (confirm('Bạn có chắc chắn muốn xóa dịch vụ này?')) {
        fetch(`${CONFIG.API_BASE_URL}/services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể xóa dịch vụ');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                showAlert('success', 'Xóa dịch vụ thành công');
                loadServices();
            } else {
                throw new Error(data.message || 'Lỗi khi xóa dịch vụ');
            }
        })
        .catch(error => {
            console.error('Error deleting service:', error);
            showAlert('danger', `Lỗi: ${error.message}`);
        });
    }
}

// Hàm hiển thị thông báo
function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    const alertId = 'alert-' + Date.now();
    
    const alertHTML = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    
    // Tự động ẩn thông báo sau 5 giây
    setTimeout(() => {
        const alert = document.getElementById(alertId);
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Hàm định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Đặt các hàm vào window để có thể gọi từ HTML
window.loadServices = loadServices;
window.editService = editService;
window.deleteService = deleteService;
window.searchServices = searchServices;

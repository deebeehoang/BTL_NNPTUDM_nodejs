// Biến lưu trữ biểu đồ
let monthlyRevenueChart;
let yearlyRevenueChart;

// Format số tiền VND
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hiển thị thông báo
function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alertDiv);

    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Khởi tạo select năm
function initYearSelect() {
    const yearSelect = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();
    
    // Thêm 5 năm gần nhất vào select
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    
    // Sự kiện khi thay đổi năm
    yearSelect.addEventListener('change', function() {
        loadMonthlyRevenue(this.value);
    });
}

// Load dữ liệu doanh thu theo tháng
async function loadMonthlyRevenue(year) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Chưa đăng nhập');
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ADMIN.REVENUE.MONTHLY}/${year}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                // Sử dụng dữ liệu mẫu nếu API chưa sẵn sàng
                const mockData = [
                    1500000, 2500000, 3000000, 2800000, 3500000, 4000000,
                    4500000, 5000000, 4800000, 4200000, 3800000, 4500000
                ];
                updateMonthlyRevenueChart(mockData);
                return;
            }
            throw new Error('Không thể tải dữ liệu doanh thu theo tháng');
        }
        
        const data = await response.json();
        if (data.status === 'success') {
            updateMonthlyRevenueChart(data.data);
        } else {
            throw new Error(data.message || 'Lỗi khi tải dữ liệu doanh thu theo tháng');
        }
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu doanh thu theo tháng:', error);
        showAlert('danger', 'Không thể tải dữ liệu doanh thu theo tháng');
        
        // Sử dụng dữ liệu mẫu khi có lỗi
        const mockData = [
            1500000, 2500000, 3000000, 2800000, 3500000, 4000000,
            4500000, 5000000, 4800000, 4200000, 3800000, 4500000
        ];
        updateMonthlyRevenueChart(mockData);
    }
}

// Load dữ liệu doanh thu theo năm
async function loadYearlyRevenue() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Chưa đăng nhập');
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ADMIN.REVENUE.YEARLY}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                // Sử dụng dữ liệu mẫu nếu API chưa sẵn sàng
                const mockData = {
                    '2020': 35000000,
                    '2021': 42000000,
                    '2022': 48000000,
                    '2023': 52000000,
                    '2024': 45000000
                };
                updateYearlyRevenueChart(mockData);
                return;
            }
            throw new Error('Không thể tải dữ liệu doanh thu theo năm');
        }
        
        const data = await response.json();
        if (data.status === 'success') {
            updateYearlyRevenueChart(data.data);
        } else {
            throw new Error(data.message || 'Lỗi khi tải dữ liệu doanh thu theo năm');
        }
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu doanh thu theo năm:', error);
        showAlert('danger', 'Không thể tải dữ liệu doanh thu theo năm');
        
        // Sử dụng dữ liệu mẫu khi có lỗi
        const mockData = {
            '2020': 35000000,
            '2021': 42000000,
            '2022': 48000000,
            '2023': 52000000,
            '2024': 45000000
        };
        updateYearlyRevenueChart(mockData);
    }
}

// Cập nhật biểu đồ doanh thu theo tháng
function updateMonthlyRevenueChart(data) {
    const ctx = document.getElementById('monthlyRevenueChart').getContext('2d');
    
    // Hủy biểu đồ cũ nếu tồn tại
    if (monthlyRevenueChart) {
        monthlyRevenueChart.destroy();
    }
    
    const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                   'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    
    monthlyRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatVND(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatVND(context.parsed.y);
                        }
                    }
                }
            }
        }
    });
}

// Cập nhật biểu đồ doanh thu theo năm
function updateYearlyRevenueChart(data) {
    const ctx = document.getElementById('yearlyRevenueChart').getContext('2d');
    
    // Hủy biểu đồ cũ nếu tồn tại
    if (yearlyRevenueChart) {
        yearlyRevenueChart.destroy();
    }
    
    const years = Object.keys(data);
    const revenues = Object.values(data);
    
    yearlyRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: revenues,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatVND(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatVND(context.parsed.y);
                        }
                    }
                }
            }
        }
    });
}

// Khởi tạo khi trang được load
document.addEventListener('DOMContentLoaded', function() {
    initYearSelect();
    loadMonthlyRevenue(new Date().getFullYear());
    loadYearlyRevenue();
}); 
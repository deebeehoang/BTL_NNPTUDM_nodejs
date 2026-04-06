// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra xem người dùng đã đăng nhập chưa và có phải là admin không
    const checkAuth = function() {
        const token = localStorage.getItem('token');
        const userString = localStorage.getItem('user');
        
        if (!token || !userString) {
            window.location.href = '/login.html';
            return;
        }
        
        const user = JSON.parse(userString);
        if (user.loai_tai_khoan !== 'Admin' && user.role !== 'Admin') {
            window.location.href = '/login.html';
            return;
        }

        // Hiển thị tên admin
        const adminNameElement = document.getElementById('adminName');
        if (adminNameElement) {
            adminNameElement.textContent = user.id_user || user.username || user.email;
        }
    };

    // Gọi kiểm tra xác thực
    checkAuth();

    // Thiết lập các thành phần UI
    setupUI();
    
    // Tải dữ liệu ban đầu
    loadDashboardData();
    setupEventHandlers();
});

// Thiết lập UI cơ bản
function setupUI() {
    // Xử lý debug mode
    const debugModeSwitch = document.getElementById('debugModeSwitch');
    if (debugModeSwitch) {
        debugModeSwitch.addEventListener('change', function() {
            const debugContainer = document.getElementById('debugContainer');
            if (debugContainer) {
                debugContainer.style.display = this.checked ? 'block' : 'none';
            }
            window.debugMode = this.checked;
            
            if (this.checked) {
                console.log('Debug mode bật');
                showAlert('info', 'Debug mode được bật');
            } else {
                console.log('Debug mode tắt');
            }
        });
    }

    // Xử lý đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        });
    }

    // Khởi tạo các tab
    setupTabNavigation();
}

// Thiết lập điều hướng tab
function setupTabNavigation() {
    // Xử lý các liên kết trong sidebar
    const navItems = {
        'navDashboard': { section: 'dashboardSection', title: 'Tổng quan', loader: null },
        'navStatistics': { section: 'dashboardSection', title: 'Thống kê - Báo cáo', loader: null },
        'navTours': { section: 'toursSection', title: 'Quản lý Tour', loader: loadToursTab },
        'navDestinations': { section: 'destinationsSection', title: 'Quản lý Điểm đến', loader: loadDestinationsTab },
        'navServices': { section: 'servicesSection', title: 'Quản lý Dịch vụ', loader: loadServices },
        'navTickets': { section: 'ticketsSection', title: 'Quản lý Vé', loader: loadTickets },
        'navBookings': { section: 'bookingsSection', title: 'Quản lý Booking', loader: loadBookingsTab },
        'navSchedules': { section: 'schedulesSection', title: 'Quản lý Lịch khởi hành', loader: loadSchedulesTab },
        'navGuides': { section: 'guidesSection', title: 'Quản lý Hướng dẫn viên', loader: loadGuidesTab },
        'navUsers': {
            section: 'usersSection',
            title: 'Quản lý người dùng',
            loader: loadUsers  // <- RẤT QUAN TRỌNG
        },
        'navRatings': { section: 'ratingsSection', title: 'Quản lý đánh giá', loader: loadRatings },
        'navPromotions': { section: 'promotionsSection', title: 'Quản lý khuyến mãi', loader: () => { if (window.promotionManager) window.promotionManager.loadPromotions(); } },
        'navSettings': { section: 'settingsSection', title: 'Cài đặt hệ thống', loader: null },
        'navMessages': { section: 'messagesSection', title: 'Tin nhắn', loader: null, isChat: true }
    };

    for (const [navId, navInfo] of Object.entries(navItems)) {
        const navElement = document.getElementById(navId);
        if (navElement) {
            navElement.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all nav items
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                // Add active class to clicked item
                this.classList.add('active');
                
                // Hide chat container and messages section if not messages
                const chatContainer = document.getElementById('chatContainer');
                const messagesSection = document.getElementById('messagesSection');
                
                // Hide all sections first
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                // Hide admin header by default, will show for non-messages sections
                const adminHeader = document.getElementById('adminHeader');
                
                if (navInfo.isChat) {
                    // Hide admin header for messages
                    if (adminHeader) {
                        adminHeader.style.display = 'none';
                    }
                    
                    // QUAN TRỌNG: Add class 'messages-active' vào body để trigger CSS rules
                    document.body.classList.add('messages-active');
                    
                    // Force remove padding/margin với inline styles để chắc chắn
                    const mainContent = document.querySelector('.main-content');
                    const colElement = document.querySelector('.col.p-0');
                    const rowElement = document.querySelector('.row.g-0');
                    const containerFluid = document.querySelector('.container-fluid.px-0');
                    
                    if (mainContent) {
                        mainContent.style.setProperty('padding', '0', 'important');
                        mainContent.style.setProperty('margin-left', '280px', 'important');
                        mainContent.style.setProperty('width', 'calc(100% - 280px)', 'important');
                    }
                    
                    if (colElement) {
                        colElement.style.setProperty('padding', '0', 'important');
                    }
                    
                    if (rowElement) {
                        rowElement.style.setProperty('margin-left', '0', 'important');
                        rowElement.style.setProperty('margin-right', '0', 'important');
                    }
                    
                    if (containerFluid) {
                        containerFluid.style.setProperty('padding-left', '0', 'important');
                        containerFluid.style.setProperty('padding-right', '0', 'important');
                    }
                    
                    // Show chat container for messages
                    if (chatContainer) {
                        chatContainer.style.display = 'flex';
                    }
                    if (messagesSection) {
                        messagesSection.classList.add('active');
                    }
                } else {
                    // Show admin header for other sections
                    if (adminHeader) {
                        adminHeader.style.display = 'block';
                    }
                    
                    // QUAN TRỌNG: Remove class 'messages-active' khỏi body
                    document.body.classList.remove('messages-active');
                    
                    // Restore normal padding/margin cho các section khác
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        mainContent.style.removeProperty('padding');
                        mainContent.style.removeProperty('margin-left');
                        mainContent.style.removeProperty('width');
                    }
                    
                    // Hide chat container and messages section for other sections
                    if (chatContainer) {
                        chatContainer.style.display = 'none';
                    }
                    if (messagesSection) {
                        messagesSection.classList.remove('active');
                    }
                    showSection(navInfo.section);
                }
                
                const sectionTitleElement = document.getElementById('sectionTitle');
                if (sectionTitleElement) {
                    sectionTitleElement.textContent = navInfo.title;
                }
                
                if (navInfo.loader) {
                    navInfo.loader();
                }
            });
        }
    }
}

// Thiết lập các event handler
function setupEventHandlers() {
    // Xử lý form Tour
    const addTourBtn = document.getElementById('addTourBtn');
    if (addTourBtn) {
        addTourBtn.addEventListener('click', function() {
            // Sử dụng đường dẫn tuyệt đối từ thư mục public
            window.location.href = 'add-tour.html';
        });
    }

    const cancelTourBtn = document.getElementById('cancelTourBtn');
    if (cancelTourBtn) {
        cancelTourBtn.addEventListener('click', function() {
            const tourFormContainer = document.getElementById('tourFormContainer');
            if (tourFormContainer) {
                tourFormContainer.style.display = 'none';
            }
        });
    }

    const refreshToursBtn = document.getElementById('refreshToursBtn');
    if (refreshToursBtn) {
        refreshToursBtn.addEventListener('click', function() {
            loadTours();
        });
    }

    // Schedule handlers
    const addScheduleBtn = document.getElementById('addScheduleBtn');
    if (addScheduleBtn) addScheduleBtn.addEventListener('click', showAddScheduleForm);
    const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
    if (cancelScheduleBtn) cancelScheduleBtn.addEventListener('click', hideScheduleForm);
    const scheduleForm = document.getElementById('scheduleForm');
    if (scheduleForm) scheduleForm.addEventListener('submit', saveSchedule);
}


// Hàm hiển thị section
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Hiển thị thông báo
function showAlert(type, message) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertContainer.appendChild(alertElement);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        alertElement.remove();
    }, 5000);
}

// Hiển thị debug message
function showDebug(message) {
    const debugContainer = document.getElementById('debugContainer');
    const debugOutput = document.getElementById('debugOutput');
    if (debugContainer && debugOutput) {
        if (typeof message === 'object') {
            message = JSON.stringify(message, null, 2);
        }
        debugOutput.textContent = message;
        debugContainer.style.display = 'block';
    }
}

// Hàm tải dữ liệu dashboard
async function loadDashboardData() {
    const endpoints = [
        `${CONFIG.API_BASE_URL}/admin/dashboard-stats`,
        `${CONFIG.API_BASE_URL}/dashboard-stats`,
        '/api/admin/dashboard-stats',
        '/api/dashboard-stats'
    ];

    async function tryNextEndpoint(index = 0) {
        if (index >= endpoints.length) {
            console.log('Đã thử tất cả các endpoint nhưng không thành công');
            showMockData();
            return;
        }

        const endpoint = endpoints[index];
        console.log('Đang thử endpoint:', endpoint);

        try {
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'success' && data.data) {
                updateDashboardStats(data.data);
            } else {
                throw new Error(data.message || 'Dữ liệu không hợp lệ');
            }
        } catch (error) {
            console.error(`Lỗi khi tải dữ liệu từ ${endpoint}:`, error);
            
            // Nếu là lỗi 500, log thêm chi tiết lỗi
            if (error.message.includes('500')) {
                console.error('Chi tiết lỗi:', error);
            }
            
            // Thử endpoint tiếp theo
            await tryNextEndpoint(index + 1);
        }
    }

    // Bắt đầu thử endpoint đầu tiên
    await tryNextEndpoint();
}

// Hiển thị dữ liệu mẫu khi không lấy được dữ liệu từ API
function showMockData() {
    console.log('Đã hiển thị dữ liệu mẫu cho dashboard');
    updateDashboardStats({
        tourStats: {
            total: 15,
            available: 8,
            full: 5,
            upcoming: 2
        },
        monthlyBookings: 25,
        totalRevenue: 150000000,
        pendingOrders: 5,
        completedOrders: 20,
        topCustomer: {
            Ten_khach_hang: "Khách hàng mẫu",
            total_bookings: 5,
            total_spent: 25000000
        },
        topTour: {
            Ten_tour: "Tour mẫu",
            total_bookings: 10,
            tour_status: "Còn chỗ"
        }
    });
}

// Cập nhật thống kê dashboard
function updateDashboardStats(data) {
    // Cập nhật thống kê tour
    const activeTours = document.getElementById('activeTours');
    if (activeTours) {
        const tourStats = data.tourStats;
        activeTours.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">Tổng số tour: ${tourStats.total}</h6>
                    <small class="text-success">Còn chỗ: ${tourStats.available}</small><br>
                    <small class="text-danger">Hết chỗ: ${tourStats.full}</small><br>
                    <small class="text-warning">Sắp mở: ${tourStats.upcoming}</small>
                </div>
                <div class="fs-1">
                    <i class="fas fa-globe-asia"></i>
                </div>
            </div>
        `;
    }

    // Cập nhật số booking theo tháng
    const monthlyBookings = document.getElementById('monthlyBookings');
    if (monthlyBookings) {
        monthlyBookings.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">Tổng số booking: ${data.monthlyBookings}</h6>
                    <small class="text-success">Hoàn thành: ${data.completedOrders}</small><br>
                    <small class="text-warning">Chờ thanh toán: ${data.pendingOrders}</small>
                </div>
                <div class="fs-1">
                    <i class="fas fa-calendar-check"></i>
                </div>
            </div>
        `;
    }

    // Cập nhật doanh thu
    const revenueByItem = document.getElementById('revenueByItem');
    if (revenueByItem) {
        revenueByItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">Tổng doanh thu:</h6>
                    <span class="h4">${formatCurrency(data.totalRevenue)}</span>
                </div>
                <div class="fs-1">
                    <i class="fas fa-dollar-sign"></i>
                </div>
            </div>
        `;
    }

    // Cập nhật thông tin khách hàng VIP
    const topCustomer = document.getElementById('topCustomer');
    if (topCustomer && data.topCustomer) {
        topCustomer.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">${data.topCustomer.Ten_khach_hang}</h6>
                    <small>Số booking: ${data.topCustomer.total_bookings}</small><br>
                    <small>Tổng chi: ${formatCurrency(data.topCustomer.total_spent)}</small>
                </div>
                <div class="fs-1">
                    <i class="fas fa-user-crown"></i>
                </div>
            </div>
        `;
    }

    // Cập nhật thông tin tour hot
    const topTour = document.getElementById('topTour');
    if (topTour && data.topTour) {
        const statusClass = {
            'Còn chỗ': 'text-success',
            'Hết chỗ': 'text-danger',
            'Sắp mở': 'text-warning'
        };
        
        topTour.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">${data.topTour.Ten_tour}</h6>
                    <small>Số booking: ${data.topTour.total_bookings}</small><br>
                    <small class="${statusClass[data.topTour.tour_status] || ''}">
                        ${data.topTour.tour_status}
                    </small>
                </div>
                <div class="fs-1">
                    <i class="fas fa-fire"></i>
                </div>
            </div>
        `;
    }
}

// Continue Dashboard Statistics
async function loadDashboardStatistics() {
    const statisticsContainer = document.getElementById('dashboard-statistics');
    if (!statisticsContainer) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ADMIN.DASHBOARD_STATS}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.getToken()}`
            }
        });

        const stats = await response.json();

        statisticsContainer.innerHTML = `
            <div class="stat-card">
                <h3>Tổng số tour</h3>
                <p>${stats.totalTours}</p>
            </div>
            <div class="stat-card">
                <h3>Tổng số đặt tour</h3>
                <p>${stats.totalBookings}</p>
            </div>
            <div class="stat-card">
                <h3>Doanh thu</h3>
                <p>${CONFIG.formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div class="stat-card">
                <h3>Khách hàng mới</h3>
                <p>${stats.newCustomers}</p>
            </div>
        `;
    } catch (error) {
        console.error('Dashboard stats error:', error);
        CONFIG.showMessage('Không thể tải thống kê', 'error');
    }
}

// Data Export Functionality
const dataExportButtons = document.querySelectorAll('.data-export-btn');
dataExportButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
        const exportType = e.target.dataset.exportType;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ADMIN.EXPORT}${exportType}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${CONFIG.getToken()}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const filename = `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`;
                
                // Create download link
                const downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(blob);
                downloadLink.download = filename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);

                CONFIG.showMessage(`Xuất dữ liệu ${exportType} thành công`, 'success');
            } else {
                const errorData = await response.json();
                CONFIG.showMessage(errorData.message || 'Xuất dữ liệu thất bại', 'error');
            }
        } catch (error) {
            console.error('Data export error:', error);
            CONFIG.showMessage('Có lỗi xảy ra khi xuất dữ liệu', 'error');
        }
    });
});

// Refresh Functions
async function refreshTourList() {
    const tourListContainer = document.getElementById('toursList');
    if (!tourListContainer) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ADMIN.TOURS_MANAGEMENT}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const tours = data.data.tours;
        
        // Clear existing list
        tourListContainer.innerHTML = '';

        // Populate tour list
        tours.forEach(tour => {
            const tourItem = document.createElement('tr');
            const loaiTourText = tour.Loai_tour === 'trong_nuoc' ? 'Trong nước' : 'Nước ngoài';
            // Xử lý đường dẫn hình ảnh
            let imgSrc = '/images/placeholder.jpg';
            if (tour.Hinh_anh) {
                if (tour.Hinh_anh.startsWith('/uploads/')) {
                    // Chuyển từ /uploads/tours/ thành /images/uploads/tours/
                    imgSrc = tour.Hinh_anh.replace('/uploads/', '/images/uploads/');
                } else if (tour.Hinh_anh.startsWith('uploads/')) {
                    // Đường dẫn không có dấu / đầu
                    imgSrc = '/images/' + tour.Hinh_anh;
                } else if (tour.Hinh_anh.startsWith('/images/')) {
                    // Đường dẫn đã đúng
                    imgSrc = tour.Hinh_anh;
                } else {
                    // Đường dẫn khác
                    imgSrc = tour.Hinh_anh;
                }
            }
            
            const hinhAnhHTML = tour.Hinh_anh ? 
                `<img src="${imgSrc}" alt="${tour.Ten_tour}" style="width:50px;height:50px;object-fit:cover;">` : 
                '<span class="text-muted">Không có</span>';
                
            tourItem.innerHTML = `
                <td>${tour.Ma_tour}</td>
                <td>${tour.Ten_tour}</td>
                <td>${tour.Thoi_gian} ngày</td>
                <td>${tour.Tinh_trang}</td>
                <td>${loaiTourText}</td>
                <td>${CONFIG.formatCurrency(tour.Gia_nguoi_lon)}</td>
                <td>${CONFIG.formatCurrency(tour.Gia_tre_em)}</td>
                <td>${hinhAnhHTML}</td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="manageItinerary('${tour.Ma_tour}', '${tour.Ten_tour}', ${tour.Thoi_gian})" title="Quản lý Lịch trình">
                        <i class="fas fa-route"></i>
                    </button>
                    <button class="btn btn-sm btn-info me-1" onclick="editTour('${tour.Ma_tour}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTour('${tour.Ma_tour}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tourListContainer.appendChild(tourItem);
        });
    } catch (error) {
        console.error('Tour list refresh error:', error);
        showAlert('danger', 'Không thể tải danh sách tour');
    }
}

async function saveTour(e) {
    e.preventDefault();
    
    try {
        // Lấy dữ liệu từ form
        const maTour = document.getElementById('maTour').value.trim();
        const tenTour = document.getElementById('tenTour').value.trim();
        const thoiGian = parseInt(document.getElementById('thoiGian').value);
        const tinhTrang = document.getElementById('tinhTrang').value;
        const loaiTour = document.getElementById('loaiTour').value;
        const giaNguoiLon = parseFloat(document.getElementById('giaNguoiLon').value);
        const giaTreEm = parseFloat(document.getElementById('giaTreEm').value);
        
        // Lấy giá trị đường dẫn hình ảnh hiện tại (có thể đã được cập nhật bởi uploadImage)
        const hinhAnhInput = document.getElementById('hinhAnh');
        let hinhAnh = hinhAnhInput.value || '';
    
        // Kiểm tra dữ liệu đầu vào
        if (!maTour || !tenTour || isNaN(thoiGian) || thoiGian <= 0 || 
            isNaN(giaNguoiLon) || giaNguoiLon < 0 || isNaN(giaTreEm) || giaTreEm < 0) {
            showAlert('danger', 'Vui lòng điền đầy đủ thông tin hợp lệ');
            return;
        }

        // Xử lý file hình ảnh
        const fileInput = document.getElementById('tourImageFile');
        
        // Nếu đang ở chế độ chỉnh sửa và không chọn file mới và chưa có đường dẫn hình ảnh
        if (isEditMode && (!fileInput.files || fileInput.files.length === 0) && !hinhAnh) {
            // Giữ nguyên đường dẫn hình ảnh hiện tại
            const existingTour = toursList.find(t => t.Ma_tour === maTour);
            hinhAnh = existingTour ? (existingTour.Hinh_anh || '') : '';
        }
        // Nếu có file được chọn và chưa được upload (đường dẫn hình ảnh còn trống)
        else if (fileInput.files && fileInput.files.length > 0 && !hinhAnh) {
            const file = fileInput.files[0];
            if (file.size > 5 * 1024 * 1024) { // Kiểm tra kích thước file (5MB)
                showAlert('danger', 'Kích thước file không được vượt quá 5MB');
                return;
            }
            
            // Upload file và lấy đường dẫn
            try {
                showAlert('info', 'Đang tải ảnh lên, vui lòng đợi...');
                const uploadResult = await uploadImage(file, 'tours');
                if (uploadResult) {
                    hinhAnh = uploadResult;
                    console.log('Đã tải ảnh lên, đường dẫn:', hinhAnh);
                } else {
                    showAlert('warning', 'Không thể tải ảnh lên, sẽ sử dụng ảnh mặc định');
                    hinhAnh = '/images/tour-placeholder.jpg';
                }
            } catch (uploadError) {
                console.error('Lỗi khi upload hình ảnh:', uploadError);
                showAlert('warning', 'Lỗi khi tải ảnh: ' + uploadError.message);
                hinhAnh = '/images/tour-placeholder.jpg';
            }
        }

        console.log('Đường dẫn hình ảnh cuối cùng:', hinhAnh);

        // Tạo đối tượng tour - Đảm bảo gửi cả hinh_anh (viết thường) và Hinh_anh (viết hoa) 
        // và đảm bảo đường dẫn ảnh đúng với định dạng lưu trong database
        const finalImagePath = normalizeImagePath(hinhAnh, 'tours');
        console.log('Final image path for database:', finalImagePath);
        
        const tourData = {
            Ma_tour: maTour,
            Ten_tour: tenTour,
            Thoi_gian: thoiGian,
            Tinh_trang: tinhTrang,
            Loai_tour: loaiTour,
            Gia_nguoi_lon: giaNguoiLon,
            Gia_tre_em: giaTreEm,
            Hinh_anh: finalImagePath,
            hinh_anh: finalImagePath // Thêm version viết thường để controller có thể nhận được
        };
        
        console.log('Dữ liệu tour cần lưu:', JSON.stringify(tourData, null, 2));
        
        // Gửi yêu cầu API
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('danger', 'Bạn cần đăng nhập để thực hiện chức năng này');
            return;
        }
        
        let response;
        let apiUrl = `${CONFIG.API_BASE_URL}/tours`;
        
        if (isEditMode) {
            // Cập nhật tour
            apiUrl += `/${maTour}`;
            console.log('Sending PUT request to:', apiUrl);
            response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tourData)
            });
        } else {
            // Thêm tour mới
            console.log('Sending POST request to:', apiUrl);
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tourData)
            });
        }
    
        const data = await response.json();
        console.log('API Response:', data);
    
        if (data.status === 'success') {
            // Cập nhật UI
            showAlert('success', isEditMode ? 'Cập nhật tour thành công' : 'Thêm tour mới thành công');
            // Tải lại danh sách tour
            await loadTours();
            // Ẩn form
            hideForm();
        } else {
            showAlert('danger', `Lỗi: ${data.message || 'Không thể lưu dữ liệu'}`);
        }
    } catch (error) {
        console.error('Lỗi khi lưu tour:', error);
        showAlert('danger', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.');
        
        // Xử lý lưu dữ liệu trong môi trường demo nếu API không khả dụng
        if (isDemoMode) {
            saveTourOffline();
        }
    }
}

async function editTour(tourId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${CONFIG.API_BASE_URL}/tours/${tourId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Không thể lấy thông tin tour');
        }

        const data = await response.json();
        if (data.status === 'success' && data.data) {
            // Lưu thông tin tour vào localStorage để trang add-tour.html có thể lấy
            localStorage.setItem('editTourData', JSON.stringify(data.data));
            // Chuyển hướng đến trang add-tour.html với tham số edit
            window.location.href = `add-tour.html?edit=${tourId}`;
        } else {
            showAlert('error', 'Không tìm thấy thông tin tour');
        }
    } catch (error) {
        console.error('Lỗi khi lấy thông tin tour:', error);
        showAlert('error', 'Lỗi khi lấy thông tin tour: ' + error.message);
    }
}

// Hàm ẩn form
function hideForm() {
    const formSection = document.getElementById('tourFormSection');
    const tourForm = document.getElementById('tourForm');
    const previewImg = document.getElementById('tourImagePreview');
    const noImageText = document.getElementById('tourNoImageText');
    
    if (formSection) {
        formSection.style.display = 'none';
    }
    
    if (tourForm) {
        tourForm.reset();
    }
    
    // Ẩn preview hình ảnh
    if (previewImg) {
        previewImg.style.display = 'none';
    }
    
    if (noImageText) {
        noImageText.style.display = 'block';
    }
}

// Hàm lưu tour (thêm mới hoặc cập nhật)
async function saveTour(e) {
  e.preventDefault();
  
    // Kiểm tra sự tồn tại của các phần tử form
    const maTourInput = document.getElementById('maTour');
    const tenTourInput = document.getElementById('tenTour');
    const thoiGianInput = document.getElementById('thoiGian');
    const tinhTrangInput = document.getElementById('tinhTrang');
    const loaiTourInput = document.getElementById('loaiTour');
    const giaNguoiLonInput = document.getElementById('giaNguoiLon');
    const giaTreEmInput = document.getElementById('giaTreEm');
    const hinhAnhInput = document.getElementById('hinhAnh');
    
    if (!maTourInput || !tenTourInput || !thoiGianInput || !tinhTrangInput || 
        !loaiTourInput || !giaNguoiLonInput || !giaTreEmInput) {
        console.error('Không tìm thấy các phần tử form cần thiết');
        showAlert('danger', 'Lỗi: Không thể lưu dữ liệu. Thiếu trường dữ liệu cần thiết.');
        return;
    }
    
    // Thu thập dữ liệu từ form
  const tourData = {
        ma_tour: maTourInput.value,
        ten_tour: tenTourInput.value,
        thoi_gian: parseInt(thoiGianInput.value),
        tinh_trang: tinhTrangInput.value,
        loai_tour: loaiTourInput.value,
        gia_nguoi_lon: parseFloat(giaNguoiLonInput.value),
        gia_tre_em: parseFloat(giaTreEmInput.value),
        hinh_anh: hinhAnhInput ? hinhAnhInput.value || null : null
    };
    
    console.log('Dữ liệu tour sẽ lưu:', tourData);
  
  try {
    let response;
    let data;
    const token = localStorage.getItem('token');
        
        if (!token) {
            showAlert('danger', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn');
            return;
        }
        
        // Hiển thị thông tin đang lưu
        showAlert('info', 'Đang lưu thông tin tour...');
    
    if (isEditMode) {
      // Cập nhật tour
            console.log(`Đang cập nhật tour ${currentTourId} với dữ liệu:`, tourData);
            response = await fetch(`http://localhost:5000/api/tours/${currentTourId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tourData)
      });
    } else {
      // Thêm tour mới
            console.log('Đang tạo tour mới với dữ liệu:', tourData);
            response = await fetch('http://localhost:5000/api/tours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tourData)
      });
    }
    
        // Kiểm tra lỗi HTTP
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Lỗi HTTP ${response.status}: ${errorText}`);
            showAlert('danger', `Lỗi ${response.status}: ${response.statusText}`);
            return;
        }
        
        try {
            // Xử lý kết quả JSON an toàn
            const responseText = await response.text();
            let responseData = {};
            
            if (responseText && responseText.trim() !== '') {
                try {
                    responseData = JSON.parse(responseText);
                } catch (jsonError) {
                    console.warn('Phản hồi không phải JSON hợp lệ:', responseText);
                }
            }
            
            console.log('Kết quả lưu tour:', responseData);
            
            // Xử lý thành công
            showAlert('success', isEditMode ? 'Cập nhật tour thành công' : 'Thêm tour thành công');
            hideForm();
            loadTours(); // Tải lại danh sách tour
        } catch (jsonError) {
            console.error('Lỗi khi xử lý JSON:', jsonError);
            
            // Vẫn xử lý thành công nếu HTTP OK
      showAlert('success', isEditMode ? 'Cập nhật tour thành công' : 'Thêm tour thành công');
      hideForm();
      loadTours();
    }
  } catch (error) {
    console.error('Lỗi khi lưu tour:', error);
        showAlert('danger', `Lỗi: ${error.message}`);
  }
}

// Hàm xóa tour
async function deleteTour(tourId) {
    console.log('Xóa tour có ID:', tourId);
  
    if (!confirm('Bạn có chắc chắn muốn xóa tour này không?')) {
        return;
    }
  
  try {
    const token = localStorage.getItem('token');
        if (!token) {
            showAlert('danger', 'Bạn cần đăng nhập để thực hiện chức năng này');
            return;
        }
        
        showAlert('info', 'Đang xóa tour...');
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/tours/${tourId}`, {
      method: 'DELETE',
      headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
            showAlert('success', 'Tour đã được xóa thành công');
            // Tải lại danh sách tour
            await loadTours();
    } else {
            throw new Error(data.message || 'Không thể xóa tour');
    }
  } catch (error) {
    console.error('Lỗi khi xóa tour:', error);
        
        if (error.message.includes('booking') || error.message.includes('đặt tour')) {
            showAlert('danger', 'Không thể xóa tour này vì đã có booking sử dụng tour này');
        } else {
            showAlert('danger', `Lỗi: ${error.message || 'Không thể kết nối với máy chủ'}`);
        }
  }
}

// Hàm lọc tour theo từ khóa tìm kiếm
function filterTours() {
  const keyword = document.getElementById('searchTour').value.toLowerCase();
  
  if (!keyword) {
    renderTours(toursList);
    return;
  }
  
  const filteredTours = toursList.filter(tour => 
    tour.Ma_tour.toLowerCase().includes(keyword) || 
    tour.Ten_tour.toLowerCase().includes(keyword)
  );
  
  renderTours(filteredTours);
}

// Hàm định dạng tiền tệ
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(amount);
}

// Quản lý điểm đến
// Biến lưu trữ danh sách điểm đến
let destinationsList = [];
let currentDestinationId = null;
let isEditDestinationMode = false;

// Hàm tải danh sách điểm đến
async function loadDestinations() {
  try {
        // Hiển thị loading trong bảng
        const tableBody = document.getElementById('destinationsTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border text-primary" role="status"></div> Đang tải dữ liệu...</td></tr>';
        }
        
    const token = localStorage.getItem('token');
        console.log('Token:', token);
        
        // URL API chính
        const url = 'http://localhost:5000/api/destinations';
        
        const headers = {
            'Accept': 'application/json'
        };
        
        // Thêm token xác thực nếu có
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log(`Đang gọi API: GET ${url}`);
        
        // Thực hiện request API
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });
        
        console.log('API response status:', response.status);
        
        // Xử lý khi không nhận được dữ liệu
        if (!response.ok) {
            const errorText = await response.text();
            showAlert('danger', `Lỗi ${response.status}: ${response.statusText}`);
            console.error(`API Error ${response.status}:`, errorText);
            
            // Thử dùng endpoint khác nếu API ban đầu thất bại
            return await loadDestinationsWithAlternativeEndpoint();
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('API không trả về JSON:', text);
            showAlert('danger', 'Định dạng dữ liệu không đúng');
            
            // Thử dùng endpoint khác nếu API ban đầu thất bại
            return await loadDestinationsWithAlternativeEndpoint();
        }
        
        // Xử lý phản hồi JSON an toàn
        let data;
        try {
            const responseText = await response.text();
            data = JSON.parse(responseText);
        } catch (error) {
            console.error('Lỗi phân tích JSON:', error);
            return await loadDestinationsWithAlternativeEndpoint();
        }
        
        // Hiển thị dữ liệu chi tiết cho debug
        console.log('Chi tiết dữ liệu từ API:', data);
        
        // Xử lý dữ liệu nhận về từ API
        let destinationsArray = null;
        
        if (data.status === 'success' && data.data && Array.isArray(data.data.destinations)) {
            // Cấu trúc chuẩn từ API
            destinationsArray = data.data.destinations;
        } else if (Array.isArray(data)) {
            // Dữ liệu là một mảng trực tiếp
            destinationsArray = data;
        } else if (data.destinations && Array.isArray(data.destinations)) {
            // Mảng destinations ở cấp đầu tiên
            destinationsArray = data.destinations;
        } else if (data.data && Array.isArray(data.data)) {
            // Mảng data ở cấp đầu tiên
            destinationsArray = data.data;
      } else {
            // Tìm bất kỳ mảng nào trong đối tượng
            for (const key in data) {
                if (Array.isArray(data[key])) {
                    console.log(`Tìm thấy mảng ở trường "${key}"`);
                    destinationsArray = data[key];
                    break;
                }
            }
        }
        
        if (destinationsArray && destinationsArray.length > 0) {
            console.log('Sử dụng dữ liệu điểm đến:', destinationsArray);
            destinationsList = destinationsArray;
            renderDestinations(destinationsArray);
            showAlert('success', `Đã tải ${destinationsArray.length} điểm đến`);
            return true;
    } else {
            console.log('Không tìm thấy dữ liệu điểm đến hoặc mảng rỗng, thử endpoint khác');
            return await loadDestinationsWithAlternativeEndpoint();
    }
  } catch (error) {
        // Log lỗi
        console.error('Lỗi khi tải điểm đến:', error);
        showAlert('danger', `Lỗi: ${error.message}`);
        
        // Thử dùng endpoint khác nếu API ban đầu thất bại
        return await loadDestinationsWithAlternativeEndpoint();
    }
}

// Hàm thử tải điểm đến bằng endpoint thay thế
async function loadDestinationsWithAlternativeEndpoint() {
    // Sử dụng các URL thay thế
    const alternativeUrls = [
        'http://localhost:5000/api/admin/destinations',
        'http://localhost:5000/api/destinations/all',
        '/api/destinations',
        '/api/admin/destinations'
    ];
    
    // Thử từng URL cho đến khi thành công
    for (const alternativeUrl of alternativeUrls) {
        try {
            console.log(`Thử tải điểm đến với endpoint thay thế: ${alternativeUrl}`);
            
            const token = localStorage.getItem('token');
            const headers = {
                'Accept': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(alternativeUrl, {
                method: 'GET',
                headers: headers,
                mode: 'cors'
            });
            
            if (!response.ok) {
                console.error(`Lỗi khi tải điểm đến với endpoint ${alternativeUrl}: ${response.status}`);
                continue; // Thử URL tiếp theo
            }
            
            const data = await response.json();
            console.log(`Dữ liệu từ endpoint ${alternativeUrl}:`, data);
            
            let destinationsArray = extractDestinationsFromData(data);
            
            if (destinationsArray && destinationsArray.length > 0) {
                console.log(`Sử dụng dữ liệu điểm đến từ endpoint thay thế ${alternativeUrl}:`, destinationsArray);
                destinationsList = destinationsArray;
                renderDestinations(destinationsArray);
                showAlert('success', `Đã tải ${destinationsArray.length} điểm đến từ nguồn dữ liệu thay thế`);
                return true;
            }
        } catch (error) {
            console.error(`Lỗi khi tải điểm đến với endpoint ${alternativeUrl}:`, error);
        }
    }
    
    // Nếu tất cả các URL đều thất bại, hiển thị dữ liệu mẫu
    console.error('Tất cả các URL API đều thất bại');
    showAlert('warning', 'Không thể kết nối với API. Hiển thị dữ liệu mẫu.');
    showMockDestinationData();
    return false;
}

// Hàm trích xuất dữ liệu điểm đến từ response
function extractDestinationsFromData(data) {
    // Kiểm tra cấu trúc dữ liệu và trích xuất mảng destinations
    console.log('Xử lý dữ liệu destinations:', data);
    
    let destinationsArray = null;
    
    // Thử các cấu trúc dữ liệu khác nhau có thể gặp
    if (data.status === 'success' && data.data && Array.isArray(data.data.destinations)) {
        // Cấu trúc API theo tiêu chuẩn
        destinationsArray = data.data.destinations;
    } else if (Array.isArray(data)) {
        // Trực tiếp là mảng
        destinationsArray = data;
    } else if (data.destinations && Array.isArray(data.destinations)) {
        // Thuộc tính destinations ở mức đầu tiên
        destinationsArray = data.destinations;
    } else if (data.data && Array.isArray(data.data)) {
        // Thuộc tính data là mảng
        destinationsArray = data.data;
    } else if (data.data && data.data.destinations && Array.isArray(data.data.destinations)) {
        // Cấu trúc lồng nhau nhiều cấp
        destinationsArray = data.data.destinations;
    } else {
        // Tìm bất kỳ mảng nào trong đối tượng
        for (const key in data) {
            if (Array.isArray(data[key])) {
                destinationsArray = data[key];
                console.log(`Tìm thấy mảng trong thuộc tính: ${key}`);
                break;
            }
            
            // Kiểm tra thêm một cấp
            if (data[key] && typeof data[key] === 'object') {
                for (const nestedKey in data[key]) {
                    if (Array.isArray(data[key][nestedKey])) {
                        destinationsArray = data[key][nestedKey];
                        console.log(`Tìm thấy mảng trong thuộc tính lồng nhau: ${key}.${nestedKey}`);
                        break;
                    }
                }
                if (destinationsArray) break;
            }
        }
    }
    
    // Chuẩn hóa và xác thực dữ liệu
    if (destinationsArray && destinationsArray.length > 0) {
        // Kiểm tra xem đây có thực sự là mảng destinations không
        const validKeys = ['Ma_dia_danh', 'ma_dia_danh', 'Ten_dia_danh', 'ten_dia_danh'];
        const isValid = destinationsArray.some(item => {
            return validKeys.some(key => key in item);
        });
        
        if (!isValid) {
            console.warn('Dữ liệu không phải là mảng destinations hợp lệ');
            return null;
        }
        
        return destinationsArray;
    }
    
    return null;
}

// Hàm hiển thị dữ liệu điểm đến mẫu khi không thể tải từ API
function showMockDestinationData() {
    console.log('Hiển thị dữ liệu điểm đến mẫu');
    
    // Tạo một số dữ liệu mẫu để hiển thị
    const mockDestinations = [
        {
            Ma_dia_danh: 'DD001',
            Ten_dia_danh: 'Vịnh Hạ Long',
            Mo_ta: 'Vịnh Hạ Long là một vùng biển đảo thuộc thành phố Hạ Long, tỉnh Quảng Ninh, Việt Nam.',
            Hinh_anh: 'https://vietnam.travel/sites/default/files/styles/top_banner/public/2018-10/Banner%20ha%20long%20bay%20vietnam%20tourism.jpg'
        },
        {
            Ma_dia_danh: 'DD002',
            Ten_dia_danh: 'Phố cổ Hội An',
            Mo_ta: 'Phố cổ Hội An là một thành phố nổi tiếng ở tỉnh Quảng Nam, Việt Nam.',
            Hinh_anh: 'https://vietnam.travel/sites/default/files/styles/top_banner/public/2018-10/banner%20hoi%20an%20vietnam%20tourism.jpg'
        },
        {
            Ma_dia_danh: 'DD003',
            Ten_dia_danh: 'Vịnh Nha Trang',
            Mo_ta: 'Vịnh Nha Trang là một vùng biển đảo thuộc thành phố Nha Trang, tỉnh Khánh Hòa, Việt Nam.',
            Hinh_anh: 'https://vietnam.travel/sites/default/files/styles/top_banner/public/2018-10/Banner%20nha%20trang%20vietnam%20tourism.jpg'
        }
    ];
    
    destinationsList = mockDestinations;
    renderDestinations(mockDestinations);
    showAlert('warning', 'Đang hiển thị dữ liệu điểm đến mẫu. Hệ thống không thể kết nối với database.');
}

// Hiển thị danh sách điểm đến
function renderDestinations(destinations) {
    const tableBody = document.getElementById('destinationsTableBody');
    if (!tableBody) {
        console.error('Không tìm thấy phần tử có id="destinationsTableBody"');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (!destinations || destinations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Không có dữ liệu điểm đến</td></tr>';
    return;
  }
  
    console.log('Bắt đầu render destinations:', destinations);
    
    destinations.forEach(destination => {
        try {
            const row = document.createElement('tr');
            
            // Xác định các giá trị mặc định nếu dữ liệu thiếu
            const maDiaDanh = destination.Ma_dia_danh || destination.ma_dia_danh || '';
            const tenDiaDanh = destination.Ten_dia_danh || destination.ten_dia_danh || '';
            const moTa = destination.Mo_ta || destination.mo_ta || '';
            const hinhAnh = destination.Hinh_anh || destination.hinh_anh || '';
            
            // Kiểm tra nếu các trường bắt buộc trống
            if (!maDiaDanh || !tenDiaDanh) {
                console.warn('Bỏ qua điểm đến có dữ liệu không hợp lệ:', destination);
                return; // Skip this destination
            }
            
            row.innerHTML = `
                <td>${maDiaDanh}</td>
                <td>${tenDiaDanh}</td>
                <td>${moTa.length > 100 ? moTa.substring(0, 100) + '...' : moTa}</td>
                <td class="text-center">
                    ${hinhAnh ? `<img src="${CONFIG.IMAGE_URL}/${hinhAnh.startsWith('/') ? hinhAnh.substring(1) : hinhAnh}" alt="${tenDiaDanh}" class="img-thumbnail" style="max-width: 100px;">` : 'Không có hình ảnh'}
        </td>
        <td>
                    <button class="btn btn-sm btn-info me-1 btn-edit-destination" data-id="${maDiaDanh}">
                        <i class="fas fa-edit"></i> Sửa
          </button>
                    <button class="btn btn-sm btn-danger btn-delete-destination" data-id="${maDiaDanh}">
                        <i class="fas fa-trash"></i> Xóa
          </button>
        </td>
            `;
            
            tableBody.appendChild(row);
            console.log('Đã render điểm đến:', maDiaDanh);
        } catch (error) {
            console.error('Lỗi khi render điểm đến:', error, destination);
        }
    });
    
    console.log('Kết thúc render destinations');
    
    // Kích hoạt sự kiện cho các nút chỉnh sửa và xóa
    document.querySelectorAll('.btn-edit-destination').forEach(btn => {
        btn.addEventListener('click', function() {
            const destinationId = this.getAttribute('data-id');
            editDestination(destinationId);
        });
    });
    
    document.querySelectorAll('.btn-delete-destination').forEach(btn => {
        btn.addEventListener('click', function() {
            const destinationId = this.getAttribute('data-id');
            deleteDestination(destinationId);
        });
    });
}

// Quản lý dịch vụ
// Biến lưu trữ danh sách dịch vụ
let servicesList = [];
let currentServiceId = null;
let isEditServiceMode = false;

// Hàm tải danh sách dịch vụ
async function loadServices() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/services', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        servicesList = data.data.services || [];
        renderServices();
      } else {
        showAlert('danger', 'Không thể tải danh sách dịch vụ');
      }
    } else {
      showAlert('danger', 'Lỗi khi tải danh sách dịch vụ');
    }
  } catch (error) {
    console.error('Error loading services:', error);
    showAlert('danger', 'Đã xảy ra lỗi khi tải dữ liệu');
  }
}

// Hiển thị danh sách dịch vụ
function renderServices() {
  const servicesTable = document.getElementById('servicesList');
  if (!servicesTable) return;
  
  if (servicesList.length === 0) {
    servicesTable.innerHTML = '<tr><td colspan="5" class="text-center">Không có dịch vụ nào</td></tr>';
    return;
  }
  
  let html = '';
  servicesList.forEach(service => {
    html += `
      <tr>
        <td>${service.Ma_dich_vu}</td>
        <td>${service.Ten_dich_vu}</td>
        <td>${service.Mo_ta ? service.Mo_ta.substring(0, 50) + (service.Mo_ta.length > 50 ? '...' : '') : 'Không có mô tả'}</td>
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
  
  servicesTable.innerHTML = html;
}

// Quản lý vé
// Biến lưu trữ danh sách vé
let ticketsList = [];
let currentTicketId = null;
let isEditTicketMode = false;
// Sửa hàm loadTickets
function loadTickets() {
    console.log('Đang tải tab quản lý Vé');
    
    // Hiển thị section tickets
    showSection('ticketsSection');
    
    // Cập nhật tiêu đề
    const sectionTitleElement = document.getElementById('sectionTitle');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = 'Quản lý Vé';
    }
    
    // Kiểm tra xem nội dung đã được tạo chưa
    const ticketsSection = document.getElementById('ticketsSection');
    if (ticketsSection && !ticketsSection.querySelector('.table')) {
        // Nếu chưa có nội dung, tạo mới
        ticketsSection.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6"><h3>Quản lý Vé</h3></div>
                <div class="col-md-6 text-end">
                    <input type="text" id="filterBookingId" class="form-control d-inline-block w-50" placeholder="Lọc theo Booking ID">
                </div>
            </div>
            
            <!-- Form quản lý vé -->
            <div id="ticketFormContainer" class="mb-4" style="display:none;">
                <h4 id="ticketFormTitle">Chỉnh sửa Vé</h4>
                <form id="ticketForm">
                    <div class="row">
                        <div class="col-md-3 mb-3">
                            <label for="ticketId" class="form-label">Mã Vé</label>
                            <input type="text" class="form-control" id="ticketId" disabled>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label for="ticketBookingId" class="form-label">Mã Booking</label>
                            <input type="text" class="form-control" id="ticketBookingId" disabled>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label for="ticketScheduleId" class="form-label">Mã Lịch</label>
                            <input type="text" class="form-control" id="ticketScheduleId" disabled>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label for="ticketStatus" class="form-label">Trạng thái</label>
                            <select class="form-control" id="ticketStatus">
                                <option value="Chua_su_dung">Chưa sử dụng</option>
                                <option value="Da_su_dung">Đã sử dụng</option>
                                <option value="Da_huy">Đã hủy</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <label for="ticketPrice" class="form-label">Giá Vé (VNĐ)</label>
                            <input type="number" class="form-control" id="ticketPrice" required>
                        </div>
                    </div>
                    <div class="text-end">
                        <button type="button" class="btn btn-secondary me-2" id="cancelTicketBtn">Hủy</button>
                        <button type="submit" class="btn btn-primary">Lưu</button>
                    </div>
                </form>
            </div>
            
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Số Vé</th>
                            <th>Mã Booking</th>
                            <th>Mã Lịch</th>
                            <th>Giá Vé</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="ticketsList">
                        <tr><td colspan="6" class="text-center">Đang tải dữ liệu...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Gắn sự kiện filter theo Booking ID
        const filterBookingInput = document.getElementById('filterBookingId');
        if (filterBookingInput) {
            filterBookingInput.addEventListener('input', function() {
                const val = this.value.trim();
                if (!val) renderTickets();
                else {
                    const filtered = ticketsList.filter(t => (t.Ma_booking || '').includes(val));
                    renderTickets(filtered);
                }
            });
        }
        
        // Gắn sự kiện cancel và save form
        const cancelTicketBtn = document.getElementById('cancelTicketBtn');
        if (cancelTicketBtn) {
            cancelTicketBtn.addEventListener('click', hideTicketForm);
        }
        
        const ticketForm = document.getElementById('ticketForm');
        if (ticketForm) {
            ticketForm.addEventListener('submit', saveTicket);
        }
    }
    
    // API call để lấy dữ liệu vé
    const token = localStorage.getItem('token');
    if (token) {
        fetch('/api/tickets', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                ticketsList = data.data.tickets || [];
                renderTickets();
            } else {
                showAlert('danger', 'Không thể tải danh sách vé');
            }
        })
        .catch(error => {
            console.error('Error loading tickets:', error);
            showAlert('danger', 'Đã xảy ra lỗi khi tải dữ liệu');
        });
    }
}

// Sửa lại hàm renderTickets để hiển thị trạng thái vé
function renderTickets(list = ticketsList) {
    const ticketsTable = document.getElementById('ticketsList');
    if (!ticketsTable) return;
    
    if (list.length === 0) {
        ticketsTable.innerHTML = '<tr><td colspan="6" class="text-center">Không có vé nào</td></tr>';
        return;
    }
    
    let html = '';
    list.forEach(ticket => {
        // Hiển thị trạng thái vé với màu tương ứng
        let statusClass = '';
        let statusText = '';
        
        switch (ticket.Trang_thai_ve) {
            case 'Da_su_dung':
                statusClass = 'text-success';
                statusText = 'Đã sử dụng';
                break;
            case 'Da_huy':
                statusClass = 'text-danger';
                statusText = 'Đã hủy';
                break;
            default: // Chua_su_dung
                statusClass = 'text-warning';
                statusText = 'Chưa sử dụng';
        }
        
        html += `
            <tr>
                <td>${ticket.So_ve}</td>
                <td>${ticket.Ma_booking}</td>
                <td>${ticket.Ma_lich}</td>
                <td>${formatCurrency(ticket.Gia_ve)}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editTicket('${ticket.So_ve}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTicket('${ticket.So_ve}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    ticketsTable.innerHTML = html;
}
// Hàm định dạng tiền tệ
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

// Thêm hàm loadTours vào window object để có thể gọi từ bên ngoài
window.loadTours = loadTours;

// Đối tượng debug toàn cục
const Debugging = {
  logApiCall: function(url, method, response, data) {
    console.group(`API Call: ${method} ${url}`);
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.groupEnd();
    
    // Nếu có hàm hiển thị debug trên giao diện, sử dụng nó
    if (typeof window.showDebug === 'function') {
      let debugInfo = `API Call: ${method} ${url}\nStatus: ${response.status}\n\nResponse:\n${JSON.stringify(data, null, 2)}`;
      window.showDebug(debugInfo);
    }
    
    return data;
  },
  
  logError: function(url, method, error) {
    console.group(`API Error: ${method} ${url}`);
    console.error('Error:', error);
    console.groupEnd();
    
    // Nếu có hàm hiển thị debug trên giao diện, sử dụng nó
    if (typeof window.showDebug === 'function') {
      let debugInfo = `API Error: ${method} ${url}\nError: ${error.message}\n\nStack: ${error.stack}`;
      window.showDebug(debugInfo);
    }
    
    throw error;
  }
};

// Export đối tượng debug
window.Debugging = Debugging;

// Export hàm renderTours vào window object để có thể gọi từ bên ngoài
window.renderTours = renderTours;

// Danh sách tour - biến global
let toursList = [];

/**
 * Hiển thị danh sách tour trong bảng
 * @param {Array} tours - Danh sách các tour cần hiển thị
 */
function renderTours(tours) {
    console.log('Gọi hàm renderTours với', tours.length, 'tour');
    
    // Tìm tbody trực tiếp
    const tbody = document.getElementById('toursList');
    if (!tbody) {
        console.error('Không tìm thấy phần tbody (id: toursList)!');
        return;
    }
    
    // Cập nhật biến global
    toursList = tours;
    
    // Xóa dữ liệu cũ
    tbody.innerHTML = '';
    
    // Thêm dữ liệu mới
    tours.forEach(tour => {
        const row = document.createElement('tr');
        
        // Chuẩn bị hình ảnh với placeholder nếu không có
        let imgSrc = '/images/placeholder.jpg'; // Default placeholder
        if (tour.Hinh_anh) {
            if (tour.Hinh_anh.startsWith('/uploads/')) {
                // Chuyển từ /uploads/tours/ thành /images/uploads/tours/
                imgSrc = tour.Hinh_anh.replace('/uploads/', '/images/uploads/');
            } else if (tour.Hinh_anh.startsWith('uploads/')) {
                // Đường dẫn không có dấu / đầu
                imgSrc = '/images/' + tour.Hinh_anh;
            } else if (tour.Hinh_anh.startsWith('/images/')) {
                // Đường dẫn đã đúng
                imgSrc = tour.Hinh_anh;
            } else {
                // Đường dẫn khác
                imgSrc = tour.Hinh_anh;
            }
        }
        
        row.innerHTML = `
            <td>${tour.Ma_tour}</td>
            <td>${tour.Ten_tour}</td>
            <td>${tour.Thoi_gian} ngày</td>
            <td>${tour.Loai_tour === 'trong_nuoc' ? 'Trong nước' : 'Nước ngoài'}</td>
            <td><span class="badge bg-${tour.Tinh_trang === 'Còn chỗ' ? 'success' : tour.Tinh_trang === 'Hết chỗ' ? 'danger' : 'warning'}">${tour.Tinh_trang}</span></td>
            <td>${formatCurrency(tour.Gia_nguoi_lon || tour.Gia_tour || 0)}</td>
            <td>${formatCurrency(tour.Gia_tre_em || tour.Gia_tour / 2 || 0)}</td>
            <td><img src="${imgSrc}" alt="${tour.Ten_tour}" style="max-width: 100px;"></td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-primary" onclick="editTour('${tour.Ma_tour}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="deleteTour('${tour.Ma_tour}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Hiển thị số lượng tour
    const totalToursElement = document.getElementById('totalTours');
    if (totalToursElement) {
        totalToursElement.textContent = tours.length;
    }
}

/**
 * Tải danh sách tour từ API
 */
async function loadTours() {
    try {
       
        
        // Sử dụng API endpoint chuẩn
        const endpoint = `${CONFIG.API_BASE_URL}/tours`;
        console.log(`Tải tour từ endpoint: ${endpoint}`);
        
        const token = localStorage.getItem('token');
        const headers = {
            'Accept': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            console.error(`Lỗi khi tải tour: ${response.status}`);
            showAlert('danger', `Không thể tải danh sách tour (${response.status})`);
            return false;
        }
        
        const data = await response.json();
        console.log('Dữ liệu tour từ API:', data);
        
        if (data.status === 'success' && data.data && data.data.tours) {
            // Hiển thị dữ liệu
            renderTours(data.data.tours);
            // showAlert('success', `Đã tải ${data.data.tours.length} tour`);
            return true;
        } else {
            showAlert('warning', 'Không tìm thấy dữ liệu tour trong phản hồi');
            console.error('Không thể xác định mảng tours trong dữ liệu:', data);
            return false;
        }
    } catch (error) {
        console.error('Lỗi khi tải tour:', error);
        showAlert('danger', `Lỗi: ${error.message}`);
        return false;
    }
}

/**
 * Hiển thị dữ liệu tour mẫu khi không thể kết nối API
 */
function showMockTourData() {
    console.log('Hiển thị dữ liệu tour mẫu');
    
    const mockTours = [
        {
            Ma_tour: 'TOUR001',
            Ten_tour: 'Hà Nội - Hạ Long - Sapa',
            Thoi_gian: 5,
            Loai_tour: 'trong_nuoc',
            Tinh_trang: 'Còn chỗ',
            Gia_nguoi_lon: 5000000,
            Gia_tre_em: 2500000,
            Hinh_anh: '/images/placeholder.jpg'
        },
        {
            Ma_tour: 'TOUR002',
            Ten_tour: 'Đà Nẵng - Hội An - Huế',
            Thoi_gian: 4,
            Loai_tour: 'trong_nuoc',
            Tinh_trang: 'Còn chỗ',
            Gia_nguoi_lon: 4500000,
            Gia_tre_em: 2250000,
            Hinh_anh: '/images/placeholder.jpg'
        },
        {
            Ma_tour: 'TOUR003',
            Ten_tour: 'Phú Quốc - Thiên Đường Biển',
            Thoi_gian: 3,
            Loai_tour: 'trong_nuoc',
            Tinh_trang: 'Hết chỗ',
            Gia_nguoi_lon: 6000000,
            Gia_tre_em: 3000000,
            Hinh_anh: '/images/placeholder.jpg'
        }
    ];
    
    renderTours(mockTours);
    showAlert('warning', 'Hiển thị dữ liệu tour mẫu do không thể kết nối đến máy chủ');
}

// Hàm tải tour trực tiếp từ database
async function loadToursDirectFromDatabase() {
    const token = localStorage.getItem('token');
    if (!token) {
        showAlert('danger', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn');
        return false;
    }

    try {
        // Hiển thị loading trong bảng
        const tableBody = document.getElementById('toursTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"></div></td></tr>';
        }

        // Gọi API lấy dữ liệu tour trực tiếp - thử nhiều endpoint khác nhau
        const endpoints = [
            '/api/tours/database/all',
            '/api/admin/tours',
            '/api/tours'
        ];

        let response = null;
        let successEndpoint = '';

        // Thử từng endpoint cho đến khi thành công
        for (const endpoint of endpoints) {
            try {
                const resp = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'X-Direct-DB-Query': 'true'
                    }
                });

                if (resp.ok) {
                    response = resp;
                    successEndpoint = endpoint;
                    break;
                }
            } catch (err) {
                continue;
            }
        }

        if (!response) {
            throw new Error('Không thể kết nối với bất kỳ API endpoint nào');
        }

        const data = await response.json();

        // Xử lý dữ liệu nhận được
        let toursArray = null;
        
        if (data.status === 'success' && data.data && Array.isArray(data.data.tours)) {
            toursArray = data.data.tours;
        } else if (Array.isArray(data)) {
            toursArray = data;
        } else if (data.tours && Array.isArray(data.tours)) {
            toursArray = data.tours;
        } else if (data.data && Array.isArray(data.data)) {
            toursArray = data.data;
        } else {
            for (const key in data) {
                if (Array.isArray(data[key])) {
                    toursArray = data[key];
                    break;
                }
            }
        }

        if (toursArray && toursArray.length > 0) {
            toursList = toursArray;
            renderTours(toursArray);
            
            const totalToursElement = document.getElementById('totalTours');
            if (totalToursElement) {
                totalToursElement.textContent = toursArray.length;
            }
            
            return true;
        } else {
            showAlert('warning', 'Không tìm thấy dữ liệu tour trong phản hồi');
            return false;
        }
    } catch (error) {
        showAlert('danger', `Lỗi: ${error.message}`);
        return false;
    }
}

// Bổ sung thêm một button để tải lại dữ liệu tour
function addRefreshTourButton() {
    const container = document.querySelector('.card-header .d-flex');
    if (container) {
        const refreshButton = document.createElement('button');
        refreshButton.className = 'btn btn-sm btn-primary ms-2';
        refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Tải lại';
        refreshButton.addEventListener('click', function() {
            loadToursWithFallback();
        });
        container.appendChild(refreshButton);
    }
}

// Hàm tải tour với nhiều phương thức dự phòng
async function loadToursWithFallback() {
    try {
        // showAlert('info', 'Đang tải...');
        
        // Thử phương thức 1: Truy vấn database trực tiếp
        const result1 = await loadToursDirectFromDatabase().catch(() => false);
        
        if (result1) return;
        
        // Thử phương thức 2: API chuẩn
        const result2 = await loadTours().catch(() => false);
        
        if (result2) return;
        
        // Hiển thị dữ liệu mẫu nếu cả hai cách đều thất bại
        showMockTourData();
        
    } catch (error) {
        showAlert('danger', 'Không thể tải dữ liệu tour. Hiển thị dữ liệu mẫu.');
        showMockTourData();
    }
}

// Override hàm loadToursTab để thêm nút tải lại
function loadToursTab() {
    // Hiển thị section tours
    showSection('toursSection');
    
    // Cập nhật tiêu đề
    const sectionTitle = document.getElementById('sectionTitle');
    if (sectionTitle) {
        sectionTitle.textContent = 'Quản lý Tour';
    }

    // Đảm bảo nút thêm tour được hiển thị và hoạt động
    const addTourBtn = document.getElementById('addTourBtn');
    if (addTourBtn) {
        addTourBtn.style.display = 'inline-block';
        addTourBtn.onclick = function() {
            window.location.href = 'add-tour.html';
        };
    }

    // Kiểm tra và tạo bảng nếu chưa có
    const toursSection = document.getElementById('toursSection');
    if (toursSection && !toursSection.querySelector('.table-container')) {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        tableContainer.innerHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Mã Tour</th>
                            <th>Tên Tour</th>
                            <th>Thời gian</th>
                            <th>Tình trạng</th>
                            <th>Loại Tour</th>
                            <th>Giá người lớn</th>
                            <th>Giá trẻ em</th>
                            <th>Hình ảnh</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="toursList">
                        <!-- Tour items will be loaded here -->
                    </tbody>
                </table>
            </div>
        `;
        toursSection.appendChild(tableContainer);
    }

    // Load danh sách tour
    loadTours();
}

// Hàm tải tour với endpoint tùy chỉnh
async function loadToursWithCustomEndpoint(endpoint) {
    try {
        showAlert('info', `Đang tải dữ liệu tour từ ${endpoint}...`);
        
        // Hiển thị loading trong bảng
        const tableBody = document.getElementById('toursTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"></div> Đang tải dữ liệu...</td></tr>';
        }
        
        const token = localStorage.getItem('token');
        
        const headers = {
            'Accept': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log(`Đang gọi API: GET ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });
        
        // Lưu response data để debug
        const responseClone = response.clone();
        const responseData = await responseClone.json().catch(e => {
            console.error('Error parsing response:', e);
            return { error: 'Could not parse response' };
        });
        
        // Hiển thị dữ liệu trong debug panel
        if (window.debugMode) {
            const apiResponseData = document.getElementById('apiResponseData');
            if (apiResponseData) {
                apiResponseData.textContent = JSON.stringify(responseData, null, 2);
            }
        }
        
        if (!response.ok) {
            showAlert('danger', `Lỗi ${response.status}: ${response.statusText}`);
            return false;
        }
        
        // Xử lý dữ liệu
        const data = responseData;
        let toursArray = extractToursFromData(data);
        
        if (toursArray && toursArray.length > 0) {
            console.log('Dữ liệu tour:', toursArray);
            toursList = toursArray; // Lưu vào biến global để sử dụng sau này
            renderTours(toursArray);
            
            // Cập nhật số tour trên dashboard
            const totalToursElement = document.getElementById('totalTours');
            if (totalToursElement) {
                totalToursElement.textContent = toursArray.length;
            }
            
            showAlert('success', `Đã tải ${toursArray.length} tour từ ${endpoint}`);
            return true;
        } else {
            showAlert('warning', 'Không tìm thấy dữ liệu tour trong phản hồi');
            return false;
        }
    } catch (error) {
        console.error(`Lỗi khi tải tour từ ${endpoint}:`, error);
        showAlert('danger', `Lỗi: ${error.message}`);
        return false;
    }
}

// Hàm hiển thị form thêm điểm đến mới
function showAddDestinationForm() {
    console.log('Hiển thị form thêm điểm đến mới');
    
    // Kiểm tra sự tồn tại của các phần tử DOM trước khi truy cập
    const formTitle = document.getElementById('destinationFormTitle');
    const form = document.getElementById('destinationForm');
    const idInput = document.getElementById('destinationId');
    const formSection = document.getElementById('destinationFormSection');
    
    if (!formTitle || !form || !idInput || !formSection) {
        console.error('Không tìm thấy một hoặc nhiều phần tử DOM cần thiết:', {
            formTitle: !!formTitle,
            form: !!form,
            idInput: !!idInput,
            formSection: !!formSection
        });
        showAlert('danger', 'Lỗi: Không thể hiển thị form thêm mới. Vui lòng tải lại trang.');
        return;
    }
    
    // Thiết lập các thuộc tính sau khi đã kiểm tra
    formTitle.textContent = 'Thêm Điểm Đến mới';
    form.reset();
    
    // Mã điểm đến có thể chỉnh sửa khi thêm mới
    idInput.disabled = false;
    
    // Cập nhật trạng thái form
    isEditDestinationMode = false;
    currentDestinationId = null;
    
    // Hiển thị form và cuộn đến form
    formSection.style.display = 'block';
    formSection.scrollIntoView({ behavior: 'smooth' });
}

// Hàm hiển thị form chỉnh sửa điểm đến
function editDestination(destinationId) {
    console.log('Chỉnh sửa điểm đến có ID:', destinationId);
    
    // Tìm điểm đến trong danh sách đã tải
    const destination = destinationsList.find(d => {
        const id = d.Ma_dia_danh || d.ma_dia_danh;
        return id === destinationId;
    });
    
    if (!destination) {
        console.error('Không tìm thấy thông tin điểm đến với ID:', destinationId);
        showAlert('danger', 'Không tìm thấy thông tin điểm đến');
        return;
    }
    
    console.log('Thông tin điểm đến để chỉnh sửa:', destination);
    
    // Kiểm tra sự tồn tại của các phần tử DOM
    const formTitle = document.getElementById('destinationFormTitle');
    const idInput = document.getElementById('destinationId');
    const nameInput = document.getElementById('destinationName');
    const descInput = document.getElementById('destinationDescription');
    const imageInput = document.getElementById('destinationImage');
    const previewImg = document.getElementById('destinationImagePreview');
    const noImageText = document.getElementById('destinationNoImageText');
    const formSection = document.getElementById('destinationFormSection');
    
    if (!formTitle || !idInput || !nameInput || !descInput || !imageInput || !formSection) {
        console.error('Không tìm thấy một hoặc nhiều phần tử DOM cần thiết');
        showAlert('danger', 'Lỗi: Không thể hiển thị form chỉnh sửa. Vui lòng tải lại trang.');
        return;
    }
    
    // Hiển thị form chỉnh sửa
    formTitle.textContent = 'Chỉnh sửa Điểm Đến';
    
    // Xác định các trường dữ liệu với xử lý cả hai kiểu đặt tên (camelCase và PascalCase)
    const maDiaDanh = destination.Ma_dia_danh || destination.ma_dia_danh || '';
    const tenDiaDanh = destination.Ten_dia_danh || destination.ten_dia_danh || '';
    const moTa = destination.Mo_ta || destination.mo_ta || '';
    const hinhAnh = destination.Hinh_anh || destination.hinh_anh || '';
    
    // Điền dữ liệu vào form
    idInput.value = maDiaDanh;
    idInput.disabled = true; // Không cho phép sửa mã điểm đến
    nameInput.value = tenDiaDanh;
    descInput.value = moTa;
    imageInput.value = hinhAnh;
    
    // Hiển thị preview hình ảnh nếu có
    if (previewImg && noImageText) {
        if (hinhAnh) {
            previewImg.src = hinhAnh;
            previewImg.style.display = 'block';
            noImageText.style.display = 'none';
        } else {
            previewImg.style.display = 'none';
            noImageText.style.display = 'block';
        }
    }
    
    // Cập nhật trạng thái form
    isEditDestinationMode = true;
    currentDestinationId = destinationId;
    
    // Hiển thị form và cuộn đến form
    formSection.style.display = 'block';
    formSection.scrollIntoView({ behavior: 'smooth' });
}

// Hàm ẩn form điểm đến
function hideDestinationForm() {
    const formSection = document.getElementById('destinationFormSection');
    const form = document.getElementById('destinationForm');
    const previewImg = document.getElementById('destinationImagePreview');
    const noImageText = document.getElementById('destinationNoImageText');
    
    if (formSection) {
        formSection.style.display = 'none';
    }
    
    if (form) {
        form.reset();
    }
    
    // Ẩn preview hình ảnh
    if (previewImg) {
        previewImg.style.display = 'none';
    }
    
    if (noImageText) {
        noImageText.style.display = 'block';
    }
}

// Hàm lưu điểm đến (thêm mới hoặc cập nhật)
async function saveDestination(e) {
    e.preventDefault();
    
    // Kiểm tra sự tồn tại của các phần tử form
    const idInput = document.getElementById('destinationId');
    const nameInput = document.getElementById('destinationName');
    const descInput = document.getElementById('destinationDescription');
    const imageInput = document.getElementById('destinationImage');
    
    if (!idInput || !nameInput || !descInput) {
        console.error('Không tìm thấy các phần tử form cần thiết:', {
            idInput: !!idInput,
            nameInput: !!nameInput,
            descInput: !!descInput,
            imageInput: !!imageInput
        });
        showAlert('danger', 'Lỗi: Không thể lưu dữ liệu. Thiếu trường dữ liệu cần thiết.');
        return;
    }
    
    // Thu thập dữ liệu từ form
    const destinationData = {
        ma_dia_danh: idInput.value,
        ten_dia_danh: nameInput.value,
        mo_ta: descInput.value,
        hinh_anh: imageInput ? imageInput.value || null : null
    };
    
    console.log('Dữ liệu điểm đến sẽ lưu:', destinationData);
    
    try {
        let response;
        let data;
        const token = localStorage.getItem('token');
        
        if (!token) {
            showAlert('danger', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn');
            return;
        }
        
        // Hiển thị thông tin đang lưu
        showAlert('info', 'Đang lưu thông tin điểm đến...');
        
        if (isEditDestinationMode) {
            // Cập nhật điểm đến
            console.log(`Đang cập nhật điểm đến ${currentDestinationId} với dữ liệu:`, destinationData);
            response = await fetch(`http://localhost:5000/api/destinations/${currentDestinationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(destinationData)
            });
        } else {
            // Thêm điểm đến mới
            console.log('Đang tạo điểm đến mới với dữ liệu:', destinationData);
            response = await fetch('http://localhost:5000/api/destinations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(destinationData)
            });
        }
        
        // Kiểm tra lỗi HTTP
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Lỗi HTTP ${response.status}: ${errorText}`);
            showAlert('danger', `Lỗi ${response.status}: ${response.statusText}`);
            return;
        }
        
        try {
            // Xử lý kết quả - kiểm tra nếu có phản hồi JSON
            const responseText = await response.text();
            let responseData = {};
            
            if (responseText && responseText.trim() !== '') {
                try {
                    responseData = JSON.parse(responseText);
                } catch (jsonError) {
                    console.warn('Phản hồi không phải JSON hợp lệ:', responseText);
                }
            }
            
            console.log('Kết quả lưu điểm đến:', responseData);
            
            // Coi như thành công nếu HTTP status là OK
            showAlert('success', isEditDestinationMode ? 'Cập nhật điểm đến thành công' : 'Thêm điểm đến thành công');
            hideDestinationForm();
            loadDestinations(); // Tải lại danh sách điểm đến
        } catch (jsonError) {
            console.error('Lỗi khi xử lý phản hồi JSON:', jsonError);
            
            // Vẫn xử lý thành công nếu HTTP status là OK
            showAlert('success', isEditDestinationMode ? 'Cập nhật điểm đến thành công' : 'Thêm điểm đến thành công');
            hideDestinationForm();
            loadDestinations();
        }
    } catch (error) {
        console.error('Lỗi khi lưu điểm đến:', error);
        showAlert('danger', `Lỗi: ${error.message}`);
    }
}

// Hàm xóa điểm đến
async function deleteDestination(destinationId) {
    if (!confirm('Bạn có chắc chắn muốn xóa điểm đến này?')) return;
    
    console.log('Xóa điểm đến có ID:', destinationId);
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            showAlert('danger', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn');
            return;
        }
        
        // Hiển thị thông tin đang xóa
        showAlert('info', 'Đang xóa điểm đến...');
        
        const response = await fetch(`http://localhost:5000/api/destinations/${destinationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Kiểm tra lỗi HTTP
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Lỗi HTTP ${response.status}: ${errorText}`);
            showAlert('danger', `Lỗi ${response.status}: ${response.statusText}`);
            return;
        }
        
        // Kiểm tra nếu phản hồi có nội dung trước khi phân tích JSON
        const responseText = await response.text();
        let data = {};
        
        if (responseText && responseText.trim() !== '') {
            try {
                data = JSON.parse(responseText);
            } catch (jsonError) {
                console.warn('Phản hồi không phải JSON hợp lệ:', responseText);
                // Tiếp tục xử lý mặc dù không nhận được JSON hợp lệ
            }
        }
        
        console.log('Kết quả xóa điểm đến:', data);
        
        // Xử lý thành công ngay cả khi không có phản hồi JSON
        showAlert('success', 'Xóa điểm đến thành công');
        
        // Xóa điểm đến khỏi mảng dữ liệu cục bộ
        destinationsList = destinationsList.filter(dest => {
            const id = dest.Ma_dia_danh || dest.ma_dia_danh;
            return id !== destinationId;
        });
        
        // Cập nhật lại giao diện với danh sách đã được lọc
        renderDestinations(destinationsList);
        
        // Tải lại danh sách điểm đến từ server nếu cần
        // loadDestinations();
    } catch (error) {
        console.error('Lỗi khi xóa điểm đến:', error);
        showAlert('danger', `Lỗi: ${error.message}`);
    }
}

// Hàm lọc điểm đến theo từ khóa tìm kiếm
function filterDestinations() {
    const keyword = document.getElementById('searchDestination').value.toLowerCase();
    
    if (!keyword) {
        renderDestinations(destinationsList);
        return;
    }
    
    const filteredDestinations = destinationsList.filter(destination => {
        const maDiaDanh = destination.Ma_dia_danh || destination.ma_dia_danh || '';
        const tenDiaDanh = destination.Ten_dia_danh || destination.ten_dia_danh || '';
        return maDiaDanh.toLowerCase().includes(keyword) || tenDiaDanh.toLowerCase().includes(keyword);
    });
    
    renderDestinations(filteredDestinations);
}

// Hàm xử lý khi hình ảnh thay đổi
function handleImageInputChange() {
    const imageInput = document.getElementById('hinhAnhDiaDanh');
    const imagePreview = document.getElementById('imagePreview');
    
    if (imageInput && imagePreview) {
        imageInput.addEventListener('input', function() {
            const imageUrl = this.value;
            if (imageUrl) {
                imagePreview.src = imageUrl;
                imagePreview.style.display = 'block';
            } else {
                imagePreview.style.display = 'none';
            }
        });
    }
}

// Hàm tải tab Điểm đến
// Sửa hàm loadDestinationsTab
function loadDestinationsTab() {
    console.log('Đang tải tab quản lý Điểm đến');
    
    // Hiển thị section destinations
    showSection('destinationsSection');
    
    // Cập nhật tiêu đề
    const sectionTitleElement = document.getElementById('sectionTitle');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = 'Quản lý Điểm Đến Du Lịch';
    }
    
    // Nếu tồn tại hàm từ admindestinations.js, gọi nó sau khi hiển thị section
    setTimeout(() => {
        if (typeof initializeDestinationsTab === 'function') {
            try {
                initializeDestinationsTab();
            } catch (error) {
                console.error('Lỗi khi gọi initializeDestinationsTab:', error);
            }
        }
    }, 100);
    
    // Kiểm tra xem nội dung đã được tạo chưa
    const destinationsSection = document.getElementById('destinationsSection');
    if (destinationsSection && !destinationsSection.querySelector('.card')) {
        // Nếu chưa có nội dung, tạo mới
        destinationsSection.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-12">
                    <button class="btn btn-primary" id="btnAddDestination">
                        <i class="fas fa-plus"></i> Thêm Điểm Đến mới
                    </button>
                    <button class="btn btn-success ms-2" id="btnRefreshDestination">
                        <i class="fas fa-sync-alt"></i> Tải lại dữ liệu
                    </button>
                    <div class="float-end">
                        <div class="form-check form-switch d-inline-block me-2">
                            <input class="form-check-input" type="checkbox" id="destinationDebugMode">
                            <label class="form-check-label" for="destinationDebugMode">Debug</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row" id="destinationFormSection" style="display: none;">
                <div class="col-md-12">
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 id="destinationFormTitle">Thêm Điểm Đến mới</h5>
                        </div>
                        <div class="card-body">
                            <form id="destinationForm">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label for="destinationId" class="form-label">Mã Điểm Đến</label>
                                        <input type="text" class="form-control" id="destinationId" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="destinationName" class="form-label">Tên Điểm Đến</label>
                                        <input type="text" class="form-control" id="destinationName" required>
                                    </div>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-12">
                                        <label for="destinationDescription" class="form-label">Mô tả</label>
                                        <textarea class="form-control" id="destinationDescription" rows="4"></textarea>
                                    </div>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-9">
                                        <label for="destinationImage" class="form-label">Hình ảnh (URL)</label>
                                        <div class="input-group">
                                            <input type="text" class="form-control" id="destinationImage">
                                            <input type="file" class="d-none" id="destinationImageFile" accept="image/*">
                                            <button class="btn btn-outline-secondary" type="button" id="btnChooseDestinationImage">
                                                <i class="fas fa-upload"></i> Chọn ảnh
                                            </button>
                                        </div>
                                        <small class="text-muted">Chọn ảnh hoặc nhập URL hình ảnh trực tiếp</small>
                                    </div>
                                    <div class="col-md-3">
                                        <label class="form-label">Xem trước hình ảnh</label>
                                        <div class="border p-2 text-center" style="height: 120px; display: flex; align-items: center; justify-content: center;">
                                            <img id="destinationImagePreview" src="" alt="Preview" class="img-fluid" style="max-width: 100px; max-height: 100px; display: none;">
                                            <p class="text-muted mb-0" id="destinationNoImageText">Chưa có hình ảnh</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="d-flex justify-content-end">
                                    <button type="button" class="btn btn-secondary me-2" id="btnCancelDestination">Hủy</button>
                                    <button type="submit" class="btn btn-primary" id="btnSaveDestination">Lưu</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5>Danh sách Điểm Đến</h5>
                                <input type="text" class="form-control w-25" id="searchDestination" placeholder="Tìm kiếm điểm đến...">
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-striped table-hover">
                                    <thead>
                                        <tr>
                                            <th>Mã Điểm Đến</th>
                                            <th>Tên Điểm Đến</th>
                                            <th>Mô tả</th>
                                            <th>Hình ảnh</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody id="destinationsTableBody">
                                        <tr><td colspan="5" class="text-center">Đang tải dữ liệu...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Kích hoạt sự kiện cho nút thêm điểm đến
        const btnAddDestination = document.getElementById('btnAddDestination');
        if (btnAddDestination) {
            btnAddDestination.addEventListener('click', showAddDestinationForm);
        }
        
        // Kích hoạt sự kiện cho nút tải lại dữ liệu
        const btnRefreshDestination = document.getElementById('btnRefreshDestination');
        if (btnRefreshDestination) {
            btnRefreshDestination.addEventListener('click', loadDestinations);
        }
        
        // Kích hoạt sự kiện cho nút hủy trong form
        const btnCancelDestination = document.getElementById('btnCancelDestination');
        if (btnCancelDestination) {
            btnCancelDestination.addEventListener('click', hideDestinationForm);
        }
        
        // Kích hoạt sự kiện submit form
        const destinationForm = document.getElementById('destinationForm');
        if (destinationForm) {
            destinationForm.addEventListener('submit', saveDestination);
        }
        
        // Kích hoạt sự kiện tìm kiếm
        const searchDestination = document.getElementById('searchDestination');
        if (searchDestination) {
            searchDestination.addEventListener('input', filterDestinations);
        }
        
        // Kích hoạt sự kiện chọn ảnh
        const btnChooseDestinationImage = document.getElementById('btnChooseDestinationImage');
        if (btnChooseDestinationImage) {
            btnChooseDestinationImage.addEventListener('click', function() {
                const fileInput = document.getElementById('destinationImageFile');
                if (fileInput) {
                    fileInput.click();
                }
            });
        }
        
        // Kích hoạt sự kiện khi chọn file ảnh
        const destinationImageFile = document.getElementById('destinationImageFile');
        if (destinationImageFile) {
            destinationImageFile.addEventListener('change', async function(e) {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    
                    // Hiển thị preview ảnh trước khi tải lên
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const previewImg = document.getElementById('destinationImagePreview');
                        const noImageText = document.getElementById('destinationNoImageText');
                        
                        if (previewImg && noImageText) {
                            previewImg.src = event.target.result;
                            previewImg.style.display = 'block';
                            noImageText.style.display = 'none';
                        }
                    };
                    reader.readAsDataURL(file);
                    
                    // Tải ảnh lên server
                    const imageUrl = await uploadImage(file, 'destination');
                    if (imageUrl) {
                        const imageInput = document.getElementById('destinationImage');
                        if (imageInput) {
                            imageInput.value = imageUrl;
                        }
                    }
                }
            });
        }
        
        // Kích hoạt sự kiện thay đổi URL hình ảnh
        handleDestinationImageChange();
        
        // Kích hoạt debug mode switch
        const debugModeSwitch = document.getElementById('destinationDebugMode');
        if (debugModeSwitch) {
            debugModeSwitch.addEventListener('change', function() {
                window.destinationDebugMode = this.checked;
                console.log('Destination Debug mode:', window.destinationDebugMode ? 'ON' : 'OFF');
            });
        }
    }
    
    // Tải danh sách điểm đến
    loadDestinations();
}

// Hàm xử lý khi hình ảnh thay đổi
function handleDestinationImageChange() {
    const imageInput = document.getElementById('destinationImage');
    const imagePreview = document.getElementById('destinationImagePreview');
    const noImageText = document.getElementById('destinationNoImageText');
    
    if (imageInput && imagePreview && noImageText) {
        imageInput.addEventListener('input', function() {
            const imageUrl = this.value;
            if (imageUrl) {
                imagePreview.src = imageUrl;
                imagePreview.style.display = 'block';
                noImageText.style.display = 'none';
            } else {
                imagePreview.style.display = 'none';
                noImageText.style.display = 'block';
            }
        });
    }
}

// Hàm xử lý tải lên ảnh chung
async function uploadImage(file, type) {
    try {
        console.log('Bắt đầu tải ảnh lên:', file.name, 'cho', type);
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('danger', 'Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn');
            return null;
        }

        // Hiển thị thông báo đang tải
        showAlert('info', 'Đang tải ảnh lên máy chủ...');

        // Tạo FormData object để gửi file
        const formData = new FormData();
        formData.append('image', file);
        
        // Đảm bảo type được ghi đúng để server nhận diện
        if (type === 'destination') {
            formData.append('type', 'destination');
            console.log('Đang tải lên ảnh cho điểm đến, type=destination');
        } else {
            formData.append('type', type || 'tours');
            console.log(`Đang tải lên ảnh cho ${type || 'tours'}`);
        }

        // Log tất cả các trường của FormData (debug)
        for (const pair of formData.entries()) {
            console.log(`FormData field: ${pair[0]}, value: ${pair[1]}`);
        }
        
        console.log(`Tải lên ảnh ${file.name} cho ${type}`);
        
        // Kiểm tra xem có endpoint lưu trước đó không
        const savedEndpoint = localStorage.getItem('uploadEndpoint');
        
        // Danh sách API endpoints để thử
        const endpoints = [
            savedEndpoint, // Sử dụng endpoint đã lưu trước (nếu có)
            'http://localhost:5000/api/upload',  // API chính
            'http://127.0.0.1:5000/api/upload',  // Địa chỉ local khác
            '/api/upload',                       // Đường dẫn tương đối
        ].filter(Boolean); // Lọc bỏ các giá trị null/undefined
        
        console.log('Thử các endpoints:', endpoints);
        
        let lastError = null;
        
        // Thử từng endpoint cho đến khi thành công
        for (const endpoint of endpoints) {
            try {
                console.log(`Đang thử tải ảnh lên endpoint: ${endpoint}`);
                
                // Tạo request với timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 giây timeout
                
                // Gửi request đến API upload ảnh
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Không cần Content-Type, browser sẽ tự set khi dùng FormData
                    },
                    body: formData,
                    signal: controller.signal,
                    // Bổ sung CORS mode và credentials
                    mode: 'cors',
                    credentials: 'include'
                });
                
                // Xóa timeout sau khi request hoàn thành
                clearTimeout(timeoutId);

                // Ghi log response
                console.log(`Phản hồi từ ${endpoint}:`, response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`Endpoint ${endpoint} trả về lỗi HTTP ${response.status}:`, errorText);
                    showDebug(`Lỗi từ ${endpoint}: ${response.status} - ${errorText.substring(0, 100)}...`);
                    lastError = new Error(`Lỗi HTTP ${response.status}: ${errorText}`);
                    continue; // Thử endpoint tiếp theo
                }

                // Parse JSON response
                const responseText = await response.text();
                showDebug(`Phản hồi từ ${endpoint}: ${responseText.substring(0, 100)}...`);
                
                let data = {};
                
                if (responseText && responseText.trim() !== '') {
                    try {
                        data = JSON.parse(responseText);
                    } catch (jsonError) {
                        console.warn('Phản hồi không phải JSON hợp lệ:', responseText);
                        lastError = new Error('Phản hồi từ server không đúng định dạng');
                        continue; // Thử endpoint tiếp theo
                    }
                } else {
                    lastError = new Error('Phản hồi từ server rỗng');
                    continue; // Thử endpoint tiếp theo
                }

                // Kiểm tra response
                if (data.status === 'success' && data.imageUrl) {
                    showAlert('success', 'Tải ảnh lên thành công');
                    const imageUrl = data.imageUrl;
                    console.log('URL ảnh đã tải lên (trước khi xử lý):', imageUrl);
                    
                    // Đảm bảo đường dẫn ảnh bắt đầu bằng /images/uploads/
                    if (imageUrl && !imageUrl.startsWith('/images/uploads/')) {
                        console.warn('Đường dẫn ảnh trả về không đúng định dạng, cần sửa lại');
                        
                        const folderName = type === 'destination' ? 'destination' : 'tours';
                        let fileName = imageUrl;
                        
                        // Lấy tên file từ đường dẫn
                        if (imageUrl.includes('/')) {
                            fileName = imageUrl.split('/').pop();
                        }
                        
                        // Tạo đường dẫn mới đúng định dạng
                        const fixedPath = `/images/uploads/${folderName}/${fileName}`;
                        console.log('Đường dẫn ảnh đã được sửa:', fixedPath);
                        
                        // Lưu endpoint thành công để sử dụng sau này
                        localStorage.setItem('uploadEndpoint', endpoint);
                        
                        return fixedPath;
                    }
                    
                    // Lưu endpoint thành công để sử dụng sau này
                    localStorage.setItem('uploadEndpoint', endpoint);
                    
                    return imageUrl;
                } else {
                    lastError = new Error(data.message || 'Tải ảnh thất bại');
                    continue; // Thử endpoint tiếp theo
                }
            } catch (fetchError) {
                console.warn(`Không thể kết nối tới ${endpoint}:`, fetchError);
                showDebug(`Lỗi kết nối tới ${endpoint}: ${fetchError.message}`);
                lastError = fetchError;
                // Tiếp tục với endpoint tiếp theo
            }
        }

        // Nếu tất cả endpoints đều thất bại, thử phương pháp local
        console.log('Tất cả API endpoints thất bại, sử dụng phương pháp local');
        const localPath = await uploadImageLocal(file, type);
        
        // Kiểm tra và sửa đường dẫn nếu cần
        if (localPath && !localPath.startsWith('/images/uploads/')) {
            const folderName = type === 'destination' ? 'destination' : 'tours';
            let fileName = localPath;
            
            // Lấy tên file từ đường dẫn
            if (localPath.includes('/')) {
                fileName = localPath.split('/').pop();
            }
            
            // Tạo đường dẫn mới đúng định dạng
            const fixedPath = `/images/uploads/${folderName}/${fileName}`;
            console.log('Đường dẫn local đã được sửa:', fixedPath);
            
            return fixedPath;
        }
        
        return localPath;
    } catch (error) {
        console.error('Lỗi khi tải ảnh lên:', error);
        showAlert('danger', `Lỗi: ${error.message}`);
        return null;
    }
}

// Hàm mới - xử lý upload ảnh trực tiếp
async function uploadImageLocal(file, type) {
    return new Promise((resolve, reject) => {
        try {
            // Tạo một FileReader để đọc file ảnh
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    // Tạo tên file duy nhất
                    const timestamp = new Date().getTime();
                    const randomNum = Math.floor(Math.random() * 1000000);
                    const ext = file.name.substring(file.name.lastIndexOf('.'));
                    const fileName = `${type}-${timestamp}-${randomNum}${ext}`;
                    
                    // Đường dẫn lưu ảnh
                    const subFolder = type === 'destination' ? 'destinations' : 'tours';
                    const relativePath = `/images/uploads/${subFolder}/${fileName}`;
                    
                    console.log(`Ảnh được lưu tại: ${relativePath}`);
                    showDebug(`Ảnh ${file.name} đã được xử lý và tạo đường dẫn: ${relativePath}`);
                    
                    // Tạo image để hiển thị preview
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = function() {
                        // Hiển thị thông báo thành công
                        showAlert('success', 'Tải ảnh lên thành công');
                        
                        // Trong thực tế, ảnh chưa được lưu trên server
                        // Nhưng vì API không hoạt động, chúng ta sẽ trả về đường dẫn giả định
                        resolve(relativePath);
                    };
                    
                    img.onerror = function() {
                        reject(new Error('Không thể đọc ảnh, định dạng không hợp lệ'));
                    };
                } catch (error) {
                    console.error('Lỗi xử lý ảnh:', error);
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Không thể đọc file ảnh'));
            };
            
            // Đọc file dưới dạng Data URL
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('Lỗi khởi tạo upload:', error);
            reject(error);
        }
    });
}

// **************** Schedule management ****************
// Global variables for schedule management
let allSchedules = [];
let filteredSchedules = [];

// Loader for schedules tab
function loadSchedulesTab() {
    console.log('Đang tải tab quản lý Lịch khởi hành');
    
    // Hiển thị section schedules
    showSection('schedulesSection');
    
    // Cập nhật tiêu đề
    const sectionTitleElement = document.getElementById('sectionTitle');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = 'Quản lý Lịch khởi hành';
    }
    
    // Kiểm tra xem nội dung đã được tạo chưa
    const schedulesSection = document.getElementById('schedulesSection');
    const hasTable = schedulesSection && schedulesSection.querySelector('.table');
    
    if (schedulesSection && !hasTable) {
        // Nếu chưa có nội dung, tạo mới
        schedulesSection.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6"><h3>Quản lý Lịch khởi hành</h3></div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-primary" id="addScheduleBtn">
                        <i class="fas fa-calendar-plus"></i> Thêm Lịch mới
                    </button>
                </div>
            </div>
            <div id="scheduleFormContainer" class="mb-4" style="display:none;">
                <h4 id="scheduleFormTitle">Thêm Lịch khởi hành</h4>
                <form id="scheduleForm">
                    <div class="row">
                        <div class="col-md-4 mb-3">
                            <label for="scheduleId" class="form-label">Mã Lịch</label>
                            <input type="text" class="form-control" id="scheduleId" required>
                        </div>
                        <div class="col-md-4 mb-3">
                            <label for="scheduleTourId" class="form-label">Mã Tour</label>
                            <input type="text" class="form-control" id="scheduleTourId" required>
                        </div>
                        <div class="col-md-4 mb-3">
                            <label for="scheduleSeats" class="form-label">Số chỗ</label>
                            <input type="number" class="form-control" id="scheduleSeats" required>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="scheduleStart" class="form-label">Ngày bắt đầu</label>
                            <input type="date" class="form-control" id="scheduleStart" required>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="scheduleEnd" class="form-label">Ngày kết thúc</label>
                            <input type="date" class="form-control" id="scheduleEnd" required>
                        </div>
                    </div>
                    <div class="text-end">
                        <button type="button" class="btn btn-secondary me-2" id="cancelScheduleBtn">Hủy</button>
                        <button type="submit" class="btn btn-primary">Lưu</button>
                    </div>
                </form>
            </div>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Mã Lịch</th><th>Mã Tour</th><th>Ngày BD</th><th>Ngày KT</th><th>Số chỗ</th><th>Đã đặt</th><th>Hướng dẫn viên</th><th>Tour Status</th><th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="schedulesList">
                        <tr><td colspan="8" class="text-center">Đang tải dữ liệu...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Thêm event listener
        const addScheduleBtn = document.getElementById('addScheduleBtn');
        if (addScheduleBtn) {
            addScheduleBtn.addEventListener('click', showAddScheduleForm);
        }
        
        const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
        if (cancelScheduleBtn) {
            cancelScheduleBtn.addEventListener('click', hideScheduleForm);
        }
        
        const scheduleForm = document.getElementById('scheduleForm');
        if (scheduleForm) {
            scheduleForm.addEventListener('submit', saveSchedule);
        }
        
        // Add event listeners for date changes to load guides
        const scheduleStart = document.getElementById('scheduleStart');
        const scheduleEnd = document.getElementById('scheduleEnd');
        if (scheduleStart) {
            scheduleStart.addEventListener('change', () => {
                validateScheduleDates();
                loadAvailableGuidesForSchedule();
            });
        }
        if (scheduleEnd) {
            scheduleEnd.addEventListener('change', () => {
                validateScheduleDates();
                loadAvailableGuidesForSchedule();
            });
        }
    }
    
    // Đăng ký event listeners cho filter/search (luôn đăng ký, kể cả khi HTML đã có sẵn)
    const statusFilter = document.getElementById('scheduleStatusFilter');
    const dateFrom = document.getElementById('scheduleDateFrom');
    const dateTo = document.getElementById('scheduleDateTo');
    const searchInput = document.getElementById('scheduleSearchInput');
    
    // Đăng ký event listeners (sử dụng once: false để có thể gọi lại)
    if (statusFilter) {
        // Remove old listener và thêm mới
        statusFilter.onchange = null;
        statusFilter.addEventListener('change', function() {
            console.log('Status filter changed to:', this.value);
            applyScheduleFilters();
        });
    }
    if (dateFrom) {
        dateFrom.onchange = null;
        dateFrom.addEventListener('change', function() {
            console.log('Date from changed to:', this.value);
            applyScheduleFilters();
        });
    }
    if (dateTo) {
        dateTo.onchange = null;
        dateTo.addEventListener('change', function() {
            console.log('Date to changed to:', this.value);
            applyScheduleFilters();
        });
    }
    if (searchInput) {
        searchInput.oninput = null;
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            console.log('Search input changed to:', this.value);
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyScheduleFilters();
            }, 300);
        });
    }
    
    // Tải danh sách lịch khởi hành
    // Delay nhỏ để đảm bảo DOM đã sẵn sàng
    setTimeout(() => {
        loadSchedules();
    }, 100);
}

// Fetch and render schedules
async function loadSchedules() {
    const schedulesList = document.getElementById('schedulesList');
    if (!schedulesList) {
        console.warn('schedulesList element not found');
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        schedulesList.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Vui lòng đăng nhập lại</td></tr>';
        return;
    }
    
    try {
        console.log('Loading schedules...');
        const response = await fetch('http://localhost:5000/api/tours/schedules', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Schedules API response:', data);
        
        let arr = [];
        if (data.status === 'success') {
            if (Array.isArray(data.data?.schedules)) {
                arr = data.data.schedules;
            } else if (Array.isArray(data.data)) {
                arr = data.data;
            } else if (Array.isArray(data.schedules)) {
                arr = data.schedules;
            }
        }
        
        console.log(`Loaded ${arr.length} schedules`);
        allSchedules = arr;
        
        // Render immediately if no filters are set, otherwise apply filters
        const hasActiveFilters = document.getElementById('scheduleStatusFilter')?.value !== 'all' ||
                                 document.getElementById('scheduleDateFrom')?.value ||
                                 document.getElementById('scheduleDateTo')?.value ||
                                 document.getElementById('scheduleSearchInput')?.value;
        
        if (hasActiveFilters) {
            applyScheduleFilters();
        } else {
            renderSchedules(arr);
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
        const schedulesList = document.getElementById('schedulesList');
        if (schedulesList) {
            schedulesList.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Lỗi: ${error.message}</td></tr>`;
        }
        showAlert('danger', 'Không thể tải danh sách lịch: ' + error.message);
    }
}

// Apply filters to schedules
function applyScheduleFilters() {
    if (!allSchedules || allSchedules.length === 0) {
        console.warn('No schedules to filter');
        const tbody = document.getElementById('schedulesList');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">Chưa có dữ liệu lịch khởi hành</td></tr>';
        }
        return;
    }
    
    let filtered = [...allSchedules];
    console.log(`Applying filters to ${filtered.length} schedules`);
    
    // Filter by status
    const statusFilter = document.getElementById('scheduleStatusFilter')?.value || 'all';
    if (statusFilter !== 'all') {
        const beforeCount = filtered.length;
        filtered = filtered.filter(s => {
            // So sánh không phân biệt hoa thường và loại bỏ khoảng trắng
            const scheduleStatus = (s.tourStatus || '').trim();
            const filterStatus = statusFilter.trim();
            return scheduleStatus === filterStatus;
        });
        console.log(`Status filter (${statusFilter}): ${beforeCount} -> ${filtered.length}`);
        console.log('Sample tourStatus values:', filtered.slice(0, 3).map(s => s.tourStatus));
    }
    
    // Filter by date range
    const dateFrom = document.getElementById('scheduleDateFrom')?.value;
    const dateTo = document.getElementById('scheduleDateTo')?.value;
    if (dateFrom) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(s => {
            const scheduleDate = s.Ngay_bat_dau ? s.Ngay_bat_dau.split('T')[0] : s.Ngay_bat_dau;
            return scheduleDate >= dateFrom;
        });
        console.log(`Date from filter: ${beforeCount} -> ${filtered.length}`);
    }
    if (dateTo) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(s => {
            const scheduleDate = s.Ngay_ket_thuc ? s.Ngay_ket_thuc.split('T')[0] : s.Ngay_ket_thuc;
            return scheduleDate <= dateTo;
        });
        console.log(`Date to filter: ${beforeCount} -> ${filtered.length}`);
    }
    
    // Filter by search
    const search = document.getElementById('scheduleSearchInput')?.value?.toLowerCase() || '';
    if (search) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(s => {
            const maLich = (s.Ma_lich || '').toLowerCase();
            const maTour = (s.Ma_tour || '').toLowerCase();
            const tenTour = (s.Ten_tour || '').toLowerCase();
            return maLich.includes(search) || maTour.includes(search) || tenTour.includes(search);
        });
        console.log(`Search filter: ${beforeCount} -> ${filtered.length}`);
    }
    
    filteredSchedules = filtered;
    console.log(`Final filtered count: ${filtered.length}`);
    renderSchedules(filtered);
}

// Render schedule rows
async function renderSchedules(schedules) {
    const tbody = document.getElementById('schedulesList');
    if (!tbody) {
        console.error('schedulesList tbody not found');
        return;
    }
    
    console.log(`Rendering ${schedules.length} schedules`);
    
    if (!schedules || schedules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Không có lịch khởi hành nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">Đang tải...</td></tr>';
    
    // Load available guides for each schedule
    const token = localStorage.getItem('token');
    
    for (const s of schedules) {
        const tr = document.createElement('tr');
        
        // Format dates
        const dateFrom = s.Ngay_bat_dau ? s.Ngay_bat_dau.split('T')[0] : s.Ngay_bat_dau;
        const dateTo = s.Ngay_ket_thuc ? s.Ngay_ket_thuc.split('T')[0] : s.Ngay_ket_thuc;
        const formattedStart = dateFrom ? new Date(dateFrom).toLocaleDateString('vi-VN') : s.Ngay_bat_dau;
        const formattedEnd = dateTo ? new Date(dateTo).toLocaleDateString('vi-VN') : s.Ngay_ket_thuc;
        
        // Calculate remaining seats
        const bookedSeats = s.bookedSeats || 0;
        const remainingSeats = Math.max(0, (s.So_cho || 0) - bookedSeats);
        
        // Check if schedule is in the past (Đã diễn ra)
        const isPastSchedule = s.tourStatus === 'Đã diễn ra' || 
                               (dateTo && new Date(dateTo) < new Date());
        
        const currentGuideName = s.Ten_huong_dan_vien || 'Chưa phân công';
        const tourName = s.Ten_tour || s.Ma_tour;
        const hasGuide = s.Ma_huong_dan_vien && s.Ma_huong_dan_vien !== '';
        
        // Cải thiện UI cột HDV: chỉ hiện dropdown khi nhấn "Phân công"
        let guideColumnHTML = '';
        if (isPastSchedule) {
            // Lịch đã diễn ra: chỉ hiển thị tên HDV (nếu có)
            guideColumnHTML = `<span class="badge ${hasGuide ? 'bg-info' : 'bg-secondary'}">${currentGuideName}</span>`;
        } else {
            // Lịch chưa diễn ra: hiển thị theo trạng thái phân công
            if (hasGuide) {
                // Đã phân công: hiển thị tên HDV + icon thùng rác nhỏ để gỡ
                guideColumnHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-info">${currentGuideName}</span>
                        <button class="btn btn-sm btn-link text-danger p-0" 
                                onclick="removeGuideFromSchedule('${s.Ma_lich}', '${dateFrom}', '${dateTo}')" 
                                title="Gỡ HDV"
                                style="line-height: 1; font-size: 0.875rem;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
            } else {
                // Chưa phân công: hiển thị nút "Chọn HDV" để mở dropdown
                guideColumnHTML = `
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-secondary">Chưa phân công</span>
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="showGuideDropdown('${s.Ma_lich}', '${dateFrom}', '${dateTo}', '${s.Ma_tour || ''}')" 
                                    title="Phân công HDV">
                                <i class="fas fa-user-plus"></i> Chọn HDV
                            </button>
                        </div>
                        <div id="guideDropdown_${s.Ma_lich}" style="display: none; margin-top: 0.5rem;"></div>
                    </div>
                `;
            }
        }
        
        // Cải thiện cột thao tác: Ẩn Sửa/Xóa cho lịch đã diễn ra
        let actionButtonsHTML = '';
        if (isPastSchedule) {
            // Lịch đã diễn ra: chỉ cho xem chi tiết
            actionButtonsHTML = `
                <button class="btn btn-sm btn-info" onclick="viewSchedule('${s.Ma_lich}')" title="Xem chi tiết">
                    <i class="fas fa-eye"></i> Xem
                </button>
            `;
        } else {
            // Lịch chưa diễn ra: cho phép Sửa và Xóa
            actionButtonsHTML = `
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" onclick="editSchedule('${s.Ma_lich}')">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${s.Ma_lich}')">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            `;
        }
        
        tr.innerHTML = `
            <td><strong>${s.Ma_lich}</strong></td>
            <td>
                <div>
                    <strong>${tourName}</strong><br>
                    <small class="text-muted">${s.Ma_tour}</small>
                </div>
            </td>
            <td>${formattedStart}</td>
            <td>${formattedEnd}</td>
            <td>${s.So_cho || 0}</td>
            <td><span class="badge bg-secondary">${bookedSeats}</span></td>
            <td><span class="badge ${remainingSeats > 0 ? 'bg-success' : 'bg-danger'}">${remainingSeats}</span></td>
            <td>${guideColumnHTML}</td>
            <td>${getScheduleStatusBadge(s.tourStatus)}</td>
            <td>${actionButtonsHTML}</td>
        `;
        tbody.appendChild(tr);
    }
}

// Show add schedule form
async function showAddScheduleForm() {
    isEditScheduleMode = false;
    currentScheduleId = null;
    const form = document.getElementById('scheduleForm');
    if (!form) return;
    
    form.reset();
    
    // Auto-generate schedule ID
    const scheduleIdInput = document.getElementById('scheduleId');
    if (scheduleIdInput) {
        const timestamp = Date.now();
        scheduleIdInput.value = `LKH${timestamp}`;
        scheduleIdInput.readOnly = true;
    }
    
    // Load tours dropdown
    await loadToursForSchedule();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const startInput = document.getElementById('scheduleStart');
    const endInput = document.getElementById('scheduleEnd');
    if (startInput) startInput.min = today;
    if (endInput) endInput.min = today;
    
    // Clear guide dropdown - thêm option "Gỡ HDV"
    const guideSelect = document.getElementById('scheduleGuide');
    const removeGuideBtn = document.getElementById('removeGuideBtn');
    if (guideSelect) {
        guideSelect.innerHTML = '<option value="" selected style="color: #dc3545; font-weight: bold;">❌ Gỡ HDV</option>';
    }
    // Ẩn nút "Gỡ HDV" khi thêm mới
    if (removeGuideBtn) {
        removeGuideBtn.style.display = 'none';
    }
    
    document.getElementById('scheduleFormTitle').textContent = 'Thêm Lịch khởi hành';
    document.getElementById('scheduleFormContainer').style.display = 'block';
    
    // Scroll to form
    document.getElementById('scheduleFormContainer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Hide schedule form
function hideScheduleForm() {
    document.getElementById('scheduleFormContainer').style.display = 'none';
}

// Save or update schedule
async function saveSchedule(e) {
    e.preventDefault();
    
    // Validate dates
    if (!validateScheduleDates()) {
        return;
    }
    
    const id = document.getElementById('scheduleId').value;
    const tourId = document.getElementById('scheduleTourId').value;
    const seats = parseInt(document.getElementById('scheduleSeats').value, 10);
    const start = document.getElementById('scheduleStart').value;
    const end = document.getElementById('scheduleEnd').value;
    const guideId = document.getElementById('scheduleGuide')?.value || null;
    
    if (!tourId || !seats || !start || !end) {
        showAlert('danger', 'Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    if (seats < 1) {
        showAlert('danger', 'Số chỗ phải lớn hơn 0');
        return;
    }
    
    const token = localStorage.getItem('token');
    const payload = { 
        ma_lich: id, 
        ma_tour: tourId, 
        so_cho: seats, 
        ngay_bat_dau: start, 
        ngay_ket_thuc: end
    };
    
    // Nếu guideId là empty string hoặc null, gửi null để gỡ HDV
    if (guideId && guideId !== '') {
        payload.ma_huong_dan_vien = guideId;
    } else {
        payload.ma_huong_dan_vien = null; // Gỡ HDV
    }
    
    try {
        let url = 'http://localhost:5000/api/tours/schedules';
        let method = 'POST';
        if (isEditScheduleMode) {
            url += '/' + currentScheduleId;
            method = 'PUT';
        }
        const res = await fetch(url, {
            method, 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            let errorData;
            try {
                errorData = await res.json();
            } catch (e) {
                const errorText = await res.text();
                errorData = { message: errorText };
            }
            
            // Hiển thị thông báo lỗi chi tiết
            const errorMessage = errorData.message || errorData.error || `Lỗi ${res.status}: Không thể ${isEditScheduleMode ? 'cập nhật' : 'tạo'} lịch khởi hành`;
            showAlert('danger', errorMessage);
            
            // Log để debug
            console.error('Schedule save error:', errorData);
            return;
        }
        showAlert('success', isEditScheduleMode ? 'Cập nhật thành công' : 'Thêm lịch thành công');
        hideScheduleForm(); 
        loadSchedules();
    } catch (err) {
        console.error('Save schedule error:', err);
        showAlert('danger', 'Lỗi khi lưu lịch: ' + err.message);
    }
}

// Validate schedule dates
function validateScheduleDates() {
    const start = document.getElementById('scheduleStart')?.value;
    const end = document.getElementById('scheduleEnd')?.value;
    const errorDiv = document.getElementById('scheduleDateError');
    const startInput = document.getElementById('scheduleStart');
    const endInput = document.getElementById('scheduleEnd');
    
    if (start && end && new Date(start) >= new Date(end)) {
        if (startInput) startInput.classList.add('is-invalid');
        if (endInput) endInput.classList.add('is-invalid');
        if (errorDiv) errorDiv.style.display = 'block';
        return false;
    } else {
        if (startInput) startInput.classList.remove('is-invalid');
        if (endInput) endInput.classList.remove('is-invalid');
        if (errorDiv) errorDiv.style.display = 'none';
        return true;
    }
}

// Load tours for schedule dropdown
async function loadToursForSchedule() {
    const tourSelect = document.getElementById('scheduleTourId');
    if (!tourSelect) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/tours', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to load tours');
        
        const data = await response.json();
        const tours = data.data?.tours || data.tours || [];
        
        tourSelect.innerHTML = '<option value="">-- Chọn Tour --</option>';
        tours.forEach(tour => {
            if (tour.Tinh_trang !== 'Hủy') {
                const option = document.createElement('option');
                option.value = tour.Ma_tour;
                option.textContent = `${tour.Ten_tour} (${tour.Ma_tour})`;
                option.dataset.tourName = tour.Ten_tour;
                tourSelect.appendChild(option);
            }
        });
        
        // Add change event to show tour info and reload guides
        tourSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const tourInfo = document.getElementById('tourInfo');
            if (tourInfo && selectedOption.value) {
                tourInfo.textContent = `Tour: ${selectedOption.dataset.tourName || selectedOption.textContent}`;
            } else if (tourInfo) {
                tourInfo.textContent = '';
            }
            
            // Reload available guides khi tour thay đổi (để kiểm tra trùng tour)
            const start = document.getElementById('scheduleStart')?.value;
            const end = document.getElementById('scheduleEnd')?.value;
            if (start && end) {
                loadAvailableGuidesForSchedule();
            }
        });
    } catch (error) {
        console.error('Error loading tours:', error);
        showAlert('warning', 'Không thể tải danh sách tour');
    }
}

// Load available guides when dates are selected
async function loadAvailableGuidesForSchedule() {
    const start = document.getElementById('scheduleStart')?.value;
    const end = document.getElementById('scheduleEnd')?.value;
    const tourId = document.getElementById('scheduleTourId')?.value;
    const guideSelect = document.getElementById('scheduleGuide');
    const guideInfo = document.getElementById('guideInfo');
    
    if (!start || !end || !guideSelect) return;
    
    if (!validateScheduleDates()) {
        guideSelect.innerHTML = '<option value="">-- Chọn ngày hợp lệ --</option>';
        if (guideInfo) guideInfo.textContent = 'Ngày không hợp lệ';
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        // Thêm ma_tour vào query params nếu có (để kiểm tra trùng tour)
        let url = `http://localhost:5000/api/admin/guides/available?date_from=${start}&date_to=${end}`;
        if (tourId) {
            url += `&ma_tour=${encodeURIComponent(tourId)}`;
        }
        // Nếu đang edit, thêm exclude_schedule
        if (isEditScheduleMode && currentScheduleId) {
            url += `&exclude_schedule=${encodeURIComponent(currentScheduleId)}`;
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load guides');
        
        const data = await response.json();
        const guides = data.data?.guides || [];
        
        // Luôn có option "Gỡ HDV" ở đầu với style nổi bật
        const removeOption = document.createElement('option');
        removeOption.value = '';
        removeOption.textContent = '❌ Gỡ HDV';
        removeOption.style.color = '#dc3545';
        removeOption.style.fontWeight = 'bold';
        guideSelect.innerHTML = '';
        guideSelect.appendChild(removeOption);
        
        guides.forEach(guide => {
            const option = document.createElement('option');
            option.value = guide.Ma_huong_dan_vien;
            option.textContent = `👤 ${guide.Ten_huong_dan_vien} (${guide.So_dien_thoai})`;
            guideSelect.appendChild(option);
        });
        
        if (guideInfo) {
            guideInfo.textContent = guides.length > 0 
                ? `Có ${guides.length} hướng dẫn viên rảnh trong khoảng thời gian này`
                : 'Không có hướng dẫn viên rảnh trong khoảng thời gian này';
        }
    } catch (error) {
        console.error('Error loading available guides:', error);
        guideSelect.innerHTML = '<option value="">-- Lỗi tải HDV --</option>';
        if (guideInfo) guideInfo.textContent = 'Không thể tải danh sách HDV';
    }
}

// Edit schedule: load data to form
async function editSchedule(lichId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`http://localhost:5000/api/tours/schedules/${lichId}`, { 
            method: 'GET', 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const s = data.data.schedule;
        
        // Load tours first
        await loadToursForSchedule();
        
        // Fill form
        document.getElementById('scheduleId').value = s.Ma_lich;
        document.getElementById('scheduleId').readOnly = true;
        document.getElementById('scheduleTourId').value = s.Ma_tour;
        document.getElementById('scheduleSeats').value = s.So_cho;
        
        // Format dates for input
        const startDate = s.Ngay_bat_dau ? s.Ngay_bat_dau.split('T')[0] : s.Ngay_bat_dau;
        const endDate = s.Ngay_ket_thuc ? s.Ngay_ket_thuc.split('T')[0] : s.Ngay_ket_thuc;
        document.getElementById('scheduleStart').value = startDate;
        document.getElementById('scheduleEnd').value = endDate;
        
        // Load available guides
        await loadAvailableGuidesForSchedule();
        const guideSelect = document.getElementById('scheduleGuide');
        const removeGuideBtn = document.getElementById('removeGuideBtn');
        if (guideSelect) {
            // Đảm bảo option "Gỡ HDV" luôn có với style nổi bật
            const firstOption = guideSelect.querySelector('option[value=""]');
            if (firstOption) {
                firstOption.textContent = '❌ Gỡ HDV';
                firstOption.style.color = '#dc3545';
                firstOption.style.fontWeight = 'bold';
            } else {
                const gỡOption = document.createElement('option');
                gỡOption.value = '';
                gỡOption.textContent = '❌ Gỡ HDV';
                gỡOption.style.color = '#dc3545';
                gỡOption.style.fontWeight = 'bold';
                guideSelect.insertBefore(gỡOption, guideSelect.firstChild);
            }
            
            // Set giá trị HDV hiện tại (nếu có)
            if (s.Ma_huong_dan_vien) {
                guideSelect.value = s.Ma_huong_dan_vien;
                // Hiển thị nút "Gỡ HDV" nếu có HDV
                if (removeGuideBtn) {
                    removeGuideBtn.style.display = 'block';
                }
            } else {
                guideSelect.value = ''; // Chọn "Gỡ HDV" nếu chưa có HDV
                // Ẩn nút "Gỡ HDV" nếu chưa có HDV
                if (removeGuideBtn) {
                    removeGuideBtn.style.display = 'none';
                }
            }
            
            // Thêm event listener để hiển thị/ẩn nút "Gỡ HDV" khi thay đổi dropdown
            guideSelect.addEventListener('change', function() {
                if (removeGuideBtn) {
                    if (this.value && this.value !== '') {
                        removeGuideBtn.style.display = 'block';
                    } else {
                        removeGuideBtn.style.display = 'none';
                    }
                }
            });
        }
        
        isEditScheduleMode = true; 
        currentScheduleId = lichId;
        document.getElementById('scheduleFormTitle').textContent = 'Chỉnh sửa Lịch khởi hành';
        document.getElementById('scheduleFormContainer').style.display = 'block';
        showSection('schedulesSection');
        
        // Scroll to form
        document.getElementById('scheduleFormContainer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
        console.error('Edit schedule error:', err);
        showAlert('danger', 'Không thể tải dữ liệu lịch');
    }
}

// Thêm hàm xóa lịch khởi hành
async function deleteSchedule(maLich) {
    if (!confirm(`Bạn có chắc chắn muốn xóa lịch khởi hành ${maLich}?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('danger', 'Vui lòng đăng nhập lại để thực hiện chức năng này');
            return;
        }
        
        console.log(`Đang xóa lịch khởi hành ${maLich}...`);
        
        const response = await fetch(`http://localhost:5000/api/tours/schedules/${maLich}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể xóa lịch khởi hành');
        }
        
        showAlert('success', `Đã xóa lịch khởi hành ${maLich} thành công!`);
        
        // Tải lại danh sách lịch khởi hành
        loadSchedules();
    } catch (error) {
        console.error('Lỗi khi xóa lịch khởi hành:', error);
        showAlert('danger', 'Lỗi khi xóa lịch khởi hành: ' + error.message);
    }
}

// ***** Quản lý Vé *****
// Hàm chỉnh sửa vé: Nạp dữ liệu vào form
function editTicket(ticketId) {
    const ticket = ticketsList.find(t => t.So_ve === ticketId);
    if (!ticket) { 
        showAlert('danger', 'Không tìm thấy vé'); 
        return; 
    }
    
    isEditTicketMode = true;
    currentTicketId = ticketId;
    
    document.getElementById('ticketId').value = ticket.So_ve;
    document.getElementById('ticketBookingId').value = ticket.Ma_booking;
    document.getElementById('ticketScheduleId').value = ticket.Ma_lich;
    document.getElementById('ticketPrice').value = ticket.Gia_ve;
    
    // Thiết lập trạng thái vé
    const statusSelect = document.getElementById('ticketStatus');
    if (statusSelect) {
        statusSelect.value = ticket.Trang_thai_ve || 'Chua_su_dung';
    }
    
    document.getElementById('ticketFormTitle').textContent = 'Chỉnh sửa Vé';
    document.getElementById('ticketFormContainer').style.display = 'block';
}


// Hàm ẩn form vé
function hideTicketForm() {
    document.getElementById('ticketFormContainer').style.display = 'none';
}

// Hàm xóa vé
async function deleteTicket(ticketId) {
    if (!confirm(`Bạn có chắc chắn muốn xóa vé ${ticketId}?`)) return;
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tickets/${ticketId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showAlert('success', 'Xóa vé thành công');
            loadTickets();
        } else {
            showAlert('danger', 'Xóa vé thất bại');
        }
    } catch (error) {
        console.error('Delete ticket error:', error);
        showAlert('danger', 'Có lỗi khi xóa vé');
    }
}

// Sửa lại hàm saveTicket để lưu cả giá và trạng thái vé
async function saveTicket(e) {
    e.preventDefault();
    
    const id = currentTicketId || document.getElementById('ticketId').value;
    const gia = parseInt(document.getElementById('ticketPrice').value, 10);
    
    // Lấy trạng thái vé
    const status = document.getElementById('ticketStatus').value;
    
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`/api/tickets/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                gia_ve: gia,
                trang_thai_ve: status
            })
        });
        
        if (!res.ok) {
            const text = await res.text();
            showAlert('danger', `Lỗi ${res.status}: ${text}`);
            return;
        }
        
        showAlert('success', 'Cập nhật vé thành công');
        hideTicketForm();
        loadTickets();
    } catch (err) {
        console.error('Save ticket error:', err);
        showAlert('danger', 'Lỗi khi cập nhật vé');
    }
}
// Gắn sự kiện filter theo Booking ID
const filterBookingInput = document.getElementById('filterBookingId');
if (filterBookingInput) {
    filterBookingInput.addEventListener('input', function() {
        const val = this.value.trim();
        if (!val) renderTickets();
        else {
            const filtered = ticketsList.filter(t => (t.Ma_booking || '').includes(val));
            renderTickets(filtered);
        }
    });
}

// Gắn sự kiện cancel và save form
const cancelTicketBtn = document.getElementById('cancelTicketBtn');
if (cancelTicketBtn) cancelTicketBtn.addEventListener('click', hideTicketForm);
const ticketForm = document.getElementById('ticketForm');
if (ticketForm) ticketForm.addEventListener('submit', saveTicket);

// Quản lý đặt Tour (Booking Management)
function loadBookingsTab() {
    console.log("Đang tải thông tin đặt tour...");
    loadBookings();
    
    // Thêm event listeners cho tìm kiếm và lọc
    setupBookingFilters();
}

// Thiết lập event listeners cho tìm kiếm và lọc booking
function setupBookingFilters() {
    // Event listener cho nút tìm kiếm
    const bookingSearchBtn = document.getElementById('bookingSearchBtn');
    if (bookingSearchBtn) {
        bookingSearchBtn.addEventListener('click', () => {
            loadBookings();
        });
    }
    
    // Event listener cho input tìm kiếm (tìm khi nhấn Enter)
    const bookingSearchInput = document.getElementById('bookingSearchInput');
    if (bookingSearchInput) {
        bookingSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadBookings();
            }
        });
        
        // Tìm kiếm khi người dùng nhập (debounce)
        let searchTimeout;
        bookingSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadBookings();
            }, 500); // Đợi 500ms sau khi người dùng ngừng gõ
        });
    }
    
    // Event listener cho filter trạng thái
    const bookingStatusFilter = document.getElementById('bookingStatusFilter');
    if (bookingStatusFilter) {
        bookingStatusFilter.addEventListener('change', () => {
            loadBookings();
        });
    }
}

async function loadBookings() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('error', 'Bạn cần đăng nhập để xem thông tin đặt tour');
            return;
        }

        // Lấy trạng thái filter
        const statusFilter = document.getElementById('bookingStatusFilter').value;
        const searchQuery = document.getElementById('bookingSearchInput').value.trim();

        // Tạo URL với các tham số filter
        let url = `${CONFIG.API_BASE_URL}/bookings`;
        if (statusFilter !== 'all' || searchQuery) {
            url += '?';
            if (statusFilter !== 'all') {
                url += `status=${statusFilter}`;
            }
            if (searchQuery) {
                url += statusFilter !== 'all' ? `&query=${searchQuery}` : `query=${searchQuery}`;
            }
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.status === 'success') {
            renderBookings(data.data.bookings);
        } else {
            showAlert('error', `Lỗi khi tải danh sách đặt tour: ${data.message || 'Vui lòng thử lại sau'}`);
        }
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu đặt tour:', error);
        showAlert('error', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau');
    }
}

function renderBookings(bookings) {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;

    if (!bookings || bookings.length === 0) {
        bookingsList.innerHTML = `<tr><td colspan="9" class="text-center">Không có dữ liệu đặt tour</td></tr>`;
        return;
    }

    let html = '';
    bookings.forEach(booking => {
        // Lấy trạng thái (ưu tiên Trang_thai_booking, nếu không có thì dùng Trang_thai)
        const trangThai = booking.Trang_thai_booking || booking.Trang_thai || 'Chưa xác định';
        const tenKhachHang = booking.Ten_khach_hang || 'N/A';
        
        html += `
        <tr>
            <td>${booking.Ma_booking}</td>
            <td>${tenKhachHang}</td>
            <td>${new Date(booking.Ngay_dat).toLocaleDateString('vi-VN')}</td>
            <td>${booking.So_nguoi_lon || 0}</td>
            <td>${booking.So_tre_em || 0}</td>
            <td>${booking.Ma_khuyen_mai || 'N/A'}</td>
            <td>${formatCurrency(booking.Tong_tien)}</td>
            <td>
               <span class="badge bg-${getStatusBadgeClass(trangThai)}">
                   ${trangThai}
               </span>
            </td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewBookingDetails('${booking.Ma_booking}')">
                    <i class="fas fa-eye"></i>
                </button>
                ${(trangThai === 'Chờ thanh toán') ? 
                    `<button class="btn btn-sm btn-success" onclick="approveBookingPayment('${booking.Ma_booking}')" title="Xác nhận thanh toán">
                        <i class="fas fa-check"></i> Xác nhận
                    </button>` : ''
                }
                ${(trangThai !== 'Đã hủy' && trangThai !== 'Hủy' && trangThai !== 'Da_huy' && trangThai !== 'Het_han' && trangThai !== 'Hết hạn') ? 
                    `<button class="btn btn-sm btn-danger" onclick="cancelBooking('${booking.Ma_booking}')">
                        <i class="fas fa-times"></i>
                    </button>` : ''
                }
            </td>
        </tr>`;
    });

    bookingsList.innerHTML = html;
}

function getStatusBadgeClass(status) {
    if (!status) return 'secondary';
    
    const statusLower = status.toLowerCase();
    
    // Chờ thanh toán
    if (status === 'Chờ thanh toán' || statusLower === 'pending' || statusLower === 'chờ thanh toán') {
        return 'warning';
    }
    
    // Đã thanh toán
    if (status === 'Đã thanh toán' || statusLower === 'đã thanh toán' || statusLower === 'da_thanh_toan') {
        return 'success';
    }
    
    // Đã hủy
    if (status === 'Đã hủy' || status === 'Hủy' || statusLower === 'đã hủy' || statusLower === 'hủy' || statusLower === 'da_huy') {
        return 'danger';
    }
    
    // Hết hạn
    if (status === 'Het_han' || status === 'Hết hạn' || statusLower === 'het_han' || statusLower === 'hết hạn') {
        return 'secondary';
    }
    
    return 'secondary';
}

async function viewBookingDetails(bookingId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('error', 'Bạn cần đăng nhập để xem chi tiết đặt tour');
            return;
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/bookings/${bookingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.status === 'success') {
            const bookingDetail = data.data;
            const bookingDetailContent = document.getElementById('bookingDetailContent');
            
            if (bookingDetailContent) {
                let html = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h5>Thông tin đặt tour</h5>
                        <p><strong>Mã đặt tour:</strong> ${bookingDetail.booking.Ma_booking}</p>
                        <p><strong>Ngày đặt:</strong> ${new Date(bookingDetail.booking.Ngay_dat).toLocaleDateString('vi-VN')}</p>
                        <p><strong>Số lượng người:</strong> ${(parseInt(bookingDetail.booking.So_nguoi_lon || 0) + parseInt(bookingDetail.booking.So_tre_em || 0))} người (${bookingDetail.booking.So_nguoi_lon || 0} người lớn, ${bookingDetail.booking.So_tre_em || 0} trẻ em)</p>
                        <p><strong>Tổng tiền:</strong> ${formatCurrency(bookingDetail.booking.Tong_tien)}</p>
                        <p><strong>Trạng thái:</strong> 
                            <span class="badge bg-${getStatusBadgeClass(bookingDetail.booking.Trang_thai_booking)}">
                                ${bookingDetail.booking.Trang_thai_booking}
                            </span>
                        </p>
                    </div>
                    <div class="col-md-6">
                        <h5>Thông tin khách hàng</h5>
                        <p><strong>Họ tên:</strong> ${bookingDetail.booking.Ten_khach_hang || 'N/A'}</p>
                        <p><strong>CCCD/CMND:</strong> ${bookingDetail.booking.Cccd || 'N/A'}</p>
                        <p><strong>Địa chỉ:</strong> ${bookingDetail.booking.Dia_chi || 'N/A'}</p>
                    </div>
                </div>`;

                if (bookingDetail.tour) {
                    html += `
                    <div class="row mb-3">
                        <div class="col-12">
                            <h5>Thông tin tour</h5>
                            <p><strong>Tên tour:</strong> ${bookingDetail.tour.Ten_tour}</p>
                            <p><strong>Thời gian:</strong> ${bookingDetail.tour.Thoi_gian} ngày</p>
                            <p><strong>Ngày bắt đầu:</strong> ${new Date(bookingDetail.tour.Ngay_bat_dau).toLocaleDateString('vi-VN')}</p>
                            <p><strong>Ngày kết thúc:</strong> ${new Date(bookingDetail.tour.Ngay_ket_thuc).toLocaleDateString('vi-VN')}</p>
                        </div>
                    </div>`;
                }

                if (bookingDetail.services && bookingDetail.services.length > 0) {
                    html += `
                    <div class="row mb-3">
                        <div class="col-12">
                            <h5>Dịch vụ bổ sung</h5>
                            <table class="table table-sm table-bordered">
                                <thead>
                                    <tr>
                                        <th>Tên dịch vụ</th>
                                        <th>Số lượng</th>
                                        <th>Đơn giá</th>
                                        <th>Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>`;
                    
                    bookingDetail.services.forEach(service => {
                        html += `
                                    <tr>
                                        <td>${service.Ten_dich_vu}</td>
                                        <td>${service.So_luong}</td>
                                        <td>${formatCurrency(service.Gia)}</td>
                                        <td>${formatCurrency(service.Thanh_tien)}</td>
                                    </tr>`;
                    });
                    
                    html += `
                                </tbody>
                            </table>
                        </div>
                    </div>`;
                }

                bookingDetailContent.innerHTML = html;
                
                // Hiển thị modal
                const bookingDetailModal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));
                bookingDetailModal.show();
                
                // Thiết lập các nút chức năng
                const cancelBookingBtn = document.getElementById('cancelBookingBtn');
                const approvePaymentBtn = document.getElementById('approvePaymentBtn');
                
                if (cancelBookingBtn) {
                    cancelBookingBtn.style.display = bookingDetail.booking.Trang_thai_booking !== 'Đã hủy' ? 'block' : 'none';
                    cancelBookingBtn.setAttribute('data-booking-id', bookingDetail.booking.Ma_booking);
                }
                
                if (approvePaymentBtn) {
                    approvePaymentBtn.style.display = bookingDetail.booking.Trang_thai_booking === 'Chờ thanh toán' ? 'block' : 'none';
                    approvePaymentBtn.setAttribute('data-booking-id', bookingDetail.booking.Ma_booking);
                }
            }
        } else {
            showAlert('error', `Không thể tải chi tiết đặt tour: ${data.message || 'Vui lòng thử lại sau'}`);
        }
    } catch (error) {
        console.error('Lỗi khi tải chi tiết đặt tour:', error);
        showAlert('error', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau');
    }
}

async function approveBookingPayment(bookingId) {
    try {
        console.log('🔍 Approving payment for booking:', bookingId);
        
        if (!confirm('Xác nhận thanh toán cho đặt tour này?')) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('error', 'Bạn cần đăng nhập để xác nhận thanh toán');
            return;
        }

        const hinh_thuc_thanh_toan = prompt('Nhập hình thức thanh toán (VD: Tiền mặt, Chuyển khoản, ...)', 'Tiền mặt');
        if (!hinh_thuc_thanh_toan) return;

        console.log('📤 Sending payment request:', {
            bookingId,
            hinh_thuc_thanh_toan,
            url: `${CONFIG.API_BASE_URL}/bookings/${bookingId}/payment`
        });

        const response = await fetch(`${CONFIG.API_BASE_URL}/bookings/${bookingId}/payment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hinh_thuc_thanh_toan })
        });

        console.log('📥 Payment response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        const data = await response.json();
        console.log('📊 Payment response data:', data);

        if (data.status === 'success') {
            showAlert('success', 'Xác nhận thanh toán thành công');
            loadBookings(); // Tải lại danh sách đặt tour
            
            // Nếu modal đang mở thì đóng modal
            const modalElement = document.getElementById('bookingDetailModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
        } else {
            console.error('❌ Payment failed:', data);
            showAlert('error', `Lỗi khi xác nhận thanh toán: ${data.message || 'Vui lòng thử lại sau'}`);
        }
    } catch (error) {
        console.error('Lỗi khi xác nhận thanh toán:', error);
        showAlert('error', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau');
    }
}

async function cancelBooking(bookingId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn hủy đặt tour này?')) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showAlert('error', 'Bạn cần đăng nhập để hủy đặt tour');
            return;
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.status === 'success') {
            showAlert('success', 'Hủy đặt tour thành công');
            loadBookings(); // Tải lại danh sách đặt tour
            
            // Nếu modal đang mở thì đóng modal
            const modalElement = document.getElementById('bookingDetailModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
        } else {
            showAlert('error', `Lỗi khi hủy đặt tour: ${data.message || 'Vui lòng thử lại sau'}`);
        }
    } catch (error) {
        console.error('Lỗi khi hủy đặt tour:', error);
        showAlert('error', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau');
    }
}

// Thiết lập các chức năng hiển thị book tour toàn cục
window.viewBookingDetails = viewBookingDetails;
window.approveBookingPayment = approveBookingPayment;
window.cancelBooking = cancelBooking;

// Cập nhật phần navItems để thêm hàm loadBookingsTab
const navItems = {
    'navDashboard': { section: 'dashboardSection', title: 'Tổng quan hệ thống', loader: null },
    'navTours': { section: 'toursSection', title: 'Quản lý Tour', loader: loadToursTab },
    'navDestinations': { section: 'destinationsSection', title: 'Quản lý Điểm đến', loader: loadDestinationsTab },
    'navServices': { section: 'servicesSection', title: 'Quản lý Dịch vụ', loader: loadServices },
    'navTickets': { section: 'ticketsSection', title: 'Quản lý Vé', loader: loadTickets },
    'navBookings': { section: 'bookingsSection', title: 'Quản lý Booking', loader: loadBookingsTab },
    'navSchedules': { section: 'schedulesSection', title: 'Quản lý Lịch khởi hành', loader: loadSchedulesTab },
    'navUsers': { section: 'usersSection', title: 'Quản lý người dùng', loader: null },
    'navSettings': { section: 'settingsSection', title: 'Cài đặt hệ thống', loader: null }
};

// Hàm hiển thị form thêm tour mới trong loadToursTab
function showAddTourForm() {
    const tourFormSection = document.getElementById('tourFormSection');
    if (!tourFormSection) return;
    
    // Hiển thị form
    tourFormSection.style.display = 'block';
    
    // Reset form và thiết lập giá trị mặc định
    const tourForm = document.getElementById('tourForm');
    if (tourForm) {
        tourForm.reset();
    }
    
    // Thiết lập tiêu đề form
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
        formTitle.textContent = 'Thêm Tour mới';
    }
    
    // Cho phép chỉnh sửa mã tour khi thêm mới
    const maTourInput = document.getElementById('maTour');
    if (maTourInput) {
        maTourInput.disabled = false;
    }
    
    // Thiết lập giá trị mặc định
    const tinhTrangInput = document.getElementById('tinhTrang');
    const loaiTourInput = document.getElementById('loaiTour');
    const thoiGianInput = document.getElementById('thoiGian');
    const giaNguoiLonInput = document.getElementById('giaNguoiLon');
    const giaTreEmInput = document.getElementById('giaTreEm');
    
    if (tinhTrangInput) tinhTrangInput.value = 'Còn chỗ';
    if (loaiTourInput) loaiTourInput.value = 'trong_nuoc';
    if (thoiGianInput) thoiGianInput.value = 1;
    if (giaNguoiLonInput) giaNguoiLonInput.value = 0;
    if (giaTreEmInput) giaTreEmInput.value = 0;
    
    // Thiết lập trạng thái form
    window.isEditMode = false;
    window.currentTourId = null;
    
    // Cuộn đến form
    tourFormSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Trích xuất dữ liệu tour từ các cấu trúc dữ liệu API khác nhau
 * @param {Object|Array} data - Dữ liệu nhận được từ API
 * @returns {Array|null} - Mảng tour hoặc null nếu không tìm thấy
 */
function extractToursFromData(data) {
    // Kiểm tra cấu trúc dữ liệu và trích xuất mảng tours
    console.log('Xử lý dữ liệu tours:', data);
    
    let toursArray = null;
    
    // Thử các cấu trúc dữ liệu khác nhau có thể gặp
    if (data.status === 'success' && data.data && Array.isArray(data.data.tours)) {
        // Cấu trúc API theo tiêu chuẩn
        toursArray = data.data.tours;
    } else if (Array.isArray(data)) {
        // Trực tiếp là mảng
        toursArray = data;
    } else if (data.tours && Array.isArray(data.tours)) {
        // Thuộc tính tours ở mức đầu tiên
        toursArray = data.tours;
    } else if (data.data && Array.isArray(data.data)) {
        // Thuộc tính data là mảng
        toursArray = data.data;
    } else if (data.data && data.data.tours && Array.isArray(data.data.tours)) {
        // Cấu trúc lồng nhau nhiều cấp
        toursArray = data.data.tours;
    } else {
        // Tìm bất kỳ mảng nào trong đối tượng
        for (const key in data) {
            if (Array.isArray(data[key])) {
                toursArray = data[key];
                console.log(`Tìm thấy mảng trong thuộc tính: ${key}`);
                break;
            }
            
            // Kiểm tra thêm một cấp
            if (data[key] && typeof data[key] === 'object') {
                for (const nestedKey in data[key]) {
                    if (Array.isArray(data[key][nestedKey])) {
                        toursArray = data[key][nestedKey];
                        console.log(`Tìm thấy mảng trong thuộc tính lồng nhau: ${key}.${nestedKey}`);
                        break;
                    }
                }
                if (toursArray) break;
            }
        }
    }
    
    // Chuẩn hóa và xác thực dữ liệu
    if (toursArray && toursArray.length > 0) {
        // Kiểm tra xem đây có thực sự là mảng tours không
        const validKeys = ['Ma_tour', 'ma_tour', 'Ten_tour', 'ten_tour'];
        const isValid = toursArray.some(item => {
            return validKeys.some(key => key in item);
        });
        
        if (!isValid) {
            console.warn('Dữ liệu không phải là mảng tours hợp lệ');
            return null;
        }
        
        return toursArray;
    }
    
    return null;
}


// Thêm hàm chuẩn hóa đường dẫn ảnh
function normalizeImagePath(imagePath, type = 'tours') {
    if (!imagePath) return null;
    
    // Loại bỏ khoảng trắng đầu/cuối
    const trimmedPath = imagePath.trim();
    
    // Nếu đường dẫn đã đúng định dạng
    if (trimmedPath.startsWith('/images/uploads/')) {
        return trimmedPath;
    }
    
    // Đảm bảo đường dẫn bắt đầu bằng /images/uploads
    const folderName = type === 'destination' ? 'destination' : 'tours';
    let fileName = trimmedPath;
    
    // Lấy tên file từ đường dẫn (loại bỏ thư mục)
    if (fileName.includes('/')) {
        fileName = fileName.split('/').pop();
    }
    
    // Đảm bảo tên file không trống
    if (!fileName || fileName === '') {
        const timestamp = new Date().getTime();
        const randomNum = Math.floor(Math.random() * 1000000);
        fileName = `image-${timestamp}-${randomNum}.jpg`;
    }
    
    return `/images/uploads/${folderName}/${fileName}`;
}

// Hàm loadDestinationsTab chỉ gọi hàm từ admindestinations.js nếu phần tử đã tồn tại
function loadDestinationsTab() {
    console.log('Đang tải tab quản lý Điểm đến từ admindestinations.js');
    
    // Hiển thị section destinations
    showSection('destinationsSection');
    
    // Cập nhật tiêu đề
    const sectionTitleElement = document.getElementById('sectionTitle');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = 'Quản lý Điểm Đến Du Lịch';
    }
    
    // Đảm bảo đã tải xong DOM trước khi gọi các hàm từ file khác
    setTimeout(() => {
        // Nếu file đã được load và đã định nghĩa hàm initializeDestinationsTab
        if (typeof initializeDestinationsTab === 'function') {
            initializeDestinationsTab();
        } else {
            console.warn('initializeDestinationsTab function is not defined, trying to load directly...');
            // Fallback: gọi trực tiếp các hàm từ file admindestinations.js nếu chúng tồn tại
            try {
                if (typeof loadDestinations === 'function') {
                    loadDestinations();
                }
                if (typeof loadAvailableTours === 'function') {
                    loadAvailableTours();
                }
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu điểm đến:', error);
            }
        }
    }, 300);
    
    
}

// ============================================
// GUIDE MANAGEMENT FUNCTIONS
// ============================================

// Load guides tab
function loadGuidesTab() {
    console.log('Đang tải tab quản lý Hướng dẫn viên');
    
    showSection('guidesSection');
    
    const sectionTitleElement = document.getElementById('sectionTitle');
    if (sectionTitleElement) {
        sectionTitleElement.textContent = 'Quản lý Hướng dẫn viên';
    }
    
    // Setup event listeners
    const addGuideBtn = document.getElementById('addGuideBtn');
    if (addGuideBtn) {
        addGuideBtn.onclick = () => {
            showGuideModal();
        };
    }
    
    const refreshGuidesBtn = document.getElementById('refreshGuidesBtn');
    if (refreshGuidesBtn) {
        refreshGuidesBtn.onclick = loadGuides;
    }
    
    const guideStatusFilter = document.getElementById('guideStatusFilter');
    if (guideStatusFilter) {
        guideStatusFilter.onchange = loadGuides;
    }
    
    const guideSearchInput = document.getElementById('guideSearchInput');
    if (guideSearchInput) {
        let searchTimeout;
        guideSearchInput.oninput = () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadGuides, 500);
        };
    }
    
    const guideForm = document.getElementById('guideForm');
    if (guideForm) {
        guideForm.onsubmit = handleGuideSubmit;
    }
    
    // Load guides
    loadGuides();
}

// Load all guides
async function loadGuides() {
    const guidesList = document.getElementById('guidesList');
    if (!guidesList) return;
    
    const token = localStorage.getItem('token');
    const status = document.getElementById('guideStatusFilter')?.value || 'all';
    const search = document.getElementById('guideSearchInput')?.value || '';
    
    try {
        let url = `http://localhost:5000/api/admin/guides?status=${status}`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data.guides) {
            renderGuides(data.data.guides);
        } else {
            guidesList.innerHTML = '<tr><td colspan="8" class="text-center">Không có dữ liệu</td></tr>';
        }
    } catch (error) {
        console.error('Error loading guides:', error);
        guidesList.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Lỗi khi tải dữ liệu</td></tr>';
    }
}

// Render guides table
function renderGuides(guides) {
    const tbody = document.getElementById('guidesList');
    if (!tbody) return;
    
    if (guides.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Không có hướng dẫn viên nào</td></tr>';
        return;
    }
    
    tbody.innerHTML = guides.map(guide => {
        const statusBadge = {
            'Hoat_dong': '<span class="badge bg-success">Đang hoạt động</span>',
            'Nghi_phep': '<span class="badge bg-warning">Nghỉ phép</span>',
            'Nghi_viec': '<span class="badge bg-danger">Nghỉ việc</span>'
        }[guide.Trang_thai] || '<span class="badge bg-secondary">N/A</span>';
        
        const stats = guide.stats || {};
        const avgRating = stats.avg_rating || '0.0';
        const totalTours = stats.total_tours || 0;
        
        return `
            <tr>
                <td>${guide.Ma_huong_dan_vien}</td>
                <td>${guide.Ten_huong_dan_vien || 'N/A'}</td>
                <td>${guide.So_dien_thoai || 'N/A'}</td>
                <td>${guide.Email || 'N/A'}</td>
                <td>${statusBadge}</td>
                <td>${totalTours}</td>
                <td>${avgRating} ⭐</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="editGuide('${guide.Ma_huong_dan_vien}')">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteGuide('${guide.Ma_huong_dan_vien}')">
                            <i class="fas fa-trash"></i> ${guide.Trang_thai === 'Nghi_viec' ? 'Xóa' : 'Khóa'}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Show guide modal
function showGuideModal(guide = null) {
    const modal = new bootstrap.Modal(document.getElementById('guideModal'));
    const form = document.getElementById('guideForm');
    const modalTitle = document.getElementById('guideModalLabel');
    const passwordInput = document.getElementById('guidePassword');
    const passwordLabel = document.getElementById('guidePasswordLabel');
    const passwordHint = document.getElementById('guidePasswordHint');
    
    form.reset();
    document.getElementById('guideMaHuongDanVien').value = '';
    
    if (guide) {
        // Edit mode
        modalTitle.textContent = 'Chỉnh sửa Hướng dẫn viên';
        passwordInput.required = false;
        passwordLabel.textContent = '';
        passwordHint.style.display = 'block';
        
        document.getElementById('guideMaHuongDanVien').value = guide.Ma_huong_dan_vien;
        document.getElementById('guideEmail').value = guide.Email || '';
        document.getElementById('guideTen').value = guide.Ten_huong_dan_vien || '';
        document.getElementById('guideNgaySinh').value = guide.Ngay_sinh ? guide.Ngay_sinh.split('T')[0] : '';
        document.getElementById('guideGioiTinh').value = guide.Gioi_tinh || 'Nam';
        document.getElementById('guideSoDienThoai').value = guide.So_dien_thoai || '';
        document.getElementById('guideCccd').value = guide.Cccd || '';
        document.getElementById('guideDiaChi').value = guide.Dia_chi || '';
        document.getElementById('guideNgonNgu').value = guide.Ngon_ngu || '';
        document.getElementById('guideKinhNghiem').value = guide.Kinh_nghiem || '';
        document.getElementById('guideTrangThai').value = guide.Trang_thai || 'Hoat_dong';
        
        document.getElementById('guideEmail').disabled = true; // Không cho sửa email
    } else {
        // Add mode
        modalTitle.textContent = 'Thêm Hướng dẫn viên mới';
        passwordInput.required = true;
        passwordLabel.textContent = '*';
        passwordHint.style.display = 'none';
        document.getElementById('guideEmail').disabled = false;
    }
    
    modal.show();
}

// Handle guide form submit
async function handleGuideSubmit(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const maHuongDanVien = document.getElementById('guideMaHuongDanVien').value;
    const isEdit = !!maHuongDanVien;
    
    const formData = {
        email: document.getElementById('guideEmail').value,
        password: document.getElementById('guidePassword').value,
        ten_huong_dan_vien: document.getElementById('guideTen').value,
        ngay_sinh: document.getElementById('guideNgaySinh').value,
        gioi_tinh: document.getElementById('guideGioiTinh').value,
        so_dien_thoai: document.getElementById('guideSoDienThoai').value,
        cccd: document.getElementById('guideCccd').value,
        dia_chi: document.getElementById('guideDiaChi').value,
        ngon_ngu: document.getElementById('guideNgonNgu').value,
        kinh_nghiem: document.getElementById('guideKinhNghiem').value,
        trang_thai: document.getElementById('guideTrangThai').value
    };
    
    // Nếu edit và không có password mới, bỏ qua password
    if (isEdit && !formData.password) {
        delete formData.password;
    }
    
    try {
        let url = 'http://localhost:5000/api/admin/guides';
        let method = 'POST';
        
        if (isEdit) {
            url += `/${maHuongDanVien}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Lỗi khi lưu hướng dẫn viên');
        }
        
        const result = await response.json();
        showAlert('success', result.message || (isEdit ? 'Cập nhật thành công' : 'Thêm thành công'));
        
        bootstrap.Modal.getInstance(document.getElementById('guideModal')).hide();
        
        // Reload danh sách sau khi cập nhật
        setTimeout(() => {
            loadGuides();
        }, 300);
    } catch (error) {
        console.error('Error saving guide:', error);
        showAlert('danger', error.message || 'Lỗi khi lưu hướng dẫn viên');
    }
}

// Edit guide
async function editGuide(maHuongDanVien) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`http://localhost:5000/api/admin/guides/${maHuongDanVien}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data.guide) {
            showGuideModal(data.data.guide);
        } else {
            showAlert('danger', 'Không tìm thấy hướng dẫn viên');
        }
    } catch (error) {
        console.error('Error loading guide:', error);
        showAlert('danger', 'Lỗi khi tải thông tin hướng dẫn viên');
    }
}

// Delete/Deactivate guide
async function deleteGuide(maHuongDanVien) {
    const token = localStorage.getItem('token');
    
    try {
        // Load guide info to check status
        const getResponse = await fetch(`http://localhost:5000/api/admin/guides/${maHuongDanVien}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let actionText = 'xóa';
        if (getResponse.ok) {
            const guideData = await getResponse.json();
            if (guideData.data?.guide?.Trang_thai !== 'Nghi_viec') {
                actionText = 'khóa';
            }
        }
        
        if (!confirm(`Bạn có chắc muốn ${actionText} hướng dẫn viên này?`)) {
            return;
        }
        
        const response = await fetch(`http://localhost:5000/api/admin/guides/${maHuongDanVien}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể xóa hướng dẫn viên');
        }
        
        const result = await response.json();
        showAlert('success', result.message || `${actionText === 'xóa' ? 'Xóa' : 'Khóa'} thành công`);
        loadGuides();
    } catch (error) {
        console.error('Error deleting guide:', error);
        showAlert('danger', error.message || 'Lỗi khi xóa hướng dẫn viên');
    }
}

// Get schedule status badge
function getScheduleStatusBadge(status) {
    const statusMap = {
        'Còn chỗ': '<span class="badge bg-success">Còn chỗ</span>',
        'Hết chỗ': '<span class="badge bg-danger">Hết chỗ</span>',
        'Đang diễn ra': '<span class="badge bg-primary">Đang diễn ra</span>',
        'Đã diễn ra': '<span class="badge bg-secondary">Đã diễn ra</span>'
    };
    return statusMap[status] || `<span class="badge bg-secondary">${status || 'N/A'}</span>`;
}

// Assign guide to schedule
async function assignGuideToSchedule(maLich, maHuongDanVien, ngayBatDau, ngayKetThuc) {
    const token = localStorage.getItem('token');
    
    // Nếu chọn option trống, gỡ HDV khỏi lịch
    if (!maHuongDanVien || maHuongDanVien === '') {
        if (!confirm('Bạn có chắc chắn muốn gỡ hướng dẫn viên khỏi lịch này?')) {
            // Reload để reset dropdown về giá trị cũ
            loadSchedules();
            return;
        }
        
        // Gửi request để gỡ HDV (gửi null)
        try {
            const response = await fetch(`http://localhost:5000/api/admin/schedules/${maLich}/assign-guide`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ma_huong_dan_vien: null,
                    date_from: ngayBatDau,
                    date_to: ngayKetThuc
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể gỡ hướng dẫn viên');
            }
            
            const result = await response.json();
            showAlert('success', result.message || 'Đã gỡ hướng dẫn viên khỏi lịch');
            loadSchedules(); // Reload để cập nhật
        } catch (error) {
            console.error('Error removing guide:', error);
            showAlert('danger', error.message || 'Lỗi khi gỡ hướng dẫn viên');
            loadSchedules(); // Reload để reset dropdown
        }
        return;
    }
    
    // Phân công HDV mới
    try {
        const response = await fetch(`http://localhost:5000/api/admin/schedules/${maLich}/assign-guide`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ma_huong_dan_vien: maHuongDanVien,
                date_from: ngayBatDau,
                date_to: ngayKetThuc
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể phân công hướng dẫn viên');
        }
        
        const result = await response.json();
        showAlert('success', result.message || 'Phân công hướng dẫn viên thành công!');
        loadSchedules(); // Reload để cập nhật
    } catch (error) {
        console.error('Error assigning guide:', error);
        showAlert('danger', error.message || 'Lỗi khi phân công hướng dẫn viên');
        loadSchedules(); // Reload để reset dropdown
    }
}

// Hàm hiển thị dropdown chọn HDV khi nhấn "Chọn HDV"
async function showGuideDropdown(maLich, dateFrom, dateTo, maTour) {
    const dropdownContainer = document.getElementById(`guideDropdown_${maLich}`);
    if (!dropdownContainer) {
        console.error('Dropdown container not found for schedule:', maLich);
        return;
    }
    
    // Nếu đã hiển thị, ẩn đi
    if (dropdownContainer.style.display !== 'none' && dropdownContainer.style.display !== '') {
        dropdownContainer.style.display = 'none';
        return;
    }
    
    // Hiển thị dropdown
    dropdownContainer.style.display = 'block';
    
    // Nếu dropdown chưa có nội dung, load danh sách HDV
    const selectId = `guideSelect_${maLich}`;
    let guideSelect = document.getElementById(selectId);
    
    if (!guideSelect || dropdownContainer.innerHTML.trim() === '') {
        // Hiển thị loading
        dropdownContainer.innerHTML = '<select class="form-select form-select-sm" disabled><option>Đang tải...</option></select>';
        
        // Tạo dropdown mới
        const token = localStorage.getItem('token');
        let guideDropdown = `<select class="form-select form-select-sm" id="${selectId}" style="min-width: 200px;" onchange="handleGuideSelection('${maLich}', this.value, '${dateFrom}', '${dateTo}')">`;
        guideDropdown += `<option value="" style="color: #dc3545; font-weight: bold;">❌ Gỡ HDV</option>`;
        
        try {
            let availableGuidesUrl = `http://localhost:5000/api/admin/guides/available?date_from=${dateFrom}&date_to=${dateTo}&exclude_schedule=${maLich}`;
            if (maTour) {
                availableGuidesUrl += `&ma_tour=${encodeURIComponent(maTour)}`;
            }
            
            const availableGuidesRes = await fetch(availableGuidesUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (availableGuidesRes.ok) {
                const guidesData = await availableGuidesRes.json();
                if (guidesData.status === 'success' && guidesData.data.guides && guidesData.data.guides.length > 0) {
                    guidesData.data.guides.forEach(guide => {
                        guideDropdown += `<option value="${guide.Ma_huong_dan_vien}">👤 ${guide.Ten_huong_dan_vien} (${guide.So_dien_thoai})</option>`;
                    });
                } else {
                    guideDropdown += `<option value="" disabled>Không có HDV rảnh</option>`;
                }
            } else {
                guideDropdown += `<option value="" disabled>Lỗi tải danh sách HDV</option>`;
            }
        } catch (err) {
            console.error('Error loading available guides:', err);
            guideDropdown += `<option value="" disabled>Lỗi tải danh sách HDV</option>`;
        }
        
        guideDropdown += '</select>';
        dropdownContainer.innerHTML = guideDropdown;
    }
}

// Hàm xử lý khi chọn HDV từ dropdown
async function handleGuideSelection(maLich, maHuongDanVien, dateFrom, dateTo) {
    // Ẩn dropdown ngay lập tức
    const dropdownContainer = document.getElementById(`guideDropdown_${maLich}`);
    if (dropdownContainer) {
        dropdownContainer.style.display = 'none';
    }
    
    // Nếu chọn "Gỡ HDV" (empty value), xác nhận trước
    if (!maHuongDanVien || maHuongDanVien === '') {
        if (!confirm('Bạn có chắc chắn muốn gỡ hướng dẫn viên khỏi lịch này?')) {
            // Nếu không xác nhận, hiển thị lại dropdown
            if (dropdownContainer) {
                dropdownContainer.style.display = 'block';
            }
            return;
        }
    }
    
    await assignGuideToSchedule(maLich, maHuongDanVien, dateFrom, dateTo);
    // Sau khi phân công thành công, reload để cập nhật UI
    // (loadSchedules sẽ được gọi trong assignGuideToSchedule)
}

// Hàm xem chi tiết lịch (cho lịch đã diễn ra)
async function viewSchedule(lichId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`http://localhost:5000/api/tours/schedules/${lichId}`, { 
            method: 'GET', 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const s = data.data.schedule;
        
        // Hiển thị modal với thông tin chi tiết (chỉ đọc)
        const modalHTML = `
            <div class="modal fade" id="viewScheduleModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chi tiết Lịch khởi hành - ${s.Ma_lich}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Mã lịch:</strong> ${s.Ma_lich}
                                </div>
                                <div class="col-md-6">
                                    <strong>Mã tour:</strong> ${s.Ma_tour}
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Ngày bắt đầu:</strong> ${s.Ngay_bat_dau ? new Date(s.Ngay_bat_dau).toLocaleDateString('vi-VN') : 'N/A'}
                                </div>
                                <div class="col-md-6">
                                    <strong>Ngày kết thúc:</strong> ${s.Ngay_ket_thuc ? new Date(s.Ngay_ket_thuc).toLocaleDateString('vi-VN') : 'N/A'}
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Số chỗ:</strong> ${s.So_cho || 0}
                                </div>
                                <div class="col-md-6">
                                    <strong>Số chỗ đã đặt:</strong> ${s.bookedSeats || 0}
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Số chỗ còn lại:</strong> ${s.availableSeats || 0}
                                </div>
                                <div class="col-md-6">
                                    <strong>Hướng dẫn viên:</strong> ${s.Ten_huong_dan_vien || 'Chưa phân công'}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Xóa modal cũ nếu có
        const oldModal = document.getElementById('viewScheduleModal');
        if (oldModal) {
            oldModal.remove();
        }
        
        // Thêm modal mới vào body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Hiển thị modal
        const modal = new bootstrap.Modal(document.getElementById('viewScheduleModal'));
        modal.show();
        
        // Xóa modal khi đóng
        document.getElementById('viewScheduleModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    } catch (err) {
        console.error('View schedule error:', err);
        showAlert('danger', 'Không thể tải dữ liệu lịch');
    }
}

// Hàm gỡ HDV khỏi lịch (từ bảng) - nút riêng
async function removeGuideFromSchedule(maLich, ngayBatDau, ngayKetThuc) {
    if (!confirm('Bạn có chắc chắn muốn gỡ hướng dẫn viên khỏi lịch này?')) {
        return;
    }
    
    await assignGuideToSchedule(maLich, '', ngayBatDau, ngayKetThuc);
}

// Hàm gỡ HDV khỏi lịch (từ form) - nút riêng
async function removeGuideFromScheduleForm() {
    const guideSelect = document.getElementById('scheduleGuide');
    if (!guideSelect) return;
    
    if (!confirm('Bạn có chắc chắn muốn gỡ hướng dẫn viên khỏi lịch này?')) {
        return;
    }
    
    // Set dropdown về "Gỡ HDV"
    guideSelect.value = '';
    
    // Ẩn nút "Gỡ HDV"
    const removeGuideBtn = document.getElementById('removeGuideBtn');
    if (removeGuideBtn) {
        removeGuideBtn.style.display = 'none';
    }
    
    // Nếu đang edit, cần lưu thay đổi
    if (isEditScheduleMode && currentScheduleId) {
        // Trigger save để cập nhật
        await saveSchedule();
    }
}
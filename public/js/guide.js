// Guide Portal JavaScript
(function() {
    'use strict';

    // Global variables
    let socket = null;
    let currentGuide = null;
    let currentGuideId = null;
    let currentUserId = null;
    let notifications = [];
    let unreadCount = 0;

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        checkAuth();
        initSocket();
        initNavigation();
        loadGuideProfile();
        loadDashboard();
        setupEventListeners();
    });

    // Check authentication
    function checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        
        if (!token || !user || (user.loai_tai_khoan !== 'Huong_dan_vien' && user.role !== 'Huong_dan_vien')) {
            window.location.href = '/login.html';
            return;
        }
        
        currentUserId = user.id || user.Id_user || user.id_user;
    }

    // Initialize Socket.io
    function initSocket() {
        socket = io();
        
        socket.on('connect', () => {
            console.log('✅ Socket connected');
            
            // Emit guide online event
            if (currentGuideId && currentUserId) {
                socket.emit('guideOnline', {
                    userId: currentUserId,
                    guideId: currentGuideId
                });
            }
        });

        // Listen for new booking
        socket.on('new_booking', (data) => {
            console.log('📢 New booking notification:', data);
            addNotification({
                type: 'new_booking',
                title: 'Booking mới',
                message: `Có booking mới cho lịch ${data.ma_lich || ''}`,
                data: data,
                timestamp: new Date()
            });
            showToast('Có booking mới!', 'info');
            
            // Reload schedules if on schedules page
            if (document.getElementById('schedulesSection').style.display !== 'none') {
                loadSchedules();
            }
        });

        // Listen for booking updates
        socket.on('update_booking', (data) => {
            console.log('📢 Booking update notification:', data);
            addNotification({
                type: 'update_booking',
                title: 'Cập nhật booking',
                message: `Booking ${data.ma_booking} đã được cập nhật`,
                data: data,
                timestamp: new Date()
            });
            showToast('Booking đã được cập nhật', 'info');
        });

        // Listen for booking cancellation
        socket.on('cancel_booking', (data) => {
            console.log('📢 Booking cancellation notification:', data);
            addNotification({
                type: 'cancel_booking',
                title: 'Hủy booking',
                message: `Booking ${data.ma_booking} đã bị hủy`,
                data: data,
                timestamp: new Date()
            });
            showToast('Có booking bị hủy', 'warning');
        });

        // Listen for guide assignment
        socket.on('guide_assigned', (data) => {
            console.log('📢 Guide assigned notification:', data);
            addNotification({
                type: 'guide_assigned',
                title: 'Được phân công lịch mới',
                message: `Bạn đã được phân công cho lịch ${data.ma_lich}`,
                data: data,
                timestamp: new Date()
            });
            showToast('Bạn đã được phân công lịch mới!', 'success');
            
            // Reload schedules
            loadSchedules();
        });

        socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });
    }

    // Initialize navigation
    function initNavigation() {
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.id === 'logoutBtn') {
                    e.preventDefault();
                    logout();
                    return;
                }
                
                e.preventDefault();
                const target = this.getAttribute('href').substring(1);
                showSection(target);
                
                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // Show section
    function showSection(section) {
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(s => s.style.display = 'none');
        
        const sectionMap = {
            'dashboard': 'dashboardSection',
            'schedules': 'schedulesSection',
            'bookings': 'bookingsSection',
            'reviews': 'reviewsSection',
            'profile': 'profileSection'
        };
        
        const sectionId = sectionMap[section];
        if (sectionId) {
            document.getElementById(sectionId).style.display = 'block';
            document.getElementById('sectionTitle').textContent = getSectionTitle(section);
            
            // Load data for section
            switch(section) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'schedules':
                    loadSchedules();
                    break;
                case 'reviews':
                    loadReviews();
                    break;
                case 'profile':
                    loadProfileForm();
                    break;
            }
        }
    }

    function getSectionTitle(section) {
        const titles = {
            'dashboard': 'Dashboard',
            'schedules': 'Lịch của tôi',
            'bookings': 'Booking',
            'reviews': 'Đánh giá',
            'profile': 'Hồ sơ cá nhân'
        };
        return titles[section] || 'Dashboard';
    }

    // Load guide profile
    async function loadGuideProfile() {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user.id || user.Id_user || user.id_user;
            
            if (!userId) {
                console.error('❌ Không tìm thấy userId');
                showToast('Lỗi: Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', 'error');
                return false;
            }
            
            console.log('🔍 Loading guide profile for userId:', userId);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/guide/profile/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.error('❌ Không tìm thấy hướng dẫn viên với userId:', userId);
                    showToast('Lỗi: Tài khoản chưa có thông tin hướng dẫn viên. Vui lòng liên hệ admin để được tạo hồ sơ.', 'error');
                    return false;
                } else if (response.status === 403) {
                    console.error('❌ Không có quyền truy cập');
                    showToast('Lỗi: Không có quyền truy cập. Vui lòng đăng nhập lại.', 'error');
                    return false;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Kiểm tra xem có cần setup profile không
                if (result.data.needsSetup || !result.data.guide) {
                    console.log('ℹ️ Chưa có profile, cần tạo mới');
                    currentGuide = null;
                    currentGuideId = null;
                    
                    // Hiển thị thông báo và cho phép user tạo profile
                    document.getElementById('guideName').textContent = 'Hướng dẫn viên (Chưa có hồ sơ)';
                    
                    // Nếu đang ở trang profile, hiển thị thông báo
                    if (document.getElementById('profileSection').style.display !== 'none') {
                        const profileForm = document.getElementById('profileForm');
                        if (profileForm) {
                            const alertDiv = document.createElement('div');
                            alertDiv.className = 'alert alert-info';
                            alertDiv.innerHTML = '<i class="fas fa-info-circle"></i> Bạn chưa có hồ sơ. Vui lòng điền thông tin bên dưới và nhấn "Lưu thay đổi" để tạo hồ sơ.';
                            profileForm.insertBefore(alertDiv, profileForm.firstChild);
                        }
                    }
                    
                    return false; // Chưa có profile, cần tạo mới
                }
                
                // Đã có profile
                currentGuide = result.data.guide;
                currentGuideId = currentGuide.Ma_huong_dan_vien;
                
                console.log('✅ Loaded guide profile:', currentGuide);
                console.log('✅ Guide ID:', currentGuideId);
                
                // Update UI
                document.getElementById('guideName').textContent = currentGuide.Ten_huong_dan_vien || 'Hướng dẫn viên';
                
                if (currentGuide.Anh_dai_dien) {
                    const avatar = document.getElementById('guideAvatar');
                    // Xử lý đường dẫn ảnh (tránh duplicate /images)
                    let imagePath = currentGuide.Anh_dai_dien;
                    let imageUrl;
                    
                    // CONFIG.IMAGE_URL = http://localhost:5000/images
                    // imagePath từ DB: /images/uploads/avatar/...
                    if (imagePath.startsWith('http')) {
                        // Đã là full URL
                        imageUrl = imagePath;
                    } else if (imagePath.startsWith('/images')) {
                        // Đã có /images ở đầu, CONFIG.IMAGE_URL cũng có /images ở cuối
                        // Nên chỉ cần nối trực tiếp: http://localhost:5000 + /images/uploads/...
                        imageUrl = `${CONFIG.IMAGE_URL.replace('/images', '')}${imagePath}`;
                    } else if (imagePath.startsWith('/')) {
                        // Bắt đầu bằng / nhưng không có /images, thêm /images vào
                        imageUrl = `${CONFIG.IMAGE_URL}${imagePath}`;
                    } else {
                        // Không có /, thêm cả /images và /
                        imageUrl = `${CONFIG.IMAGE_URL}/${imagePath}`;
                    }
                    
                    avatar.src = imageUrl;
                    avatar.style.display = 'block';
                }
                
                return true;
            } else {
                console.error('❌ Response không hợp lệ:', result);
                showToast(result.message || 'Lỗi: Không tìm thấy thông tin hướng dẫn viên.', 'error');
                return false;
            }
        } catch (error) {
            console.error('❌ Error loading guide profile:', error);
            showToast('Lỗi khi tải thông tin hướng dẫn viên. Vui lòng thử lại.', 'error');
            return false;
        }
    }

    // Load dashboard
    async function loadDashboard() {
        if (!currentGuideId) {
            const loaded = await loadGuideProfile();
            if (!loaded || !currentGuideId) {
                console.error('❌ Không thể load guide profile');
                document.getElementById('statTotalTours').textContent = 'N/A';
                document.getElementById('statTotalBookings').textContent = 'N/A';
                document.getElementById('statAvgRating').textContent = 'N/A';
                document.getElementById('statTotalGuests').textContent = 'N/A';
                document.getElementById('upcomingSchedulesList').innerHTML = '<div class="text-center text-muted py-4">Không thể tải dữ liệu</div>';
                return;
            }
        }
        
        try {
            const token = localStorage.getItem('token');
            
            // Load stats
            const statsResponse = await fetch(`${CONFIG.API_BASE_URL}/guide/stats/${currentGuideId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const statsResult = await statsResponse.json();
            
            if (statsResult.status === 'success' && statsResult.data.stats) {
                const stats = statsResult.data.stats;
                document.getElementById('statTotalTours').textContent = stats.total_tours || 0;
                document.getElementById('statTotalBookings').textContent = stats.total_bookings || 0;
                document.getElementById('statAvgRating').textContent = stats.avg_rating || '0.0';
                document.getElementById('statTotalGuests').textContent = stats.total_guests || 0;
            }
            
            // Load upcoming schedules
            const schedulesResponse = await fetch(`${CONFIG.API_BASE_URL}/guide/schedules/${currentGuideId}?status=sap_dien_ra`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const schedulesResult = await schedulesResponse.json();
            
            if (schedulesResult.status === 'success') {
                displayUpcomingSchedules(schedulesResult.data.schedules.slice(0, 5));
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    // Display upcoming schedules
    function displayUpcomingSchedules(schedules) {
        const container = document.getElementById('upcomingSchedulesList');
        
        if (!schedules || schedules.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-4">Không có lịch sắp tới</div>';
            return;
        }
        
        container.innerHTML = schedules.map(schedule => `
            <div class="schedule-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${schedule.Ten_tour || 'N/A'}</h6>
                        <p class="text-muted mb-1">
                            <i class="fas fa-calendar"></i> 
                            ${formatDate(schedule.Ngay_khoi_hanh)} - ${formatDate(schedule.Ngay_ket_thuc)}
                        </p>
                        <p class="text-muted mb-0">
                            <i class="fas fa-users"></i> ${schedule.So_booking || 0} booking
                        </p>
                    </div>
                    <span class="badge bg-primary">${schedule.Ma_lich}</span>
                </div>
            </div>
        `).join('');
    }

    // Load schedules
    async function loadSchedules() {
        if (!currentGuideId) {
            const loaded = await loadGuideProfile();
            if (!loaded || !currentGuideId) {
                console.error('❌ Không thể load guide profile');
                document.getElementById('schedulesTableBody').innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không thể tải dữ liệu</td></tr>';
                return;
            }
        }
        
        try {
            const token = localStorage.getItem('token');
            const filter = document.getElementById('scheduleFilter')?.value || 'all';
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/guide/schedules/${currentGuideId}?status=${filter}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                displaySchedules(result.data.schedules);
            }
        } catch (error) {
            console.error('Error loading schedules:', error);
        }
    }

    // Display schedules
    function displaySchedules(schedules) {
        const tbody = document.getElementById('schedulesTableBody');
        
        if (!schedules || schedules.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Không có lịch nào</td></tr>';
            return;
        }
        
        tbody.innerHTML = schedules.map(schedule => `
            <tr>
                <td>${schedule.Ma_lich}</td>
                <td>${schedule.Ten_tour || 'N/A'}</td>
                <td>${formatDate(schedule.Ngay_khoi_hanh)}</td>
                <td>${formatDate(schedule.Ngay_ket_thuc)}</td>
                <td>${schedule.So_cho_con_lai || 0} / ${schedule.So_cho || 0}</td>
                <td>${schedule.So_booking || 0}</td>
                <td><span class="badge bg-info">${getScheduleStatus(schedule)}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewScheduleBookings('${schedule.Ma_lich}')">
                        <i class="fas fa-eye"></i> Xem booking
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function getScheduleStatus(schedule) {
        const now = new Date();
        const start = new Date(schedule.Ngay_khoi_hanh);
        const end = new Date(schedule.Ngay_ket_thuc);
        
        if (start > now) return 'Sắp diễn ra';
        if (start <= now && end >= now) return 'Đang diễn ra';
        return 'Đã diễn ra';
    }

    // View schedule bookings
    window.viewScheduleBookings = async function(maLich) {
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/guide/schedule/${maLich}/bookings`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                displayBookings(result.data.bookings, maLich);
                showSection('bookings');
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
            showToast('Lỗi khi tải danh sách booking', 'error');
        }
    };

    // Display bookings
    function displayBookings(bookings, maLich) {
        const container = document.getElementById('bookingDetailsContent');
        const exportBtn = document.getElementById('exportBookingsBtn');
        
        exportBtn.style.display = bookings.length > 0 ? 'inline-block' : 'none';
        exportBtn.onclick = () => exportBookingsToExcel(bookings, maLich);
        
        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<div class="alert alert-info">Không có booking nào cho lịch này</div>';
            return;
        }
        
        let html = `
            <div class="mb-3">
                <h6>Lịch: ${maLich}</h6>
                <p class="text-muted">Tổng số booking: ${bookings.length}</p>
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Mã booking</th>
                            <th>Tên khách hàng</th>
                            <th>Email</th>
                            <th>Địa chỉ</th>
                            <th>Người lớn</th>
                            <th>Trẻ em</th>
                            <th>Trạng thái</th>
                            <th>Tổng tiền</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        bookings.forEach(booking => {
            html += `
                <tr>
                    <td>${booking.Ma_booking}</td>
                    <td>${booking.Ten_khach_hang || 'N/A'}</td>
                    <td>${booking.Email_khach_hang || 'N/A'}</td>
                    <td>${booking.Dia_chi || 'N/A'}</td>
                    <td>${booking.So_nguoi_lon || 0}</td>
                    <td>${booking.So_tre_em || 0}</td>
                    <td><span class="status-badge ${(booking.Trang_thai_booking || '').toLowerCase().replace(/\s+/g, '-')}">${booking.Trang_thai_booking || 'N/A'}</span></td>
                    <td>${CONFIG.formatCurrency(booking.Tong_tien || 0)}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    // Load reviews
    async function loadReviews() {
        if (!currentGuideId) {
            const loaded = await loadGuideProfile();
            if (!loaded || !currentGuideId) {
                console.error('❌ Không thể load guide profile');
                document.getElementById('reviewsList').innerHTML = '<div class="text-center text-muted py-4">Không thể tải dữ liệu</div>';
                return;
            }
        }
        
        try {
            const token = localStorage.getItem('token');
            const filter = document.getElementById('reviewFilter')?.value || 'all';
            
            const url = filter === 'all' 
                ? `${CONFIG.API_BASE_URL}/guide/reviews/${currentGuideId}`
                : `${CONFIG.API_BASE_URL}/guide/reviews/${currentGuideId}?rating=${filter}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                displayReviews(result.data.ratings);
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    // Display reviews
    function displayReviews(reviews) {
        const container = document.getElementById('reviewsList');
        
        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-4">Chưa có đánh giá nào</div>';
            return;
        }
        
        container.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="mb-1">${review.Ten_khach_hang || 'Khách hàng'}</h6>
                        <p class="text-muted mb-0 small">${review.Ten_tour || 'Tour'}</p>
                    </div>
                    <div class="star-rating">
                        ${'★'.repeat(review.Diem_huong_dan_vien || 0)}${'☆'.repeat(5 - (review.Diem_huong_dan_vien || 0))}
                    </div>
                </div>
                <p class="mb-2">${review.Noi_dung || 'Không có bình luận'}</p>
                <small class="text-muted">${formatDate(review.Ngay_danh_gia)}</small>
            </div>
        `).join('');
    }

    // Load profile form
    function loadProfileForm() {
        if (!currentGuide) {
            loadGuideProfile().then(() => {
                fillProfileForm();
            });
        } else {
            fillProfileForm();
        }
    }

    function fillProfileForm() {
        if (!currentGuide) return;
        
        document.getElementById('profileTen').value = currentGuide.Ten_huong_dan_vien || '';
        
        // Xử lý ngày sinh: chuyển từ ISO string hoặc Date object sang format YYYY-MM-DD
        let ngaySinh = '';
        if (currentGuide.Ngay_sinh) {
            try {
                const date = new Date(currentGuide.Ngay_sinh);
                if (!isNaN(date.getTime())) {
                    // Format: YYYY-MM-DD cho input type="date"
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    ngaySinh = `${year}-${month}-${day}`;
                } else {
                    // Nếu là string format YYYY-MM-DD, dùng trực tiếp
                    ngaySinh = currentGuide.Ngay_sinh.split('T')[0]; // Lấy phần trước T nếu có
                }
            } catch (e) {
                // Nếu parse lỗi, thử lấy phần đầu của string
                ngaySinh = String(currentGuide.Ngay_sinh).split('T')[0];
            }
        }
        document.getElementById('profileNgaySinh').value = ngaySinh;
        
        document.getElementById('profileGioiTinh').value = currentGuide.Gioi_tinh || 'Nam';
        document.getElementById('profileSoDienThoai').value = currentGuide.So_dien_thoai || '';
        document.getElementById('profileCccd').value = currentGuide.Cccd || '';
        document.getElementById('profileDiaChi').value = currentGuide.Dia_chi || '';
        document.getElementById('profileNgonNgu').value = currentGuide.Ngon_ngu || '';
        document.getElementById('profileKinhNghiem').value = currentGuide.Kinh_nghiem || '';
        
        if (currentGuide.Anh_dai_dien) {
            const preview = document.getElementById('profileAvatarPreview');
            // Xử lý đường dẫn ảnh (tránh duplicate /images)
            let imagePath = currentGuide.Anh_dai_dien;
            let imageUrl;
            
            if (imagePath.startsWith('http')) {
                imageUrl = imagePath;
            } else if (imagePath.startsWith('/images')) {
                // Đã có /images ở đầu, bỏ /images ở CONFIG.IMAGE_URL để tránh duplicate
                imageUrl = `${CONFIG.IMAGE_URL.replace('/images', '')}${imagePath}`;
            } else if (imagePath.startsWith('/')) {
                imageUrl = `${CONFIG.IMAGE_URL}${imagePath}`;
            } else {
                imageUrl = `${CONFIG.IMAGE_URL}/${imagePath}`;
            }
            
            preview.innerHTML = `
                <img src="${imageUrl}" 
                     alt="Avatar" 
                     style="max-width: 200px; border-radius: 8px;">
            `;
        }
        
        // Load certificates
        loadCertificates();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Schedule filter
        const scheduleFilter = document.getElementById('scheduleFilter');
        if (scheduleFilter) {
            scheduleFilter.addEventListener('change', loadSchedules);
        }
        
        // Review filter
        const reviewFilter = document.getElementById('reviewFilter');
        if (reviewFilter) {
            reviewFilter.addEventListener('change', loadReviews);
        }
        
        // Profile form
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', handleProfileSubmit);
        }
        
        // Avatar upload preview
        const avatarInput = document.getElementById('profileAnhDaiDien');
        if (avatarInput) {
            avatarInput.addEventListener('change', handleAvatarPreview);
        }
        
        // Certificate upload
        const addCertificateBtn = document.getElementById('addCertificateBtn');
        if (addCertificateBtn) {
            addCertificateBtn.addEventListener('click', handleAddCertificate);
        }
    }
    
    // Load certificates
    async function loadCertificates() {
        if (!currentGuideId) {
            const loaded = await loadGuideProfile();
            if (!loaded || !currentGuideId) {
                console.error('❌ Không thể load guide profile');
                document.getElementById('certificatesList').innerHTML = '<div class="text-center text-muted py-3">Không thể tải dữ liệu</div>';
                return;
            }
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_BASE_URL}/guide/certificates/${currentGuideId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                displayCertificates(result.data.certificates);
            }
        } catch (error) {
            console.error('Error loading certificates:', error);
            document.getElementById('certificatesList').innerHTML = '<div class="text-center text-muted py-3">Lỗi khi tải danh sách chứng chỉ</div>';
        }
    }
    
    // Display certificates
    function displayCertificates(certificates) {
        const container = document.getElementById('certificatesList');
        
        if (!certificates || certificates.length === 0) {
            container.innerHTML = '<div class="text-center text-muted py-3">Chưa có chứng chỉ nào</div>';
            return;
        }
        
        container.innerHTML = certificates.map(cert => {
            const isExpired = cert.Ngay_het_han && new Date(cert.Ngay_het_han) < new Date();
            const fileExt = cert.File_chung_chi ? cert.File_chung_chi.split('.').pop().toLowerCase() : '';
            const isPDF = fileExt === 'pdf';
            
            return `
                <div class="certificate-item card mb-3 ${isExpired ? 'border-warning' : ''}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${cert.Ten_chung_chi || 'Chứng chỉ'}</h6>
                                <p class="text-muted mb-1 small">
                                    ${cert.Loai_chung_chi ? `<span class="badge bg-info">${cert.Loai_chung_chi}</span> ` : ''}
                                    ${cert.Noi_cap ? `Nơi cấp: ${cert.Noi_cap}` : ''}
                                </p>
                                <p class="text-muted mb-0 small">
                                    ${cert.Ngay_cap ? `Ngày cấp: ${formatDate(cert.Ngay_cap)}` : ''}
                                    ${cert.Ngay_het_han ? ` | Hết hạn: ${formatDate(cert.Ngay_het_han)}` : ''}
                                    ${isExpired ? ' <span class="badge bg-warning">Đã hết hạn</span>' : ''}
                                </p>
                            </div>
                            <div class="ms-3">
                                ${cert.File_chung_chi ? (() => {
                                    let certUrl;
                                    const filePath = cert.File_chung_chi;
                                    if (filePath.startsWith('http')) {
                                        certUrl = filePath;
                                    } else if (filePath.startsWith('/images')) {
                                        // Đã có /images ở đầu, bỏ /images ở CONFIG.IMAGE_URL để tránh duplicate
                                        certUrl = `${CONFIG.IMAGE_URL.replace('/images', '')}${filePath}`;
                                    } else if (filePath.startsWith('/')) {
                                        certUrl = `${CONFIG.IMAGE_URL}${filePath}`;
                                    } else {
                                        certUrl = `${CONFIG.IMAGE_URL}/${filePath}`;
                                    }
                                    return `<a href="${certUrl}" target="_blank" class="btn btn-sm btn-outline-primary me-2">
                                        <i class="fas fa-${isPDF ? 'file-pdf' : 'image'}"></i> Xem
                                    </a>`;
                                })() : ''}
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteCertificate(${cert.Ma_chung_chi})">
                                    <i class="fas fa-trash"></i> Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Handle add certificate
    async function handleAddCertificate() {
        if (!currentGuideId) {
            const loaded = await loadGuideProfile();
            if (!loaded || !currentGuideId) {
                showToast('Lỗi: Không tìm thấy thông tin hướng dẫn viên', 'error');
                return;
            }
        }
        
        const name = document.getElementById('certificateName').value.trim();
        const type = document.getElementById('certificateType').value;
        const issuer = document.getElementById('certificateIssuer').value.trim();
        const issueDate = document.getElementById('certificateIssueDate').value;
        const expiryDate = document.getElementById('certificateExpiryDate').value;
        const file = document.getElementById('certificateFile').files[0];
        
        if (!name) {
            showToast('Vui lòng nhập tên chứng chỉ', 'error');
            document.getElementById('certificateName').focus();
            return;
        }
        
        if (!file) {
            showToast('Vui lòng chọn file chứng chỉ', 'error');
            document.getElementById('certificateFile').focus();
            return;
        }
        
        // Validation: Ngày cấp phải nhỏ hơn Ngày hết hạn
        if (issueDate && expiryDate) {
            const issue = new Date(issueDate);
            const expiry = new Date(expiryDate);
            
            if (issue >= expiry) {
                showToast('Ngày cấp phải nhỏ hơn Ngày hết hạn. Vui lòng kiểm tra lại!', 'error');
                document.getElementById('certificateIssueDate').focus();
                document.getElementById('certificateIssueDate').classList.add('is-invalid');
                document.getElementById('certificateExpiryDate').classList.add('is-invalid');
                return;
            }
        }
        
        // Xóa class invalid nếu có
        document.getElementById('certificateIssueDate').classList.remove('is-invalid');
        document.getElementById('certificateExpiryDate').classList.remove('is-invalid');
        
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('ma_huong_dan_vien', currentGuideId);
            formData.append('ten_chung_chi', name);
            formData.append('loai_chung_chi', type);
            formData.append('noi_cap', issuer);
            formData.append('ngay_cap', issueDate);
            formData.append('ngay_het_han', expiryDate || '');
            formData.append('file', file);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/guide/certificates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Không set Content-Type, để browser tự set với boundary cho multipart/form-data
                },
                body: formData
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('API endpoint không tìm thấy. Vui lòng kiểm tra lại server.');
                } else if (response.status === 403) {
                    throw new Error('Không có quyền thực hiện thao tác này.');
                }
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showToast('Thêm chứng chỉ thành công', 'success');
                
                // Clear form
                document.getElementById('certificateName').value = '';
                document.getElementById('certificateType').value = '';
                document.getElementById('certificateIssuer').value = '';
                document.getElementById('certificateIssueDate').value = '';
                document.getElementById('certificateExpiryDate').value = '';
                document.getElementById('certificateFile').value = '';
                
                // Reload certificates
                await loadCertificates();
            } else {
                showToast(result.message || 'Lỗi khi thêm chứng chỉ', 'error');
            }
        } catch (error) {
            console.error('Error adding certificate:', error);
            showToast('Lỗi khi thêm chứng chỉ', 'error');
        }
    }
    
    // Validate certificate dates (real-time validation)
    window.validateCertificateDates = function() {
        const issueDate = document.getElementById('certificateIssueDate').value;
        const expiryDate = document.getElementById('certificateExpiryDate').value;
        const errorDiv = document.getElementById('certificateDateError');
        const issueInput = document.getElementById('certificateIssueDate');
        const expiryInput = document.getElementById('certificateExpiryDate');
        
        // Xóa class invalid trước
        if (issueInput) issueInput.classList.remove('is-invalid');
        if (expiryInput) expiryInput.classList.remove('is-invalid');
        if (errorDiv) errorDiv.style.display = 'none';
        
        // Chỉ validate nếu cả 2 ngày đều có giá trị
        if (issueDate && expiryDate) {
            const issue = new Date(issueDate);
            const expiry = new Date(expiryDate);
            
            if (issue >= expiry) {
                if (issueInput) issueInput.classList.add('is-invalid');
                if (expiryInput) expiryInput.classList.add('is-invalid');
                if (errorDiv) errorDiv.style.display = 'block';
                return false;
            }
        }
        
        return true;
    };
    
    // Delete certificate
    window.deleteCertificate = async function(certificateId) {
        if (!confirm('Bạn có chắc muốn xóa chứng chỉ này?')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${CONFIG.API_BASE_URL}/guide/certificates/${certificateId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showToast('Xóa chứng chỉ thành công', 'success');
                await loadCertificates();
            } else {
                showToast(result.message || 'Lỗi khi xóa chứng chỉ', 'error');
            }
        } catch (error) {
            console.error('Error deleting certificate:', error);
            showToast('Lỗi khi xóa chứng chỉ', 'error');
        }
    };

    // Handle profile submit
    async function handleProfileSubmit(e) {
        e.preventDefault();
        
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            const userId = user.id || user.Id_user || user.id_user;
            
            if (!userId) {
                showToast('Lỗi: Không tìm thấy thông tin người dùng', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('ten_huong_dan_vien', document.getElementById('profileTen').value);
            formData.append('ngay_sinh', document.getElementById('profileNgaySinh').value);
            formData.append('gioi_tinh', document.getElementById('profileGioiTinh').value);
            formData.append('so_dien_thoai', document.getElementById('profileSoDienThoai').value);
            formData.append('cccd', document.getElementById('profileCccd').value);
            formData.append('dia_chi', document.getElementById('profileDiaChi').value);
            formData.append('ngon_ngu', document.getElementById('profileNgonNgu').value);
            formData.append('kinh_nghiem', document.getElementById('profileKinhNghiem').value);
            
            const avatarFile = document.getElementById('profileAnhDaiDien').files[0];
            if (avatarFile) {
                formData.append('anh_dai_dien', avatarFile);
            }
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/guide/profile/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Không set Content-Type, để browser tự set với boundary cho multipart/form-data
                },
                body: formData
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    const errorText = await response.text();
                    console.error('404 Error:', errorText);
                    showToast('Lỗi: Không tìm thấy hướng dẫn viên. Vui lòng liên hệ admin.', 'error');
                    return;
                } else if (response.status === 403) {
                    showToast('Lỗi: Không có quyền cập nhật thông tin này', 'error');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success') {
                const message = result.message || 'Cập nhật thông tin thành công';
                showToast(message, 'success');
                
                // Reload profile để lấy thông tin mới
                await loadGuideProfile();
                
                // Nếu vừa tạo profile mới, reload lại dashboard
                if (message.includes('Tạo hồ sơ')) {
                    setTimeout(() => {
                        showSection('dashboard');
                    }, 1000);
                }
            } else {
                showToast(result.message || 'Lỗi khi cập nhật', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.message.includes('JSON')) {
                showToast('Lỗi: Server trả về response không hợp lệ. Vui lòng kiểm tra lại.', 'error');
            } else {
                showToast('Lỗi khi cập nhật thông tin: ' + error.message, 'error');
            }
        }
    }

    // Handle avatar preview
    function handleAvatarPreview(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('profileAvatarPreview');
                preview.innerHTML = `
                    <img src="${e.target.result}" 
                         alt="Preview" 
                         style="max-width: 200px; border-radius: 8px;">
                `;
            };
            reader.readAsDataURL(file);
        }
    }

    // Add notification
    function addNotification(notification) {
        notifications.unshift(notification);
        unreadCount++;
        updateNotificationBadge();
        updateNotificationList();
    }

    // Update notification badge
    function updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Update notification list
    function updateNotificationList() {
        const list = document.getElementById('notificationList');
        if (!list) return;
        
        if (notifications.length === 0) {
            list.innerHTML = '<div class="px-3 py-2 text-muted text-center"><small>Chưa có thông báo mới</small></div>';
            return;
        }
        
        list.innerHTML = notifications.slice(0, 10).map(notif => `
            <li>
                <a class="dropdown-item" href="#">
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${notif.title}</strong>
                            <p class="mb-0 small text-muted">${notif.message}</p>
                        </div>
                        <small class="text-muted">${formatTime(notif.timestamp)}</small>
                    </div>
                </a>
            </li>
        `).join('');
    }

    // Export bookings to Excel
    function exportBookingsToExcel(bookings, maLich) {
        // Simple CSV export
        let csv = 'Mã booking,Tên khách hàng,SĐT,Người lớn,Trẻ em,Trạng thái,Tổng tiền\n';
        
        bookings.forEach(booking => {
            csv += `${booking.Ma_booking},${booking.Ten_khach_hang || ''},${booking.Sdt_khach_hang || ''},${booking.So_nguoi_lon || 0},${booking.So_tre_em || 0},${booking.Trang_thai_booking || ''},${booking.Tong_tien || 0}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bookings_${maLich}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    // Show toast
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toastNotification');
        const toastBody = document.getElementById('toastBody');
        
        toastBody.textContent = message;
        toast.className = `toast ${type}`;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    // Format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    }

    // Format time
    function formatTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleTimeString('vi-VN');
    }

    // Logout
    function logout() {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (socket) {
                socket.disconnect();
            }
            window.location.href = '/login.html';
        }
    }
})();


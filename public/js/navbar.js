// Navbar functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Navbar script loaded');
    loadNavbar();
    setupAuthButtons();
});

// Render navbar HTML vào container
function renderNavbar() {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) {
        // Nếu không có container, chỉ cập nhật UI navbar hiện có
        return;
    }
    
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userName = user ? (user.ten_hien_thi || user.username || user.ten_tai_khoan || user.id || 'User') : 'Người dùng';
    const userAvatar = user ? (user.anh_dai_dien || null) : null;
    const isAdmin = user && (user.role === 'Admin' || user.loai_tai_khoan === 'Admin');
    
    const navbarHTML = `
        <nav class="navbar navbar-expand-lg navbar-light sticky-top">
            <div class="container">
                <a class="navbar-brand" href="/">
                    <div class="logo-circle">D</div>
                    <span class="brand-text">D-Travel</span>
                </a>
                
                <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav mx-auto">
                        <li class="nav-item">
                            <a class="nav-link" href="/">Trang chủ</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/#tours">Tours</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" href="/#destinations">Điểm đến</a>
                        </li>
                        ${isAdmin ? `
                        <li class="nav-item">
                            <a class="nav-link" href="/admin.html"><i class="fas fa-cogs me-1"></i> Quản trị</a>
                        </li>
                        ` : ''}
                    </ul>
                    
                    ${token && user ? `
                    <div class="d-flex align-items-center gap-3">
                        <span class="welcome-text d-flex align-items-center">
                            ${userAvatar ? `
                                <img src="${userAvatar}" alt="${userName}" class="user-avatar me-2" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #667eea;">
                            ` : `
                                <i class="fas fa-user-check me-1"></i>
                            `}
                            Chào mừng, <strong class="ms-1">${userName}</strong>!
                        </span>
                        <div class="dropdown">
                            <button class="btn btn-outline-primary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-user-circle me-1"></i> Tài khoản
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li><a class="dropdown-item" href="/profile.html"><i class="fas fa-id-card me-2"></i> Thông tin cá nhân</a></li>
                                <li><a class="dropdown-item" href="/my-bookings.html"><i class="fas fa-history me-2"></i> Lịch sử đặt tour</a></li>
                                <li><a class="dropdown-item" href="/rate-tour.html"><i class="fas fa-star me-2"></i> Đánh giá của tôi</a></li>
                            </ul>
                        </div>
                        <button class="btn btn-outline-danger btn-sm" id="logoutBtn">
                            <i class="fas fa-sign-out-alt me-1"></i> Đăng xuất
                        </button>
                    </div>
                    ` : `
                    <div class="d-flex align-items-center gap-3">
                        <a href="/auth.html" class="btn btn-outline-primary btn-sm">
                            <i class="fas fa-sign-in-alt me-1"></i> Đăng nhập
                        </a>
                        <a href="/auth.html" class="btn btn-primary btn-sm">
                            <i class="fas fa-user-plus me-1"></i> Đăng ký
                        </a>
                    </div>
                    `}
                </div>
            </div>
        </nav>
    `;
    
    navbarContainer.innerHTML = navbarHTML;
    
    // Thiết lập sự kiện sau khi render
    setupNavbarEvents();
    setupAuthButtons();
}

// Load và cập nhật navbar
function loadNavbar() {
    console.log('Loading navbar...');
    
    // Nếu có navbar-container, render navbar mới
    if (document.getElementById('navbar-container')) {
        renderNavbar();
        return;
    }
    
    // Nếu không có container, chỉ cập nhật UI navbar hiện có
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    
    // Cập nhật UI dựa trên trạng thái đăng nhập
    updateNavbarUI(token, user);
    
    // Thiết lập các sự kiện cho navbar
    setupNavbarEvents();
}

// Cập nhật UI navbar dựa trên trạng thái đăng nhập
function updateNavbarUI(token, user) {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const welcomeText = document.querySelector('.welcome-text');
    
    if (token && user) {
        // Đã đăng nhập: Hiển thị menu người dùng
        if (authButtons) authButtons.classList.add('d-none');
        if (userMenu) {
            userMenu.classList.remove('d-none');
            if (userName) {
                userName.textContent = user.ten_hien_thi || user.username || user.ten_tai_khoan || user.id || 'User';
            }
            
            // Cập nhật ảnh đại diện nếu có
            if (welcomeText && user.anh_dai_dien) {
                // Tìm icon hoặc ảnh hiện có
                const existingIcon = welcomeText.querySelector('i.fa-user-check');
                const existingImg = welcomeText.querySelector('img.user-avatar');
                
                if (existingIcon && !existingImg) {
                    // Thay thế icon bằng ảnh
                    const img = document.createElement('img');
                    img.src = user.anh_dai_dien;
                    img.alt = userName?.textContent || 'User';
                    img.className = 'user-avatar me-2';
                    img.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #667eea;';
                    existingIcon.replaceWith(img);
                } else if (existingImg) {
                    // Cập nhật ảnh hiện có
                    existingImg.src = user.anh_dai_dien;
                    existingImg.alt = userName?.textContent || 'User';
                }
            }
        }
        
        // Hiển thị nút Admin nếu người dùng là admin
        if (user.role === 'Admin' || user.loai_tai_khoan === 'Admin') {
            const adminButton = document.createElement('li');
            adminButton.className = 'nav-item';
            adminButton.innerHTML = `<a class="nav-link" href="/admin.html"><i class="fas fa-cogs me-1"></i> Quản trị</a>`;
            
            const navList = document.querySelector('.navbar-nav');
            if (navList) {
                navList.appendChild(adminButton);
            }
        }
    } else {
        // Chưa đăng nhập: Hiển thị nút đăng nhập/đăng ký
        if (authButtons) authButtons.classList.remove('d-none');
        if (userMenu) userMenu.classList.add('d-none');
    }
}

// Thiết lập các sự kiện cho navbar
function setupNavbarEvents() {
    // Xử lý sự kiện cuộn trang - thêm class sticky-top khi cuộn
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('sticky-top');
            } else {
                navbar.classList.remove('sticky-top');
            }
        }
    });
    
    // Xử lý sự kiện đóng/mở menu trên mobile
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler) {
        navbarToggler.addEventListener('click', function() {
            const target = document.querySelector(this.dataset.bsTarget || '#navbarNav');
            if (target) {
                target.classList.toggle('show');
            }
        });
    }
}

// Thiết lập các nút đăng nhập/đăng ký/đăng xuất
function setupAuthButtons() {
    // Xử lý nút đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Xóa thông tin đăng nhập
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Chuyển hướng về trang chủ
            window.location.href = '/';
        });
    }
}

// Cung cấp các hàm cho global scope
window.loadNavbar = loadNavbar;
window.renderNavbar = renderNavbar;
window.setupAuthButtons = setupAuthButtons; 
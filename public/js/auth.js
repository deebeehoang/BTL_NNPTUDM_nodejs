// auth.js - Authentication handling
// Sử dụng API_BASE_URL từ CONFIG nếu có
const API_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : '/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * Kiểm tra xem người dùng đã đăng nhập hay chưa
 * @returns {boolean} - true nếu đã đăng nhập, false nếu chưa
 */
function isLoggedIn() {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    
    return !!(token && userJson);
}

// Export hàm isLoggedIn cho sử dụng toàn cục
window.isLoggedIn = isLoggedIn;

// Xử lý đăng ký
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            alert('Mật khẩu xác nhận không khớp!');
            return;
        }

        // Kiểm tra các trường dữ liệu bắt buộc
        const requiredFields = [
            {id: 'registerId', message: 'Tên tài khoản'},
            {id: 'registerEmail', message: 'Email'},
            {id: 'registerPassword', message: 'Mật khẩu'}
        ];
        
        let missingFields = [];
        
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                missingFields.push(field.message);
                if (element) {
                    element.classList.add('is-invalid');
                }
            } else if (element) {
                element.classList.remove('is-invalid');
            }
        });
        
        if (missingFields.length > 0) {
            alert(`Vui lòng điền đầy đủ thông tin: ${missingFields.join(', ')}`);
            return;
        }

        // Tạo dữ liệu người dùng với các trường cơ bản
        const userData = {
            id_user: document.getElementById('registerId').value,
            email: document.getElementById('registerEmail').value,
            password: password,
            loai_tai_khoan: 'Khach_hang' // Mặc định là khách hàng
        };

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Hiển thị thông báo thành công
                alert('Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.');
                
                // Chuyển hướng đến trang đăng nhập
                window.location.href = '/login.html';
            } else {
                alert(data.message || 'Đăng ký thất bại. Vui lòng thử lại!');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại!');
        }
    });
}

// Xử lý đăng nhập
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const loginData = {
            id_user: document.getElementById('loginId').value,
            password: document.getElementById('loginPassword').value
        };
        
        try {
            console.log('Đang đăng nhập với:', loginData);
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });
            
            const data = await response.json();
            console.log('Dữ liệu phản hồi:', data);
            
            if (response.ok) {
                // Lưu token và thông tin người dùng
                localStorage.setItem(TOKEN_KEY, data.data.token);
                
                // Lưu thông tin người dùng chi tiết hơn
                const user = {
                    id_user: data.data.user.id || data.data.user.id_user,
                    id: data.data.user.id || data.data.user.id_user,
                    email: data.data.user.email,
                    ten: data.data.user.ten_hien_thi || data.data.user.id || data.data.user.id_user || data.data.user.ten || data.data.user.username || 'Người dùng',
                    ten_hien_thi: data.data.user.ten_hien_thi || null,
                    anh_dai_dien: data.data.user.anh_dai_dien || null,
                    loai_tai_khoan: data.data.user.role || data.data.user.loai_tai_khoan,
                    role: data.data.user.role || data.data.user.loai_tai_khoan
                };
                console.log('User object created:', user);
                console.log('User role from response:', data.data.user.role);
                console.log('User role type:', typeof data.data.user.role);
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                
                // Cập nhật UI trước khi chuyển hướng
                updateUIAfterLogin(user);
                
                // Hiển thị thông báo thành công
                alert('Đăng nhập thành công!');
                
                // Chuyển hướng dựa vào loại tài khoản sau một khoảng thời gian nhỏ
                setTimeout(() => {
                    console.log('User role from auth.js:', user.loai_tai_khoan);
                    console.log('Role comparison from auth.js:', user.loai_tai_khoan === 'Admin');
                    console.log('Role type:', typeof user.loai_tai_khoan);
                    console.log('Role length:', user.loai_tai_khoan ? user.loai_tai_khoan.length : 'undefined');
                    
                    const userRole = user.loai_tai_khoan || user.role;
                    
                    if (userRole === 'Admin') {
                        console.log('Redirecting to admin page from auth.js');
                        window.location.href = '/admin.html';
                    } else if (userRole === 'Huong_dan_vien') {
                        console.log('Redirecting to guide page from auth.js');
                        window.location.href = '/guide.html';
                    } else {
                        console.log('Redirecting to home page from auth.js');
                        // Thiết lập biến để hiển thị thông báo chào mừng sau khi chuyển trang
                        sessionStorage.setItem('showWelcome', 'true');
                        window.location.href = '/';
                    }
                }, 500);
            } else {
                const loginError = document.getElementById('loginError');
                if (loginError) {
                    loginError.textContent = data.message || 'Đăng nhập thất bại';
                    loginError.style.display = 'block';
                } else {
                    alert(data.message || 'Đăng nhập thất bại');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Có lỗi xảy ra khi đăng nhập');
        }
    });
}

// Cập nhật UI ngay sau khi đăng nhập thành công
function updateUIAfterLogin(user) {
    // Ẩn nút đăng nhập/đăng ký
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.classList.add('d-none');
    }
    
    // Hiển thị menu người dùng
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.remove('d-none');
        
        // Hiển thị tên người dùng
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = user.ten || user.id_user || 'Người dùng';
        }
    }
    
    // Kích hoạt sự kiện storage để các tab khác nhận biết thay đổi
    window.dispatchEvent(new Event('storage'));
    
    console.log('UI đã được cập nhật sau đăng nhập:', user);
}

// Xử lý đăng xuất
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Xóa thông tin đăng nhập
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            
            // Hiển thị thông báo đăng xuất
            alert('Đã đăng xuất thành công!');
            
            // Làm mới trang để cập nhật giao diện
            window.location.href = '/';
        });
    }
}

// Kiểm tra trạng thái đăng nhập và cập nhật giao diện
function checkAuthStatus() {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    
    if (token && userJson) {
        try {
            const user = JSON.parse(userJson);
            
            // Ẩn nút đăng nhập/đăng ký
            const authButtons = document.getElementById('authButtons');
            if (authButtons) {
                authButtons.classList.add('d-none');
            }
            
            // Hiển thị menu người dùng
            const userMenu = document.getElementById('userMenu');
            if (userMenu) {
                userMenu.classList.remove('d-none');
                
                // Hiển thị tên người dùng
                const userName = document.getElementById('userName');
                if (userName) {
                    userName.textContent = user.ten_hien_thi || user.ten || user.id_user || 'Người dùng';
                }
                
                // Hiển thị ảnh đại diện nếu có
                const userAvatar = document.getElementById('userAvatar');
                const userIcon = document.getElementById('userIcon');
                if (user.anh_dai_dien) {
                    if (userAvatar) {
                        userAvatar.src = user.anh_dai_dien;
                        userAvatar.alt = userName?.textContent || 'User';
                        userAvatar.classList.remove('d-none');
                    }
                    if (userIcon) {
                        userIcon.classList.add('d-none');
                    }
                } else {
                    if (userAvatar) {
                        userAvatar.classList.add('d-none');
                    }
                    if (userIcon) {
                        userIcon.classList.remove('d-none');
                    }
                }
            }
            
            // Kiểm tra nếu cần hiển thị thông báo chào mừng
            if (sessionStorage.getItem('showWelcome') === 'true') {
                showWelcomeMessage(user.ten || user.id_user || 'Người dùng');
                // Xóa biến session để không hiển thị lại khi làm mới trang
                sessionStorage.removeItem('showWelcome');
            }
            
            console.log('Đã đăng nhập với tài khoản:', user.ten || user.id_user || 'Người dùng');
            return true;
        } catch (error) {
            console.error('Lỗi khi phân tích dữ liệu người dùng:', error);
            // Xóa dữ liệu không hợp lệ
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        }
    }
    
    // Hiển thị nút đăng nhập/đăng ký
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.classList.remove('d-none');
    }
    
    // Ẩn menu người dùng
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.add('d-none');
    }
    
    console.log('Chưa đăng nhập');
    return false;
}

// Hiển thị thông báo chào mừng
function showWelcomeMessage(username) {
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const welcomeUserName = document.getElementById('welcomeUserName');
        if (welcomeUserName) {
            welcomeUserName.textContent = username;
        }
        
        // Hiển thị thông báo
        welcomeMessage.style.display = 'block';
        
        // Tự động ẩn thông báo sau 5 giây
        setTimeout(() => {
            welcomeMessage.style.display = 'none';
        }, 5000);
    }
}

/**
 * Lấy thông tin chi tiết người dùng từ API
 * @returns {Promise} - Promise chứa thông tin người dùng
 */
async function fetchUserProfile() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
        return null;
    }
    
        try {
            const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin người dùng');
        }
        
        const data = await response.json();
        console.log('Thông tin người dùng từ API:', data);
        
        // Nếu người dùng là khách hàng, lấy thêm thông tin khách hàng
        if (data.data.user && (data.data.user.role === 'Khach_hang' || data.data.user.role === 'Customer')) {
            try {
                const customerResponse = await fetch(`${API_URL}/customers/me`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (customerResponse.ok) {
                    const customerData = await customerResponse.json();
                    console.log('Thông tin khách hàng từ API:', customerData);
                    
                    if (customerData.status === 'success' && customerData.data.customer) {
                        // Gán thêm thông tin khách hàng vào kết quả
                        data.data.user.details = customerData.data.customer;
                        data.data.user.account = customerData.data.account;
                        data.data.user.ma_khach_hang = customerData.data.customer.Ma_khach_hang;
                        data.data.user.id_user = customerData.data.customer.Id_user;
                    }
                }
            } catch (customerError) {
                console.error('Lỗi khi lấy thông tin khách hàng:', customerError);
            }
        }
        
        return data;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        return null;
    }
}

// Export hàm fetchUserProfile cho sử dụng toàn cục
window.fetchUserProfile = fetchUserProfile;

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupLogout();
});

// Kiểm tra lại trạng thái đăng nhập sau khi trang tải xong
window.addEventListener('load', function() {
    setTimeout(function() {
        // Kiểm tra lại sau khi trang đã tải hoàn toàn
        checkAuthStatus();
    }, 100);
});

// Lắng nghe sự kiện lưu trữ - bắt các thay đổi trong localStorage (đăng nhập/đăng xuất)
window.addEventListener('storage', function(e) {
    if (e.key === TOKEN_KEY || e.key === USER_KEY) {
        console.log('Phát hiện thay đổi trong localStorage:', e.key);
        checkAuthStatus();
    }
});

/**
 * Đảm bảo có thông tin khách hàng trước khi thực hiện các thao tác
 * @returns {Promise<Object>} - Thông tin khách hàng
 */
async function ensureCustomerInfo() {
  console.log('Đang kiểm tra thông tin khách hàng...');
  
  // Kiểm tra đăng nhập
  if (!isLoggedIn()) {
    console.error('Người dùng chưa đăng nhập');
    return null;
  }
  
  try {
    // Lấy token từ localStorage
    const token = localStorage.getItem(TOKEN_KEY);
    
    // Gọi API để lấy thông tin khách hàng
    const response = await fetch(`${API_URL}/customers/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Parse kết quả
    const data = await response.json();
    console.log('Dữ liệu khách hàng từ API:', data);
    
    if (response.ok && data.status === 'success' && data.data.customer) {
      console.log('✅ Đã tìm thấy thông tin khách hàng:', data.data.customer);
      return data.data.customer;
    }
    
    // Nếu không tìm thấy, tạo thông tin khách hàng mới
    console.log('⚠️ Không tìm thấy thông tin khách hàng, đang tạo mới...');
    
    // Lấy thông tin người dùng từ localStorage
    const userJson = localStorage.getItem(USER_KEY);
    const user = JSON.parse(userJson);
    
    // Tạo dữ liệu khách hàng mới - đảm bảo đầy đủ theo cấu trúc
    // CREATE TABLE Khach_hang (
    //     Ma_khach_hang VARCHAR(20) NOT NULL PRIMARY KEY,
    //     Id_user VARCHAR(50) NOT NULL UNIQUE,
    //     Ten_khach_hang VARCHAR(50) NOT NULL,
    //     Ngay_sinh DATE NOT NULL,
    //     Gioi_tinh VARCHAR(10) NOT NULL,
    //     Dia_chi VARCHAR(100) NOT NULL,
    //     Cccd VARCHAR(15) NOT NULL,
    //     FOREIGN KEY (Id_user) REFERENCES Tai_khoan(Id_user)
    // );
    
    // Tạo ngày sinh hợp lệ
    const defaultDOB = new Date(2000, 0, 1);
    const formattedDOB = defaultDOB.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const customerData = {
      ten_khach_hang: user.ten || user.id_user || 'Khách hàng',
      ngay_sinh: formattedDOB,  // Đảm bảo đúng định dạng DATE
      gioi_tinh: 'Nam',         // Giá trị mặc định
      dia_chi: 'Cập nhật sau',  // Giá trị mặc định
      cccd: '000000000000'      // Giá trị mặc định
    };
    
    console.log('📄 Dữ liệu khách hàng sẽ tạo:', customerData);
    
    // Gọi API để tạo thông tin khách hàng
    const createResponse = await fetch(`${API_URL}/customers/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(customerData)
    });
    
    const createData = await createResponse.json();
    console.log('Kết quả tạo khách hàng:', createData);
    
    if (createResponse.ok && createData.status === 'success') {
      console.log('✅ Đã tạo thông tin khách hàng mới thành công');
      
      // Gọi API để lấy lại thông tin khách hàng vừa tạo
      const getNewCustomerResponse = await fetch(`${API_URL}/customers/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const newCustomerData = await getNewCustomerResponse.json();
      
      if (getNewCustomerResponse.ok && newCustomerData.status === 'success' && newCustomerData.data.customer) {
        console.log('✅ Khách hàng mới:', newCustomerData.data.customer);
        return newCustomerData.data.customer;
      } else {
        console.error('❌ Không thể lấy thông tin khách hàng sau khi tạo');
        return null;
      }
    } else {
      console.error('❌ Không thể tạo thông tin khách hàng:', createData.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra thông tin khách hàng:', error);
    return null;
  }
}

// Export hàm cho sử dụng toàn cục
window.ensureCustomerInfo = ensureCustomerInfo;
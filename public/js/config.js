// Frontend Application Configuration
const CONFIG = {
    // API Endpoints
    API_BASE_URL: 'http://localhost:5000/api',
    IMAGE_URL: 'http://localhost:5000/images',
    
    // Authentication Endpoints
    ENDPOINTS: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        PROFILE: '/users/profile',
        
        // Tour-related Endpoints
        TOURS: {
            SEARCH: '/tours/search',
            LIST: '/tours',
            DETAILS: '/tours/'
        },
        
        // Booking Endpoints
        BOOKINGS: {
            CREATE: '/bookings/create',
            LIST: '/bookings',
            UPDATE: '/bookings/'
        },
        
        // Admin Endpoints
        ADMIN: {
            DASHBOARD_STATS: '/admin/dashboard-stats',
            TOURS_MANAGEMENT: '/admin/tours',
            DESTINATIONS_MANAGEMENT: '/admin/destinations',
            SERVICES_MANAGEMENT: '/admin/services',
            EXPORT: '/admin/export/',
            REVENUE: {
                MONTHLY: '/admin/revenue/monthly',
                YEARLY: '/admin/revenue/yearly'
            }
        }
    },
    
    // Application Settings
    APP: {
        NAME: 'Travel Adventure',
        VERSION: '1.0.0',
        DEFAULT_LANGUAGE: 'vi',
        CURRENCY: 'VND'
    },
    
    // Feature Flags
    FEATURES: {
        ENABLE_REGISTRATION: true,
        ENABLE_BOOKING: true,
        ENABLE_REVIEWS: true
    },
    
    // UI Configuration
    UI: {
        ITEMS_PER_PAGE: 10,
        MAX_FILE_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif']
    },
    
    // Error Handling
    ERRORS: {
        IGNORE_PATTERNS: [
            'runtime.lastError',
            'Receiving end does not exist',
            'Could not establish connection'
        ]
    },
    
    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(amount);
    },
    
    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('message-container');
        if (messageContainer) {
            messageContainer.innerHTML = `
                <div class="alert alert-${type}">${message}</div>
            `;
            setTimeout(() => {
                messageContainer.innerHTML = '';
            }, 3000);
        }
        
        // Thử sử dụng alertContainer nếu message-container không tồn tại
        if (!messageContainer) {
            const alertContainer = document.getElementById('alertContainer');
            if (alertContainer) {
                const alertElement = document.createElement('div');
                alertElement.className = `alert alert-${type} alert-dismissible fade show`;
                alertElement.innerHTML = `
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                alertContainer.appendChild(alertElement);
                setTimeout(() => {
                    alertElement.remove();
                }, 5000);
            }
        }
    },
    
    // Token Management
    getToken() {
        return localStorage.getItem('token');
    },
    
    setToken(token) {
        localStorage.setItem('token', token);
    },
    
    removeToken() {
        localStorage.removeItem('token');
    },
    
    // Xử lý lỗi fetch an toàn
    async safeFetch(url, options = {}) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            // Kiểm tra xem lỗi có phải là lỗi runtime.lastError không
            if (error && error.message && 
                this.ERRORS.IGNORE_PATTERNS.some(pattern => error.message.includes(pattern))) {
                console.warn('Đã bỏ qua lỗi:', error.message);
                return { ok: false, status: 0, json: () => Promise.resolve({ status: 'error', message: 'Network error' }) };
            }
            throw error;
        }
    }
};

// Xử lý lỗi toàn cục
window.addEventListener('error', function(e) {
    if (e && e.message && 
        CONFIG.ERRORS.IGNORE_PATTERNS.some(pattern => e.message.includes(pattern))) {
        e.preventDefault();
        console.warn('Đã bỏ qua lỗi:', e.message);
        return false;
    }
}, true);

// Xử lý lỗi Promise không bắt được
window.addEventListener('unhandledrejection', function(e) {
    if (e && e.reason && e.reason.message && 
        CONFIG.ERRORS.IGNORE_PATTERNS.some(pattern => e.reason.message.includes(pattern))) {
        e.preventDefault();
        console.warn('Đã bỏ qua lỗi Promise không xử lý:', e.reason.message);
        return false;
    }
});

// Không export module, để nó trở thành biến toàn cục
// export default CONFIG;
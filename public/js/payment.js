// Kiểm tra cấu hình API_URL từ config.js
if (typeof window.API_URL === 'undefined') {
    window.API_URL = CONFIG?.API_BASE_URL || '/api';
    console.log('API_URL được thiết lập từ CONFIG:', window.API_URL);
}

// Xử lý click ZaloPay button - đăng ký event sau khi DOM ready
let zalopayEventListenerAttached = false;

function setupZaloPayButton() {
    const zalopayBtn = document.getElementById('redirect-zalopay-btn');
    
    if (!zalopayBtn) {
        console.warn('⚠️ Button redirect-zalopay-btn chưa tồn tại');
        return;
    }
    
    // Chỉ đăng ký một lần để tránh duplicate listeners
    if (zalopayEventListenerAttached) {
        console.log('⚠️ Event listener đã được đăng ký rồi');
        return;
    }
    
    console.log('✅ Đã tìm thấy button redirect-zalopay-btn, đang đăng ký event listener');
    
    // Đăng ký event listener mới
    zalopayBtn.addEventListener('click', async function(event) {
        try {
            event.preventDefault();
            event.stopPropagation();
            
            console.log('🚀 ZaloPay button clicked!', event);
            console.log('🔍 Event details:', {
                target: event.target,
                currentTarget: event.currentTarget,
                button: zalopayBtn,
                sessionStorage: {
                    paymentBookingId: sessionStorage.getItem('paymentBookingId'),
                    paymentAmount: sessionStorage.getItem('paymentAmount')
                }
            });
            
            // Lấy bookingId và amount từ sessionStorage
            const bookingId = sessionStorage.getItem('paymentBookingId');
            const paymentAmount = sessionStorage.getItem('paymentAmount');
            
            console.log('📦 Booking ID:', bookingId);
            console.log('💰 Payment Amount:', paymentAmount);
            
            // Kiểm tra xem có đủ thông tin không
            if (!bookingId || !paymentAmount) {
                console.error('❌ Thiếu thông tin thanh toán!', { bookingId, paymentAmount });
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi',
                    text: 'Không tìm thấy thông tin thanh toán. Vui lòng thử lại.',
                    confirmButtonText: 'Đồng ý'
                });
                return;
            }
            
            // Lưu method vào sessionStorage để payment-method.html biết
            sessionStorage.setItem('paymentMethod', 'zalopay');
            
            // Debug: In ra tất cả sessionStorage
            console.log('📋 All sessionStorage before redirect:', {
                paymentBookingId: sessionStorage.getItem('paymentBookingId'),
                paymentAmount: sessionStorage.getItem('paymentAmount'),
                paymentMethod: sessionStorage.getItem('paymentMethod')
            });
            
            console.log('🔗 Redirecting to payment-method.html với booking ID:', bookingId);
            
            const redirectUrl = `payment-method.html?booking=${bookingId}&method=zalopay`;
            console.log('📍 Redirect URL:', redirectUrl);
            
            // Chuyển hướng đến trang payment-method.html với booking ID
            window.location.href = redirectUrl;
        } catch (error) {
            console.error('❌ Lỗi khi xử lý click button ZaloPay:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        }
    });
    
    zalopayEventListenerAttached = true;
    console.log('✅ Đã đăng ký event listener cho button ZaloPay');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - Payment page');
    
    // Global click handler để debug
    document.addEventListener('click', function(e) {
        // Kiểm tra nếu click vào button ZaloPay hoặc icon bên trong
        if (e.target.id && e.target.id === 'redirect-zalopay-btn') {
            console.log('🖱️ Direct click on ZaloPay button');
        } else if (e.target.closest('#redirect-zalopay-btn')) {
            console.log('🖱️ Clicked inside ZaloPay button');
        }
        
        // Đặc biệt xử lý cho ZaloPay button
        if (e.target.closest('#redirect-zalopay-btn')) {
            console.log('🎯 ZaloPay button clicked via delegation');
            const zalopayBtn = document.getElementById('redirect-zalopay-btn');
            if (zalopayBtn && !zalopayBtn.onclick) {
                console.log('⚠️ No onclick handler, triggering manual redirect');
                setupZaloPayButton();
            }
        }
    }, true); // Use capture phase to catch all clicks
    
    // Khởi tạo setup button ngay khi DOM ready
    setupZaloPayButton();
    
    // Khởi tạo URLSearchParams để sử dụng trong toàn bộ hàm
    const urlParams = new URLSearchParams(window.location.search);
    const currentUrl = window.location.href;
    
    // Kiểm tra xem có phải đang ở trang callback từ ZaloPay không
    // URL mẫu: https://test-ebooks-orbit.netlify.app/cart?requestId&amount=1600000&appid=2554&apptransid=250519_1747651166643_7703&bankcode=CC&checksum=5630027a7de7ad7b063817bdcc6fa09e5d5a0df9931e6742cacb2a1b876e1be9&discountamount=0&pmcid=36&status=1
    if ((urlParams.has('apptransid') || urlParams.has('apptransid')) && 
        urlParams.has('status') && 
        (urlParams.get('status') === '1' || urlParams.get('status') === 1) && 
        currentUrl.includes('cart')) {
        
        console.log('Phát hiện callback từ ZaloPay với thanh toán thành công');
        
        // Lưu trạng thái thanh toán thành công vào sessionStorage nếu cần
        sessionStorage.setItem('payment_success', 'true');
        
        // Xóa thông tin thanh toán để tránh xử lý lại
        sessionStorage.removeItem('paymentBookingId');
        sessionStorage.removeItem('paymentAmount');
        
        // Chuyển hướng về trang chủ
        window.location.href = 'index.html';
        return;
    }
    
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    console.log('Token từ localStorage:', token ? 'Đã có token' : 'Không có token');
    
    if (!token) {
        // Nếu chưa đăng nhập, hiển thị thông báo
        document.getElementById('loading-spinner').classList.add('d-none');
        document.getElementById('not-logged-in').classList.remove('d-none');
        return;
    }
    
    // Kiểm tra tham số booking từ URL
    const urlBookingId = urlParams.get('booking') || urlParams.get('bookingId');
    console.log('Booking ID từ URL:', urlBookingId);
    
    // Lấy thông tin thanh toán từ sessionStorage
    let bookingId = sessionStorage.getItem('paymentBookingId');
    let paymentAmount = sessionStorage.getItem('paymentAmount');
    
    console.log('📋 SessionStorage data:', {
        bookingId: bookingId,
        paymentAmount: paymentAmount
    });
    
    // Nếu không có trong sessionStorage thì lấy từ URL
    if ((!bookingId || !paymentAmount) && urlBookingId) {
        bookingId = urlBookingId;
        // Nếu không có amount trong URL, sẽ lấy từ API sau
        paymentAmount = urlParams.get("amount") || paymentAmount;
    }
    
    // Ghi lại vào sessionStorage để dùng tiếp
    sessionStorage.setItem("paymentBookingId", bookingId);
    sessionStorage.setItem("paymentAmount", paymentAmount);
    
    console.log("🔁 Lấy bookingId & amount từ URL và lưu vào sessionStorage:", {
        bookingId,
        paymentAmount
    });

    if (!bookingId) {
        // Nếu không có booking ID
        console.error('❌ Không tìm thấy booking ID');
        console.error('❌ URL params:', Object.fromEntries(urlParams));
        console.error('❌ SessionStorage:', {
            paymentBookingId: sessionStorage.getItem('paymentBookingId'),
            paymentAmount: sessionStorage.getItem('paymentAmount')
        });
        document.getElementById('loading-spinner').classList.add('d-none');
        document.getElementById('payment-error').classList.remove('d-none');
        return;
    }
    
    console.log('✅ Sử dụng booking ID:', bookingId);
    
    // Nếu không có paymentAmount, sẽ lấy từ API
    if (!paymentAmount) {
        console.log('⚠️ Không có paymentAmount, sẽ lấy từ API');
    }
    
    // Tải thông tin đặt tour
    loadBookingDetails(bookingId);
    
    // Lưu giá gốc cho xử lý mã giảm giá
    originalAmount = paymentAmount;
    
    // Hiển thị số tiền thanh toán
    const formattedAmount = formatCurrency(paymentAmount);
    
    // Kiểm tra phần tử tồn tại trước khi set giá trị để tránh lỗi null
    const setTextContentSafely = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    };
    
    setTextContentSafely('payment-amount', formattedAmount);
    setTextContentSafely('momo-amount', formattedAmount);
    setTextContentSafely('vnpay-amount', formattedAmount);
    setTextContentSafely('zalopay-amount', formattedAmount);
    setTextContentSafely('total-amount', formattedAmount);
    
    // Hiển thị giá gốc
    setTextContentSafely('original-amount', formattedAmount);
    
    // Hiển thị mã booking trong nội dung chuyển khoản
    const paymentNote = `TOUR_${bookingId}`;
    setTextContentSafely('payment-note', paymentNote);
    setTextContentSafely('momo-note', paymentNote);
    setTextContentSafely('vnpay-note', paymentNote);
    setTextContentSafely('zalopay-note', paymentNote);
    
    // Khởi tạo đồng hồ đếm ngược
    initCountdown();
    
    // Xử lý sự kiện chọn phương thức thanh toán
    setupPaymentMethodSelection();
    
    // Hiển thị phương thức thanh toán mặc định (Banking)
    console.log('🏁 Khởi tạo phương thức thanh toán mặc định: banking');
    showPaymentDetails('banking');
    
    // Xử lý sự kiện xác nhận thanh toán
    setupPaymentConfirmation(bookingId);
});

// Hàm tải thông tin đặt tour
function loadBookingDetails(bookingId, isFromUrl = false) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Không tìm thấy token đăng nhập');
        showLoadingError();
        return;
    }
    
    fetch(`${API_URL}/bookings/${bookingId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể tải thông tin đặt tour');
        }
        return response.json();
    })
    .then(data => {
        console.log('Thông tin đặt tour:', data);
        
        if (data.data && data.data.booking) {
            // Nếu đến từ URL và chưa có thông tin giá
            if (isFromUrl && !sessionStorage.getItem('paymentAmount')) {
                // Lưu thông tin giá vào sessionStorage
                const totalAmount = data.data.booking.Tong_tien;
                sessionStorage.setItem('paymentAmount', totalAmount);
                console.log('Đã lưu giá tiền vào sessionStorage:', totalAmount);
                
                // Tải lại trang để hiển thị đầy đủ thông tin
                window.location.reload();
                return;
            }
            
            displayBookingDetails(data.data.booking);
            
            // Hiển thị giao diện thanh toán
            hideLoadingSpinner();
            showPaymentContainer();
        } else {
            throw new Error('Không tìm thấy thông tin đặt tour');
        }
    })
    .catch(error => {
        console.error('Lỗi khi tải thông tin đặt tour:', error);
        showLoadingError();
    });
}

// Hiển thị thông tin đặt tour
function displayBookingDetails(booking) {
    if (!booking) {
        console.error('Không có thông tin booking');
        return;
    }
    
    // Sử dụng hàm setTextContentSafely đã định nghĩa trước đó
    const setTextContentSafely = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    };
    
    // Hiển thị mã booking
    setTextContentSafely('booking-id', booking.Ma_booking || 'N/A');
    
    // Hiển thị tên tour
    setTextContentSafely('tour-name', booking.Ten_tour || 'Không xác định');
    
    // Hiển thị thời gian
    const tourStartDate = booking.Ngay_bat_dau ? new Date(booking.Ngay_bat_dau).toLocaleDateString('vi-VN') : 'N/A';
    const tourEndDate = booking.Ngay_ket_thuc ? new Date(booking.Ngay_ket_thuc).toLocaleDateString('vi-VN') : 'N/A';
    setTextContentSafely('tour-time', `${tourStartDate} → ${tourEndDate}`);
    
    // Hiển thị số lượng người
    const adultCount = booking.So_nguoi_lon || 0;
    const childCount = booking.So_tre_em || 0;
    setTextContentSafely('tour-people', `${adultCount} người lớn, ${childCount} trẻ em`);
}

// Thiết lập lựa chọn phương thức thanh toán
function setupPaymentMethodSelection() {
    // Lấy tất cả phương thức thanh toán (ngoại trừ MoMo và VNPAY đã bị ẩn)
    const paymentMethods = document.querySelectorAll('.payment-method:not([style*="display: none"])');
    console.log('📋 Tìm thấy các phương thức thanh toán:', paymentMethods.length);
    
    if (!paymentMethods || paymentMethods.length === 0) {
        console.warn('Không tìm thấy các phương thức thanh toán');
        return;
    }
    
    paymentMethods.forEach(methodElement => {
        if (methodElement) {
            console.log('✅ Đăng ký event listener cho:', methodElement.getAttribute('data-method'));
            
            methodElement.addEventListener('click', function() {
                console.log('🖱️ User clicked payment method:', this.getAttribute('data-method'));
                
                // Loại bỏ selected khỏi tất cả các phương thức
                paymentMethods.forEach(m => m && m.classList.remove('selected'));
                
                // Thêm selected vào phương thức được chọn
                this.classList.add('selected');
                
                // Cập nhật trạng thái radio button
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                }
                
                // Hiển thị chi tiết phương thức tương ứng
                const method = this.getAttribute('data-method');
                if (method) {
                    console.log('📢 Đang hiển thị chi tiết cho phương thức:', method);
                    showPaymentDetails(method);
                }
            });
        }
    });
}

// Hiển thị chi tiết phương thức thanh toán
function showPaymentDetails(method) {
    console.log(`Hiển thị chi tiết thanh toán cho phương thức: ${method}`);
    
    // Ẩn tất cả chi tiết thanh toán
    const allDetails = ['banking-details', 'momo-details', 'vnpay-details', 'zalopay-details'];
    allDetails.forEach(detailId => {
        const element = document.getElementById(detailId);
        if (element) {
            element.classList.add('d-none');
        }
    });
    
    // Hiển thị chi tiết tương ứng
    const targetDetail = document.getElementById(`${method}-details`);
    if (targetDetail) {
        targetDetail.classList.remove('d-none');
        console.log(`✅ Hiển thị section ${method}-details`);
        
        // Đăng ký lại event listener cho button (đặc biệt cho ZaloPay)
        if (method === 'zalopay') {
            // Đợi DOM cập nhật
            setTimeout(() => {
                const zalopayBtn = document.getElementById('redirect-zalopay-btn');
                if (zalopayBtn) {
                    console.log('✅ Button ZaloPay đã hiển thị, đang đăng ký event listener');
                    console.log('🔍 Button element:', zalopayBtn);
                    console.log('🔍 Button HTML:', zalopayBtn.outerHTML);
                    
                    // Dùng inline onclick trực tiếp vì addEventListener có thể bị conflict
                    console.log('🔧 Gán inline onclick handler trực tiếp...');
                    
                    // Remove tất cả event listeners cũ
                    const newBtn = zalopayBtn.cloneNode(true);
                    zalopayBtn.parentNode.replaceChild(newBtn, zalopayBtn);
                    
                    // Gán inline onclick mới
                    const zalopayBtnNew = document.getElementById('redirect-zalopay-btn');
                    zalopayBtnNew.onclick = function(e) {
                        console.log('🎯 Inline onclick handler triggered!');
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const bookingId = sessionStorage.getItem('paymentBookingId');
                        const paymentAmount = sessionStorage.getItem('paymentAmount');
                        
                        console.log('📦 Check before redirect:', { bookingId, paymentAmount });
                        
                        if (!bookingId || !paymentAmount) {
                            console.error('❌ Thiếu thông tin thanh toán!', { bookingId, paymentAmount });
                            alert('Không tìm thấy thông tin thanh toán. Vui lòng thử lại.');
                            return false;
                        }
                        
                        sessionStorage.setItem('paymentMethod', 'zalopay');
                        const redirectUrl = `payment-method.html?booking=${bookingId}&method=zalopay`;
                        console.log('🔗 Redirecting to:', redirectUrl);
                        
                        window.location.href = redirectUrl;
                        return false;
                    };
                    
                    console.log('✅ Đã gán inline onclick handler cho button mới');
                } else {
                    console.error('❌ Button ZaloPay không tìm thấy sau khi hiển thị');
                }
            }, 100);
        }
    } else {
        console.error(`❌ Không tìm thấy section ${method}-details`);
    }
}

// Thiết lập xác nhận thanh toán
function setupPaymentConfirmation(bookingId) {
    // Hàm gắn sự kiện an toàn
    const addEventSafely = (elementId, eventType, handler) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
            console.log(`✅ Đã đăng ký event listener cho ${elementId}`, element);
        } else {
            console.error(`❌ Không tìm thấy element với id: ${elementId}`);
            console.error('Current DOM elements:', {
                zalopayBtn: document.getElementById('redirect-zalopay-btn'),
                momoBtn: document.getElementById('redirect-momo-btn'),
                bankingBtn: document.getElementById('confirm-payment-btn')
            });
        }
    };
    
    // Xử lý sự kiện xác nhận thanh toán ngân hàng
    addEventSafely('confirm-payment-btn', 'click', function() {
        confirmPayment(bookingId, 'banking');
    });
    
    // Xử lý sự kiện thanh toán MoMo
    addEventSafely('redirect-momo-btn', 'click', async function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('🚀 Bắt đầu thanh toán MoMo cho booking:', bookingId);
        console.log('📋 Event details:', event);
        
        // Lấy amount từ sessionStorage hoặc từ thông tin booking
        const paymentAmount = sessionStorage.getItem('paymentAmount');
        
        if (!paymentAmount) {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: 'Không tìm thấy thông tin số tiền thanh toán. Vui lòng thử lại.'
            });
            return;
        }
        
        console.log('💰 Payment amount:', paymentAmount);
        
        // Hiển thị loading
        Swal.fire({
            title: 'Đang tạo giao dịch...',
            text: 'Vui lòng đợi trong giây lát',
            icon: 'info',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    
        try {
            const response = await fetch(`${API_URL}/payment/momo/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    bookingId: bookingId,
                    amount: parseInt(paymentAmount),
                    timestamp: Date.now()
                })
            });

            const data = await response.json();
            console.log('📱 MoMo API response:', data);
            
            if (!response.ok) {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi thanh toán',
                    text: data.message || 'Không thể tạo giao dịch MoMo'
                });
                return;
            }
            
            if (data && data.payUrl) {
                // Lưu thông tin để sau này xác nhận thanh toán
                if (data.orderId) {
                    sessionStorage.setItem('momoOrderId', data.orderId);
                }
                if (data.requestId) {
                    sessionStorage.setItem('momoRequestId', data.requestId);
                }
                
                // ✅ Chuyển đến trang thanh toán MoMo
                console.log('🔗 Redirecting to MoMo payment:', data.payUrl);
                window.location.href = data.payUrl;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi',
                    text: 'Không nhận được đường dẫn thanh toán MoMo.'
                });
            }
        } catch (err) {
            console.error('❌ MoMo payment error:', err);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
            });
        }
    });
    
    // Xử lý sự kiện thanh toán VNPAY
    // TÍNH NĂNG TẠM THỜI BỊ ẨN
    /*
    addEventSafely('redirect-vnpay-btn', 'click', function() {
        // Trong thực tế, đây sẽ chuyển hướng đến cổng thanh toán VNPAY
        // Nhưng trong demo này, chúng ta sẽ giả lập thanh toán thành công
        Swal.fire({
            title: 'Đang chuyển hướng...',
            text: 'Bạn sẽ được chuyển đến cổng thanh toán VNPAY',
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Tiếp tục',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                // Giả lập thanh toán thành công sau 2 giây
                Swal.fire({
                    title: 'Đang xử lý...',
                    text: 'Vui lòng đợi trong giây lát',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                        setTimeout(() => {
                            confirmPayment(bookingId, 'vnpay');
                        }, 2000);
                    }
                });
            }
        });
    });
    */
    
    // Không có button confirm-zalopay-btn trong payment.html, chỉ có redirect-zalopay-btn
    // Button redirect-zalopay-btn đã được xử lý bằng event delegation ở trên
}

// Xác nhận thanh toán
function confirmPayment(bookingId, paymentMethod) {
    if (!bookingId || !paymentMethod) {
        console.error('Thiếu thông tin thanh toán', { bookingId, paymentMethod });
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: 'Thiếu thông tin thanh toán. Vui lòng thử lại.'
        });
        return;
    }
    
    // Từ chối các phương thức thanh toán đã bị ẩn
    if (paymentMethod === 'vnpay') {
        console.error('Phương thức thanh toán tạm thời bị vô hiệu hóa', { paymentMethod });
        
        Swal.fire({
            icon: 'warning',
            title: 'Tạm thời không khả dụng',
            text: 'Phương thức thanh toán này hiện đang tạm ngưng. Vui lòng chọn phương thức thanh toán khác.'
        });
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Không tìm thấy token đăng nhập');
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi xác thực',
            text: 'Bạn cần đăng nhập lại để tiếp tục.'
        }).then(() => {
            window.location.href = 'login.html';
        });
        return;
    }

    // Lấy số tiền từ sessionStorage
    const paymentAmount = sessionStorage.getItem('paymentAmount');
    if (!paymentAmount) {
        console.error('Không tìm thấy số tiền thanh toán');
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: 'Không tìm thấy số tiền thanh toán. Vui lòng thử lại.'
        });
        return;
    }
    
    console.log('Bắt đầu xác nhận thanh toán với thông tin:', {
        bookingId,
        paymentMethod,
        amount: paymentAmount
    });

    // Hiển thị loading
    Swal.fire({
        title: 'Đang xử lý...',
        text: 'Vui lòng đợi trong giây lát',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Gửi yêu cầu cập nhật trạng thái đặt tour và tạo hóa đơn, checkout
    const requestData = {
        payment_method: paymentMethod,
        amount: parseFloat(paymentAmount),
        create_invoice: true,
        create_checkout: true
    };
    
    console.log('Gửi request đến API với data:', requestData);
    
    fetch(`${API_URL}/bookings/${bookingId}/payment`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        console.log('Nhận response từ API:', response);
        if (!response.ok) {
            throw new Error('Không thể xác nhận thanh toán');
        }
        return response.json();
    })
    .then(data => {
        console.log('Kết quả thanh toán:', data);
        
        // Hiển thị thông báo thành công
        Swal.fire({
            icon: 'success',
            title: 'Thanh toán thành công!',
            text: 'Cảm ơn bạn đã đặt tour với VietTravel',
            confirmButtonText: 'Xem lại đặt tour'
        }).then(() => {
            // Xóa thông tin thanh toán từ sessionStorage
            sessionStorage.removeItem('paymentBookingId');
            sessionStorage.removeItem('paymentAmount');
            sessionStorage.removeItem('zaloAppTransId');
            
            // Chuyển hướng về trang đặt tour
            window.location.href = 'my-bookings.html';
        });
    })
    .catch(error => {
        console.error('Lỗi khi xác nhận thanh toán:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: 'Không thể hoàn tất thanh toán. Vui lòng thử lại sau.'
        });
    });
}

// Khởi tạo đồng hồ đếm ngược
function initCountdown() {
    // Thời gian đếm ngược 15 phút (900 giây)
    let countdown = 15 * 60;
    const countdownElement = document.getElementById('payment-countdown');
    
    if (!countdownElement) {
        console.warn('Không tìm thấy phần tử đồng hồ đếm ngược');
        return;
    }
    
    // Cập nhật đồng hồ đếm ngược mỗi giây
    const countdownInterval = setInterval(function() {
        countdown--;
        
        // Tính phút và giây
        const minutes = Math.floor(countdown / 60);
        const seconds = countdown % 60;
        
        // Kiểm tra phần tử còn tồn tại không
        if (countdownElement) {
            // Hiển thị thời gian dưới dạng MM:SS
            countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            // Nếu phần tử không còn tồn tại, ngừng interval
            clearInterval(countdownInterval);
            return;
        }
        
        // Nếu hết thời gian
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            
            // Hiển thị thông báo hết thời gian
            Swal.fire({
                icon: 'warning',
                title: 'Hết thời gian thanh toán',
                text: 'Thời gian thanh toán đã hết. Vui lòng thử lại sau.',
                confirmButtonText: 'Quay lại'
            }).then(() => {
                window.location.href = 'my-bookings.html';
            });
        }
    }, 1000);
}

// Format số tiền thành định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hiển thị lỗi tải dữ liệu
function showLoadingError() {
    hideLoadingSpinner();
    const errorElement = document.getElementById('payment-error');
    if (errorElement) {
        errorElement.classList.remove('d-none');
    }
}

// Ẩn loading spinner
function hideLoadingSpinner() {
    const loadingElement = document.getElementById('loading-spinner');
    if (loadingElement) {
        loadingElement.classList.add('d-none');
    }
}

// Hiển thị container thanh toán
function showPaymentContainer() {
    const container = document.getElementById('payment-container');
    if (container) {
        container.classList.remove('d-none');
    }
}

// =====================================
// 🎯 XỬ LÝ MÃ GIẢM GIÁ
// =====================================

let currentPromotion = null;
let originalAmount = 0;

// Khởi tạo xử lý mã giảm giá
function initPromoCodeHandling() {
    const applyBtn = document.getElementById('apply-promo-btn');
    const removeBtn = document.getElementById('remove-promo-btn');
    const promoInput = document.getElementById('promo-code-input');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyPromoCode);
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', removePromoCode);
    }
    
    if (promoInput) {
        promoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyPromoCode();
            }
        });
    }
}

// Áp dụng mã giảm giá
async function applyPromoCode() {
    const promoCode = document.getElementById('promo-code-input').value.trim();
    const resultDiv = document.getElementById('promo-result');
    
    if (!promoCode) {
        showPromoResult('Vui lòng nhập mã giảm giá', 'error');
        return;
    }
    
    showPromoResult('Đang kiểm tra mã giảm giá...', 'info');
    
    try {
        const response = await fetch(`${window.API_URL}/promotions/validate/${promoCode}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.data) {
            const promotion = data.data;
            currentPromotion = promotion;
            
            // Hiển thị thông tin khuyến mãi đã áp dụng
            document.getElementById('applied-promo-name').textContent = 
                `${promotion.Ten_km || promotion.Ma_km} (${promotion.Gia_tri}%)`;
            document.getElementById('applied-promo').classList.remove('d-none');
            
            // Ẩn input và nút apply
            document.getElementById('promo-code-input').value = '';
            showPromoResult('', '');
            
            // Cập nhật giá
            updatePriceWithPromotion();
            
        } else {
            showPromoResult('Mã giảm giá không hợp lệ hoặc đã hết hạn', 'error');
        }
    } catch (error) {
        console.error('Error validating promo code:', error);
        showPromoResult('Lỗi khi kiểm tra mã giảm giá', 'error');
    }
}

// Xóa mã giảm giá
function removePromoCode() {
    currentPromotion = null;
    
    // Ẩn thông tin khuyến mãi đã áp dụng
    document.getElementById('applied-promo').classList.add('d-none');
    
    // Cập nhật giá về ban đầu
    updatePriceWithPromotion();
    
    showPromoResult('', '');
}

// Hiển thị kết quả kiểm tra mã giảm giá
function showPromoResult(message, type) {
    const resultDiv = document.getElementById('promo-result');
    if (!resultDiv) return;
    
    if (!message) {
        resultDiv.innerHTML = '';
        return;
    }
    
    let className = '';
    let icon = '';
    
    switch (type) {
        case 'success':
            className = 'text-success';
            icon = '<i class="fas fa-check-circle me-1"></i>';
            break;
        case 'error':
            className = 'text-danger';
            icon = '<i class="fas fa-exclamation-circle me-1"></i>';
            break;
        case 'info':
            className = 'text-info';
            icon = '<i class="fas fa-info-circle me-1"></i>';
            break;
    }
    
    resultDiv.innerHTML = `<small class="${className}">${icon}${message}</small>`;
}

// Cập nhật giá với khuyến mãi
function updatePriceWithPromotion() {
    if (!originalAmount) {
        console.warn('Chưa có giá gốc để tính toán khuyến mãi');
        return;
    }
    
    // Hiển thị giá gốc
    document.getElementById('original-amount').textContent = formatCurrency(originalAmount);
    
    if (currentPromotion) {
        const discountPercent = currentPromotion.Gia_tri;
        const discountAmount = originalAmount * (discountPercent / 100);
        const finalAmount = originalAmount - discountAmount;
        
        // Hiển thị dòng giảm giá
        document.getElementById('discount-line').classList.remove('d-none');
        document.getElementById('discount-amount').textContent = `-${formatCurrency(discountAmount)}`;
        
        // Cập nhật tổng tiền
        document.getElementById('total-amount').textContent = formatCurrency(finalAmount);
        
        // Cập nhật tất cả các element hiển thị số tiền thanh toán
        updatePaymentAmounts(finalAmount);
        
    } else {
        // Không có khuyến mãi
        document.getElementById('discount-line').classList.add('d-none');
        document.getElementById('total-amount').textContent = formatCurrency(originalAmount);
        
        // Cập nhật tất cả các element hiển thị số tiền thanh toán
        updatePaymentAmounts(originalAmount);
    }
}

// Cập nhật số tiền trong tất cả phương thức thanh toán
function updatePaymentAmounts(amount) {
    const formattedAmount = formatCurrency(amount);
    
    // Cập nhật các element hiển thị số tiền
    const amountElements = [
        'payment-amount',
        'momo-amount', 
        'vnpay-amount',
        'zalopay-amount'
    ];
    
    amountElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formattedAmount;
        }
    });
}

// Khởi tạo xử lý mã giảm giá khi DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Gọi initPromoCodeHandling sau khi trang đã load xong
    setTimeout(initPromoCodeHandling, 1000);
}); 
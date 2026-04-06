// Kiểm tra cấu hình API_URL từ config.js
if (typeof window.API_URL === 'undefined') {
    window.API_URL = CONFIG?.API_BASE_URL || '/api';
    console.log('API_URL được thiết lập từ CONFIG:', window.API_URL);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - Payment Method page');
    
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('token');
    console.log('Token từ localStorage:', token ? 'Đã có token' : 'Không có token');
    
    if (!token) {
        // Nếu chưa đăng nhập, quay lại trang đăng nhập
        window.location.href = 'login.html?redirect=payment.html';
        return;
    }
    
    // Kiểm tra xem có phải quay lại từ ZaloPay không
    const urlParams = new URLSearchParams(window.location.search);
    
    // Nếu có tham số status từ ZaloPay (khi quay trở lại từ ZaloPay)
    if (urlParams.has('status') && urlParams.has('apptransid')) {
        const status = urlParams.get('status');
        const appTransId = urlParams.get('apptransid');
        const bookingId = urlParams.get('booking') || sessionStorage.getItem('paymentBookingId');
        
        console.log('🔄 Quay lại từ ZaloPay:', { status, appTransId, bookingId });
        
        // Kiểm tra trạng thái booking sau khi redirect
        if (bookingId) {
            checkBookingStatus(bookingId);
        }
    }
    
    // Lấy thông tin thanh toán từ URL parameters trước, sau đó từ sessionStorage
    let bookingId = urlParams.get('booking') || sessionStorage.getItem('paymentBookingId');
    let paymentAmount = sessionStorage.getItem('paymentAmount');
    const paymentMethod = urlParams.get('method') || sessionStorage.getItem('paymentMethod');
    
    // Nếu có bookingId từ URL, lưu lại vào sessionStorage
    if (urlParams.has('booking')) {
        sessionStorage.setItem('paymentBookingId', bookingId);
        console.log('✅ Đã lấy booking ID từ URL và lưu vào sessionStorage:', bookingId);
    }
    
    // Nếu có paymentMethod từ URL, lưu lại vào sessionStorage
    if (urlParams.has('method')) {
        sessionStorage.setItem('paymentMethod', paymentMethod);
        console.log('✅ Đã lấy payment method từ URL và lưu vào sessionStorage:', paymentMethod);
    }
    
    // Debug: In ra tất cả sessionStorage khi load trang
    console.log('📋 SessionStorage khi load payment-method.html:', {
        paymentBookingId: sessionStorage.getItem('paymentBookingId'),
        paymentAmount: sessionStorage.getItem('paymentAmount'),
        paymentMethod: sessionStorage.getItem('paymentMethod'),
        allKeys: Object.keys(sessionStorage)
    });
    
    console.log('Payment Method:', paymentMethod);
    console.log('Booking ID:', bookingId);
    console.log('Payment Amount:', paymentAmount);
    
    // Kiểm tra và lấy amount từ booking nếu chưa có
    if (!paymentAmount && bookingId) {
        console.log('⚠️ Không có paymentAmount, đang lấy từ booking...');
        
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${API_URL}/bookings/${bookingId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.booking) {
                    paymentAmount = data.data.booking.Tong_tien;
                    sessionStorage.setItem('paymentAmount', paymentAmount);
                    console.log('✅ Đã lấy paymentAmount từ booking:', paymentAmount);
                    
                    // Gọi các hàm cần thiết với amount đã lấy
                    loadBookingDetails(bookingId);
                    setupPaymentMethod(paymentMethod, bookingId, paymentAmount);
                    initCountdown();
                } else {
                    // Không tìm thấy booking
                    Swal.fire({
                        icon: 'error',
                        title: 'Lỗi',
                        text: 'Không tìm thấy thông tin booking. Vui lòng thử lại.',
                        confirmButtonText: 'Quay lại'
                    }).then(() => {
                        window.location.href = 'payment.html';
                    });
                }
            })
            .catch(error => {
                console.error('❌ Lỗi khi lấy thông tin booking:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi',
                    text: 'Không thể tải thông tin booking. Vui lòng thử lại.',
                    confirmButtonText: 'Quay lại'
                }).then(() => {
                    window.location.href = 'payment.html';
                });
            });
            return; // Dừng ở đây và đợi fetch hoàn thành
        }
    }
    
    // Nếu đã có đầy đủ thông tin hoặc đang chờ fetch hoàn thành
    if (!bookingId || !paymentMethod) {
        // Nếu thiếu thông tin, quay lại trang thanh toán
        console.error('❌ Thiếu thông tin thanh toán, quay lại payment.html', {
            bookingId,
            paymentAmount,
            paymentMethod
        });
        
        // Hiển thị thông báo lỗi cho user
        Swal.fire({
            icon: 'error',
            title: 'Thiếu thông tin',
            text: 'Không tìm thấy thông tin thanh toán. Vui lòng thử lại từ trang thanh toán.',
            confirmButtonText: 'Quay lại',
            confirmButtonColor: '#3085d6'
        }).then(() => {
            window.location.href = 'payment.html';
        });
        return;
    }
    
    // Nếu paymentAmount vẫn null sau khi kiểm tra, lỗi
    if (!paymentAmount) {
        console.error('❌ Không thể lấy paymentAmount');
        Swal.fire({
            icon: 'error',
            title: 'Lỗi',
            text: 'Không thể xác định số tiền thanh toán. Vui lòng thử lại.',
            confirmButtonText: 'Quay lại'
        }).then(() => {
            window.location.href = 'payment.html';
        });
        return;
    }
    
    // Tải thông tin đặt tour
    loadBookingDetails(bookingId);
    
    // Hiển thị giao diện phương thức thanh toán
    setupPaymentMethod(paymentMethod, bookingId, paymentAmount);
    
    // Khởi tạo đồng hồ đếm ngược
    initCountdown();
});

// Hàm xử lý khi người dùng quay lại từ cổng thanh toán ZaloPay
function handleZaloPayReturn(status, appTransId, bookingId) {
    console.log('Xử lý quay lại từ ZaloPay:', { status, appTransId, bookingId });
    
    // Kiểm tra trạng thái ZaloPay (status < 0 là lỗi)
    if (status && parseInt(status) < 0) {
        // Xác định loại lỗi từ ZaloPay
        let errorMessage = 'Thanh toán không thành công.';
        
        switch (parseInt(status)) {
            case -49:
                errorMessage = 'Mã QR đã hết hạn. Vui lòng tạo giao dịch mới.';
                break;
            case -1:
                errorMessage = 'Giao dịch đã bị hủy.';
                break;
            case -2:
                errorMessage = 'Giao dịch thất bại.';
                break;
            case -22:
                errorMessage = 'Số tiền thanh toán quá giới hạn.';
                break;
            case -244:
                errorMessage = 'Hệ thống phát hiện giao dịch bất thường. Vui lòng thử lại sau vài phút hoặc tạo giao dịch mới.';
                break;
            case -615:
            case '1-615':
            case '-615':
                errorMessage = 'Thông tin giao dịch không hợp lệ. Vui lòng kiểm tra lại số tiền và thông tin đặt tour.';
                break;
            default:
                // Kiểm tra nếu status là chuỗi chứa mã lỗi
                if (typeof status === 'string' && status.includes('615')) {
                    errorMessage = 'Thông tin giao dịch không hợp lệ. Vui lòng kiểm tra lại số tiền và thông tin đặt tour.';
                } else {
                    errorMessage = `Giao dịch thất bại (mã lỗi: ${status}). Vui lòng thử lại hoặc liên hệ hỗ trợ.`;
                }
        }
        
        // Hiển thị thông báo lỗi
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: errorMessage,
            confirmButtonText: 'Thử lại',
            showCancelButton: true,
            cancelButtonText: 'Quay lại',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                // Tạo giao dịch mới
                createZaloPayOrder(bookingId);
            } else {
                // Quay lại trang payment chính
                window.location.href = 'payment.html';
            }
        });
        
        return;
    }
    
    // Hiển thị loading
    Swal.fire({
        title: 'Đang xác thực giao dịch...',
        text: 'Vui lòng đợi trong giây lát',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Kiểm tra trạng thái thanh toán dựa vào ZaloPay callback
    const token = localStorage.getItem('token');
    
    // Gọi API để cập nhật trạng thái thanh toán
    fetch(`${API_URL}/bookings/${bookingId}/payment`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "payment_method": 'zalopay',
            "app_trans_id": appTransId,
            "status": status
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể cập nhật trạng thái thanh toán');
        }
        return response.json();
    })
    .then(data => {
        console.log('Kết quả cập nhật thanh toán:', data);
        
        // Hiển thị thông báo thành công và cảm ơn
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
            sessionStorage.removeItem('zaloTransToken');
            
            // Chuyển hướng về trang đặt tour
            window.location.href = 'my-bookings.html';
        });
    })
    .catch(error => {
        console.error('Lỗi khi cập nhật trạng thái thanh toán:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi xác thực thanh toán',
            text: 'Không thể xác thực trạng thái thanh toán. Vui lòng liên hệ hỗ trợ.',
            confirmButtonText: 'Quay lại danh sách tour',
            confirmButtonColor: '#3085d6',
        }).then(() => {
            window.location.href = 'my-bookings.html';
        });
    });
}

// Thiết lập giao diện theo phương thức thanh toán
function setupPaymentMethod(method, bookingId, amount) {
    // Cấu hình thông tin phương thức thanh toán
    const methodConfig = {
        banking: {
            title: 'Thanh toán chuyển khoản ngân hàng',
            logo: 'https://cdn.haitrieu.com/wp-content/uploads/2022/02/Icon-MB-Bank-M.png',
            instruction: 'Vui lòng chuyển khoản theo thông tin dưới đây và nhập mã booking vào nội dung chuyển khoản.'
        },
        momo: {
            title: 'Thanh toán qua MoMo',
            logo: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
            instruction: 'Quét mã QR dưới đây bằng ứng dụng MoMo hoặc chuyển khoản đến số điện thoại được cung cấp.'
        },
        vnpay: {
            title: 'Thanh toán qua VNPAY',
            logo: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-VNPAY-QR.png',
            instruction: 'Nhấn nút "Thanh toán qua VNPAY" để chuyển đến cổng thanh toán an toàn của VNPAY.'
        },
        zalopay: {
            title: 'Thanh toán qua ZaloPay',
            logo: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay.png',
            instruction: 'Quét mã QR hoặc nhấn "Mở ứng dụng ZaloPay" để thanh toán qua ứng dụng ZaloPay.'
        }
    };
    
    // Kiểm tra phương thức thanh toán hợp lệ
    if (!methodConfig[method]) {
        console.error('Phương thức thanh toán không hợp lệ:', method);
        window.location.href = 'payment.html';
        return;
    }
    
    // Cập nhật header
    document.getElementById('method-logo').src = methodConfig[method].logo;
    document.getElementById('method-title').textContent = methodConfig[method].title;
    document.getElementById('method-instruction').textContent = methodConfig[method].instruction;
    
    // Ẩn tất cả các nội dung
    hideAllContent();
    
    // Hiển thị nội dung theo phương thức
    document.getElementById(`${method}-content`).classList.remove('d-none');
    
    // Hiển thị số tiền và nội dung
    const formattedAmount = formatCurrency(amount);
    const paymentNote = `TOUR_${bookingId}`;
    
    // Cập nhật số tiền cho tất cả các phương thức
    setTextContentSafely('payment-amount', formattedAmount);
    setTextContentSafely('momo-amount', formattedAmount);
    setTextContentSafely('vnpay-amount', formattedAmount);
    setTextContentSafely('zalopay-amount', formattedAmount);
    setTextContentSafely('total-amount', formattedAmount);
    
    // Cập nhật nội dung thanh toán
    setTextContentSafely('payment-note', paymentNote);
    setTextContentSafely('momo-note', paymentNote);
    
    // Thiết lập sự kiện cho nút thanh toán
    setupPaymentEvents(method, bookingId);
    
    // Nếu là phương thức ZaloPay, tự động tạo giao dịch
    if (method === 'zalopay') {
        // Đợi 1 giây để trang được hiển thị hoàn chỉnh trước khi tạo QR
        setTimeout(() => {
            createZaloPayOrder(bookingId);
        }, 1000);
    }
    
    // Nếu là phương thức MoMo, tự động tạo giao dịch
    if (method === 'momo') {
        // Đợi 1 giây để trang được hiển thị hoàn chỉnh trước khi tạo QR
        setTimeout(() => {
            createMomoOrder(bookingId);
        }, 1000);
    }
    
    // Hiển thị container thanh toán
    hideLoadingSpinner();
    showPaymentContainer();
}

// Ẩn tất cả nội dung thanh toán
function hideAllContent() {
    const contentIds = ['banking-content', 'momo-content', 'vnpay-content', 'zalopay-content'];
    contentIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.add('d-none');
        }
    });
}

// Thiết lập sự kiện cho các nút thanh toán
function setupPaymentEvents(method, bookingId) {
    // Hàm gắn sự kiện an toàn
    const addEventSafely = (elementId, eventType, handler) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        }
    };
    
    switch (method) {
        case 'banking':
            addEventSafely('confirm-payment-btn', 'click', function() {
                confirmPayment(bookingId, method);
            });
            break;
            
        case 'momo':
            addEventSafely('confirm-momo-btn', 'click', function() {
                confirmPayment(bookingId, method);
            });
            break;
            
        case 'vnpay':
            addEventSafely('redirect-vnpay-btn', 'click', function() {
                // Giả lập thanh toán VNPAY
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
                                    confirmPayment(bookingId, method);
                                }, 2000);
                            }
                        });
                    }
                });
            });
            break;
            
        case 'zalopay':
            addEventSafely('redirect-zalopay-btn', 'click', function() {
                // Gọi API tạo giao dịch ZaloPay
                createZaloPayOrder(bookingId);
            });
            
            addEventSafely('confirm-zalopay-btn', 'click', function() {
                // Kiểm tra trạng thái giao dịch ZaloPay
                checkZaloPayStatus(bookingId);
            });
            break;
    }
}

// Hàm tạo giao dịch ZaloPay
function createZaloPayOrder(bookingId) {
    // Hiển thị loading trong QR container
    const zaloPayQrLoading = document.getElementById('zalopay-qr-loading');
    const zaloPayQrImage = document.getElementById('zalopay-qr-image');
    
    if (zaloPayQrLoading) {
        zaloPayQrLoading.classList.remove('d-none');
    }
    
    if (zaloPayQrImage) {
        zaloPayQrImage.classList.add('d-none');
    }
    
    // Hiển thị loading
    Swal.fire({
        title: 'Đang khởi tạo giao dịch...',
        text: 'Vui lòng đợi trong giây lát',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const paymentAmount = sessionStorage.getItem('paymentAmount');
    const token = localStorage.getItem('token');
    
    if (!bookingId || !paymentAmount) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: 'Không tìm thấy thông tin giao dịch'
        });
        return;
    }

    // Thêm timestamp ngẫu nhiên để đảm bảo mỗi request là duy nhất
    const uniqueTimestamp = Date.now() + Math.floor(Math.random() * 1000);
    
    // Kiểm tra và chuyển đổi amount an toàn
    const amountNum = parseInt(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
        console.error('❌ Amount không hợp lệ:', paymentAmount);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: 'Số tiền thanh toán không hợp lệ. Vui lòng thử lại từ trang thanh toán.',
            confirmButtonText: 'Quay lại'
        }).then(() => {
            window.location.href = 'payment.html';
        });
        return;
    }
    
    console.log('📤 Gửi request đến /payment/zalo-create với:', {
        bookingId,
        amount: amountNum,
        timestamp: uniqueTimestamp
    });

    // Gọi API tạo giao dịch ZaloPay
    fetch(`${API_URL}/payment/zalo-create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "bookingId": bookingId,
            "amount": amountNum,
            "timestamp": uniqueTimestamp // Thêm timestamp độc nhất cho mỗi request
        })
    })
    .then(async response => {
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
            // Tạo error object với response để có thể truy cập sau
            const error = new Error(data.message || 'Không thể tạo giao dịch ZaloPay');
            error.response = response;
            error.data = data;
            throw error;
        }
        return data;
    })
    .then(data => {
        console.log('Kết quả tạo giao dịch ZaloPay:', data);
        
        if (data && data.payUrl) {
            // Lưu app_trans_id để kiểm tra trạng thái sau này
            if (data.app_trans_id) {
                sessionStorage.setItem('zaloAppTransId', data.app_trans_id);
            }
            
            // Lưu zp_trans_token nếu có
            if (data.zp_trans_token) {
                sessionStorage.setItem('zaloTransToken', data.zp_trans_token);
            }
            
            // Tạo mã QR từ payUrl - đảm bảo không sử dụng cache
            const qrUrl = `${data.payUrl}&nocache=${uniqueTimestamp}`;
            generateQRCode(qrUrl);
            
            // Chuyển đến trang thanh toán của ZaloPay trong cửa sổ hiện tại khi nhấn nút
            document.getElementById('redirect-zalopay-btn').onclick = function() {
                // Thay vì mở tab mới, chuyển hướng trực tiếp
                window.location.href = data.payUrl;
            };
            
            // Tự động redirect đến ZaloPay sau 2 giây
            setTimeout(() => {
                console.log('🔄 Tự động redirect đến ZaloPay:', data.payUrl);
                window.location.href = data.payUrl;
            }, 2000);
            
            // Hiển thị hướng dẫn
            Swal.fire({
                icon: 'info',
                title: 'Đang chuyển đến ZaloPay...',
                text: 'Bạn sẽ được chuyển đến trang thanh toán ZaloPay trong vài giây.',
                confirmButtonText: 'Chuyển ngay',
                showCancelButton: true,
                cancelButtonText: 'Hủy',
                cancelButtonColor: '#6c757d'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Nếu người dùng chọn "Chuyển ngay"
                    window.location.href = data.payUrl;
                }
            });
        } else {
            throw new Error('Không nhận được đường dẫn thanh toán từ ZaloPay');
        }
    })
    .catch(async error => {
        console.error('Lỗi khi tạo giao dịch ZaloPay:', error);
        
        // Ẩn loading và hiển thị thông báo lỗi thay vì ảnh lỗi
        if (zaloPayQrLoading) {
            zaloPayQrLoading.classList.add('d-none');
        }
        
        if (zaloPayQrImage) {
            zaloPayQrImage.classList.remove('d-none');
            // Sử dụng placeholder thay vì ảnh lỗi không tồn tại
            zaloPayQrImage.src = 'images/placeholder.jpg';
            zaloPayQrImage.alt = 'Lỗi tạo mã QR';
            
            // Thêm thông báo lỗi bên dưới hình ảnh
            const qrContainer = document.getElementById('zalopay-qr-container');
            if (qrContainer) {
                // Kiểm tra xem đã có thông báo lỗi chưa
                let errorMessage = qrContainer.querySelector('.text-danger');
                if (!errorMessage) {
                    errorMessage = document.createElement('p');
                    errorMessage.className = 'text-danger mt-2';
                    errorMessage.textContent = 'Không thể tạo mã QR thanh toán. Vui lòng thử lại.';
                    qrContainer.appendChild(errorMessage);
                }
            }
        }
        
        // Lấy thông báo lỗi chi tiết từ response nếu có
        let errorText = 'Không thể kết nối đến cổng thanh toán ZaloPay. Vui lòng thử lại sau.';
        let errorCode = 'N/A';
        
        // Kiểm tra nếu error có data (từ fetch error object)
        if (error.data) {
            if (error.data.message) {
                errorText = error.data.message;
            }
            if (error.data.return_code) {
                errorCode = error.data.return_code;
            }
        } else if (error.message) {
            errorText = error.message;
        }
        
        // Kiểm tra mã lỗi cụ thể
        if (errorText.includes('1-615') || errorText.includes('615') || errorCode.toString().includes('615')) {
            errorText = 'Thông tin giao dịch không hợp lệ. Vui lòng kiểm tra lại số tiền và thông tin đặt tour.';
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán ZaloPay',
            html: `<p>${errorText}</p>${errorCode !== 'N/A' ? `<p class="text-muted small mt-2">Mã lỗi: ${errorCode}</p>` : ''}`,
            confirmButtonText: 'Thử lại',
            showCancelButton: true,
            cancelButtonText: 'Quay lại',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                // Thử lại tạo giao dịch
                createZaloPayOrder(bookingId);
            } else {
                // Quay lại trang thanh toán
                window.location.href = 'payment.html';
            }
        });
    });
}

// Hàm tạo mã QR từ URL
function generateQRCode(url) {
    console.log('Tạo mã QR từ URL:', url);
    
    if (!url) {
        console.error('Không nhận được URL thanh toán hợp lệ từ ZaloPay');
        return;
    }
    
    // Sử dụng Google Chart API để tạo mã QR
    const qrImageUrl = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(url)}&chs=300x300&chld=L|0`;
    console.log('URL mã QR:', qrImageUrl);
    
    // Ẩn loading indicator nếu có
    const zaloPayQrLoading = document.getElementById('zalopay-qr-loading');
    if (zaloPayQrLoading) {
        zaloPayQrLoading.classList.add('d-none');
    }
    
    // Cập nhật cụ thể hình ảnh ZaloPay QR
    const zaloQrImage = document.getElementById('zalopay-qr-image');
    if (zaloQrImage) {
        zaloQrImage.src = qrImageUrl;
        zaloQrImage.alt = 'ZaloPay QR Code';
        zaloQrImage.classList.remove('d-none');
        console.log('Đã cập nhật hình ảnh QR ZaloPay');
    } else {
        console.error('Không tìm thấy phần tử hình ảnh QR với id zalopay-qr-image');
    }
}

// Hàm kiểm tra trạng thái giao dịch ZaloPay
function checkZaloPayStatus(bookingId) {
    // Hiển thị loading
    Swal.fire({
        title: 'Đang kiểm tra trạng thái giao dịch...',
        text: 'Vui lòng đợi trong giây lát',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    const token = localStorage.getItem('token');
    const app_trans_id = sessionStorage.getItem('zaloAppTransId');
    
    console.log('Kiểm tra thanh toán ZaloPay:', {
        bookingId: bookingId,
        app_trans_id: app_trans_id
    });
    
    // Kiểm tra trạng thái giao dịch ZaloPay - Sử dụng endpoint dự phòng
    fetch(`${API_URL}/payment-test/zalo-status`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "bookingId": bookingId,
            "app_trans_id": app_trans_id // Truyền app_trans_id nếu có
        })
    })
    .then(response => {
        if (!response.ok) {
            console.error('Không thể kết nối tới endpoint dự phòng, thử lại với endpoint chính');
            
            // Thử lại với endpoint chính
            return fetch(`${API_URL}/payment/zalo-status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "bookingId": bookingId,
                    "app_trans_id": app_trans_id
                })
            });
        }
        return response;
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Không thể kiểm tra trạng thái giao dịch');
        }
        return response.json();
    })
    .then(data => {
        console.log('Kết quả kiểm tra trạng thái ZaloPay:', data);
        
        if (data && data.status === "success") {
            // Giao dịch thành công
            confirmPayment(bookingId, 'zalopay');
        } else if (data && data.status === "pending") {
            // Giao dịch đang xử lý
            Swal.fire({
                icon: 'warning',
                title: 'Thanh toán đang xử lý',
                text: 'Giao dịch của bạn đang được xử lý. Vui lòng kiểm tra lại sau vài phút.',
                confirmButtonText: 'Đã hiểu'
            });
        } else {
            // Giao dịch thất bại hoặc không tìm thấy
            Swal.fire({
                icon: 'error',
                title: 'Thanh toán chưa hoàn tất',
                text: 'Chúng tôi chưa nhận được thanh toán của bạn. Vui lòng hoàn tất việc thanh toán hoặc thử lại.',
                confirmButtonText: 'Thử lại'
            });
        }
    })
    .catch(error => {
        console.error('Lỗi khi kiểm tra trạng thái ZaloPay:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi kiểm tra thanh toán',
            text: 'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại sau.',
            confirmButtonText: 'Đồng ý',
            showCancelButton: true,
            cancelButtonText: 'Đã thanh toán thành công',
        }).then((result) => {
            if (!result.isConfirmed) {
                // Nếu người dùng khẳng định đã thanh toán thành công
                confirmPayment(bookingId, 'zalopay');
            }
        });
    });
}

// Hàm tải thông tin đặt tour
function loadBookingDetails(bookingId) {
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
            displayBookingDetails(data.data.booking);
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

// Khởi tạo đồng hồ đếm ngược
function initCountdown() {
    // Thời gian đếm ngược 15 phút (900 giây)
    let countdown = 15 * 60;
    const countdownElement = document.getElementById('payment-countdown');
    const zaloPayCountdown = document.getElementById('zalopay-countdown');
    
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
        const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Cập nhật hiển thị đồng hồ đếm ngược
        setTextContentSafely('payment-countdown', timeDisplay);
        setTextContentSafely('zalopay-countdown', timeDisplay);
        
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

// Kiểm tra và thiết lập nội dung cho phần tử
function setTextContentSafely(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
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
    // Ẩn loading spinner
    hideLoadingSpinner();
    
    // Hiển thị thông báo lỗi
    Swal.fire({
        icon: 'error',
        title: 'Không thể tải thông tin',
        text: 'Không thể tải thông tin đặt tour. Vui lòng thử lại sau.',
        confirmButtonText: 'Quay lại'
    }).then(() => {
        window.location.href = 'payment.html';
    });
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

// Hàm kiểm tra trạng thái booking
async function checkBookingStatus(bookingId) {
    try {
        console.log('🔍 Kiểm tra trạng thái booking:', bookingId);
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin booking');
        }
        
        const data = await response.json();
        console.log('📋 Thông tin booking:', data);
        
        if (data.data && data.data.booking) {
            const booking = data.data.booking;
            
            // Hiển thị trạng thái booking
            const statusElement = document.getElementById('payment-status');
            if (statusElement) {
                statusElement.textContent = `Trạng thái: ${booking.Trang_thai || 'Chưa xác định'}`;
                statusElement.classList.remove('d-none');
                
                // Thêm class màu sắc dựa trên trạng thái
                if (booking.Trang_thai === 'Đã thanh toán') {
                    statusElement.classList.add('text-success');
                } else if (booking.Trang_thai === 'Chờ thanh toán') {
                    statusElement.classList.add('text-warning');
                }
            }
            
            // Nếu đã thanh toán, hiển thị thông báo thành công
            if (booking.Trang_thai === 'Đã thanh toán') {
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
            }
        }
    } catch (error) {
        console.error('❌ Lỗi kiểm tra trạng thái booking:', error);
        // Hiển thị thông báo lỗi
        Swal.fire({
            icon: 'error',
            title: 'Lỗi kiểm tra thanh toán',
            text: 'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại sau.',
            confirmButtonText: 'Thử lại'
        });
    }
}

// Hàm tạo giao dịch MoMo
function createMomoOrder(bookingId) {
    // Hiển thị loading trong QR container
    const momoQrLoading = document.getElementById('momo-qr-loading');
    const momoQrImage = document.getElementById('momo-qr-image');
    
    if (momoQrLoading) {
        momoQrLoading.classList.remove('d-none');
    }
    
    if (momoQrImage) {
        momoQrImage.classList.add('d-none');
    }
    
    // Hiển thị loading
    Swal.fire({
        title: 'Đang khởi tạo giao dịch...',
        text: 'Vui lòng đợi trong giây lát',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    const paymentAmount = sessionStorage.getItem('paymentAmount');
    const token = localStorage.getItem('token');
    
    if (!bookingId || !paymentAmount) {
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: 'Không tìm thấy thông tin giao dịch'
        });
        return;
    }

    // Thêm timestamp ngẫu nhiên để đảm bảo mỗi request là duy nhất
    const uniqueTimestamp = Date.now() + Math.floor(Math.random() * 1000);
    
    // Kiểm tra và chuyển đổi amount an toàn
    const amountNum = parseInt(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
        console.error('❌ Amount không hợp lệ:', paymentAmount);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: 'Số tiền thanh toán không hợp lệ. Vui lòng thử lại từ trang thanh toán.',
            confirmButtonText: 'Quay lại'
        }).then(() => {
            window.location.href = 'payment.html';
        });
        return;
    }
    
    console.log('📤 Gửi request đến /payment/momo/create với:', {
        bookingId,
        amount: amountNum,
        timestamp: uniqueTimestamp
    });

    // Gọi API tạo giao dịch MoMo
    fetch(`${API_URL}/payment/momo/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "bookingId": bookingId,
            "amount": amountNum,
            "timestamp": uniqueTimestamp
        })
    })
    .then(async response => {
        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Không thể tạo giao dịch MoMo');
        }
        return data;
    })
    .then(data => {
        console.log('Kết quả tạo giao dịch MoMo:', data);
        
        if (data && data.payUrl) {
            // Lưu requestId và orderId để kiểm tra trạng thái sau này
            if (data.requestId) {
                sessionStorage.setItem('momoRequestId', data.requestId);
            }
            if (data.orderId) {
                sessionStorage.setItem('momoOrderId', data.orderId);
            }
            
            // Nếu có QR code URL, hiển thị QR code
            if (data.qrCodeUrl) {
                const qrUrl = `${data.qrCodeUrl}&nocache=${uniqueTimestamp}`;
                generateMomoQRCode(qrUrl);
            } else if (data.payUrl) {
                // Tạo mã QR từ payUrl nếu không có qrCodeUrl
                const qrUrl = `${data.payUrl}&nocache=${uniqueTimestamp}`;
                generateMomoQRCode(qrUrl);
            }
            
            // Chuyển đến trang thanh toán của MoMo khi nhấn nút
            const redirectBtn = document.getElementById('redirect-momo-btn');
            if (redirectBtn) {
                redirectBtn.onclick = function() {
                    window.location.href = data.payUrl;
                };
            }
            
            // Tự động redirect đến MoMo sau 2 giây
            setTimeout(() => {
                console.log('🔄 Tự động redirect đến MoMo:', data.payUrl);
                window.location.href = data.payUrl;
            }, 2000);
            
            // Hiển thị hướng dẫn
            Swal.fire({
                icon: 'info',
                title: 'Đang chuyển đến MoMo...',
                text: 'Bạn sẽ được chuyển đến trang thanh toán MoMo trong vài giây.',
                confirmButtonText: 'Chuyển ngay',
                showCancelButton: true,
                cancelButtonText: 'Hủy',
                cancelButtonColor: '#6c757d'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = data.payUrl;
                }
            });
        } else {
            throw new Error('Không nhận được đường dẫn thanh toán từ MoMo');
        }
    })
    .catch(error => {
        console.error('Lỗi khi tạo giao dịch MoMo:', error);
        
        // Ẩn loading và hiển thị thông báo lỗi
        if (momoQrLoading) {
            momoQrLoading.classList.add('d-none');
        }
        
        if (momoQrImage) {
            momoQrImage.classList.remove('d-none');
            momoQrImage.src = 'images/placeholder.jpg';
            momoQrImage.alt = 'Lỗi tạo mã QR';
            
            const qrContainer = document.getElementById('momo-qr-container');
            if (qrContainer) {
                let errorMessage = qrContainer.querySelector('.text-danger');
                if (!errorMessage) {
                    errorMessage = document.createElement('p');
                    errorMessage.className = 'text-danger mt-2';
                    errorMessage.textContent = 'Không thể tạo mã QR thanh toán. Vui lòng thử lại.';
                    qrContainer.appendChild(errorMessage);
                }
            }
        }
        
        Swal.fire({
            icon: 'error',
            title: 'Lỗi thanh toán',
            text: 'Không thể kết nối đến cổng thanh toán MoMo. Vui lòng thử lại sau.'
        });
    });
}

// Hàm tạo mã QR MoMo
function generateMomoQRCode(url) {
    console.log('Tạo mã QR MoMo từ URL:', url);
    
    if (!url) {
        console.error('Không nhận được URL thanh toán hợp lệ từ MoMo');
        return;
    }
    
    // Sử dụng Google Chart API để tạo mã QR
    const qrImageUrl = `https://chart.googleapis.com/chart?cht=qr&chl=${encodeURIComponent(url)}&chs=300x300&chld=L|0`;
    console.log('URL mã QR:', qrImageUrl);
    
    // Ẩn loading indicator nếu có
    const momoQrLoading = document.getElementById('momo-qr-loading');
    if (momoQrLoading) {
        momoQrLoading.classList.add('d-none');
    }
    
    // Cập nhật hình ảnh QR MoMo
    const momoQrImage = document.getElementById('momo-qr-image');
    if (momoQrImage) {
        momoQrImage.src = qrImageUrl;
        momoQrImage.alt = 'MoMo QR Code';
        momoQrImage.classList.remove('d-none');
        console.log('Đã cập nhật hình ảnh QR MoMo');
    } else {
        console.error('Không tìm thấy phần tử hình ảnh QR với id momo-qr-image');
    }
} 
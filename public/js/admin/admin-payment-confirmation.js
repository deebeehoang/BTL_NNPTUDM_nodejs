/**
 * Admin Payment Confirmation Management
 * Quản lý xác nhận thanh toán cho admin
 */

class PaymentConfirmationManager {
    constructor() {
        this.currentBookingId = null;
        this.pendingPayments = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPendingPayments();
    }

    bindEvents() {
        // Refresh button
        document.getElementById('refreshPendingPaymentsBtn')?.addEventListener('click', () => {
            this.loadPendingPayments();
        });

        // Search functionality
        document.getElementById('paymentSearchBtn')?.addEventListener('click', () => {
            this.searchPayments();
        });

        document.getElementById('paymentSearchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchPayments();
            }
        });

        // Filter functionality
        document.querySelectorAll('input[name="paymentFilter"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.filterPayments();
            });
        });

        // Confirm payment button
        document.getElementById('confirmPaymentBtn')?.addEventListener('click', () => {
            this.confirmPayment();
        });

        // Print invoice button
        document.getElementById('printInvoiceBtn')?.addEventListener('click', () => {
            this.printInvoice();
        });
    }

    /**
     * Load pending payments from API
     */
    async loadPendingPayments() {
        try {
            console.log('🔍 Loading pending payments...');
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/admin/pending-payments`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📊 Pending payments data:', data);

            if (data.status === 'success') {
                this.pendingPayments = data.data.bookings;
                this.displayPendingPayments(this.pendingPayments);
                this.updateStatistics();
            } else {
                throw new Error(data.message || 'Lỗi tải dữ liệu');
            }
        } catch (error) {
            console.error('❌ Error loading pending payments:', error);
            this.showError('Không thể tải danh sách booking chờ thanh toán: ' + error.message);
        }
    }

    /**
     * Display pending payments in table
     */
    displayPendingPayments(payments) {
        const tbody = document.getElementById('pendingPaymentsList');
        
        if (!payments || payments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-3"></i>
                        <p>Không có booking nào chờ xác nhận thanh toán</p>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        payments.forEach(payment => {
            const bookingDate = new Date(payment.Ngay_dat).toLocaleDateString('vi-VN');
            const totalPeople = parseInt(payment.So_nguoi_lon) + parseInt(payment.So_tre_em);
            const statusBadge = this.getStatusBadge(payment.Trang_thai_booking || payment.Trang_thai);
            
            html += `
                <tr>
                    <td><strong>${payment.Ma_booking}</strong></td>
                    <td>
                        <div>
                            <strong>${payment.Ten_khach_hang}</strong>
                            <br><small class="text-muted">${payment.Email}</small>
                        </div>
                    </td>
                    <td>
                        <div>
                            <strong>${payment.Ten_tour}</strong>
                            <br><small class="text-muted">
                                ${new Date(payment.Ngay_bat_dau).toLocaleDateString('vi-VN')} - 
                                ${new Date(payment.Ngay_ket_thuc).toLocaleDateString('vi-VN')}
                            </small>
                        </div>
                    </td>
                    <td>${bookingDate}</td>
                    <td>
                        <span class="badge bg-primary">${payment.So_nguoi_lon} người lớn</span>
                        ${payment.So_tre_em > 0 ? `<br><span class="badge bg-info">${payment.So_tre_em} trẻ em</span>` : ''}
                        <br><small class="text-muted">Tổng: ${totalPeople} người</small>
                    </td>
                    <td><strong>${this.formatCurrency(payment.Tong_tien)}</strong></td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="paymentManager.viewPaymentDetails('${payment.Ma_booking}')">
                                <i class="fas fa-eye"></i> Xem
                            </button>
                            ${this.canConfirmPayment(payment) ? `
                                <button class="btn btn-sm btn-success" onclick="paymentManager.confirmPaymentModal('${payment.Ma_booking}')">
                                    <i class="fas fa-check-circle"></i> Xác nhận
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    /**
     * Check if payment can be confirmed
     */
    canConfirmPayment(payment) {
        const status = payment.Trang_thai_booking || payment.Trang_thai || '';
        // Chỉ cho phép xác nhận nếu trạng thái là "Chờ thanh toán" hoặc "Chờ xác nhận"
        // Không cho phép nếu đã thanh toán hoặc hết hạn
        return status === 'Chờ thanh toán' || status === 'Chờ xác nhận' || status === 'Cho_xac_nhan';
    }

    /**
     * Get status badge HTML
     */
    getStatusBadge(status) {
        const statusMap = {
            'Chờ thanh toán': { class: 'bg-warning', text: 'Chờ thanh toán' },
            'Chờ xác nhận': { class: 'bg-info', text: 'Chờ xác nhận' },
            'Cho_xac_nhan': { class: 'bg-info', text: 'Chờ xác nhận' },
            'Đã thanh toán': { class: 'bg-success', text: 'Đã thanh toán' },
            'Het_han': { class: 'bg-secondary', text: 'Hết hạn' },
            'Đã hủy': { class: 'bg-danger', text: 'Đã hủy' },
            'pending': { class: 'bg-warning', text: 'Chờ thanh toán' },
            'confirmed': { class: 'bg-success', text: 'Đã xác nhận' },
            'cancelled': { class: 'bg-danger', text: 'Đã hủy' }
        };

        const statusInfo = statusMap[status] || { class: 'bg-secondary', text: status };
        return `<span class="badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    /**
     * Update statistics
     */
    updateStatistics() {
        const pendingCount = this.pendingPayments.filter(p => 
            p.Trang_thai_booking === 'Chờ thanh toán' || p.Trang_thai === 'Chờ thanh toán'
        ).length;

        const confirmedToday = this.pendingPayments.filter(p => {
            const today = new Date().toDateString();
            const paymentDate = new Date(p.Ngay_thanh_toan || p.Ngay_dat).toDateString();
            return paymentDate === today && (p.Trang_thai_booking === 'Đã thanh toán' || p.Trang_thai === 'Đã thanh toán');
        }).length;

        const revenueToday = this.pendingPayments
            .filter(p => {
                const today = new Date().toDateString();
                const paymentDate = new Date(p.Ngay_thanh_toan || p.Ngay_dat).toDateString();
                return paymentDate === today && (p.Trang_thai_booking === 'Đã thanh toán' || p.Trang_thai === 'Đã thanh toán');
            })
            .reduce((sum, p) => sum + parseFloat(p.Tong_tien), 0);

        document.getElementById('totalPendingPayments').textContent = pendingCount;
        document.getElementById('totalConfirmedToday').textContent = confirmedToday;
        document.getElementById('totalRevenueToday').textContent = this.formatCurrency(revenueToday);
        document.getElementById('pendingPaymentsCount').textContent = pendingCount;
    }

    /**
     * Search payments
     */
    searchPayments() {
        const searchTerm = document.getElementById('paymentSearchInput').value.toLowerCase();
        
        if (!searchTerm) {
            this.displayPendingPayments(this.pendingPayments);
            return;
        }

        const filteredPayments = this.pendingPayments.filter(payment => 
            payment.Ma_booking.toLowerCase().includes(searchTerm) ||
            payment.Ten_khach_hang.toLowerCase().includes(searchTerm) ||
            payment.Ten_tour.toLowerCase().includes(searchTerm) ||
            payment.Email.toLowerCase().includes(searchTerm)
        );

        this.displayPendingPayments(filteredPayments);
    }

    /**
     * Filter payments by status
     */
    filterPayments() {
        const selectedFilter = document.querySelector('input[name="paymentFilter"]:checked')?.value || 'all';
        
        let filteredPayments = this.pendingPayments;
        
        if (selectedFilter === 'pending') {
            // Lọc theo "Chờ xác nhận" - chỉ hiển thị các booking chờ thanh toán hoặc chờ xác nhận
            filteredPayments = this.pendingPayments.filter(p => {
                const status = p.Trang_thai_booking || p.Trang_thai || '';
                return status === 'Chờ thanh toán' || 
                       status === 'Chờ xác nhận' || 
                       status === 'Cho_xac_nhan';
            });
        } else if (selectedFilter === 'confirmed') {
            filteredPayments = this.pendingPayments.filter(p => {
                const status = p.Trang_thai_booking || p.Trang_thai || '';
                return status === 'Đã thanh toán';
            });
        } else if (selectedFilter === 'expired') {
            filteredPayments = this.pendingPayments.filter(p => {
                const status = p.Trang_thai_booking || p.Trang_thai || '';
                return status === 'Het_han' || status === 'Hết hạn';
            });
        }

        this.displayPendingPayments(filteredPayments);
    }

    /**
     * View payment details
     */
    async viewPaymentDetails(bookingId) {
        try {
            console.log('🔍 Loading payment details for booking:', bookingId);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/admin/booking/${bookingId}/payment-details`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📋 Payment details:', data);

            if (data.status === 'success') {
                this.showPaymentDetailsModal(data.data.booking);
            } else {
                throw new Error(data.message || 'Lỗi tải chi tiết thanh toán');
            }
        } catch (error) {
            console.error('❌ Error loading payment details:', error);
            this.showError('Không thể tải chi tiết thanh toán: ' + error.message);
        }
    }

    /**
     * Show payment details modal
     */
    showPaymentDetailsModal(booking) {
        const modalContent = document.getElementById('paymentConfirmationContent');
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        
        // Ẩn/hiện nút xác nhận thanh toán dựa trên trạng thái
        if (confirmBtn) {
            const canConfirm = this.canConfirmPayment(booking);
            if (canConfirm) {
                confirmBtn.style.display = 'inline-block';
                confirmBtn.disabled = false;
            } else {
                confirmBtn.style.display = 'none';
            }
        }
        
        const bookingDate = new Date(booking.Ngay_dat).toLocaleDateString('vi-VN');
        const startDate = new Date(booking.Ngay_bat_dau).toLocaleDateString('vi-VN');
        const endDate = new Date(booking.Ngay_ket_thuc).toLocaleDateString('vi-VN');
        const status = booking.Trang_thai_booking || booking.Trang_thai || '';
        
        modalContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-info-circle me-2"></i>Thông tin đặt tour</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Mã booking:</strong></td><td>${booking.Ma_booking}</td></tr>
                        <tr><td><strong>Ngày đặt:</strong></td><td>${bookingDate}</td></tr>
                        <tr><td><strong>Số người lớn:</strong></td><td>${booking.So_nguoi_lon}</td></tr>
                        <tr><td><strong>Số trẻ em:</strong></td><td>${booking.So_tre_em}</td></tr>
                        <tr><td><strong>Khuyến mãi:</strong></td><td>${booking.Ten_khuyen_mai || 'Không có'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-user me-2"></i>Thông tin khách hàng</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Họ tên:</strong></td><td>${booking.Ten_khach_hang}</td></tr>
                        <tr><td><strong>Email:</strong></td><td>${booking.Email}</td></tr>
                        <tr><td><strong>Địa chỉ:</strong></td><td>${booking.Dia_chi}</td></tr>
                        <tr><td><strong>CCCD:</strong></td><td>${booking.Cccd}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-md-6">
                    <h6><i class="fas fa-map-marked-alt me-2"></i>Thông tin tour</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Tên tour:</strong></td><td>${booking.Ten_tour}</td></tr>
                        <tr><td><strong>Ngày bắt đầu:</strong></td><td>${startDate}</td></tr>
                        <tr><td><strong>Ngày kết thúc:</strong></td><td>${endDate}</td></tr>
                        <tr><td><strong>Số chỗ:</strong></td><td>${booking.So_cho}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-calculator me-2"></i>Chi tiết giá</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Giá người lớn:</strong></td><td>${this.formatCurrency(booking.chiTietGia.giaNguoiLon)}</td></tr>
                        <tr><td><strong>Giá trẻ em:</strong></td><td>${this.formatCurrency(booking.chiTietGia.giaTreEm)}</td></tr>
                        <tr><td><strong>Tổng tiền tour:</strong></td><td>${this.formatCurrency(booking.chiTietGia.tongTienTour)}</td></tr>
                        <tr><td><strong>Tổng tiền dịch vụ:</strong></td><td>${this.formatCurrency(booking.chiTietGia.tongTienDichVu)}</td></tr>
                        <tr><td><strong>Giảm giá:</strong></td><td>${this.formatCurrency(booking.chiTietGia.giamGia)}</td></tr>
                        <tr class="table-success"><td><strong>Tổng cộng:</strong></td><td><strong>${this.formatCurrency(booking.chiTietGia.tongTienSauKhuyenMai)}</strong></td></tr>
                    </table>
                </div>
            </div>
            
            ${booking.services && booking.services.length > 0 ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6><i class="fas fa-concierge-bell me-2"></i>Dịch vụ bổ sung</h6>
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Tên dịch vụ</th>
                                    <th>Số lượng</th>
                                    <th>Đơn giá</th>
                                    <th>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${booking.services.map(service => `
                                    <tr>
                                        <td>${service.Ten_dich_vu}</td>
                                        <td>${service.So_luong}</td>
                                        <td>${this.formatCurrency(service.Gia)}</td>
                                        <td>${this.formatCurrency(service.Thanh_tien)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
            
            ${this.canConfirmPayment(booking) ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Lưu ý:</strong> Sau khi xác nhận thanh toán, hệ thống sẽ tự động tạo hóa đơn và vé cho khách hàng.
                        </div>
                    </div>
                </div>
            ` : `
                <div class="row mt-3">
                    <div class="col-12">
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>Lưu ý:</strong> Booking này có trạng thái "${status}" nên không thể xác nhận thanh toán.
                        </div>
                    </div>
                </div>
            `}
        `;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('paymentConfirmationModal'));
        modal.show();
    }

    /**
     * Confirm payment modal
     */
    confirmPaymentModal(bookingId) {
        this.currentBookingId = bookingId;
        this.viewPaymentDetails(bookingId);
    }

    /**
     * Confirm payment
     */
    async confirmPayment() {
        if (!this.currentBookingId) {
            this.showError('Không tìm thấy mã booking');
            return;
        }

        try {
            console.log('💰 Confirming payment for booking:', this.currentBookingId);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/admin/confirm-payment/${this.currentBookingId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phuong_thuc_thanh_toan: 'Admin xác nhận',
                    ghi_chu: 'Xác nhận thanh toán bởi admin'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Payment confirmation result:', data);

            if (data.status === 'success') {
                this.showPaymentSuccessModal(data.data);
                this.loadPendingPayments(); // Refresh the list
            } else {
                throw new Error(data.message || 'Lỗi xác nhận thanh toán');
            }
        } catch (error) {
            console.error('❌ Error confirming payment:', error);
            this.showError('Không thể xác nhận thanh toán: ' + error.message);
        }
    }

    /**
     * Show payment success modal
     */
    showPaymentSuccessModal(data) {
        // Close confirmation modal
        const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('paymentConfirmationModal'));
        confirmationModal.hide();

        // Fill success modal data
        document.getElementById('successInvoiceId').textContent = data.hoaDon.maHoaDon;
        document.getElementById('successInvoiceDate').textContent = new Date(data.hoaDon.ngayLap).toLocaleString('vi-VN');
        document.getElementById('successTotalAmount').textContent = this.formatCurrency(data.hoaDon.tongTien);
        document.getElementById('successTotalTickets').textContent = data.ve.tongSoVe;

        // Fill tickets list
        const ticketsList = document.getElementById('successTicketsList');
        ticketsList.innerHTML = data.ve.danhSachVe.map(ticket => `
            <tr>
                <td>${ticket.So_ve}</td>
                <td>${this.formatCurrency(ticket.Gia_ve)}</td>
                <td><span class="badge bg-success">${ticket.Trang_thai_ve}</span></td>
            </tr>
        `).join('');

        // Show success modal
        const successModal = new bootstrap.Modal(document.getElementById('paymentSuccessModal'));
        successModal.show();
    }

    /**
     * Print invoice
     */
    printInvoice() {
        // This would implement invoice printing functionality
        console.log('🖨️ Printing invoice...');
        window.print();
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Add to alert container
        const alertContainer = document.getElementById('alertContainer');
        alertContainer.appendChild(alertDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        // Add to alert container
        const alertContainer = document.getElementById('alertContainer');
        alertContainer.appendChild(alertDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Initialize payment confirmation manager when DOM is loaded
let paymentManager;
document.addEventListener('DOMContentLoaded', function() {
    paymentManager = new PaymentConfirmationManager();
});

// Export for global access
window.paymentManager = paymentManager;

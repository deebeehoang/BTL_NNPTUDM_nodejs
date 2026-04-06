/**
 * Admin Promotion Management
 * Handles all promotion-related functionality for admin panel
 */

class PromotionManager {
    constructor() {
        this.currentPromotion = null;
        this.allPromotions = [];
        this.allTours = [];
        this.init();
    }

    init() {
        this.loadPromotions();
        this.loadTours();
        this.loadCouponsForSelect();
        this.bindEvents();
    }

    bindEvents() {
        // Quick action buttons
        document.getElementById('saveGlobalDiscountBtn')?.addEventListener('click', () => this.saveGlobalDiscount());
        document.getElementById('saveCouponBtn')?.addEventListener('click', () => this.saveCoupon());
        document.getElementById('attachCouponBtn')?.addEventListener('click', () => this.attachCouponToTour());
        
        // Promotion management buttons
        document.getElementById('addPromotionBtn')?.addEventListener('click', () => this.showAddPromotionModal());
        document.getElementById('viewPromotionStatsBtn')?.addEventListener('click', () => this.showPromotionStats());
        document.getElementById('savePromotionBtn')?.addEventListener('click', () => this.savePromotion());
        
        // Search and filter
        document.getElementById('promotionSearchInput')?.addEventListener('input', (e) => this.filterPromotions());
        document.getElementById('promotionStatusFilter')?.addEventListener('change', () => this.filterPromotions());
        
        // Auto-fill tour ID when editing tour
        this.autoFillTourId();
        
        // Check coupon code uniqueness
        document.getElementById('couponCodeInput')?.addEventListener('blur', (e) => this.checkCouponCodeUniqueness(e.target.value));
    }

    async loadPromotions() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/promotions/admin/all`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load promotions');
            
            const data = await response.json();
            this.allPromotions = data.data || [];
            this.renderPromotionTable(this.allPromotions);
        } catch (error) {
            console.error('Error loading promotions:', error);
            this.showError('Không thể tải danh sách khuyến mãi');
        }
    }

    async loadTours() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/tours`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load tours');
            
            const data = await response.json();
            this.allTours = data.data?.tours || [];
            this.renderTourCheckboxes();
        } catch (error) {
            console.error('Error loading tours:', error);
        }
    }

    async loadCouponsForSelect() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/promotions/admin/all`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load coupons');
            
            const data = await response.json();
            const coupons = (data.data || []).filter(p => p.Ma_km !== 'GLOBAL_PERCENT');
            
            const select = document.getElementById('attachCouponSelect');
            if (select) {
                select.innerHTML = '<option value="">-- Chọn coupon --</option>';
                coupons.forEach(coupon => {
                    const option = document.createElement('option');
                    option.value = coupon.Ma_km;
                    option.textContent = `${coupon.Ma_km} - ${coupon.Ten_km || 'N/A'} (${coupon.Gia_tri}%)`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading coupons:', error);
        }
    }

    renderTourCheckboxes() {
        const container = document.getElementById('tourCheckboxList');
        if (!container) return;

        if (this.allTours.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted">Chưa có tour nào</div>';
            return;
        }

        container.innerHTML = this.allTours.map(tour => `
            <div class="col-md-4 col-lg-3">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${tour.Ma_tour}" id="tour_${tour.Ma_tour}">
                    <label class="form-check-label" for="tour_${tour.Ma_tour}">
                        ${tour.Ten_tour}
                    </label>
                </div>
            </div>
        `).join('');
    }

    filterPromotions() {
        const searchTerm = (document.getElementById('promotionSearchInput')?.value || '').toLowerCase();
        const statusFilter = document.getElementById('promotionStatusFilter')?.value || '';

        let filtered = this.allPromotions;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(promo => 
                (promo.Ma_km && promo.Ma_km.toLowerCase().includes(searchTerm)) ||
                (promo.Ten_km && promo.Ten_km.toLowerCase().includes(searchTerm))
            );
        }

        // Filter by status
        if (statusFilter) {
            filtered = filtered.filter(promo => {
                const isActive = this.isPromotionActive(promo);
                if (statusFilter === 'active') return isActive;
                if (statusFilter === 'inactive') return !isActive;
                if (statusFilter === 'expired') {
                    const endDate = promo.Ngay_ket_thuc ? new Date(promo.Ngay_ket_thuc) : null;
                    return endDate && new Date() > endDate;
                }
                return true;
            });
        }

        this.renderPromotionTable(filtered);
    }

    renderPromotionTable(promotions) {
        const tbody = document.getElementById('promotionTableBody');
        if (!tbody) return;

        if (promotions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        <i class="fas fa-tags me-2"></i>Không tìm thấy khuyến mãi nào
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = promotions.map(promo => {
            const isActive = this.isPromotionActive(promo);
            const isExpired = promo.Ngay_ket_thuc ? new Date(promo.Ngay_ket_thuc) < new Date() : false;
            
            let statusBadge = '';
            if (isExpired) {
                statusBadge = '<span class="badge bg-danger">Đã hết hạn</span>';
            } else if (isActive) {
                statusBadge = '<span class="badge bg-success">Đang hoạt động</span>';
            } else {
                statusBadge = '<span class="badge bg-secondary">Không hoạt động</span>';
            }

            return `
                <tr>
                    <td><strong>${promo.Ma_km}</strong></td>
                    <td>${promo.Ten_km || 'N/A'}</td>
                    <td><span class="badge bg-primary">${promo.Gia_tri}%</span></td>
                    <td>${this.formatDate(promo.Ngay_bat_dau) || 'Không giới hạn'}</td>
                    <td>${this.formatDate(promo.Ngay_ket_thuc) || 'Không giới hạn'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <span class="badge bg-info">${promo.so_tour_ap_dung || 0}</span>
                        ${promo.danh_sach_tour ? `<small class="text-muted d-block">${promo.danh_sach_tour}</small>` : ''}
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="promotionManager.editPromotion('${promo.Ma_km}')" title="Sửa">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="promotionManager.hidePromotion('${promo.Ma_km}')" title="Ẩn">
                                <i class="fas fa-eye-slash"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="promotionManager.deletePromotion('${promo.Ma_km}')" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async checkCouponCodeUniqueness(code) {
        if (!code) return;
        
        const exists = this.allPromotions.some(p => p.Ma_km === code && p.Ma_km !== this.currentPromotion?.Ma_km);
        if (exists) {
            this.showError('Mã coupon này đã tồn tại. Vui lòng chọn mã khác.');
            document.getElementById('couponCodeInput').classList.add('is-invalid');
        } else {
            document.getElementById('couponCodeInput').classList.remove('is-invalid');
        }
    }

    async saveGlobalDiscount() {
        const input = document.getElementById('globalDiscountInput');
        const value = parseFloat(input.value);
        
        if (isNaN(value) || value < 0 || value > 100) {
            this.showError('Giá trị % không hợp lệ (0-100)');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/promotions/global`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    Gia_tri: value,
                    Ten_km: 'Giảm giá toàn site',
                    Mo_ta: `Giảm ${value}% cho tất cả tour`
                })
            });

            if (!response.ok) throw new Error('Failed to save global discount');
            
            this.showSuccess('Đã lưu giảm giá toàn site');
            input.value = '';
            this.loadPromotions();
        } catch (error) {
            console.error('Error saving global discount:', error);
            this.showError('Lỗi khi lưu giảm giá toàn site');
        }
    }

    async saveCoupon() {
        const codeInput = document.getElementById('couponCodeInput');
        const percentInput = document.getElementById('couponPercentInput');
        const nameInput = document.getElementById('couponNameInput');
        const startDateInput = document.getElementById('couponStartDateInput');
        const endDateInput = document.getElementById('couponEndDateInput');
        const descriptionInput = document.getElementById('couponDescriptionInput');
        
        const code = codeInput.value.trim();
        const percent = parseFloat(percentInput.value);
        const name = nameInput.value.trim();
        const startDate = startDateInput.value || null;
        const endDate = endDateInput.value || null;
        const description = descriptionInput.value.trim();

        if (!code) {
            this.showError('Nhập mã coupon');
            return;
        }

        if (isNaN(percent) || percent <= 0 || percent > 100) {
            this.showError('% coupon không hợp lệ (0-100)');
            return;
        }

        // Check uniqueness
        const exists = this.allPromotions.some(p => p.Ma_km === code && p.Ma_km !== this.currentPromotion?.Ma_km);
        if (exists) {
            this.showError('Mã coupon này đã tồn tại. Vui lòng chọn mã khác.');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/promotions/coupon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    Ma_km: code,
                    Gia_tri: percent,
                    Ten_km: name || `Coupon ${code}`,
                    Mo_ta: description || `Giảm ${percent}% với mã ${code}`,
                    Ngay_bat_dau: startDate,
                    Ngay_ket_thuc: endDate
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save coupon');
            }
            
            this.showSuccess('Đã lưu coupon');
            document.getElementById('couponForm').reset();
            this.loadPromotions();
            this.loadCouponsForSelect();
        } catch (error) {
            console.error('Error saving coupon:', error);
            this.showError(error.message || 'Lỗi khi lưu coupon');
        }
    }

    async attachCouponToTour() {
        const couponSelect = document.getElementById('attachCouponSelect');
        const tourInput = document.getElementById('attachTourIdInput');
        
        const couponCode = couponSelect?.value;
        const tourId = tourInput?.value.trim();

        if (!couponCode) {
            this.showError('Chọn coupon');
            return;
        }

        // Get selected tours from checkboxes
        const selectedTours = Array.from(document.querySelectorAll('#tourCheckboxList input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        // If tour ID is provided, use it; otherwise use selected checkboxes
        const toursToAttach = tourId ? [tourId] : selectedTours;

        if (toursToAttach.length === 0) {
            this.showError('Chọn ít nhất một tour');
            return;
        }

        try {
            // Attach coupon to all selected tours
            const promises = toursToAttach.map(tourId => 
                fetch(`${CONFIG.API_BASE_URL}/promotions/attach-to-tour`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        Ma_tour: tourId,
                        Ma_km: couponCode
                    })
                })
            );

            const results = await Promise.all(promises);
            const failed = results.filter(r => !r.ok);

            if (failed.length > 0) {
                throw new Error(`Không thể gắn coupon cho ${failed.length} tour`);
            }
            
            this.showSuccess(`Đã gắn coupon vào ${toursToAttach.length} tour`);
            tourInput.value = '';
            // Uncheck all checkboxes
            document.querySelectorAll('#tourCheckboxList input[type="checkbox"]').forEach(cb => cb.checked = false);
            this.loadPromotions();
        } catch (error) {
            console.error('Error attaching coupon:', error);
            this.showError(error.message || 'Lỗi khi gắn coupon vào tour');
        }
    }

    showAddPromotionModal() {
        this.currentPromotion = null;
        this.clearPromotionForm();
        document.getElementById('promotionModalLabel').textContent = 'Thêm Khuyến mãi';
        new bootstrap.Modal(document.getElementById('promotionModal')).show();
    }

    async editPromotion(maKm) {
        try {
            const promotion = this.allPromotions.find(p => p.Ma_km === maKm);
            
            if (!promotion) {
                this.showError('Không tìm thấy khuyến mãi');
                return;
            }

            this.currentPromotion = promotion;
            
            // Fill form in coupon management tab
            document.getElementById('couponCodeInput').value = promotion.Ma_km;
            document.getElementById('couponPercentInput').value = promotion.Gia_tri || '';
            document.getElementById('couponNameInput').value = promotion.Ten_km || '';
            document.getElementById('couponDescriptionInput').value = promotion.Mo_ta || '';
            
            if (promotion.Ngay_bat_dau) {
                const startDate = new Date(promotion.Ngay_bat_dau);
                document.getElementById('couponStartDateInput').value = startDate.toISOString().slice(0, 16);
            }
            if (promotion.Ngay_ket_thuc) {
                const endDate = new Date(promotion.Ngay_ket_thuc);
                document.getElementById('couponEndDateInput').value = endDate.toISOString().slice(0, 16);
            }
            
            // Switch to coupon management tab
            const tab = new bootstrap.Tab(document.getElementById('coupon-management-tab'));
            tab.show();
        } catch (error) {
            console.error('Error loading promotion:', error);
            this.showError('Lỗi khi tải thông tin khuyến mãi');
        }
    }

    fillPromotionForm(promotion) {
        document.getElementById('promoCode').value = promotion.Ma_km;
        document.getElementById('promoName').value = promotion.Ten_km || '';
        document.getElementById('promoValue').value = promotion.Gia_tri || '';
        document.getElementById('promoDescription').value = promotion.Mo_ta || '';
        document.getElementById('promoStartDate').value = promotion.Ngay_bat_dau ? promotion.Ngay_bat_dau.split('T')[0] : '';
        document.getElementById('promoEndDate').value = promotion.Ngay_ket_thuc ? promotion.Ngay_ket_thuc.split('T')[0] : '';
        document.getElementById('promoType').value = promotion.Ma_km === 'GLOBAL_PERCENT' ? 'global' : 'specific';
    }

    clearPromotionForm() {
        const form = document.getElementById('promotionForm');
        if (form) form.reset();
    }

    async savePromotion() {
        const form = document.getElementById('promotionForm');
        if (!form || !form.checkValidity()) {
            if (form) form.reportValidity();
            return;
        }

        const formData = {
            Ma_km: document.getElementById('promoCode').value.trim(),
            Ten_km: document.getElementById('promoName').value.trim(),
            Gia_tri: parseFloat(document.getElementById('promoValue').value),
            Mo_ta: document.getElementById('promoDescription').value.trim(),
            Ngay_bat_dau: document.getElementById('promoStartDate').value || null,
            Ngay_ket_thuc: document.getElementById('promoEndDate').value || null
        };

        try {
            const url = this.currentPromotion ? 
                `${CONFIG.API_BASE_URL}/promotions/${this.currentPromotion.Ma_km}` : 
                `${CONFIG.API_BASE_URL}/promotions/coupon`;
            
            const method = this.currentPromotion ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save promotion');
            
            this.showSuccess(this.currentPromotion ? 'Cập nhật khuyến mãi thành công' : 'Thêm khuyến mãi thành công');
            bootstrap.Modal.getInstance(document.getElementById('promotionModal')).hide();
            this.loadPromotions();
        } catch (error) {
            console.error('Error saving promotion:', error);
            this.showError('Lỗi khi lưu khuyến mãi');
        }
    }

    async hidePromotion(maKm) {
        if (!confirm('Bạn có chắc muốn ẩn khuyến mãi này?')) return;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/promotions/${maKm}/hide`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to hide promotion');
            
            this.showSuccess('Đã ẩn khuyến mãi');
            this.loadPromotions();
        } catch (error) {
            console.error('Error hiding promotion:', error);
            this.showError('Lỗi khi ẩn khuyến mãi');
        }
    }

    async deletePromotion(maKm) {
        if (!confirm('Bạn có chắc muốn xóa khuyến mãi này? Hành động này không thể hoàn tác.')) return;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/promotions/${maKm}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete promotion');
            }
            
            this.showSuccess('Đã xóa khuyến mãi');
            this.loadPromotions();
            this.loadCouponsForSelect();
        } catch (error) {
            console.error('Error deleting promotion:', error);
            this.showError(error.message || 'Lỗi khi xóa khuyến mãi');
        }
    }

    async showPromotionStats() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/promotions/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load promotion stats');
            
            const data = await response.json();
            this.renderPromotionStats(data.data);
            new bootstrap.Modal(document.getElementById('promotionStatsModal')).show();
        } catch (error) {
            console.error('Error loading promotion stats:', error);
            this.showError('Lỗi khi tải thống kê khuyến mãi');
        }
    }

    renderPromotionStats(stats) {
        // Update total stats
        document.getElementById('totalPromotions').textContent = stats.totalStats.tong_so_km || 0;
        document.getElementById('totalUsage').textContent = stats.totalStats.tong_so_booking || 0;
        document.getElementById('totalRevenue').textContent = this.formatCurrency(stats.totalStats.tong_doanh_thu || 0);
        document.getElementById('totalDiscount').textContent = this.formatCurrency(stats.totalStats.tong_giam_gia || 0);

        // Update usage stats table
        const tbody = document.getElementById('promotionStatsTableBody');
        if (!tbody) return;

        if (!stats.usageStats || stats.usageStats.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        <i class="fas fa-chart-bar me-2"></i>Chưa có dữ liệu thống kê
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = stats.usageStats.map(stat => `
            <tr>
                <td><strong>${stat.Ma_km}</strong></td>
                <td>${stat.Ten_km || 'N/A'}</td>
                <td><span class="badge bg-primary">${stat.Gia_tri}%</span></td>
                <td><span class="badge bg-success">${stat.so_luot_su_dung}</span></td>
                <td>${this.formatCurrency(stat.tong_doanh_thu)}</td>
                <td class="text-danger">${this.formatCurrency(stat.tong_giam_gia)}</td>
            </tr>
        `).join('');
    }

    autoFillTourId() {
        // Auto-fill tour ID when editing a tour
        const tourIdInput = document.getElementById('attachTourIdInput');
        if (tourIdInput) {
            // Listen for tour form changes
            const tourForm = document.getElementById('tourForm');
            if (tourForm) {
                const maTourInput = document.getElementById('maTour');
                if (maTourInput) {
                    maTourInput.addEventListener('input', (e) => {
                        tourIdInput.value = e.target.value;
                    });
                }
            }
        }
    }

    isPromotionActive(promotion) {
        const now = new Date();
        const startDate = promotion.Ngay_bat_dau ? new Date(promotion.Ngay_bat_dau) : null;
        const endDate = promotion.Ngay_ket_thuc ? new Date(promotion.Ngay_ket_thuc) : null;
        
        if (startDate && now < startDate) return false;
        if (endDate && now > endDate) return false;
        
        return true;
    }

    formatDate(dateString) {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('vi-VN');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    showSuccess(message) {
        // You can replace this with your preferred notification system
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Thành công',
                text: message,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            alert('✅ ' + message);
        }
    }

    showError(message) {
        // You can replace this with your preferred notification system
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi',
                text: message
            });
        } else {
            alert('❌ ' + message);
        }
    }
}

// Initialize promotion manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.promotionManager = new PromotionManager();
});

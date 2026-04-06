/**
 * Tour Stepper - Quản lý thanh tiến trình và điều hướng giữa các bước
 * 7 bước: Thông tin cơ bản -> Điểm đến -> Lịch khởi hành -> Mô tả -> Bản đồ -> Lịch trình -> Khuyến mãi
 */

let currentStep = 1;
const totalSteps = 8;

/**
 * Khởi tạo stepper
 */
function initStepper() {
    console.log('🚀 Initializing tour stepper...');
    
    // Kiểm tra xem có đang edit tour không
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('edit') ? true : false;
    
    if (isEditMode) {
        // Khi edit, cho phép nhảy tới bất kỳ bước nào
        enableAllSteps();
    } else {
        // Khi tạo mới, chỉ cho phép bước đầu tiên
        disableStepsAfter(1);
    }
    
    // Cập nhật UI
    updateStepperUI();
    
    // Thêm event listeners
    setupStepClickHandlers();
    setupNavigationButtons();
    
    console.log('✅ Stepper initialized');
}

/**
 * Enable tất cả các bước (dùng khi edit)
 */
function enableAllSteps() {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('disabled');
    });
}

/**
 * Disable các bước sau step hiện tại
 */
function disableStepsAfter(stepNumber) {
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = parseInt(step.dataset.step);
        if (stepNum > stepNumber) {
            step.classList.add('disabled');
        } else {
            step.classList.remove('disabled');
        }
    });
}

/**
 * Cập nhật UI của stepper
 */
function updateStepperUI() {
    // Cập nhật active step
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = parseInt(step.dataset.step);
        
        step.classList.remove('active', 'completed');
        
        if (stepNum === currentStep) {
            step.classList.add('active');
        } else if (stepNum < currentStep) {
            step.classList.add('completed');
        }
    });
    
    // Cập nhật progress bar
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.getElementById('stepperProgress').style.width = progress + '%';
    
    // Hiển thị/ẩn nút navigation
    const btnPrev = document.getElementById('btnPrevStep');
    const btnNext = document.getElementById('btnNextStep');
    const btnSubmit = document.getElementById('submitBtn');
    
    if (currentStep === 1) {
        btnPrev.style.display = 'none';
    } else {
        btnPrev.style.display = 'inline-block';
    }
    
    if (currentStep === totalSteps) {
        // Step 8 (Preview) - Hiển thị nút "Lưu Tour"
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'inline-block';
    } else {
        btnNext.style.display = 'inline-block';
        btnSubmit.style.display = 'none';
    }
    
    // Cập nhật hiển thị step content
    document.querySelectorAll('.step-content').forEach(content => {
        const stepNum = parseInt(content.dataset.step);
        content.classList.remove('active');
        if (stepNum === currentStep) {
            content.classList.add('active');
        }
    });
}

/**
 * Setup click handlers cho các step
 */
function setupStepClickHandlers() {
    document.querySelectorAll('.step').forEach(step => {
        step.addEventListener('click', function() {
            if (this.classList.contains('disabled')) {
                return;
            }
            
            const stepNum = parseInt(this.dataset.step);
            
            // Kiểm tra xem có đang edit không
            const urlParams = new URLSearchParams(window.location.search);
            const isEditMode = urlParams.get('edit') ? true : false;
            
            if (isEditMode) {
                // Khi edit: Cho phép nhảy đến bất kỳ step nào
                goToStep(stepNum);
            } else {
                // Khi tạo mới: Chỉ cho phép nhảy đến các step đã completed hoặc step tiếp theo
                if (stepNum <= currentStep || step.classList.contains('completed')) {
                    goToStep(stepNum);
                } else {
                    // Hiển thị thông báo
                    showStepValidationError('Vui lòng hoàn thành các bước trước đó trước khi chuyển đến bước này');
                }
            }
        });
    });
}

/**
 * Setup navigation buttons
 */
function setupNavigationButtons() {
    document.getElementById('btnPrevStep').addEventListener('click', function() {
        // Lưu draft trước khi chuyển
        saveDraft();
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    });
    
    document.getElementById('btnNextStep').addEventListener('click', function() {
        if (validateCurrentStep()) {
            // Lưu draft trước khi chuyển
            saveDraft();
            if (currentStep < totalSteps) {
                goToStep(currentStep + 1);
            }
        }
    });
}

/**
 * Điều hướng tới step cụ thể
 */
function goToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > totalSteps) {
        return;
    }
    
    // Lưu draft trước khi chuyển step
    saveDraft();
    
    // Validate step hiện tại trước khi chuyển (chỉ khi đi tới)
    // KHÔNG validate nếu đang submit từ preview (step 8)
    if (stepNumber > currentStep && stepNumber !== 8 && !validateCurrentStep()) {
        return;
    }
    
    // Nếu đang submit từ preview, không validate
    if (window.submitFromPreview && stepNumber === 8) {
        // Cho phép submit mà không validate
    }
    
    // Đánh dấu step hiện tại là completed
    if (stepNumber > currentStep) {
        markStepCompleted(currentStep);
    }
    
    // Chỉ update currentStep và UI nếu không phải đang submit từ preview
    // (để tránh redirect khi submit)
    if (!window.submitFromPreview || stepNumber !== 8) {
        currentStep = stepNumber;
        updateStepperUI();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // Nếu đang submit từ preview, chỉ log, không update UI
        console.log('✅ Đang submit từ preview, bỏ qua update UI');
    }
    
    // Special handling cho các step
    if (stepNumber === 6) {
        // Kiểm tra validation trước khi vào step 6
        const selectedSchedule = $('#selectScheduleForItinerary').val();
        const hasSchedules = $('#selectScheduleForItinerary option').length > 1;
        
        // Kiểm tra xem có lịch khởi hành tạm thời trong localStorage không
        const tempScheduleData = localStorage.getItem('newScheduleData');
        const hasTempSchedule = tempScheduleData !== null;
        
        if (!selectedSchedule && (hasSchedules || hasTempSchedule)) {
            // Có lịch khởi hành (từ API hoặc localStorage) nhưng chưa chọn - chỉ hiển thị thông báo, không block
            console.log('⚠️ Chưa chọn lịch khởi hành, nhưng vẫn cho phép vào step 6');
            
            // Nếu có lịch tạm thời, tự động thêm vào dropdown và chọn
            if (hasTempSchedule && !hasSchedules) {
                try {
                    const tempSchedule = JSON.parse(tempScheduleData);
                    if (typeof addScheduleToItineraryDropdown === 'function') {
                        addScheduleToItineraryDropdown(tempSchedule);
                    }
                } catch (error) {
                    console.error('Lỗi khi parse temp schedule:', error);
                }
            }
        } else if (!selectedSchedule && !hasSchedules && !hasTempSchedule) {
            // Không có lịch khởi hành nào - quay lại step 3
            console.log('⚠️ Không có lịch khởi hành, quay lại step 3');
            showStepValidationError('Chưa có lịch khởi hành. Vui lòng tạo lịch khởi hành ở bước 3 trước');
            setTimeout(() => {
                goToStep(3);
            }, 1500);
            return;
        }
        
        // Gọi handleItineraryStep để enable/disable step
        handleItineraryStep();
    } else if (stepNumber === 8) {
        // Step 8: Preview - Generate preview
        generateTourPreview();
    }
    
    console.log(`📍 Moved to step ${stepNumber}`);
}

/**
 * Validate step hiện tại
 */
function validateCurrentStep() {
    const errors = [];
    
    switch (currentStep) {
        case 1: // Thông tin cơ bản
            if (!$('#ma_tour').val().trim()) {
                errors.push('Vui lòng nhập mã tour');
            }
            if (!$('#ten_tour').val().trim()) {
                errors.push('Vui lòng nhập tên tour');
            }
            if (!$('#thoi_gian').val() || parseInt($('#thoi_gian').val()) <= 0) {
                errors.push('Vui lòng nhập thời gian hợp lệ');
            }
            if (!$('#gia_nguoi_lon').val() || parseFloat($('#gia_nguoi_lon').val()) <= 0) {
                errors.push('Vui lòng nhập giá người lớn hợp lệ');
            }
            if (!$('#gia_tre_em').val() || parseFloat($('#gia_tre_em').val()) < 0) {
                errors.push('Vui lòng nhập giá trẻ em hợp lệ');
            }
            break;
            
        case 2: // Điểm đến (không bắt buộc)
            // Có thể bỏ qua
            break;
            
        case 3: // Lịch khởi hành (không bắt buộc)
            // Có thể bỏ qua
            break;
            
        case 4: // Mô tả (không bắt buộc)
            // Có thể bỏ qua
            break;
            
        case 5: // Bản đồ (không bắt buộc)
            // Có thể bỏ qua
            break;
            
        case 6: // Lịch trình chi tiết
            // Kiểm tra xem đã chọn lịch khởi hành chưa
            const selectedSchedule = $('#selectScheduleForItinerary').val();
            const hasSchedules = $('#selectScheduleForItinerary option').length > 1;
            
            if (!selectedSchedule) {
                if (hasSchedules) {
                    // Có lịch khởi hành nhưng chưa chọn - chỉ cảnh báo, không block
                    console.log('⚠️ Có lịch khởi hành nhưng chưa chọn');
                    // Không thêm vào errors để cho phép tiếp tục
                } else {
                    // Không có lịch khởi hành nào - bắt buộc phải có
                    errors.push('Vui lòng tạo lịch khởi hành ở bước 3 trước khi quản lý lịch trình');
                }
            }
            break;
            
        case 7: // Khuyến mãi (không bắt buộc)
            // Có thể bỏ qua - không cần validate
            break;
            
        case 8: // Preview (không cần validate)
            // Không cần validate
            break;
    }
    
    if (errors.length > 0) {
        showStepValidationError(errors.join(', '));
        return false;
    }
    
    hideStepValidationError();
    return true;
}

/**
 * Hiển thị lỗi validation
 */
function showStepValidationError(message) {
    let errorDiv = document.querySelector(`.step-content[data-step="${currentStep}"] .step-validation-error`);
    
    if (!errorDiv) {
        // Tạo error div nếu chưa có
        const stepContent = document.querySelector(`.step-content[data-step="${currentStep}"]`);
        errorDiv = document.createElement('div');
        errorDiv.className = 'step-validation-error';
        stepContent.insertBefore(errorDiv, stepContent.firstChild);
    }
    
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    // Scroll to error
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Ẩn lỗi validation
 */
function hideStepValidationError() {
    document.querySelectorAll('.step-validation-error').forEach(error => {
        error.classList.remove('show');
    });
}

/**
 * Đánh dấu step là completed
 */
function markStepCompleted(stepNumber) {
    const step = document.querySelector(`.step[data-step="${stepNumber}"]`);
    if (step) {
        step.classList.add('completed');
    }
}

/**
 * Xử lý đặc biệt cho step 6 (lịch trình chi tiết)
 */
function handleItineraryStep() {
    // Đợi một chút để đảm bảo dropdown đã được load
    setTimeout(() => {
        // Kiểm tra xem đã chọn lịch khởi hành chưa
        const selectedSchedule = $('#selectScheduleForItinerary').val();
        const step6 = document.querySelector('.step[data-step="6"]');
        
        if (!step6) return;
        
        // Kiểm tra xem có lịch khởi hành nào trong dropdown không
        const hasSchedules = $('#selectScheduleForItinerary option').length > 1; // > 1 vì có option "Chọn lịch khởi hành"
        
        // Kiểm tra xem có lịch khởi hành tạm thời trong localStorage không
        const tempScheduleData = localStorage.getItem('newScheduleData');
        const hasTempSchedule = tempScheduleData !== null;
        
        if (!selectedSchedule) {
            // Nếu chưa chọn, disable step 6 chỉ khi không có lịch nào (cả từ API và localStorage)
            if (!hasSchedules && !hasTempSchedule) {
                step6.classList.add('disabled');
            } else {
                // Có lịch khởi hành (từ API hoặc localStorage), enable step 6
                step6.classList.remove('disabled');
            }
            
            // Nếu đang ở step 6 và có lịch khởi hành trong dropdown hoặc localStorage, chỉ hiển thị thông báo
            if (currentStep === 6) {
                if (hasSchedules || hasTempSchedule) {
                    // Có lịch khởi hành nhưng chưa chọn - chỉ hiển thị thông báo, không redirect
                    showStepValidationError('Vui lòng chọn lịch khởi hành ở dropdown phía trên để quản lý lịch trình');
                    
                    // Nếu có lịch tạm thời và chưa có trong dropdown, thêm vào
                    if (hasTempSchedule && !hasSchedules) {
                        try {
                            const tempSchedule = JSON.parse(tempScheduleData);
                            if (typeof addScheduleToItineraryDropdown === 'function') {
                                addScheduleToItineraryDropdown(tempSchedule);
                            }
                        } catch (error) {
                            console.error('Lỗi khi parse temp schedule:', error);
                        }
                    }
                } else {
                    // Không có lịch khởi hành nào - hiển thị thông báo và gợi ý quay lại step 3
                    showStepValidationError('Chưa có lịch khởi hành. Vui lòng tạo lịch khởi hành ở bước 3 trước');
                }
            }
        } else {
            // Enable step 6 nếu đã chọn lịch khởi hành
            step6.classList.remove('disabled');
            hideStepValidationError();
        }
    }, 300); // Đợi 300ms để dropdown được load
}

/**
 * Lưu draft (tùy chọn) - Lưu tất cả dữ liệu
 */
function saveDraft() {
    try {
        // Thu thập tất cả dữ liệu từ form
        const draftData = {
            step: currentStep,
            formData: {
                // Thông tin cơ bản
                ma_tour: $('#ma_tour').val(),
                ten_tour: $('#ten_tour').val(),
                thoi_gian: $('#thoi_gian').val(),
                tinh_trang: $('#tinh_trang').val(),
                loai_tour: $('#loai_tour').val(),
                gia_nguoi_lon: $('#gia_nguoi_lon').val(),
                gia_tre_em: $('#gia_tre_em').val(),
                mo_ta: $('#mo_ta').summernote('code'),
                
                // Map data
                latitude: $('#latitude').val(),
                longitude: $('#longitude').val(),
                map_address: $('#map_address').val(),
                
                // Điểm đến (selected destinations)
                dia_danh: []
            }
        };
        
        // Lưu các địa danh đã chọn
        $('input[name="dia_danh"]:checked').each(function() {
            draftData.formData.dia_danh.push({
                id: $(this).val(),
                name: $(this).data('name') || $(this).closest('label').text().trim()
            });
        });
        
        // Lưu lịch khởi hành đã chọn
        const selectedSchedule = $('#selectScheduleForItinerary').val();
        if (selectedSchedule) {
            draftData.formData.selected_schedule = selectedSchedule;
        }
        
        // Lưu thông tin khuyến mãi
        draftData.formData.promo = {
            ma_km: $('#promo_ma_km').val(),
            percent: $('#promo_percent').val(),
            start: $('#promo_start').val(),
            end: $('#promo_end').val()
        };
        
        // Lưu hình ảnh preview (nếu có)
        const imageInput = $('input[name="hinh_anh"]')[0];
        if (imageInput && imageInput.files && imageInput.files[0]) {
            // Lưu tên file (không lưu file thực tế vì quá lớn)
            draftData.formData.image_filename = imageInput.files[0].name;
        } else {
            // Lưu URL hình ảnh hiện tại (nếu đang edit)
            const previewImg = $('#preview-image');
            if (previewImg.attr('src') && previewImg.attr('src') !== '#') {
                draftData.formData.image_url = previewImg.attr('src');
            }
        }
        
        localStorage.setItem('tourDraft', JSON.stringify(draftData));
        console.log('💾 Draft saved at step', currentStep);
    } catch (error) {
        console.error('Error saving draft:', error);
    }
}

/**
 * Load draft (nếu có)
 */
function loadDraft() {
    const draftData = localStorage.getItem('tourDraft');
    if (draftData) {
        try {
            const draft = JSON.parse(draftData);
            // Fill form với draft data
            if (draft.formData) {
                // Load thông tin cơ bản
                Object.keys(draft.formData).forEach(key => {
                    if (key === 'dia_danh' || key === 'selected_schedule' || key === 'promo' || key === 'image_filename' || key === 'image_url') {
                        return; // Skip các field đặc biệt
                    }
                    
                    const element = document.getElementById(key) || $(`[name="${key}"]`)[0];
                    if (element) {
                        if (key === 'mo_ta') {
                            $('#mo_ta').summernote('code', draft.formData[key]);
                        } else {
                            $(element).val(draft.formData[key]);
                        }
                    }
                });
                
                // Load địa danh đã chọn
                if (draft.formData.dia_danh && Array.isArray(draft.formData.dia_danh)) {
                    draft.formData.dia_danh.forEach(diaDanh => {
                        const checkbox = $(`input[name="dia_danh"][value="${diaDanh.id}"]`);
                        if (checkbox.length) {
                            checkbox.prop('checked', true);
                        }
                    });
                }
                
                // Load lịch khởi hành đã chọn
                if (draft.formData.selected_schedule) {
                    $('#selectScheduleForItinerary').val(draft.formData.selected_schedule);
                }
                
                // Load khuyến mãi
                if (draft.formData.promo) {
                    $('#promo_ma_km').val(draft.formData.promo.ma_km || '');
                    $('#promo_percent').val(draft.formData.promo.percent || '');
                    $('#promo_start').val(draft.formData.promo.start || '');
                    $('#promo_end').val(draft.formData.promo.end || '');
                }
                
                // Load hình ảnh preview
                if (draft.formData.image_url) {
                    $('#preview-image').attr('src', draft.formData.image_url).show();
                }
            }
            
            // Restore step
            if (draft.step) {
                goToStep(draft.step);
            }
            
            console.log('📂 Draft loaded from step', draft.step);
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
}

/**
 * Clear draft
 */
function clearDraft() {
    localStorage.removeItem('tourDraft');
    console.log('🗑️ Draft cleared');
}

/**
 * Thu thập tất cả dữ liệu tour từ form
 */
function collectAllTourData() {
    const tourData = {
        // Thông tin cơ bản
        ma_tour: $('#ma_tour').val(),
        ten_tour: $('#ten_tour').val(),
        thoi_gian: $('#thoi_gian').val(),
        tinh_trang: $('#tinh_trang').val(),
        loai_tour: $('#loai_tour').val(),
        gia_nguoi_lon: $('#gia_nguoi_lon').val(),
        gia_tre_em: $('#gia_tre_em').val(),
        mo_ta: $('#mo_ta').summernote('code'),
        
        // Map data
        latitude: $('#latitude').val(),
        longitude: $('#longitude').val(),
        map_address: $('#map_address').val(),
        
        // Điểm đến
        dia_danh: [],
        
        // Lịch khởi hành
        selected_schedule: $('#selectScheduleForItinerary').val(),
        
        // Khuyến mãi
        promo: {
            ma_km: $('#promo_ma_km').val(),
            percent: $('#promo_percent').val(),
            start: $('#promo_start').val(),
            end: $('#promo_end').val()
        },
        
        // Hình ảnh
        image_url: $('#preview-image').attr('src') && $('#preview-image').attr('src') !== '#' 
            ? $('#preview-image').attr('src') 
            : null
    };
    
    // Thu thập địa danh đã chọn
    $('input[name="dia_danh"]:checked').each(function() {
        tourData.dia_danh.push({
            id: $(this).val(),
            name: $(this).data('name') || $(this).closest('label').text().trim()
        });
    });
    
    return tourData;
}

/**
 * Tạo preview tour
 */
function generateTourPreview() {
    const tourData = collectAllTourData();
    const previewContainer = document.getElementById('tourPreviewContainer');
    
    if (!previewContainer) return;
    
    // Format số tiền
    const formatCurrency = (amount) => {
        if (!amount) return 'Chưa có';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(parseInt(amount));
    };
    
    // Format ngày
    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa có';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };
    
    // Get badge cho tình trạng
    const getStatusBadge = (status) => {
        const badges = {
            'Còn chỗ': '<span class="preview-badge badge-success">Còn chỗ</span>',
            'Hết chỗ': '<span class="preview-badge badge-danger">Hết chỗ</span>',
            'Sắp mở': '<span class="preview-badge badge-warning">Sắp mở</span>'
        };
        return badges[status] || status;
    };
    
    // Get badge cho loại tour
    const getTourTypeBadge = (type) => {
        const types = {
            'trong_nuoc': '<span class="preview-badge badge-info">Trong nước</span>',
            'nuoc_ngoai': '<span class="preview-badge badge-warning">Nước ngoài</span>'
        };
        return types[type] || type;
    };
    
    // Tính giá sau khuyến mãi
    let finalPrice = tourData.gia_nguoi_lon ? parseInt(tourData.gia_nguoi_lon) : 0;
    if (tourData.promo.percent && parseInt(tourData.promo.percent) > 0) {
        finalPrice = finalPrice * (1 - parseInt(tourData.promo.percent) / 100);
    }
    
    let html = `
        <div class="preview-section">
            <h5><i class="fas fa-info-circle me-2"></i>Thông Tin Cơ Bản</h5>
            <div class="preview-row">
                <div class="preview-label">Mã Tour:</div>
                <div class="preview-value"><strong>${tourData.ma_tour || 'Chưa có'}</strong></div>
            </div>
            <div class="preview-row">
                <div class="preview-label">Tên Tour:</div>
                <div class="preview-value"><strong>${tourData.ten_tour || 'Chưa có'}</strong></div>
            </div>
            <div class="preview-row">
                <div class="preview-label">Thời Gian:</div>
                <div class="preview-value">${tourData.thoi_gian || 'Chưa có'} ngày</div>
            </div>
            <div class="preview-row">
                <div class="preview-label">Tình Trạng:</div>
                <div class="preview-value">${getStatusBadge(tourData.tinh_trang)}</div>
            </div>
            <div class="preview-row">
                <div class="preview-label">Loại Tour:</div>
                <div class="preview-value">${getTourTypeBadge(tourData.loai_tour)}</div>
            </div>
            <div class="preview-row">
                <div class="preview-label">Giá Người Lớn:</div>
                <div class="preview-value">${formatCurrency(tourData.gia_nguoi_lon)}</div>
            </div>
            <div class="preview-row">
                <div class="preview-label">Giá Trẻ Em:</div>
                <div class="preview-value">${formatCurrency(tourData.gia_tre_em)}</div>
            </div>
            ${tourData.image_url ? `
            <div class="preview-row">
                <div class="preview-label">Hình Ảnh:</div>
                <div class="preview-value">
                    <img src="${tourData.image_url}" alt="Tour image" class="preview-image">
                </div>
            </div>
            ` : ''}
        </div>
        
        <div class="preview-section">
            <h5><i class="fas fa-map-marker-alt me-2"></i>Mô Tả Tour</h5>
            <div class="preview-value">
                ${tourData.mo_ta ? tourData.mo_ta : '<em class="text-muted">Chưa có mô tả</em>'}
            </div>
        </div>
        
        <div class="preview-section">
            <h5><i class="fas fa-map-marked-alt me-2"></i>Điểm Đến</h5>
            <div class="preview-value">
                ${tourData.dia_danh && tourData.dia_danh.length > 0 
                    ? '<ul>' + tourData.dia_danh.map(d => `<li>${d.name}</li>`).join('') + '</ul>'
                    : '<em class="text-muted">Chưa chọn điểm đến</em>'}
            </div>
        </div>
        
        <div class="preview-section">
            <h5><i class="fas fa-calendar-alt me-2"></i>Lịch Khởi Hành</h5>
            <div class="preview-value">
                ${tourData.selected_schedule 
                    ? `<strong>${tourData.selected_schedule}</strong>` 
                    : '<em class="text-muted">Chưa chọn lịch khởi hành</em>'}
            </div>
        </div>
        
        ${tourData.latitude && tourData.longitude ? `
        <div class="preview-section">
            <h5><i class="fas fa-map me-2"></i>Vị Trí Trên Bản Đồ</h5>
            <div class="preview-value">
                <div><strong>Địa chỉ:</strong> ${tourData.map_address || 'Chưa có'}</div>
                <div><strong>Tọa độ:</strong> ${tourData.latitude}, ${tourData.longitude}</div>
                <div id="previewMap" class="preview-map"></div>
            </div>
        </div>
        ` : ''}
        
        <div class="preview-section">
            <h5><i class="fas fa-tag me-2"></i>Khuyến Mãi</h5>
            <div class="preview-value">
                ${tourData.promo.ma_km 
                    ? `
                        <div class="preview-row">
                            <div class="preview-label">Mã Coupon:</div>
                            <div class="preview-value"><strong>${tourData.promo.ma_km}</strong></div>
                        </div>
                        <div class="preview-row">
                            <div class="preview-label">Giảm Giá:</div>
                            <div class="preview-value">${tourData.promo.percent}%</div>
                        </div>
                        <div class="preview-row">
                            <div class="preview-label">Thời Gian:</div>
                            <div class="preview-value">${formatDate(tourData.promo.start)} - ${formatDate(tourData.promo.end)}</div>
                        </div>
                        <div class="preview-row">
                            <div class="preview-label">Giá Sau KM:</div>
                            <div class="preview-value"><strong class="text-danger">${formatCurrency(finalPrice)}</strong></div>
                        </div>
                    `
                    : '<em class="text-muted">Chưa có khuyến mãi</em>'}
            </div>
        </div>
    `;
    
    previewContainer.innerHTML = html;
    
    // Load map preview nếu có tọa độ
    if (tourData.latitude && tourData.longitude && typeof mapboxgl !== 'undefined') {
        setTimeout(() => {
            try {
                const previewMap = new mapboxgl.Map({
                    container: 'previewMap',
                    style: 'mapbox://styles/mapbox/streets-v11',
                    center: [parseFloat(tourData.longitude), parseFloat(tourData.latitude)],
                    zoom: 13
                });
                
                new mapboxgl.Marker()
                    .setLngLat([parseFloat(tourData.longitude), parseFloat(tourData.latitude)])
                    .setPopup(new mapboxgl.Popup().setHTML(`<strong>${tourData.ten_tour || 'Tour'}</strong><br>${tourData.map_address || ''}`))
                    .addTo(previewMap);
            } catch (error) {
                console.error('Error loading preview map:', error);
            }
        }, 100);
    }
}

// Auto-save draft mỗi 30 giây và khi chuyển step
setInterval(() => {
    if (currentStep > 0) {
        saveDraft();
    }
}, 30000);

// Export functions
window.initStepper = initStepper;
window.goToStep = goToStep;
window.validateCurrentStep = validateCurrentStep;
window.saveDraft = saveDraft;
window.loadDraft = loadDraft;
window.clearDraft = clearDraft;
window.collectAllTourData = collectAllTourData;
window.generateTourPreview = generateTourPreview;


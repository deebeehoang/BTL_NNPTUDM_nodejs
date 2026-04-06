$(document).ready(function() {
    // Khởi tạo quản lý lịch trình
    initItineraryManagement();
    
    // Khởi tạo Summernote cho textarea mô tả
    $('#mo_ta').summernote({
        height: 300,
        toolbar: [
            ['style', ['style']],
            ['font', ['bold', 'underline', 'clear']],
            ['color', ['color']],
            ['para', ['ul', 'ol', 'paragraph']],
            ['insert', ['link', 'picture']],
            ['view', ['fullscreen', 'codeview', 'help']]
        ],
        placeholder: 'Nhập mô tả chi tiết lịch trình tour...',
        callbacks: {
            onImageUpload: function(files) {
                // Xử lý upload hình ảnh nếu cần
                console.log('Image upload:', files);
            }
        }
    });

    // Xử lý preview hình ảnh
    $('input[name="hinh_anh"]').change(function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                $('#preview-image')
                    .attr('src', e.target.result)
                    .show();
            };
            reader.readAsDataURL(file);
        }
    });

    // Kiểm tra xem có phải đang chỉnh sửa tour không
    const urlParams = new URLSearchParams(window.location.search);
    const editTourId = urlParams.get('edit');
    
    if (editTourId) {
        // Cập nhật UI cho chế độ chỉnh sửa
        $('#pageTitle').text('Chỉnh Sửa Tour Du Lịch');
        $('#submitBtn').text('Cập Nhật Tour');
        
        // Lấy dữ liệu tour từ localStorage
        try {
            const tourDataString = localStorage.getItem('editTourData');
            console.log('Dữ liệu tour từ localStorage:', tourDataString);
            
            if (!tourDataString) {
                throw new Error('Không tìm thấy dữ liệu tour trong localStorage');
            }
            
            const tourData = JSON.parse(tourDataString);
            console.log('Dữ liệu tour sau khi parse:', tourData);
            
            // Kiểm tra và lấy dữ liệu tour từ đúng cấu trúc
            const tour = tourData.tour || tourData;
            console.log('Dữ liệu tour được sử dụng:', tour);
            
            // Điền dữ liệu vào form với xử lý dự phòng
            // Sử dụng nullish coalescing để lấy giá trị đầu tiên khác null/undefined
            $('#ma_tour').val(tour.Ma_tour || tour.ma_tour || '').prop('disabled', true);
            $('#ten_tour').val(tour.Ten_tour || tour.ten_tour || '');
            $('#thoi_gian').val(tour.Thoi_gian || tour.thoi_gian || '');
            
            // Đảm bảo giá trị select được chọn đúng
            const tinhTrang = tour.Tinh_trang || tour.tinh_trang || 'Còn chỗ';
            $('#tinh_trang').val(tinhTrang);
            
            const loaiTour = tour.Loai_tour || tour.loai_tour || 'trong_nuoc';
            $('#loai_tour').val(loaiTour);
            
            // Định dạng giá tiền
            const giaNguoiLon = tour.Gia_nguoi_lon || tour.gia_nguoi_lon || 0;
            $('#gia_nguoi_lon').val(giaNguoiLon);
            
            const giaTreEm = tour.Gia_tre_em || tour.gia_tre_em || 0;
            $('#gia_tre_em').val(giaTreEm);
            
            // Hiển thị hình ảnh nếu có
            const hinhAnh = tour.Hinh_anh || tour.hinh_anh;
            if (hinhAnh) {
                // Xử lý đường dẫn ảnh: thêm /images nếu chưa có
                let imagePath = hinhAnh;
                if (!imagePath.startsWith('http') && !imagePath.startsWith('/images')) {
                    if (imagePath.startsWith('/uploads')) {
                        imagePath = '/images' + imagePath;
                    } else if (!imagePath.startsWith('/')) {
                        imagePath = '/images/uploads/' + imagePath;
                    } else {
                        imagePath = '/images' + imagePath;
                    }
                }
                
                const imageUrl = imagePath.startsWith('http') 
                    ? imagePath 
                    : (window.CONFIG?.IMAGE_URL || 'http://localhost:5000/images') + imagePath.replace('/images', '');
                
                $('#preview-image')
                    .attr('src', imageUrl)
                    .show();
                console.log('Hiển thị hình ảnh:', imageUrl);
            } else {
                console.log('Không có hình ảnh để hiển thị');
            }
            
            // Điền mô tả vào Summernote
            const moTa = tour.Mo_ta || tour.mo_ta || '';
            $('#mo_ta').summernote('code', moTa);
            console.log('Nội dung mô tả:', moTa ? (moTa.length > 50 ? moTa.substring(0, 50) + '...' : moTa) : 'Không có');
            
            // Load map data nếu có
            const latitude = tour.latitude || tour.Latitude;
            const longitude = tour.longitude || tour.Longitude;
            const mapAddress = tour.map_address || tour.Map_address;
            
            console.log('🔍 Map data từ tour:', { latitude, longitude, mapAddress });
            
            if (latitude && longitude) {
                $('#latitude').val(latitude);
                $('#longitude').val(longitude);
                console.log('✅ Đã load tọa độ map vào form:', latitude, longitude);
                
                // Update map nếu có mapbox map đã được khởi tạo
                // Đợi map khởi tạo xong (có thể mất vài giây)
                const tryUpdateMap = (attempts = 0) => {
                    if (attempts > 10) {
                        console.warn('⚠️ Map chưa khởi tạo sau 5 giây, bỏ qua update map');
                        return;
                    }
                    
                    if (typeof window.setMapLocation === 'function' && typeof map !== 'undefined' && map) {
                        console.log('✅ Map đã sẵn sàng, cập nhật marker...');
                        window.setMapLocation(parseFloat(latitude), parseFloat(longitude), mapAddress || '');
                    } else if (typeof window.loadMapData === 'function') {
                        console.log('✅ Gọi loadMapData...');
                        window.loadMapData(tour);
                    } else {
                        // Thử lại sau 500ms
                        setTimeout(() => tryUpdateMap(attempts + 1), 500);
                    }
                };
                
                // Bắt đầu thử update map sau 1 giây (để map có thời gian khởi tạo)
                setTimeout(() => tryUpdateMap(), 1000);
            } else {
                console.warn('⚠️ Tour không có map data (latitude/longitude)');
            }
            
            if (mapAddress) {
                $('#map_address').val(mapAddress);
                console.log('✅ Đã load địa chỉ map:', mapAddress);
            }
            
            // Log trạng thái form sau khi điền dữ liệu
            console.log('Form đã được điền dữ liệu:', {
                maTour: $('#ma_tour').val(),
                tenTour: $('#ten_tour').val(),
                thoiGian: $('#thoi_gian').val(),
                tinhTrang: $('#tinh_trang').val(),
                loaiTour: $('#loai_tour').val(),
                giaNguoiLon: $('#gia_nguoi_lon').val(),
                giaTreEm: $('#gia_tre_em').val(),
                hinhAnh: $('#preview-image').attr('src'),
                moTa: $('#mo_ta').summernote('code').length > 50 ? 
                      $('#mo_ta').summernote('code').substring(0, 50) + '...' : 
                      $('#mo_ta').summernote('code')
            });
        } catch (error) {
            console.error('Lỗi khi xử lý dữ liệu tour để chỉnh sửa:', error);
            alert('Không thể tải dữ liệu tour để chỉnh sửa. Lỗi: ' + error.message);
        }
    }
    
    // Load danh sách địa danh và lịch khởi hành
    loadDiaDanh().then(() => {
        if (editTourId) {
            // Nếu đang chỉnh sửa, load địa danh từ API (ưu tiên hơn localStorage)
            loadTourDestinationsForEdit(editTourId).then(() => {
                // Fallback: Nếu API không có, dùng localStorage
                const tourData = JSON.parse(localStorage.getItem('editTourData'));
                if (tourData && tourData.Dia_danh && $('input[name="dia_danh"]:checked').length === 0) {
                    tourData.Dia_danh.forEach(dd => {
                        $(`#dd-${dd.Ma_dia_danh || dd.ma_dia_danh}`).prop('checked', true);
                    });
                }
            });
        }
    });
    
    loadLichKhoiHanh().then(() => {
        if (editTourId) {
            // Nếu đang chỉnh sửa tour, đánh dấu lịch khởi hành đã chọn
            const tourData = JSON.parse(localStorage.getItem('editTourData'));
            if (tourData && tourData.Lich_khoi_hanh) {
                const maLich = tourData.Lich_khoi_hanh.Ma_lich || tourData.Lich_khoi_hanh.ma_lich;
                $(`#lich-${maLich}`).prop('checked', true);
            }
        }
    });

    // Xử lý submit form tour - ngăn chặn nếu submit từ form itinerary
    $('#addTourForm').off('submit').on('submit', async function(e) {
        // Kiểm tra xem submit có đến từ form itinerary không
        const submitButton = e.originalEvent?.submitter || document.activeElement;
        const itineraryForm = $(submitButton).closest('#itineraryForm');
        
        // Nếu button nằm trong form itinerary, block form tour submit
        if (submitButton && itineraryForm.length > 0) {
            console.log('🚫 [TOUR FORM] Blocked submit from itinerary form');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
        
        // Nếu button là btnSaveItinerary, block form tour submit
        if (submitButton && ($(submitButton).attr('id') === 'btnSaveItinerary' || $(submitButton).closest('#itineraryFormContainer').length > 0)) {
            console.log('🚫 [TOUR FORM] Blocked submit from itinerary button');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
        
        // Kiểm tra xem có đang ở step preview không
        // Chỉ redirect nếu không phải submit từ preview
        const isFromPreview = window.submitFromPreview === true;
        
        if (!isFromPreview) {
            if (typeof currentStep !== 'undefined' && currentStep !== 8) {
                // Nếu chưa ở step preview, chuyển đến preview
                console.log('⚠️ Chưa ở step 8, chuyển đến preview...');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (typeof goToStep === 'function') {
                    goToStep(8);
                }
                return false;
            }
        } else {
            console.log('✅ Submit từ preview (step 8), tiếp tục quy trình...');
        }
        
        // Reset flag sau khi kiểm tra
        window.submitFromPreview = false;
        
        e.preventDefault();
        
        // Kiểm tra xem đang chỉnh sửa hay tạo mới
        const urlParams = new URLSearchParams(window.location.search);
        const isEditMode = urlParams.get('edit') ? true : false;
        const editTourId = urlParams.get('edit');
        
        console.log(`=== BẮT ĐẦU QUY TRÌNH ${isEditMode ? 'CẬP NHẬT' : 'LƯU'} TOUR ===`);
        console.log('Form được submit tại:', new Date().toLocaleString());
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
            }
            console.log('Token hợp lệ, tiếp tục quy trình...');

            // 1. Thu thập dữ liệu từ form
            console.log('1. Thu thập dữ liệu form:');
            const formData = {
                ma_tour: $('#ma_tour').val().trim(),
                ten_tour: $('#ten_tour').val().trim(),
                thoi_gian: $('#thoi_gian').val(),
                tinh_trang: $('#tinh_trang').val(),
                gia_nguoi_lon: $('#gia_nguoi_lon').val(),
                gia_tre_em: $('#gia_tre_em').val(),
                loai_tour: $('#loai_tour').val(),
                mo_ta: $('#mo_ta').summernote('code'),
                hinh_anh: $('input[name="hinh_anh"]')[0].files[0]
            };
            console.log('Dữ liệu form:', formData);

            // Kết quả của từng bước
            const results = {
                tour: null,
                diaDanh: null,
                lichKhoiHanh: null
            };

            // 2. Tạo hoặc cập nhật tour cơ bản (bao gồm cả upload hình ảnh)
            console.log(`2. Bắt đầu ${isEditMode ? 'cập nhật' : 'tạo'} tour...`);
            try {
                const tourData = await createTour();
                console.log(`Tour đã được ${isEditMode ? 'cập nhật' : 'tạo'}:`, tourData);
                
                if (!tourData || !tourData.Ma_tour) {
                    console.error('Dữ liệu tour không hợp lệ:', tourData);
                    throw new Error(`Không nhận được thông tin tour sau khi ${isEditMode ? 'cập nhật' : 'tạo'}`);
                }

                results.tour = tourData;
                const maTour = tourData.Ma_tour;
                console.log('Mã tour:', maTour);
                
                // 3. Cập nhật địa danh cho tour (không bắt buộc)
                console.log('3. Cập nhật địa danh cho tour...');
                try {
                    const selectedDiaDanh = $('input[name="dia_danh"]:checked');
                    
                    if (isEditMode) {
                        // Khi update: Xóa tất cả địa danh cũ trước, rồi thêm mới
                        console.log('Đang xóa địa danh cũ...');
                        try {
                            await deleteAllDestinationsFromTour(maTour);
                            console.log('Đã xóa địa danh cũ thành công');
                        } catch (deleteError) {
                            console.warn('Lỗi khi xóa địa danh cũ (có thể không có địa danh nào):', deleteError);
                            // Tiếp tục dù có lỗi
                        }
                    }
                    
                    if (selectedDiaDanh.length > 0) {
                        const diaDanhResult = await addDiaDanhToTour(maTour);
                        console.log('Kết quả thêm địa danh:', diaDanhResult);
                        results.diaDanh = diaDanhResult;
                    } else {
                        console.log('Không có địa danh nào được chọn, bỏ qua bước này');
                        results.diaDanh = { status: 'skipped', message: 'Không có địa danh nào được chọn' };
                    }
                } catch (diaDanhError) {
                    console.error('Lỗi khi thêm địa danh:', diaDanhError);
                    console.warn('Tiếp tục quy trình mặc dù có lỗi khi thêm địa danh');
                    results.diaDanh = { status: 'error', message: diaDanhError.message };
                }

                // 4. Thêm lịch khởi hành
                console.log('4. Tạo lịch khởi hành...');
                const scheduleData = localStorage.getItem('newScheduleData');
                if (scheduleData) {
                    try {
                        const scheduleResult = await createScheduleAfterTour(maTour);
                        console.log('Kết quả tạo lịch khởi hành:', scheduleResult);
                        results.lichKhoiHanh = scheduleResult;
                    } catch (scheduleError) {
                        console.error('Lỗi khi tạo lịch khởi hành:', scheduleError);
                        console.warn('Tiếp tục quy trình mặc dù có lỗi khi tạo lịch khởi hành');
                        results.lichKhoiHanh = { status: 'error', message: scheduleError.message };
                    }
                } else {
                    console.log('Không có lịch khởi hành mới cần tạo');
                    results.lichKhoiHanh = { status: 'warning', message: 'Không có lịch khởi hành' };
                }

                // 5. Hoàn thành
                console.log(`=== HOÀN THÀNH QUY TRÌNH ${isEditMode ? 'CẬP NHẬT' : 'LƯU'} TOUR ===`);
                console.log('Kết quả tổng thể:', results);
                
                // Clear draft khi submit thành công
                if (typeof clearDraft === 'function') {
                    clearDraft();
                }
                
                // Đánh dấu tất cả các step là completed
                if (typeof markStepCompleted === 'function') {
                    for (let i = 1; i <= 7; i++) {
                        markStepCompleted(i);
                    }
                }
                
                // Tạo thông báo tổng hợp
                let summaryMessage = isEditMode 
                    ? `Đã cập nhật tour ${tourData.Ten_tour || maTour} thành công!\n` 
                    : `Đã tạo tour ${tourData.Ten_tour || maTour} thành công!\n`;
                
                if (results.diaDanh) {
                    if (results.diaDanh.status === 'success') {
                        summaryMessage += `- Đã thêm địa danh: ${results.diaDanh.message || 'Thành công'}\n`;
                    } else if (results.diaDanh.status === 'skipped') {
                        // Không hiển thị thông báo nếu bỏ qua (không có địa danh được chọn)
                    } else if (results.diaDanh.status === 'error') {
                        summaryMessage += `- Địa danh: ${results.diaDanh.message || 'Có lỗi'}\n`;
                    }
                }
                
                if (results.lichKhoiHanh && results.lichKhoiHanh.status === 'success') {
                    summaryMessage += `- Lịch khởi hành: ${results.lichKhoiHanh.message || 'Thành công'}\n`;
                } else if (results.lichKhoiHanh && results.lichKhoiHanh.status === 'error') {
                    summaryMessage += `- Lịch khởi hành: ${results.lichKhoiHanh.message || 'Có lỗi'}\n`;
                }
                
                // Sau khi tạo tour thành công, reload danh sách lịch khởi hành cho itinerary
                if (maTour) {
                    loadSchedulesForItinerary();
                }
                
                alert(summaryMessage);
                
                // Xóa dữ liệu tạm
                if (isEditMode) {
                    localStorage.removeItem('editTourData');
                }
                localStorage.removeItem('newScheduleData');
                
                // 6. Hỏi người dùng có muốn quản lý lịch trình không
                if (!isEditMode && maTour) {
                    const manageItinerary = confirm('Tour đã được tạo thành công!\n\nBạn có muốn quản lý lịch trình cho tour này ngay bây giờ không?');
                    if (manageItinerary) {
                        // Scroll đến phần quản lý lịch trình
                        $('html, body').animate({
                            scrollTop: $('#itineraryListContainer').offset().top - 100
                        }, 500);
                        return; // Không chuyển hướng, ở lại trang để quản lý lịch trình
                    }
                }
                
                // Chuyển hướng về trang quản lý tour
                console.log('Chuyển hướng về trang quản lý tour...');
                window.location.href = 'admin.html#tours';
            } catch (tourError) {
                console.error(`Lỗi khi ${isEditMode ? 'cập nhật' : 'tạo'} tour cơ bản:`, tourError);
                throw tourError; // Lỗi tạo tour là nghiêm trọng, dừng toàn bộ quy trình
            }
        } catch (error) {
            console.error(`=== LỖI TRONG QUY TRÌNH ${isEditMode ? 'CẬP NHẬT' : 'LƯU'} TOUR ===`);
            console.error('Chi tiết lỗi:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        }
    });

    // ===== Khuyến mãi theo tour =====
    function computePromo(base, percent) {
        base = parseFloat(base||'0'); percent = parseFloat(percent||'0');
        if (isNaN(base) || isNaN(percent)) return 0;
        return Math.max(0, Math.round(base * (1 - percent/100)));
    }

    function refreshPricePreview() {
        const base = parseFloat($('#gia_nguoi_lon').val()||'0');
        const percent = parseFloat($('#promo_percent').val()||'0');
        $('#priceBasePreview').text(new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(base));
        const promo = computePromo(base, percent);
        $('#pricePromoPreview').text(new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(promo));
    }
    $('#gia_nguoi_lon, #promo_percent').on('input', refreshPricePreview);
    refreshPricePreview();

    async function postJson(url, body) {
        const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }

    $('#btnSaveTourPromo').on('click', async function(){
        try{
            const maTour = ($('#ma_tour').val()||'').trim();
            const code = ($('#promo_ma_km').val()||'').trim();
            const percent = parseFloat($('#promo_percent').val()||'0');
            const start = $('#promo_start').val()||null;
            const end = $('#promo_end').val()||null;
            if (!maTour) return alert('Chưa có Mã tour');
            if (!code) return alert('Nhập mã coupon');
            if (isNaN(percent) || percent<=0 || percent>100) return alert('% coupon không hợp lệ');
            // 1) Lưu/cập nhật coupon
            await postJson('/api/promotions/coupon', { Ma_km: code, Gia_tri: percent, Ngay_bat_dau: start, Ngay_ket_thuc: end });
            // 2) Gắn coupon vào tour
            await postJson('/api/promotions/attach-to-tour', { Ma_tour: maTour, Ma_km: code });
            alert('Đã lưu khuyến mãi cho tour');
        }catch(err){
            alert('Lỗi lưu khuyến mãi: '+err.message);
        }
    });

    // Thêm nút tạo lịch khởi hành mới
    const container = $('#lichkhoihanh-container');
    container.append(`
        <div class="mb-3">
            <button type="button" class="btn btn-primary" id="btnAddNewSchedule">
                <i class="fas fa-plus"></i> Tạo lịch khởi hành mới
            </button>
        </div>
    `);

    // Thêm modal tạo lịch khởi hành
    $('body').append(`
        <div class="modal fade" id="addScheduleModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Tạo lịch khởi hành mới</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addScheduleForm">
                            <div class="mb-3">
                                <label class="form-label">Mã lịch</label>
                                <input type="text" class="form-control" name="ma_lich" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Ngày bắt đầu</label>
                                <input type="date" class="form-control" name="ngay_bat_dau" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Ngày kết thúc</label>
                                <input type="date" class="form-control" name="ngay_ket_thuc" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Số chỗ</label>
                                <input type="number" class="form-control" name="so_cho" required min="1">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                        <button type="button" class="btn btn-primary" id="btnSaveSchedule">Lưu</button>
                    </div>
                </div>
            </div>
        </div>
    `);

    // Xử lý sự kiện click nút tạo lịch khởi hành
    $(document).on('click', '#btnAddNewSchedule', function() {
        const modal = new bootstrap.Modal(document.getElementById('addScheduleModal'));
        modal.show();
    });

    // Xử lý sự kiện lưu lịch khởi hành
    $('#btnSaveSchedule').click(function() {
        try {
            // Kiểm tra token
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
            }

            // Lấy giá trị trực tiếp từ form
            const maLich = $('#schedule_ma_lich').val().trim();
            const ngayBatDau = $('#schedule_ngay_bat_dau').val().trim();
            const ngayKetThuc = $('#schedule_ngay_ket_thuc').val().trim();
            const soCho = $('#schedule_so_cho').val().trim();
            
            console.log('Form elements:', {
                maLich: $('#schedule_ma_lich'),
                ngayBatDau: $('#schedule_ngay_bat_dau'),
                ngayKetThuc: $('#schedule_ngay_ket_thuc'),
                soCho: $('#schedule_so_cho')
            });

            // Debug: In ra các giá trị
            console.log('Giá trị form:', {
                maLich,
                ngayBatDau,
                ngayKetThuc,
                soCho
            });

            // Kiểm tra từng trường
            const errors = [];
            if (!maLich) errors.push('Vui lòng nhập mã lịch khởi hành');
            if (!ngayBatDau) errors.push('Vui lòng chọn ngày bắt đầu');
            if (!ngayKetThuc) errors.push('Vui lòng chọn ngày kết thúc');
            if (!soCho) errors.push('Vui lòng nhập số chỗ');

            if (errors.length > 0) {
                throw new Error(errors.join('\n'));
            }

            const formData = {
                ma_lich: maLich,
                ngay_bat_dau: ngayBatDau,
                ngay_ket_thuc: ngayKetThuc,
                so_cho: parseInt(soCho)
            };

            // Validate ngày
            const startDate = new Date(formData.ngay_bat_dau);
            const endDate = new Date(formData.ngay_ket_thuc);
            if (endDate < startDate) {
                throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
            }

            // Validate số chỗ
            if (isNaN(formData.so_cho) || formData.so_cho <= 0) {
                throw new Error('Số chỗ phải là số dương');
            }

            // Validate mã lịch
            if (!/^[A-Za-z0-9]+$/.test(formData.ma_lich)) {
                throw new Error('Mã lịch chỉ được chứa chữ cái và số');
            }

            console.log('Dữ liệu gửi đi:', formData);

            // Lưu thông tin lịch khởi hành vào localStorage để sử dụng sau khi tạo tour
            localStorage.setItem('newScheduleData', JSON.stringify(formData));

            // Thêm lịch khởi hành vào danh sách tạm thời
            const schedulesList = $('#schedulesList');
            const newScheduleHtml = `
                <div class="card mb-3" id="schedule-temp-${formData.ma_lich}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="card-title">Lịch khởi hành: ${formData.ma_lich}</h5>
                                <p class="card-text">
                                    Từ: ${formData.ngay_bat_dau} đến: ${formData.ngay_ket_thuc}<br>
                                    Số chỗ: ${formData.so_cho}
                                </p>
                            </div>
                            <div>
                                <span class="badge bg-success">Mới</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Thêm vào danh sách hoặc hiển thị nếu trống
            if (schedulesList.children().length === 0 || schedulesList.find('.alert').length > 0) {
                schedulesList.html(newScheduleHtml);
            } else {
                schedulesList.append(newScheduleHtml);
            }

            // Đóng modal sau khi tạo thành công
            const modal = bootstrap.Modal.getInstance(document.getElementById('addScheduleModal'));
            if (modal) {
                modal.hide();
            }

            // Xóa dữ liệu trong form sau khi lưu
            document.getElementById('addScheduleForm').reset();

            // Thêm lịch mới vào dropdown ở bước 6 (nếu có)
            addScheduleToItineraryDropdown(formData);

            // Hiển thị thông báo
            alert(`Đã tạo lịch khởi hành ${formData.ma_lich}. Lịch này sẽ được lưu khi bạn lưu tour.`);
        } catch (error) {
            console.error('Lỗi khi tạo lịch khởi hành:', error);
            alert('Lỗi: ' + error.message);
        }
    });

    // Thêm sự kiện để kiểm tra giá trị khi người dùng nhập
    $(document).ready(function() {
        // Theo dõi sự kiện input trong modal
        $('#addScheduleModal').on('input', 'input', function() {
            const fieldName = $(this).attr('name');
            const value = $(this).val();
            console.log(`Giá trị ${fieldName} thay đổi:`, value);
        });

        // Theo dõi khi modal được mở
        $('#addScheduleModal').on('shown.bs.modal', function () {
            console.log('Modal đã được mở');
            console.log('Form elements:', {
                maLich: document.querySelector('#addScheduleModal input[name="ma_lich"]'),
                ngayBatDau: document.querySelector('#addScheduleModal input[name="ngay_bat_dau"]'),
                ngayKetThuc: document.querySelector('#addScheduleModal input[name="ngay_ket_thuc"]'),
                soCho: document.querySelector('#addScheduleModal input[name="so_cho"]')
            });
        });
    });
});

// Hàm load danh sách địa danh
/**
 * Load địa danh của tour từ API (dùng khi edit)
 */
async function loadTourDestinationsForEdit(maTour) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Không có token, bỏ qua load địa danh từ API');
            return;
        }
        
        const response = await fetch(`http://localhost:5000/api/tours/${maTour}/destinations`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.data && data.data.destinations) {
                // Đánh dấu các địa danh đã chọn
                data.data.destinations.forEach(dest => {
                    const maDiaDanh = dest.Ma_dia_danh || dest.ma_dia_danh;
                    $(`#dd-${maDiaDanh}`).prop('checked', true);
                });
                console.log(`Đã load ${data.data.destinations.length} địa danh từ API`);
            }
        }
    } catch (error) {
        console.error('Lỗi khi load địa danh từ API:', error);
    }
}

/**
 * Load địa danh của tour từ API (dùng khi edit)
 */
async function loadTourDestinationsForEdit(maTour) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('Không có token, bỏ qua load địa danh từ API');
            return;
        }
        
        const response = await fetch(`http://localhost:5000/api/tours/${maTour}/destinations`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.data && data.data.destinations) {
                // Đánh dấu các địa danh đã chọn
                data.data.destinations.forEach(dest => {
                    const maDiaDanh = dest.Ma_dia_danh || dest.ma_dia_danh;
                    const checkbox = $(`#dd-${maDiaDanh}`);
                    if (checkbox.length) {
                        checkbox.prop('checked', true);
                    }
                });
                console.log(`✅ Đã load ${data.data.destinations.length} địa danh từ API`);
            }
        } else {
            console.warn('Không thể load địa danh từ API, status:', response.status);
        }
    } catch (error) {
        console.error('Lỗi khi load địa danh từ API:', error);
    }
}

async function loadDiaDanh() {
    try {
        console.log('Đang gọi API lấy danh sách địa danh...');
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
        }

        const response = await fetch('http://localhost:5000/api/destinations', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error('API trả về lỗi:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Chi tiết lỗi:', errorText);
            throw new Error('Không thể tải danh sách địa danh');
        }
        
        const result = await response.json();
        console.log('Dữ liệu địa danh:', result);
        
        // Đảm bảo lấy đúng mảng địa danh từ cấu trúc API response
        const diaDanh = result.data.destinations || [];
        
        const container = $('#diadanh-container');
        container.empty();
        
        if (diaDanh.length === 0) {
            container.html(`
                <div class="alert alert-info">
                    Chưa có địa danh nào trong hệ thống. 
                    <a href="admin.html#destinations" class="alert-link">Nhấn vào đây</a> để thêm địa danh mới.
                </div>
            `);
            return;
        }

        // Tạo container cho grid
        container.append('<div class="row"></div>');
        const gridContainer = container.find('.row');
        
        diaDanh.forEach((dd) => {
            const maDiaDanh = dd.Ma_dia_danh || dd.ma_dia_danh;
            const tenDiaDanh = dd.Ten_dia_danh || dd.ten_dia_danh;
            const moTa = dd.Mo_ta || dd.mo_ta || '';
            let hinhAnh = dd.Hinh_anh || dd.hinh_anh;

            // Xử lý URL hình ảnh
            if (!hinhAnh || hinhAnh.trim() === '') {
                hinhAnh = '/images/destination-placeholder.jpg';
            } else if (!hinhAnh.startsWith('http') && !hinhAnh.startsWith('/')) {
                hinhAnh = '/images/uploads/destination/' + hinhAnh;
            }

            gridContainer.append(`
                <div class="col-md-4 mb-3">
                    <div class="card h-100">
                        <img src="${hinhAnh}" 
                             class="card-img-top" 
                             alt="${tenDiaDanh}"
                             style="height: 150px; object-fit: cover;"
                             onerror="this.src='/images/destination-placeholder.jpg'">
                        <div class="card-body">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" 
                                       name="dia_danh" value="${maDiaDanh}" 
                                       id="dd-${maDiaDanh}">
                                <label class="form-check-label" for="dd-${maDiaDanh}">
                                    <h6 class="card-title mb-0">${tenDiaDanh}</h6>
                                </label>
                            </div>
                            <p class="card-text small text-muted mt-2">
                                ${moTa.length > 100 ? moTa.substring(0, 100) + '...' : moTa}
                            </p>
                        </div>
                    </div>
                </div>
            `);
        });

        // Thêm nút chọn tất cả/bỏ chọn tất cả
        container.prepend(`
            <div class="mb-3">
                <button type="button" class="btn btn-outline-primary me-2" id="btnSelectAllDestinations">
                    <i class="fas fa-check-square"></i> Chọn tất cả
                </button>
                <button type="button" class="btn btn-outline-secondary" id="btnUnselectAllDestinations">
                    <i class="fas fa-square"></i> Bỏ chọn tất cả
                </button>
            </div>
        `);

        // Xử lý sự kiện cho các nút chọn/bỏ chọn tất cả
        $('#btnSelectAllDestinations').click(function() {
            $('input[name="dia_danh"]').prop('checked', true);
        });

        $('#btnUnselectAllDestinations').click(function() {
            $('input[name="dia_danh"]').prop('checked', false);
        });

    } catch (error) {
        console.error('Lỗi load địa danh:', error);
        if (error.message.includes('đăng nhập lại')) {
            window.location.href = '/login.html';
        } else {
            $('#diadanh-container').html(`
                <div class="alert alert-danger">
                    ${error.message}
                    <br/>
                    <small>Vui lòng thử lại sau hoặc liên hệ quản trị viên.</small>
                </div>
            `);
        }
    }
}

// Hàm load danh sách lịch khởi hành
async function loadLichKhoiHanh() {
    try {
        const container = $('#lichkhoihanh-container');
        container.empty();

        // Thêm nút tạo lịch khởi hành mới
        container.append(`
            <div class="mb-3">
                <button type="button" class="btn btn-primary" id="btnAddNewSchedule">
                    <i class="fas fa-plus"></i> Tạo lịch khởi hành mới
                </button>
            </div>
            <div id="schedulesList"></div>
        `);

        // Nếu đang chỉnh sửa tour, load danh sách lịch khởi hành hiện có
        const urlParams = new URLSearchParams(window.location.search);
        const editTourId = urlParams.get('edit');
        if (editTourId) {
            console.log('Đang gọi API lấy danh sách lịch khởi hành của tour...');
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
            }

            const response = await fetch(`http://localhost:5000/api/tours/${editTourId}/upcoming-schedules`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Không thể tải danh sách lịch khởi hành');
            }

            const result = await response.json();
            const schedules = result.data.schedules || [];

            const schedulesList = $('#schedulesList');
            if (schedules.length === 0) {
                schedulesList.html('<div class="alert alert-info">Chưa có lịch khởi hành nào</div>');
                return;
            }

            schedules.forEach(lich => {
                const ngayBatDau = new Date(lich.Ngay_bat_dau || lich.ngay_bat_dau).toLocaleDateString('vi-VN');
                const ngayKetThuc = new Date(lich.Ngay_ket_thuc || lich.ngay_ket_thuc).toLocaleDateString('vi-VN');
                const maLich = lich.Ma_lich || lich.ma_lich;
                const soCho = lich.So_cho || lich.so_cho;

                schedulesList.append(`
                    <div class="form-check mb-3 border-bottom pb-2" id="schedule-item-${maLich}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <input class="form-check-input" type="radio" 
                                   name="lich_khoi_hanh" value="${maLich}" 
                                   id="lich-${maLich}" required>
                                <label class="form-check-label" for="lich-${maLich}">
                                    <strong>Mã lịch: ${maLich}</strong>
                                    <br/>
                                    Thời gian: ${ngayBatDau} - ${ngayKetThuc}
                                    <br/>
                                    Số chỗ: ${soCho}
                                </label>
                            </div>
                            <button type="button" class="btn btn-sm btn-danger delete-schedule" 
                                    data-id="${maLich}" title="Xóa lịch khởi hành">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `);
            });

            // Thêm xử lý sự kiện cho nút xóa
            $('.delete-schedule').click(function() {
                const maLich = $(this).data('id');
                deleteSchedule(maLich, editTourId);
            });
            
            // Sau khi load schedules vào #schedulesList, cập nhật dropdown cho itinerary
            loadSchedulesForItinerary();
        }

        // Kiểm tra xem có lịch khởi hành tạm thời không
        const tempSchedule = localStorage.getItem('newScheduleData');
        if (tempSchedule) {
            const scheduleData = JSON.parse(tempSchedule);
            const schedulesList = $('#schedulesList');
            
            schedulesList.append(`
                <div class="form-check mb-3 border-bottom pb-2" id="temp-schedule-${scheduleData.ma_lich}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <input class="form-check-input" type="radio" 
                                   name="lich_khoi_hanh" value="${scheduleData.ma_lich}" 
                                   id="lich-${scheduleData.ma_lich}" checked required>
                            <label class="form-check-label" for="lich-${scheduleData.ma_lich}">
                                <strong>Mã lịch: ${scheduleData.ma_lich}</strong>
                                <br/>
                                Thời gian: ${new Date(scheduleData.ngay_bat_dau).toLocaleDateString('vi-VN')} 
                                - ${new Date(scheduleData.ngay_ket_thuc).toLocaleDateString('vi-VN')}
                                <br/>
                                Số chỗ: ${scheduleData.so_cho}
                                <br/>
                                <small class="text-info">* Lịch khởi hành mới sẽ được tạo sau khi lưu tour</small>
                            </label>
                        </div>
                        <button type="button" class="btn btn-sm btn-danger" id="delete-temp-schedule"
                                title="Xóa lịch khởi hành tạm">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `);

            // Thêm xử lý sự kiện cho nút xóa lịch tạm
            $('#delete-temp-schedule').click(function() {
                localStorage.removeItem('newScheduleData');
                $(`#temp-schedule-${scheduleData.ma_lich}`).remove();
                if ($('#schedulesList').children().length === 0) {
                    $('#schedulesList').html('<div class="alert alert-info">Chưa có lịch khởi hành nào</div>');
                }
            });
        }

    } catch (error) {
        console.error('Lỗi load lịch khởi hành:', error);
        if (error.message.includes('đăng nhập lại')) {
            window.location.href = '/login.html';
        } else {
            $('#schedulesList').html(`
                <div class="alert alert-danger">
                    ${error.message}
                    <br/>
                    <small>Vui lòng thử lại sau hoặc liên hệ quản trị viên.</small>
                </div>
            `);
        }
    }
}

// Hàm tạo tour
async function createTour() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
        }

        // Kiểm tra xem đang chỉnh sửa hay tạo mới
        const urlParams = new URLSearchParams(window.location.search);
        const isEditMode = urlParams.get('edit') ? true : false;
        const editTourId = urlParams.get('edit');

        // Validate và chuẩn bị dữ liệu cho bảng Tour_du_lich
        const maTour = $('#ma_tour').val().trim();
        const tenTour = $('#ten_tour').val().trim();
        const thoiGian = parseInt($('#thoi_gian').val());
        const giaNguoiLon = parseInt($('#gia_nguoi_lon').val());
        const giaTreEm = parseInt($('#gia_tre_em').val());
        const tinhTrang = $('#tinh_trang').val();
        const loaiTour = $('#loai_tour').val();

        // Đặc biệt xử lý trường mô tả từ Summernote
        let moTa = $('#mo_ta').summernote('code');
        console.log('Giá trị gốc từ Summernote:', moTa);

        // Kiểm tra nếu nội dung mô tả là thẻ p trống
        if (moTa === '<p><br></p>' || moTa === '<p></p>') {
            console.log('Mô tả trống, gán giá trị mặc định');
            moTa = '';
        }

        // Loại bỏ các thẻ HTML để lấy text thuần túy
        const tempElement = document.createElement('div');
        tempElement.innerHTML = moTa;
        const plainText = tempElement.textContent || tempElement.innerText || '';
        
        // Giới hạn độ dài mô tả trong 255 ký tự (NVARCHAR(255))
        let moTaFinal = plainText.trim();
        if (moTaFinal.length > 255) {
            console.log(`Mô tả quá dài (${moTaFinal.length} ký tự), sẽ cắt bớt xuống 255 ký tự`);
            moTaFinal = moTaFinal.substring(0, 255);
        }
        
        // Kiểm tra nếu mô tả quá ngắn
        if (moTaFinal.length < 10 && moTaFinal.length > 0) {
            console.log('Mô tả quá ngắn, có thể không hợp lệ');
        }

        console.log('Mô tả sau khi xử lý:', moTaFinal);
        console.log('Độ dài mô tả cuối cùng:', moTaFinal.length);

        // Lấy hình ảnh nếu có
        const hinhAnh = $('input[name="hinh_anh"]')[0].files[0];
        
        // Validate các trường bắt buộc theo cấu trúc bảng
        if (!maTour) throw new Error('Vui lòng nhập mã tour');
        if (!tenTour) throw new Error('Vui lòng nhập tên tour');
        if (!thoiGian || thoiGian <= 0) throw new Error('Thời gian tour phải lớn hơn 0');
        if (!giaNguoiLon || giaNguoiLon <= 0) throw new Error('Giá người lớn phải lớn hơn 0');
        if (!giaTreEm || giaTreEm < 0) throw new Error('Giá trẻ em không được âm');
        if (!['trong_nuoc', 'nuoc_ngoai'].includes(loaiTour)) {
            throw new Error('Loại tour không hợp lệ');
        }

        // Lấy map data từ form (nếu có)
        const latitude = $('#latitude').val()?.trim();
        const longitude = $('#longitude').val()?.trim();
        const mapAddress = $('#map_address').val()?.trim();
        
        console.log('🔍 Map data từ form:', { latitude, longitude, mapAddress });
        
        // Validate map data nếu có
        if (latitude && longitude) {
            const latNum = parseFloat(latitude);
            const lngNum = parseFloat(longitude);
            if (isNaN(latNum) || isNaN(lngNum)) {
                console.warn('⚠️ Map coordinates không hợp lệ:', latitude, longitude);
            } else {
                console.log('✅ Map coordinates hợp lệ:', latNum, lngNum);
            }
        }

        // Chuẩn bị dữ liệu JSON
        const tourData = {
            ten_tour: tenTour,
            thoi_gian: thoiGian,
            tinh_trang: tinhTrang,
            gia_nguoi_lon: giaNguoiLon,
            gia_tre_em: giaTreEm,
            loai_tour: loaiTour,
            mo_ta: moTaFinal,
            Mo_ta: moTaFinal,  // Thêm tên trường viết hoa để tương thích với cả hai trường hợp
            description: moTaFinal,  // Thử thêm một tên trường khác
            // Mapbox data
            latitude: latitude || null,
            longitude: longitude || null,
            map_address: mapAddress || null
        };

        // Chỉ thêm ma_tour khi tạo mới (không thêm khi update)
        if (!isEditMode) {
            tourData.ma_tour = maTour;
        }

        // Bước 1: Upload hình ảnh nếu có
        let hinhAnhUrl = null;
        if (hinhAnh) {
            console.log('Đang upload hình ảnh...');
            try {
                const imageFormData = new FormData();
                imageFormData.append('image', hinhAnh);
                imageFormData.append('type', 'tours');

                const uploadResponse = await fetch('http://localhost:5000/api/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: imageFormData
                });

                if (uploadResponse.ok) {
                    const imageData = await uploadResponse.json();
                    if (imageData.status === 'success' && imageData.imageUrl) {
                        hinhAnhUrl = imageData.imageUrl;
                        console.log('Upload hình ảnh thành công:', hinhAnhUrl);
                        tourData.hinh_anh = hinhAnhUrl;
                    }
                } else {
                    console.warn('Không thể upload hình ảnh, tiếp tục tạo tour mà không có hình');
                }
            } catch (uploadError) {
                console.error('Lỗi khi upload hình ảnh:', uploadError);
                console.warn('Tiếp tục tạo tour mà không có hình');
            }
        } else if (isEditMode) {
            // Nếu đang ở chế độ chỉnh sửa và không có hình ảnh mới, giữ lại hình ảnh cũ
            const editData = JSON.parse(localStorage.getItem('editTourData'));
            const oldImageUrl = editData.Hinh_anh || editData.hinh_anh;
            if (oldImageUrl) {
                console.log('Giữ lại hình ảnh cũ:', oldImageUrl);
                tourData.hinh_anh = oldImageUrl;
            }
        }

        console.log(`=== ${isEditMode ? 'CẬP NHẬT' : 'TẠO MỚI'} TOUR_DU_LICH ===`);
        console.log('Dữ liệu gửi đi:', tourData);

        // Bước 2: Tạo hoặc cập nhật tour bằng dữ liệu JSON
        try {
            let response;
            
            // Thêm logging chi tiết cho dữ liệu gửi đi
            console.log('Dữ liệu JSON gửi đi chi tiết:', JSON.stringify(tourData, null, 2));
            
            // Đảm bảo rằng mo_ta được gửi theo nhiều cách khác nhau
            tourData.mo_ta = moTaFinal;  // Đảm bảo có field mo_ta
            tourData.Mo_ta = moTaFinal;  // Đảm bảo có field Mo_ta
            tourData.description = moTaFinal;  // Thử thêm một tên trường khác
            
            if (isEditMode) {
                // Cập nhật tour hiện có
                console.log(`Đang cập nhật tour ${editTourId}...`);
                response = await fetch(`http://localhost:5000/api/tours/${editTourId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(tourData)
                });
            } else {
                // Tạo tour mới
                console.log('Đang tạo tour mới...');
                response = await fetch('http://localhost:5000/api/tours', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(tourData)
                });
            }

            const responseData = await response.json();
            console.log(`Phản hồi từ server (${isEditMode ? 'Cập nhật' : 'Tạo mới'} Tour):`, responseData);

            if (!response.ok) {
                throw new Error(responseData.message || responseData.error || `Lỗi khi ${isEditMode ? 'cập nhật' : 'tạo'} tour`);
            }

            // Kiểm tra dữ liệu trả về và log các thông tin quan trọng
            if (responseData.data && responseData.data.tour) {
                const returnedTour = responseData.data.tour;
                console.log('Tour đã được tạo/cập nhật với ID:', returnedTour.Ma_tour || returnedTour.ma_tour);
                
                // Kiểm tra đặc biệt trường mô tả
                const returnedMoTa = returnedTour.Mo_ta || returnedTour.mo_ta;
                if (returnedMoTa) {
                    console.log('Mô tả đã được lưu thành công với độ dài:', returnedMoTa.length);
                    console.log('Mô tả bắt đầu với:', returnedMoTa.substring(0, 50) + '...');
                } else {
                    console.warn('Mô tả không có trong dữ liệu trả về từ server!');
                    console.log('Dữ liệu tour đầy đủ:', returnedTour);
                }
            }

            return responseData.data.tour;
        } catch (firstAttemptError) {
            console.error(`Lỗi khi gọi API chính để ${isEditMode ? 'cập nhật' : 'tạo'} tour:`, firstAttemptError);
            
            // Thử phương án dự phòng
            console.log('Thử phương án dự phòng...');
            
            // Đổi URL API
            let backupUrl = isEditMode 
                ? `http://localhost:5000/api/admin/tours/${editTourId}`
                : 'http://localhost:5000/api/admin/tours';
                
            const backupResponse = await fetch(backupUrl, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tourData)
            });

            const backupData = await backupResponse.json();
            console.log(`Phản hồi từ server (${isEditMode ? 'Cập nhật' : 'Tạo mới'} Tour - backup):`, backupData);

            if (!backupResponse.ok) {
                throw new Error(backupData.message || backupData.error || `Lỗi khi ${isEditMode ? 'cập nhật' : 'tạo'} tour`);
            }

            return backupData.data.tour;
        }
    } catch (error) {
        console.error('Lỗi khi tạo/cập nhật tour:', error);
        throw error;
    }
}

// Hàm thêm địa danh vào tour
/**
 * Xóa tất cả địa danh của tour (dùng khi update)
 */
async function deleteAllDestinationsFromTour(maTour) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
        }
        
        // Lấy danh sách địa danh hiện tại của tour
        const response = await fetch(`http://localhost:5000/api/tours/${maTour}/destinations`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.data && data.data.destinations) {
                // Xóa từng địa danh
                for (const dest of data.data.destinations) {
                    const maDiaDanh = dest.Ma_dia_danh || dest.ma_dia_danh;
                    try {
                        await fetch(`http://localhost:5000/api/tours/${maTour}/destinations/${maDiaDanh}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        console.log(`Đã xóa địa danh ${maDiaDanh}`);
                    } catch (error) {
                        console.warn(`Lỗi khi xóa địa danh ${maDiaDanh}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi xóa địa danh:', error);
        throw error;
    }
}

async function addDiaDanhToTour(maTour) {
    try {
        if (!maTour) {
            throw new Error('Không có mã tour để thêm địa danh');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
        }

        // Chuẩn bị dữ liệu cho bảng Chi_tiet_tour_dia_danh
        const selectedDiaDanh = $('input[name="dia_danh"]:checked');
        if (selectedDiaDanh.length === 0) {
            console.warn('Không có địa danh nào được chọn, bỏ qua bước này');
            return { status: 'success', message: 'Không có địa danh nào được chọn' };
        }

        console.log('=== CHI_TIET_TOUR_DIA_DANH ===');
        
        // Xử lý từng địa danh một theo đúng format API của Tour.addDestination
        const successResults = [];
        const failedResults = [];
        
        for (let i = 0; i < selectedDiaDanh.length; i++) {
            const maDiaDanh = selectedDiaDanh[i].value;
            const thuTu = i + 1;
            
            try {
                // Sử dụng endpoint addDestinationToTour từ API
                console.log(`Thêm địa danh ${maDiaDanh} với thứ tự ${thuTu}`);
                
                const response = await fetch(`http://localhost:5000/api/tours/${maTour}/destinations/${maDiaDanh}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        order: thuTu // Đúng tên tham số theo controller addDestinationToTour
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    successResults.push({maDiaDanh, thuTu});
                    console.log(`Đã thêm địa danh ${maDiaDanh} thành công`);
                } else {
                    console.warn(`Không thể thêm địa danh ${maDiaDanh}, status: ${response.status}`);
                    failedResults.push({maDiaDanh, thuTu});
                    
                    // Thử thêm với endpoint dự phòng
                    try {
                        const backupResponse = await fetch(`http://localhost:5000/api/destinations/tours/${maTour}/destinations/${maDiaDanh}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                order: thuTu // Đúng tên tham số theo controller
                            })
                        });
                        
                        if (backupResponse.ok) {
                            const data = await backupResponse.json();
                            successResults.push({maDiaDanh, thuTu});
                            console.log(`Đã thêm địa danh ${maDiaDanh} thành công với endpoint dự phòng`);
                        }
                    } catch (backupError) {
                        console.warn(`Lỗi khi thử endpoint dự phòng cho địa danh ${maDiaDanh}:`, backupError);
                    }
                }
            } catch (error) {
                console.warn(`Lỗi khi thêm địa danh ${maDiaDanh}:`, error);
                failedResults.push({maDiaDanh, thuTu});
            }
        }
        
        // Kết quả cuối cùng
        if (successResults.length > 0) {
            return { 
                status: 'success', 
                data: { successResults, failedResults }, 
                message: `Đã thêm ${successResults.length}/${selectedDiaDanh.length} địa danh vào tour` 
            };
        } else if (selectedDiaDanh.length > 0) {
            console.warn('Không thể thêm bất kỳ địa danh nào');
            // Trả về success để không dừng quy trình
            return { 
                status: 'success', 
                message: 'Không thể thêm địa danh nhưng quy trình vẫn tiếp tục',
                error: true
            };
        } else {
            return { status: 'success', message: 'Không có địa danh nào được chọn' };
        }
    } catch (error) {
        console.error('Lỗi khi thêm địa danh:', error);
        // Trả về success để không làm gián đoạn quy trình tạo tour
        return { 
            status: 'success', 
            message: 'Tiếp tục quy trình mặc dù có lỗi khi thêm địa danh', 
            error: error.message 
        };
    }
}

// Thêm hàm tạo lịch khởi hành sau khi tạo tour
async function createScheduleAfterTour(maTour) {
    try {
        const scheduleData = localStorage.getItem('newScheduleData');
        if (!scheduleData) {
            console.log('Không có dữ liệu lịch khởi hành để tạo');
            return { status: 'warning', message: 'Không có lịch khởi hành để tạo' };
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
        }

        // Parse và validate dữ liệu cho bảng Lich_khoi_hanh
        const formData = JSON.parse(scheduleData);
        const schedulePayload = {
            ma_lich: formData.ma_lich,
            ma_tour: maTour,
            ngay_bat_dau: formData.ngay_bat_dau,
            ngay_ket_thuc: formData.ngay_ket_thuc,
            so_cho: parseInt(formData.so_cho)
        };

        // Validate theo cấu trúc bảng
        if (!schedulePayload.ma_lich) throw new Error('Thiếu mã lịch khởi hành');
        if (!schedulePayload.ma_tour) throw new Error('Thiếu mã tour');
        if (!schedulePayload.ngay_bat_dau) throw new Error('Thiếu ngày bắt đầu');
        if (!schedulePayload.ngay_ket_thuc) throw new Error('Thiếu ngày kết thúc');
        if (!schedulePayload.so_cho || schedulePayload.so_cho <= 0) {
            throw new Error('Số chỗ phải lớn hơn 0');
        }

        console.log('=== LICH_KHOI_HANH ===');
        console.log('Dữ liệu gửi đi:', schedulePayload);

        // Danh sách các endpoint có thể sử dụng
        const endpoints = [
            'http://localhost:5000/api/tours/schedules',
            'http://localhost:5000/api/admin/tours/schedules',
            'http://localhost:5000/api/schedule',
            'http://localhost:5000/api/schedules'
        ];

        let lastError = null;
        
        // Thử từng endpoint cho đến khi thành công
        for (const endpoint of endpoints) {
            try {
                console.log(`Thử tạo lịch khởi hành với endpoint: ${endpoint}`);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(schedulePayload)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(e => ({ error: 'Lỗi khi đọc phản hồi' }));
                    console.warn(`Endpoint ${endpoint} trả về lỗi:`, errorData);
                    lastError = new Error(errorData.message || errorData.error || `Lỗi ${response.status}`);
                    continue; // Thử endpoint tiếp theo
                }

                const responseData = await response.json();
                console.log(`Phản hồi từ server (Lịch khởi hành - ${endpoint}):`, responseData);
                
                // Xóa dữ liệu lịch khởi hành từ localStorage khi tạo thành công
                localStorage.removeItem('newScheduleData');
                
                return {
                    status: 'success',
                    data: responseData.data || responseData,
                    message: 'Đã tạo lịch khởi hành thành công'
                };
            } catch (error) {
                console.warn(`Lỗi khi thử endpoint ${endpoint}:`, error);
                lastError = error;
            }
        }

        // Nếu tất cả endpoint đều thất bại
        if (lastError) {
            console.error('Tất cả endpoint đều thất bại:', lastError);
            return {
                status: 'error',
                message: 'Không thể tạo lịch khởi hành: ' + (lastError.message || 'Lỗi không xác định'),
                error: lastError
            };
        }

        return {
            status: 'error',
            message: 'Không thể tạo lịch khởi hành vì lỗi không xác định'
        };
    } catch (error) {
        console.error('Lỗi khi tạo lịch khởi hành:', error);
        return {
            status: 'error',
            message: 'Lỗi khi tạo lịch khởi hành: ' + error.message,
            error
        };
    }
}

// Hàm xóa lịch khởi hành
async function deleteSchedule(maLich, maTour) {
    try {
        if (!confirm(`Bạn có chắc chắn muốn xóa lịch khởi hành ${maLich}?`)) {
            return;
        }

        console.log(`Đang xóa lịch khởi hành ${maLich}...`);
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Vui lòng đăng nhập lại để thực hiện chức năng này');
        }

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

        // Xóa DOM element
        $(`#schedule-item-${maLich}`).remove();
        
        if ($('#schedulesList').children().length === 0) {
            $('#schedulesList').html('<div class="alert alert-info">Chưa có lịch khởi hành nào</div>');
        }

        alert(`Đã xóa lịch khởi hành ${maLich} thành công!`);
    } catch (error) {
        console.error('Lỗi khi xóa lịch khởi hành:', error);
        alert('Lỗi khi xóa lịch khởi hành: ' + error.message);
    }
}

// ============================================
// QUẢN LÝ LỊCH TRÌNH THEO LỊCH KHỞI HÀNH (ITINERARY)
// ============================================

let itineraryList = [];
let currentScheduleId = null;
let currentTourDays = 0;

/**
 * Khởi tạo quản lý lịch trình
 */
function initItineraryManagement() {
    // Load danh sách lịch khởi hành vào dropdown
    loadSchedulesForItinerary();
    
    // Lắng nghe sự kiện chọn lịch khởi hành
    $('#selectScheduleForItinerary').on('change', function() {
        const maLich = $(this).val();
        
        if (maLich) {
            currentScheduleId = maLich;
            loadItineraryForSchedule(maLich);
            $('#itineraryFormContainer').show();
            
            // Enable step 6 khi chọn lịch khởi hành
            if (typeof handleItineraryStep === 'function') {
                handleItineraryStep();
            }
            
            // Chờ một chút để form được render xong rồi mới reset
            setTimeout(() => {
                resetItineraryForm(); // Reset form khi chọn lịch mới
            }, 100);
        } else {
            currentScheduleId = null;
            
            // Disable step 6 khi không có lịch khởi hành
            const step6 = document.querySelector('.step[data-step="6"]');
            if (step6) {
                step6.classList.add('disabled');
            }
            
            $('#itineraryListContainer').html(`
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Vui lòng chọn lịch khởi hành để xem và quản lý lịch trình.
                </div>
            `);
            $('#itineraryFormContainer').hide();
        }
    });

    // Lắng nghe submit form - ngăn chặn default behavior
    $('#itineraryForm').off('submit').on('submit', function(e) {
        console.log('🟡 [ITINERARY] Form submit event triggered');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleItinerarySubmit(e);
        return false;
    });
    
    // Ngăn chặn form submit khi nhấn Enter trong input
    $('#itineraryForm input, #itineraryForm textarea').off('keypress').on('keypress', function(e) {
        if (e.which === 13) {
            console.log('🟡 [ITINERARY] Enter key pressed in input');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handleItinerarySubmit(e);
            return false;
        }
    });
    
    // Ngăn chặn form tour chính submit khi click button trong form itinerary
    $('#itineraryForm button[type="submit"]').off('click').on('click', function(e) {
        console.log('🟡 [ITINERARY] Submit button clicked');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Tìm form itinerary gần nhất
        const itineraryForm = $(this).closest('#itineraryForm');
        if (itineraryForm.length > 0) {
            handleItinerarySubmit(e);
        }
        
        return false;
    });
}

/**
 * Load danh sách lịch khởi hành vào dropdown
 */
/**
 * Thêm lịch khởi hành mới vào dropdown ở bước 6
 * Export để có thể gọi từ tour-stepper.js
 */
function addScheduleToItineraryDropdown(scheduleData) {
    const selectSchedule = $('#selectScheduleForItinerary');
    
    if (selectSchedule.length === 0) {
        console.log('⚠️ Dropdown selectScheduleForItinerary chưa tồn tại');
        return;
    }
    
    // Kiểm tra xem lịch đã có trong dropdown chưa
    const existingOption = selectSchedule.find(`option[value="${scheduleData.ma_lich}"]`);
    if (existingOption.length > 0) {
        console.log(`✅ Lịch ${scheduleData.ma_lich} đã có trong dropdown`);
        // Tự động chọn lịch này
        selectSchedule.val(scheduleData.ma_lich).trigger('change');
        return;
    }
    
    // Format ngày để hiển thị
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };
    
    const displayText = `${scheduleData.ma_lich} (${formatDate(scheduleData.ngay_bat_dau)} - ${formatDate(scheduleData.ngay_ket_thuc)}) [Mới]`;
    
    // Thêm option mới vào dropdown
    const newOption = $('<option></option>')
        .attr('value', scheduleData.ma_lich)
        .text(displayText)
        .attr('data-temp', 'true'); // Đánh dấu là lịch tạm thời
    
    // Thêm vào sau option đầu tiên (option "-- Chọn lịch khởi hành --")
    if (selectSchedule.find('option').length > 0) {
        selectSchedule.find('option:first').after(newOption);
    } else {
        selectSchedule.append(newOption);
    }
    
    // Tự động chọn lịch vừa tạo
    selectSchedule.val(scheduleData.ma_lich).trigger('change');
    
    console.log(`✅ Đã thêm lịch ${scheduleData.ma_lich} vào dropdown và tự động chọn`);
    
    // Enable step 6 nếu đang ở bước 6 hoặc sắp đến bước 6
    if (typeof handleItineraryStep === 'function') {
        handleItineraryStep();
    }
}

// Export function để có thể gọi từ tour-stepper.js
window.addScheduleToItineraryDropdown = addScheduleToItineraryDropdown;

function loadSchedulesForItinerary() {
    const selectSchedule = $('#selectScheduleForItinerary');
    
    // Reset dropdown
    selectSchedule.empty();
    selectSchedule.append('<option value="">-- Chọn lịch khởi hành --</option>');
    
    // Lấy danh sách lịch khởi hành từ container (nếu có)
    const schedulesList = $('#schedulesList');
    if (schedulesList.length > 0) {
        // Tìm tất cả các input radio có name="lich_khoi_hanh"
        const scheduleInputs = schedulesList.find('input[name="lich_khoi_hanh"]');
        
        scheduleInputs.each(function() {
            const $input = $(this);
            const maLich = $input.val();
            const $label = $input.next('label');
            const labelText = $label.text();
            
            // Parse thông tin từ label text hoặc từ parent element
            if (maLich) {
                // Tìm thông tin ngày từ label
                const match = labelText.match(/Thời gian:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
                if (match) {
                    const displayText = `${maLich} (${match[1]} - ${match[2]})`;
                    selectSchedule.append(`<option value="${maLich}">${displayText}</option>`);
                } else {
                    selectSchedule.append(`<option value="${maLich}">${maLich}</option>`);
                }
            }
        });
    }
    
    // Nếu đang edit tour, load từ API (ưu tiên)
    const urlParams = new URLSearchParams(window.location.search);
    const editTourId = urlParams.get('edit');
    if (editTourId) {
        console.log('Đang load lịch khởi hành từ API cho tour:', editTourId);
        loadSchedulesFromAPI(editTourId);
    } else {
        // Nếu không phải edit mode, lấy từ mã tour hiện tại
        const maTour = $('#ma_tour').val().trim();
        if (maTour) {
            console.log('Đang load lịch khởi hành từ API cho tour:', maTour);
            loadSchedulesFromAPI(maTour);
        }
    }
}

/**
 * Load lịch khởi hành từ API
 */
async function loadSchedulesFromAPI(maTour) {
    try {
        const token = localStorage.getItem('token');
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        
        // Sử dụng endpoint đúng: /tours/:tourId/upcoming-schedules
        const response = await fetch(`${apiUrl}/tours/${maTour}/upcoming-schedules`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.data && data.data.schedules) {
                const selectSchedule = $('#selectScheduleForItinerary');
                // Xóa option mặc định và thêm lại
                selectSchedule.empty();
                selectSchedule.append('<option value="">-- Chọn lịch khởi hành --</option>');
                
                data.data.schedules.forEach(schedule => {
                    const displayText = `${schedule.Ma_lich} (${formatDate(schedule.Ngay_bat_dau)} - ${formatDate(schedule.Ngay_ket_thuc)})`;
                    selectSchedule.append(`<option value="${schedule.Ma_lich}">${displayText}</option>`);
                });
                
                console.log(`Đã load ${data.data.schedules.length} lịch khởi hành vào dropdown`);
                
                // Enable step 6 nếu có lịch khởi hành
                if (data.data.schedules.length > 0 && typeof handleItineraryStep === 'function') {
                    // Đợi một chút để dropdown được render xong
                    setTimeout(() => {
                        handleItineraryStep();
                        // Nếu đang ở step 6, cập nhật lại UI
                        if (typeof currentStep !== 'undefined' && currentStep === 6) {
                            // Không cần làm gì, chỉ cần enable step 6
                        }
                    }, 200);
                }
            } else {
                console.warn('API response không có dữ liệu schedules:', data);
            }
        } else {
            const errorText = await response.text();
            console.error('Error loading schedules:', response.status, errorText);
        }
    } catch (error) {
        console.error('Error loading schedules from API:', error);
    }
}

/**
 * Load lịch trình cho lịch khởi hành
 */
async function loadItineraryForSchedule(maLich) {
    if (!maLich) return;
    
    try {
        const token = localStorage.getItem('token');
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        
        const response = await fetch(`${apiUrl}/schedule/${maLich}/itinerary`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                itineraryList = data.data.itinerary || [];
                
                // Lấy thông tin tour để hiển thị số ngày tối đa
                await loadTourInfoForSchedule(maLich);
                
                // Render danh sách lịch trình
                renderItineraryList();
                
                // Nếu đã có lịch trình, hiển thị nút "Thêm ngày mới"
                if (itineraryList.length > 0) {
                    $('#btnAddNewDay').show();
                } else {
                    // Nếu chưa có lịch trình và đã biết số ngày tour, hiển thị nút tự động tạo
                    if (currentTourDays > 0) {
                        showAutoGenerateButton();
                    }
                }
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: 'Lỗi không xác định' }));
            console.error('Error loading itinerary:', errorData);
            
            // Lấy thông tin tour để hiển thị số ngày tối đa (ngay cả khi có lỗi)
            await loadTourInfoForSchedule(maLich);
            
            // Nếu lỗi do cột Ma_lich chưa tồn tại, hiển thị thông báo
            if (errorData.error && errorData.error.includes('Ma_lich')) {
                $('#itineraryListContainer').html(`
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Cảnh báo:</strong> Cột Ma_lich chưa tồn tại trong database. 
                        Vui lòng chạy migration SQL: <code>src/database/add_ma_lich_to_itinerary.sql</code>
                        <br><br>
                        <button class="btn btn-sm btn-primary" onclick="location.reload()">Tải lại trang</button>
                    </div>
                `);
            } else {
                itineraryList = [];
                renderItineraryList();
                
                // Hiển thị nút tự động tạo nếu có số ngày tour
                if (currentTourDays > 0) {
                    showAutoGenerateButton();
                }
            }
        }
    } catch (error) {
        console.error('Error loading itinerary for schedule:', error);
        itineraryList = [];
        renderItineraryList();
    }
}

/**
 * Load thông tin tour từ lịch khởi hành
 */
async function loadTourInfoForSchedule(maLich) {
    try {
        const token = localStorage.getItem('token');
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        
        // Lấy thông tin lịch khởi hành
        const scheduleResponse = await fetch(`${apiUrl}/tours/schedules/${maLich}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json();
            if (scheduleData.status === 'success' && scheduleData.data && scheduleData.data.schedule) {
                const maTour = scheduleData.data.schedule.Ma_tour;
                
                // Lấy thông tin tour
                const tourResponse = await fetch(`${apiUrl}/tours/${maTour}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (tourResponse.ok) {
                    const tourData = await tourResponse.json();
                    if (tourData.status === 'success' && tourData.data && tourData.data.tour) {
                        currentTourDays = tourData.data.tour.Thoi_gian || 0;
                        $('#itineraryNgayThu').attr('max', currentTourDays);
                        $('#maxDayHint').text(`Tối đa: ${currentTourDays} ngày`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading tour info:', error);
    }
}

// Hàm load lịch trình cho tour
async function loadItineraryForTour(maTour) {
    if (!maTour) return;
    
    try {
        const token = localStorage.getItem('token');
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        
        const response = await fetch(`${apiUrl}/tour/${maTour}/itinerary`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                itineraryList = data.data.itinerary || [];
                renderItineraryList();
            }
        }
    } catch (error) {
        console.error('Error loading itinerary:', error);
        itineraryList = [];
        renderItineraryList();
    }
}

/**
 * Render danh sách lịch trình dưới dạng bảng
 */
function renderItineraryList() {
    const container = $('#itineraryListContainer');
    
    if (!itineraryList || itineraryList.length === 0) {
        let html = `
            <div class="alert alert-info mb-3">
                <i class="fas fa-info-circle me-2"></i>
                Chưa có lịch trình. Hãy thêm lịch trình mới bằng form ở trên.
        `;
        
        // Nếu có số ngày tour, hiển thị nút tự động tạo
        if (currentTourDays > 0) {
            html += `
                <br><br>
                <button type="button" class="btn btn-success" onclick="autoGenerateItineraryDays()">
                    <i class="fas fa-magic me-1"></i>Tự động tạo ${currentTourDays} ngày lịch trình
                </button>
            `;
        }
        
        html += `</div>`;
        container.html(html);
        return;
    }

    // Tạo bảng HTML
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="table-primary">
                    <tr>
                        <th style="width: 80px;">Ngày thứ</th>
                        <th>Tiêu đề</th>
                        <th style="width: 150px;">Thời gian</th>
                        <th style="width: 200px;">Địa điểm</th>
                        <th>Mô tả</th>
                        <th style="width: 150px;">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
    `;

    itineraryList.forEach((day) => {
        html += `
            <tr data-itinerary-id="${day.Ma_itinerary}">
                <td class="text-center"><strong>${day.Ngay_thu}</strong></td>
                <td>${escapeHtml(day.Tieu_de || '')}</td>
                <td>${escapeHtml(day.Thoi_gian_hoat_dong || '-')}</td>
                <td>${escapeHtml(day.Dia_diem || '-')}</td>
                <td>
                    <div style="max-height: 60px; overflow: hidden; text-overflow: ellipsis;">
                        ${escapeHtml(day.Mo_ta || '-')}
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-warning" onclick="editItineraryDay(${day.Ma_itinerary})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-danger" onclick="deleteItineraryDay(${day.Ma_itinerary})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;
    
    // Thêm nút tự động tạo nếu chưa đủ số ngày
    if (currentTourDays > 0 && itineraryList.length < currentTourDays) {
        const missingDays = currentTourDays - itineraryList.length;
        html += `
            <div class="mt-3">
                <button type="button" class="btn btn-success" onclick="autoGenerateItineraryDays()">
                    <i class="fas fa-magic me-1"></i>Tự động tạo ${missingDays} ngày còn lại
                </button>
            </div>
        `;
    }

    container.html(html);
}

/**
 * Tự động tạo các ngày lịch trình dựa trên số ngày tour
 */
async function autoGenerateItineraryDays() {
    if (!currentScheduleId) {
        alert('Vui lòng chọn lịch khởi hành trước');
        return;
    }
    
    if (!currentTourDays || currentTourDays <= 0) {
        alert('Không thể xác định số ngày tour');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn tự động tạo ${currentTourDays} ngày lịch trình cho lịch khởi hành này?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        
        // Lấy thông tin tour từ lịch khởi hành
        const scheduleResponse = await fetch(`${apiUrl}/tours/schedules/${currentScheduleId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!scheduleResponse.ok) {
            throw new Error('Không thể lấy thông tin lịch khởi hành');
        }
        
        const scheduleData = await scheduleResponse.json();
        const maTour = scheduleData.data?.schedule?.Ma_tour;
        
        if (!maTour) {
            throw new Error('Không tìm thấy mã tour');
        }
        
        // Tạo từng ngày một
        const createdDays = [];
        for (let day = 1; day <= currentTourDays; day++) {
            // Kiểm tra xem ngày đã tồn tại chưa
            const existingDay = itineraryList.find(d => d.Ngay_thu === day);
            if (existingDay) {
                console.log(`Ngày ${day} đã tồn tại, bỏ qua`);
                continue;
            }
            
            try {
                const response = await fetch(`${apiUrl}/schedule/${currentScheduleId}/itinerary`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        Ngay_thu: day,
                        Tieu_de: `Ngày ${day}`,
                        Mo_ta: `Mô tả chi tiết cho ngày ${day}`,
                        Thoi_gian_hoat_dong: '',
                        Dia_diem: ''
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success') {
                        createdDays.push(day);
                    }
                } else {
                    const errorData = await response.json().catch(() => ({ message: 'Lỗi không xác định' }));
                    console.warn(`Không thể tạo ngày ${day}:`, errorData);
                }
            } catch (error) {
                console.warn(`Lỗi khi tạo ngày ${day}:`, error);
            }
        }
        
        if (createdDays.length > 0) {
            alert(`Đã tự động tạo ${createdDays.length}/${currentTourDays} ngày lịch trình`);
            await loadItineraryForSchedule(currentScheduleId);
        } else {
            alert('Không thể tạo lịch trình. Có thể tất cả các ngày đã tồn tại hoặc có lỗi xảy ra.');
        }
    } catch (error) {
        console.error('Error auto-generating itinerary:', error);
        alert('Lỗi khi tự động tạo lịch trình: ' + error.message);
    }
}

/**
 * Xử lý submit form lịch trình
 * Phải là global function để có thể gọi từ onclick
 */
window.handleItinerarySubmit = async function handleItinerarySubmit(e) {
    // Ngăn chặn tất cả các event propagation
    if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }
    
    console.log('🔵 [ITINERARY] handleItinerarySubmit called');
    console.log('🔵 [ITINERARY] Event:', e);
    console.log('🔵 [ITINERARY] currentScheduleId:', currentScheduleId);
    
    // Kiểm tra xem button có phải là button của form itinerary không
    // QUAN TRỌNG: Kiểm tra button ID trước vì form itinerary nằm trong form tour
    if (e && e.target) {
        const button = $(e.target);
        const buttonId = button.attr('id');
        
        console.log('🔵 [ITINERARY] Button ID:', buttonId);
        
        // Nếu button là btnSaveItinerary, chắc chắn là từ form itinerary - cho phép tiếp tục
        if (buttonId === 'btnSaveItinerary') {
            console.log('✅ [ITINERARY] Button is btnSaveItinerary, proceeding...');
            // Tiếp tục xử lý - KHÔNG return false
        } else {
            // Kiểm tra xem button có nằm trong form/container itinerary không
            const itineraryForm = button.closest('#itineraryForm');
            const itineraryContainer = button.closest('#itineraryFormContainer');
            
            console.log('🔵 [ITINERARY] In itinerary form:', itineraryForm.length > 0);
            console.log('🔵 [ITINERARY] In itinerary container:', itineraryContainer.length > 0);
            
            if (itineraryForm.length > 0 || itineraryContainer.length > 0) {
                console.log('✅ [ITINERARY] Button is in itinerary form/container, proceeding...');
                // Tiếp tục xử lý
            } else {
                // Nếu button không liên quan đến itinerary, có thể là từ form tour, block
                console.log('🚫 [ITINERARY] Blocked - button is not related to itinerary');
                return false;
            }
        }
    }
    
    if (!currentScheduleId) {
        alert('Vui lòng chọn lịch khởi hành trước');
        return false;
    }

    const ngayThu = parseInt($('#itineraryNgayThu').val());
    const tieuDe = $('#itineraryTieuDe').val().trim();
    const moTa = $('#itineraryMoTa').val().trim();
    const thoiGian = $('#itineraryThoiGian').val().trim();
    const diaDiem = $('#itineraryDiaDiem').val().trim();
    const editId = $('#itineraryEditId').val();

    // Validation
    if (!ngayThu || ngayThu < 1) {
        alert('Vui lòng nhập số ngày hợp lệ (từ 1 trở lên)');
        $('#itineraryNgayThu').focus();
        return;
    }

    if (currentTourDays > 0 && ngayThu > currentTourDays) {
        alert(`Số ngày (${ngayThu}) không được vượt quá tổng số ngày của tour (${currentTourDays})`);
        $('#itineraryNgayThu').focus();
        return;
    }

    if (!tieuDe) {
        alert('Vui lòng nhập tiêu đề');
        $('#itineraryTieuDe').focus();
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        
        let response;
        
        if (editId) {
            // Cập nhật
            console.log('🔄 [ITINERARY] Updating itinerary:', editId);
            console.log('🔄 [ITINERARY] Update data:', {
                Ngay_thu: ngayThu,
                Tieu_de: tieuDe,
                Mo_ta: moTa,
                Thoi_gian_hoat_dong: thoiGian,
                Dia_diem: diaDiem
            });
            
            response = await fetch(`${apiUrl}/itinerary/${editId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Ngay_thu: ngayThu,
                    Tieu_de: tieuDe,
                    Mo_ta: moTa,
                    Thoi_gian_hoat_dong: thoiGian,
                    Dia_diem: diaDiem
                })
            });
            
            console.log('🔄 [ITINERARY] Update response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [ITINERARY] Update failed:', response.status, errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { message: errorText || 'Không thể lưu lịch trình' };
                }
                throw new Error(errorData.message || `HTTP ${response.status}: ${errorText}`);
            }
        } else {
            // Tạo mới
            response = await fetch(`${apiUrl}/schedule/${currentScheduleId}/itinerary`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Ngay_thu: ngayThu,
                    Tieu_de: tieuDe,
                    Mo_ta: moTa,
                    Thoi_gian_hoat_dong: thoiGian,
                    Dia_diem: diaDiem
                })
            });
        }

        // Xử lý response cho cả POST và PUT
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ [ITINERARY] Invalid JSON response:', responseText);
            throw new Error('Phản hồi không hợp lệ từ server');
        }
        
        console.log('📥 [ITINERARY] Response data:', data);
        
        if (data.status === 'success') {
            const message = editId ? 'Đã cập nhật lịch trình thành công' : 'Đã thêm lịch trình thành công';
            
            console.log('✅ [ITINERARY]', message);
            console.log('✅ [ITINERARY] Response data:', data);
            
            // Hiển thị toast hoặc alert (không dùng alert để tránh block UI)
            if (window.showToast) {
                showToast(message, 'success');
            } else {
                // Dùng console log thay vì alert để không block
                console.log('✅', message);
            }
            
            // Reload danh sách lịch trình để hiển thị dữ liệu mới nhất
            console.log('🔄 [ITINERARY] Reloading itinerary for schedule:', currentScheduleId);
            await loadItineraryForSchedule(currentScheduleId);
            
            // Reset form sau khi reload xong
            resetItineraryForm();
            
            // Hiển thị nút "Thêm ngày mới" sau khi lưu thành công
            $('#btnAddNewDay').show();
            
            // Ngăn chặn mọi redirect
            return false;
        } else {
            throw new Error(data.message || 'Lỗi khi lưu lịch trình');
        }
    } catch (error) {
        console.error('❌ [ITINERARY] Error saving itinerary:', error);
        alert('Lỗi khi lưu lịch trình: ' + error.message);
        return false;
    }
    
    return false;
}

/**
 * Chỉnh sửa lịch trình
 */
function editItineraryDay(maItinerary) {
    const day = itineraryList.find(d => d.Ma_itinerary === maItinerary);
    if (!day) {
        alert('Không tìm thấy lịch trình');
        return;
    }

    // Điền form
    $('#itineraryEditId').val(day.Ma_itinerary);
    $('#itineraryNgayThu').val(day.Ngay_thu);
    $('#itineraryTieuDe').val(day.Tieu_de || '');
    $('#itineraryMoTa').val(day.Mo_ta || '');
    $('#itineraryThoiGian').val(day.Thoi_gian_hoat_dong || '');
    $('#itineraryDiaDiem').val(day.Dia_diem || '');
    
    // Cập nhật UI
    $('#itineraryFormTitle').html('<i class="fas fa-edit me-2"></i>Chỉnh sửa Lịch trình');
    $('#btnSaveItinerary').html('<i class="fas fa-save me-1"></i>Cập nhật');
    $('#btnAddNewDay').show(); // Hiển thị nút thêm mới khi đang edit
    
    // Scroll đến form
    $('html, body').animate({
        scrollTop: $('#itineraryFormContainer').offset().top - 100
    }, 500);
}

/**
 * Reset form lịch trình
 */
function resetItineraryForm() {
    const form = $('#itineraryForm');
    if (form.length > 0 && form[0]) {
        form[0].reset();
    }
    
    $('#itineraryEditId').val('');
    $('#itineraryFormTitle').html('<i class="fas fa-plus-circle me-2"></i>Thêm Lịch trình Mới');
    $('#btnSaveItinerary').html('<i class="fas fa-save me-1"></i>Lưu');
    $('#btnAddNewDay').hide();
    
    // Scroll đến form để dễ nhập tiếp (nếu form container tồn tại và visible)
    const formContainer = $('#itineraryFormContainer');
    if (formContainer.length > 0 && formContainer.is(':visible')) {
        $('html, body').animate({
            scrollTop: formContainer.offset().top - 100
        }, 300);
    }
}

/**
 * Hủy form
 */
function cancelItineraryForm() {
    resetItineraryForm();
}


/**
 * Xóa lịch trình
 */
async function deleteItineraryDay(maItinerary) {
    if (!confirm('Bạn có chắc muốn xóa lịch trình này?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const apiUrl = window.CONFIG?.API_BASE_URL || '/api';
        
        const response = await fetch(`${apiUrl}/itinerary/${maItinerary}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể xóa');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            alert('Đã xóa lịch trình thành công');
            if (currentScheduleId) {
                await loadItineraryForSchedule(currentScheduleId);
            }
        } else {
            throw new Error(data.message || 'Lỗi khi xóa');
        }
    } catch (error) {
        console.error('Error deleting itinerary:', error);
        alert('Lỗi khi xóa: ' + error.message);
    }
}

/**
 * Format date helper
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Hàm escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = $('<div>');
    div.text(text);
    return div.html();
}
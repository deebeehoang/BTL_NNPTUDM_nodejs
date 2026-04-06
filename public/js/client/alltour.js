let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentSort = 'default'; // 'default', 'price-asc', 'price-desc'

document.addEventListener('DOMContentLoaded', function() {
    // Navbar được load từ navbar.js, không cần loadHeader() nữa
    
    // Kiểm tra và load footer
    const footerContainer = document.getElementById('footer');
    if (footerContainer) {
        loadFooter();
    }

    // Nếu URL có destinationId -> load tour theo điểm đến
    const urlParams = new URLSearchParams(window.location.search);
    const destinationId = urlParams.get('destinationId');
    if (destinationId) {
        const toursContainer = document.getElementById('toursContainer');
        if (toursContainer) {
            toursContainer.innerHTML = '';
        }
        loadToursByDestination(destinationId);
        return; // Không load tất cả tour mặc định
    }

    // Load tất cả tour ban đầu
    loadTours();

    // Xử lý sự kiện tìm kiếm từ form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            currentPage = 1;
            const toursContainer = document.getElementById('toursContainer');
            if (toursContainer) {
                toursContainer.innerHTML = '';
            }
            hasMore = true;
            loadTours(); // Thay đổi từ loadTours() sang loadAllTours()
        });
    }

    // Lấy các elements một lần
    const searchInput = document.getElementById('searchInput');
    const tourTypeFilter = document.getElementById('tourTypeFilter');
    const heroSearchInput = document.getElementById('heroSearchInput');
    const heroTourTypeBtn = document.getElementById('heroTourTypeBtn');
    const heroTourTypeDropdown = document.getElementById('heroTourTypeDropdown');
    const heroTourTypeFilter = document.getElementById('heroTourTypeFilter');
    const heroSearchBtn = document.getElementById('heroSearchBtn');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const sortBtn = document.getElementById('sortBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    const sortBtnText = document.getElementById('sortBtnText');
    const sortOptions = document.querySelectorAll('.sort-option');

    // Xử lý sự kiện tìm kiếm khi nhập (search input ẩn)
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentPage = 1;
            const toursContainer = document.getElementById('toursContainer');
            if (toursContainer) {
                toursContainer.innerHTML = '';
            }
            hasMore = true;
            loadTours();
        }, 500)); // Debounce 500ms
    }

    // Xử lý sự kiện thay đổi loại tour
    if (tourTypeFilter) {
        tourTypeFilter.addEventListener('change', function() {
            currentPage = 1;
            const toursContainer = document.getElementById('toursContainer');
            if (toursContainer) {
                toursContainer.innerHTML = '';
            }
            hasMore = true;
            loadAllTours();
        });
    }

    // Xử lý sự kiện load more
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            if (!isLoading && hasMore) {
                currentPage++;
                loadTours();
            }
        });
    }

    // Hero Search Section - Kết nối với search input ẩn
    if (heroSearchInput && searchInput) {
        heroSearchInput.addEventListener('input', function() {
            searchInput.value = this.value;
            // Trigger search
            currentPage = 1;
            const toursContainer = document.getElementById('toursContainer');
            if (toursContainer) {
                toursContainer.innerHTML = '';
            }
            hasMore = true;
            loadTours();
        });

        heroSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                currentPage = 1;
                const toursContainer = document.getElementById('toursContainer');
                if (toursContainer) {
                    toursContainer.innerHTML = '';
                }
                hasMore = true;
                loadTours();
            }
        });
    }

    // Hero Search Button
    if (heroSearchBtn) {
        heroSearchBtn.addEventListener('click', function() {
            currentPage = 1;
            const toursContainer = document.getElementById('toursContainer');
            if (toursContainer) {
                toursContainer.innerHTML = '';
            }
            hasMore = true;
            loadTours();
        });
    }

    // Hero Tour Type Button - Toggle dropdown
    if (heroTourTypeBtn && heroTourTypeDropdown) {
        heroTourTypeBtn.addEventListener('click', function() {
            const isVisible = heroTourTypeDropdown.style.display !== 'none';
            heroTourTypeDropdown.style.display = isVisible ? 'none' : 'block';
        });
    }

    // Hero Tour Type Filter - Kết nối với tourTypeFilter ẩn
    if (heroTourTypeFilter && tourTypeFilter) {
        heroTourTypeFilter.addEventListener('change', function() {
            tourTypeFilter.value = this.value;
            currentPage = 1;
            const toursContainer = document.getElementById('toursContainer');
            if (toursContainer) {
                toursContainer.innerHTML = '';
            }
            hasMore = true;
            loadAllTours();
            // Ẩn dropdown sau khi chọn
            if (heroTourTypeDropdown) {
                heroTourTypeDropdown.style.display = 'none';
            }
        });
    }

    // Sort Dropdown Handler
    if (sortBtn && sortDropdown) {
        sortBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = sortDropdown.style.display !== 'none';
            sortDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Đóng dropdown khi click bên ngoài
        document.addEventListener('click', function(e) {
            if (!sortBtn.contains(e.target) && !sortDropdown.contains(e.target)) {
                sortDropdown.style.display = 'none';
            }
        });
    }

    // Sort Options Handler
    if (sortOptions.length > 0) {
        sortOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const sortType = this.getAttribute('data-sort');
                
                // Cập nhật active state
                sortOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Cập nhật text button
                if (sortBtnText) {
                    const sortTexts = {
                        'default': 'Sắp xếp theo...',
                        'price-asc': 'Giá tăng dần',
                        'price-desc': 'Giá giảm dần'
                    };
                    sortBtnText.textContent = sortTexts[sortType] || 'Sắp xếp theo...';
                }
                
                // Đóng dropdown
                if (sortDropdown) {
                    sortDropdown.style.display = 'none';
                }
                
                // Áp dụng sắp xếp
                currentSort = sortType;
                currentPage = 1;
                const toursContainer = document.getElementById('toursContainer');
                if (toursContainer) {
                    toursContainer.innerHTML = '';
                }
                hasMore = true;
                loadTours();
            });
        });
    }
});

// loadHeader() đã được thay thế bằng navbar từ navbar.js

async function loadFooter() {
    try {
        const footerContainer = document.getElementById('footer');
        if (!footerContainer) return;

        // Tạo footer trực tiếp thay vì tải từ file
        footerContainer.innerHTML = `
            <footer class="bg-light py-4 mt-5">
                <div class="container">
                    <div class="row">
                        <div class="col-md-4">
                            <h5>Về chúng tôi</h5>
                            <p>Chuyên cung cấp các tour du lịch chất lượng cao tại Việt Nam.</p>
                        </div>
                        <div class="col-md-4">
                            <h5>Liên hệ</h5>
                            <p>
                                <i class="fas fa-phone"></i> 0123 456 789<br>
                                <i class="fas fa-envelope"></i> info@dulichvietnam.com<br>
                                <i class="fas fa-map-marker-alt"></i> 123 Đường ABC, Quận XYZ, TP.HCM
                            </p>
                        </div>
                        <div class="col-md-4">
                            <h5>Theo dõi chúng tôi</h5>
                            <div class="social-links">
                                <a href="#" class="me-2"><i class="fab fa-facebook"></i></a>
                                <a href="#" class="me-2"><i class="fab fa-twitter"></i></a>
                                <a href="#" class="me-2"><i class="fab fa-instagram"></i></a>
                            </div>
                        </div>
                    </div>
                    <hr>
                    <div class="text-center">
                        <p class="mb-0">&copy; 2024 Du Lịch Việt Nam. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        `;
    } catch (error) {
        console.error('Lỗi khi tải footer:', error);
    }
}

async function loadAllTours() {
    try {
        showLoading(true);
        const searchQuery = document.getElementById('searchInput')?.value.trim() || '';
        const tourType = document.getElementById('tourTypeFilter')?.value || '';

        console.log('Search query:', searchQuery); // Debug log
        console.log('Tour type:', tourType); // Debug log

        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.append('search', searchQuery);
        if (tourType) {
            // Chuyển đổi giá trị loại tour để khớp với API
            const apiTourType = tourType === 'Trong nước' ? 'trong_nuoc' : 
                              tourType === 'Nước ngoài' ? 'nuoc_ngoai' : tourType;
            queryParams.append('tourType', apiTourType);
        }

        const url = `${CONFIG.API_BASE_URL}/tours?${queryParams}`;
        console.log('Fetching URL:', url); // Debug log

        const response = await fetch(url);
        if (!response.ok) throw new Error('Không thể tải danh sách tour');

        const data = await response.json();
        console.log('API Response:', data); // Debug log

        if (data.status === 'success') {
            const tours = data.data.tours;
            const toursContainer = document.getElementById('toursContainer');
            if (!toursContainer) return;

            // Lọc tour có trạng thái không phải "Hết chỗ" và khớp với loại tour đã chọn
            const availableTours = tours.filter(tour => {
                if (tour.Tinh_trang === 'Hết chỗ') return false;
                if (tourType) {
                    const apiTourType = tourType === 'Trong nước' ? 'trong_nuoc' : 
                                      tourType === 'Nước ngoài' ? 'nuoc_ngoai' : tourType;
                    return tour.Loai_tour === apiTourType;
                }
                return true;
            });

            // Áp dụng sắp xếp
            const sortedTours = sortTours(availableTours, currentSort);

            if (sortedTours.length === 0) {
                toursContainer.innerHTML = `
                    <div class="col-12 text-center">
                        <p class="text-muted">Không có tour nào phù hợp với tiêu chí tìm kiếm.</p>
                    </div>
                `;
            } else {
                let toursHTML = '';
                sortedTours.forEach(tour => {
                    // Xử lý đường dẫn ảnh đúng cách
                    let imageSrc = 'tour-placeholder.jpg'; // Ảnh mặc định
                    if (tour.Hinh_anh) {
                        let hinhAnh = tour.Hinh_anh.trim();
                        
                        // Nếu đã là URL đầy đủ (http/https), dùng trực tiếp
                        if (hinhAnh.startsWith('http://') || hinhAnh.startsWith('https://')) {
                            imageSrc = hinhAnh;
                        } 
                        // Nếu bắt đầu bằng /images/, bỏ /images/ để tránh duplicate
                        else if (hinhAnh.startsWith('/images/')) {
                            // Bỏ /images/ đầu tiên, giữ lại phần còn lại
                            imageSrc = hinhAnh.substring('/images/'.length);
                        }
                        // Nếu bắt đầu bằng /uploads/, thêm images vào trước
                        else if (hinhAnh.startsWith('/uploads/')) {
                            // Bỏ dấu / đầu, giữ lại uploads/...
                            imageSrc = hinhAnh.substring(1);
                        }
                        // Nếu bắt đầu bằng uploads/ (không có / đầu)
                        else if (hinhAnh.startsWith('uploads/')) {
                            imageSrc = hinhAnh;
                        }
                        // Các trường hợp khác
                        else {
                            imageSrc = hinhAnh;
                        }
                    }
                    
                    // Tạo URL ảnh cuối cùng
                    let imageUrl;
                    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
                        // URL đầy đủ, dùng trực tiếp
                        imageUrl = imageSrc;
                    } else {
                        // Nối với CONFIG.IMAGE_URL (đã có /images ở cuối)
                        imageUrl = `${CONFIG.IMAGE_URL}/${imageSrc}`;
                    }
                    
                    // Chuyển đổi loại tour để hiển thị
                    const displayTourType = tour.Loai_tour === 'trong_nuoc' ? 'Trong nước' : 
                                         tour.Loai_tour === 'nuoc_ngoai' ? 'Nước ngoài' : tour.Loai_tour;
                    // Tính số đêm từ số ngày
                    const soNgay = tour.Thoi_gian || 0;
                    const soDem = soNgay > 0 ? soNgay - 1 : 0;
                    const durationText = soDem > 0 ? `${soNgay} ngày ${soDem} đêm` : `${soNgay} ngày`;
                    
                    toursHTML += `
                        <div class="col-md-4 mb-4">
                            <div class="tour-card-modern">
                                <div class="tour-card-image-container">
                                    <img src="${imageUrl}" class="tour-card-image" alt="${tour.Ten_tour}">
                                    <div class="tour-card-badge">${displayTourType}</div>
                                </div>
                                <div class="tour-card-content">
                                    <h3 class="tour-card-title">${tour.Ten_tour}</h3>
                                    <div class="tour-card-info">
                                        <span class="tour-info-item">
                                            <i class="fas fa-clock"></i>
                                            ${durationText}
                                        </span>
                                        <span class="tour-info-item">
                                            <i class="fas fa-play-circle"></i>
                                            ${displayTourType}
                                        </span>
                                    </div>
                                    ${getRatingDisplayModern(tour)}
                                    <a href="detailtour.html?tour=${tour.Ma_tour}" class="tour-card-price-btn">
                                        ${formatCurrency(tour.Gia_nguoi_lon || 0)}
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                });
                toursContainer.innerHTML = toursHTML;
            }
        }
    } catch (error) {
        console.error('Lỗi khi tải tour:', error);
        showAlert('Không thể tải danh sách tour. Vui lòng thử lại sau.', 'danger');
    } finally {
        showLoading(false);
        updateLoadMoreButton();
    }
}

async function loadTours() {
    if (isLoading || !hasMore) return;

    try {
        isLoading = true;
        showLoading(true);

        const searchQuery = document.getElementById('searchInput')?.value.trim() || '';
        console.log('🔍 searchQuery:', searchQuery);

        const tourType = document.getElementById('tourTypeFilter')?.value || '';

        // Pagination: mỗi page 12 tour
        const perPage = 12;
        const queryParams = new URLSearchParams({ 
            page: currentPage,
            limit: perPage 
        });
        if (searchQuery) queryParams.append('search', searchQuery);
        console.log('URL API:', `${CONFIG.API_BASE_URL}/tours?${queryParams}`);

        if (tourType) {
            // Chuyển đổi giá trị loại tour để khớp với API
            const apiTourType = tourType === 'Trong nước' ? 'trong_nuoc' : 
                              tourType === 'Nước ngoài' ? 'nuoc_ngoai' : tourType;
            queryParams.append('tourType', apiTourType);
        }

        console.log('Fetching tours with params:', queryParams.toString()); // Debug log

        const url = `${CONFIG.API_BASE_URL}/tours?${queryParams}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Không thể tải danh sách tour');

        const data = await response.json();
        if (data.status === 'success') {
            const tours = data.data.tours || [];
            
            // Lọc tour có trạng thái không phải "Hết chỗ" và khớp với loại tour đã chọn
            const availableTours = tours.filter(tour => {
                if (tour.Tinh_trang === 'Hết chỗ') return false;
                if (tourType) {
                    const apiTourType = tourType === 'Trong nước' ? 'trong_nuoc' : 
                                      tourType === 'Nước ngoài' ? 'nuoc_ngoai' : tourType;
                    return tour.Loai_tour === apiTourType;
                }
                return true;
            });

            // Kiểm tra xem còn tour nào không dựa trên pagination từ API
            if (data.pagination) {
                hasMore = data.pagination.hasMore || false;
                console.log(`📄 Pagination info: page ${data.pagination.currentPage}/${data.pagination.totalPages}, hasMore: ${hasMore}, total: ${data.pagination.total}`);
            } else {
                // Fallback: nếu API không có pagination info
                hasMore = availableTours.length >= perPage;
            }

            if (currentPage === 1) {
                document.getElementById('toursContainer').innerHTML = '';
            }

            // Áp dụng sắp xếp
            const sortedTours = sortTours(availableTours, currentSort);

            if (sortedTours.length === 0 && currentPage === 1) {
                document.getElementById('toursContainer').innerHTML = `
                    <div class="col-12 text-center">
                        <p class="text-muted">Không tìm thấy tour nào phù hợp với tiêu chí tìm kiếm.</p>
                    </div>
                `;
                hasMore = false;
            } else {
                sortedTours.forEach(tour => displayTour(tour));
            }
        }
    } catch (error) {
        console.error('Lỗi khi tải tour:', error);
        showAlert('Không thể tải danh sách tour. Vui lòng thử lại sau.', 'danger');
    } finally {
        isLoading = false;
        showLoading(false);
        updateLoadMoreButton();
    }
}

async function loadToursByDestination(destinationId) {
    try {
        showLoading(true);
        const response = await fetch(`${CONFIG.API_BASE_URL}/tours/destination/${destinationId}`);
        if (!response.ok) throw new Error('Không thể tải danh sách tour theo điểm đến');

        const data = await response.json();
        const tours = Array.isArray(data.data) ? data.data : (data.data?.tours || []);

        const toursContainer = document.getElementById('toursContainer');
        if (!toursContainer) return;

        if (!tours || tours.length === 0) {
            toursContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">Chưa có tour nào cho điểm đến này.</p>
                </div>
            `;
            return;
        }

        // Render từng tour (tái sử dụng displayTour)
        toursContainer.innerHTML = '';
        tours.forEach(tour => displayTour(tour));
    } catch (error) {
        console.error('Lỗi khi tải tour theo điểm đến:', error);
        showAlert('Không thể tải danh sách tour theo điểm đến. Vui lòng thử lại sau.', 'danger');
    } finally {
        showLoading(false);
    }
}

function displayTour(tour) {
    // Bỏ qua nếu trạng thái là 'Hết chỗ'
    if (tour.Tinh_trang === 'Hết chỗ') return;

    const tourCard = document.createElement('div');
    tourCard.className = 'col-md-4 mb-4';

    // Xử lý đường dẫn ảnh đúng cách
    let imageSrc = 'tour-placeholder.jpg'; // Ảnh mặc định
    if (tour.Hinh_anh) {
        let hinhAnh = tour.Hinh_anh.trim();
        
        // Nếu đã là URL đầy đủ (http/https), dùng trực tiếp
        if (hinhAnh.startsWith('http://') || hinhAnh.startsWith('https://')) {
            imageSrc = hinhAnh;
        } 
        // Nếu bắt đầu bằng /images/, bỏ /images/ để tránh duplicate
        else if (hinhAnh.startsWith('/images/')) {
            // Bỏ /images/ đầu tiên, giữ lại phần còn lại
            imageSrc = hinhAnh.substring('/images/'.length);
        }
        // Nếu bắt đầu bằng /uploads/, thêm images vào trước
        else if (hinhAnh.startsWith('/uploads/')) {
            // Bỏ dấu / đầu, giữ lại uploads/...
            imageSrc = hinhAnh.substring(1);
        }
        // Nếu bắt đầu bằng uploads/ (không có / đầu)
        else if (hinhAnh.startsWith('uploads/')) {
            imageSrc = hinhAnh;
        }
        // Các trường hợp khác
        else {
            imageSrc = hinhAnh;
        }
    }
    
    // Tạo URL ảnh cuối cùng
    let imageUrl;
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
        // URL đầy đủ, dùng trực tiếp
        imageUrl = imageSrc;
    } else {
        // Nối với CONFIG.IMAGE_URL (đã có /images ở cuối)
        imageUrl = `${CONFIG.IMAGE_URL}/${imageSrc}`;
    }

    // Chuyển đổi loại tour để hiển thị
    const displayTourType = tour.Loai_tour === 'trong_nuoc' ? 'Trong nước' : 
                           tour.Loai_tour === 'nuoc_ngoai' ? 'Nước ngoài' : tour.Loai_tour;

    // Tính số đêm từ số ngày
    const soNgay = tour.Thoi_gian || 0;
    const soDem = soNgay > 0 ? soNgay - 1 : 0;
    const durationText = soDem > 0 ? `${soNgay} ngày ${soDem} đêm` : `${soNgay} ngày`;
    
    tourCard.innerHTML = `
        <div class="tour-card-modern">
            <div class="tour-card-image-container">
                <img src="${imageUrl}" class="tour-card-image" alt="${tour.Ten_tour}">${CONFIG.IMAGE_URL}/${imageSrc}" class="tour-card-image" alt="${tour.Ten_tour}">
                <div class="tour-card-badge">${displayTourType}</div>
            </div>
            <div class="tour-card-content">
                <h3 class="tour-card-title">${tour.Ten_tour}</h3>
                <div class="tour-card-info">
                    <span class="tour-info-item">
                        <i class="fas fa-clock"></i>
                        ${durationText}
                    </span>
                    <span class="tour-info-item">
                        <i class="fas fa-play-circle"></i>
                        ${displayTourType}
                    </span>
                </div>
                ${getRatingDisplayModern(tour)}
                <a href="detailtour.html?tour=${tour.Ma_tour}" class="tour-card-price-btn">
                    ${formatCurrency(tour.Gia_nguoi_lon || 0)}
                </a>
            </div>
        </div>
    `;

    document.getElementById('toursContainer').appendChild(tourCard);
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.classList.toggle('d-none', !show);
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = hasMore ? 'inline-block' : 'none';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertAdjacentElement('afterbegin', alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Hàm sắp xếp tours
function sortTours(tours, sortType) {
    if (!tours || tours.length === 0) return tours;
    
    const sortedTours = [...tours]; // Tạo bản sao để không thay đổi mảng gốc
    
    switch(sortType) {
        case 'price-asc':
            // Sắp xếp theo giá tăng dần
            sortedTours.sort((a, b) => {
                const priceA = parseFloat(a.Gia_nguoi_lon || 0);
                const priceB = parseFloat(b.Gia_nguoi_lon || 0);
                return priceA - priceB;
            });
            break;
        case 'price-desc':
            // Sắp xếp theo giá giảm dần
            sortedTours.sort((a, b) => {
                const priceA = parseFloat(a.Gia_nguoi_lon || 0);
                const priceB = parseFloat(b.Gia_nguoi_lon || 0);
                return priceB - priceA;
            });
            break;
        case 'default':
        default:
            // Giữ nguyên thứ tự mặc định (không sắp xếp)
            break;
    }
    
    return sortedTours;
}

// Thêm hàm reset tìm kiếm
function resetSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('tourTypeFilter').value = '';
    currentSort = 'default';
    currentPage = 1;
    hasMore = true;
    
    // Reset sort button
    const sortOptions = document.querySelectorAll('.sort-option');
    sortOptions.forEach(opt => opt.classList.remove('active'));
    const defaultOption = document.querySelector('.sort-option[data-sort="default"]');
    if (defaultOption) defaultOption.classList.add('active');
    
    const sortBtnText = document.getElementById('sortBtnText');
    if (sortBtnText) sortBtnText.textContent = 'Sắp xếp theo...';
    
    loadTours();
}

// Thêm hàm debounce để tránh gọi API quá nhiều lần
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Hàm hiển thị đánh giá trong card tour (version cũ - giữ để tương thích)
function getRatingDisplay(tour) {
    const averageRating = tour.Diem_danh_gia_trung_binh || 0;
    const ratingCount = tour.So_luong_danh_gia || 0;
    
    if (ratingCount === 0) {
        // Hiển thị 5 sao cho tour chưa có đánh giá
        const stars = generateStars(5);
        return `
            <div class="card-text">
                <span class="text-warning">
                    ${stars}
                </span>
                <small class="ms-1">
                    5.0 (Chưa có đánh giá)
                </small>
            </div>
        `;
    }
    
    const stars = generateStars(averageRating);
    return `
        <div class="card-text">
            <span class="text-warning">
                ${stars}
            </span>
            <small class="ms-1">
                ${parseFloat(averageRating).toFixed(1)} (${ratingCount} đánh giá)
            </small>
        </div>
    `;
}

// Hàm hiển thị đánh giá mới theo design mẫu
function getRatingDisplayModern(tour) {
    const averageRating = tour.Diem_danh_gia_trung_binh || 0;
    const ratingCount = tour.So_luong_danh_gia || 0;
    const displayRating = ratingCount === 0 ? 5.0 : parseFloat(averageRating).toFixed(1);
    const displayCount = ratingCount === 0 ? 'Chưa có đánh giá' : `${ratingCount} đánh giá`;
    const stars = generateStars(ratingCount === 0 ? 5 : averageRating);
    
    return `
        <div class="tour-card-rating">
            <span class="rating-number">${displayRating}</span>
            <span class="rating-stars">${stars}</span>
            <span class="rating-count">(${displayCount})</span>
        </div>
    `;
}

// Hàm tạo HTML cho sao đánh giá
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Sao đầy
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    // Sao nửa
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Sao rỗng
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
} 

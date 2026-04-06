/**
 * Mapbox Integration cho Admin Add Tour
 * Xử lý tìm kiếm địa điểm và hiển thị bản đồ
 */

// Mapbox Access Token (lấy từ .env hoặc config)
const MAPBOX_ACCESS_TOKEN = 'keymapbox'; // Thay bằng token thực tế của bạn

// Biến global cho map và marker
let map = null;
let marker = null;
let searchTimeout = null;

// API URL
const API_URL = window.API_URL || '/api';

/**
 * Khởi tạo Mapbox map
 */
function initMapbox() {
    // Kiểm tra access token
    if (!MAPBOX_ACCESS_TOKEN) {
        console.error('❌ Mapbox access token chưa được cấu hình');
        document.getElementById('mapbox-map').innerHTML = '<div class="alert alert-warning">Mapbox chưa được cấu hình</div>';
        return;
    }

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Khởi tạo map với center mặc định là Việt Nam
    map = new mapboxgl.Map({
        container: 'mapbox-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [105.8342, 21.0278], // Hà Nội, Việt Nam
        zoom: 6
    });

    // Thêm navigation controls
    map.addControl(new mapboxgl.NavigationControl());

    // Xử lý click trên map để đặt marker
    map.on('click', function(e) {
        const { lng, lat } = e.lngLat;
        setMapLocation(lat, lng);
        
        // Gọi reverse geocoding để lấy địa chỉ
        reverseGeocode(lng, lat);
    });

    console.log('✅ Mapbox map initialized');
}

/**
 * Tìm kiếm địa điểm
 */
async function searchLocation(query) {
    if (!query || query.trim() === '') {
        hideSuggestions();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/map/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.status === 'success' && data.data.locations) {
            displaySuggestions(data.data.locations);
        } else {
            hideSuggestions();
        }
    } catch (error) {
        console.error('❌ Error searching location:', error);
        hideSuggestions();
    }
}

/**
 * Hiển thị danh sách gợi ý
 */
function displaySuggestions(locations) {
    const suggestionsContainer = document.getElementById('locationSuggestions');
    
    if (!locations || locations.length === 0) {
        hideSuggestions();
        return;
    }

    let html = '';
    locations.forEach(location => {
        html += `
            <div class="location-suggestion-item" 
                 onclick="selectLocation(${location.latitude}, ${location.longitude}, '${location.place_name.replace(/'/g, "\\'")}')">
                <strong>${location.place_name}</strong>
            </div>
        `;
    });

    suggestionsContainer.innerHTML = html;
    suggestionsContainer.style.display = 'block';
}

/**
 * Ẩn danh sách gợi ý
 */
function hideSuggestions() {
    const suggestionsContainer = document.getElementById('locationSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

/**
 * Chọn vị trí từ danh sách gợi ý
 */
function selectLocation(latitude, longitude, placeName) {
    // Đóng danh sách gợi ý
    hideSuggestions();
    
    // Clear search input
    document.getElementById('searchLocation').value = placeName;
    
    // Set vị trí trên map
    setMapLocation(latitude, longitude, placeName);
}

/**
 * Đặt vị trí trên map
 */
function setMapLocation(latitude, longitude, placeName = null) {
    if (!map) {
        console.error('❌ Map chưa được khởi tạo');
        return;
    }

    // Cập nhật tọa độ trong form
    document.getElementById('latitude').value = latitude;
    document.getElementById('longitude').value = longitude;
    if (placeName) {
        document.getElementById('map_address').value = placeName;
    }

    // Fly to location
    map.flyTo({
        center: [longitude, latitude],
        zoom: 14,
        duration: 1500
    });

    // Xóa marker cũ nếu có
    if (marker) {
        marker.remove();
    }

    // Tạo marker mới
    marker = new mapboxgl.Marker({
        color: '#ff0000',
        draggable: true
    })
    .setLngLat([longitude, latitude])
    .addTo(map);

    // Xử lý khi kéo marker
    marker.on('dragend', function() {
        const lngLat = marker.getLngLat();
        setMapLocation(lngLat.lat, lngLat.lng);
        reverseGeocode(lngLat.lng, lngLat.lat);
    });

    // Hiển thị thông tin
    displayMapInfo(latitude, longitude, placeName);
}

/**
 * Reverse geocoding - Lấy địa chỉ từ tọa độ
 */
async function reverseGeocode(longitude, latitude) {
    try {
        const response = await fetch(`${API_URL}/map/reverse?longitude=${longitude}&latitude=${latitude}`);
        const data = await response.json();

        if (data.status === 'success' && data.data.location) {
            const location = data.data.location;
            document.getElementById('map_address').value = location.place_name;
            displayMapInfo(latitude, longitude, location.place_name);
        }
    } catch (error) {
        console.error('❌ Error reverse geocoding:', error);
    }
}

/**
 * Hiển thị thông tin vị trí đã chọn
 */
function displayMapInfo(latitude, longitude, placeName) {
    const mapInfo = document.getElementById('mapInfo');
    const locationName = document.getElementById('selectedLocationName');
    const coordinates = document.getElementById('selectedCoordinates');

    if (mapInfo && locationName && coordinates) {
        mapInfo.classList.remove('d-none');
        locationName.textContent = placeName || 'Đã chọn vị trí trên bản đồ';
        coordinates.textContent = `Tọa độ: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
}

/**
 * Load map data khi edit tour
 */
function loadMapData(tourData) {
    console.log('🔍 loadMapData called with:', tourData);
    
    if (!tourData) {
        console.warn('⚠️ tourData is null or undefined');
        return;
    }
    
    const lat = tourData.latitude || tourData.Latitude;
    const lng = tourData.longitude || tourData.Longitude;
    const address = tourData.map_address || tourData.Map_address || null;
    
    console.log('🔍 Map data extracted:', { lat, lng, address });
    
    if (lat && lng) {
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        
        if (isNaN(latNum) || isNaN(lngNum)) {
            console.error('❌ Invalid map coordinates:', lat, lng);
            return;
        }
        
        console.log('✅ Valid map coordinates:', latNum, lngNum);
        
        // Cập nhật form fields trước
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        const addrInput = document.getElementById('map_address');
        
        if (latInput) latInput.value = latNum;
        if (lngInput) lngInput.value = lngNum;
        if (addrInput && address) addrInput.value = address;
        
        console.log('✅ Form fields updated');
        
        // Đợi map khởi tạo xong
        const trySetLocation = (attempts = 0) => {
            if (attempts > 20) {
                console.warn('⚠️ Map chưa khởi tạo sau 10 giây');
                return;
            }
            
            if (map) {
                console.log('✅ Map ready, setting location...');
                setMapLocation(latNum, lngNum, address);
            } else {
                // Thử lại sau 500ms
                setTimeout(() => trySetLocation(attempts + 1), 500);
            }
        };
        
        // Bắt đầu thử set location
        trySetLocation();
    } else {
        console.warn('⚠️ Tour không có map data');
    }
}

// Khởi tạo khi DOM ready
$(document).ready(function() {
    // Khởi tạo map
    initMapbox();

    // Xử lý input search với debounce
    $('#searchLocation').on('input', function() {
        const query = $(this).val();
        
        // Clear timeout cũ
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Đợi 500ms sau khi người dùng ngừng gõ
        searchTimeout = setTimeout(() => {
            if (query.trim().length >= 2) {
                searchLocation(query);
            } else {
                hideSuggestions();
            }
        }, 500);
    });

    // Ẩn suggestions khi click ra ngoài
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.location-search-container').length) {
            hideSuggestions();
        }
    });

    // Load map data nếu đang edit tour
    // Đợi một chút để đảm bảo admin_addtour.js đã load xong
    setTimeout(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const editTourId = urlParams.get('edit');
        if (editTourId) {
            console.log('🔍 Đang edit tour, tìm map data...');
            try {
                const tourDataString = localStorage.getItem('editTourData');
                if (tourDataString) {
                    const tourData = JSON.parse(tourDataString);
                    const tour = tourData.tour || tourData;
                    console.log('🔍 Tour data từ localStorage:', tour);
                    loadMapData(tour);
                } else {
                    console.warn('⚠️ Không tìm thấy editTourData trong localStorage');
                }
            } catch (error) {
                console.error('❌ Error loading map data:', error);
            }
        }
    }, 1500); // Đợi 1.5 giây để admin_addtour.js load xong
});

// Export functions để có thể gọi từ nơi khác
window.selectLocation = selectLocation;
window.loadMapData = loadMapData;


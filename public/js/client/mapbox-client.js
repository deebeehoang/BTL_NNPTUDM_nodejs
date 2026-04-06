/**
 * Mapbox Integration cho Client - Hiển thị vị trí tour
 * Sử dụng Mapbox GL JS để hiển thị bản đồ với marker
 */

// Mapbox Access Token
const MAPBOX_ACCESS_TOKEN = 'keymapbox'; // Thay bằng token thực tế của bạn

// Biến global cho map
let tourMap = null;
let tourMarker = null;

/**
 * Khởi tạo và hiển thị map cho tour
 * @param {number} latitude - Vĩ độ
 * @param {number} longitude - Kinh độ
 * @param {string} tourName - Tên tour
 * @param {string} address - Địa chỉ
 */
function initTourMap(latitude, longitude, tourName, address) {
    // Kiểm tra tọa độ hợp lệ
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        console.warn('⚠️ Invalid coordinates for tour map');
        return;
    }

    // Kiểm tra access token
    if (!MAPBOX_ACCESS_TOKEN) {
        console.error('❌ Mapbox access token chưa được cấu hình');
        return;
    }

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Hiển thị card map
    const mapCard = document.getElementById('tour-map-card');
    if (mapCard) {
        mapCard.style.display = 'block';
    }

    // Khởi tạo map
    tourMap = new mapboxgl.Map({
        container: 'tour-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [longitude, latitude],
        zoom: 13
    });

    // Thêm navigation controls
    tourMap.addControl(new mapboxgl.NavigationControl());

    // Tạo popup với thông tin tour
    const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
            <div>
                <h6 class="mb-2"><strong>${tourName || 'Tour'}</strong></h6>
                <p class="mb-0 text-muted small">${address || 'Địa điểm tour'}</p>
            </div>
        `);

    // Tạo marker
    tourMarker = new mapboxgl.Marker({
        color: '#ff0000'
    })
    .setLngLat([longitude, latitude])
    .setPopup(popup)
    .addTo(tourMap);

    // Mở popup mặc định
    tourMarker.togglePopup();

    // Hiển thị địa chỉ
    const addressElement = document.getElementById('tour-map-address');
    if (addressElement && address) {
        addressElement.textContent = address;
    }

    console.log('✅ Tour map initialized:', { latitude, longitude, tourName, address });
}

/**
 * Load map data từ tour data
 */
function loadTourMapFromData(tourData) {
    if (!tourData) {
        return;
    }

    const latitude = tourData.latitude || tourData.Latitude;
    const longitude = tourData.longitude || tourData.Longitude;
    const tourName = tourData.Ten_tour || tourData.ten_tour || 'Tour';
    const address = tourData.map_address || tourData.Map_address;

    if (latitude && longitude) {
        // Đợi một chút để đảm bảo DOM đã sẵn sàng
        setTimeout(() => {
            initTourMap(
                parseFloat(latitude),
                parseFloat(longitude),
                tourName,
                address
            );
        }, 500);
    }
}

// Export functions
window.initTourMap = initTourMap;
window.loadTourMapFromData = loadTourMapFromData;


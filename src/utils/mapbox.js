// Đảm bảo dotenv được load trước khi sử dụng
// Lưu ý: dotenv.config() đã được gọi trong app.js, nhưng để đảm bảo, ta load lại
const path = require('path');
const dotenv = require('dotenv');

// Load .env từ root directory (nếu chưa được load)
const envPath = path.resolve(__dirname, '../../.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.warn('⚠️ Không thể load file .env:', envResult.error.message);
  console.warn('⚠️ Path tried:', envPath);
} else {
  // Chỉ log khi load thành công lần đầu
  if (envResult.parsed) {
    console.log('✅ Loaded .env file from:', envPath);
  }
}

/**
 * Mapbox Configuration
 * Sử dụng Mapbox Geocoding API để tìm kiếm địa điểm
 */
class MapboxConfig {
  /**
   * Get Mapbox access token from environment
   * @returns {string} Mapbox access token
   */
  static getAccessToken() {
    // Đọc token từ process.env
    let token = process.env.MAPBOX_ACCESS_TOKEN;
    
    // Debug: Kiểm tra các biến môi trường liên quan
    const mapboxVars = Object.keys(process.env).filter(k => k.toUpperCase().includes('MAPBOX'));
    
    // Nếu không tìm thấy, thử load lại dotenv
    if (!token) {
      console.warn('⚠️ MAPBOX_ACCESS_TOKEN không tìm thấy trong process.env');
      console.log('🔍 Debug - Mapbox-related env vars:', mapboxVars);
      
      // Thử load lại với path tuyệt đối
      const rootPath = path.resolve(__dirname, '../../');
      const envFile = path.join(rootPath, '.env');
      
      try {
        const result = dotenv.config({ path: envFile, override: false });
        if (result.error) {
          console.error('❌ Error loading .env:', result.error.message);
          console.error('❌ Tried path:', envFile);
        } else {
          console.log('✅ Reloaded .env from:', envFile);
          token = process.env.MAPBOX_ACCESS_TOKEN;
          
          if (token) {
            console.log('✅ Found MAPBOX_ACCESS_TOKEN after reload');
          } else {
            console.warn('⚠️ MAPBOX_ACCESS_TOKEN vẫn không có sau khi reload');
            // Thử đọc trực tiếp từ file .env (fallback)
            try {
              const fs = require('fs');
              if (fs.existsSync(envFile)) {
                const envContent = fs.readFileSync(envFile, 'utf8');
                const match = envContent.match(/MAPBOX_ACCESS_TOKEN\s*=\s*(.+)/);
                if (match) {
                  token = match[1].trim();
                  // Loại bỏ quotes nếu có
                  token = token.replace(/^["']|["']$/g, '');
                  console.log('✅ Found MAPBOX_ACCESS_TOKEN by reading .env file directly');
                  // Set vào process.env để dùng sau
                  process.env.MAPBOX_ACCESS_TOKEN = token;
                }
              }
            } catch (readError) {
              console.error('❌ Error reading .env file directly:', readError.message);
            }
          }
        }
      } catch (err) {
        console.error('❌ Error requiring dotenv:', err);
      }
    }
    
    // Kiểm tra lại sau khi reload
    if (!token) {
      console.error('❌ MAPBOX_ACCESS_TOKEN vẫn không tìm thấy sau khi reload');
      console.log('🔍 Debug - Available env vars with MAPBOX:', mapboxVars);
      console.log('🔍 Debug - All env vars count:', Object.keys(process.env).length);
      console.log('💡 HINT: Đảm bảo file .env có dòng: MAPBOX_ACCESS_TOKEN=pk.eyJ...');
      console.log('💡 HINT: Và restart server sau khi thêm biến môi trường');
      return null;
    }
    
    // Log token (chỉ hiển thị một phần để bảo mật)
    if (token && token.length > 20) {
      console.log('✅ MAPBOX_ACCESS_TOKEN loaded:', token.substring(0, 10) + '...' + token.substring(token.length - 10));
    } else if (token) {
      console.log('✅ MAPBOX_ACCESS_TOKEN loaded (length:', token.length + ')');
    }
    
    return token;
  }

  /**
   * Search location using Mapbox Geocoding API
   * @param {string} placeName - Tên địa điểm cần tìm
   * @returns {Promise<Array>} Array of location results with latitude, longitude, place_name
   */
  static async searchLocation(placeName) {
    const accessToken = this.getAccessToken();
    
    if (!accessToken) {
      throw new Error('Mapbox access token chưa được cấu hình');
    }

    if (!placeName || placeName.trim() === '') {
      return [];
    }

    try {
      // Mapbox Geocoding API endpoint
      // Sử dụng country=VN để ưu tiên kết quả ở Việt Nam
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName)}.json?access_token=${accessToken}&country=VN&limit=5&language=vi`;

      console.log('🔍 Searching Mapbox for:', placeName);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Mapbox API error:', response.status, errorText);
        throw new Error(`Mapbox API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Format kết quả trả về
      const results = data.features.map(feature => ({
        latitude: feature.center[1], // Mapbox trả về [longitude, latitude]
        longitude: feature.center[0],
        place_name: feature.place_name,
        context: feature.context || [],
        id: feature.id
      }));

      console.log(`✅ Found ${results.length} results for "${placeName}"`);
      
      return results;
    } catch (error) {
      console.error('❌ Error searching Mapbox:', error);
      throw error;
    }
  }

  /**
   * Reverse geocoding - Lấy địa chỉ từ tọa độ
   * @param {number} longitude - Kinh độ
   * @param {number} latitude - Vĩ độ
   * @returns {Promise<Object>} Location data với place_name
   */
  static async reverseGeocode(longitude, latitude) {
    const accessToken = this.getAccessToken();
    
    if (!accessToken) {
      throw new Error('Mapbox access token chưa được cấu hình');
    }

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${accessToken}&language=vi`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Mapbox reverse geocoding error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          latitude: latitude,
          longitude: longitude,
          place_name: feature.place_name,
          context: feature.context || []
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error reverse geocoding:', error);
      throw error;
    }
  }
}

module.exports = MapboxConfig;


const MapboxConfig = require('../utils/mapbox');

class MapController {
  static async searchLocation(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.trim() === '') {
        return res.status(400).json({
          status: 'error',
          message: 'Thiếu tham số query'
        });
      }

      const results = await MapboxConfig.searchLocation(query);

      res.json({
        status: 'success',
        results: results.length,
        data: { locations: results }
      });
    } catch (error) {
      console.error('Map search error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi tìm kiếm địa điểm',
        error: error.message
      });
    }
  }

  static async reverseGeocode(req, res) {
    try {
      const { longitude, latitude } = req.query;

      if (!longitude || !latitude) {
        return res.status(400).json({
          status: 'error',
          message: 'Thiếu tham số longitude hoặc latitude'
        });
      }

      const lon = parseFloat(longitude);
      const lat = parseFloat(latitude);

      if (isNaN(lon) || isNaN(lat)) {
        return res.status(400).json({
          status: 'error',
          message: 'Longitude và latitude phải là số hợp lệ'
        });
      }

      const result = await MapboxConfig.reverseGeocode(lon, lat);

      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: 'Không tìm thấy địa chỉ cho tọa độ này'
        });
      }

      res.json({
        status: 'success',
        data: { location: result }
      });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Lỗi khi lấy địa chỉ từ tọa độ',
        error: error.message
      });
    }
  }
}

module.exports = MapController;

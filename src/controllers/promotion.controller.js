const PromotionUtil = require('../utils/promotion.util');

class PromotionController {
  static async getAllForAdmin(req, res) {
    try {
      const data = await PromotionUtil.getAllForAdmin();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const data = await PromotionUtil.getStats();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async createGlobal(req, res) {
    try {
      const { Gia_tri } = req.body;
      if (!Gia_tri) return res.status(400).json({ message: 'Thiếu Gia_tri (%)' });
      await PromotionUtil.createOrUpdateGlobal(req.body);
      res.json({ success: true, message: 'Cập nhật giảm giá toàn site thành công' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async createCoupon(req, res) {
    try {
      const { Ma_km, Gia_tri } = req.body;
      if (!Ma_km || !Gia_tri) return res.status(400).json({ message: 'Thiếu Ma_km hoặc Gia_tri' });
      await PromotionUtil.createOrUpdateCoupon(req.body);
      res.json({ success: true, message: 'Cập nhật coupon thành công' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updatePromotion(req, res) {
    try {
      const { ma_km } = req.params;
      const result = await PromotionUtil.updatePromotion(ma_km, req.body);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
      }
      res.json({ success: true, message: 'Cập nhật khuyến mãi thành công' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async deletePromotion(req, res) {
    try {
      const { ma_km } = req.params;
      const result = await PromotionUtil.deletePromotion(ma_km);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
      }
      res.json({ success: true, message: 'Xóa khuyến mãi thành công' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async hidePromotion(req, res) {
    try {
      const { ma_km } = req.params;
      const result = await PromotionUtil.hidePromotion(ma_km);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Không tìm thấy khuyến mãi' });
      }
      res.json({ success: true, message: 'Ẩn khuyến mãi thành công' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async attachToTour(req, res) {
    try {
      const { Ma_tour, Ma_km } = req.body;
      if (!Ma_tour || !Ma_km) return res.status(400).json({ message: 'Thiếu Ma_tour hoặc Ma_km' });
      await PromotionUtil.attachToTour(Ma_tour, Ma_km);
      res.json({ success: true, message: 'Gắn coupon vào tour thành công' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  static async detachFromTour(req, res) {
    try {
      const { Ma_tour, Ma_km } = req.body;
      if (!Ma_tour || !Ma_km) return res.status(400).json({ message: 'Thiếu Ma_tour hoặc Ma_km' });
      await PromotionUtil.detachFromTour(Ma_tour, Ma_km);
      res.json({ success: true, message: 'Gỡ coupon khỏi tour thành công' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getActiveForCustomer(req, res) {
    try {
      const data = await PromotionUtil.getActiveForCustomer();
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async validateCoupon(req, res) {
    try {
      const { ma_km } = req.params;
      const data = await PromotionUtil.validateCoupon(ma_km);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Mã khuyến mãi không hợp lệ hoặc đã hết hạn' });
      }
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getApplicableForTour(req, res) {
    try {
      const { ma_tour } = req.params;
      const data = await PromotionUtil.getApplicableForTour(ma_tour);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = PromotionController;

const express = require('express');
const router = express.Router();
const PromotionController = require('../controllers/promotion.controller');

// Admin routes
router.get('/admin/all', PromotionController.getAllForAdmin);
router.get('/admin/stats', PromotionController.getStats);
router.post('/global', PromotionController.createGlobal);
router.post('/coupon', PromotionController.createCoupon);
router.put('/:ma_km', PromotionController.updatePromotion);
router.delete('/:ma_km', PromotionController.deletePromotion);
router.put('/:ma_km/hide', PromotionController.hidePromotion);
router.post('/attach-to-tour', PromotionController.attachToTour);
router.delete('/detach-from-tour', PromotionController.detachFromTour);

// Customer routes
router.get('/customer/active', PromotionController.getActiveForCustomer);
router.get('/validate/:ma_km', PromotionController.validateCoupon);
router.get('/applicable/:ma_tour', PromotionController.getApplicableForTour);

module.exports = router;


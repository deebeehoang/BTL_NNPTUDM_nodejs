const express = require('express');
const router = express.Router();
const MapController = require('../controllers/map.controller');

router.get('/search', MapController.searchLocation);
router.get('/reverse', MapController.reverseGeocode);

module.exports = router;


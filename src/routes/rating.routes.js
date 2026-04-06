const express = require('express');
const router = express.Router();
const RatingController = require('../controllers/rating.controller');
const authMiddleware = require('../utils/auth.util');
const roleMiddleware = require('../utils/role.util');
const { ratingUpload } = require('../utils/upload.util');

/**
 * Rating Routes
 */

// Get all ratings (admin only)
router.get('/all', 
  authMiddleware.authenticateToken,
  roleMiddleware.checkRole(['Admin']),
  RatingController.getAllRatings
);

// Public route for testing ratings
router.get('/all-public', RatingController.getAllRatings);

// Get rating statistics (admin only)
router.get('/stats', 
  authMiddleware.authenticateToken,
  roleMiddleware.checkRole(['Admin']),
  RatingController.getRatingStats
);

// Check if user can rate a booking
router.get('/can-rate/:bookingId', authMiddleware.authenticateToken, RatingController.canRateBooking);

// Get ratings by tour ID (public)
router.get('/tour/:tourId', RatingController.getRatingsByTour);

// Get user's ratings
router.get('/my-ratings', 
  authMiddleware.authenticateToken,
  RatingController.getUserRatings
);

// Get rating by ID
router.get('/:id', RatingController.getRatingById);

// Create a new rating
router.post('/', 
  authMiddleware.authenticateToken,
  RatingController.createRating
);

// Update a rating (with image upload support)
router.put('/:id', 
  authMiddleware.authenticateToken,
  ratingUpload.array('images', 5),
  RatingController.updateRating
);

// Delete a rating
router.delete('/:id', 
  authMiddleware.authenticateToken,
  RatingController.deleteRating
);

// Delete all ratings for a tour (admin only)
router.delete('/tour/:tourId', 
  authMiddleware.authenticateToken,
  roleMiddleware.checkRole(['Admin']),
  RatingController.deleteRatingsByTour
);

module.exports = router;

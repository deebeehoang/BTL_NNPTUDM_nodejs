const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticateToken } = require('../utils/auth.util');
const passport = require('../utils/passport');

const router = express.Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile/avatar', authenticateToken, AuthController.updateAvatar);
router.post('/update-password', authenticateToken, AuthController.updatePassword);

// Token verification
router.get('/verify', authenticateToken, AuthController.verifyToken);

// Google OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/auth.html?error=google_auth_failed' }),
    AuthController.googleCallback
);

module.exports = router;
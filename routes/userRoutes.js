
const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, updatePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Get user profile
router.get('/profile', protect, getUserProfile);

// Update user profile
router.put('/profile', protect, updateUserProfile);

// Update password
router.put('/password', protect, updatePassword);

module.exports = router;

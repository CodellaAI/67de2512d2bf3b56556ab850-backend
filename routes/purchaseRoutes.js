
const express = require('express');
const router = express.Router();
const { createPurchase, getUserPurchases, checkPurchase } = require('../controllers/purchaseController');
const { protect } = require('../middleware/authMiddleware');

// Create a new purchase
router.post('/', protect, createPurchase);

// Get user purchases
router.get('/', protect, getUserPurchases);

// Check if user has purchased a plugin
router.get('/check/:pluginId', protect, checkPurchase);

module.exports = router;

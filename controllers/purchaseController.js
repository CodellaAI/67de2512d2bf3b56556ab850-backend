
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Purchase = require('../models/purchaseModel');
const Plugin = require('../models/pluginModel');

// @desc    Create a new purchase
// @route   POST /api/purchases
// @access  Private
const createPurchase = asyncHandler(async (req, res) => {
  const { pluginId } = req.body;

  // Find plugin
  const plugin = await Plugin.findById(pluginId);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user is the author (authors don't need to purchase their own plugins)
  if (plugin.author.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot purchase your own plugin');
  }

  // Check if user has already purchased this plugin
  const existingPurchase = await Purchase.findOne({
    user: req.user._id,
    plugin: pluginId,
  });

  if (existingPurchase) {
    res.status(400);
    throw new Error('You have already purchased this plugin');
  }

  // Generate a transaction ID
  const transactionId = crypto.randomBytes(16).toString('hex');

  // Create purchase record
  const purchase = await Purchase.create({
    user: req.user._id,
    plugin: pluginId,
    price: plugin.price,
    transactionId,
  });

  if (purchase) {
    res.status(201).json(purchase);
  } else {
    res.status(400);
    throw new Error('Invalid purchase data');
  }
});

// @desc    Get user purchases
// @route   GET /api/purchases
// @access  Private
const getUserPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ user: req.user._id })
    .populate({
      path: 'plugin',
      populate: {
        path: 'author',
        select: 'username',
      },
    })
    .sort({ createdAt: -1 });

  res.json(purchases);
});

// @desc    Check if user has purchased a plugin
// @route   GET /api/purchases/check/:pluginId
// @access  Private
const checkPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({
    user: req.user._id,
    plugin: req.params.pluginId,
  });

  if (purchase) {
    res.json({ purchased: true });
  } else {
    res.json({ purchased: false });
  }
});

module.exports = {
  createPurchase,
  getUserPurchases,
  checkPurchase,
};


const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');
const Plugin = require('../models/pluginModel');
const Purchase = require('../models/purchaseModel');

// @desc    Get all plugins
// @route   GET /api/plugins
// @access  Public
const getPlugins = asyncHandler(async (req, res) => {
  const pageSize = 12;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || pageSize;

  const query = {};

  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Filter by featured
  if (req.query.featured) {
    query.featured = req.query.featured === 'true';
  }

  // Search by name or description
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  // Sort options
  let sortOption = {};
  switch (req.query.sort) {
    case 'popular':
      sortOption = { downloadCount: -1 };
      break;
    case 'price-low':
      sortOption = { price: 1 };
      break;
    case 'price-high':
      sortOption = { price: -1 };
      break;
    case 'rating':
      sortOption = { averageRating: -1 };
      break;
    default:
      sortOption = { createdAt: -1 }; // newest first
  }

  const count = await Plugin.countDocuments(query);
  const plugins = await Plugin.find(query)
    .populate('author', 'username')
    .sort(sortOption)
    .limit(limit)
    .skip(limit * (page - 1));

  res.json(plugins);
});

// @desc    Get plugin by ID
// @route   GET /api/plugins/:id
// @access  Public
const getPluginById = asyncHandler(async (req, res) => {
  const plugin = await Plugin.findById(req.params.id).populate('author', 'username _id');

  if (plugin) {
    // If user is logged in, check if they've purchased this plugin
    if (req.user) {
      const purchases = await Purchase.find({
        user: req.user._id,
        plugin: plugin._id,
      });
      
      // Add purchases to plugin object for the response
      plugin.purchases = purchases;
    }
    
    res.json(plugin);
  } else {
    res.status(404);
    throw new Error('Plugin not found');
  }
});

// @desc    Create a plugin
// @route   POST /api/plugins
// @access  Private
const createPlugin = asyncHandler(async (req, res) => {
  const { name, price, category, description, version, minecraftVersion, requirements, features } = req.body;

  // Ensure files were uploaded
  if (!req.files || !req.files.pluginFile || !req.files.thumbnailFile) {
    res.status(400);
    throw new Error('Please upload both plugin file and thumbnail');
  }

  const pluginFile = req.files.pluginFile[0];
  const thumbnailFile = req.files.thumbnailFile[0];

  // Get server URL for file paths
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const thumbnailUrl = `${serverUrl}/uploads/thumbnails/${thumbnailFile.filename}`;

  // Create plugin
  const plugin = await Plugin.create({
    name,
    author: req.user._id,
    price,
    category,
    description,
    thumbnailUrl,
    features: features ? JSON.parse(features) : [],
    requirements,
    versions: [
      {
        versionNumber: version,
        filePath: pluginFile.path,
        minecraftVersion,
        releaseDate: new Date(),
      },
    ],
  });

  if (plugin) {
    res.status(201).json(plugin);
  } else {
    // Clean up uploaded files if plugin creation fails
    fs.unlinkSync(pluginFile.path);
    fs.unlinkSync(thumbnailFile.path);
    
    res.status(400);
    throw new Error('Invalid plugin data');
  }
});

// @desc    Update a plugin
// @route   PUT /api/plugins/:id
// @access  Private
const updatePlugin = asyncHandler(async (req, res) => {
  const { name, price, category, description, requirements, features } = req.body;

  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user is the author
  if (plugin.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You are not authorized to update this plugin');
  }

  // Update basic info
  plugin.name = name || plugin.name;
  plugin.price = price || plugin.price;
  plugin.category = category || plugin.category;
  plugin.description = description || plugin.description;
  plugin.requirements = requirements || plugin.requirements;
  
  if (features) {
    plugin.features = JSON.parse(features);
  }

  // Update thumbnail if provided
  if (req.files && req.files.thumbnailFile) {
    const thumbnailFile = req.files.thumbnailFile[0];
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    plugin.thumbnailUrl = `${serverUrl}/uploads/thumbnails/${thumbnailFile.filename}`;
  }

  const updatedPlugin = await plugin.save();
  res.json(updatedPlugin);
});

// @desc    Add a new version to a plugin
// @route   POST /api/plugins/:id/versions
// @access  Private
const addPluginVersion = asyncHandler(async (req, res) => {
  const { versionNumber, minecraftVersion, changelog } = req.body;

  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user is the author
  if (plugin.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You are not authorized to update this plugin');
  }

  // Ensure plugin file was uploaded
  if (!req.files || !req.files.pluginFile) {
    res.status(400);
    throw new Error('Please upload a plugin file');
  }

  const pluginFile = req.files.pluginFile[0];

  // Add new version
  plugin.versions.push({
    versionNumber,
    filePath: pluginFile.path,
    minecraftVersion,
    changelog,
    releaseDate: new Date(),
  });

  const updatedPlugin = await plugin.save();
  res.json(updatedPlugin);
});

// @desc    Create a review
// @route   POST /api/plugins/:id/reviews
// @access  Private
const createPluginReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user has purchased the plugin
  const hasPurchased = await Purchase.findOne({
    user: req.user._id,
    plugin: plugin._id,
  });

  if (!hasPurchased && plugin.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You must purchase this plugin before leaving a review');
  }

  // Check if user already reviewed this plugin
  const alreadyReviewed = plugin.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this plugin');
  }

  const review = {
    user: req.user._id,
    rating: Number(rating),
    comment,
  };

  plugin.reviews.push(review);

  await plugin.save();
  res.status(201).json({ message: 'Review added' });
});

// @desc    Download plugin
// @route   GET /api/plugins/:id/download
// @access  Private
const downloadPlugin = asyncHandler(async (req, res) => {
  const plugin = await Plugin.findById(req.params.id);

  if (!plugin) {
    res.status(404);
    throw new Error('Plugin not found');
  }

  // Check if user has purchased the plugin or is the author
  const hasPurchased = await Purchase.findOne({
    user: req.user._id,
    plugin: plugin._id,
  });

  if (!hasPurchased && plugin.author.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You must purchase this plugin before downloading');
  }

  // Get latest version
  const latestVersion = plugin.versions[plugin.versions.length - 1];
  
  if (!latestVersion) {
    res.status(404);
    throw new Error('No version available for download');
  }

  const filePath = latestVersion.filePath;

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.status(404);
    throw new Error('Plugin file not found');
  }

  // Increment download count
  latestVersion.downloadCount += 1;
  plugin.downloadCount += 1;
  await plugin.save();

  // Send file
  res.download(filePath, `${plugin.name}-v${latestVersion.versionNumber}.jar`);
});

// @desc    Get plugins by current user
// @route   GET /api/plugins/user
// @access  Private
const getUserPlugins = asyncHandler(async (req, res) => {
  const plugins = await Plugin.find({ author: req.user._id })
    .sort({ createdAt: -1 });

  res.json(plugins);
});

module.exports = {
  getPlugins,
  getPluginById,
  createPlugin,
  updatePlugin,
  addPluginVersion,
  createPluginReview,
  downloadPlugin,
  getUserPlugins,
};

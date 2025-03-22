
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  getPlugins, 
  getPluginById, 
  createPlugin, 
  updatePlugin, 
  addPluginVersion, 
  createPluginReview, 
  downloadPlugin,
  getUserPlugins
} = require('../controllers/pluginController');
const { protect } = require('../middleware/authMiddleware');

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    
    if (file.fieldname === 'pluginFile') {
      uploadPath = 'uploads/plugins/';
    } else if (file.fieldname === 'thumbnailFile') {
      uploadPath = 'uploads/thumbnails/';
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pluginFile') {
    // Accept only jar files
    if (path.extname(file.originalname).toLowerCase() === '.jar') {
      cb(null, true);
    } else {
      cb(new Error('Only JAR files are allowed for plugins'), false);
    }
  } else if (file.fieldname === 'thumbnailFile') {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'), false);
    }
  } else {
    cb(new Error('Unexpected field'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

const pluginUpload = upload.fields([
  { name: 'pluginFile', maxCount: 1 },
  { name: 'thumbnailFile', maxCount: 1 }
]);

const versionUpload = upload.fields([
  { name: 'pluginFile', maxCount: 1 }
]);

// Get all plugins
router.get('/', getPlugins);

// Get current user's plugins
router.get('/user', protect, getUserPlugins);

// Get plugin by ID
router.get('/:id', getPluginById);

// Create plugin
router.post('/', protect, pluginUpload, createPlugin);

// Update plugin
router.put('/:id', protect, pluginUpload, updatePlugin);

// Add a new version
router.post('/:id/versions', protect, versionUpload, addPluginVersion);

// Create review
router.post('/:id/reviews', protect, createPluginReview);

// Download plugin
router.get('/:id/download', protect, downloadPlugin);

module.exports = router;

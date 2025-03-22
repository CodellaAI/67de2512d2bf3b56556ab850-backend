
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const pluginDir = path.join(__dirname, '../uploads/plugins');
const thumbnailDir = path.join(__dirname, '../uploads/thumbnails');

if (!fs.existsSync(pluginDir)) {
  fs.mkdirSync(pluginDir, { recursive: true });
}

if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'pluginFile') {
      cb(null, 'uploads/plugins/');
    } else if (file.fieldname === 'thumbnailFile') {
      cb(null, 'uploads/thumbnails/');
    } else {
      cb(new Error('Invalid fieldname'), null);
    }
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pluginFile') {
    // Only accept JAR files
    if (file.mimetype === 'application/java-archive' || path.extname(file.originalname).toLowerCase() === '.jar') {
      cb(null, true);
    } else {
      cb(new Error('Only JAR files are allowed for plugins'), false);
    }
  } else if (file.fieldname === 'thumbnailFile') {
    // Only accept images
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
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  },
});

module.exports = upload;


const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const versionSchema = mongoose.Schema(
  {
    versionNumber: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    minecraftVersion: {
      type: String,
      required: true,
    },
    changelog: {
      type: String,
    },
    releaseDate: {
      type: Date,
      default: Date.now,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const pluginSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    category: {
      type: String,
      required: true,
    },
    features: [
      {
        type: String,
      },
    ],
    requirements: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },
    versions: [versionSchema],
    reviews: [reviewSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate average rating when reviews are modified
pluginSchema.pre('save', function (next) {
  if (this.reviews && this.reviews.length > 0) {
    this.averageRating =
      this.reviews.reduce((acc, review) => acc + review.rating, 0) /
      this.reviews.length;
  } else {
    this.averageRating = 0;
  }
  next();
});

const Plugin = mongoose.model('Plugin', pluginSchema);

module.exports = Plugin;


const mongoose = require('mongoose');

const purchaseSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    plugin: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Plugin',
    },
    price: {
      type: Number,
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;

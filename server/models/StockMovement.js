const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch reference is required']
    },
    type: {
      type: String,
      required: [true, 'Movement type is required'],
      enum: {
        values: ['STOCK_IN', 'STOCK_OUT', 'TRANSFER'],
        message: '{VALUE} is not a valid movement type. Allowed types are: STOCK_IN, STOCK_OUT, TRANSFER'
      }
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      validate: {
        validator: function (value) {
          return typeof value === 'number' && value > 0;
        },
        message: 'Quantity must be greater than 0'
      }
    },
    fromLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    toLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    reason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index on createdAt and type for fast historical query and analytics retrieval
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

module.exports = StockMovement;

const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true
    },
    manufacturingDate: {
      type: Date,
      required: [true, 'Manufacturing date is required']
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      validate: {
        validator: function (value) {
          const mfgDate =
            this.manufacturingDate ||
            (this.getUpdate && this.getUpdate().manufacturingDate) ||
            (this.getUpdate && this.getUpdate().$set && this.getUpdate().$set.manufacturingDate);
          if (!mfgDate || !value) return true;
          return new Date(value) >= new Date(mfgDate);
        },
        message: 'Expiry date must not be earlier than the manufacturing date'
      }
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required']
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: [true, 'Location reference is required']
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient batch lookups without making batchNumber globally unique
batchSchema.index({ product: 1, batchNumber: 1 });
batchSchema.index({ batchNumber: 1 });
batchSchema.index({ location: 1 });
batchSchema.index({ expiryDate: 1 });

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;

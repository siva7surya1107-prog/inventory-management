const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    managerName: {
      type: String,
      trim: true
    },
    contactNumber: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid status. Allowed values are: active, inactive'
      },
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;

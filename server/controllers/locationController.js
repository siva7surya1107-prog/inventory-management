const mongoose = require('mongoose');
const Location = require('../models/Location');
const Batch = require('../models/Batch');
const StockMovement = require('../models/StockMovement');

/**
 * @desc    Get all locations with search, status filtering, and pagination
 * @route   GET /api/locations
 * @access  Private (Staff & Admin)
 */
const getLocations = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Search by name, city, or state
    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { city: searchRegex },
        { state: searchRegex }
      ];
    }

    // Status filter
    if (status) {
      filter.status = status.trim().toLowerCase();
    }

    const total = await Location.countDocuments(filter);
    const locations = await Location.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Locations retrieved successfully',
      data: locations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single location by ID
 * @route   GET /api/locations/:id
 * @access  Private (Staff & Admin)
 */
const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location ID format'
      });
    }

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location retrieved successfully',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new location
 * @route   POST /api/locations
 * @access  Private/Admin
 */
const createLocation = async (req, res, next) => {
  try {
    const { name, address, city, state, managerName, contactNumber, status } = req.body;

    // Validate required fields
    if (!name || !name.trim() || !city || !city.trim() || !state || !state.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, city, and state are required'
      });
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either active or inactive'
      });
    }

    const location = await Location.create({
      name: name.trim(),
      address: address ? address.trim() : undefined,
      city: city.trim(),
      state: state.trim(),
      managerName: managerName ? managerName.trim() : undefined,
      contactNumber: contactNumber ? contactNumber.trim() : undefined,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update location
 * @route   PUT /api/locations/:id
 * @access  Private/Admin
 */
const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, city, state, managerName, contactNumber, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location ID format'
      });
    }

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Location name cannot be empty'
        });
      }
      location.name = name.trim();
    }

    if (address !== undefined) {
      location.address = address ? address.trim() : '';
    }

    if (city !== undefined) {
      if (!city.trim()) {
        return res.status(400).json({
          success: false,
          message: 'City cannot be empty'
        });
      }
      location.city = city.trim();
    }

    if (state !== undefined) {
      if (!state.trim()) {
        return res.status(400).json({
          success: false,
          message: 'State cannot be empty'
        });
      }
      location.state = state.trim();
    }

    if (managerName !== undefined) {
      location.managerName = managerName ? managerName.trim() : '';
    }

    if (contactNumber !== undefined) {
      location.contactNumber = contactNumber ? contactNumber.trim() : '';
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either active or inactive'
        });
      }
      location.status = status;
    }

    const updatedLocation = await location.save();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: updatedLocation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete location
 * @route   DELETE /api/locations/:id
 * @access  Private/Admin
 */
const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location ID format'
      });
    }

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Relational Check: Verify location is not referenced in Batches
    const hasBatches = await Batch.exists({ location: id });
    if (hasBatches) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location: It is referenced by existing inventory batches.'
      });
    }

    // Relational Check: Verify location is not referenced in StockMovements (fromLocation or toLocation)
    const hasMovements = await StockMovement.exists({
      $or: [{ fromLocation: id }, { toLocation: id }]
    });
    if (hasMovements) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location: It is referenced by existing stock movement history.'
      });
    }

    await Location.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Location deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
};

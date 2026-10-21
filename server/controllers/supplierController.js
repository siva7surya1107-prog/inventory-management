const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const Batch = require('../models/Batch');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @desc    Get all suppliers with search and pagination
 * @route   GET /api/suppliers
 * @access  Private (Staff & Admin)
 */
const getSuppliers = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Search across supplier name, companyName, or email
    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { companyName: searchRegex },
        { email: searchRegex }
      ];
    }

    // Status filter
    if (status) {
      filter.status = status.trim().toLowerCase();
    }

    const total = await Supplier.countDocuments(filter);
    const suppliers = await Supplier.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Suppliers retrieved successfully',
      data: suppliers,
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
 * @desc    Get single supplier by ID
 * @route   GET /api/suppliers/:id
 * @access  Private (Staff & Admin)
 */
const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID format'
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Supplier retrieved successfully',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new supplier
 * @route   POST /api/suppliers
 * @access  Private/Admin
 */
const createSupplier = async (req, res, next) => {
  try {
    const { name, companyName, email, phone, address, status } = req.body;

    // Validate required fields
    if (!name || !name.trim() || !companyName || !companyName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name and companyName are required'
      });
    }

    // Validate email if provided
    let normalizedEmail;
    if (email && email.trim()) {
      normalizedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }
    }

    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either active or inactive'
      });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      companyName: companyName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : undefined,
      address: address ? address.trim() : undefined,
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private/Admin
 */
const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, companyName, email, phone, address, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID format'
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty'
        });
      }
      supplier.name = name.trim();
    }

    if (companyName !== undefined) {
      if (!companyName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Company name cannot be empty'
        });
      }
      supplier.companyName = companyName.trim();
    }

    if (email !== undefined) {
      if (email && email.trim()) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(normalizedEmail)) {
          return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address'
          });
        }
        supplier.email = normalizedEmail;
      } else {
        supplier.email = undefined;
      }
    }

    if (phone !== undefined) {
      supplier.phone = phone ? phone.trim() : '';
    }

    if (address !== undefined) {
      supplier.address = address ? address.trim() : '';
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either active or inactive'
        });
      }
      supplier.status = status;
    }

    const updatedSupplier = await supplier.save();

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: updatedSupplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private/Admin
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supplier ID format'
      });
    }

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Relational Check: Verify supplier is not referenced in existing Batches
    const hasBatches = await Batch.exists({ supplier: id });
    if (hasBatches) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier: It is referenced by existing inventory batches.'
      });
    }

    await Supplier.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};

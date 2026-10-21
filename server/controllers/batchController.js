const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Location = require('../models/Location');
const StockMovement = require('../models/StockMovement');

/**
 * @desc    Get all batches with filters (product, location, supplier, batchNumber, expiryStatus) and pagination
 * @route   GET /api/batches
 * @access  Private (Staff & Admin)
 */
const getBatches = async (req, res, next) => {
  try {
    const { product, location, supplier, batchNumber, expiryStatus } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (product) {
      if (!mongoose.Types.ObjectId.isValid(product)) {
        return res.status(400).json({ success: false, message: 'Invalid product ID format' });
      }
      filter.product = product;
    }

    if (location) {
      if (!mongoose.Types.ObjectId.isValid(location)) {
        return res.status(400).json({ success: false, message: 'Invalid location ID format' });
      }
      filter.location = location;
    }

    if (supplier) {
      if (!mongoose.Types.ObjectId.isValid(supplier)) {
        return res.status(400).json({ success: false, message: 'Invalid supplier ID format' });
      }
      filter.supplier = supplier;
    }

    if (batchNumber) {
      filter.batchNumber = { $regex: batchNumber.trim(), $options: 'i' };
    }

    const now = new Date();
    const warningDays = parseInt(process.env.EXPIRY_WARNING_DAYS, 10) || 30;
    const warningThreshold = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

    if (expiryStatus === 'expired') {
      filter.expiryDate = { $lt: now };
    } else if (expiryStatus === 'expiring_soon') {
      filter.expiryDate = { $gte: now, $lte: warningThreshold };
    } else if (expiryStatus === 'valid') {
      filter.expiryDate = { $gt: warningThreshold };
    }

    const total = await Batch.countDocuments(filter);
    const batches = await Batch.find(filter)
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('supplier', 'name companyName email phone')
      .populate('location', 'name city state address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Batches retrieved successfully',
      data: batches,
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
 * @desc    Get single batch by ID
 * @route   GET /api/batches/:id
 * @access  Private (Staff & Admin)
 */
const getBatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID format' });
    }

    const batch = await Batch.findById(id)
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('supplier', 'name companyName email phone')
      .populate('location', 'name city state address');

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Batch retrieved successfully',
      data: {
        _id: batch._id,
        product: batch.product,
        SKU: batch.product ? batch.product.SKU : undefined,
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
        supplier: batch.supplier,
        location: batch.location,
        manufacturingDate: batch.manufacturingDate,
        expiryDate: batch.expiryDate,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new batch (Admin only). Note: Normal inventory intake should use /api/stock/in
 * @route   POST /api/batches
 * @access  Private/Admin
 */
const createBatch = async (req, res, next) => {
  try {
    const { product, batchNumber, manufacturingDate, expiryDate, quantity, supplier, location } = req.body;

    if (!product || !batchNumber || !manufacturingDate || !expiryDate || quantity === undefined || !supplier || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product, batchNumber, manufacturingDate, expiryDate, quantity, supplier, and location'
      });
    }

    if (Number(quantity) < 0) {
      return res.status(400).json({ success: false, message: 'Quantity cannot be negative' });
    }

    if (new Date(expiryDate) < new Date(manufacturingDate)) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must not be earlier than manufacturing date'
      });
    }

    const [productExists, supplierExists, locationExists] = await Promise.all([
      Product.findById(product),
      Supplier.findById(supplier),
      Location.findById(location)
    ]);

    if (!productExists) return res.status(400).json({ success: false, message: 'Product does not exist' });
    if (!supplierExists) return res.status(400).json({ success: false, message: 'Supplier does not exist' });
    if (!locationExists) return res.status(400).json({ success: false, message: 'Location does not exist' });

    const batch = await Batch.create({
      product,
      batchNumber: batchNumber.trim(),
      manufacturingDate: new Date(manufacturingDate),
      expiryDate: new Date(expiryDate),
      quantity: Number(quantity),
      supplier,
      location
    });

    // If initial quantity was supplied, create a corresponding STOCK_IN movement to maintain audit integrity
    if (Number(quantity) > 0) {
      await StockMovement.create({
        product,
        batch: batch._id,
        type: 'STOCK_IN',
        quantity: Number(quantity),
        toLocation: location,
        user: req.user._id,
        reason: 'Initial batch creation'
      });
    }

    const populatedBatch = await Batch.findById(batch._id)
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('supplier', 'name companyName email phone')
      .populate('location', 'name city state address');

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: populatedBatch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update batch metadata (Admin only). Arbitrary quantity modification is strictly blocked!
 * @route   PUT /api/batches/:id
 * @access  Private/Admin
 */
const updateBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, manufacturingDate, expiryDate, supplier, location, batchNumber } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID format' });
    }

    // Guardrail: Do NOT allow modifying batch quantity directly through CRUD
    if (quantity !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Batch quantity cannot be modified directly. Use stock operations (/api/stock/in, /api/stock/out, /api/stock/transfer).'
      });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batchNumber) {
      batch.batchNumber = batchNumber.trim();
    }

    if (supplier) {
      if (!mongoose.Types.ObjectId.isValid(supplier) || !(await Supplier.findById(supplier))) {
        return res.status(400).json({ success: false, message: 'Invalid or non-existent supplier' });
      }
      batch.supplier = supplier;
    }

    if (location) {
      if (!mongoose.Types.ObjectId.isValid(location) || !(await Location.findById(location))) {
        return res.status(400).json({ success: false, message: 'Invalid or non-existent location' });
      }
      batch.location = location;
    }

    const newMfg = manufacturingDate ? new Date(manufacturingDate) : batch.manufacturingDate;
    const newExp = expiryDate ? new Date(expiryDate) : batch.expiryDate;

    if (newExp < newMfg) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must not be earlier than manufacturing date'
      });
    }

    if (manufacturingDate) batch.manufacturingDate = newMfg;
    if (expiryDate) batch.expiryDate = newExp;

    await batch.save();

    const updatedBatch = await Batch.findById(id)
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('supplier', 'name companyName email phone')
      .populate('location', 'name city state address');

    res.status(200).json({
      success: true,
      message: 'Batch metadata updated successfully',
      data: updatedBatch
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete batch (Admin only). Blocked if batch has remaining stock or movement history.
 * @route   DELETE /api/batches/:id
 * @access  Private/Admin
 */
const deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID format' });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batch.quantity > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete batch with remaining stock. Transfer or stock-out all items first.'
      });
    }

    const hasMovements = await StockMovement.exists({ batch: id });
    if (hasMovements) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete batch with existing stock movement history.'
      });
    }

    await Batch.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch
};

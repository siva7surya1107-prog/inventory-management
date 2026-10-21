const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Location = require('../models/Location');
const StockMovement = require('../models/StockMovement');
const { withTransaction } = require('../utils/transaction');

/**
 * @desc    Stock IN: Receive inventory and update/create batch & log movement
 * @route   POST /api/stock/in
 * @access  Private (Staff & Admin)
 */
const stockIn = async (req, res, next) => {
  try {
    const {
      product,
      batchNumber,
      supplier,
      location,
      quantity,
      manufacturingDate,
      expiryDate,
      reason
    } = req.body;

    // 1. Validate required fields
    if (!product || !batchNumber || !supplier || !location || quantity === undefined || !manufacturingDate || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product, batchNumber, supplier, location, quantity, manufacturingDate, and expiryDate'
      });
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a number greater than 0'
      });
    }

    const mfgDate = new Date(manufacturingDate);
    const expDate = new Date(expiryDate);
    if (isNaN(mfgDate.getTime()) || isNaN(expDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for manufacturingDate or expiryDate'
      });
    }

    if (expDate < mfgDate) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date must not be earlier than manufacturing date'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(product) || !mongoose.Types.ObjectId.isValid(supplier) || !mongoose.Types.ObjectId.isValid(location)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId format for product, supplier, or location'
      });
    }

    const [productDoc, supplierDoc, locationDoc] = await Promise.all([
      Product.findById(product),
      Supplier.findById(supplier),
      Location.findById(location)
    ]);

    if (!productDoc) return res.status(400).json({ success: false, message: 'Referenced product does not exist' });
    if (!supplierDoc) return res.status(400).json({ success: false, message: 'Referenced supplier does not exist' });
    if (!locationDoc) return res.status(400).json({ success: false, message: 'Referenced location does not exist' });

    const normalizedBatchNumber = batchNumber.trim();

    // Execute with transaction if supported, or with automatic rollback on standalone
    const result = await withTransaction(async (session) => {
      const opts = session ? { session } : {};

      let batch = await Batch.findOne(
        { product, batchNumber: normalizedBatchNumber, location },
        null,
        opts
      );

      let isNewBatch = false;
      let prevQuantity = 0;

      if (batch) {
        prevQuantity = batch.quantity;
        batch.quantity += numQty;
        await batch.save(opts);
      } else {
        isNewBatch = true;
        const createdBatches = await Batch.create(
          [
            {
              product,
              batchNumber: normalizedBatchNumber,
              supplier,
              location,
              quantity: numQty,
              manufacturingDate: mfgDate,
              expiryDate: expDate
            }
          ],
          opts
        );
        batch = createdBatches[0];
      }

      try {
        const [movement] = await StockMovement.create(
          [
            {
              product,
              batch: batch._id,
              type: 'STOCK_IN',
              quantity: numQty,
              toLocation: location,
              user: req.user._id,
              reason: reason ? reason.trim() : 'Stock Received'
            }
          ],
          opts
        );

        return { batch, movement, isNewBatch };
      } catch (movementError) {
        // Rollback for standalone MongoDB if session is null
        if (!session) {
          if (isNewBatch) {
            await Batch.findByIdAndDelete(batch._id);
          } else {
            batch.quantity = prevQuantity;
            await batch.save();
          }
        }
        throw movementError;
      }
    });

    const populatedBatch = await Batch.findById(result.batch._id)
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('supplier', 'name companyName')
      .populate('location', 'name city state');

    res.status(result.isNewBatch ? 201 : 200).json({
      success: true,
      message: 'Stock-in recorded successfully',
      data: {
        batch: populatedBatch,
        movement: {
          id: result.movement._id,
          type: result.movement.type,
          quantity: result.movement.quantity,
          location: locationDoc.name,
          createdAt: result.movement.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stock OUT: Issue/remove stock, verify availability & log movement
 * @route   POST /api/stock/out
 * @access  Private (Staff & Admin)
 */
const stockOut = async (req, res, next) => {
  try {
    const { product, batch, location, quantity, reason } = req.body;

    if (!product || !batch || !location || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product, batch, location, and quantity'
      });
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a number greater than 0'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(product) || !mongoose.Types.ObjectId.isValid(batch) || !mongoose.Types.ObjectId.isValid(location)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId format for product, batch, or location'
      });
    }

    const result = await withTransaction(async (session) => {
      const opts = session ? { session } : {};

      const batchDoc = await Batch.findById(batch, null, opts);
      if (!batchDoc) {
        const err = new Error('Batch not found');
        err.statusCode = 404;
        throw err;
      }

      if (batchDoc.product.toString() !== product.toString()) {
        const err = new Error('Batch does not belong to the selected product');
        err.statusCode = 400;
        throw err;
      }

      if (batchDoc.location.toString() !== location.toString()) {
        const err = new Error('Batch is not at the specified location');
        err.statusCode = 400;
        throw err;
      }

      // Check available stock (Never allow negative stock!)
      if (batchDoc.quantity < numQty) {
        const err = new Error('Insufficient stock');
        err.statusCode = 400;
        err.available = batchDoc.quantity;
        err.requested = numQty;
        throw err;
      }

      const prevQuantity = batchDoc.quantity;
      batchDoc.quantity -= numQty;
      await batchDoc.save(opts);

      try {
        const [movement] = await StockMovement.create(
          [
            {
              product,
              batch: batchDoc._id,
              type: 'STOCK_OUT',
              quantity: numQty,
              fromLocation: location,
              user: req.user._id,
              reason: reason ? reason.trim() : 'Stock Issued'
            }
          ],
          opts
        );

        return { batchDoc, movement };
      } catch (movementError) {
        if (!session) {
          batchDoc.quantity = prevQuantity;
          await batchDoc.save();
        }
        throw movementError;
      }
    });

    const populatedBatch = await Batch.findById(result.batchDoc._id)
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('supplier', 'name companyName')
      .populate('location', 'name city state');

    res.status(200).json({
      success: true,
      message: 'Stock-out recorded successfully',
      data: {
        batch: populatedBatch,
        remainingQuantity: result.batchDoc.quantity,
        movement: {
          id: result.movement._id,
          type: result.movement.type,
          quantity: result.movement.quantity,
          reason: result.movement.reason,
          createdAt: result.movement.createdAt
        }
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        available: error.available,
        requested: error.requested
      });
    }
    next(error);
  }
};

/**
 * @desc    Stock Transfer: Atomically transfer stock from one location to another
 * @route   POST /api/stock/transfer
 * @access  Private (Staff & Admin)
 */
const stockTransfer = async (req, res, next) => {
  try {
    const { product, batch, fromLocation, toLocation, quantity, reason } = req.body;

    if (!product || !batch || !fromLocation || !toLocation || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product, batch, fromLocation, toLocation, and quantity'
      });
    }

    if (fromLocation.toString() === toLocation.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination locations cannot be the same'
      });
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a number greater than 0'
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(product) ||
      !mongoose.Types.ObjectId.isValid(batch) ||
      !mongoose.Types.ObjectId.isValid(fromLocation) ||
      !mongoose.Types.ObjectId.isValid(toLocation)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ObjectId format'
      });
    }

    const toLocationDoc = await Location.findById(toLocation);
    if (!toLocationDoc) {
      return res.status(400).json({
        success: false,
        message: 'Destination location does not exist'
      });
    }

    const result = await withTransaction(async (session) => {
      const opts = session ? { session } : {};

      const sourceBatch = await Batch.findById(batch, null, opts);
      if (!sourceBatch) {
        const err = new Error('Source batch not found');
        err.statusCode = 404;
        throw err;
      }

      if (sourceBatch.product.toString() !== product.toString()) {
        const err = new Error('Batch does not belong to the selected product');
        err.statusCode = 400;
        throw err;
      }

      if (sourceBatch.location.toString() !== fromLocation.toString()) {
        const err = new Error('Batch is not at the specified source location');
        err.statusCode = 400;
        throw err;
      }

      if (sourceBatch.quantity < numQty) {
        const err = new Error('Insufficient stock');
        err.statusCode = 400;
        err.available = sourceBatch.quantity;
        err.requested = numQty;
        throw err;
      }

      // Record source state for rollback if session is null
      const originalSourceQuantity = sourceBatch.quantity;
      sourceBatch.quantity -= numQty;
      await sourceBatch.save(opts);

      let destBatch = await Batch.findOne(
        {
          product: sourceBatch.product,
          batchNumber: sourceBatch.batchNumber,
          location: toLocation
        },
        null,
        opts
      );

      let isDestNew = false;
      let originalDestQuantity = 0;

      if (destBatch) {
        originalDestQuantity = destBatch.quantity;
        destBatch.quantity += numQty;
        await destBatch.save(opts);
      } else {
        isDestNew = true;
        const createdDest = await Batch.create(
          [
            {
              product: sourceBatch.product,
              batchNumber: sourceBatch.batchNumber,
              manufacturingDate: sourceBatch.manufacturingDate,
              expiryDate: sourceBatch.expiryDate,
              quantity: numQty,
              supplier: sourceBatch.supplier,
              location: toLocation
            }
          ],
          opts
        );
        destBatch = createdDest[0];
      }

      try {
        const [movement] = await StockMovement.create(
          [
            {
              product: sourceBatch.product,
              batch: sourceBatch._id,
              type: 'TRANSFER',
              quantity: numQty,
              fromLocation,
              toLocation,
              user: req.user._id,
              reason: reason ? reason.trim() : 'Stock Transfer'
            }
          ],
          opts
        );

        return { sourceBatch, destBatch, movement };
      } catch (movementError) {
        // Rollback for standalone MongoDB if session is null
        if (!session) {
          sourceBatch.quantity = originalSourceQuantity;
          await sourceBatch.save();

          if (isDestNew) {
            await Batch.findByIdAndDelete(destBatch._id);
          } else {
            destBatch.quantity = originalDestQuantity;
            await destBatch.save();
          }
        }
        throw movementError;
      }
    });

    res.status(200).json({
      success: true,
      message: 'Stock transfer completed successfully',
      data: {
        sourceBatch: {
          id: result.sourceBatch._id,
          location: fromLocation,
          remainingQuantity: result.sourceBatch.quantity
        },
        destinationBatch: {
          id: result.destBatch._id,
          location: toLocation,
          newQuantity: result.destBatch.quantity
        },
        movement: {
          id: result.movement._id,
          type: result.movement.type,
          quantity: result.movement.quantity,
          createdAt: result.movement.createdAt
        }
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        available: error.available,
        requested: error.requested
      });
    }
    next(error);
  }
};

/**
 * @desc    Get Stock Movement history with filters and pagination
 * @route   GET /api/stock/movements
 * @access  Private (Staff & Admin)
 */
const getStockMovements = async (req, res, next) => {
  try {
    const { product, location, type, startDate, endDate } = req.query;
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
      filter.$or = [{ fromLocation: location }, { toLocation: location }];
    }

    if (type) {
      const validTypes = ['STOCK_IN', 'STOCK_OUT', 'TRANSFER'];
      if (!validTypes.includes(type.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid movement type. Allowed types: ${validTypes.join(', ')}`
        });
      }
      filter.type = type.toUpperCase();
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          filter.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
    }

    const total = await StockMovement.countDocuments(filter);
    const movements = await StockMovement.find(filter)
      .populate('product', 'productName SKU unitPrice')
      .populate('batch', 'batchNumber manufacturingDate expiryDate')
      .populate('fromLocation', 'name city state')
      .populate('toLocation', 'name city state')
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Stock movements retrieved successfully',
      data: movements,
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

module.exports = {
  stockIn,
  stockOut,
  stockTransfer,
  getStockMovements
};

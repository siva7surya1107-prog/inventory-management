const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const Location = require('../models/Location');

/**
 * Helper to calculate dynamic inventory status
 * Rules:
 * quantity === 0 -> OUT_OF_STOCK
 * quantity > 0 && quantity <= reorderLevel -> LOW_STOCK
 * quantity > reorderLevel -> IN_STOCK
 */
const calculateStatus = (quantity, reorderLevel) => {
  if (quantity === 0) return 'OUT_OF_STOCK';
  if (quantity <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
};

/**
 * Standardize inventory item output format
 */
const formatInventoryItem = (batch) => {
  const reorderLevel = batch.product && typeof batch.product.reorderLevel === 'number'
    ? batch.product.reorderLevel
    : 0;

  return {
    _id: batch._id,
    product: batch.product,
    SKU: batch.product ? batch.product.SKU : '',
    batchNumber: batch.batchNumber,
    location: batch.location,
    quantity: batch.quantity,
    reorderLevel,
    expiryDate: batch.expiryDate,
    status: calculateStatus(batch.quantity, reorderLevel)
  };
};

/**
 * @desc    Get overall inventory list with dynamic statuses, filters, and pagination
 * @route   GET /api/inventory
 * @access  Private (Staff & Admin)
 */
const getInventory = async (req, res, next) => {
  try {
    const { product, location, status, search } = req.query;
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

    // Query batches and populate product & location
    let batches = await Batch.find(filter)
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('location', 'name city state')
      .sort({ createdAt: -1 });

    // Optional text search across product name or SKU or batchNumber
    if (search) {
      const q = search.trim().toLowerCase();
      batches = batches.filter((b) => {
        const prodName = b.product ? b.product.productName.toLowerCase() : '';
        const sku = b.product ? b.product.SKU.toLowerCase() : '';
        const bNum = b.batchNumber.toLowerCase();
        return prodName.includes(q) || sku.includes(q) || bNum.includes(q);
      });
    }

    // Map each batch to the inventory format with computed status
    let inventoryItems = batches.map(formatInventoryItem);

    // Filter by calculated status if specified
    if (status) {
      const targetStatus = status.trim().toUpperCase();
      inventoryItems = inventoryItems.filter((item) => item.status === targetStatus);
    }

    const total = inventoryItems.length;
    const paginatedItems = inventoryItems.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      message: 'Inventory retrieved successfully',
      data: paginatedItems,
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
 * @desc    Get low stock items (quantity > 0 AND quantity <= reorderLevel)
 * @route   GET /api/inventory/low-stock
 * @access  Private (Staff & Admin)
 */
const getLowStock = async (req, res, next) => {
  try {
    const batches = await Batch.find({ quantity: { $gt: 0 } })
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('location', 'name city state');

    const lowStockItems = batches
      .map(formatInventoryItem)
      .filter((item) => item.status === 'LOW_STOCK');

    res.status(200).json({
      success: true,
      message: 'Low stock inventory retrieved successfully',
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get out-of-stock items (quantity === 0)
 * @route   GET /api/inventory/out-of-stock
 * @access  Private (Staff & Admin)
 */
const getOutOfStock = async (req, res, next) => {
  try {
    const batches = await Batch.find({ quantity: 0 })
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('location', 'name city state');

    const outOfStockItems = batches.map(formatInventoryItem);

    res.status(200).json({
      success: true,
      message: 'Out of stock inventory retrieved successfully',
      count: outOfStockItems.length,
      data: outOfStockItems
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory belonging to a specific location
 * @route   GET /api/inventory/location/:locationId
 * @access  Private (Staff & Admin)
 */
const getLocationInventory = async (req, res, next) => {
  try {
    const { locationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ success: false, message: 'Invalid location ID format' });
    }

    const locationDoc = await Location.findById(locationId);
    if (!locationDoc) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const batches = await Batch.find({ location: locationId })
      .populate('product', 'productName SKU category unitPrice reorderLevel')
      .populate('location', 'name city state');

    const items = batches.map((batch) => ({
      _id: batch._id,
      product: batch.product,
      SKU: batch.product ? batch.product.SKU : '',
      batch: {
        _id: batch._id,
        batchNumber: batch.batchNumber,
        manufacturingDate: batch.manufacturingDate,
        expiryDate: batch.expiryDate
      },
      quantity: batch.quantity,
      reorderLevel: batch.product ? batch.product.reorderLevel : 0,
      expiry: batch.expiryDate,
      status: calculateStatus(batch.quantity, batch.product ? batch.product.reorderLevel : 0)
    }));

    res.status(200).json({
      success: true,
      message: `Inventory for location ${locationDoc.name} retrieved successfully`,
      location: {
        id: locationDoc._id,
        name: locationDoc.name,
        city: locationDoc.city,
        state: locationDoc.state
      },
      count: items.length,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all batches and locations for a selected product
 * @route   GET /api/inventory/product/:productId
 * @access  Private (Staff & Admin)
 */
const getProductInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const productDoc = await Product.findById(productId);
    if (!productDoc) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const batches = await Batch.find({ product: productId })
      .populate('location', 'name city state')
      .populate('supplier', 'name companyName');

    const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);

    const batchBreakdown = batches.map((batch) => ({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      location: batch.location,
      supplier: batch.supplier,
      manufacturingDate: batch.manufacturingDate,
      expiryDate: batch.expiryDate,
      status: calculateStatus(batch.quantity, productDoc.reorderLevel)
    }));

    res.status(200).json({
      success: true,
      message: `Inventory for product ${productDoc.productName} retrieved successfully`,
      data: {
        product: {
          id: productDoc._id,
          productName: productDoc.productName,
          SKU: productDoc.SKU,
          reorderLevel: productDoc.reorderLevel,
          unitPrice: productDoc.unitPrice
        },
        totalStock,
        overallStatus: calculateStatus(totalStock, productDoc.reorderLevel),
        batches: batchBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get expiry detection report (expired batches and batches expiring soon)
 * @route   GET /api/inventory/expiry
 * @access  Private (Staff & Admin)
 */
const getExpiryReport = async (req, res, next) => {
  try {
    const warningDays = parseInt(process.env.EXPIRY_WARNING_DAYS, 10) || 30;
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

    // 1. Expired Batches (expiryDate < current date)
    const expiredBatches = await Batch.find({ expiryDate: { $lt: now } })
      .populate('product', 'productName SKU')
      .populate('location', 'name city state')
      .populate('supplier', 'companyName name')
      .sort({ expiryDate: 1 });

    // 2. Batches Expiring Soon (current date <= expiryDate <= warningThreshold)
    const expiringSoonBatches = await Batch.find({
      expiryDate: { $gte: now, $lte: warningThreshold }
    })
      .populate('product', 'productName SKU')
      .populate('location', 'name city state')
      .populate('supplier', 'companyName name')
      .sort({ expiryDate: 1 });

    const formatBatchWithExpiry = (batch, expiryStatus) => ({
      _id: batch._id,
      batchNumber: batch.batchNumber,
      product: batch.product,
      location: batch.location,
      supplier: batch.supplier,
      quantity: batch.quantity,
      manufacturingDate: batch.manufacturingDate,
      expiryDate: batch.expiryDate,
      expiryStatus
    });

    res.status(200).json({
      success: true,
      message: 'Expiry detection report generated successfully',
      warningPeriodDays: warningDays,
      counts: {
        expired: expiredBatches.length,
        expiringSoon: expiringSoonBatches.length
      },
      data: {
        expired: expiredBatches.map((b) => formatBatchWithExpiry(b, 'EXPIRED')),
        expiringSoon: expiringSoonBatches.map((b) => formatBatchWithExpiry(b, 'EXPIRING_SOON'))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getLowStock,
  getOutOfStock,
  getLocationInventory,
  getProductInventory,
  getExpiryReport
};

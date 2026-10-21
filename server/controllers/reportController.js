const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Product = require('../models/Product');
const Location = require('../models/Location');
const Category = require('../models/Category');
const StockMovement = require('../models/StockMovement');

/**
 * Helper to calculate dynamic inventory status
 */
const calculateStatus = (quantity, reorderLevel) => {
  if (quantity === 0) return 'OUT_OF_STOCK';
  if (quantity <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
};

/**
 * @desc    Comprehensive Inventory Report with multi-field filtering and pagination
 * @route   GET /api/reports/inventory
 * @access  Private (Staff & Admin)
 */
const getInventoryReport = async (req, res, next) => {
  try {
    const { product, category, location, status, search } = req.query;
    const isExport = req.query.export === 'true';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = isExport ? 10000 : (parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    const filter = {};

    if (product && mongoose.Types.ObjectId.isValid(product)) {
      filter.product = product;
    }

    if (location && mongoose.Types.ObjectId.isValid(location)) {
      filter.location = location;
    }

    let batches = await Batch.find(filter)
      .populate({
        path: 'product',
        select: 'productName SKU category reorderLevel unitPrice',
        populate: { path: 'category', select: 'name' }
      })
      .populate('location', 'name city state')
      .populate('supplier', 'name companyName')
      .sort({ createdAt: -1 });

    // Filter by category if specified
    if (category) {
      batches = batches.filter((b) => {
        if (!b.product || !b.product.category) return false;
        const catId = b.product.category._id ? b.product.category._id.toString() : b.product.category.toString();
        const catName = b.product.category.name ? b.product.category.name.toLowerCase() : '';
        return catId === category || catName.includes(category.toLowerCase());
      });
    }

    // Filter by text search across Product Name, SKU, Batch Number, Location
    if (search) {
      const q = search.trim().toLowerCase();
      batches = batches.filter((b) => {
        const prodName = b.product ? b.product.productName.toLowerCase() : '';
        const sku = b.product ? b.product.SKU.toLowerCase() : '';
        const bNum = b.batchNumber.toLowerCase();
        const locName = b.location ? b.location.name.toLowerCase() : '';
        return prodName.includes(q) || sku.includes(q) || bNum.includes(q) || locName.includes(q);
      });
    }

    // Map to standardized report rows
    let reportData = batches.map((b) => {
      const reorderLevel = b.product && typeof b.product.reorderLevel === 'number'
        ? b.product.reorderLevel
        : 0;
      const computedStatus = calculateStatus(b.quantity, reorderLevel);

      return {
        _id: b._id,
        productId: b.product?._id,
        product: b.product?.productName || 'N/A',
        SKU: b.product?.SKU || 'N/A',
        category: b.product?.category?.name || 'Uncategorized',
        batchNumber: b.batchNumber,
        locationId: b.location?._id,
        location: b.location ? `${b.location.name} (${b.location.city})` : 'N/A',
        locationNameOnly: b.location?.name || 'N/A',
        quantity: b.quantity,
        reorderLevel,
        status: computedStatus,
        unitPrice: b.product?.unitPrice || 0,
        manufacturingDate: b.manufacturingDate,
        expiryDate: b.expiryDate
      };
    });

    // Filter by computed status if specified
    if (status) {
      const targetStatus = status.trim().toUpperCase();
      reportData = reportData.filter((item) => item.status === targetStatus);
    }

    const total = reportData.length;
    const paginatedData = isExport ? reportData : reportData.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      count: paginatedData.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1
      },
      data: paginatedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Low Stock Report (quantity > 0 AND quantity <= reorderLevel)
 * @route   GET /api/reports/low-stock
 * @access  Private (Staff & Admin)
 */
const getLowStockReport = async (req, res, next) => {
  try {
    const batches = await Batch.find({ quantity: { $gt: 0 } })
      .populate({
        path: 'product',
        select: 'productName SKU category reorderLevel unitPrice',
        populate: { path: 'category', select: 'name' }
      })
      .populate('location', 'name city state');

    const lowStockItems = batches
      .filter((b) => {
        const reorder = b.product ? b.product.reorderLevel : 0;
        return b.quantity <= reorder;
      })
      .map((b) => {
        const reorderLevel = b.product ? b.product.reorderLevel : 0;
        return {
          _id: b._id,
          product: b.product?.productName || 'N/A',
          SKU: b.product?.SKU || 'N/A',
          category: b.product?.category?.name || 'Uncategorized',
          location: b.location ? `${b.location.name} (${b.location.city})` : 'N/A',
          batchNumber: b.batchNumber,
          currentQuantity: b.quantity,
          reorderLevel,
          difference: reorderLevel - b.quantity,
          status: 'LOW_STOCK'
        };
      })
      .sort((a, b) => a.currentQuantity - b.currentQuantity);

    res.status(200).json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Out of Stock Report (quantity === 0)
 * @route   GET /api/reports/out-of-stock
 * @access  Private (Staff & Admin)
 */
const getOutOfStockReport = async (req, res, next) => {
  try {
    const batches = await Batch.find({ quantity: 0 })
      .populate({
        path: 'product',
        select: 'productName SKU category reorderLevel',
        populate: { path: 'category', select: 'name' }
      })
      .populate('location', 'name city state');

    const outOfStockItems = batches.map((b) => ({
      _id: b._id,
      product: b.product?.productName || 'N/A',
      SKU: b.product?.SKU || 'N/A',
      category: b.product?.category?.name || 'Uncategorized',
      batchNumber: b.batchNumber,
      location: b.location ? `${b.location.name} (${b.location.city})` : 'N/A',
      reorderLevel: b.product?.reorderLevel || 0,
      status: 'OUT_OF_STOCK'
    })).sort((a, b) => a.product.localeCompare(b.product));

    res.status(200).json({
      success: true,
      count: outOfStockItems.length,
      data: outOfStockItems
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Expiry Report (Expired and Expiring Soon batches)
 * @route   GET /api/reports/expiry
 * @access  Private (Staff & Admin)
 */
const getExpiryReport = async (req, res, next) => {
  try {
    const { status } = req.query; // 'expired', 'expiring_soon' or all
    const warningDays = parseInt(process.env.EXPIRY_WARNING_DAYS, 10) || 30;
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

    const batches = await Batch.find({
      expiryDate: { $lte: warningThreshold }
    })
      .populate('product', 'productName SKU')
      .populate('location', 'name city state')
      .sort({ expiryDate: 1 });

    let formattedBatches = batches.map((b) => ({
      _id: b._id,
      product: b.product?.productName || 'N/A',
      SKU: b.product?.SKU || 'N/A',
      batchNumber: b.batchNumber,
      location: b.location ? `${b.location.name} (${b.location.city})` : 'N/A',
      quantity: b.quantity,
      manufacturingDate: b.manufacturingDate,
      expiryDate: b.expiryDate,
      expiryStatus: new Date(b.expiryDate) < now ? 'EXPIRED' : 'EXPIRING_SOON'
    }));

    if (status) {
      const qStatus = status.trim().toUpperCase();
      formattedBatches = formattedBatches.filter((b) => b.expiryStatus === qStatus);
    }

    res.status(200).json({
      success: true,
      warningPeriodDays: warningDays,
      count: formattedBatches.length,
      data: formattedBatches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stock Movement Report with multi-field filtering and pagination
 * @route   GET /api/reports/stock-movements
 * @access  Private (Staff & Admin)
 */
const getStockMovementReport = async (req, res, next) => {
  try {
    const { product, location, type, user, startDate, endDate, search } = req.query;
    const isExport = req.query.export === 'true';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = isExport ? 10000 : (parseInt(req.query.limit, 10) || 15);
    const skip = (page - 1) * limit;

    const filter = {};

    if (product && mongoose.Types.ObjectId.isValid(product)) {
      filter.product = product;
    }

    if (location && mongoose.Types.ObjectId.isValid(location)) {
      filter.$or = [{ fromLocation: location }, { toLocation: location }];
    }

    if (type) {
      filter.type = type.toUpperCase();
    }

    if (user && mongoose.Types.ObjectId.isValid(user)) {
      filter.user = user;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) filter.createdAt.$gte = start;
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
    let movements = await StockMovement.find(filter)
      .populate('product', 'productName SKU')
      .populate('batch', 'batchNumber')
      .populate('fromLocation', 'name city state')
      .populate('toLocation', 'name city state')
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    // Optional text search filter
    if (search) {
      const q = search.trim().toLowerCase();
      movements = movements.filter((m) => {
        const pName = m.product ? m.product.productName.toLowerCase() : '';
        const sku = m.product ? m.product.SKU.toLowerCase() : '';
        const bNum = m.batch ? m.batch.batchNumber.toLowerCase() : '';
        const uName = m.user ? m.user.name.toLowerCase() : '';
        const reason = m.reason ? m.reason.toLowerCase() : '';
        return pName.includes(q) || sku.includes(q) || bNum.includes(q) || uName.includes(q) || reason.includes(q);
      });
    }

    const formattedMovements = movements.map((m) => ({
      _id: m._id,
      date: m.createdAt,
      product: m.product?.productName || 'N/A',
      SKU: m.product?.SKU || 'N/A',
      batch: m.batch?.batchNumber || '—',
      type: m.type,
      quantity: m.quantity,
      fromLocation: m.fromLocation ? `${m.fromLocation.name} (${m.fromLocation.city})` : '—',
      toLocation: m.toLocation ? `${m.toLocation.name} (${m.toLocation.city})` : '—',
      user: m.user?.name || 'System',
      userRole: m.user?.role || 'staff',
      reason: m.reason || '—'
    }));

    const paginatedMovements = isExport ? formattedMovements : formattedMovements.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      count: paginatedMovements.length,
      pagination: {
        page,
        limit,
        total: formattedMovements.length,
        pages: Math.ceil(formattedMovements.length / limit) || 1
      },
      data: paginatedMovements
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Location Inventory Report grouped by warehouse
 * @route   GET /api/reports/location-inventory
 * @access  Private (Staff & Admin)
 */
const getLocationInventoryReport = async (req, res, next) => {
  try {
    const locations = await Location.find().sort({ name: 1 });
    const batches = await Batch.find()
      .populate('product', 'productName SKU category reorderLevel unitPrice')
      .populate('location', 'name city state');

    const report = locations.map((loc) => {
      const locBatches = batches.filter(
        (b) => b.location && b.location._id.toString() === loc._id.toString()
      );

      const totalQuantity = locBatches.reduce((sum, b) => sum + b.quantity, 0);

      const uniqueProductIds = new Set(
        locBatches
          .filter((b) => b.product)
          .map((b) => b.product._id.toString())
      );

      let lowStockItems = 0;
      let outOfStockItems = 0;

      locBatches.forEach((b) => {
        const reorderLevel = b.product?.reorderLevel || 0;
        if (b.quantity === 0) outOfStockItems++;
        else if (b.quantity <= reorderLevel) lowStockItems++;
      });

      // Group product breakdown
      const productMap = {};
      locBatches.forEach((b) => {
        if (!b.product) return;
        const pid = b.product._id.toString();
        if (!productMap[pid]) {
          productMap[pid] = {
            productId: b.product._id,
            productName: b.product.productName,
            SKU: b.product.SKU,
            reorderLevel: b.product.reorderLevel,
            totalQuantity: 0,
            batchesCount: 0
          };
        }
        productMap[pid].totalQuantity += b.quantity;
        productMap[pid].batchesCount += 1;
      });

      return {
        locationId: loc._id,
        location: loc.name,
        city: loc.city,
        state: loc.state,
        status: loc.status,
        totalProducts: uniqueProductIds.size,
        totalQuantity,
        lowStockItems,
        outOfStockItems,
        products: Object.values(productMap)
      };
    });

    res.status(200).json({
      success: true,
      count: report.length,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventoryReport,
  getLowStockReport,
  getOutOfStockReport,
  getExpiryReport,
  getStockMovementReport,
  getLocationInventoryReport
};

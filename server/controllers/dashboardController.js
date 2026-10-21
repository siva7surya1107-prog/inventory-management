const mongoose = require('mongoose');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const Location = require('../models/Location');
const Supplier = require('../models/Supplier');
const Category = require('../models/Category');
const StockMovement = require('../models/StockMovement');

/**
 * @desc    Get aggregated dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private (Staff & Admin)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalProducts,
      totalLocations,
      totalSuppliers,
      totalCategories,
      totalBatches,
      inventoryQuantityAgg,
      outOfStockCount,
      lowStockAgg,
      movementTotalsAgg
    ] = await Promise.all([
      Product.countDocuments(),
      Location.countDocuments({ status: 'active' }),
      Supplier.countDocuments({ status: 'active' }),
      Category.countDocuments({ status: 'active' }),
      Batch.countDocuments(),

      // Total Inventory Quantity across all batches
      Batch.aggregate([
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]),

      // Out of Stock Batches (quantity === 0)
      Batch.countDocuments({ quantity: 0 }),

      // Low Stock Batches (quantity > 0 AND quantity <= product.reorderLevel)
      Batch.aggregate([
        { $match: { quantity: { $gt: 0 } } },
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productDoc'
          }
        },
        { $unwind: '$productDoc' },
        {
          $match: {
            $expr: { $lte: ['$quantity', '$productDoc.reorderLevel'] }
          }
        },
        { $count: 'lowStockCount' }
      ]),

      // Movement Totals by Type (STOCK_IN, STOCK_OUT, TRANSFER)
      StockMovement.aggregate([
        {
          $group: {
            _id: '$type',
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ])
    ]);

    const totalInventoryQuantity = inventoryQuantityAgg.length > 0
      ? inventoryQuantityAgg[0].totalQuantity
      : 0;

    const lowStockItems = lowStockAgg.length > 0
      ? lowStockAgg[0].lowStockCount
      : 0;

    // Map movement quantities
    const movements = {
      stockIn: 0,
      stockOut: 0,
      transfer: 0
    };

    movementTotalsAgg.forEach((item) => {
      if (item._id === 'STOCK_IN') movements.stockIn = item.totalQuantity;
      if (item._id === 'STOCK_OUT') movements.stockOut = item.totalQuantity;
      if (item._id === 'TRANSFER') movements.transfer = item.totalQuantity;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalInventoryQuantity,
          lowStockItems,
          outOfStockItems: outOfStockCount,
          totalLocations,
          totalSuppliers,
          totalCategories,
          totalBatches
        },
        movements
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get total inventory quantity grouped by location
 * @route   GET /api/dashboard/inventory-by-location
 * @access  Private (Staff & Admin)
 */
const getInventoryByLocation = async (req, res, next) => {
  try {
    const locations = await Location.find().sort({ name: 1 });

    const batchAggregation = await Batch.aggregate([
      {
        $group: {
          _id: '$location',
          quantity: { $sum: '$quantity' }
        }
      }
    ]);

    const batchMap = {};
    batchAggregation.forEach((item) => {
      if (item._id) {
        batchMap[item._id.toString()] = item.quantity;
      }
    });

    const result = locations.map((loc) => ({
      locationId: loc._id,
      location: loc.name,
      city: loc.city,
      state: loc.state,
      quantity: batchMap[loc._id.toString()] || 0
    })).sort((a, b) => b.quantity - a.quantity);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get daily stock movement analytics for 7, 30, or 90 days
 * @route   GET /api/dashboard/stock-movements
 * @access  Private (Staff & Admin)
 */
const getStockMovementAnalytics = async (req, res, next) => {
  try {
    const requestedPeriod = parseInt(req.query.period, 10);
    const validPeriods = [7, 30, 90];
    const days = validPeriods.includes(requestedPeriod) ? requestedPeriod : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const movementAgg = await StockMovement.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          totalQty: { $sum: '$quantity' }
        }
      }
    ]);

    // Build continuous date timeline so days with 0 movements are properly plotted
    const dailyMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = {
        date: dateStr,
        stockIn: 0,
        stockOut: 0,
        transfer: 0
      };
    }

    movementAgg.forEach((item) => {
      const dateStr = item._id.date;
      const type = item._id.type;
      if (dailyMap[dateStr]) {
        if (type === 'STOCK_IN') dailyMap[dateStr].stockIn = item.totalQty;
        else if (type === 'STOCK_OUT') dailyMap[dateStr].stockOut = item.totalQty;
        else if (type === 'TRANSFER') dailyMap[dateStr].transfer = item.totalQty;
      }
    });

    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const summary = dailyData.reduce(
      (acc, curr) => ({
        stockIn: acc.stockIn + curr.stockIn,
        stockOut: acc.stockOut + curr.stockOut,
        transfer: acc.transfer + curr.transfer
      }),
      { stockIn: 0, stockOut: 0, transfer: 0 }
    );

    res.status(200).json({
      success: true,
      period: days,
      summary,
      data: dailyData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get top low-stock products/batches sorted by lowest quantity
 * @route   GET /api/dashboard/low-stock
 * @access  Private (Staff & Admin)
 */
const getLowStockProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const lowStockItems = await Batch.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $match: {
          $expr: { $lte: ['$quantity', '$product.reorderLevel'] }
        }
      },
      {
        $lookup: {
          from: 'locations',
          localField: 'location',
          foreignField: '_id',
          as: 'location'
        }
      },
      { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          batchNumber: 1,
          productName: '$product.productName',
          SKU: '$product.SKU',
          currentQuantity: '$quantity',
          reorderLevel: '$product.reorderLevel',
          location: { $ifNull: ['$location.name', 'N/A'] },
          status: {
            $cond: {
              if: { $eq: ['$quantity', 0] },
              then: 'OUT_OF_STOCK',
              else: 'LOW_STOCK'
            }
          }
        }
      },
      { $sort: { currentQuantity: 1, productName: 1 } },
      { $limit: limit }
    ]);

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
 * @desc    Get expired and expiring soon batches
 * @route   GET /api/dashboard/expiring
 * @access  Private (Staff & Admin)
 */
const getExpiringBatches = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const warningDays = parseInt(process.env.EXPIRY_WARNING_DAYS, 10) || 30;
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + warningDays * 24 * 60 * 60 * 1000);

    const batches = await Batch.find({
      expiryDate: { $lte: warningThreshold }
    })
      .populate('product', 'productName SKU')
      .populate('location', 'name city')
      .sort({ expiryDate: 1 })
      .limit(limit);

    const formattedBatches = batches.map((b) => ({
      _id: b._id,
      product: b.product?.productName || 'N/A',
      SKU: b.product?.SKU || '',
      batchNumber: b.batchNumber,
      location: b.location?.name || 'N/A',
      quantity: b.quantity,
      expiryDate: b.expiryDate,
      expiryStatus: new Date(b.expiryDate) < now ? 'EXPIRED' : 'EXPIRING_SOON'
    }));

    res.status(200).json({
      success: true,
      count: formattedBatches.length,
      data: formattedBatches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get recent stock movements (latest 5-10 records)
 * @route   GET /api/dashboard/recent-movements
 * @access  Private (Staff & Admin)
 */
const getRecentMovements = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const movements = await StockMovement.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('product', 'productName SKU')
      .populate('batch', 'batchNumber')
      .populate('fromLocation', 'name city')
      .populate('toLocation', 'name city')
      .populate('user', 'name role');

    const formattedMovements = movements.map((m) => {
      let locationText = '—';
      if (m.type === 'STOCK_IN') {
        locationText = m.toLocation?.name || m.fromLocation?.name || '—';
      } else if (m.type === 'STOCK_OUT') {
        locationText = m.fromLocation?.name || '—';
      } else if (m.type === 'TRANSFER') {
        locationText = `${m.fromLocation?.name || '?'} → ${m.toLocation?.name || '?'}`;
      }

      return {
        _id: m._id,
        product: m.product?.productName || 'N/A',
        SKU: m.product?.SKU || '',
        batch: m.batch?.batchNumber || '—',
        type: m.type,
        quantity: m.quantity,
        location: locationText,
        user: m.user?.name || 'System',
        userRole: m.user?.role || 'staff',
        date: m.createdAt
      };
    });

    res.status(200).json({
      success: true,
      count: formattedMovements.length,
      data: formattedMovements
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getInventoryByLocation,
  getStockMovementAnalytics,
  getLowStockProducts,
  getExpiringBatches,
  getRecentMovements
};

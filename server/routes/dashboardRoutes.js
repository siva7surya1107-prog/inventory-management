const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getInventoryByLocation,
  getStockMovementAnalytics,
  getLowStockProducts,
  getExpiringBatches,
  getRecentMovements
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

// All dashboard endpoints require valid JWT authentication (Staff & Admin)
router.get('/stats', protect, getDashboardStats);
router.get('/inventory-by-location', protect, getInventoryByLocation);
router.get('/stock-movements', protect, getStockMovementAnalytics);
router.get('/low-stock', protect, getLowStockProducts);
router.get('/expiring', protect, getExpiringBatches);
router.get('/recent-movements', protect, getRecentMovements);

module.exports = router;

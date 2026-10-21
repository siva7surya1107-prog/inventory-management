const express = require('express');
const router = express.Router();
const {
  getInventoryReport,
  getLowStockReport,
  getOutOfStockReport,
  getExpiryReport,
  getStockMovementReport,
  getLocationInventoryReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// All report routes require valid authentication (Staff & Admin)
router.get('/inventory', protect, getInventoryReport);
router.get('/low-stock', protect, getLowStockReport);
router.get('/out-of-stock', protect, getOutOfStockReport);
router.get('/expiry', protect, getExpiryReport);
router.get('/stock-movements', protect, getStockMovementReport);
router.get('/location-inventory', protect, getLocationInventoryReport);

module.exports = router;

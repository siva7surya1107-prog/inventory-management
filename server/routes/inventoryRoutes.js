const express = require('express');
const router = express.Router();
const {
  getInventory,
  getLowStock,
  getOutOfStock,
  getLocationInventory,
  getProductInventory,
  getExpiryReport
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getInventory);
router.get('/low-stock', protect, getLowStock);
router.get('/out-of-stock', protect, getOutOfStock);
router.get('/expiry', protect, getExpiryReport);
router.get('/location/:locationId', protect, getLocationInventory);
router.get('/product/:productId', protect, getProductInventory);

module.exports = router;

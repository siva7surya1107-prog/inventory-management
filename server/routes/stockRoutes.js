const express = require('express');
const router = express.Router();
const {
  stockIn,
  stockOut,
  stockTransfer,
  getStockMovements
} = require('../controllers/stockController');
const { protect } = require('../middleware/authMiddleware');

router.post('/in', protect, stockIn);
router.post('/out', protect, stockOut);
router.post('/transfer', protect, stockTransfer);
router.get('/movements', protect, getStockMovements);

module.exports = router;

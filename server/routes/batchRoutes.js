const express = require('express');
const router = express.Router();
const {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch
} = require('../controllers/batchController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getBatches)
  .post(protect, authorizeRoles('admin'), createBatch);

router
  .route('/:id')
  .get(protect, getBatchById)
  .put(protect, authorizeRoles('admin'), updateBatch)
  .delete(protect, authorizeRoles('admin'), deleteBatch);

module.exports = router;

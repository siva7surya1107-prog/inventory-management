const express = require('express');
const router = express.Router();
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require('../controllers/supplierController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getSuppliers)
  .post(protect, authorizeRoles('admin'), createSupplier);

router
  .route('/:id')
  .get(protect, getSupplierById)
  .put(protect, authorizeRoles('admin'), updateSupplier)
  .delete(protect, authorizeRoles('admin'), deleteSupplier);

module.exports = router;

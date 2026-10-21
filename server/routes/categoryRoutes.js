const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getCategories)
  .post(protect, authorizeRoles('admin'), createCategory);

router
  .route('/:id')
  .get(protect, getCategoryById)
  .put(protect, authorizeRoles('admin'), updateCategory)
  .delete(protect, authorizeRoles('admin'), deleteCategory);

module.exports = router;

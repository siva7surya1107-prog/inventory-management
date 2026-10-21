const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Batch = require('../models/Batch');
const StockMovement = require('../models/StockMovement');

/**
 * @desc    Get all products with search, category filter, and pagination
 * @route   GET /api/products
 * @access  Private (Staff & Admin)
 */
const getProducts = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Search by product name or SKU (case-insensitive)
    if (search) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [{ productName: searchRegex }, { SKU: searchRegex }];
    }

    // Filter by Category ObjectId
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format for filtering'
        });
      }
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('category', 'name description status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: products,
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
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Private (Staff & Admin)
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id).populate('category', 'name description status');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = async (req, res, next) => {
  try {
    const { productName, SKU, description, category, unitPrice, reorderLevel } = req.body;

    // Validate required fields
    if (!productName || !SKU || !category || unitPrice === undefined || reorderLevel === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide productName, SKU, category, unitPrice, and reorderLevel'
      });
    }

    // Validate numbers
    if (Number(unitPrice) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Unit price cannot be negative'
      });
    }

    if (Number(reorderLevel) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Reorder level cannot be negative'
      });
    }

    // Validate category existence
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Referenced category does not exist'
      });
    }

    // Validate unique SKU
    const normalizedSKU = SKU.trim().toUpperCase();
    const existingSKU = await Product.findOne({ SKU: normalizedSKU });
    if (existingSKU) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    const product = await Product.create({
      productName: productName.trim(),
      SKU: normalizedSKU,
      description: description ? description.trim() : undefined,
      category,
      unitPrice: Number(unitPrice),
      reorderLevel: Number(reorderLevel)
    });

    const populatedProduct = await Product.findById(product._id).populate('category', 'name description status');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productName, SKU, description, category, unitPrice, reorderLevel } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (productName !== undefined) {
      if (!productName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Product name cannot be empty'
        });
      }
      product.productName = productName.trim();
    }

    if (SKU !== undefined) {
      const normalizedSKU = SKU.trim().toUpperCase();
      if (!normalizedSKU) {
        return res.status(400).json({
          success: false,
          message: 'SKU cannot be empty'
        });
      }
      const existingSKU = await Product.findOne({
        SKU: normalizedSKU,
        _id: { $ne: id }
      });
      if (existingSKU) {
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU already exists'
        });
      }
      product.SKU = normalizedSKU;
    }

    if (description !== undefined) {
      product.description = description ? description.trim() : '';
    }

    if (category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format'
        });
      }
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Referenced category does not exist'
        });
      }
      product.category = category;
    }

    if (unitPrice !== undefined) {
      if (Number(unitPrice) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Unit price cannot be negative'
        });
      }
      product.unitPrice = Number(unitPrice);
    }

    if (reorderLevel !== undefined) {
      if (Number(reorderLevel) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Reorder level cannot be negative'
        });
      }
      product.reorderLevel = Number(reorderLevel);
    }

    await product.save();
    const updatedProduct = await Product.findById(id).populate('category', 'name description status');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Relational Check: Verify product is not referenced by existing Batches or StockMovements
    const hasBatches = await Batch.exists({ product: id });
    if (hasBatches) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product: It is referenced by existing inventory batches.'
      });
    }

    const hasStockMovements = await StockMovement.exists({ product: id });
    if (hasStockMovements) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product: It is referenced by existing stock movement records.'
      });
    }

    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

const User = require('../models/User');

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      count: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers
};

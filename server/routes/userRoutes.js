const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Admin-only route to get all users
router.get('/', protect, authorizeRoles('admin'), getUsers);

module.exports = router;

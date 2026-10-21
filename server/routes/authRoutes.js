const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.post('/register', optionalProtect, register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;

const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token with minimal payload (userId, role)
 * @param {Object} payload - Object containing userId and role
 * @returns {string} - Signed JWT token
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  const expiresIn = process.env.JWT_EXPIRE || '7d';

  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role
    },
    secret,
    { expiresIn }
  );
};

/**
 * Verify a JWT token
 * @param {string} token - Signed JWT token
 * @returns {Object} - Decoded payload
 */
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  verifyToken
};

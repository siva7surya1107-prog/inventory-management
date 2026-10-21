const express = require('express');
const router = express.Router();
const {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/locationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getLocations)
  .post(protect, authorizeRoles('admin'), createLocation);

router
  .route('/:id')
  .get(protect, getLocationById)
  .put(protect, authorizeRoles('admin'), updateLocation)
  .delete(protect, authorizeRoles('admin'), deleteLocation);

module.exports = router;

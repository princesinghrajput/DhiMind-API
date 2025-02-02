const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth.middleware');
const upload = require('../../../config/multer.config');
const { 
  login,
  signup,
  getProfile,
  updateProfile,
  getCurrentUser
} = require('../controllers/user.controller');

// Public routes
router.post('/login', login);
router.post('/signup', signup);

// Protected routes
router.use(authMiddleware);
router.get('/profile', getProfile);
router.put('/profile', upload.single('avatar'), updateProfile);
router.get('/current', getCurrentUser);

module.exports = router; 
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth.middleware');
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  updateCount
} = require('../controllers/category.controller');

// All routes require authentication
router.use(authMiddleware);

// Category routes
router.post('/', createCategory);
router.get('/', getCategories);
router.get('/:id', getCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.patch('/:id/count', updateCount);

module.exports = router; 
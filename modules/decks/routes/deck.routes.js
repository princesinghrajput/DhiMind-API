const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth.middleware');
const {
  createDeck,
  getDecks,
  getDeck,
  updateDeck,
  deleteDeck,
  updateStats,
  getPublicDecks,
  getDeckAnalytics
} = require('../controllers/deck.controller');

// Public routes
router.get('/public', getPublicDecks);

// Protected routes
router.use(authMiddleware);
router.post('/', createDeck);
router.get('/', getDecks);
router.get('/:id', getDeck);
router.get('/:id/analytics', getDeckAnalytics);
router.put('/:id', updateDeck);
router.delete('/:id', deleteDeck);
router.patch('/:id/stats', updateStats);

module.exports = router; 
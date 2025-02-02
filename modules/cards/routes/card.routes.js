const express = require('express');
const router = express.Router();
const authMiddleware = require('../../../middleware/auth.middleware');
const {
  createCard,
  getDeckCards,
  getDueCards,
  updateCard,
  deleteCard,
  updateReview
} = require('../controllers/card.controller');

// All routes require authentication
router.use(authMiddleware);

// Create new card
router.post('/', createCard);

// Get all cards in a deck
router.get('/deck/:deckId', getDeckCards);

// Get due cards in a deck
router.get('/deck/:deckId/due', getDueCards);

// Update card
router.put('/:id', updateCard);

// Delete card
router.delete('/:id', deleteCard);

// Update card review status
router.patch('/:id/review', updateReview);

module.exports = router; 
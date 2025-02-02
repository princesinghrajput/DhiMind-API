const Card = require('../models/Card');
const Deck = require('../../decks/models/Deck');
const mongoose = require('mongoose');

// Create a new card
exports.createCard = async (req, res) => {
  try {
    const { front, back, deckId } = req.body;
    
    if (!front || !back || !deckId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const card = new Card({
      front,
      back,
      deck: deckId,
      user: req.user._id
    });

    await card.save();
    return res.status(201).json(card);
  } catch (error) {
    console.error('Error creating card:', error);
    return res.status(500).json({ error: 'Failed to create card' });
  }
};

// Get all cards in a deck
exports.getDeckCards = async (req, res) => {
  try {
    const { deckId } = req.params;
    const cards = await Card.find({ deck: deckId });
    return res.json(cards);
  } catch (error) {
    console.error('Error getting deck cards:', error);
    return res.status(500).json({ error: 'Failed to get deck cards' });
  }
};

// Get due cards for a deck
exports.getDueCards = async (req, res) => {
  try {
    const { deckId } = req.params;
    const dueCards = await Card.find({
      deck: deckId,
      nextReview: { $lte: new Date() }
    }).sort({ nextReview: 1 });
    return res.json(dueCards);
  } catch (error) {
    console.error('Error getting due cards:', error);
    return res.status(500).json({ error: 'Failed to get due cards' });
  }
};

// Update a card
exports.updateCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { front, back } = req.body;
    
    if (!front && !back) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (front) card.front = front;
    if (back) card.back = back;

    await card.save();
    return res.json(card);
  } catch (error) {
    console.error('Error updating card:', error);
    return res.status(500).json({ error: 'Failed to update card' });
  }
};

// Delete a card
exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await card.remove();
    return res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    return res.status(500).json({ error: 'Failed to delete card' });
  }
};

// Update card review status
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { quality, needsMorePractice, lastRating, ...reviewData } = req.body;

    if (typeof quality !== 'number' || quality < 0 || quality > 5) {
      return res.status(400).json({ error: 'Quality must be a number between 0 and 5' });
    }

    const card = await Card.findById(id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Update card with review data
    Object.assign(card, {
      ...reviewData,
      needsMorePractice,
      lastRating: quality
    });

    // Process the review using the quality score
    card.updateSpacedRepetition(quality);
    await card.save();

    return res.json(card);
  } catch (error) {
    console.error('Error updating review:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
};

// Get next card to review for a deck
exports.getNextReview = async (req, res) => {
  try {
    const { deckId } = req.params;
    
    const dueCards = await Card.getDueCards(deckId);
    
    if (!dueCards || dueCards.length === 0) {
      return res.json({ message: 'No cards due for review' });
    }

    return res.json(dueCards[0]);
  } catch (error) {
    console.error('Error getting next review:', error);
    return res.status(500).json({ error: 'Failed to get next review' });
  }
};

// Process a card review
exports.processReview = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { performance } = req.body;

    if (typeof performance !== 'number' || performance < 0 || performance > 5) {
      return res.status(400).json({ error: 'Performance must be a number between 0 and 5' });
    }

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await card.processReview(performance);

    // Get updated deck stats
    const deckStats = await Card.aggregate([
      { $match: { deckId: card.deckId } },
      {
        $group: {
          _id: null,
          totalCards: { $sum: 1 },
          dueCards: {
            $sum: {
              $cond: [
                { $lte: ['$nextReview', new Date()] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const retentionRate = await Card.getRetentionRate(card.deckId);

    return res.json({
      card,
      deckStats: {
        ...deckStats[0],
        retention: retentionRate
      }
    });
  } catch (error) {
    console.error('Error processing review:', error);
    return res.status(500).json({ error: 'Failed to process review' });
  }
};

// Get analytics for a deck
exports.getDeckAnalytics = async (req, res) => {
  try {
    const { deckId } = req.params;
    const { timeRange = 30 } = req.query;

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const cards = await Card.find({ deckId });
    const totalCards = cards.length;
    
    if (totalCards === 0) {
      return res.json({
        overview: {
          totalCards: 0,
          learningPace: 0,
          longestStreak: 0
        },
        performance: {
          avgEaseFactor: 2.5,
          retentionHistory: []
        },
        cardDistribution: {
          new: 0,
          learning: 0,
          review: 0,
          relearning: 0
        },
        nextReview: null
      });
    }

    // Calculate retention history
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    const retentionHistory = await Card.aggregate([
      { $match: { deckId: mongoose.Types.ObjectId(deckId) } },
      { $unwind: '$reviewHistory' },
      { $match: { 'reviewHistory.date': { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$reviewHistory.date'
            }
          },
          totalReviews: { $sum: 1 },
          successfulReviews: {
            $sum: {
              $cond: [
                { $gte: ['$reviewHistory.performance', 3] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          date: '$_id',
          retention: {
            $multiply: [
              { $divide: ['$successfulReviews', '$totalReviews'] },
              100
            ]
          }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Calculate card distribution
    const now = new Date();
    const cardDistribution = {
      new: cards.filter(card => !card.lastReviewed).length,
      learning: cards.filter(card => 
        card.lastReviewed && 
        card.repetitions <= 2 &&
        card.nextReview > now
      ).length,
      review: cards.filter(card => 
        card.repetitions > 2 &&
        card.nextReview > now
      ).length,
      relearning: cards.filter(card => 
        card.lastReviewed &&
        card.nextReview <= now
      ).length
    };

    // Calculate average ease factor
    const avgEaseFactor = cards.reduce((sum, card) => sum + card.easeFactor, 0) / totalCards;

    // Get next review
    const nextDueCard = await Card.findOne({
      deckId,
      nextReview: { $gt: now }
    }).sort({ nextReview: 1 });

    // Calculate learning pace (cards per day)
    const reviewsPerDay = cards.reduce((sum, card) => {
      const recentReviews = card.reviewHistory.filter(
        review => review.date >= startDate
      ).length;
      return sum + recentReviews;
    }, 0) / timeRange;

    // Calculate longest streak
    const streaks = [];
    let currentStreak = 0;
    let previousDate = null;

    const reviewDates = [...new Set(
      cards.flatMap(card => 
        card.reviewHistory
          .map(review => review.date.toISOString().split('T')[0])
      )
    )].sort();

    reviewDates.forEach(date => {
      if (!previousDate || 
          new Date(date) - new Date(previousDate) === 24 * 60 * 60 * 1000) {
        currentStreak++;
      } else {
        streaks.push(currentStreak);
        currentStreak = 1;
      }
      previousDate = date;
    });
    streaks.push(currentStreak);

    return res.json({
      overview: {
        totalCards,
        learningPace: Math.round(reviewsPerDay * 10) / 10,
        longestStreak: Math.max(...streaks, 0)
      },
      performance: {
        avgEaseFactor,
        retentionHistory
      },
      cardDistribution,
      nextReview: nextDueCard ? {
        date: nextDueCard.nextReview,
        cardsCount: await Card.countDocuments({
          deckId,
          nextReview: {
            $gte: nextDueCard.nextReview,
            $lt: new Date(nextDueCard.nextReview.getTime() + 24 * 60 * 60 * 1000)
          }
        })
      } : null
    });
  } catch (error) {
    console.error('Error getting deck analytics:', error);
    return res.status(500).json({ error: 'Failed to get deck analytics' });
  }
}; 
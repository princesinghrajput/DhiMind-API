const Deck = require('../models/Deck');
const Category = require('../../categories/models/Category');
const Card = require('../../cards/models/Card');
const mongoose = require('mongoose');

// Create new deck
exports.createDeck = async (req, res) => {
  try {
    const { title, description, category, isPublic } = req.body;
    
    // Check if category exists and belongs to user
    const categoryExists = await Category.findOne({
      _id: category,
      user: req.user._id
    });
    
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if deck with same title exists in the category
    const existingDeck = await Deck.findOne({
      title: title.trim(),
      category,
      user: req.user._id
    });

    if (existingDeck) {
      return res.status(400).json({ message: 'Deck already exists in this category' });
    }

    const deck = await Deck.create({
      title,
      description,
      category,
      isPublic,
      user: req.user._id
    });

    await deck.populate('category', 'title icon');
    res.status(201).json(deck);
  } catch (error) {
    console.error('Create deck error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all decks for a user
exports.getDecks = async (req, res) => {
  try {
    const { category } = req.query;
    const query = { user: req.user._id };
    
    if (category) {
      query.category = category;
    }

    const decks = await Deck.find(query)
      .populate('category', 'title icon')
      .sort({ createdAt: -1 });
    res.json(decks);
  } catch (error) {
    console.error('Get decks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get public decks
exports.getPublicDecks = async (req, res) => {
  try {
    const decks = await Deck.find({ isPublic: true })
      .populate('category', 'title icon')
      .populate('user', 'name')
      .sort({ totalCards: -1 });
    res.json(decks);
  } catch (error) {
    console.error('Get public decks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single deck
exports.getDeck = async (req, res) => {
  try {
    const deck = await Deck.findOne({
      _id: req.params.id,
      $or: [
        { user: req.user._id },
        { isPublic: true }
      ]
    }).populate('category', 'title icon');

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    res.json(deck);
  } catch (error) {
    console.error('Get deck error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update deck
exports.updateDeck = async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;
    const deck = await Deck.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    // Check if new title already exists in the same category
    if (title && title !== deck.title) {
      const existingDeck = await Deck.findOne({
        title: title.trim(),
        category: deck.category,
        user: req.user._id,
        _id: { $ne: deck._id }
      });

      if (existingDeck) {
        return res.status(400).json({ message: 'Deck with this title already exists in this category' });
      }
    }

    deck.title = title || deck.title;
    deck.description = description !== undefined ? description : deck.description;
    deck.isPublic = isPublic !== undefined ? isPublic : deck.isPublic;

    await deck.save();
    await deck.populate('category', 'title icon');
    res.json(deck);
  } catch (error) {
    console.error('Update deck error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete deck
exports.deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    await deck.deleteOne();
    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    console.error('Delete deck error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update deck stats
exports.updateStats = async (req, res) => {
  try {
    const { totalCards, dueCards, retention } = req.body;
    const deck = await Deck.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    if (totalCards !== undefined) deck.totalCards = totalCards;
    if (dueCards !== undefined) deck.dueCards = dueCards;
    if (retention !== undefined) deck.retention = retention;
    deck.lastStudied = new Date();

    await deck.save();
    await deck.populate('category', 'title icon');
    res.json(deck);
  } catch (error) {
    console.error('Update stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get deck analytics
exports.getDeckAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange } = req.query; // 'week', 'month', 'year', 'all'
    
    const deck = await Deck.findOne({
      _id: id,
      user: req.user._id
    });

    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch(timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0); // Beginning of time
    }

    // Get all cards in the deck
    const cards = await Card.find({ deck: id });
    
    // Calculate various metrics
    const totalCards = cards.length;
    const dueCards = cards.filter(card => new Date(card.nextReview) <= now).length;
    
    // Group cards by status
    const cardsByStatus = {
      new: cards.filter(card => card.status === 'new').length,
      learning: cards.filter(card => card.status === 'learning').length,
      review: cards.filter(card => card.status === 'review').length,
      relearning: cards.filter(card => card.status === 'relearning').length
    };

    // Calculate average ease factor
    const avgEaseFactor = cards.reduce((sum, card) => sum + (card.easeFactor || 2.5), 0) / Math.max(1, totalCards);

    // Calculate retention rate over time using aggregation
    const retentionHistory = await Card.aggregate([
      {
        $match: {
          deck: new mongoose.Types.ObjectId(id),
          lastReviewed: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$lastReviewed"
            }
          },
          totalReviews: { $sum: 1 },
          successfulReviews: {
            $sum: {
              $cond: [
                { $gte: ["$easeFactor", 2.5] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          date: "$_id",
          retention: {
            $multiply: [
              { $divide: ["$successfulReviews", "$totalReviews"] },
              100
            ]
          },
          totalReviews: 1
        }
      },
      { $sort: { date: 1 } }
    ]).exec();

    // Calculate study streaks
    const studyDates = [...new Set(retentionHistory.map(r => r.date))].sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    
    for (let i = 0; i < studyDates.length; i++) {
      const currentDate = new Date(studyDates[i]);
      const previousDate = i > 0 ? new Date(studyDates[i - 1]) : null;
      
      if (!previousDate || 
          (currentDate.getTime() - previousDate.getTime()) === 86400000) { // 1 day difference
        streak++;
        longestStreak = Math.max(longestStreak, streak);
        if (i === studyDates.length - 1 && 
            (now.getTime() - currentDate.getTime()) <= 86400000) {
          currentStreak = streak;
        }
      } else {
        streak = 1;
      }
    }

    // Calculate learning pace
    const learningPace = retentionHistory.reduce((sum, day) => sum + day.totalReviews, 0) / 
                        Math.max(1, retentionHistory.length);

    // Calculate total study time (based on average review time of 30 seconds per card)
    const totalReviews = retentionHistory.reduce((sum, day) => sum + day.totalReviews, 0);
    const totalStudyTimeMinutes = Math.round((totalReviews * 30) / 60);
    const studyHours = Math.floor(totalStudyTimeMinutes / 60);
    const studyMinutes = totalStudyTimeMinutes % 60;

    // Prepare response
    const analytics = {
      overview: {
        totalCards,
        dueCards,
        retention: deck.retention,
        currentStreak,
        longestStreak,
        learningPace: Math.round(learningPace),
        totalStudyTime: `${studyHours}h ${studyMinutes}m`
      },
      cardDistribution: cardsByStatus,
      performance: {
        avgEaseFactor: parseFloat(avgEaseFactor.toFixed(2)),
        retentionHistory: retentionHistory.map(h => ({
          ...h,
          retention: Math.round(h.retention || 0)
        }))
      },
      nextReview: deck.nextReviewInfo
    };

    res.json(analytics);
  } catch (error) {
    console.error('Get deck analytics error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
}; 
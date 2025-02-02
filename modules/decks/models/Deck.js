const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalCards: {
    type: Number,
    default: 0
  },
  lastStudied: {
    type: Date
  },
  dueCards: {
    type: Number,
    default: 0
  },
  retention: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  nextReviewInfo: {
    nextReview: Date,
    cardsCount: Number
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Method to return deck data
deckSchema.methods.toJSON = function() {
  const deck = this.toObject();
  return deck;
};

// Pre-save middleware to update category count
deckSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Category = mongoose.model('Category');
      const Deck = mongoose.model('Deck');
      
      // Get actual count of decks in this category
      const categoryDecks = await Deck.find({ category: this.category });
      const categoryCount = categoryDecks.length + 1; // +1 for the new deck being saved
      
      await Category.findByIdAndUpdate(this.category, {
        count: categoryCount
      });
    } catch (error) {
      console.error('Error updating category count:', error);
    }
  }
  next();
});

// Pre-remove middleware to update category count
deckSchema.pre('remove', async function(next) {
  try {
    const Category = mongoose.model('Category');
    const Deck = mongoose.model('Deck');
    
    // Get actual count of remaining decks in this category
    const categoryDecks = await Deck.find({ category: this.category });
    const categoryCount = Math.max(0, categoryDecks.length - 1); // -1 for the deck being removed
    
    await Category.findByIdAndUpdate(this.category, {
      count: categoryCount
    });
  } catch (error) {
    console.error('Error updating category count:', error);
  }
  next();
});

// Export the model
module.exports = mongoose.models.Deck || mongoose.model('Deck', deckSchema); 
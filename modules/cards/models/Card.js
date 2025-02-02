const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  front: {
    type: String,
    required: true,
    trim: true
  },
  back: {
    type: String,
    required: true,
    trim: true
  },
  deck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nextReview: {
    type: Date,
    default: Date.now
  },
  interval: {
    type: Number,
    default: 0 // Days until next review
  },
  easeFactor: {
    type: Number,
    default: 2.5 // Multiplier for spaced repetition
  },
  repetitions: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['new', 'learning', 'review', 'relearning'],
    default: 'new'
  },
  lastReviewed: {
    type: Date
  }
}, {
  timestamps: true
});

// Pre-save middleware to update deck's total cards count
cardSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Deck = mongoose.model('Deck');
      await Deck.findByIdAndUpdate(this.deck, {
        $inc: { totalCards: 1 }
      });
    } catch (error) {
      console.error('Error updating deck total cards:', error);
    }
  }
  next();
});

// Pre-remove middleware to update deck's total cards count
cardSchema.pre('remove', async function(next) {
  try {
    const Deck = mongoose.model('Deck');
    await Deck.findByIdAndUpdate(this.deck, {
      $inc: { totalCards: -1 }
    });
  } catch (error) {
    console.error('Error updating deck total cards:', error);
  }
  next();
});

// Method to calculate next review date based on SM-2 algorithm
cardSchema.methods.updateSpacedRepetition = function(quality) {
  // Quality: 0-5 rating of how well the card was remembered
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5');
  }

  if (quality < 3) {
    // Failed to recall, reset repetitions
    this.repetitions = 0;
    this.interval = 0;
    this.status = 'relearning';
  } else {
    // Successfully recalled
    if (this.repetitions === 0) {
      this.interval = 1;
      this.status = 'learning';
    } else if (this.repetitions === 1) {
      this.interval = 6;
      this.status = 'learning';
    } else {
      this.interval = Math.round(this.interval * this.easeFactor);
      this.status = 'review';
    }
    this.repetitions += 1;
  }

  // Update ease factor
  this.easeFactor = Math.max(1.3, this.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  
  // Set next review date
  this.nextReview = new Date(Date.now() + this.interval * 24 * 60 * 60 * 1000);
  this.lastReviewed = new Date();

  return this;
};

// Export the model
module.exports = mongoose.models.Card || mongoose.model('Card', cardSchema); 
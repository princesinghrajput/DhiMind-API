const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true,
    default: '📚'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Method to return category data
categorySchema.methods.toJSON = function() {
  const category = this.toObject();
  return category;
};

// Export the model
module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const dotenv = require('dotenv');
const authRoutes = require('./modules/auth/routes/auth.routes');
const categoryRoutes = require('./modules/categories/routes/category.routes');
const deckRoutes = require('./modules/decks/routes/deck.routes');
const cardRoutes = require('./modules/cards/routes/card.routes');
// Load environment variables
dotenv.config();

const app = express();

// Create uploads directory if it doesn't exist
const createUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, 'uploads/avatars');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
};
createUploadsDir();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper base URL
const BASE_URL = process.env.BASE_URL || 'http://192.168.1.3:5000';
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Update avatar URLs in responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    if (data && data.avatar && data.avatar.startsWith('/uploads')) {
      data.avatar = `${BASE_URL}${data.avatar}`;
    }
    return originalJson.call(this, data);
  };
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

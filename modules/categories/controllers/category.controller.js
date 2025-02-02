const Category = require('../models/Category');

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const { title, icon } = req.body;
    
    // Check if category already exists for this user
    const existingCategory = await Category.findOne({ 
      title: title.trim(),
      user: req.user._id 
    });
    
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({
      title,
      icon,
      user: req.user._id
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all categories for a user
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single category
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { title, icon } = req.body;
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if new title already exists in another category
    if (title && title !== category.title) {
      const existingCategory = await Category.findOne({
        title: title.trim(),
        user: req.user._id,
        _id: { $ne: category._id }
      });

      if (existingCategory) {
        return res.status(400).json({ message: 'Category with this title already exists' });
      }
    }

    category.title = title || category.title;
    category.icon = icon || category.icon;

    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.deleteOne();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update category count
exports.updateCount = async (req, res) => {
  try {
    const { count } = req.body;
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.count = count;
    await category.save();
    res.json(category);
  } catch (error) {
    console.error('Update count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 
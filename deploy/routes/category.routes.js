const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        category_name: { contains: search, mode: 'insensitive' }
      })
    };

    const [categories, total] = await Promise.all([
      req.prisma.category.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { category_name: 'asc' }
      }),
      req.prisma.category.count({ where })
    ]);

    res.json({
      success: true,
      data: categories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await req.prisma.category.findUnique({
      where: { category_id: parseInt(req.params.id) },
      include: { items: { where: { active: true } } }
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
});

// Create category
router.post('/',
  [body('category_name').trim().notEmpty().withMessage('Category name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const category = await req.prisma.category.create({
        data: req.body
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ success: false, message: 'Failed to create category' });
    }
  }
);

// Update category
router.put('/:id',
  [body('category_name').trim().notEmpty().withMessage('Category name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const category = await req.prisma.category.update({
        where: { category_id: parseInt(req.params.id) },
        data: req.body
      });

      res.json({
        success: true,
        data: category,
        message: 'Category updated successfully'
      });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ success: false, message: 'Failed to update category' });
    }
  }
);

// Delete category (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.category.update({
      where: { category_id: parseInt(req.params.id) },
      data: { active: false }
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

module.exports = router;

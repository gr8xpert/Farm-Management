const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all items with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        items_description: { contains: search, mode: 'insensitive' }
      }),
      ...(category_id && { category_id: parseInt(category_id) })
    };

    const [items, total] = await Promise.all([
      req.prisma.item.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: { category: true },
        orderBy: { created_on: 'desc' }
      }),
      req.prisma.item.count({ where })
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch items' });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await req.prisma.item.findUnique({
      where: { item_id: parseInt(req.params.id) },
      include: { category: true }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch item' });
  }
});

// Create item
router.post('/',
  [body('items_description').trim().notEmpty().withMessage('Item description is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const item = await req.prisma.item.create({
        data: {
          ...req.body,
          created_by: req.user.username
        },
        include: { category: true }
      });

      res.status(201).json({
        success: true,
        data: item,
        message: 'Item created successfully'
      });
    } catch (error) {
      console.error('Create item error:', error);
      res.status(500).json({ success: false, message: 'Failed to create item' });
    }
  }
);

// Update item
router.put('/:id',
  [body('items_description').trim().notEmpty().withMessage('Item description is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const item = await req.prisma.item.update({
        where: { item_id: parseInt(req.params.id) },
        data: req.body,
        include: { category: true }
      });

      res.json({
        success: true,
        data: item,
        message: 'Item updated successfully'
      });
    } catch (error) {
      console.error('Update item error:', error);
      res.status(500).json({ success: false, message: 'Failed to update item' });
    }
  }
);

// Delete item (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.item.update({
      where: { item_id: parseInt(req.params.id) },
      data: { active: false }
    });

    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete item' });
  }
});

module.exports = router;

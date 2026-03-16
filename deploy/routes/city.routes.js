const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all cities
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        city_name: { contains: search, mode: 'insensitive' }
      })
    };

    const [cities, total] = await Promise.all([
      req.prisma.city.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { city_name: 'asc' }
      }),
      req.prisma.city.count({ where })
    ]);

    res.json({
      success: true,
      data: cities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cities' });
  }
});

// Get single city
router.get('/:id', async (req, res) => {
  try {
    const city = await req.prisma.city.findUnique({
      where: { city_id: parseInt(req.params.id) }
    });

    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    res.json({ success: true, data: city });
  } catch (error) {
    console.error('Get city error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch city' });
  }
});

// Create city
router.post('/',
  [body('city_name').trim().notEmpty().withMessage('City name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const city = await req.prisma.city.create({
        data: req.body
      });

      res.status(201).json({
        success: true,
        data: city,
        message: 'City created successfully'
      });
    } catch (error) {
      console.error('Create city error:', error);
      res.status(500).json({ success: false, message: 'Failed to create city' });
    }
  }
);

// Update city
router.put('/:id',
  [body('city_name').trim().notEmpty().withMessage('City name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const city = await req.prisma.city.update({
        where: { city_id: parseInt(req.params.id) },
        data: req.body
      });

      res.json({
        success: true,
        data: city,
        message: 'City updated successfully'
      });
    } catch (error) {
      console.error('Update city error:', error);
      res.status(500).json({ success: false, message: 'Failed to update city' });
    }
  }
);

// Delete city (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.city.update({
      where: { city_id: parseInt(req.params.id) },
      data: { active: false }
    });

    res.json({ success: true, message: 'City deleted successfully' });
  } catch (error) {
    console.error('Delete city error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete city' });
  }
});

module.exports = router;

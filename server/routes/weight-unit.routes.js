const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all weight units
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        unit_name: { contains: search, mode: 'insensitive' }
      })
    };

    const [weightUnits, total] = await Promise.all([
      req.prisma.weightUnit.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { unit_name: 'asc' }
      }),
      req.prisma.weightUnit.count({ where })
    ]);

    res.json({
      success: true,
      data: weightUnits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get weight units error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weight units' });
  }
});

// Get single weight unit
router.get('/:id', async (req, res) => {
  try {
    const weightUnit = await req.prisma.weightUnit.findUnique({
      where: { unit_id: parseInt(req.params.id) }
    });

    if (!weightUnit) {
      return res.status(404).json({ success: false, message: 'Weight unit not found' });
    }

    res.json({ success: true, data: weightUnit });
  } catch (error) {
    console.error('Get weight unit error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weight unit' });
  }
});

// Create weight unit
router.post('/',
  [body('unit_name').trim().notEmpty().withMessage('Unit name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const weightUnit = await req.prisma.weightUnit.create({
        data: req.body
      });

      res.status(201).json({
        success: true,
        data: weightUnit,
        message: 'Weight unit created successfully'
      });
    } catch (error) {
      console.error('Create weight unit error:', error);
      res.status(500).json({ success: false, message: 'Failed to create weight unit' });
    }
  }
);

// Update weight unit
router.put('/:id',
  [body('unit_name').trim().notEmpty().withMessage('Unit name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const weightUnit = await req.prisma.weightUnit.update({
        where: { unit_id: parseInt(req.params.id) },
        data: req.body
      });

      res.json({
        success: true,
        data: weightUnit,
        message: 'Weight unit updated successfully'
      });
    } catch (error) {
      console.error('Update weight unit error:', error);
      res.status(500).json({ success: false, message: 'Failed to update weight unit' });
    }
  }
);

// Delete weight unit (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.weightUnit.update({
      where: { unit_id: parseInt(req.params.id) },
      data: { active: false }
    });

    res.json({ success: true, message: 'Weight unit deleted successfully' });
  } catch (error) {
    console.error('Delete weight unit error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete weight unit' });
  }
});

module.exports = router;

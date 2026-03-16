const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all banks
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        bank_name: { contains: search, mode: 'insensitive' }
      })
    };

    const [banks, total] = await Promise.all([
      req.prisma.bank.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { bank_name: 'asc' }
      }),
      req.prisma.bank.count({ where })
    ]);

    res.json({
      success: true,
      data: banks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get banks error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch banks' });
  }
});

// Get single bank
router.get('/:id', async (req, res) => {
  try {
    const bank = await req.prisma.bank.findUnique({
      where: { bank_id: parseInt(req.params.id) }
    });

    if (!bank) {
      return res.status(404).json({ success: false, message: 'Bank not found' });
    }

    res.json({ success: true, data: bank });
  } catch (error) {
    console.error('Get bank error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bank' });
  }
});

// Create bank
router.post('/',
  [body('bank_name').trim().notEmpty().withMessage('Bank name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const bank = await req.prisma.bank.create({
        data: {
          ...req.body,
          created_by: req.user.username
        }
      });

      res.status(201).json({
        success: true,
        data: bank,
        message: 'Bank created successfully'
      });
    } catch (error) {
      console.error('Create bank error:', error);
      res.status(500).json({ success: false, message: 'Failed to create bank' });
    }
  }
);

// Update bank
router.put('/:id',
  [body('bank_name').trim().notEmpty().withMessage('Bank name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const bank = await req.prisma.bank.update({
        where: { bank_id: parseInt(req.params.id) },
        data: req.body
      });

      res.json({
        success: true,
        data: bank,
        message: 'Bank updated successfully'
      });
    } catch (error) {
      console.error('Update bank error:', error);
      res.status(500).json({ success: false, message: 'Failed to update bank' });
    }
  }
);

// Delete bank (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.bank.update({
      where: { bank_id: parseInt(req.params.id) },
      data: { active: false }
    });

    res.json({ success: true, message: 'Bank deleted successfully' });
  } catch (error) {
    console.error('Delete bank error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete bank' });
  }
});

module.exports = router;

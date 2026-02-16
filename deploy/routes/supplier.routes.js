const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all suppliers with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        OR: [
          { supplier_name: { contains: search, mode: 'insensitive' } },
          { contact_person: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [suppliers, total] = await Promise.all([
      req.prisma.supplier.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_on: 'desc' }
      }),
      req.prisma.supplier.count({ where })
    ]);

    res.json({
      success: true,
      data: suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers' });
  }
});

// Get single supplier
router.get('/:id', async (req, res) => {
  try {
    const supplier = await req.prisma.supplier.findUnique({
      where: { supplier_id: parseInt(req.params.id) }
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch supplier' });
  }
});

// Create supplier
router.post('/',
  [
    body('supplier_name').trim().notEmpty().withMessage('Supplier name is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const supplier = await req.prisma.supplier.create({
        data: {
          ...req.body,
          created_by: req.user.username
        }
      });

      res.status(201).json({
        success: true,
        data: supplier,
        message: 'Supplier created successfully'
      });
    } catch (error) {
      console.error('Create supplier error:', error);
      res.status(500).json({ success: false, message: 'Failed to create supplier' });
    }
  }
);

// Update supplier
router.put('/:id',
  [
    body('supplier_name').trim().notEmpty().withMessage('Supplier name is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const supplier = await req.prisma.supplier.update({
        where: { supplier_id: parseInt(req.params.id) },
        data: req.body
      });

      res.json({
        success: true,
        data: supplier,
        message: 'Supplier updated successfully'
      });
    } catch (error) {
      console.error('Update supplier error:', error);
      res.status(500).json({ success: false, message: 'Failed to update supplier' });
    }
  }
);

// Delete supplier (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.supplier.update({
      where: { supplier_id: parseInt(req.params.id) },
      data: { active: false }
    });

    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete supplier' });
  }
});

module.exports = router;

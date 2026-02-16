const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all customers with pagination and search
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      active: true,
      ...(search && {
        OR: [
          { customer_name: { contains: search, mode: 'insensitive' } },
          { contact_person: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [customers, total] = await Promise.all([
      req.prisma.customer.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { created_on: 'desc' }
      }),
      req.prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await req.prisma.customer.findUnique({
      where: { customer_id: parseInt(req.params.id) }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer' });
  }
});

// Create customer
router.post('/',
  [body('customer_name').trim().notEmpty().withMessage('Customer name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const customer = await req.prisma.customer.create({
        data: {
          ...req.body,
          created_by: req.user.username
        }
      });

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully'
      });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ success: false, message: 'Failed to create customer' });
    }
  }
);

// Update customer
router.put('/:id',
  [body('customer_name').trim().notEmpty().withMessage('Customer name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const customer = await req.prisma.customer.update({
        where: { customer_id: parseInt(req.params.id) },
        data: req.body
      });

      res.json({
        success: true,
        data: customer,
        message: 'Customer updated successfully'
      });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({ success: false, message: 'Failed to update customer' });
    }
  }
);

// Delete customer (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.customer.update({
      where: { customer_id: parseInt(req.params.id) },
      data: { active: false }
    });

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete customer' });
  }
});

module.exports = router;

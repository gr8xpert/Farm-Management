const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all sales with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', customer_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(customer_id && { customer_id: parseInt(customer_id) }),
      ...(search && {
        OR: [
          { customer: { customer_name: { contains: search, mode: 'insensitive' } } },
          { remarks: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [sales, total] = await Promise.all([
      req.prisma.saleMaster.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          customer: { select: { customer_id: true, customer_name: true } },
          details: {
            include: {
              item: { select: { item_id: true, items_description: true } }
            }
          }
        },
        orderBy: { sale_date: 'desc' }
      }),
      req.prisma.saleMaster.count({ where })
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sales' });
  }
});

// Get single sale
router.get('/:id', async (req, res) => {
  try {
    const sale = await req.prisma.saleMaster.findUnique({
      where: { sale_id: parseInt(req.params.id) },
      include: {
        customer: true,
        details: {
          include: { item: true },
          orderBy: { sno: 'asc' }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sale' });
  }
});

// Create sale (master + details in transaction)
router.post('/',
  [
    body('customer_id').isInt().withMessage('Customer is required'),
    body('details').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('details.*.item_id').isInt().withMessage('Item ID is required'),
    body('details.*.qty').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
    body('details.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { customer_id, sale_date, remarks, ref_name, details } = req.body;

      const total_amount = details.reduce((sum, d) => sum + (parseFloat(d.qty) * parseFloat(d.price)), 0);

      const sale = await req.prisma.$transaction(async (prisma) => {
        // Create master
        const master = await prisma.saleMaster.create({
          data: {
            customer_id: parseInt(customer_id),
            sale_date: sale_date ? new Date(sale_date) : new Date(),
            remarks,
            ref_name,
            created_by: req.user.username,
            total_amount
          }
        });

        // Create details
        await prisma.saleDetail.createMany({
          data: details.map((d, index) => ({
            sale_id: master.sale_id,
            sno: index + 1,
            item_id: parseInt(d.item_id),
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            age: d.age ? parseInt(d.age) : null,
            weight: d.weight ? parseFloat(d.weight) : null,
            remarks: d.remarks
          }))
        });

        return prisma.saleMaster.findUnique({
          where: { sale_id: master.sale_id },
          include: {
            customer: true,
            details: { include: { item: true } }
          }
        });
      });

      res.status(201).json({
        success: true,
        data: sale,
        message: 'Sale created successfully'
      });
    } catch (error) {
      console.error('Create sale error:', error);
      res.status(500).json({ success: false, message: 'Failed to create sale' });
    }
  }
);

// Update sale
router.put('/:id',
  [
    body('customer_id').isInt().withMessage('Customer is required'),
    body('details').isArray({ min: 1 }).withMessage('At least one item is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const sale_id = parseInt(req.params.id);
      const { customer_id, sale_date, remarks, ref_name, details } = req.body;

      const total_amount = details.reduce((sum, d) => sum + (parseFloat(d.qty) * parseFloat(d.price)), 0);

      const sale = await req.prisma.$transaction(async (prisma) => {
        await prisma.saleMaster.update({
          where: { sale_id },
          data: {
            customer_id: parseInt(customer_id),
            sale_date: sale_date ? new Date(sale_date) : undefined,
            remarks,
            ref_name,
            total_amount
          }
        });

        await prisma.saleDetail.deleteMany({ where: { sale_id } });

        await prisma.saleDetail.createMany({
          data: details.map((d, index) => ({
            sale_id,
            sno: index + 1,
            item_id: parseInt(d.item_id),
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            age: d.age ? parseInt(d.age) : null,
            weight: d.weight ? parseFloat(d.weight) : null,
            remarks: d.remarks
          }))
        });

        return prisma.saleMaster.findUnique({
          where: { sale_id },
          include: {
            customer: true,
            details: { include: { item: true } }
          }
        });
      });

      res.json({
        success: true,
        data: sale,
        message: 'Sale updated successfully'
      });
    } catch (error) {
      console.error('Update sale error:', error);
      res.status(500).json({ success: false, message: 'Failed to update sale' });
    }
  }
);

// Delete sale
router.delete('/:id', async (req, res) => {
  try {
    const sale_id = parseInt(req.params.id);

    const returnCount = await req.prisma.saleReturnMaster.count({
      where: { sale_id }
    });

    if (returnCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete sale with existing returns'
      });
    }

    await req.prisma.$transaction(async (prisma) => {
      await prisma.saleDetail.deleteMany({ where: { sale_id } });
      await prisma.saleMaster.delete({ where: { sale_id } });
    });

    res.json({ success: true, message: 'Sale deleted successfully' });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sale' });
  }
});

module.exports = router;

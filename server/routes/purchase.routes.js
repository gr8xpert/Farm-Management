const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all purchases with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', supplier_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(supplier_id && { supplier_id: parseInt(supplier_id) }),
      ...(search && {
        OR: [
          { supplier: { supplier_name: { contains: search, mode: 'insensitive' } } },
          { remarks: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [purchases, total] = await Promise.all([
      req.prisma.purchaseMaster.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          supplier: { select: { supplier_id: true, supplier_name: true } },
          details: {
            include: {
              item: { select: { item_id: true, items_description: true } }
            }
          }
        },
        orderBy: { po_date: 'desc' }
      }),
      req.prisma.purchaseMaster.count({ where })
    ]);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchases' });
  }
});

// Get single purchase
router.get('/:id', async (req, res) => {
  try {
    const purchase = await req.prisma.purchaseMaster.findUnique({
      where: { po_no: parseInt(req.params.id) },
      include: {
        supplier: true,
        details: {
          include: { item: true },
          orderBy: { sno: 'asc' }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    res.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase' });
  }
});

// Create purchase (master + details in transaction)
router.post('/',
  [
    body('supplier_id').isInt().withMessage('Supplier is required'),
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

      const { supplier_id, po_date, remarks, ref_name, details } = req.body;

      // Calculate total amount
      const total_amount = details.reduce((sum, d) => sum + (parseFloat(d.qty) * parseFloat(d.price)), 0);

      const purchase = await req.prisma.$transaction(async (prisma) => {
        // Create master
        const master = await prisma.purchaseMaster.create({
          data: {
            supplier_id: parseInt(supplier_id),
            po_date: po_date ? new Date(po_date) : new Date(),
            remarks,
            ref_name,
            created_by: req.user.username,
            total_amount
          }
        });

        // Create details
        await prisma.purchaseDetail.createMany({
          data: details.map((d, index) => ({
            po_no: master.po_no,
            sno: index + 1,
            item_id: parseInt(d.item_id),
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            age: d.age ? parseInt(d.age) : null,
            weight: d.weight ? parseFloat(d.weight) : null,
            remarks: d.remarks
          }))
        });

        // Return with details
        return prisma.purchaseMaster.findUnique({
          where: { po_no: master.po_no },
          include: {
            supplier: true,
            details: { include: { item: true } }
          }
        });
      });

      res.status(201).json({
        success: true,
        data: purchase,
        message: 'Purchase created successfully'
      });
    } catch (error) {
      console.error('Create purchase error:', error);
      res.status(500).json({ success: false, message: 'Failed to create purchase' });
    }
  }
);

// Update purchase
router.put('/:id',
  [
    body('supplier_id').isInt().withMessage('Supplier is required'),
    body('details').isArray({ min: 1 }).withMessage('At least one item is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const po_no = parseInt(req.params.id);
      const { supplier_id, po_date, remarks, ref_name, details } = req.body;

      const total_amount = details.reduce((sum, d) => sum + (parseFloat(d.qty) * parseFloat(d.price)), 0);

      const purchase = await req.prisma.$transaction(async (prisma) => {
        // Update master
        await prisma.purchaseMaster.update({
          where: { po_no },
          data: {
            supplier_id: parseInt(supplier_id),
            po_date: po_date ? new Date(po_date) : undefined,
            remarks,
            ref_name,
            total_amount
          }
        });

        // Delete existing details
        await prisma.purchaseDetail.deleteMany({ where: { po_no } });

        // Create new details
        await prisma.purchaseDetail.createMany({
          data: details.map((d, index) => ({
            po_no,
            sno: index + 1,
            item_id: parseInt(d.item_id),
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            age: d.age ? parseInt(d.age) : null,
            weight: d.weight ? parseFloat(d.weight) : null,
            remarks: d.remarks
          }))
        });

        return prisma.purchaseMaster.findUnique({
          where: { po_no },
          include: {
            supplier: true,
            details: { include: { item: true } }
          }
        });
      });

      res.json({
        success: true,
        data: purchase,
        message: 'Purchase updated successfully'
      });
    } catch (error) {
      console.error('Update purchase error:', error);
      res.status(500).json({ success: false, message: 'Failed to update purchase' });
    }
  }
);

// Delete purchase
router.delete('/:id', async (req, res) => {
  try {
    const po_no = parseInt(req.params.id);

    // Check for returns
    const returnCount = await req.prisma.purchaseReturnMaster.count({
      where: { po_no }
    });

    if (returnCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete purchase with existing returns'
      });
    }

    await req.prisma.$transaction(async (prisma) => {
      await prisma.purchaseDetail.deleteMany({ where: { po_no } });
      await prisma.purchaseMaster.delete({ where: { po_no } });
    });

    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Delete purchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete purchase' });
  }
});

module.exports = router;

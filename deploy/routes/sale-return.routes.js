const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all sale returns
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, customer_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(customer_id && { customer_id: parseInt(customer_id) })
    };

    const [returns, total] = await Promise.all([
      req.prisma.saleReturnMaster.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          customer: { select: { customer_id: true, customer_name: true } },
          sale: { select: { sale_id: true, sale_date: true } },
          details: {
            include: {
              item: { select: { item_id: true, items_description: true } }
            }
          }
        },
        orderBy: { sr_date: 'desc' }
      }),
      req.prisma.saleReturnMaster.count({ where })
    ]);

    res.json({
      success: true,
      data: returns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get sale returns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sale returns' });
  }
});

// Get single sale return
router.get('/:id', async (req, res) => {
  try {
    const saleReturn = await req.prisma.saleReturnMaster.findUnique({
      where: { sr_no: parseInt(req.params.id) },
      include: {
        customer: true,
        sale: {
          include: {
            details: { include: { item: true } }
          }
        },
        details: {
          include: { item: true },
          orderBy: { sno: 'asc' }
        }
      }
    });

    if (!saleReturn) {
      return res.status(404).json({ success: false, message: 'Sale return not found' });
    }

    res.json({ success: true, data: saleReturn });
  } catch (error) {
    console.error('Get sale return error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sale return' });
  }
});

// Get sale details for return (helper endpoint)
router.get('/sale/:sale_id/details', async (req, res) => {
  try {
    const sale = await req.prisma.saleMaster.findUnique({
      where: { sale_id: parseInt(req.params.sale_id) },
      include: {
        customer: true,
        details: {
          include: { item: true }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    // Get existing returns for this sale
    const existingReturns = await req.prisma.saleReturnDetail.findMany({
      where: {
        return: { sale_id: parseInt(req.params.sale_id) }
      },
      select: { item_id: true, qty: true }
    });

    // Calculate returned quantities per item
    const returnedQty = {};
    existingReturns.forEach(r => {
      returnedQty[r.item_id] = (returnedQty[r.item_id] || 0) + parseFloat(r.qty);
    });

    // Add available qty to return
    const detailsWithAvailable = sale.details.map(d => ({
      ...d,
      returned_qty: returnedQty[d.item_id] || 0,
      available_qty: parseFloat(d.qty) - (returnedQty[d.item_id] || 0)
    }));

    res.json({
      success: true,
      data: {
        ...sale,
        details: detailsWithAvailable
      }
    });
  } catch (error) {
    console.error('Get sale details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sale details' });
  }
});

// Create sale return
router.post('/',
  [
    body('sale_id').isInt().withMessage('Sale is required'),
    body('reason').isIn(['STALE', 'DEFECTIVE', 'WRONG_ITEM', 'QUALITY_ISSUE', 'OTHER']).withMessage('Invalid reason'),
    body('details').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('details.*.item_id').isInt().withMessage('Item ID is required'),
    body('details.*.qty').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { sale_id, sr_date, reason, ref_name, details } = req.body;

      // Get sale to validate
      const sale = await req.prisma.saleMaster.findUnique({
        where: { sale_id: parseInt(sale_id) },
        include: { details: true }
      });

      if (!sale) {
        return res.status(404).json({ success: false, message: 'Sale not found' });
      }

      // Get existing returns
      const existingReturns = await req.prisma.saleReturnDetail.findMany({
        where: { return: { sale_id: parseInt(sale_id) } },
        select: { item_id: true, qty: true }
      });

      const returnedQty = {};
      existingReturns.forEach(r => {
        returnedQty[r.item_id] = (returnedQty[r.item_id] || 0) + parseFloat(r.qty);
      });

      // Validate return quantities
      for (const detail of details) {
        const saleDetail = sale.details.find(d => d.item_id === parseInt(detail.item_id));
        if (!saleDetail) {
          return res.status(400).json({
            success: false,
            message: `Item ${detail.item_id} not found in original sale`
          });
        }

        const availableQty = parseFloat(saleDetail.qty) - (returnedQty[detail.item_id] || 0);
        if (parseFloat(detail.qty) > availableQty) {
          return res.status(400).json({
            success: false,
            message: `Return quantity exceeds available quantity for item ${detail.item_id}`
          });
        }
      }

      const total_amount = details.reduce((sum, d) => sum + (parseFloat(d.qty) * parseFloat(d.price)), 0);

      const saleReturn = await req.prisma.$transaction(async (prisma) => {
        const master = await prisma.saleReturnMaster.create({
          data: {
            sale_id: parseInt(sale_id),
            customer_id: sale.customer_id,
            sr_date: sr_date ? new Date(sr_date) : new Date(),
            reason,
            ref_name,
            created_by: req.user.username,
            total_amount
          }
        });

        await prisma.saleReturnDetail.createMany({
          data: details.map((d, index) => ({
            sr_no: master.sr_no,
            sno: index + 1,
            item_id: parseInt(d.item_id),
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            age: d.age ? parseInt(d.age) : null,
            weight: d.weight ? parseFloat(d.weight) : null,
            remarks: d.remarks
          }))
        });

        return prisma.saleReturnMaster.findUnique({
          where: { sr_no: master.sr_no },
          include: {
            customer: true,
            sale: true,
            details: { include: { item: true } }
          }
        });
      });

      res.status(201).json({
        success: true,
        data: saleReturn,
        message: 'Sale return created successfully'
      });
    } catch (error) {
      console.error('Create sale return error:', error);
      res.status(500).json({ success: false, message: 'Failed to create sale return' });
    }
  }
);

// Delete sale return
router.delete('/:id', async (req, res) => {
  try {
    const sr_no = parseInt(req.params.id);

    await req.prisma.$transaction(async (prisma) => {
      await prisma.saleReturnDetail.deleteMany({ where: { sr_no } });
      await prisma.saleReturnMaster.delete({ where: { sr_no } });
    });

    res.json({ success: true, message: 'Sale return deleted successfully' });
  } catch (error) {
    console.error('Delete sale return error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete sale return' });
  }
});

module.exports = router;

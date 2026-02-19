const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all purchase returns
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, supplier_id } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(supplier_id && { supplier_id: parseInt(supplier_id) })
    };

    const [returns, total] = await Promise.all([
      req.prisma.purchaseReturnMaster.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          supplier: { select: { supplier_id: true, supplier_name: true } },
          purchase: { select: { po_no: true, po_date: true } },
          details: {
            include: {
              item: { select: { item_id: true, items_description: true } }
            }
          }
        },
        orderBy: { pr_date: 'desc' }
      }),
      req.prisma.purchaseReturnMaster.count({ where })
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
    console.error('Get purchase returns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase returns' });
  }
});

// Get single purchase return
router.get('/:id', async (req, res) => {
  try {
    const purchaseReturn = await req.prisma.purchaseReturnMaster.findUnique({
      where: { pr_no: parseInt(req.params.id) },
      include: {
        supplier: true,
        purchase: {
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

    if (!purchaseReturn) {
      return res.status(404).json({ success: false, message: 'Purchase return not found' });
    }

    res.json({ success: true, data: purchaseReturn });
  } catch (error) {
    console.error('Get purchase return error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase return' });
  }
});

// Get purchase details for return (helper endpoint)
router.get('/purchase/:po_no/details', async (req, res) => {
  try {
    const purchase = await req.prisma.purchaseMaster.findUnique({
      where: { po_no: parseInt(req.params.po_no) },
      include: {
        supplier: true,
        details: {
          include: { item: true }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Get existing returns for this purchase
    const existingReturns = await req.prisma.purchaseReturnDetail.findMany({
      where: {
        return: { po_no: parseInt(req.params.po_no) }
      },
      select: { item_id: true, qty: true }
    });

    // Calculate returned quantities per item
    const returnedQty = {};
    existingReturns.forEach(r => {
      returnedQty[r.item_id] = (returnedQty[r.item_id] || 0) + parseFloat(r.qty);
    });

    // Add available qty to return
    const detailsWithAvailable = purchase.details.map(d => ({
      ...d,
      returned_qty: returnedQty[d.item_id] || 0,
      available_qty: parseFloat(d.qty) - (returnedQty[d.item_id] || 0)
    }));

    res.json({
      success: true,
      data: {
        ...purchase,
        details: detailsWithAvailable
      }
    });
  } catch (error) {
    console.error('Get purchase details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchase details' });
  }
});

// Create purchase return
router.post('/',
  [
    body('po_no').isInt().withMessage('Purchase Order is required'),
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

      const { po_no, pr_date, reason, ref_name, details } = req.body;

      // Get purchase to validate
      const purchase = await req.prisma.purchaseMaster.findUnique({
        where: { po_no: parseInt(po_no) },
        include: { details: true }
      });

      if (!purchase) {
        return res.status(404).json({ success: false, message: 'Purchase not found' });
      }

      // Get existing returns
      const existingReturns = await req.prisma.purchaseReturnDetail.findMany({
        where: { return: { po_no: parseInt(po_no) } },
        select: { item_id: true, qty: true }
      });

      const returnedQty = {};
      existingReturns.forEach(r => {
        returnedQty[r.item_id] = (returnedQty[r.item_id] || 0) + parseFloat(r.qty);
      });

      // Validate return quantities
      for (const detail of details) {
        const purchaseDetail = purchase.details.find(d => d.item_id === parseInt(detail.item_id));
        if (!purchaseDetail) {
          return res.status(400).json({
            success: false,
            message: `Item ${detail.item_id} not found in original purchase`
          });
        }

        const availableQty = parseFloat(purchaseDetail.qty) - (returnedQty[detail.item_id] || 0);
        if (parseFloat(detail.qty) > availableQty) {
          return res.status(400).json({
            success: false,
            message: `Return quantity exceeds available quantity for item ${detail.item_id}`
          });
        }
      }

      const total_amount = details.reduce((sum, d) => sum + (parseFloat(d.qty) * parseFloat(d.price)), 0);

      const purchaseReturn = await req.prisma.$transaction(async (prisma) => {
        const master = await prisma.purchaseReturnMaster.create({
          data: {
            po_no: parseInt(po_no),
            supplier_id: purchase.supplier_id,
            pr_date: pr_date ? new Date(pr_date) : new Date(),
            reason,
            ref_name,
            created_by: req.user.username,
            total_amount
          }
        });

        await prisma.purchaseReturnDetail.createMany({
          data: details.map((d, index) => ({
            pr_no: master.pr_no,
            sno: index + 1,
            item_id: parseInt(d.item_id),
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            age: d.age ? parseInt(d.age) : null,
            weight: d.weight ? parseFloat(d.weight) : null,
            weight_unit: d.weight_unit || null,
            remarks: d.remarks
          }))
        });

        return prisma.purchaseReturnMaster.findUnique({
          where: { pr_no: master.pr_no },
          include: {
            supplier: true,
            purchase: true,
            details: { include: { item: true } }
          }
        });
      });

      res.status(201).json({
        success: true,
        data: purchaseReturn,
        message: 'Purchase return created successfully'
      });
    } catch (error) {
      console.error('Create purchase return error:', error);
      res.status(500).json({ success: false, message: 'Failed to create purchase return' });
    }
  }
);

// Delete purchase return
router.delete('/:id', async (req, res) => {
  try {
    const pr_no = parseInt(req.params.id);

    await req.prisma.$transaction(async (prisma) => {
      await prisma.purchaseReturnDetail.deleteMany({ where: { pr_no } });
      await prisma.purchaseReturnMaster.delete({ where: { pr_no } });
    });

    res.json({ success: true, message: 'Purchase return deleted successfully' });
  } catch (error) {
    console.error('Delete purchase return error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete purchase return' });
  }
});

module.exports = router;

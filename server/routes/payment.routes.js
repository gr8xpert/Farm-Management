const express = require('express');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get all payments with related data
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, payment_type, payment_mode } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(payment_type && { payment_type }),
      ...(payment_mode && { payment_mode })
    };

    const [payments, total] = await Promise.all([
      req.prisma.payment.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { payment_date: 'desc' },
        include: {
          bank: true,
          supplier: true,
          customer: true,
          purchase: true,
          sale: true
        }
      }),
      req.prisma.payment.count({ where })
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// Get single payment with related data
router.get('/:id', async (req, res) => {
  try {
    const payment = await req.prisma.payment.findUnique({
      where: { payment_id: parseInt(req.params.id) },
      include: {
        bank: true,
        supplier: true,
        customer: true,
        purchase: true,
        sale: true
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ success: true, data: payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment' });
  }
});

// Create payment
router.post('/',
  [
    body('payment_amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
    body('payment_mode').isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD']).withMessage('Invalid payment mode'),
    body('payment_type').isIn(['PAYMENT', 'RECEIPT', 'REFUND']).withMessage('Invalid payment type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        payment_amount,
        payment_mode,
        payment_type,
        bank_id,
        supplier_id,
        customer_id,
        po_no,
        sale_id,
        cheque_no,
        cheque_date,
        remarks
      } = req.body;

      const payment = await req.prisma.payment.create({
        data: {
          payment_amount: parseFloat(payment_amount),
          payment_mode,
          payment_type,
          bank_id: bank_id ? parseInt(bank_id) : null,
          supplier_id: supplier_id ? parseInt(supplier_id) : null,
          customer_id: customer_id ? parseInt(customer_id) : null,
          po_no: po_no ? parseInt(po_no) : null,
          sale_id: sale_id ? parseInt(sale_id) : null,
          cheque_no: cheque_no || null,
          cheque_date: cheque_date ? new Date(cheque_date) : null,
          remarks: remarks || null,
          created_by: req.user.username
        },
        include: {
          bank: true,
          supplier: true,
          customer: true,
          purchase: true,
          sale: true
        }
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment created successfully'
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({ success: false, message: 'Failed to create payment' });
    }
  }
);

// Update payment
router.put('/:id',
  [
    body('payment_amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
    body('payment_mode').isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'CARD']).withMessage('Invalid payment mode'),
    body('payment_type').isIn(['PAYMENT', 'RECEIPT', 'REFUND']).withMessage('Invalid payment type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        payment_amount,
        payment_mode,
        payment_type,
        bank_id,
        supplier_id,
        customer_id,
        po_no,
        sale_id,
        cheque_no,
        cheque_date,
        remarks
      } = req.body;

      const payment = await req.prisma.payment.update({
        where: { payment_id: parseInt(req.params.id) },
        data: {
          payment_amount: parseFloat(payment_amount),
          payment_mode,
          payment_type,
          bank_id: bank_id ? parseInt(bank_id) : null,
          supplier_id: supplier_id ? parseInt(supplier_id) : null,
          customer_id: customer_id ? parseInt(customer_id) : null,
          po_no: po_no ? parseInt(po_no) : null,
          sale_id: sale_id ? parseInt(sale_id) : null,
          cheque_no: cheque_no || null,
          cheque_date: cheque_date ? new Date(cheque_date) : null,
          remarks: remarks || null
        },
        include: {
          bank: true,
          supplier: true,
          customer: true,
          purchase: true,
          sale: true
        }
      });

      res.json({
        success: true,
        data: payment,
        message: 'Payment updated successfully'
      });
    } catch (error) {
      console.error('Update payment error:', error);
      res.status(500).json({ success: false, message: 'Failed to update payment' });
    }
  }
);

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.payment.delete({
      where: { payment_id: parseInt(req.params.id) }
    });

    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete payment' });
  }
});

module.exports = router;

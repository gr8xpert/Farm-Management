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
          sale: true,
          employee: true
        }
      }),
      req.prisma.payment.count({ where })
    ]);

    // Fetch attachments for all payments
    const paymentIds = payments.map(p => p.payment_id);
    const attachments = await req.prisma.attachment.findMany({
      where: {
        entity_type: 'PAYMENT',
        entity_id: { in: paymentIds }
      }
    });

    // Group attachments by payment_id
    const attachmentMap = {};
    attachments.forEach(att => {
      if (!attachmentMap[att.entity_id]) attachmentMap[att.entity_id] = [];
      attachmentMap[att.entity_id].push(att);
    });

    // Add images to each payment
    const paymentsWithImages = payments.map(p => ({
      ...p,
      images: attachmentMap[p.payment_id] || []
    }));

    res.json({
      success: true,
      data: paymentsWithImages,
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

// Get salary balance for an employee for a given month
router.get('/salary-balance/:employee_no/:year/:month', async (req, res) => {
  try {
    const { employee_no, year, month } = req.params;
    const empNo = parseInt(employee_no);
    const y = parseInt(year);
    const m = parseInt(month);

    const employee = await req.prisma.employee.findUnique({
      where: { employee_no: empNo }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 1);

    const payments = await req.prisma.payment.findMany({
      where: {
        employee_no: empNo,
        payment_type: 'SALARY',
        salary_month: {
          gte: startDate,
          lt: endDate
        }
      }
    });

    const advance_paid = payments
      .filter(p => p.salary_type === 'ADVANCE')
      .reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);

    const regular_paid = payments
      .filter(p => p.salary_type === 'REGULAR')
      .reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);

    const total_paid = advance_paid + regular_paid;
    const monthly_salary = employee.monthly_salary ? parseFloat(employee.monthly_salary) : 0;
    const remaining = monthly_salary - total_paid;

    res.json({
      success: true,
      data: { monthly_salary, advance_paid, regular_paid, total_paid, remaining }
    });
  } catch (error) {
    console.error('Get salary balance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch salary balance' });
  }
});

// Get single payment with related data
router.get('/:id', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id);
    const payment = await req.prisma.payment.findUnique({
      where: { payment_id: paymentId },
      include: {
        bank: true,
        supplier: true,
        customer: true,
        purchase: true,
        sale: true,
        employee: true
      }
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Fetch attachments
    const attachments = await req.prisma.attachment.findMany({
      where: {
        entity_type: 'PAYMENT',
        entity_id: paymentId
      }
    });

    res.json({ success: true, data: { ...payment, images: attachments } });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment' });
  }
});

// Create payment
router.post('/',
  [
    body('payment_amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
    body('payment_mode').isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE']).withMessage('Invalid payment mode'),
    body('payment_type').isIn(['PAYMENT', 'RECEIPT', 'REFUND', 'SALARY']).withMessage('Invalid payment type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        payment_date,
        payment_amount,
        payment_mode,
        payment_type,
        bank_id,
        supplier_id,
        customer_id,
        po_no,
        sale_id,
        employee_no,
        salary_month,
        salary_type,
        cheque_no,
        cheque_date,
        remarks,
        images
      } = req.body;

      const payment = await req.prisma.payment.create({
        data: {
          payment_date: payment_date ? new Date(payment_date) : new Date(),
          payment_amount: parseFloat(payment_amount),
          payment_mode,
          payment_type,
          bank_id: bank_id ? parseInt(bank_id) : null,
          supplier_id: supplier_id ? parseInt(supplier_id) : null,
          customer_id: customer_id ? parseInt(customer_id) : null,
          po_no: po_no ? parseInt(po_no) : null,
          sale_id: sale_id ? parseInt(sale_id) : null,
          employee_no: employee_no ? parseInt(employee_no) : null,
          salary_month: salary_month ? new Date(salary_month) : null,
          salary_type: salary_type || null,
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
          sale: true,
          employee: true
        }
      });

      // Save attachments
      if (images && images.length > 0) {
        await req.prisma.attachment.createMany({
          data: images.map(img => ({
            entity_type: 'PAYMENT',
            entity_id: payment.payment_id,
            file_path: img.file_path,
            original_name: img.original_name,
            mime_type: img.mime_type,
            file_size: img.file_size,
            created_by: req.user.username
          }))
        });
      }

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
    body('payment_mode').isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE']).withMessage('Invalid payment mode'),
    body('payment_type').isIn(['PAYMENT', 'RECEIPT', 'REFUND', 'SALARY']).withMessage('Invalid payment type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const paymentId = parseInt(req.params.id);
      const {
        payment_date,
        payment_amount,
        payment_mode,
        payment_type,
        bank_id,
        supplier_id,
        customer_id,
        po_no,
        sale_id,
        employee_no,
        salary_month,
        salary_type,
        cheque_no,
        cheque_date,
        remarks,
        images
      } = req.body;

      const payment = await req.prisma.payment.update({
        where: { payment_id: paymentId },
        data: {
          payment_date: payment_date ? new Date(payment_date) : new Date(),
          payment_amount: parseFloat(payment_amount),
          payment_mode,
          payment_type,
          bank_id: bank_id ? parseInt(bank_id) : null,
          supplier_id: supplier_id ? parseInt(supplier_id) : null,
          customer_id: customer_id ? parseInt(customer_id) : null,
          po_no: po_no ? parseInt(po_no) : null,
          sale_id: sale_id ? parseInt(sale_id) : null,
          employee_no: employee_no ? parseInt(employee_no) : null,
          salary_month: salary_month ? new Date(salary_month) : null,
          salary_type: salary_type || null,
          cheque_no: cheque_no || null,
          cheque_date: cheque_date ? new Date(cheque_date) : null,
          remarks: remarks || null
        },
        include: {
          bank: true,
          supplier: true,
          customer: true,
          purchase: true,
          sale: true,
          employee: true
        }
      });

      // Update attachments - delete old ones and insert new ones
      if (images !== undefined) {
        // Delete existing attachments
        await req.prisma.attachment.deleteMany({
          where: {
            entity_type: 'PAYMENT',
            entity_id: paymentId
          }
        });

        // Insert new attachments
        if (images && images.length > 0) {
          await req.prisma.attachment.createMany({
            data: images.map(img => ({
              entity_type: 'PAYMENT',
              entity_id: paymentId,
              file_path: img.file_path,
              original_name: img.original_name,
              mime_type: img.mime_type,
              file_size: img.file_size,
              created_by: req.user.username
            }))
          });
        }
      }

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
    const paymentId = parseInt(req.params.id);

    // Delete attachments first
    await req.prisma.attachment.deleteMany({
      where: {
        entity_type: 'PAYMENT',
        entity_id: paymentId
      }
    });

    await req.prisma.payment.delete({
      where: { payment_id: paymentId }
    });

    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete payment' });
  }
});

module.exports = router;

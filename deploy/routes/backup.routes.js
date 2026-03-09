const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Export all data as JSON backup
router.get('/export', async (req, res) => {
  try {
    const [
      suppliers,
      customers,
      categories,
      items,
      banks,
      employees,
      purchases,
      sales,
      payments,
      purchaseReturns,
      saleReturns
    ] = await Promise.all([
      req.prisma.supplier.findMany({ where: { active: true } }),
      req.prisma.customer.findMany({ where: { active: true } }),
      req.prisma.category.findMany({ where: { active: true } }),
      req.prisma.item.findMany({ where: { active: true } }),
      req.prisma.bank.findMany({ where: { active: true } }),
      req.prisma.employee.findMany({ where: { active: true } }),
      req.prisma.purchaseMaster.findMany({
        include: { supplier: true, details: { include: { item: true } } }
      }),
      req.prisma.saleMaster.findMany({
        include: { customer: true, details: { include: { item: true } } }
      }),
      req.prisma.payment.findMany({
        include: { supplier: true, customer: true, employee: true, bank: true }
      }),
      req.prisma.purchaseReturnMaster.findMany({
        include: { supplier: true, details: true }
      }),
      req.prisma.saleReturnMaster.findMany({
        include: { customer: true, details: true }
      })
    ]);

    const backup = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        suppliers,
        customers,
        categories,
        items,
        banks,
        employees,
        purchases,
        sales,
        payments,
        purchaseReturns,
        saleReturns
      },
      summary: {
        suppliers: suppliers.length,
        customers: customers.length,
        categories: categories.length,
        items: items.length,
        banks: banks.length,
        employees: employees.length,
        purchases: purchases.length,
        sales: sales.length,
        payments: payments.length,
        purchaseReturns: purchaseReturns.length,
        saleReturns: saleReturns.length
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=farm-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  } catch (error) {
    console.error('Backup export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export backup' });
  }
});

// Get backup stats
router.get('/stats', async (req, res) => {
  try {
    const [
      suppliers,
      customers,
      items,
      purchases,
      sales,
      payments
    ] = await Promise.all([
      req.prisma.supplier.count({ where: { active: true } }),
      req.prisma.customer.count({ where: { active: true } }),
      req.prisma.item.count({ where: { active: true } }),
      req.prisma.purchaseMaster.count(),
      req.prisma.saleMaster.count(),
      req.prisma.payment.count()
    ]);

    res.json({
      success: true,
      data: {
        suppliers,
        customers,
        items,
        purchases,
        sales,
        payments,
        totalRecords: suppliers + customers + items + purchases + sales + payments
      }
    });
  } catch (error) {
    console.error('Backup stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get backup stats' });
  }
});

module.exports = router;

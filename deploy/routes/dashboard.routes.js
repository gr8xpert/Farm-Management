const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      suppliersCount,
      customersCount,
      itemsCount,
      employeesCount,
      purchasesCount,
      salesCount,
      purchaseReturnsCount,
      saleReturnsCount
    ] = await Promise.all([
      req.prisma.supplier.count({ where: { active: true } }),
      req.prisma.customer.count({ where: { active: true } }),
      req.prisma.item.count({ where: { active: true } }),
      req.prisma.employee.count({ where: { active: true } }),
      req.prisma.purchaseMaster.count(),
      req.prisma.saleMaster.count(),
      req.prisma.purchaseReturnMaster.count(),
      req.prisma.saleReturnMaster.count()
    ]);

    res.json({
      success: true,
      data: {
        suppliers: suppliersCount,
        customers: customersCount,
        items: itemsCount,
        employees: employeesCount,
        purchases: purchasesCount,
        sales: salesCount,
        purchaseReturns: purchaseReturnsCount,
        saleReturns: saleReturnsCount
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// Get recent purchases
router.get('/recent-purchases', async (req, res) => {
  try {
    const purchases = await req.prisma.purchaseMaster.findMany({
      take: 5,
      include: {
        supplier: { select: { supplier_name: true } }
      },
      orderBy: { po_date: 'desc' }
    });

    res.json({ success: true, data: purchases });
  } catch (error) {
    console.error('Get recent purchases error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent purchases' });
  }
});

// Get recent sales
router.get('/recent-sales', async (req, res) => {
  try {
    const sales = await req.prisma.saleMaster.findMany({
      take: 5,
      include: {
        customer: { select: { customer_name: true } }
      },
      orderBy: { sale_date: 'desc' }
    });

    res.json({ success: true, data: sales });
  } catch (error) {
    console.error('Get recent sales error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent sales' });
  }
});

// Get monthly summary for charts
router.get('/monthly-summary', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);

    const [purchases, sales] = await Promise.all([
      req.prisma.purchaseMaster.findMany({
        where: {
          po_date: { gte: startDate, lte: endDate }
        },
        select: { po_date: true, total_amount: true }
      }),
      req.prisma.saleMaster.findMany({
        where: {
          sale_date: { gte: startDate, lte: endDate }
        },
        select: { sale_date: true, total_amount: true }
      })
    ]);

    // Group by month
    const monthlyData = Array(12).fill(null).map((_, i) => ({
      month: new Date(currentYear, i, 1).toLocaleString('default', { month: 'short' }),
      purchases: 0,
      sales: 0
    }));

    purchases.forEach(p => {
      const month = new Date(p.po_date).getMonth();
      monthlyData[month].purchases += parseFloat(p.total_amount || 0);
    });

    sales.forEach(s => {
      const month = new Date(s.sale_date).getMonth();
      monthlyData[month].sales += parseFloat(s.total_amount || 0);
    });

    res.json({ success: true, data: monthlyData });
  } catch (error) {
    console.error('Get monthly summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch monthly summary' });
  }
});

module.exports = router;

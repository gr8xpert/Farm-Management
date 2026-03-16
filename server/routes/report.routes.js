const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Sales Report
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, customerId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.sale_date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59')
      };
    }
    if (customerId) {
      where.customer_id = parseInt(customerId);
    }

    const sales = await req.prisma.saleMaster.findMany({
      where,
      include: {
        customer: true,
        details: { include: { item: true } }
      },
      orderBy: { sale_date: 'desc' }
    });

    // Calculate summary
    const total = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const itemCount = sales.reduce((sum, s) => sum + s.details.length, 0);

    // Top customers
    const customerTotals = {};
    sales.forEach(s => {
      const name = s.customer?.customer_name || 'Unknown';
      if (!customerTotals[name]) customerTotals[name] = 0;
      customerTotals[name] += parseFloat(s.total_amount || 0);
    });

    const topCustomers = Object.entries(customerTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        sales,
        summary: {
          total,
          count: sales.length,
          average: sales.length > 0 ? total / sales.length : 0,
          itemCount
        },
        topCustomers
      }
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate sales report' });
  }
});

// Purchase Report
router.get('/purchases', async (req, res) => {
  try {
    const { startDate, endDate, supplierId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.po_date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59')
      };
    }
    if (supplierId) {
      where.supplier_id = parseInt(supplierId);
    }

    const purchases = await req.prisma.purchaseMaster.findMany({
      where,
      include: {
        supplier: true,
        details: { include: { item: true } }
      },
      orderBy: { po_date: 'desc' }
    });

    // Calculate summary
    const total = purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
    const itemCount = purchases.reduce((sum, p) => sum + p.details.length, 0);

    // Top suppliers
    const supplierTotals = {};
    purchases.forEach(p => {
      const name = p.supplier?.supplier_name || 'Unknown';
      if (!supplierTotals[name]) supplierTotals[name] = 0;
      supplierTotals[name] += parseFloat(p.total_amount || 0);
    });

    const topSuppliers = Object.entries(supplierTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        purchases,
        summary: {
          total,
          count: purchases.length,
          average: purchases.length > 0 ? total / purchases.length : 0,
          itemCount
        },
        topSuppliers
      }
    });
  } catch (error) {
    console.error('Purchase report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate purchase report' });
  }
});

// Profit & Loss Report
router.get('/profit-loss', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(startDate);
      dateFilter.lte = new Date(endDate + 'T23:59:59');
    }

    // Get sales
    const sales = await req.prisma.saleMaster.findMany({
      where: startDate ? { sale_date: dateFilter } : {},
      select: { total_amount: true, sale_date: true }
    });

    // Get purchases
    const purchases = await req.prisma.purchaseMaster.findMany({
      where: startDate ? { po_date: dateFilter } : {},
      select: { total_amount: true, po_date: true }
    });

    // Get sale returns
    const saleReturns = await req.prisma.saleReturnMaster.findMany({
      where: startDate ? { sr_date: dateFilter } : {},
      select: { total_amount: true }
    });

    // Get purchase returns
    const purchaseReturns = await req.prisma.purchaseReturnMaster.findMany({
      where: startDate ? { pr_date: dateFilter } : {},
      select: { total_amount: true }
    });

    const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
    const totalSaleReturns = saleReturns.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
    const totalPurchaseReturns = purchaseReturns.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

    const netSales = totalSales - totalSaleReturns;
    const netPurchases = totalPurchases - totalPurchaseReturns;
    const grossProfit = netSales - netPurchases;

    // Monthly breakdown
    const monthlyData = {};
    sales.forEach(s => {
      const month = new Date(s.sale_date).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { month, sales: 0, purchases: 0 };
      monthlyData[month].sales += parseFloat(s.total_amount || 0);
    });
    purchases.forEach(p => {
      const month = new Date(p.po_date).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { month, sales: 0, purchases: 0 };
      monthlyData[month].purchases += parseFloat(p.total_amount || 0);
    });

    const monthlyTrend = Object.values(monthlyData).map(m => ({
      ...m,
      profit: m.sales - m.purchases
    }));

    res.json({
      success: true,
      data: {
        totalSales,
        totalPurchases,
        saleReturns: totalSaleReturns,
        purchaseReturns: totalPurchaseReturns,
        netSales,
        netPurchases,
        grossProfit,
        profitMargin: netSales > 0 ? (grossProfit / netSales * 100).toFixed(1) : 0,
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Profit/Loss report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate profit/loss report' });
  }
});

// Payment Report
router.get('/payments', async (req, res) => {
  try {
    const { startDate, endDate, paymentType } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.payment_date = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59')
      };
    }
    if (paymentType) where.payment_type = paymentType;

    const payments = await req.prisma.payment.findMany({
      where,
      include: {
        supplier: true,
        customer: true,
        employee: true,
        bank: true
      },
      orderBy: { payment_date: 'desc' }
    });

    // Summary by type
    const totalReceipts = payments.filter(p => p.payment_type === 'RECEIPT').reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
    const totalPayments = payments.filter(p => p.payment_type === 'PAYMENT').reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
    const totalSalaries = payments.filter(p => p.payment_type === 'SALARY').reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
    const totalRefunds = payments.filter(p => p.payment_type === 'REFUND').reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);

    // By type
    const byType = [
      { type: 'RECEIPT', total: totalReceipts, count: payments.filter(p => p.payment_type === 'RECEIPT').length },
      { type: 'PAYMENT', total: totalPayments, count: payments.filter(p => p.payment_type === 'PAYMENT').length },
      { type: 'SALARY', total: totalSalaries, count: payments.filter(p => p.payment_type === 'SALARY').length },
      { type: 'REFUND', total: totalRefunds, count: payments.filter(p => p.payment_type === 'REFUND').length }
    ].filter(t => t.count > 0);

    // By mode
    const modeGroups = {};
    payments.forEach(p => {
      if (!modeGroups[p.payment_mode]) modeGroups[p.payment_mode] = 0;
      modeGroups[p.payment_mode] += parseFloat(p.payment_amount);
    });
    const byMode = Object.entries(modeGroups).map(([mode, total]) => ({ mode, total }));

    res.json({
      success: true,
      data: {
        payments,
        summary: {
          totalReceipts,
          totalPayments,
          totalSalaries,
          totalRefunds,
          netFlow: totalReceipts - totalPayments - totalSalaries - totalRefunds
        },
        byType,
        byMode
      }
    });
  } catch (error) {
    console.error('Payment report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate payment report' });
  }
});

// Outstanding Balances
router.get('/outstanding', async (req, res) => {
  try {
    // Get all sales with their payments
    const sales = await req.prisma.saleMaster.findMany({
      include: {
        customer: true,
        payments: true
      }
    });

    // Get all purchases with their payments
    const purchases = await req.prisma.purchaseMaster.findMany({
      include: {
        supplier: true,
        payments: true
      }
    });

    // Get all supplier payments (including those not linked to specific PO)
    const supplierPayments = await req.prisma.payment.findMany({
      where: {
        payment_type: 'PAYMENT',
        supplier_id: { not: null }
      }
    });

    // Group supplier payments by supplier_id
    const supplierPaymentTotals = {};
    supplierPayments.forEach(p => {
      if (!supplierPaymentTotals[p.supplier_id]) {
        supplierPaymentTotals[p.supplier_id] = 0;
      }
      supplierPaymentTotals[p.supplier_id] += parseFloat(p.payment_amount);
    });

    // Group purchases by supplier and calculate totals
    const supplierPurchaseTotals = {};
    purchases.forEach(p => {
      if (!supplierPurchaseTotals[p.supplier_id]) {
        supplierPurchaseTotals[p.supplier_id] = { total: 0, supplier: p.supplier, purchases: [] };
      }
      supplierPurchaseTotals[p.supplier_id].total += parseFloat(p.total_amount || 0);
      supplierPurchaseTotals[p.supplier_id].purchases.push(p);
    });

    // Calculate receivables
    const receivables = [];
    let totalReceivables = 0;
    let overdueReceivables = 0;
    const receivableAging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    sales.forEach(s => {
      const totalPaid = s.payments.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
      const outstanding = parseFloat(s.total_amount || 0) - totalPaid;
      if (outstanding > 0) {
        const daysOutstanding = Math.floor((new Date() - new Date(s.sale_date)) / (1000 * 60 * 60 * 24));
        totalReceivables += outstanding;

        if (daysOutstanding <= 30) receivableAging['0-30'] += outstanding;
        else if (daysOutstanding <= 60) receivableAging['31-60'] += outstanding;
        else if (daysOutstanding <= 90) receivableAging['61-90'] += outstanding;
        else receivableAging['90+'] += outstanding;

        if (daysOutstanding > 30) overdueReceivables += outstanding;

        receivables.push({
          sale_id: s.sale_id,
          sale_date: s.sale_date,
          customer: s.customer,
          total: parseFloat(s.total_amount || 0),
          paid: totalPaid,
          outstanding,
          daysOutstanding
        });
      }
    });

    // Calculate payables at supplier level
    const payables = [];
    let totalPayables = 0;
    const payableAging = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    // Calculate outstanding per supplier (all purchases - all payments)
    Object.keys(supplierPurchaseTotals).forEach(supplierId => {
      const supplierData = supplierPurchaseTotals[supplierId];
      const totalPurchases = supplierData.total;
      const totalPaid = supplierPaymentTotals[supplierId] || 0;
      const outstanding = totalPurchases - totalPaid;

      if (outstanding > 0) {
        // Use oldest unpaid purchase date for aging
        const oldestPurchase = supplierData.purchases.reduce((oldest, p) => {
          return new Date(p.po_date) < new Date(oldest.po_date) ? p : oldest;
        });
        const daysOutstanding = Math.floor((new Date() - new Date(oldestPurchase.po_date)) / (1000 * 60 * 60 * 24));

        totalPayables += outstanding;

        if (daysOutstanding <= 30) payableAging['0-30'] += outstanding;
        else if (daysOutstanding <= 60) payableAging['31-60'] += outstanding;
        else if (daysOutstanding <= 90) payableAging['61-90'] += outstanding;
        else payableAging['90+'] += outstanding;

        payables.push({
          supplier_id: parseInt(supplierId),
          supplier: supplierData.supplier,
          total: totalPurchases,
          paid: totalPaid,
          outstanding,
          daysOutstanding,
          purchaseCount: supplierData.purchases.length
        });
      }
    });

    res.json({
      success: true,
      data: {
        receivables: receivables.sort((a, b) => b.outstanding - a.outstanding),
        payables: payables.sort((a, b) => b.outstanding - a.outstanding),
        receivableAging,
        payableAging,
        summary: {
          totalReceivables,
          totalPayables,
          overdueReceivables,
          netPosition: totalReceivables - totalPayables,
          receivableCount: receivables.length,
          payableCount: payables.length
        }
      }
    });
  } catch (error) {
    console.error('Outstanding report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate outstanding report' });
  }
});

// Stock Report
router.get('/stock', async (req, res) => {
  try {
    const { lowStock } = req.query;

    const where = { active: true };

    const items = await req.prisma.item.findMany({
      where,
      include: { category: true },
      orderBy: { items_description: 'asc' }
    });

    let filteredItems = items;
    if (lowStock === 'true') {
      filteredItems = items.filter(i => parseFloat(i.stock_on_hand) <= parseFloat(i.reorder_level));
    }

    const lowStockItems = items.filter(i => parseFloat(i.stock_on_hand) <= parseFloat(i.reorder_level));
    const totalStock = items.reduce((sum, i) => sum + parseFloat(i.stock_on_hand || 0), 0);
    const stockValue = items.reduce((sum, i) => {
      return sum + (parseFloat(i.stock_on_hand || 0) * parseFloat(i.last_purchase_price || 0));
    }, 0);

    res.json({
      success: true,
      data: {
        items: filteredItems,
        lowStockItems,
        summary: {
          totalItems: items.length,
          totalStock,
          stockValue,
          lowStockCount: lowStockItems.length
        }
      }
    });
  } catch (error) {
    console.error('Stock report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate stock report' });
  }
});

// Supplier Ledger
router.get('/supplier-ledger/:id', async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);

    const supplier = await req.prisma.supplier.findUnique({
      where: { supplier_id: supplierId }
    });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const purchases = await req.prisma.purchaseMaster.findMany({
      where: { supplier_id: supplierId },
      orderBy: { po_date: 'asc' }
    });

    const payments = await req.prisma.payment.findMany({
      where: { supplier_id: supplierId, payment_type: 'PAYMENT' },
      orderBy: { payment_date: 'asc' }
    });

    const returns = await req.prisma.purchaseReturnMaster.findMany({
      where: { supplier_id: supplierId },
      orderBy: { pr_date: 'asc' }
    });

    const entries = [];

    purchases.forEach(p => {
      entries.push({
        date: p.po_date,
        type: 'PURCHASE',
        reference: `PO #${p.po_no}`,
        debit: parseFloat(p.total_amount || 0),
        credit: 0
      });
    });

    payments.forEach(p => {
      entries.push({
        date: p.payment_date,
        type: 'PAYMENT',
        reference: `Payment #${p.payment_id}`,
        debit: 0,
        credit: parseFloat(p.payment_amount)
      });
    });

    returns.forEach(r => {
      entries.push({
        date: r.pr_date,
        type: 'RETURN',
        reference: `Return #${r.pr_no}`,
        debit: 0,
        credit: parseFloat(r.total_amount || 0)
      });
    });

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    entries.forEach(e => {
      balance += e.debit - e.credit;
      e.balance = balance;
    });

    res.json({
      success: true,
      data: {
        supplier,
        entries,
        summary: {
          totalDebit: entries.reduce((sum, e) => sum + e.debit, 0),
          totalCredit: entries.reduce((sum, e) => sum + e.credit, 0),
          closingBalance: balance
        }
      }
    });
  } catch (error) {
    console.error('Supplier ledger error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate supplier ledger' });
  }
});

// Customer Ledger
router.get('/customer-ledger/:id', async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);

    const customer = await req.prisma.customer.findUnique({
      where: { customer_id: customerId }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const sales = await req.prisma.saleMaster.findMany({
      where: { customer_id: customerId },
      orderBy: { sale_date: 'asc' }
    });

    const payments = await req.prisma.payment.findMany({
      where: { customer_id: customerId, payment_type: 'RECEIPT' },
      orderBy: { payment_date: 'asc' }
    });

    const returns = await req.prisma.saleReturnMaster.findMany({
      where: { customer_id: customerId },
      orderBy: { sr_date: 'asc' }
    });

    const entries = [];

    sales.forEach(s => {
      entries.push({
        date: s.sale_date,
        type: 'SALE',
        reference: `Sale #${s.sale_id}`,
        debit: parseFloat(s.total_amount || 0),
        credit: 0
      });
    });

    payments.forEach(p => {
      entries.push({
        date: p.payment_date,
        type: 'RECEIPT',
        reference: `Receipt #${p.payment_id}`,
        debit: 0,
        credit: parseFloat(p.payment_amount)
      });
    });

    returns.forEach(r => {
      entries.push({
        date: r.sr_date,
        type: 'RETURN',
        reference: `Return #${r.sr_no}`,
        debit: 0,
        credit: parseFloat(r.total_amount || 0)
      });
    });

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    entries.forEach(e => {
      balance += e.debit - e.credit;
      e.balance = balance;
    });

    res.json({
      success: true,
      data: {
        customer,
        entries,
        summary: {
          totalDebit: entries.reduce((sum, e) => sum + e.debit, 0),
          totalCredit: entries.reduce((sum, e) => sum + e.credit, 0),
          closingBalance: balance
        }
      }
    });
  } catch (error) {
    console.error('Customer ledger error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate customer ledger' });
  }
});

// Get Invoice Data for a Sale
router.get('/invoice/:saleId', async (req, res) => {
  try {
    const saleId = parseInt(req.params.saleId);

    const sale = await req.prisma.saleMaster.findUnique({
      where: { sale_id: saleId },
      include: {
        customer: true,
        details: {
          include: { item: true }
        },
        payments: true
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const totalPaid = sale.payments.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
    const outstanding = parseFloat(sale.total_amount || 0) - totalPaid;

    res.json({
      success: true,
      data: {
        invoice: {
          invoiceNo: `INV-${sale.sale_id.toString().padStart(5, '0')}`,
          date: sale.sale_date,
          customer: sale.customer,
          items: sale.details.map((d, idx) => ({
            sno: idx + 1,
            description: d.item?.items_description,
            qty: parseFloat(d.qty),
            price: parseFloat(d.price),
            weight: d.weight ? parseFloat(d.weight) : null,
            weightUnit: d.weight_unit,
            amount: parseFloat(d.qty) * parseFloat(d.price)
          })),
          subtotal: parseFloat(sale.total_amount || 0),
          totalAmount: parseFloat(sale.total_amount || 0),
          totalPaid,
          outstanding,
          remarks: sale.remarks
        }
      }
    });
  } catch (error) {
    console.error('Invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
});

// Dashboard alerts data
router.get('/alerts', async (req, res) => {
  try {
    // Low stock items
    const allItems = await req.prisma.item.findMany({
      where: { active: true },
      select: { item_id: true, items_description: true, stock_on_hand: true, reorder_level: true }
    });
    const lowStockItems = allItems.filter(i =>
      parseFloat(i.stock_on_hand) <= parseFloat(i.reorder_level)
    );

    // Overdue payments (sales not fully paid after 30 days)
    const sales = await req.prisma.saleMaster.findMany({
      include: { customer: true, payments: true }
    });

    const overduePayments = [];
    sales.forEach(s => {
      const totalPaid = s.payments.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
      const outstanding = parseFloat(s.total_amount || 0) - totalPaid;
      const days = Math.floor((new Date() - new Date(s.sale_date)) / (1000 * 60 * 60 * 24));

      if (outstanding > 0 && days > 30) {
        overduePayments.push({
          sale_id: s.sale_id,
          customer: s.customer?.customer_name,
          amount: outstanding,
          days
        });
      }
    });

    res.json({
      success: true,
      data: {
        lowStock: lowStockItems.slice(0, 5),
        lowStockCount: lowStockItems.length,
        overduePayments: overduePayments.sort((a, b) => b.days - a.days).slice(0, 5),
        overdueCount: overduePayments.length,
        overdueTotal: overduePayments.reduce((sum, p) => sum + p.amount, 0)
      }
    });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get alerts' });
  }
});

module.exports = router;

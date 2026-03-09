const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a helpful AI assistant for a Farm Management System. You help the admin manage their farm business by answering questions about:
- Sales and purchases data
- Customer and supplier information
- Payment and outstanding balances
- Inventory and stock levels
- Employee information
- Business insights and recommendations

When answering questions:
1. Be concise and direct
2. Format numbers as currency (Rs.) when appropriate
3. Use bullet points for lists
4. If you don't have enough data to answer, say so clearly
5. Suggest related insights when relevant

You have access to the following data that will be provided in the user's message:
- Sales summary, purchases summary, payment summary
- Outstanding receivables and payables
- Recent transactions
- Stock levels

Current date: ${new Date().toLocaleDateString()}`;

// Get business context for AI
async function getBusinessContext(prisma) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get counts
  const [
    supplierCount,
    customerCount,
    itemCount,
    employeeCount
  ] = await Promise.all([
    prisma.supplier.count({ where: { active: true } }),
    prisma.customer.count({ where: { active: true } }),
    prisma.item.count({ where: { active: true } }),
    prisma.employee.count({ where: { active: true } })
  ]);

  // Get this month's sales
  const monthlySales = await prisma.saleMaster.aggregate({
    where: { sale_date: { gte: startOfMonth } },
    _sum: { total_amount: true },
    _count: true
  });

  // Get this month's purchases
  const monthlyPurchases = await prisma.purchaseMaster.aggregate({
    where: { po_date: { gte: startOfMonth } },
    _sum: { total_amount: true },
    _count: true
  });

  // Get recent sales (last 5)
  const recentSales = await prisma.saleMaster.findMany({
    take: 5,
    orderBy: { sale_date: 'desc' },
    include: { customer: true }
  });

  // Get recent purchases (last 5)
  const recentPurchases = await prisma.purchaseMaster.findMany({
    take: 5,
    orderBy: { po_date: 'desc' },
    include: { supplier: true }
  });

  // Get outstanding receivables
  const sales = await prisma.saleMaster.findMany({
    include: { customer: true, payments: true }
  });

  let totalReceivables = 0;
  const overdueCustomers = [];
  sales.forEach(s => {
    const paid = s.payments.reduce((sum, p) => sum + parseFloat(p.payment_amount), 0);
    const outstanding = parseFloat(s.total_amount || 0) - paid;
    if (outstanding > 0) {
      totalReceivables += outstanding;
      const days = Math.floor((new Date() - new Date(s.sale_date)) / (1000 * 60 * 60 * 24));
      if (days > 30) {
        overdueCustomers.push({
          customer: s.customer?.customer_name,
          amount: outstanding,
          days
        });
      }
    }
  });

  // Get outstanding payables
  const purchases = await prisma.purchaseMaster.findMany({
    include: { supplier: true, payments: true }
  });

  let totalPayables = 0;
  purchases.forEach(p => {
    const paid = p.payments.reduce((sum, pay) => sum + parseFloat(pay.payment_amount), 0);
    const outstanding = parseFloat(p.total_amount || 0) - paid;
    if (outstanding > 0) {
      totalPayables += outstanding;
    }
  });

  // Get low stock items (using raw query for field comparison)
  const allItems = await prisma.item.findMany({
    where: { active: true },
    select: { item_id: true, items_description: true, stock_on_hand: true, reorder_level: true }
  });
  const lowStockItems = allItems.filter(i =>
    parseFloat(i.stock_on_hand) <= parseFloat(i.reorder_level)
  ).slice(0, 5);

  // Get top customers this month
  const topCustomers = await prisma.saleMaster.groupBy({
    by: ['customer_id'],
    where: { sale_date: { gte: startOfMonth } },
    _sum: { total_amount: true },
    orderBy: { _sum: { total_amount: 'desc' } },
    take: 3
  });

  const customerNames = await prisma.customer.findMany({
    where: { customer_id: { in: topCustomers.map(c => c.customer_id) } },
    select: { customer_id: true, customer_name: true }
  });

  return `
BUSINESS DATA SUMMARY (as of ${today.toLocaleDateString()}):

ENTITY COUNTS:
- Active Suppliers: ${supplierCount}
- Active Customers: ${customerCount}
- Active Items: ${itemCount}
- Active Employees: ${employeeCount}

THIS MONTH'S PERFORMANCE:
- Total Sales: Rs.${parseFloat(monthlySales._sum.total_amount || 0).toLocaleString()} (${monthlySales._count} transactions)
- Total Purchases: Rs.${parseFloat(monthlyPurchases._sum.total_amount || 0).toLocaleString()} (${monthlyPurchases._count} transactions)
- Gross Profit: Rs.${(parseFloat(monthlySales._sum.total_amount || 0) - parseFloat(monthlyPurchases._sum.total_amount || 0)).toLocaleString()}

FINANCIAL POSITION:
- Outstanding Receivables (customers owe): Rs.${totalReceivables.toLocaleString()}
- Outstanding Payables (owed to suppliers): Rs.${totalPayables.toLocaleString()}
- Net Position: Rs.${(totalReceivables - totalPayables).toLocaleString()}

RECENT SALES:
${recentSales.map(s => `- Sale #${s.sale_id}: Rs.${parseFloat(s.total_amount || 0).toLocaleString()} to ${s.customer?.customer_name} on ${new Date(s.sale_date).toLocaleDateString()}`).join('\n')}

RECENT PURCHASES:
${recentPurchases.map(p => `- PO #${p.po_no}: Rs.${parseFloat(p.total_amount || 0).toLocaleString()} from ${p.supplier?.supplier_name} on ${new Date(p.po_date).toLocaleDateString()}`).join('\n')}

TOP CUSTOMERS THIS MONTH:
${topCustomers.map(c => {
  const name = customerNames.find(cn => cn.customer_id === c.customer_id)?.customer_name || 'Unknown';
  return `- ${name}: Rs.${parseFloat(c._sum.total_amount || 0).toLocaleString()}`;
}).join('\n')}

OVERDUE RECEIVABLES (>30 days):
${overdueCustomers.length > 0 ? overdueCustomers.map(c => `- ${c.customer}: Rs.${c.amount.toLocaleString()} (${c.days} days overdue)`).join('\n') : 'None'}

LOW STOCK ALERTS:
${lowStockItems.length > 0 ? lowStockItems.map(i => `- ${i.items_description}: ${parseFloat(i.stock_on_hand)} units (reorder at ${parseFloat(i.reorder_level)})`).join('\n') : 'All items are adequately stocked'}
`;
}

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, message: 'AI service not configured' });
    }

    // Get business context
    const businessContext = await getBusinessContext(req.prisma);

    // Build messages with business context
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Here is the current business data:\n${businessContext}` },
      { role: 'assistant', content: 'I have access to your business data. How can I help you today?' },
      { role: 'user', content: message }
    ];

    // Call Groq API
    const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return res.status(500).json({ success: false, message: 'Groq API error: ' + errorText });
    }

    const data = await apiResponse.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';

    return res.json({
      success: true,
      data: {
        response: aiResponse,
        model: 'llama-3.3-70b-versatile'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error: ' + error.message });
  }
});

// Get chat history
router.get('/history', async (req, res) => {
  try {
    let history = [];
    try {
      history = await req.prisma.chatHistory.findMany({
        where: { user_id: req.user.user_id },
        orderBy: { created_on: 'asc' },
        take: 50
      });
    } catch (e) {
      console.log('Chat history table may not exist');
    }

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get chat history' });
  }
});

// Clear chat history
router.delete('/history', async (req, res) => {
  try {
    try {
      await req.prisma.chatHistory.deleteMany({
        where: { user_id: req.user.user_id }
      });
    } catch (e) {
      console.log('Could not clear chat history');
    }

    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear chat history' });
  }
});

// Get AI summary (for dashboard)
router.get('/summary', async (req, res) => {
  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return res.status(500).json({ success: false, message: 'AI service not configured' });
    }

    const businessContext = await getBusinessContext(req.prisma);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a business analyst. Generate a brief 2-3 sentence summary of the business performance and one key recommendation. Be concise.' },
          { role: 'user', content: businessContext }
        ],
        temperature: 0.5,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      return res.status(500).json({ success: false, message: 'AI service error' });
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content || '';

    res.json({ success: true, data: { summary } });
  } catch (error) {
    console.error('AI summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
});

module.exports = router;

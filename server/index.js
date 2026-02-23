const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth.routes');
const supplierRoutes = require('./routes/supplier.routes');
const customerRoutes = require('./routes/customer.routes');
const itemRoutes = require('./routes/item.routes');
const categoryRoutes = require('./routes/category.routes');
const weightUnitRoutes = require('./routes/weight-unit.routes');
const cityRoutes = require('./routes/city.routes');
const bankRoutes = require('./routes/bank.routes');
const employeeRoutes = require('./routes/employee.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const saleRoutes = require('./routes/sale.routes');
const paymentRoutes = require('./routes/payment.routes');
const purchaseReturnRoutes = require('./routes/purchase-return.routes');
const saleReturnRoutes = require('./routes/sale-return.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Make prisma available in routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/weight-units', weightUnitRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/purchase-returns', purchaseReturnRoutes);
app.use('/api/sale-returns', saleReturnRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Serve uploaded files with security headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Serve static files from public folder (built frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing - return index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

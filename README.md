# Kun Cattle Farm - Management System

A comprehensive farm management system for managing suppliers, customers, inventory, employees, purchases, sales, payments, and returns.

## Features

- **Dashboard** - Overview of key metrics and statistics
- **Suppliers Management** - Track and manage supplier information
- **Customers Management** - Maintain customer database
- **Items & Categories** - Inventory management with categorization
- **Banks** - Manage bank accounts for payments
- **Employees** - Employee records management
- **Purchases** - Create and track purchase orders with details
- **Sales** - Manage sales invoices and transactions
- **Payments** - Record payments (to suppliers) and receipts (from customers)
- **Purchase Returns** - Handle returns to suppliers
- **Sale Returns** - Process customer returns
- **Settings** - Admin profile and password management
- **CSV Export** - Export data tables to CSV format

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **Prisma ORM** for database operations
- **MySQL** database
- **JWT** authentication with **bcrypt** password hashing
- **express-validator** for input validation

### Frontend
- **React 18** with **Vite**
- **React Router v6** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hot Toast** for notifications
- **Axios** for API calls

### UI Design
- Modern glassmorphism design
- Responsive layout (mobile-friendly)
- Clean and minimal interface

## Project Structure

```
farm-management-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── Auth/       # Login, ProtectedRoute
│   │   │   ├── Common/     # DataTable, FormModal, DeleteConfirm
│   │   │   └── Layout/     # DashboardLayout, Sidebar, Header
│   │   ├── context/        # AuthContext
│   │   ├── pages/          # Page components
│   │   └── services/       # API service
│   └── index.html
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── middleware/         # Auth middleware
│   └── index.js            # Server entry point
├── prisma/
│   └── schema.prisma       # Database schema
└── deploy/                 # Production-ready files
    ├── public/             # Built frontend
    ├── routes/             # API routes
    ├── middleware/         # Auth middleware
    ├── prisma/             # Database schema
    └── index.js            # Server entry point
```

## Database Schema

### Tables
- `users` - Admin/Staff accounts
- `suppliers` - Supplier information
- `customers` - Customer information
- `categories` - Item categories
- `items` - Inventory items
- `banks` - Bank accounts
- `employees` - Employee records
- `purchase_master` / `purchase_detail` - Purchase orders
- `sale_master` / `sale_detail` - Sales invoices
- `payments` - Payment/Receipt transactions
- `purchase_return_master` / `purchase_return_detail` - Purchase returns
- `sale_return_master` / `sale_return_detail` - Sale returns

## Installation

### Prerequisites
- Node.js 18+ (LTS recommended: v22)
- MySQL 8.0+
- npm or yarn

### Backend Setup

1. Navigate to server directory:
   ```bash
   cd server
   npm install
   ```

2. Create `.env` file:
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/farm_management"
   JWT_SECRET="your-secret-key-here"
   JWT_EXPIRES_IN="24h"
   PORT=3001
   ```

3. Push database schema:
   ```bash
   npx prisma db push
   ```

4. Start server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to client directory:
   ```bash
   cd client
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Access at `http://localhost:5173`

## Production Deployment (Plesk)

1. Upload contents of `deploy/` folder to server

2. Create `.env` file with production credentials:
   ```env
   DATABASE_URL="mysql://user:password@host:3306/database"
   JWT_SECRET="your-production-secret"
   JWT_EXPIRES_IN="24h"
   PORT=3001
   ```

3. Run in Plesk Node.js panel:
   ```bash
   npm install
   npm run db:push
   ```

4. Set entry point to `index.js`

5. Start/Restart the application

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login (Admin only)
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password
- `PUT /api/auth/update-profile` - Update username/email

### Resources (CRUD)
- `/api/suppliers` - Suppliers
- `/api/customers` - Customers
- `/api/categories` - Categories
- `/api/items` - Items
- `/api/banks` - Banks
- `/api/employees` - Employees
- `/api/purchases` - Purchase Orders
- `/api/sales` - Sales
- `/api/payments` - Payments
- `/api/purchase-returns` - Purchase Returns
- `/api/sale-returns` - Sale Returns
- `/api/dashboard` - Dashboard statistics

## Business Rules

- Only **Admin** users can login to the system
- Purchase returns must reference an existing purchase order
- Sale returns must reference an existing sale
- Return quantity cannot exceed original quantity
- Payments can be linked to suppliers, customers, purchases, or sales
- All monetary fields use decimal precision (12,2)

## Default Admin Account

After fresh installation, create an admin user:

```sql
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@example.com', '$2a$10$...', 'ADMIN');
```

Or use the register endpoint and update role to 'ADMIN' in database.

## License

Private - All rights reserved

## Author

Developed for Kun Cattle Farm

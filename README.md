# Kun Farm - Management System

A comprehensive farm management system for managing suppliers, customers, inventory, employees, purchases, sales, payments, and returns.

## Features

### Core Features
- **Dashboard** - Overview of key metrics, AI insights, financial overview, and alert widgets
- **Suppliers Management** - Track and manage supplier information
- **Customers Management** - Maintain customer database
- **Items & Categories** - Inventory management with categorization
- **Weight Units & Cities** - Configurable units and location management
- **Banks** - Manage bank accounts for payments
- **Employees** - Employee records with salary management
- **Purchases** - Create and track purchase orders with item details and images
- **Sales** - Manage sales invoices and transactions with images
- **Payments** - Record payments, receipts, refunds, and salary payments
- **Purchase Returns** - Handle returns to suppliers
- **Sale Returns** - Process customer returns
- **Settings** - Admin profile, password management, and data backup

### Reports
- **Sales Report** - Sales analysis with CSV and PDF export
- **Purchase Report** - Purchase analysis with CSV and PDF export
- **Stock Report** - Inventory levels and low stock alerts
- **Profit/Loss Report** - Financial performance analysis
- **Payment Report** - Payment tracking and analysis
- **Outstanding Report** - Receivables and payables with aging

### Advanced Features
- **AI Chat Assistant** - Ask questions about your business data (powered by Groq/Llama)
- **AI Dashboard Insights** - Automatic business performance summary
- **Invoice Generation** - Professional invoice creation with print/PDF
- **Data Backup** - Export all data as JSON backup
- **Image Attachments** - Upload images for purchases, sales, and payments
- **Image Lightbox** - Full-screen image preview with zoom and navigation
- **Dashboard Alerts** - Low stock and overdue payment notifications
- **Linked Transaction Details** - View related purchase/sale info in payments

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **Prisma ORM** for database operations
- **MySQL** database
- **JWT** authentication with **bcrypt** password hashing
- **Multer** for file uploads
- **Groq API** for AI features (Llama 3.3 70B)

### Frontend
- **React 18** with **Vite**
- **React Router v6** for navigation
- **Tailwind CSS** for styling
- **Recharts** for dashboard charts
- **Lucide React** for icons
- **React Hot Toast** for notifications
- **Axios** for API calls

### UI Design
- Modern glassmorphism design
- Responsive layout (mobile-friendly)
- Clean and minimal interface
- Full-screen image lightbox with zoom controls

## Project Structure

```
farm-management-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── Auth/       # Login, ProtectedRoute
│   │   │   ├── Common/     # DataTable, FormModal, ImageUploader, ImageLightbox
│   │   │   ├── Invoice/    # InvoiceModal
│   │   │   └── Layout/     # DashboardLayout, Sidebar, Header
│   │   ├── context/        # AuthContext
│   │   ├── pages/          # Page components
│   │   │   └── Reports/    # Report pages
│   │   └── services/       # API service
│   └── index.html
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── middleware/         # Auth middleware
│   ├── uploads/            # Uploaded files
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
- `items` - Inventory items with stock tracking
- `weight_units` - Configurable weight units
- `cities` - City/location management
- `banks` - Bank accounts
- `employees` - Employee records with salary info
- `purchase_master` / `purchase_detail` - Purchase orders with images
- `sale_master` / `sale_detail` - Sales invoices with images
- `payments` - Payment/Receipt/Salary transactions with attachments
- `purchase_return_master` / `purchase_return_detail` - Purchase returns
- `sale_return_master` / `sale_return_detail` - Sale returns
- `images` - File attachment records

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
   GROQ_API_KEY="your-groq-api-key"  # Optional: for AI features
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
   GROQ_API_KEY="your-groq-api-key"
   ```

3. Create `.node-version` file with Node version (e.g., `22`)

4. Run in Plesk Node.js panel:
   ```bash
   npm install
   npm run db:push
   ```

5. Set entry point to `index.js`

6. Start/Restart the application

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password
- `PUT /api/auth/update-profile` - Update username/email

### Resources (CRUD)
- `/api/suppliers` - Suppliers
- `/api/customers` - Customers
- `/api/categories` - Categories
- `/api/items` - Items
- `/api/weight-units` - Weight Units
- `/api/cities` - Cities
- `/api/banks` - Banks
- `/api/employees` - Employees
- `/api/purchases` - Purchase Orders
- `/api/sales` - Sales
- `/api/payments` - Payments
- `/api/purchase-returns` - Purchase Returns
- `/api/sale-returns` - Sale Returns

### Dashboard & Reports
- `/api/dashboard` - Dashboard statistics
- `/api/reports/sales` - Sales report
- `/api/reports/purchases` - Purchase report
- `/api/reports/stock` - Stock report
- `/api/reports/profit-loss` - Profit/Loss report
- `/api/reports/payments` - Payment report
- `/api/reports/outstanding` - Outstanding balances
- `/api/reports/invoice/:saleId` - Invoice data
- `/api/reports/alerts` - Dashboard alerts

### AI Features
- `/api/ai/chat` - Chat with AI assistant
- `/api/ai/summary` - Get AI business summary

### Utilities
- `/api/uploads` - File upload
- `/api/backup/export` - Export data backup
- `/api/backup/stats` - Backup statistics

## Business Rules

- Only **Admin** users can login to the system
- Purchase returns must reference an existing purchase order
- Sale returns must reference an existing sale
- Return quantity cannot exceed original quantity
- Payments can be linked to suppliers, customers, purchases, sales, or employees
- Salary payments track monthly salary with advance/regular types
- All monetary fields use decimal precision (12,2)
- Low stock alerts trigger when stock falls below reorder level
- Overdue payments are flagged after 30 days

## Default Admin Account

After fresh installation, create an admin user via the register endpoint or directly in database:

```sql
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@example.com', '$2a$10$...', 'ADMIN');
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | MySQL connection string | Yes |
| JWT_SECRET | Secret key for JWT tokens | Yes |
| JWT_EXPIRES_IN | Token expiration time (e.g., "24h") | Yes |
| PORT | Server port (default: 3001) | No |
| GROQ_API_KEY | Groq API key for AI features | No |
| FRONTEND_URL | Frontend URL for CORS (production) | No |

## License

Private - All rights reserved

## Author

Developed for Kun Farm

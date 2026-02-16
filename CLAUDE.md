# Farm Management System

## Project Context
A web application for managing farm operations in Costa del Sol, Spain.
Multi-module system covering suppliers, customers, inventory, employees,
purchases, sales, payments, and returns.

## Tech Stack
- Backend: Node.js, Express.js, Prisma ORM
- Frontend: React (Vite), Tailwind CSS
- Database: MySQL
- Auth: JWT + bcrypt

## Database Tables
users, suppliers, customers, items, banks, employees,
purchase_master, purchase_detail, sale_master, sale_detail,
payments, purchase_return_master, purchase_return_detail,
sale_return_master, sale_return_detail

## Key Business Rules
- Purchase returns must reference an existing po_no
- Sale returns must reference an existing sale_id
- Return quantity cannot exceed original purchased/sold quantity
- All monetary fields use numeric precision (10,2)
- Soft deletes preferred (active/status field) over hard deletes
- All routes except login require JWT authentication
- Admin role has full access, staff role has limited write access

## Code Style
- Use async/await for all async operations
- Use Prisma transactions for master-detail operations
- Use try-catch with proper error responses
- Frontend components use functional components with hooks
- All API responses follow: { success: true/false, data: ..., message: ... }

## Running the Application
```bash
# Start Backend (from /server)
npm run dev        # runs on http://localhost:3001

# Start Frontend (from /client)
npm run dev        # runs on http://localhost:5173
```

## Environment Variables
Copy .env.example to .env and configure:
- DATABASE_URL: MySQL connection string (mysql://user:password@host:3306/database)
- JWT_SECRET: Secret key for JWT tokens
- PORT: Backend server port (default: 3001)

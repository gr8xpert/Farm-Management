# Farm Management System - Deployment Guide

## Files Structure
```
deploy/
├── index.js           # Main server file
├── package.json       # Dependencies
├── .env.example       # Environment template (rename to .env)
├── public/            # Built frontend files
├── routes/            # API route files
├── middleware/        # Auth middleware
└── prisma/
    ├── schema.prisma  # Database schema
    └── seed.js        # Initial data
```

## Step-by-Step Deployment on Plesk

### 1. Create MySQL Database in Plesk
- Go to **Databases** in Plesk
- Click **Add Database**
- Database name: `farm_management`
- Create a database user and note the credentials

### 2. Upload Files via FTP
- Connect to your server via FTP
- Navigate to your domain's folder (usually `/httpdocs` or `/public_html`)
- Create a folder for the app (e.g., `farm-app`)
- Upload ALL files from the `deploy` folder

### 3. Configure Environment
- Rename `.env.example` to `.env`
- Edit `.env` with your actual values:
  ```
  DATABASE_URL="mysql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:3306/farm_management"
  JWT_SECRET="generate-a-random-secure-string-here"
  ```

### 4. Set Up Node.js in Plesk
- Go to **Websites & Domains** > Your Domain
- Click **Node.js**
- Enable Node.js for this domain
- Set these values:
  - **Node.js Version**: 18.x or higher
  - **Document Root**: `/farm-app` (or your folder name)
  - **Application Root**: `/farm-app`
  - **Application Startup File**: `index.js`

### 5. Install Dependencies
In Plesk Node.js panel, click **NPM Install** or run via SSH:
```bash
cd /var/www/vhosts/yourdomain.com/farm-app
npm install
```

### 6. Generate Prisma Client
Run via SSH:
```bash
cd /var/www/vhosts/yourdomain.com/farm-app
npx prisma generate
```

### 7. Create Database Tables
Run via SSH:
```bash
npx prisma db push
```

### 8. Seed Initial Data (Optional)
```bash
node prisma/seed.js
```

### 9. Start/Restart Application
In Plesk Node.js panel, click **Restart App**

## Default Login Credentials
After seeding:
- **Admin**: admin / admin123
- **Staff**: staff / staff123

## Troubleshooting

### Check if app is running
Visit: `https://yourdomain.com/api/health`
Should return: `{"success":true,"message":"Server is running"}`

### View logs
In Plesk Node.js panel, check the **Logs** section

### Common Issues
1. **Database connection failed**: Check DATABASE_URL in .env
2. **Cannot find module**: Run `npm install` again
3. **Prisma error**: Run `npx prisma generate`

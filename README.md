# St. Xavier International School ERP

Enterprise School Management System decoupled into a **React JSX Frontend** and **Node.js Express REST API Backend**.

## Project Architecture

```
school/
├── frontend/             # Standalone React JSX Single Page Application (Vite + React Router)
│   ├── src/
│   │   ├── components/   # Header.jsx, Sidebar.jsx
│   │   ├── pages/        # Login.jsx, Careers.jsx, SuperAdminDashboard.jsx, etc.
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js    # Listens on http://localhost:3000 (proxies /api to 5000)
│
└── backend/              # Node.js + Express REST API Backend (Prisma ORM in JavaScript)
    ├── lib/              # db.js, audit.js, email.js
    ├── routes/           # auth.js, students.js, staff.js, attendance.js, invoices.js, leave.js, workUpdates.js, careers.js, reports.js
    ├── prisma/           # schema.prisma, seed.js
    └── server.js         # Listens on http://localhost:5000
```

## Quick Start Commands

### 1. Backend REST API
```bash
cd backend
npm install
npx prisma db push
npm run db:seed
npm start
# Runs on http://localhost:5000
```

### 2. Frontend React JSX Application
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

## Seeded Default Credentials
- **Super Admin**: `superadmin@school.com` / `password123`
- **Admin**: `admin@school.com` / `password123`
- **Accounts**: `accounts@school.com` / `password123`
- **Staff**: `staff@school.com` / `password123`
- **Student**: `student@school.com` / `password123`

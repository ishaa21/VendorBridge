# VendorBridge

**VendorBridge** is a procurement and vendor management web application designed to cover the full source-to-pay workflow: vendor onboarding, RFQs, quotations, comparison, multi-level approvals, purchase orders, invoices, reporting, and audit activity logs.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MySQL + Prisma ORM
- **Auth**: NextAuth v5 (credentials)
- **UI**: Tailwind CSS 4, Lucide icons, Recharts
- **PDF Generation**: PDFKit

---

## Prerequisites

- **Node.js**: 18+ (20+ recommended)
- **MySQL**: 8.x running locally or remotely

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the root directory:
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/vendorbridge"
AUTH_SECRET="your-random-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Setup
Ensure your MySQL database exists, then run:
```bash
npm run db:generate
npm run db:push
```

### 4. Run the Application
```bash
# Development mode
npm run dev

# Production build and run
npm run build
npm run start
```

---

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Create optimized production build
- `npm run start` - Run the production server
- `npm run lint` - Run ESLint checking
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Sync database schema
- `npm run db:clear` - Wipe database records (keeps schema)
- `npm run db:studio` - Open Prisma Studio

# VendorBridge

VendorBridge is a procurement and vendor management platform that streamlines the complete source-to-pay process. The application helps organizations manage vendors, RFQs, quotations, approvals, purchase orders, invoices, reporting, and audit logs through a centralized system.

## Tech Stack

* **Frontend:** Next.js 15 (App Router)
* **Database:** MySQL + Prisma ORM
* **Authentication:** NextAuth v5 (Credentials)
* **Styling:** Tailwind CSS 4
* **Charts:** Recharts
* **Icons:** Lucide React
* **PDF Generation:** PDFKit

## Features

* Vendor onboarding and management
* RFQ creation and tracking
* Quotation submission and comparison
* Multi-level approval workflows
* Purchase order generation
* Invoice management
* Analytics and reporting dashboard
* Audit trail and activity logs
* Secure authentication and role-based access

## Prerequisites

* Node.js 18+ (20+ recommended)
* MySQL 8.x
* npm

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/vendorbridge"
AUTH_SECRET="your-random-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
npm run db:generate
npm run db:push
```

## Running the Application

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run start
```

## Available Scripts

| Command             | Description              |
| ------------------- | ------------------------ |
| npm run dev         | Start development server |
| npm run build       | Build application        |
| npm run start       | Run production server    |
| npm run lint        | Run ESLint               |
| npm run db:generate | Generate Prisma Client   |
| npm run db:push     | Push schema to database  |
| npm run db:clear    | Clear database records   |
| npm run db:studio   | Open Prisma Studio       |

## Workflow

Vendor Onboarding → RFQ → Quotations → Comparison → Approvals → Purchase Orders → Invoices → Reports

## License

This project was developed as a procurement and vendor management solution for managing the complete procurement lifecycle.

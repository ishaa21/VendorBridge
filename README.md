# VendorBridge

**VendorBridge** is a procurement and vendor management web application built for the VendorBridge Hackathon. It covers the full source-to-pay workflow: vendor onboarding, RFQs, quotations, comparison, multi-level approvals, purchase orders, invoices, reporting, and audit activity logs.

All data is stored in **MySQL** via Prisma. There is **no mock/sandbox mode** — every action reads and writes the live database.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | MySQL + Prisma ORM |
| Auth | NextAuth v5 (credentials) |
| UI | Tailwind CSS 4, Lucide icons, Recharts |
| Validation | Zod + React Hook Form |

---

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **MySQL** 8.x running locally or remotely
- **npm** (comes with Node)

---

## Quick Start

### 1. Clone and install

```bash
cd VendorBridge
npm install
```

### 2. Configure environment

```bash
copy .env.example .env
```

Edit `.env` and set your MySQL credentials:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/vendorbridge"
AUTH_SECRET="your-random-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Create database and schema

Create the MySQL database (if it does not exist):

```sql
CREATE DATABASE vendorbridge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Push the Prisma schema:

```bash
npm run db:generate
npm run db:push
```

> **Do not run `npm run db:seed`** unless you want demo seed data. The app is designed to work with an empty database — register users through the UI.

### 4. Run the application

**Development:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Production (recommended for demos / submission):**

```bash
npm run build
npm run start
```

Production mode is significantly faster and more stable than dev mode.

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full platform access |
| **Procurement Officer** | Vendors, RFQs, quotations, comparison, POs, invoices, reports |
| **Manager** | Approvals, POs, invoices, reports |
| **Vendor** | RFQ invitations, submit quotations, view POs & invoices |

Register accounts at `/register` and select the appropriate role.

---

## End-to-End Workflow (No Seed Data)

Follow these steps to exercise every core feature:

### Step 1 — Register users

1. Register a **Manager** at `/register`
2. Register a **Procurement Officer**
3. (Later) Register a **Vendor** after onboarding them

Password must include uppercase, lowercase, number, and special character (min 8 chars).  
Example: `Vendor@123`

### Step 2 — Procurement: onboard vendor

1. Login as **Procurement Officer**
2. Go to **Vendors** → **Add Vendor**
3. Fill in vendor details and set status to **Active**
4. Use the vendor's **email** — the vendor user will link to this record on registration

### Step 3 — Vendor: register account

1. Logout → Register as **Vendor** using the **same email** as the vendor record
2. The account auto-links to the vendor profile

### Step 4 — Procurement: create RFQ

1. Login as **Procurement Officer**
2. **RFQ's** → **Create RFQ**
3. Add title, category, deadline, description, and line items
4. **Step 2:** Search and assign the active vendor
5. **Step 3:** **Save & Send To Vendors** → confirm

### Step 5 — Vendor: submit quotation

1. Login as **Vendor**
2. **Quotations** → **Submit Quote**
3. Enter unit prices → **Submit Quotation**

### Step 6 — Procurement: compare and select

1. Login as **Procurement Officer**
2. **Quotations** → **Compare Bids**
3. **Select & Approve** → **Confirm Selection**

### Step 7 — Manager: approve (L1 + L2)

1. Login as **Manager**
2. **Approvals** → **Review**
3. **Approve Request** for L1, then again for L2
4. PO and Invoice are auto-generated on final approval

### Step 8 — Invoice & reporting

1. **Purchase orders** — view generated PO
2. **Invoices** → **View Details** → **Mark As Paid**
3. **Dashboard** — live KPIs
4. **Reports** — spend analytics
5. **Activity** — audit trail (use **Refresh** to update)

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Sync schema to MySQL |
| `npm run db:clear` | Wipe all data (keeps schema) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run demo:video` | Record automated walkthrough video |

---

## Project Structure

```
src/
├── app/                    # Next.js routes (auth + dashboard)
├── actions/                # Server actions (CRUD, workflows)
├── components/             # UI components
├── contexts/               # Shared realtime SSE provider
├── hooks/                  # Client hooks
├── lib/                    # Prisma, auth, validators, utilities
prisma/
├── schema.prisma           # Database schema
wireframe/                  # UI wireframe references
demo-videos/                # Recorded demo output
```

---

## Key Features

- **Authentication** — Register, login, forgot/reset password
- **Vendor management** — CRUD, status (Pending / Active / Blocked)
- **RFQ lifecycle** — Draft, publish, invite vendors, attachments
- **Quotations** — Vendor submit/edit, procurement compare matrix
- **Approvals** — L1 + L2 workflow with PO/invoice generation
- **Purchase orders & invoices** — PDF download, email, mark paid
- **Reports** — Spend trends, vendor performance, export
- **Activity logs** — Role-filtered audit trail with export (CSV/Excel/PDF)
- **Notifications** — Real-time via SSE (single shared connection)
- **Dashboard** — Role-based KPIs and analytics charts

---

## Performance Notes

The app uses a **single shared SSE connection** per session for notifications. Background polling that caused slowness has been removed. For the smoothest experience:

- Run **`npm run build && npm run start`** for demos and submission
- Keep MySQL running locally with adequate disk space
- Use **Refresh** on the Activity page to load new log entries

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Can't reach database` | Start MySQL; verify `DATABASE_URL` in `.env` |
| Vendor can't see RFQs | Vendor email must match the vendor record; vendor status must be **Active** |
| No vendors in RFQ assign step | Add vendor with **Active** status first |
| Approvals list empty | Complete quotation comparison first — workflow is created on vendor selection |
| App feels slow in dev | Use production mode: `npm run build && npm run start` |
| Registration fails | Password needs upper, lower, number, special char (8+ chars) |

---

## Demo Video

An automated walkthrough can be recorded against a clean database:

```bash
npm run demo:video
```

Output: `demo-videos/vendorbridge-core-demo.webm`

---

## License

Built for the VendorBridge Hackathon. All rights reserved.

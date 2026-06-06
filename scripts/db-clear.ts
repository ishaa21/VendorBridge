/**
 * Clears all application data from MySQL without running seed.
 * Use before a live demo so every record is created through the UI.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0")

  const tables = [
    "approval_steps",
    "approval_workflows",
    "approvals",
    "comparison_decisions",
    "invoices",
    "purchase_orders",
    "quotation_items",
    "quotations",
    "rfq_attachments",
    "rfq_vendors",
    "rfq_items",
    "rfqs",
    "vendor_status_history",
    "vendors",
    "notifications",
    "activity_logs",
    "categories",
    "sessions",
    "accounts",
    "verification_tokens",
    "users",
  ]

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``)
  }

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1")
  console.log("Database cleared — ready for live demo (no seed data).")
}

main()
  .catch((err) => {
    console.error("Failed to clear database:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

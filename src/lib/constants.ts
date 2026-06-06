import { Role } from "@prisma/client"

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  PROCUREMENT_OFFICER: "Procurement Officer",
  VENDOR: "Vendor",
  MANAGER: "Manager / Approver",
}

export const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "bg-red-500/10 text-red-500 border-red-500/20",
  PROCUREMENT_OFFICER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  VENDOR: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  MANAGER: "bg-amber-500/10 text-amber-500 border-amber-500/20",
}

export type NavItem = {
  title: string
  href: string
  icon: string
  roles: Role[]
  badge?: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: ["ADMIN", "PROCUREMENT_OFFICER", "VENDOR", "MANAGER"],
  },
  {
    title: "Vendors",
    href: "/dashboard/vendors",
    icon: "Building2",
    roles: ["ADMIN", "PROCUREMENT_OFFICER"],
  },
  {
    title: "RFQ's",
    href: "/dashboard/rfqs",
    icon: "FileText",
    roles: ["ADMIN", "PROCUREMENT_OFFICER", "VENDOR"],
  },
  {
    title: "Quotations",
    href: "/dashboard/quotations",
    icon: "Receipt",
    roles: ["ADMIN", "PROCUREMENT_OFFICER", "VENDOR"],
  },
  {
    title: "Approvals",
    href: "/dashboard/approvals",
    icon: "ShieldCheck",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "Purchase orders",
    href: "/dashboard/purchase-orders",
    icon: "ShoppingCart",
    roles: ["ADMIN", "PROCUREMENT_OFFICER", "VENDOR", "MANAGER"],
  },
  {
    title: "Invoices",
    href: "/dashboard/invoices",
    icon: "FileBarChart",
    roles: ["ADMIN", "PROCUREMENT_OFFICER", "VENDOR", "MANAGER"],
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: "BarChart3",
    roles: ["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"],
  },
  {
    title: "Activity",
    href: "/dashboard/activity-logs",
    icon: "ScrollText",
    roles: ["ADMIN", "MANAGER", "PROCUREMENT_OFFICER", "VENDOR"],
  },
]

export const ROLE_REDIRECT_MAP: Record<Role, string> = {
  ADMIN: "/dashboard",
  PROCUREMENT_OFFICER: "/dashboard",
  VENDOR: "/dashboard",
  MANAGER: "/dashboard/approvals",
}

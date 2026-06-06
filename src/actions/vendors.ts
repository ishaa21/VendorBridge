"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { Role, VendorStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { vendorSchema, type VendorFormValues } from "@/lib/validators/vendor"
import { recordActivityLog } from "@/lib/audit-logger"
import { dbErrorMessage } from "@/lib/errors"

export async function getVendorsList(filters?: {
  search?: string
  status?: string
}) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    if (session.user.role !== Role.ADMIN && session.user.role !== Role.PROCUREMENT_OFFICER) {
      throw new Error("Forbidden")
    }

    const where: Record<string, unknown> = {}

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status as VendorStatus
    }

    if (filters?.search) {
      const q = filters.search
      where.OR = [
        { vendorName: { contains: q } },
        { companyName: { contains: q } },
        { gstNumber: { contains: q } },
        { category: { contains: q } },
        { email: { contains: q } },
      ]
    }

    const [vendors, counts, totalAll] = await Promise.all([
      prisma.vendor.findMany({ where, orderBy: { vendorName: "asc" } }),
      prisma.vendor.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.vendor.count(),
    ])

    const statusCounts = {
      all: totalAll,
      active: counts.find((c) => c.status === VendorStatus.ACTIVE)?._count.id ?? 0,
      pending: counts.find((c) => c.status === VendorStatus.PENDING)?._count.id ?? 0,
      blocked: counts.find((c) => c.status === VendorStatus.BLOCKED)?._count.id ?? 0,
    }

    return { success: true, vendors, statusCounts }
  } catch (error) {
    console.error("getVendorsList error:", error)
    return {
      success: false,
      message: dbErrorMessage(error),
      vendors: [],
      statusCounts: { all: 0, active: 0, pending: 0, blocked: 0 },
    }
  }
}

export async function getVendorById(id: string) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        statusHistory: {
          include: { changedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    })

    if (!vendor) return { success: false, message: "Vendor not found", vendor: null }
    return { success: true, vendor }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error), vendor: null }
  }
}

export async function createVendor(data: VendorFormValues) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    if (session.user.role !== Role.ADMIN && session.user.role !== Role.PROCUREMENT_OFFICER) {
      throw new Error("Forbidden")
    }

    const validated = vendorSchema.safeParse(data)
    if (!validated.success) {
      return { success: false, message: validated.error.errors[0]?.message || "Validation failed" }
    }

    const linkedUser = await prisma.user.findUnique({
      where: { email: validated.data.email.toLowerCase() },
    })

    const vendor = await prisma.vendor.create({
      data: {
        ...validated.data,
        email: validated.data.email.toLowerCase(),
        createdById: session.user.id,
        userId: linkedUser?.role === Role.VENDOR ? linkedUser.id : null,
      },
    })

    await prisma.vendorStatusHistory.create({
      data: {
        vendorId: vendor.id,
        fromStatus: VendorStatus.PENDING,
        toStatus: validated.data.status,
        changedById: session.user.id,
        reason: "Initial registration",
      },
    })

    if (linkedUser?.role === Role.VENDOR) {
      await prisma.notification.create({
        data: {
          userId: linkedUser.id,
          title: "Vendor profile linked",
          message: `Your account has been linked to vendor profile ${vendor.vendorName}.`,
          type: "SUCCESS",
          link: "/dashboard/vendor-portal",
        },
      })
    }

    await recordActivityLog({
      userId: session.user.id,
      action: "VENDOR_ADDED",
      actionType: "Created",
      module: "Vendors",
      entityId: vendor.id,
      entityType: "Vendor",
      description: `Vendor added — ${vendor.vendorName} registered and ${validated.data.status === VendorStatus.ACTIVE ? "activated" : "pending verification"}`,
      metadata: { vendorName: vendor.vendorName, gstNumber: vendor.gstNumber },
    })

    revalidatePath("/dashboard/vendors")
    revalidatePath("/dashboard/activity-logs")

    return { success: true, message: "Vendor registered successfully", vendorId: vendor.id }
  } catch (error: unknown) {
    const err = error as { code?: string }
    if (err.code === "P2002") {
      return { success: false, message: "A vendor with this GST number or email already exists." }
    }
    return { success: false, message: dbErrorMessage(error) }
  }
}

export async function updateVendorStatus(
  vendorId: string,
  newStatus: VendorStatus,
  reason?: string
) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    if (session.user.role !== Role.ADMIN) {
      throw new Error("Only admins can change vendor status")
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
    if (!vendor) return { success: false, message: "Vendor not found" }

    await prisma.$transaction([
      prisma.vendor.update({ where: { id: vendorId }, data: { status: newStatus } }),
      prisma.vendorStatusHistory.create({
        data: {
          vendorId,
          fromStatus: vendor.status,
          toStatus: newStatus,
          changedById: session.user.id,
          reason: reason || `Status changed to ${newStatus}`,
        },
      }),
    ])

    await recordActivityLog({
      userId: session.user.id,
      action: "VENDOR_STATUS_CHANGED",
      actionType: "Edited",
      module: "Vendors",
      entityId: vendorId,
      entityType: "Vendor",
      description: `Vendor ${vendor.vendorName} status changed from ${vendor.status} to ${newStatus}`,
      metadata: { fromStatus: vendor.status, toStatus: newStatus },
    })

    revalidatePath("/dashboard/vendors")
    revalidatePath(`/dashboard/vendors/${vendorId}`)

    return { success: true, message: `Vendor status updated to ${newStatus}` }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error) }
  }
}

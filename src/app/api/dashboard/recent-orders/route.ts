import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { dbErrorMessage } from "@/lib/errors"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: userId, role } = session.user
    let vendorId: string | null = null

    if (role === Role.VENDOR) {
      const vendor = await prisma.vendor.findUnique({ where: { userId } })
      vendorId = vendor?.id || null
    }

    const recentOrders =
      role === Role.VENDOR && vendorId
        ? await prisma.purchaseOrder.findMany({
            where: { vendorId },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { vendor: { select: { vendorName: true } } },
          })
        : role === Role.VENDOR
          ? []
          : await prisma.purchaseOrder.findMany({
              orderBy: { createdAt: "desc" },
              take: 5,
              include: { vendor: { select: { vendorName: true } } },
            })

    const formattedOrders = recentOrders.map((order) => ({
      id: order.id,
      poNumber: order.poNumber,
      vendorName: order.vendor.vendorName,
      amount: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt,
    }))

    return NextResponse.json({ data: formattedOrders })
  } catch (error) {
    console.error("Dashboard recent orders API error:", error)
    return NextResponse.json({ error: dbErrorMessage(error) }, { status: 503 })
  }
}

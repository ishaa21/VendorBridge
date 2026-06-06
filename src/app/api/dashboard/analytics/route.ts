import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { dbErrorMessage } from "@/lib/errors"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const invoices = await prisma.invoice.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      include: { vendor: { select: { vendorName: true } } },
    })

    const monthlySpendMap = new Map<string, number>()
    const vendorContributionMap = new Map<string, number>()

    const trendData: { name: string; spend: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
      monthlySpendMap.set(label, 0)
      trendData.push({ name: label, spend: 0 })
    }

    invoices.forEach((inv) => {
      const d = inv.createdAt
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
      if (monthlySpendMap.has(label)) {
        monthlySpendMap.set(label, monthlySpendMap.get(label)! + Number(inv.amount))
      }
      const vendorName = inv.vendor.vendorName
      vendorContributionMap.set(
        vendorName,
        (vendorContributionMap.get(vendorName) || 0) + Number(inv.amount)
      )
    })

    const formattedTrend = trendData.map((t) => ({
      name: t.name,
      spend: Math.round(monthlySpendMap.get(t.name) || 0),
    }))

    const vendorDistribution = Array.from(vendorContributionMap.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }))

    return NextResponse.json({
      data: {
        trend: formattedTrend,
        distribution: vendorDistribution,
      },
    })
  } catch (error) {
    console.error("Dashboard analytics API error:", error)
    return NextResponse.json({ error: dbErrorMessage(error) }, { status: 503 })
  }
}

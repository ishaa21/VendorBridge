import { Metadata } from "next"
import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth-guard"
import { Role } from "@prisma/client"
import { getQuotationContext } from "@/actions/quotations"
import { QuotationSubmitForm } from "@/components/quotations/quotation-submit-form"

export const metadata: Metadata = {
  title: "Submit Quotation",
  description: "Submit your pricing bid for an RFQ.",
}

export default async function SubmitQuotationPage({
  params,
}: {
  params: Promise<{ rfqId: string }>
}) {
  await requireRole([Role.VENDOR])
  const { rfqId } = await params
  const result = await getQuotationContext(rfqId)

  if (!result.success || !result.rfq) {
    notFound()
  }

  const existingQuotation = result.quotation
    ? {
        taxRate: Number(result.quotation.taxRate),
        notes: result.quotation.notes,
        items: result.quotation.items.map((item: { itemName: string; quantity: unknown; unitPrice: unknown; deliveryDays: number }) => ({
          itemName: item.itemName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          deliveryDays: item.deliveryDays,
        })),
      }
    : null

  return (
    <QuotationSubmitForm
      rfq={{
        id: result.rfq.id,
        rfqNumber: result.rfq.rfqNumber,
        title: result.rfq.title,
        category: result.rfq.category,
        description: result.rfq.description,
        deadline: result.rfq.deadline,
        items: result.rfq.items.map((item: { id: string; itemName: string; quantity: unknown; unit: string }) => ({
          id: item.id,
          itemName: item.itemName,
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
      }}
      existingQuotation={existingQuotation}
    />
  )
}

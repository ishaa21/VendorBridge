"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { saveQuotation } from "@/actions/quotations"

interface RFQItem {
  id: string
  itemName: string
  quantity: number | string
  unit: string
}

interface QuotationItem {
  itemName: string
  quantity: number
  unitPrice: number
  deliveryDays: number
}

interface QuotationSubmitFormProps {
  rfq: {
    id: string
    rfqNumber: string
    title: string
    category: string
    description: string
    deadline: Date | string
    items: RFQItem[]
  }
  existingQuotation?: {
    taxRate: number
    notes?: string | null
    items: Array<{
      itemName: string
      quantity: number | string
      unitPrice: number | string
      deliveryDays: number
    }>
  } | null
}

export function QuotationSubmitForm({ rfq, existingQuotation }: QuotationSubmitFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState<"draft" | "submit" | null>(null)

  const [items, setItems] = useState<QuotationItem[]>(
    rfq.items.map((item, idx) => {
      const existing = existingQuotation?.items[idx]
      return {
        itemName: item.itemName,
        quantity: Number(item.quantity),
        unitPrice: existing ? Number(existing.unitPrice) : 0,
        deliveryDays: existing?.deliveryDays ?? 7,
      }
    })
  )

  const [taxRate, setTaxRate] = useState(existingQuotation?.taxRate ?? 18)
  const [notes, setNotes] = useState(existingQuotation?.notes ?? "Payment terms: 30 days net...")

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxAmount = (subtotal * taxRate) / 100
  const grandTotal = subtotal + taxAmount

  function updateItem(index: number, field: keyof QuotationItem, value: number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  async function handleSave(submitNow: boolean) {
    setIsSubmitting(true)
    setSubmitAction(submitNow ? "submit" : "draft")

    const result = await saveQuotation({
      rfqId: rfq.id,
      items,
      taxRate,
      notes,
      submitNow,
    })

    if (result.success) {
      toast.success(result.message)
      router.push("/dashboard/quotations")
      router.refresh()
    } else {
      toast.error(result.message)
    }

    setIsSubmitting(false)
    setSubmitAction(null)
  }

  const deadlineStr = new Date(rfq.deadline).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Submit Quotation</h1>
        <p className="text-muted-foreground text-sm">
          RFQ: {rfq.title} — deadline {deadlineStr}
        </p>
      </div>

      <Card className="glass-card border-border/50 p-4">
        <p className="text-sm text-muted-foreground">
          {rfq.items.map((item) => `${item.itemName} × ${item.quantity}`).join(", ")} — category {rfq.category}
        </p>
      </Card>

      <Card className="glass-card border-border/50">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/40">
            <h2 className="font-semibold text-sm">Your Quotation</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Delivery (days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium">{item.itemName}</td>
                    <td className="p-3 text-center font-mono">{item.quantity}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice || ""}
                        onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                        className="h-8 text-right w-28 ml-auto"
                      />
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      {(item.quantity * item.unitPrice).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min={1}
                        value={item.deliveryDays}
                        onChange={(e) => updateItem(idx, "deliveryDays", Number(e.target.value))}
                        className="h-8 text-center w-20 mx-auto"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax / GST %</Label>
            <Input
              id="taxRate"
              type="number"
              min={0}
              max={100}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Note / Terms</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <Card className="glass-card border-border/50 h-fit">
          <CardContent className="p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-semibold">{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST ({taxRate}%)</span>
              <span className="font-mono font-semibold">{taxAmount.toLocaleString()}</span>
            </div>
            <div className="border-t border-border/40 pt-3 flex justify-between">
              <span className="font-bold">Grand Total</span>
              <span className="font-mono font-bold text-lg text-emerald-500">{grandTotal.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => handleSave(true)}
          disabled={isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold cursor-pointer"
        >
          {isSubmitting && submitAction === "submit" ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
          ) : (
            "Submit Quotation"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          {isSubmitting && submitAction === "draft" ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
          ) : (
            "Save Draft"
          )}
        </Button>
      </div>
    </div>
  )
}

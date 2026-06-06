"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { VendorStatus } from "@prisma/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { vendorSchema, type VendorFormValues } from "@/lib/validators/vendor"
import { createVendor } from "@/actions/vendors"
import { COUNTRIES } from "@/lib/validators/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"

const CATEGORIES = ["Furniture", "IT", "Constructions", "Logistics", "Office Supplies", "Services"]

export function VendorForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendorName: "",
      companyName: "",
      category: "",
      gstNumber: "",
      panNumber: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      country: "",
      status: VendorStatus.PENDING,
      notes: "",
    },
  })

  async function onSubmit(data: VendorFormValues) {
    setServerError("")
    const result = await createVendor(data)

    if (!result.success) {
      setServerError(result.message || "Failed to register vendor")
      toast.error(result.message)
      return
    }

    toast.success(result.message)
    router.push("/dashboard/vendors")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vendorName">Vendor Name <span className="text-destructive">*</span></Label>
          <Input id="vendorName" placeholder="Infra Supplies Pvt Ltd" {...register("vendorName")} />
          {errors.vendorName && <p className="text-xs text-destructive">{errors.vendorName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name <span className="text-destructive">*</span></Label>
          <Input id="companyName" placeholder="Infra Supplies Pvt Ltd" {...register("companyName")} />
          {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
          <Select id="category" {...register("category")} defaultValue="">
            <option value="" disabled>Select category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
          {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact Person <span className="text-destructive">*</span></Label>
          <Input id="contactPerson" placeholder="Rahul Mehta" {...register("contactPerson")} />
          {errors.contactPerson && <p className="text-xs text-destructive">{errors.contactPerson.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gstNumber">GST Number <span className="text-destructive">*</span></Label>
          <Input id="gstNumber" placeholder="27AAAAA1111A1Z1" className="uppercase" {...register("gstNumber")} />
          {errors.gstNumber && <p className="text-xs text-destructive">{errors.gstNumber.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="panNumber">PAN Number <span className="text-destructive">*</span></Label>
          <Input id="panNumber" placeholder="AAAAA1111A" className="uppercase" {...register("panNumber")} />
          {errors.panNumber && <p className="text-xs text-destructive">{errors.panNumber.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
          <Input id="email" type="email" placeholder="contact@vendor.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
          <Input id="phone" type="tel" placeholder="+91-98765-43210" {...register("phone")} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
          <Select id="country" {...register("country")} defaultValue="">
            <option value="" disabled>Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Initial Status</Label>
          <Select id="status" {...register("status")}>
            <option value={VendorStatus.PENDING}>Pending</option>
            <option value={VendorStatus.ACTIVE}>Active</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
        <Textarea id="address" placeholder="456, Industrial Estate, Surat" {...register("address")} />
        {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Additional vendor information..." {...register("notes")} />
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-500 hover:bg-emerald-500/90 text-white font-semibold cursor-pointer"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Registering...</>
          ) : (
            "Register Vendor"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="cursor-pointer">
          Cancel
        </Button>
      </div>
    </form>
  )
}

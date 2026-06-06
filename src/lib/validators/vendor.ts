import { z } from "zod"
import { VendorStatus } from "@prisma/client"

export const vendorSchema = z.object({
  vendorName: z.string().min(2, "Vendor name must be at least 2 characters").max(100, "Vendor name is too long"),
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(100, "Company name is too long"),
  category: z.string().min(1, "Category is required"),
  gstNumber: z.string()
    .toUpperCase()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST format (e.g. 27AAAAA1111A1Z1)"),
  panNumber: z.string()
    .toUpperCase()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g. AAAAA1111A)"),
  contactPerson: z.string().min(2, "Contact person name is required").max(100),
  phone: z.string().min(6, "Phone number must be at least 6 digits").max(20, "Phone number is too long"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address must be at least 5 characters").max(500, "Address is too long"),
  country: z.string().min(1, "Country is required"),
  status: z.nativeEnum(VendorStatus),
  notes: z.string().max(1000, "Notes must be under 1000 characters").optional().or(z.literal("")),
})

export type VendorFormValues = z.infer<typeof vendorSchema>

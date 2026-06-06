import { z } from "zod"

export const rfqItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required").max(100, "Item name is too long"),
  quantity: z
    .number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" })
    .positive("Quantity must be greater than zero"),
  unit: z.string().min(1, "Unit is required").max(20, "Unit is too long"),
  estimatedPrice: z
    .number()
    .nonnegative("Estimated price cannot be negative")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  specifications: z.string().max(500, "Specifications must be under 500 characters").optional(),
})

export const rfqSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters"),
  category: z.string().min(1, "Category is required"),
  deadline: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val),
    z.date().refine((date) => date > new Date(), {
      message: "Deadline must be in the future",
    })
  ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be under 2000 characters"),
  items: z.array(rfqItemSchema).min(1, "At least one line item is required"),
  vendorIds: z.array(z.string()).default([]),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileType: z.string(),
      })
    )
    .default([]),
})

export const rfqDraftSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters"),
  category: z.string().min(1, "Category is required"),
  deadline: z.preprocess(
    (val) => (typeof val === "string" && val ? new Date(val) : val),
    z.date().optional().or(z.literal("")).or(z.literal(undefined)).or(z.literal(null))
  ).optional(),
  description: z
    .string()
    .max(2000, "Description must be under 2000 characters")
    .optional()
    .default(""),
  items: z.array(rfqItemSchema).optional().default([]),
  vendorIds: z.array(z.string()).default([]),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileType: z.string(),
      })
    )
    .default([]),
})

export type RFQItemValues = z.infer<typeof rfqItemSchema>
export type RFQFormValues = z.infer<typeof rfqSchema>
export type RFQDraftFormValues = z.infer<typeof rfqDraftSchema>

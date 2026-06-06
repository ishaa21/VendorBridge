"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import * as Lucide from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { rfqSchema, type RFQFormValues, type RFQItemValues } from "@/lib/validators/rfq"
import { createRFQ, updateRFQ } from "@/actions/rfqs"
import { cn } from "@/lib/utils"

interface Vendor {
  id: string
  vendorName: string
  email: string
  category: string
  contactPerson: string
}

interface CreateRFQFormProps {
  initialVendors: Vendor[]
  initialRFQ?: any
}

export default function CreateRFQForm({ initialVendors, initialRFQ }: CreateRFQFormProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  
  // Custom states that feed into form values
  const [lineItems, setLineItems] = useState<RFQItemValues[]>(initialRFQ?.items || [])
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>(() => {
    if (initialRFQ?.invited) {
      return initialRFQ.invited.map((inv: any) => inv.vendor).filter(Boolean)
    }
    return []
  })
  const [attachments, setAttachments] = useState<{ fileName: string; fileUrl: string; fileType: string }[]>(initialRFQ?.attachments || [])
  
  // UI states
  const [vendorSearch, setVendorSearch] = useState("")
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitType, setSubmitType] = useState<"draft" | "publish" | null>(null)
  
  // Item modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)
  const [modalItemName, setModalItemName] = useState("")
  const [modalQuantity, setModalQuantity] = useState("")
  const [modalUnit, setModalUnit] = useState("Units")
  const [modalEstPrice, setModalEstPrice] = useState("")
  const [modalSpecs, setModalSpecs] = useState("")
  const [itemModalErrors, setItemModalErrors] = useState<Record<string, string>>({})

  // Confirmation dialog states
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // React Hook Form
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(rfqSchema) as any,
    defaultValues: {
      title: initialRFQ?.title || "",
      category: initialRFQ?.category || "",
      deadline: initialRFQ?.deadline ? new Date(initialRFQ.deadline).toISOString().split("T")[0] : undefined,
      description: initialRFQ?.description || "",
      items: initialRFQ?.items || [],
      vendorIds: initialRFQ?.invited?.map((inv: any) => inv.vendorId) || [],
      attachments: initialRFQ?.attachments || [],
    }
  })

  // Next Step validation check
  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Validate Step 1 fields
      const isDetailsValid = await trigger(["title", "category", "deadline", "description"])
      
      if (!isDetailsValid) {
        toast.error("Please fill in all required RFQ details correctly.")
        return
      }

      if (lineItems.length === 0) {
        toast.error("Please add at least one line item before proceeding.")
        return
      }

      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(3)
    }
  }

  // Prev Step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // --- Line Items CRUD ---
  const openAddItemModal = () => {
    setEditingItemIndex(null)
    setModalItemName("")
    setModalQuantity("")
    setModalUnit("Units")
    setModalEstPrice("")
    setModalSpecs("")
    setItemModalErrors({})
    setIsItemModalOpen(true)
  }

  const openEditItemModal = (index: number) => {
    const item = lineItems[index]
    setEditingItemIndex(index)
    setModalItemName(item.itemName)
    setModalQuantity(item.quantity.toString())
    setModalUnit(item.unit)
    setModalEstPrice(item.estimatedPrice ? item.estimatedPrice.toString() : "")
    setModalSpecs(item.specifications || "")
    setItemModalErrors({})
    setIsItemModalOpen(true)
  }

  const handleSaveItem = () => {
    const errs: Record<string, string> = {}
    if (!modalItemName.trim()) errs.itemName = "Item name is required"
    if (!modalQuantity || parseFloat(modalQuantity) <= 0) errs.quantity = "Quantity must be greater than 0"
    if (!modalUnit.trim()) errs.unit = "Unit is required"
    
    if (Object.keys(errs).length > 0) {
      setItemModalErrors(errs)
      return
    }

    const itemData: RFQItemValues = {
      itemName: modalItemName.trim(),
      quantity: parseFloat(modalQuantity),
      unit: modalUnit.trim(),
      estimatedPrice: modalEstPrice ? parseFloat(modalEstPrice) : undefined,
      specifications: modalSpecs.trim() || undefined,
    }

    if (editingItemIndex !== null) {
      // Update
      const updated = [...lineItems]
      updated[editingItemIndex] = itemData
      setLineItems(updated)
      toast.success("Line item updated.")
    } else {
      // Create
      setLineItems([...lineItems, itemData])
      toast.success("Line item added.")
    }

    setIsItemModalOpen(false)
  }

  const handleDeleteItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index)
    setLineItems(updated)
    toast.success("Line item removed.")
  }

  // --- Vendors Assignment ---
  const handleSelectVendor = (vendor: Vendor) => {
    if (!selectedVendors.some((v) => v.id === vendor.id)) {
      setSelectedVendors([...selectedVendors, vendor])
      toast.success(`${vendor.vendorName} assigned to RFQ.`)
    }
    setVendorSearch("")
  }

  const handleRemoveVendor = (vendorId: string) => {
    setSelectedVendors(selectedVendors.filter((v) => v.id !== vendorId))
    toast.success("Vendor assignment removed.")
  }

  const filteredVendors = initialVendors.filter(
    (v) =>
      !selectedVendors.some((sv) => sv.id === v.id) &&
      (v.vendorName.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        v.category.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        v.email.toLowerCase().includes(vendorSearch.toLowerCase()))
  )

  // --- Attachments Drag & Drop Uploads ---
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
      "image/png",
      "image/jpeg",
    ]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" has an unsupported format. Supported formats: PDF, DOCX, XLSX, PNG, JPG.`)
        continue
      }

      // Add to uploading list
      setUploadingFiles((prev) => [...prev, { name: file.name, progress: 0 }])

      try {
        const formData = new FormData()
        formData.append("file", file)

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((up) => {
              if (up.name === file.name) {
                const newProgress = Math.min(up.progress + 15, 90)
                return { ...up, progress: newProgress }
              }
              return up
            })
          )
        }, 150)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const data = await response.json()

        if (data.success) {
          // Completed upload progress
          setUploadingFiles((prev) =>
            prev.map((up) => (up.name === file.name ? { ...up, progress: 100 } : up))
          )

          // Add to attachments state
          setAttachments((prev) => [
            ...prev,
            { fileName: data.fileName, fileUrl: data.fileUrl, fileType: data.fileType },
          ])

          // Clean uploading list after 1s
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((up) => up.name !== file.name))
          }, 1000)

          toast.success(`File "${file.name}" uploaded successfully.`)
        } else {
          throw new Error(data.error || "Upload failed")
        }
      } catch (err) {
        console.error("File upload error:", err)
        setUploadingFiles((prev) => prev.filter((up) => up.name !== file.name))
        toast.error(`Failed to upload file "${file.name}".`)
      }
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index))
    toast.success("Attachment file removed.")
  }

  // Drag over
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Drop files
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }

  // --- Final Save & Submit workflows ---
  const executeRFQCreation = async (submitNow: boolean) => {
    setIsSubmitting(true)
    
    // Construct final form payload
    const formValues: any = {
      title: getValues("title"),
      category: getValues("category"),
      deadline: getValues("deadline") ? new Date(getValues("deadline")) : undefined,
      description: getValues("description"),
      items: lineItems,
      vendorIds: selectedVendors.map((v) => v.id),
      attachments: attachments,
    }

    try {
      const result = initialRFQ
        ? await updateRFQ(initialRFQ.id, formValues, submitNow)
        : await createRFQ(formValues, submitNow)
      
      if (result.success) {
        toast.success(result.message)
        router.push("/dashboard/rfqs")
      } else {
        toast.error(result.message || "Failed to process request.")
      }
    } catch (err) {
      console.error(err)
      toast.error("An unexpected error occurred during submission.")
    } finally {
      setIsSubmitting(false)
      setShowConfirmModal(false)
    }
  }

  // Trigger Save As Draft (doesn't require strict validations, but needs title)
  const handleSaveDraft = async () => {
    const titleVal = getValues("title")
    const categoryVal = getValues("category")
    
    if (!titleVal || !categoryVal) {
      toast.error("Please provide at least an RFQ Title and Category to save as draft.")
      return
    }

    setSubmitType("draft")
    executeRFQCreation(false)
  }

  // Trigger Send to Vendors
  const handlePublishClick = () => {
    if (selectedVendors.length === 0) {
      toast.error("Please assign at least one vendor to send the RFQ.")
      return
    }
    setSubmitType("publish")
    setShowConfirmModal(true)
  }

  return (
    <div className="space-y-6">
      {/* 3-Step Wizard Navigation Indicator */}
      <div className="bg-card/50 border border-border/40 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {[
            { step: 1, label: "RFQ Information", sub: "Basic Details & Line Items" },
            { step: 2, label: "Vendor Assignment", sub: "Select Suppliers & Attach Files" },
            { step: 3, label: "Review & Submit", sub: "Confirm Details & Dispatch" },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center w-full sm:w-auto">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300",
                    currentStep === item.step
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-105"
                      : currentStep > item.step
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {currentStep > item.step ? (
                    <Lucide.Check className="h-4.5 w-4.5 stroke-[3]" />
                  ) : (
                    item.step
                  )}
                </div>
                <div className="text-left">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-none",
                      currentStep === item.step ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
                </div>
              </div>
              {index < 2 && (
                <div className="hidden lg:block h-[1px] w-12 xl:w-20 bg-border/60 mx-6" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Details and Items */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* RFQ Details Form */}
          <Card className="glass-card border-border/50 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lucide.FileEdit className="h-5 w-5 text-emerald-500" />
                RFQ Details
              </CardTitle>
              <CardDescription>
                Provide general information for this request for quotation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  RFQ Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="e.g. Office Furniture Procurement Q2"
                  className={cn("bg-background/50", errors.title && "border-destructive")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <Lucide.AlertCircle className="h-3 w-3" />
                    {(errors.title as any)?.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    id="category"
                    {...register("category")}
                    className={cn("bg-background/50", errors.category && "border-destructive")}
                  >
                    <option value="">Select Category</option>
                    <option value="Furniture">Furniture</option>
                    <option value="IT Equipment">IT Equipment</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Services">Services</option>
                  </Select>
                  {errors.category && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <Lucide.AlertCircle className="h-3 w-3" />
                      {(errors.category as any)?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Deadline <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    {...register("deadline")}
                    className={cn("bg-background/50", errors.deadline && "border-destructive")}
                  />
                  {errors.deadline && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <Lucide.AlertCircle className="h-3 w-3" />
                      {(errors.deadline as any)?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Detailed specifications, delivery rules, warranty expectations..."
                  rows={6}
                  className={cn("bg-background/50 min-h-[140px]", errors.description && "border-destructive")}
                />
                {errors.description && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <Lucide.AlertCircle className="h-3 w-3" />
                    {(errors.description as any)?.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items Panel */}
          <Card className="glass-card border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lucide.ListPlus className="h-5 w-5 text-emerald-500" />
                  Line Items ({lineItems.length})
                </CardTitle>
                <CardDescription>
                  List materials/services required for quotes.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddItemModal}
                className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/5 cursor-pointer"
              >
                <Lucide.Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/40 rounded-xl bg-card/10">
                  <Lucide.ListPlus className="h-10 w-10 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-semibold">No line items added yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Click the &apos;Add Item&apos; button to include items required for bidding.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/40 rounded-xl">
                  <table className="w-full text-sm border-collapse text-left">
                    <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                      <tr>
                        <th className="p-3">Item Name</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3">Unit</th>
                        <th className="p-3 text-right">Est. Price</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {lineItems.map((item, index) => (
                        <tr key={index} className="hover:bg-accent/30 transition-colors">
                          <td className="p-3 font-medium truncate max-w-[150px]">{item.itemName}</td>
                          <td className="p-3 text-right font-mono">{item.quantity}</td>
                          <td className="p-3">{item.unit}</td>
                          <td className="p-3 text-right font-mono">
                            {item.estimatedPrice ? `$${item.estimatedPrice.toLocaleString()}` : "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => openEditItemModal(index)}
                              >
                                <Lucide.Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                                onClick={() => handleDeleteItem(index)}
                              >
                                <Lucide.Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: Vendor Assignment and Attachments */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assign Vendors Panel */}
          <Card className="glass-card border-border/50 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lucide.Users className="h-5 w-5 text-emerald-500" />
                Assign Vendors
              </CardTitle>
              <CardDescription>
                Assign active vendors to receive email invites for this RFQ.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Lucide.Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by vendor name, category, or email..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>

              {/* Suggestions Dropdown */}
              {vendorSearch && (
                <div className="relative">
                  <div className="absolute z-10 w-full mt-1 border border-border bg-popover text-popover-foreground rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-border/40">
                    {filteredVendors.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground text-center">No active vendors match your search.</p>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <button
                          key={vendor.id}
                          type="button"
                          onClick={() => handleSelectVendor(vendor)}
                          className="w-full p-2.5 text-left text-sm flex items-center justify-between hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="font-semibold">{vendor.vendorName}</p>
                            <p className="text-xs text-muted-foreground">{vendor.email}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted/80 border font-medium">
                            {vendor.category}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Vendors list */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned Vendors ({selectedVendors.length})
                </Label>

                {selectedVendors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border/40 rounded-xl bg-card/10 text-center text-muted-foreground">
                    <Lucide.Users2 className="h-8 w-8 stroke-1 mb-1.5" />
                    <p className="text-xs font-semibold">No vendors assigned yet</p>
                    <p className="text-[10px] max-w-xs mt-0.5">
                      Search above to select active suppliers. Email invitations will be sent automatically.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 relative group transition-all"
                      >
                        <div className="truncate pr-4">
                          <p className="text-sm font-semibold truncate">{vendor.vendorName}</p>
                          <p className="text-xs text-muted-foreground truncate">{vendor.email}</p>
                          <span className="inline-block text-[10px] mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                            {vendor.category}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveVendor(vendor.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer"
                        >
                          <Lucide.X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments Panel */}
          <Card className="glass-card border-border/50 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lucide.Paperclip className="h-5 w-5 text-emerald-500" />
                Attachments
              </CardTitle>
              <CardDescription>
                Attach supplementary documentation (PDF, Word, Excel, Images).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={onDragOver}
                onDrop={onDrop}
                className="border-2 border-dashed border-border/40 hover:border-emerald-500/60 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-card/10 group"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Lucide.UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                </div>
                <h4 className="text-sm font-semibold mt-3">Drag & drop files here, or click to upload</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Supported formats: PDF, DOCX, XLSX, PNG, JPG (Max 5MB per file)
                </p>
              </div>

              {/* Upload progress list */}
              {uploadingFiles.length > 0 && (
                <div className="space-y-2 border border-border/40 rounded-xl p-3 bg-muted/20">
                  <h5 className="text-xs font-semibold uppercase text-muted-foreground">Uploading files...</h5>
                  {uploadingFiles.map((upFile, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="truncate max-w-[200px]">{upFile.name}</span>
                        <span>{upFile.progress}%</span>
                      </div>
                      <Progress value={upFile.progress} className="h-1 bg-muted indicatorClassName bg-emerald-500" />
                    </div>
                  ))}
                </div>
              )}

              {/* Attachment File Previews */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Uploaded Files ({attachments.length})
                </Label>

                {attachments.length === 0 ? (
                  <div className="py-6 border border-dashed border-border/40 rounded-xl text-center text-muted-foreground text-xs">
                    No attachments uploaded.
                  </div>
                ) : (
                  <div className="divide-y divide-border/20 border border-border/40 rounded-xl overflow-hidden bg-background/50">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 hover:bg-accent/20 transition-colors">
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 bg-muted rounded-lg text-emerald-500 shrink-0">
                            {file.fileType.includes("pdf") ? (
                              <Lucide.FileText className="h-5 w-5" />
                            ) : file.fileType.includes("sheet") || file.fileName.endsWith(".xlsx") ? (
                              <Lucide.FileSpreadsheet className="h-5 w-5" />
                            ) : file.fileType.includes("image") ? (
                              <Lucide.FileImage className="h-5 w-5" />
                            ) : (
                              <Lucide.FileCode className="h-5 w-5" />
                            )}
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold truncate leading-tight">{file.fileName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Securely mapped</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Lucide.Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: Review & Submit */}
      {currentStep === 3 && (
        <div className="space-y-8 animate-fade-in">
          <Card className="glass-card border-border/50 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lucide.Eye className="h-5 w-5 text-emerald-500" />
                Review RFQ Details
              </CardTitle>
              <CardDescription>
                Please review your request configuration before finalizing and dispatching to selected vendors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Top info section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-border/40 pb-6">
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RFQ Title</h5>
                  <p className="text-sm font-semibold mt-1">{getValues("title")}</p>
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</h5>
                  <p className="text-sm font-semibold mt-1">
                    <span className="px-2 py-0.5 bg-muted border rounded text-xs font-medium text-foreground">
                      {getValues("category")}
                    </span>
                  </p>
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline</h5>
                  <p className="text-sm font-semibold mt-1 text-destructive flex items-center gap-1.5">
                    <Lucide.Calendar className="h-4 w-4" />
                    {getValues("deadline") ? new Date(getValues("deadline")).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="border-b border-border/40 pb-6">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h5>
                <p className="text-sm mt-1.5 text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {getValues("description")}
                </p>
              </div>

              {/* Items / Vendors summary block */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Items */}
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Required Line Items ({lineItems.length})
                  </h5>
                  <div className="border border-border/40 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b border-border/40">
                        <tr>
                          <th className="p-3">Item</th>
                          <th className="p-3 text-right">Quantity</th>
                          <th className="p-3">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {lineItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-accent/10">
                            <td className="p-3 font-medium truncate max-w-[180px]">{item.itemName}</td>
                            <td className="p-3 text-right font-mono">{item.quantity}</td>
                            <td className="p-3">{item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Vendors */}
                <div className="space-y-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned Vendors ({selectedVendors.length})
                  </h5>
                  {selectedVendors.length === 0 ? (
                    <div className="p-4 border border-dashed border-border/40 rounded-xl text-center text-xs text-muted-foreground">
                      No vendors assigned (Will save as DRAFT only).
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto border border-border/40 rounded-xl p-3 bg-background/30">
                      {selectedVendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs"
                        >
                          <span className="font-medium">{vendor.vendorName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attachments */}
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4 block">
                    Attached Files ({attachments.length})
                  </h5>
                  {attachments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No attached files.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border/40 bg-background/50 text-xs truncate max-w-[200px]"
                        >
                          <Lucide.Paperclip className="h-3 w-3 text-emerald-500" />
                          <span className="truncate font-mono">{file.fileName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP NAVIGATION ACTIONS FOOTER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-6">
        <div>
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrevStep}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Lucide.ChevronLeft className="mr-2 h-4 w-4" /> Previous Step
            </Button>
          ) : (
            <div />
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="bg-emerald-500 text-white hover:bg-emerald-500/90 shadow-sm cursor-pointer w-full sm:w-auto"
            >
              Next Step <Lucide.ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleSaveDraft}
                className="border-border/60 hover:bg-secondary cursor-pointer w-full sm:w-auto"
              >
                {isSubmitting && submitType === "draft" ? (
                  <Lucide.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lucide.Save className="mr-2 h-4 w-4" />
                )}
                Save As Draft
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handlePublishClick}
                className="bg-emerald-500 text-white hover:bg-emerald-500/90 shadow-md shadow-emerald-500/20 cursor-pointer w-full sm:w-auto font-semibold"
              >
                {isSubmitting && submitType === "publish" ? (
                  <Lucide.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lucide.Send className="mr-2 h-4 w-4" />
                )}
                Save & Send To Vendors
              </Button>
            </>
          )}
        </div>
      </div>

      {/* LINE ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setIsItemModalOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border/80 rounded-xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Lucide.ListPlus className="h-5 w-5 text-emerald-500" />
              {editingItemIndex !== null ? "Edit Line Item" : "Add Line Item"}
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-name">Item Name <span className="text-destructive">*</span></Label>
                <Input
                  id="item-name"
                  placeholder="e.g. Ergonomic Office Chairs"
                  value={modalItemName}
                  onChange={(e) => setModalItemName(e.target.value)}
                  className="bg-background/50"
                />
                {itemModalErrors.itemName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <Lucide.AlertCircle className="h-3 w-3" />
                    {itemModalErrors.itemName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="item-quantity">Quantity <span className="text-destructive">*</span></Label>
                  <Input
                    id="item-quantity"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 50"
                    value={modalQuantity}
                    onChange={(e) => setModalQuantity(e.target.value)}
                    className="bg-background/50"
                  />
                  {itemModalErrors.quantity && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <Lucide.AlertCircle className="h-3 w-3" />
                      {itemModalErrors.quantity}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="item-unit">Unit <span className="text-destructive">*</span></Label>
                  <Select
                    id="item-unit"
                    value={modalUnit}
                    onChange={(e) => setModalUnit(e.target.value)}
                    className="bg-background/50"
                  >
                    <option value="Units">Units</option>
                    <option value="Kits">Kits</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Liters">Liters</option>
                    <option value="Kg">Kg</option>
                    <option value="Hours">Hours</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-price">Estimated Unit Price (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-sm text-muted-foreground font-mono">$</span>
                  <Input
                    id="item-price"
                    type="number"
                    placeholder="0.00"
                    value={modalEstPrice}
                    onChange={(e) => setModalEstPrice(e.target.value)}
                    className="pl-7 bg-background/50 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="item-specs">Specifications (Optional)</Label>
                <Textarea
                  id="item-specs"
                  placeholder="e.g. Mesh backing, high-density padding, lumbar support..."
                  value={modalSpecs}
                  onChange={(e) => setModalSpecs(e.target.value)}
                  rows={3}
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsItemModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveItem}
                className="bg-emerald-500 text-white hover:bg-emerald-500/90 cursor-pointer font-semibold"
              >
                Save Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setShowConfirmModal(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border/80 rounded-xl shadow-2xl p-6 text-center animate-scale-in">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
              <Lucide.Send className="h-6 w-6 animate-pulse-soft" />
            </div>
            <h3 className="text-lg font-bold mb-2">Publish & Send RFQ?</h3>
            <p className="text-xs text-muted-foreground mb-6">
              This will publish the RFQ, invite {selectedVendors.length} vendors, and trigger system notifications and email invitations. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => executeRFQCreation(true)}
                className="bg-emerald-500 text-white hover:bg-emerald-500/90 font-semibold cursor-pointer"
              >
                {isSubmitting ? (
                  <Lucide.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Yes, Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

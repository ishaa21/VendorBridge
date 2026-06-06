import PDFDocument from "pdfkit"

export interface PDFData {
  poNumber: string
  invoiceNumber: string
  poDate: string
  invoiceDate: string
  dueDate: string
  paymentStatus: string
  organizationName: string
  orgAddress: string
  orgGstin: string
  vendorName: string
  vendorAddress: string
  vendorGstin: string
  items: Array<{
    itemName: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  cgst: number
  sgst: number
  grandTotal: number
}

export async function generateInvoicePDF(data: PDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" })
      const buffers: Buffer[] = []

      doc.on("data", buffers.push.bind(buffers))
      doc.on("end", () => {
        resolve(Buffer.concat(buffers))
      })
      doc.on("error", (err) => {
        reject(err)
      })

      // --- 1. Branding Header ---
      // Primary color: Emerald Green (#10b981)
      doc.rect(50, 45, 12, 40).fill("#10b981")
      
      doc.fillColor("#0f172a")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("VendorBridge Corp", 70, 45)
        
      doc.fillColor("#64748b")
        .fontSize(8)
        .font("Helvetica")
        .text("Enterprise Procurement & Supplier Network", 70, 68)

      // --- 2. Offline Vector QR Code ---
      const qrX = 480
      const qrY = 40
      const qrSize = 65
      
      // Outer border
      doc.strokeColor("#e2e8f0").lineWidth(1).rect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10).stroke()
      doc.rect(qrX, qrY, qrSize, qrSize).strokeColor("#000000").lineWidth(1).stroke()
      
      // Top Left Corner Finder Pattern
      doc.rect(qrX + 3, qrY + 3, 18, 18).fillColor("#000000").fill()
      doc.rect(qrX + 6, qrY + 6, 12, 12).fillColor("#ffffff").fill()
      doc.rect(qrX + 8, qrY + 8, 8, 8).fillColor("#000000").fill()
      
      // Top Right Corner Finder Pattern
      doc.rect(qrX + qrSize - 21, qrY + 3, 18, 18).fillColor("#000000").fill()
      doc.rect(qrX + qrSize - 18, qrY + 6, 12, 12).fillColor("#ffffff").fill()
      doc.rect(qrX + qrSize - 16, qrY + 8, 8, 8).fillColor("#000000").fill()
      
      // Bottom Left Corner Finder Pattern
      doc.rect(qrX + 3, qrY + qrSize - 21, 18, 18).fillColor("#000000").fill()
      doc.rect(qrX + 6, qrY + qrSize - 18, 12, 12).fillColor("#ffffff").fill()
      doc.rect(qrX + 8, qrY + qrSize - 16, 8, 8).fillColor("#000000").fill()
      
      // Simulated Data Pixels
      doc.rect(qrX + 26, qrY + 10, 4, 4).fillColor("#000000").fill()
      doc.rect(qrX + 34, qrY + 6, 6, 4).fillColor("#000000").fill()
      doc.rect(qrX + 28, qrY + 24, 8, 8).fillColor("#000000").fill()
      doc.rect(qrX + 12, qrY + 28, 4, 8).fillColor("#000000").fill()
      doc.rect(qrX + 36, qrY + 38, 10, 4).fillColor("#000000").fill()
      doc.rect(qrX + 22, qrY + 48, 6, 12).fillColor("#000000").fill()
      doc.rect(qrX + 44, qrY + 22, 12, 6).fillColor("#000000").fill()
      doc.rect(qrX + 48, qrY + 46, 12, 12).fillColor("#000000").fill()
      
      doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, 115).lineTo(545, 115).stroke()

      // --- 3. Document Title & Info ---
      doc.fillColor("#0f172a")
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("PURCHASE ORDER & INVOICE", 50, 130)

      doc.fillColor("#475569")
        .fontSize(9)
        .font("Helvetica")
        .text(`PO Number: ${data.poNumber}`, 50, 150)
        .text(`Invoice Number: ${data.invoiceNumber}`, 50, 165)
        .text(`Status: ${data.paymentStatus}`, 50, 180)

      doc.fillColor("#475569")
        .text(`PO Date: ${data.poDate}`, 350, 150)
        .text(`Invoice Date: ${data.invoiceDate}`, 350, 165)
        .text(`Due Date: ${data.dueDate}`, 350, 180)

      doc.strokeColor("#f1f5f9").lineWidth(1).moveTo(50, 200).lineTo(545, 200).stroke()

      // --- 4. Company Info (Bill To vs Supplier) ---
      const colWidth = 230
      const colGap = 35
      const startX = 50
      const startY = 215

      // Bill To Column
      doc.fillColor("#0f172a")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("BILL TO (ORGANIZATION)", startX, startY)
      
      doc.fillColor("#334155")
        .fontSize(9)
        .font("Helvetica")
        .text(data.organizationName, startX, startY + 18, { width: colWidth, lineGap: 3 })
        .text(data.orgAddress, startX, startY + 32, { width: colWidth, lineGap: 3 })
        .font("Helvetica-Bold")
        .text(`GSTIN: ${data.orgGstin}`, startX, startY + 68)

      // Vendor Column
      doc.fillColor("#0f172a")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("VENDOR (SUPPLIER)", startX + colWidth + colGap, startY)
      
      doc.fillColor("#334155")
        .fontSize(9)
        .font("Helvetica")
        .text(data.vendorName, startX + colWidth + colGap, startY + 18, { width: colWidth, lineGap: 3 })
        .text(data.vendorAddress, startX + colWidth + colGap, startY + 32, { width: colWidth, lineGap: 3 })
        .font("Helvetica-Bold")
        .text(`GSTIN: ${data.vendorGstin}`, startX + colWidth + colGap, startY + 68)

      doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, 305).lineTo(545, 305).stroke()

      // --- 5. Itemized Table ---
      const tableTop = 320
      
      // Draw Table Header Bar
      doc.rect(50, tableTop, 495, 20).fill("#10b981")
      
      // Header Labels
      doc.fillColor("#ffffff")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("Item / Description", 60, tableTop + 6)
        .text("Qty", 320, tableTop + 6, { width: 40, align: "right" })
        .text("Unit Price", 380, tableTop + 6, { width: 70, align: "right" })
        .text("Total", 470, tableTop + 6, { width: 65, align: "right" })

      let rowY = tableTop + 20
      doc.fillColor("#334155").font("Helvetica")

      data.items.forEach((item, index) => {
        // Alternating background row color
        if (index % 2 === 1) {
          doc.rect(50, rowY, 495, 20).fill("#f8fafc")
        }
        
        doc.fillColor("#334155")
          .fontSize(9)
          .text(item.itemName, 60, rowY + 6, { width: 250 })
          .text(item.quantity.toString(), 320, rowY + 6, { width: 40, align: "right" })
          .text(`$${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 380, rowY + 6, { width: 70, align: "right" })
          .text(`$${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 470, rowY + 6, { width: 65, align: "right" })
        
        rowY += 20
      })

      // Draw horizontal line below table
      doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, rowY).lineTo(545, rowY).stroke()

      // --- 6. Summary Calculations ---
      const summaryTop = rowY + 15
      const labelX = 350
      const valueX = 460
      const sumWidth = 80

      doc.fillColor("#64748b")
        .fontSize(9)
        .font("Helvetica")
        .text("Subtotal:", labelX, summaryTop)
        .text("CGST (9%):", labelX, summaryTop + 15)
        .text("SGST (9%):", labelX, summaryTop + 30)
        
      doc.fillColor("#0f172a")
        .font("Helvetica-Bold")
        .text("Grand Total:", labelX, summaryTop + 50)

      doc.fillColor("#334155")
        .font("Courier")
        .text(`$${data.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, valueX, summaryTop, { width: sumWidth, align: "right" })
        .text(`$${data.cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, valueX, summaryTop + 15, { width: sumWidth, align: "right" })
        .text(`$${data.sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, valueX, summaryTop + 30, { width: sumWidth, align: "right" })
        
      doc.fillColor("#10b981")
        .font("Helvetica-Bold")
        .text(`$${data.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, valueX, summaryTop + 50, { width: sumWidth, align: "right" })

      // --- 7. Signature Area ---
      const sigTop = summaryTop + 100
      
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(50, sigTop).lineTo(180, sigTop).stroke()
      doc.strokeColor("#cbd5e1").lineWidth(1).moveTo(415, sigTop).lineTo(545, sigTop).stroke()

      doc.fillColor("#64748b")
        .fontSize(8)
        .font("Helvetica")
        .text("Vendor Representative", 50, sigTop + 6, { width: 130, align: "center" })
        .text("Authorized Procurement Sign", 415, sigTop + 6, { width: 130, align: "center" })

      // Terminate PDF Document
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

export async function generateActivityReportPDF(logs: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" })
      const buffers: Buffer[] = []

      doc.on("data", buffers.push.bind(buffers))
      doc.on("end", () => {
        resolve(Buffer.concat(buffers))
      })
      doc.on("error", (err) => {
        reject(err)
      })

      // --- Header ---
      doc.rect(50, 45, 12, 40).fill("#10b981")
      
      doc.fillColor("#0f172a")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("VendorBridge Procurement ERP", 70, 45)
        
      doc.fillColor("#64748b")
        .fontSize(9)
        .font("Helvetica")
        .text("Activity Logs & Audit Trail Report", 70, 68)

      doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, 100).lineTo(545, 100).stroke()

      // Metadata Info
      const nowStr = new Date().toLocaleString()
      doc.fillColor("#334155")
        .fontSize(8)
        .font("Helvetica")
        .text(`Generated On: ${nowStr}`, 50, 115)
        .text(`Total Records: ${logs.length}`, 350, 115)

      // --- Table ---
      const tableTop = 140
      
      // Draw Table Header
      doc.rect(50, tableTop, 495, 20).fill("#0f172a")
      
      doc.fillColor("#ffffff")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("Timestamp", 55, tableTop + 6)
        .text("Module", 160, tableTop + 6)
        .text("Action Type", 215, tableTop + 6)
        .text("Description", 280, tableTop + 6)
        .text("User", 480, tableTop + 6)

      let rowY = tableTop + 20
      doc.font("Helvetica").fontSize(7.5)

      logs.forEach((log, index) => {
        // Multi-page page-break check
        if (rowY > 750) {
          doc.addPage()
          rowY = 50
          
          // Re-draw Table Header on new page
          doc.rect(50, rowY, 495, 20).fill("#0f172a")
          doc.fillColor("#ffffff")
            .fontSize(8)
            .font("Helvetica-Bold")
            .text("Timestamp", 55, rowY + 6)
            .text("Module", 160, rowY + 6)
            .text("Action Type", 215, rowY + 6)
            .text("Description", 280, rowY + 6)
            .text("User", 480, rowY + 6)
            
          rowY += 20
          doc.font("Helvetica").fontSize(7.5)
        }

        // Row background
        if (index % 2 === 1) {
          doc.rect(50, rowY, 495, 20).fill("#f8fafc")
        }

        const dateStr = new Date(log.createdAt).toLocaleString()
        const userName = `${log.user.firstName} ${log.user.lastName}`

        doc.fillColor("#334155")
          .text(dateStr, 55, rowY + 6, { width: 100 })
          .text(log.module, 160, rowY + 6, { width: 50 })
          .text(log.actionType, 215, rowY + 6, { width: 60 })
          .text(log.description, 280, rowY + 6, { width: 195 })
          .text(userName, 480, rowY + 6, { width: 60 })

        rowY += 20
      })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

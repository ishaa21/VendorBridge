import nodemailer from "nodemailer"

interface RFQEmailParams {
  to: string
  vendorName: string
  rfqNumber: string
  rfqTitle: string
  deadline: string
  vendorPortalLink: string
}

export async function sendRFQInvitationEmail({
  to,
  vendorName,
  rfqNumber,
  rfqTitle,
  deadline,
  vendorPortalLink,
}: RFQEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.SMTP_HOST || "smtp.ethereal.email"
    const port = parseInt(process.env.SMTP_PORT || "587", 10)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.EMAIL_FROM || "VendorBridge <noreply@vendorbridge.com>"

    // Log the action locally
    console.log(`✉️ Preparing invitation email for ${vendorName} (${to}) for RFQ: ${rfqNumber}`)

    // If SMTP details are empty, run in simulated demo mode
    if (!user || !pass) {
      console.log(
        `ℹ️ SMTP credentials not fully configured in environment. Simulating email delivery. Link: ${vendorPortalLink}`
      )
      return { success: true }
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    })

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #0f766e; margin: 0; font-size: 24px; font-weight: bold;">VendorBridge ERP</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Procurement & Vendor Management Portal</p>
        </div>
        
        <div style="padding: 10px 0;">
          <p style="font-size: 16px; line-height: 1.5; color: #334155;">Dear <strong>${vendorName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.5; color: #334155;">You have been invited by our procurement team to submit a quotation for the following Request for Quotation (RFQ):</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569; width: 120px;">RFQ Number:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${rfqNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569;">RFQ Title:</td>
                <td style="padding: 6px 0; color: #0f172a;">${rfqTitle}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569;">Deadline:</td>
                <td style="padding: 6px 0; color: #dc2626; font-weight: 600;">${deadline}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 15px; line-height: 1.5; color: #334155;">Please review the RFQ specifications, line items, and attach your quotation documents in the vendor portal before the submission deadline.</p>
          
          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${vendorPortalLink}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.06);">
              View RFQ & Submit Quotation
            </a>
          </div>
          
          <p style="font-size: 13px; color: #64748b; margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            If the button doesn't work, copy and paste this link in your browser:<br>
            <a href="${vendorPortalLink}" style="color: #3b82f6; word-break: break-all;">${vendorPortalLink}</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0 0 5px 0;">This is an automated notification from VendorBridge. Please do not reply directly to this email.</p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} VendorBridge Corp. All rights reserved.</p>
        </div>
      </div>
    `

    const mailOptions = {
      from,
      to,
      subject: `[Invitation] Action Required: Submit Quotation for ${rfqNumber} - ${rfqTitle}`,
      html: htmlContent,
      text: `Dear ${vendorName},\n\nYou have been invited to submit a quotation for RFQ: ${rfqNumber} - ${rfqTitle}.\nDeadline: ${deadline}.\n\nPlease login to the VendorBridge portal to submit your quotation:\n${vendorPortalLink}`,
    }

    await transporter.sendMail(mailOptions)
    console.log(`✅ Email sent successfully to ${to}`)
    return { success: true }
  } catch (error) {
    console.error("❌ Failed to send RFQ invitation email:", error)
    // Return success: false, but in active use we'll log it and let the RFQ save successfully
    return { success: false, error: (error as Error).message }
  }
}

interface InvoiceEmailParams {
  to: string
  vendorName: string
  invoiceNumber: string
  poNumber: string
  grandTotal: number
  pdfBuffer: Buffer
}

export async function sendInvoiceEmailWithAttachment({
  to,
  vendorName,
  invoiceNumber,
  poNumber,
  grandTotal,
  pdfBuffer,
}: InvoiceEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.SMTP_HOST || "smtp.ethereal.email"
    const port = parseInt(process.env.SMTP_PORT || "587", 10)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.EMAIL_FROM || "VendorBridge <noreply@vendorbridge.com>"

    console.log(`✉️ Preparing Invoice/PO email for ${vendorName} (${to}) for Invoice: ${invoiceNumber}`)

    if (!user || !pass) {
      console.log(
        `ℹ️ SMTP credentials not fully configured in environment. Simulating invoice email delivery. PDF Attached (Size: ${pdfBuffer.length} bytes).`
      )
      return { success: true }
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #0f766e; margin: 0; font-size: 24px; font-weight: bold;">VendorBridge ERP</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Purchase Order & Billing Department</p>
        </div>
        
        <div style="padding: 10px 0;">
          <p style="font-size: 16px; line-height: 1.5; color: #334155;">Dear <strong>${vendorName}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.5; color: #334155;">A new Purchase Order and Invoice has been generated and approved for your recent quotation. Please find details below:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569; width: 150px;">Purchase Order:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${poNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569;">Invoice Number:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold; color: #475569;">Total Value:</td>
                <td style="padding: 6px 0; color: #10b981; font-weight: bold; font-size: 16px;">$${grandTotal.toLocaleString()}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 15px; line-height: 1.5; color: #334155;">The official signed **PDF document** has been automatically compiled and attached to this email for your bookkeeping records and audit trails.</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0 0 5px 0;">This is an automated notification from VendorBridge. Please do not reply directly to this email.</p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} VendorBridge Corp. All rights reserved.</p>
        </div>
      </div>
    `

    const mailOptions = {
      from,
      to,
      subject: `[PO & Invoice Issued] ${poNumber} / ${invoiceNumber} - VendorBridge Corp`,
      html: htmlContent,
      text: `Dear ${vendorName},\n\nA new Purchase Order (${poNumber}) and Invoice (${invoiceNumber}) has been generated and approved.\nTotal Value: $${grandTotal.toLocaleString()}.\nPlease find the attached official PDF document.`,
      attachments: [
        {
          filename: `${poNumber}_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    }

    await transporter.sendMail(mailOptions)
    console.log(`✅ Invoice email sent successfully to ${to} with PDF attachment`)
    return { success: true }
  } catch (error) {
    console.error("❌ Failed to send Invoice email:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.SMTP_HOST || "smtp.ethereal.email"
    const port = parseInt(process.env.SMTP_PORT || "587", 10)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.EMAIL_FROM || "VendorBridge <noreply@vendorbridge.com>"

    console.log(`✉️ Preparing password reset email for ${to}`)

    if (!user || !pass) {
      console.log(
        `ℹ️ SMTP credentials not fully configured in environment. Simulating password reset email delivery. Link: ${resetLink}`
      )
      return { success: true }
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px;">
          <h1 style="color: #0f766e; margin: 0; font-size: 24px; font-weight: bold;">VendorBridge ERP</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">User Account Administration</p>
        </div>
        
        <div style="padding: 10px 0;">
          <p style="font-size: 16px; line-height: 1.5; color: #334155;">Hello,</p>
          <p style="font-size: 16px; line-height: 1.5; color: #334155;">We received a request to reset the password for your VendorBridge user account. Please click the button below to set a new password:</p>
          
          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${resetLink}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.06);">
              Reset Account Password
            </a>
          </div>
          
          <p style="font-size: 14px; line-height: 1.5; color: #475569;">Note: This link is valid for **1 hour** only. If you did not make this request, you can safely ignore this email.</p>
          
          <p style="font-size: 13px; color: #64748b; margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
            If the button doesn't work, copy and paste this link in your browser:<br>
            <a href="${resetLink}" style="color: #3b82f6; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0 0 5px 0;">This is an automated notification from VendorBridge. Please do not reply directly to this email.</p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} VendorBridge Corp. All rights reserved.</p>
        </div>
      </div>
    `

    const mailOptions = {
      from,
      to,
      subject: `[VendorBridge] Password Reset Request`,
      html: htmlContent,
      text: `Hello,\n\nWe received a request to reset your VendorBridge account password. Click the link below to set a new password:\n${resetLink}\n\nThis link is valid for 1 hour.`,
    }

    await transporter.sendMail(mailOptions)
    console.log(`✅ Password reset email successfully dispatched to ${to}`)
    return { success: true }
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error)
    return { success: false, error: (error as Error).message }
  }
}

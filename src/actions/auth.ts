"use server"

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { registerSchema, type RegisterFormValues } from "@/lib/validators/auth"
import { Role } from "@prisma/client"
import { recordActivityLog } from "@/lib/audit-logger"
import { dbErrorMessage } from "@/lib/errors"

export type ActionResult = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export async function registerUser(
  data: RegisterFormValues
): Promise<ActionResult> {
  try {
    // Validate input
    const validatedFields = registerSchema.safeParse(data)

    if (!validatedFields.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedFields.error.flatten().fieldErrors as Record<string, string[]>,
      }
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      country,
      additionalInfo,
      profileImage,
    } = validatedFields.data

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return {
        success: false,
        message: "An account with this email already exists",
        errors: { email: ["An account with this email already exists"] },
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        role,
        country,
        additionalInfo: additionalInfo || null,
        profileImage: profileImage || null,
        isActive: true,
      },
    })

    // Log activity
    await recordActivityLog({
      userId: user.id,
      action: "USER_REGISTERED",
      actionType: "Login",
      module: "Auth",
      entityId: user.id,
      entityType: "User",
      description: `New user ${firstName} ${lastName} registered with role ${role}.`,
      metadata: {
        role,
        email: email.toLowerCase(),
      },
    })

    if (role === Role.VENDOR) {
      const existingVendor = await prisma.vendor.findFirst({
        where: { email: email.toLowerCase(), userId: null },
      })

      if (existingVendor) {
        await prisma.vendor.update({
          where: { id: existingVendor.id },
          data: { userId: user.id },
        })
      }
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Welcome to VendorBridge!",
        message: `Hello ${firstName}, your account has been created successfully. You can now access the platform with your ${role.replace("_", " ").toLowerCase()} privileges.`,
        type: "SUCCESS",
        link: "/dashboard",
      },
    })

    return {
      success: true,
      message: "Account created successfully! You can now sign in.",
    }
  } catch (error) {
    console.error("Registration error:", error)
    return {
      success: false,
      message: dbErrorMessage(error),
    }
  }
}

export async function forgotPassword(email: string): Promise<ActionResult> {
  try {
    const formattedEmail = email.trim().toLowerCase()

    // FIX: Check user existence FIRST before writing anything to the DB.
    // This prevents token pollution for emails that don't belong to any account.
    const user = await prisma.user.findUnique({
      where: { email: formattedEmail },
    })

    // Always return a generic success message to prevent email enumeration attacks.
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      }
    }

    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.verificationToken.deleteMany({
      where: { identifier: formattedEmail },
    })
    await prisma.verificationToken.create({
      data: { identifier: formattedEmail, token, expires },
    })

    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(formattedEmail)}`
    const { sendPasswordResetEmail } = await import("@/lib/email")
    await sendPasswordResetEmail(formattedEmail, resetLink)

    await recordActivityLog({
      userId: user.id,
      action: "USER_PASSWORD_RESET_REQUESTED",
      actionType: "PasswordReset",
      module: "Auth",
      entityId: user.id,
      entityType: "User",
      description: `Password reset request registered for user ${user.firstName} ${user.lastName} (${formattedEmail}).`,
      metadata: { email: formattedEmail },
    })

    return {
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    }
  } catch (error) {
    console.error("Forgot password action error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}

export async function resetPassword(
  data: any
): Promise<ActionResult> {
  try {
    const { token, email, password } = data
    const formattedEmail = email.trim().toLowerCase()

    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: formattedEmail,
        token,
        expires: { gte: new Date() },
      },
    })

    if (!resetToken) {
      return {
        success: false,
        message: "The password reset link is invalid or has expired. Please request a new one.",
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { email: formattedEmail },
        data: { passwordHash },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: formattedEmail, token },
      }),
    ])

    const updatedUser = await prisma.user.findUnique({
      where: { email: formattedEmail },
    })

    if (updatedUser) {
      await recordActivityLog({
        userId: updatedUser.id,
        action: "USER_PASSWORD_RESET_COMPLETED",
        actionType: "PasswordReset",
        module: "Auth",
        entityId: updatedUser.id,
        entityType: "User",
        description: `Password reset successfully completed for user ${updatedUser.firstName} ${updatedUser.lastName}.`,
        metadata: { email: formattedEmail },
      })
    }

    return {
      success: true,
      message: "Your password has been successfully reset! You can now sign in.",
    }
  } catch (error) {
    console.error("Reset password action error:", error)
    return { success: false, message: dbErrorMessage(error) }
  }
}

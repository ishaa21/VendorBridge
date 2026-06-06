"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, Loader2, ArrowLeft, CheckCircle2, XCircle } from "lucide-react"
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/validators/auth"
import { forgotPassword } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ForgotPasswordFormValues) {
    setServerError("")
    setSuccessMessage("")

    try {
      const result = await forgotPassword(data.email)

      if (!result.success) {
        setServerError(result.message)
        return
      }

      setSuccessMessage(result.message)
    } catch {
      setServerError("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Server Error */}
      {serverError && (
        <div className="animate-slide-down rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{serverError}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="animate-slide-down rounded-lg bg-success/10 border border-success/20 px-4 py-3 text-sm text-success flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold text-foreground">Link Dispatched</span>
            <p className="text-muted-foreground text-xs">{successMessage}</p>
          </div>
        </div>
      )}

      {!successMessage && (
        <>
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@vendorbridge.com"
                className="pl-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive animate-slide-down">{errors.email.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">
              Enter your email address and we will send you an inbox link to reset your password.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold tracking-wide bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending Reset Link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </>
      )}

      {/* Back to Login Link */}
      <div className="text-center pt-2">
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
          Back to Sign In
        </a>
      </div>
    </form>
  )
}

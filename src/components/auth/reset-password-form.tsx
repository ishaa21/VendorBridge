"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Loader2, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { resetPasswordSchema, type ResetPasswordFormValues, getPasswordStrength } from "@/lib/validators/auth"
import { resetPassword } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ResetPasswordFormProps {
  token: string
  email: string
}

export function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const password = watch("password")
  const passwordStrength = password ? getPasswordStrength(password) : null

  async function onSubmit(data: ResetPasswordFormValues) {
    setServerError("")
    setSuccessMessage("")

    try {
      const result = await resetPassword({
        token,
        email,
        password: data.password,
      })

      if (!result.success) {
        setServerError(result.message)
        return
      }

      setSuccessMessage(result.message)
      setTimeout(() => {
        router.push("/login")
      }, 3000)
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
            <span className="font-semibold text-foreground">Password Reset Successful</span>
            <p className="text-muted-foreground text-xs">{successMessage}</p>
            <p className="text-muted-foreground text-[10px] animate-pulse">Redirecting to login screen...</p>
          </div>
        </div>
      )}

      {!successMessage && (
        <>
          {/* New Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive animate-slide-down">{errors.password.message}</p>
            )}

            {/* Password Strength Indicator */}
            {password && passwordStrength && (
              <div className="space-y-1.5 animate-slide-down mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Password strength</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength.score <= 1 ? "text-red-500" :
                    passwordStrength.score <= 2 ? "text-orange-500" :
                    passwordStrength.score <= 3 ? "text-yellow-500" :
                    "text-green-500"
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        level <= passwordStrength.score
                          ? passwordStrength.score <= 1 ? "bg-red-500" :
                            passwordStrength.score <= 2 ? "bg-orange-500" :
                            passwordStrength.score <= 3 ? "bg-yellow-500" :
                            "bg-green-500"
                          : "bg-secondary"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {[
                    { test: password.length >= 8, label: "8+ chars" },
                    { test: /[A-Z]/.test(password), label: "Uppercase" },
                    { test: /[a-z]/.test(password), label: "Lowercase" },
                    { test: /[0-9]/.test(password), label: "Number" },
                    { test: /[^A-Za-z0-9]/.test(password), label: "Special" },
                  ].map(({ test, label }) => (
                    <span key={label} className={`text-[10px] flex items-center gap-0.5 ${test ? "text-green-500" : "text-muted-foreground"}`}>
                      {test ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
                {...register("confirmPassword")}
                aria-invalid={!!errors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive animate-slide-down">{errors.confirmPassword.message}</p>
            )}
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
                Updating Password...
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </>
      )}
    </form>
  )
}

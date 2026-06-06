"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react"
import { loginSchema, type LoginFormValues } from "@/lib/validators/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState("")
  const [failedAttempts, setFailedAttempts] = useState(0)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  const rememberMe = watch("rememberMe")

  async function onSubmit(data: LoginFormValues) {
    setServerError("")

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        const attempts = failedAttempts + 1
        setFailedAttempts(attempts)
        if (attempts >= 3) {
          setServerError(
            `Invalid email or password. ${attempts} failed attempt${attempts > 1 ? "s" : ""} — please double-check your credentials or reset your password.`
          )
        } else {
          setServerError("Invalid email or password. Please try again.")
        }
        return
      }

      if (result?.ok) {
        // FIX: Navigate to "/" instead of hard-coding "/dashboard".
        // The root page (app/page.tsx) reads the session role and redirects
        // each role to its correct landing page:
        //   ADMIN / PROCUREMENT_OFFICER → /dashboard
        //   VENDOR                      → /dashboard/vendor-portal
        //   MANAGER                     → /dashboard/approvals
        router.push("/")
        router.refresh()
      }
    } catch {
      setServerError("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Server Error */}
      {serverError && (
        <div className="animate-slide-down rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          <p>{serverError}</p>
        </div>
      )}

      {/* Email / Username Field */}
      {/* FIX: Changed type from "email" to "text" so browsers accept plain
          usernames (admin, vendor, etc.) which the backend also supports.
          inputMode="email" keeps the email keyboard on mobile devices. */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
          Email or Username
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="admin@vendorbridge.com or admin"
            className="pl-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-destructive animate-slide-down">{errors.email.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
          Password
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
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive animate-slide-down">{errors.password.message}</p>
        )}
      </div>

      {/* Remember Me & Forgot Password Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setValue("rememberMe", !!checked)}
          />
          <Label
            htmlFor="rememberMe"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Remember me
          </Label>
        </div>
        <a
          href="/forgot-password"
          className="text-sm text-primary hover:text-primary/80 transition-colors hover:underline"
        >
          Forgot Password?
        </a>
      </div>

      {/* Login Button */}
      <Button
        type="submit"
        id="login-submit-btn"
        className="w-full h-11 text-sm font-semibold tracking-wide bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      {/* Register Link */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <a
          href="/register"
          className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline"
        >
          Create Account
        </a>
      </p>
    </form>
  )
}

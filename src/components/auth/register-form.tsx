"use client"

import { useState, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import {
  Eye,
  EyeOff,
  Mail,
  Phone,
  User,
  Globe,
  Shield,
  FileText,
  Lock,
  Loader2,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
} from "lucide-react"
import {
  registerSchema,
  type RegisterFormValues,
  getPasswordStrength,
  COUNTRIES,
  ROLE_OPTIONS,
} from "@/lib/validators/auth"
import { registerUser } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"

export function RegisterForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // FIX: Separate error states — serverError is for form submission failures,
  // imageError is exclusively for profile photo issues.
  const [serverError, setServerError] = useState("")
  const [imageError, setImageError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      country: "",
      additionalInfo: "",
      profileImage: "",
    },
  })

  const password = watch("password")
  const passwordStrength = password ? getPasswordStrength(password) : null

  // FIX: Profile image is now uploaded to /api/upload immediately on selection.
  // Only the returned URL path is stored in the form (not the raw Base64).
  // This prevents multi-megabyte Base64 strings from being saved into the DB.
  async function handleProfileImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError("")

    if (!file.type.startsWith("image/")) {
      setImageError("Please upload a valid image file (JPG, PNG, GIF, WEBP)")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image size must be less than 5 MB")
      return
    }

    // Show a local preview immediately for a responsive feel
    const reader = new FileReader()
    reader.onload = (event) => {
      setProfilePreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to server — context:"registration" bypasses the auth session check
    // since the user doesn't have a session yet at registration time.
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("context", "registration")

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setImageError(result.error || "Image upload failed. Please try again.")
        setProfilePreview(null)
        setValue("profileImage", "")
        return
      }

      // Store only the URL, never the Base64 blob
      setValue("profileImage", result.fileUrl)
    } catch {
      setImageError("Image upload failed. Please check your connection and try again.")
      setProfilePreview(null)
      setValue("profileImage", "")
    } finally {
      setIsUploadingImage(false)
    }
  }

  async function onSubmit(data: RegisterFormValues) {
    setServerError("")
    setSuccessMessage("")

    try {
      const result = await registerUser(data)

      if (!result.success) {
        setServerError(result.message)
        // Surface field-level errors from the server (e.g. duplicate email)
        return
      }

      setSuccessMessage(result.message)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch {
      setServerError("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          <p>{successMessage}</p>
        </div>
      )}

      {/* Profile Image Upload */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative group cursor-pointer"
          onClick={() => !isUploadingImage && fileInputRef.current?.click()}
        >
          <div className="h-24 w-24 rounded-full bg-secondary/70 border-2 border-dashed border-border/60 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-primary/50 group-hover:bg-secondary">
            {isUploadingImage ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : profilePreview ? (
              <img
                src={profilePreview}
                alt="Profile preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          {!isUploadingImage && (
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="h-5 w-5 text-white" />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfileImageChange}
            className="hidden"
            aria-label="Upload profile photo"
            disabled={isUploadingImage}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isUploadingImage ? "Uploading…" : "Click to upload profile photo (optional)"}
        </p>
        {/* FIX: Image errors shown independently, never mixed with form errors */}
        {imageError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <XCircle className="h-3 w-3 shrink-0" />
            {imageError}
          </p>
        )}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            First Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="firstName"
              placeholder="John"
              className="pl-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
              {...register("firstName")}
              aria-invalid={!!errors.firstName}
            />
          </div>
          {errors.firstName && (
            <p className="text-xs text-destructive animate-slide-down">{errors.firstName.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="lastName"
              placeholder="Doe"
              className="pl-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
              {...register("lastName")}
              aria-invalid={!!errors.lastName}
            />
          </div>
          {errors.lastName && (
            <p className="text-xs text-destructive animate-slide-down">{errors.lastName.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="reg-email" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reg-email"
              type="email"
              placeholder="john.doe@example.com"
              className="pl-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive animate-slide-down">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              className="pl-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
              {...register("phone")}
              aria-invalid={!!errors.phone}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-destructive animate-slide-down">{errors.phone.message}</p>
          )}
        </div>

        {/* Role — FIX: wrapped in Controller so Zod enum errors propagate correctly */}
        <div className="space-y-2">
          <Label htmlFor="role" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            Role <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  id="role"
                  className="pl-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
                  aria-invalid={!!errors.role}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || undefined)}
                >
                  <option value="" disabled>Select a role</option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
          {errors.role && (
            <p className="text-xs text-destructive animate-slide-down">{errors.role.message}</p>
          )}
        </div>

        {/* Country — FIX: wrapped in Controller for consistent error handling */}
        <div className="space-y-2">
          <Label htmlFor="country" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            Country <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <Select
                  id="country"
                  className="pl-10 h-11 bg-secondary/50 border-border/50 focus:bg-background transition-colors"
                  aria-invalid={!!errors.country}
                  {...field}
                  value={field.value ?? ""}
                >
                  <option value="" disabled>Select a country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
          {errors.country && (
            <p className="text-xs text-destructive animate-slide-down">{errors.country.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="reg-password" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="reg-password"
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
            <div className="space-y-1.5 animate-slide-down">
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

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
            Confirm Password <span className="text-destructive">*</span>
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
      </div>

      {/* Additional Information - Full Width */}
      <div className="space-y-2">
        <Label htmlFor="additionalInfo" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
          Additional Information
        </Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="additionalInfo"
            placeholder="Tell us about your organization, specific requirements, or any other relevant information..."
            className="pl-10 min-h-[100px] bg-secondary/50 border-border/50 focus:bg-background transition-colors"
            {...register("additionalInfo")}
            aria-invalid={!!errors.additionalInfo}
          />
        </div>
        {errors.additionalInfo && (
          <p className="text-xs text-destructive animate-slide-down">{errors.additionalInfo.message}</p>
        )}
      </div>

      {/* Register Button */}
      <Button
        type="submit"
        id="register-submit-btn"
        className="w-full h-11 text-sm font-semibold tracking-wide bg-primary hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
        disabled={isSubmitting || isUploadingImage}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : isUploadingImage ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading Image...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      {/* Login Link */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a
          href="/login"
          className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline"
        >
          Sign In
        </a>
      </p>
    </form>
  )
}

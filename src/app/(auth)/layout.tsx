
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen auth-gradient grid-pattern flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Decorative floating elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/3 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 right-1/3 h-48 w-48 rounded-full bg-success/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      {/* FIX: children (auth card) now renders ABOVE the footer */}
      <div className="relative z-10 w-full animate-fade-in flex flex-col items-center">
        {children}
        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} VendorBridge ERP. All rights reserved.
        </p>
      </div>
    </div>
  )
}

import Link from "next/link"
import { FileQuestion, Home } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted border border-border">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <h2 className="text-xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-sm text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className={buttonVariants({ variant: "outline", className: "gap-2" })}
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  )
}

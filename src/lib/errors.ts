export const DB_ERROR_MESSAGE =
  "Database connection failed. Ensure MySQL is running and DATABASE_URL is configured, then run: npm run db:push"

export function isDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { code?: string; message?: string }
  return (
    e.code === "P1001" ||
    e.code === "P1003" ||
    e.code === "P1017" ||
    Boolean(e.message?.includes("Can't reach database"))
  )
}

export function dbErrorMessage(error: unknown): string {
  if (isDbConnectionError(error)) return DB_ERROR_MESSAGE
  if (error instanceof Error) return error.message
  return "An unexpected database error occurred."
}

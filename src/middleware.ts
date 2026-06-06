import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Where each role lands after a successful login.
// VENDOR gets its own portal; MANAGER goes straight to the approvals queue.
const roleRedirectMap: Record<string, string> = {
  ADMIN: '/dashboard',
  PROCUREMENT_OFFICER: '/dashboard',
  VENDOR: '/dashboard/vendor-portal',
  MANAGER: '/dashboard/approvals',
}

// Route-level RBAC: maps path prefixes → the roles allowed to access them.
// Any authenticated user NOT in the allowed list is bounced to /dashboard.
const roleRouteAccess: Record<string, string[]> = {
  '/dashboard/approvals':      ['MANAGER', 'ADMIN'],
  '/dashboard/vendors/new':    ['ADMIN', 'PROCUREMENT_OFFICER'],
  // FIX: vendor-portal was previously unguarded — any logged-in role could
  // navigate there directly. Now only VENDOR and ADMIN can access it.
  '/dashboard/vendor-portal':  ['VENDOR', 'ADMIN'],
  // FIX: RFQ creation restricted to procurement staff and admins.
  '/dashboard/rfqs/new':       ['ADMIN', 'PROCUREMENT_OFFICER'],
  '/dashboard/vendors':        ['ADMIN', 'PROCUREMENT_OFFICER'],
  '/dashboard/reports':        ['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER'],
  '/dashboard/quotations/submit': ['VENDOR'],
}

export default auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth
  const pathname = nextUrl.pathname

  const isProtectedRoute = pathname.startsWith('/dashboard')
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password')

  // Authenticated users on any auth page → redirect based on role
  if (isAuthenticated && isAuthPage) {
    const role = req.auth?.user?.role as string
    const redirectPath = roleRedirectMap[role] ?? '/dashboard'
    return NextResponse.redirect(new URL(redirectPath, nextUrl))
  }

  // Unauthenticated users on protected routes → redirect to /login
  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL('/login', nextUrl)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based route access for authenticated users
  if (isAuthenticated && isProtectedRoute) {
    const role = req.auth?.user?.role as string

    for (const [route, allowedRoles] of Object.entries(roleRouteAccess)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
        // Redirect VENDOR to vendor-portal, others to main dashboard
        const fallback = role === 'VENDOR' ? '/dashboard/vendor-portal' : '/dashboard'
        return NextResponse.redirect(new URL(fallback, nextUrl))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
}

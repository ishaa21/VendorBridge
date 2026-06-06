import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role as Role)) {
    redirect('/dashboard')
  }
  return user
}

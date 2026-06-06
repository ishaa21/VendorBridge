import NextAuth, { type User } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Role } from '@prisma/client'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const { auth, signIn, signOut, handlers } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        let targetEmail = email.toLowerCase()
        if (!targetEmail.includes("@")) {
          // Resolve standard usernames to email addresses
          if (targetEmail === "admin") targetEmail = "admin@vendorbridge.com"
          else if (targetEmail === "procurement") targetEmail = "procurement@vendorbridge.com"
          else if (targetEmail === "manager") targetEmail = "manager@vendorbridge.com"
          else if (targetEmail === "vendor") targetEmail = "vendor@vendorbridge.com"
          else {
            targetEmail = `${targetEmail}@vendorbridge.com`
          }
        }

        const user = await prisma.user.findUnique({
          where: { email: targetEmail },
        })

        if (!user || !user.isActive) return null

        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        if (!isValidPassword) return null

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as User
        token.id = u.id as string
        token.role = u.role
        token.firstName = u.firstName
        token.lastName = u.lastName
        token.profileImage = u.profileImage
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.firstName = token.firstName as string
      session.user.lastName = token.lastName as string
      session.user.profileImage = token.profileImage as string | null
      return session
    },
  },
  events: {
    async signIn(message) {
      try {
        const { recordActivityLog } = await import("@/lib/audit-logger")
        const user = message.user as any
        await recordActivityLog({
          userId: user.id,
          action: "USER_LOGIN",
          actionType: "Login",
          module: "Auth",
          entityId: user.id,
          entityType: "User",
          description: `User session authenticated successfully for ${user.firstName || ""} ${user.lastName || ""} (${user.role || ""})`,
          metadata: { email: user.email }
        })
      } catch (err) {
        console.error("Failed to log sign-in event:", err)
      }
    }
  }
})

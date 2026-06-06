import 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role: Role
    firstName: string
    lastName: string
    profileImage?: string | null
  }
  interface Session {
    user: {
      id: string
      role: Role
      firstName: string
      lastName: string
      email: string
      image?: string | null
      profileImage?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    firstName: string
    lastName: string
    profileImage?: string | null
  }
}

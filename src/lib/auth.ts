import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './turso'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const result = await db.execute({
          sql: 'SELECT id, email, name, password_hash, role FROM users WHERE email = ?',
          args: [credentials.email],
        })

        const user = result.rows[0]
        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password, user.password_hash as string)
        if (!isValid) return null

        return {
          id: user.id as string,
          email: user.email as string,
          name: user.name as string,
          role: user.role as string,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'budgetpulse-dev-secret-key-2024',
}

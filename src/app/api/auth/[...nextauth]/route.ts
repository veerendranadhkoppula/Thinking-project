import NextAuth, { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

// --- helpers ---
const makeBaseURL = () => {
  const envURL =
    process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  return envURL || 'http://localhost:3000'
}
const BASE_URL = makeBaseURL()
const payloadURL = process.env.NEXT_PUBLIC_PAYLOAD_API as string

async function safeJson(res: Response) {
  const txt = await res.text()
  if (!txt) return {}
  try {
    return JSON.parse(txt)
  } catch {
    return {}
  }
}

// --- actual NextAuth config ---
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const identifier = String((raw as any)?.email || '').trim()
        const password = (raw as any)?.password
        if (!identifier || !password) throw new Error('Missing credentials')

        let emailForLogin = identifier

        // allow username login → resolve to email
        if (!identifier.includes('@')) {
          const url = new URL('/api/resolve-username', BASE_URL).toString()
          const resResolve = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: identifier }),
          })
          const dataResolve: any = await safeJson(resResolve)

          if (!dataResolve?.found || !dataResolve?.email) {
            throw new Error('Invalid username or password')
          }
          emailForLogin = dataResolve.email
        }

        const res = await fetch(`${payloadURL}/site-users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailForLogin, password }),
        })
        const data: any = await safeJson(res)
        if (!res.ok) throw new Error(data?.errors?.[0]?.message || 'Login failed')
        if (!data?.user?._verified) throw new Error('Please verify your email before logging in.')

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name ?? undefined,
          role: data.user.role ?? 'user',
          isGuest: false,
        } as any
      },
    }),

    // guest login
    CredentialsProvider({
      id: 'guest',
      name: 'Guest',
      credentials: {},
      async authorize() {
        const url = new URL('/api/guest', BASE_URL).toString()
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const data: any = await safeJson(res)

        if (!res.ok) {
          throw new Error(data?.error || `Guest route error (${res.status})`)
        }
        if (!data?.id || !data?.email) {
          throw new Error('Guest route missing id/email')
        }

        return {
          id: data.id,
          email: data.email,
          name: data.username,
          role: data.role ?? 'guest',
          isGuest: true,
        } as any
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = {
          id: (user as any).id,
          email: (user as any).email,
          name: (user as any).name,
          role: (user as any).role ?? 'user',
          isGuest: (user as any).isGuest ?? false,
        }
      }
      return token
    },
    async session({ session, token }) {
      if ((token as any)?.user) session.user = (token as any).user
      return session
    },
  },

  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
}

// export handlers for app router
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }

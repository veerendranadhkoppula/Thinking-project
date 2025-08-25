'use client'

import { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SignInPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const { data: session } = useSession()
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setInfoMsg(null)

    if (mode === 'signup') {
      const res = await fetch('/api/site-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const error = await res.json()
        setErrorMsg(error?.message || 'Signup failed')
        return
      }
      alert('Signup successful! Please check your email to verify your account.')
      setMode('login')
      return
    }

    if (mode === 'forgot') {
      console.log('Forgot Email: ', form.email)
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })

      if (!res.ok) {
        const error = await res.json()
        setErrorMsg(error?.error || 'Failed to send reset email')
        return
      }

      setInfoMsg('Password reset email sent! Check your inbox.')
      return
    }

    // login mode
    const res = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    if (res?.ok) {
      router.push('/')
    } else {
      setErrorMsg(res?.error || 'Login failed')
    }
  }

  if (session) {
    return (
      <div className="max-w-sm mx-auto mt-10 space-y-4">
        <h2 className="text-xl font-bold">You are logged in</h2>
        <p>Welcome, {session.user?.name || session.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/signin' })}
          className="underline text-red-600"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-10 space-y-4">
      <h2 className="text-xl font-bold">Welcome</h2>

      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="bg-red-500 text-white px-4 py-2 w-full rounded"
      >
        Continue with Google
      </button>

      <hr />

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border w-full px-3 py-2"
          required
        />

        {(mode === 'login' || mode === 'signup') && (
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border w-full px-3 py-2"
            required
          />
        )}

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">
          {mode === 'login' ? 'Login' : mode === 'signup' ? 'Signup' : 'Send Reset Email'}
        </button>
      </form>

      {mode === 'login' && (
        <p className="text-sm text-right mt-1">
          <button
            onClick={() => {
              setErrorMsg(null)
              setInfoMsg(null)
              setMode('forgot')
            }}
            className="underline text-blue-600"
            type="button"
          >
            Forgot password?
          </button>
        </p>
      )}

      {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
      {infoMsg && <p className="text-green-600 text-sm text-center">{infoMsg}</p>}

      <p className="text-sm text-center">
        {mode === 'login'
          ? 'New here?'
          : mode === 'signup'
            ? 'Already have an account?'
            : 'Remember your password?'}{' '}
        <button
          onClick={() => {
            setErrorMsg(null)
            setInfoMsg(null)
            setMode(mode === 'login' ? 'signup' : 'login')
          }}
          className="underline text-blue-600"
          type="button"
        >
          {mode === 'login' ? 'Sign up' : 'Login'}
        </button>
      </p>
    </div>
  )
}

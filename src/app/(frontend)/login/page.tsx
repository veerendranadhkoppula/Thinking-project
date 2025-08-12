'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Link from 'next/link'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })

    if (res.ok) {
      setError('')
      router.push('/')
    } else {
      setError('Incorrect username/email or password.')
    }
  }

  const handleGuestLogin = async () => {
    const res = await fetch('/api/auth/guest', { method: 'POST' })

    if (res.ok) {
      router.push('/')
    } else {
      alert('Guest login failed.')
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleLogin} className={styles.form}>
        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>Login with username or email</p>

        <input
          type="text"
          placeholder="Username or Email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
          className={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={styles.input}
        />
        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.button}>
          Login
        </button>

        <button
          type="button"
          onClick={handleGuestLogin}
          className={styles.guestButton}
        >
          Continue as Guest
        </button>

        <p className={styles.bottomText}>
          Don’t have an account?{' '}
          <Link href="/signup" className={styles.link}>
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}

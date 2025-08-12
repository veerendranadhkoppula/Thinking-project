'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import Link from 'next/link'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match!')
      return
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })

    if (res.ok) {
      router.push('/login')
    } else if (res.status === 409) {
      setErrorMessage('This user already exists. Please login.')
    } else {
      setErrorMessage('Signup failed. Try again.')
    }
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSignup} className={styles.form}>
        <h2 className={styles.title}>Create an Account </h2>
        <p className={styles.subtitle}>Join us by entering your details</p>

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={styles.input}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className={styles.input}
        />

        <button type="submit" className={styles.button}>
          Sign Up
        </button>

        <p className={styles.bottomText}>
          Already have an account?{' '}
          <Link href="/login" className={styles.link}>
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}

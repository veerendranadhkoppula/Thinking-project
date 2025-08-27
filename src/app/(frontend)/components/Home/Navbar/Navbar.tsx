'use client'

import React, { useState, useRef, useEffect } from 'react'
import styles from './Navbar.module.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface User {
  email?: string
  username?: string
}

export default function Navbar({ user }: { user: User | null }) {
  const router = useRouter()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 3) Form state, initialized with whatever is available now
  const [formData, setFormData] = useState({
    email: user?.email || '',
    title: '',
    type: '',
    websiteType: '',
    extraField: '',
    file: null as File | File[] | null,
  })

  // 4) Keep email in sync if session arrives later
  useEffect(() => {
    setFormData((prev) => ({ ...prev, email: user?.email || '' }))
  }, [user?.email])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as HTMLInputElement
    if (files) {
      setFormData((prev) => ({
        ...prev,
        [name]: files.length > 1 ? Array.from(files) : files[0],
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/canvas/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          title: formData.title,
          type: formData.type,
          websiteType: formData.websiteType,
          extraField: formData.extraField,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        alert(`Create failed: ${data?.error || 'Unknown error'}`)
        return
      }
      setIsModalOpen(false)
      if (formData.type == 'Website') {
        formData.type = 'Website' + formData.websiteType
      }
      router.push(`/canvas/?id=${data.id}&version=1&type=${formData.type}`)
    } catch (err) {
      alert('Something went wrong while creating canvas')
    }
  }

  // Use NextAuth signOut (safer than custom endpoint)
  const handleLogout = async () => {
    setIsDropdownOpen(false)
    setIsModalOpen(false)
    await signOut({ redirect: false })
    router.refresh()
  }

  const initials =
    (user?.username?.trim()?.charAt(0)?.toUpperCase() ||
      user?.email?.trim()?.charAt(0)?.toUpperCase()) ??
    '👤'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.left}>
          <p>LOGO</p>
        </div>

        <div className={styles.right}>
          {user && (
            <button className={styles.newCanvasBtn} onClick={() => setIsModalOpen(true)}>
              + New canvas
            </button>
          )}

          <div className={styles.profileWrapper} ref={dropdownRef}>
            <button
              type="button"
              className={styles.profileDisplay}
              onClick={() => setIsDropdownOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
            >
              <div className={styles.profileCircle}>
                <span className={styles.initials}>{initials}</span>
              </div>
              {user && <span className={styles.username}>{user.username}</span>}
            </button>

            {isDropdownOpen && (
              <div className={styles.dropdownMenu} role="menu">
                {user ? (
                  <>
                    <Link href="/profile" className={styles.dropdownItem}>
                      Profile
                    </Link>
                    <Link href="/billing" className={styles.dropdownItem}>
                      Billing
                    </Link>
                    <hr className={styles.dropdownDivider} />
                    <button className={styles.dropdownItem} onClick={handleLogout}>
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className={styles.dropdownItem}>
                      Sign In / Login
                    </Link>
                    <Link href="/signup" className={styles.dropdownItem}>
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {user && isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Create Canvas</h2>
            <form onSubmit={handleSubmit}>
              <label>Email </label>
              <input type="email" name="email" value={formData.email} readOnly />

              <label>Canvas Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />

              <label>Canvas Type</label>
              <select name="type" value={formData.type} onChange={handleChange} required>
                <option value="">Select Type</option>
                <option value="Website">Website</option>
                <option value="Figma">Figma</option>
                <option value="Image">Image</option>
                <option value="PDF">PDF</option>
                <option value="Video">Video</option>
              </select>

              {formData.type === 'Website' && (
                <>
                  <label>Website URL</label>
                  <input
                    type="url"
                    name="extraField"
                    placeholder="https://example.com"
                    onChange={handleChange}
                  />
                  <label>Website Type</label>
                  <select
                    name="websiteType"
                    value={formData.websiteType}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="Proxy">Proxy</option>
                    <option value="Manual">Manual</option>
                    <option value="Extension">Extension</option>
                  </select>
                </>
              )}

              {formData.type === 'Figma' && (
                <>
                  <label>Figma URL</label>
                  <input
                    type="url"
                    name="extraField"
                    placeholder="https://figma.com/…"
                    onChange={handleChange}
                  />
                </>
              )}

              {formData.type === 'Image' && (
                <>
                  <label>Upload Multiple Images</label>
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    multiple
                    onChange={handleChange}
                  />
                </>
              )}

              {formData.type === 'PDF' && (
                <>
                  <label>Upload PDF</label>
                  <input type="file" name="file" accept="application/pdf" onChange={handleChange} />
                </>
              )}

              {formData.type === 'Video' && (
                <>
                  <label>Upload Video</label>
                  <input type="file" name="file" accept="video/*" onChange={handleChange} />
                </>
              )}

              <div className={styles.modalActions}>
                <button type="submit">Create</button>
                <button type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './TeamPage.module.css'

type Team = { id: string; name: string; slug: string; members: { email: string }[] }

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export default function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [emails, setEmails] = useState('')
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', slug: '' })
  const [slugTouched, setSlugTouched] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/team/my')
      .then(r => r.json())
      .then(data => setTeam(data))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!slugTouched) setCreateForm(f => ({ ...f, slug: slugify(f.name) }))
  }, [createForm.name, slugTouched])

  useEffect(() => {
    if (showCreate) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 50)
      const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setShowCreate(false)
      document.addEventListener('keydown', onEsc)
      return () => {
        clearTimeout(t)
        document.removeEventListener('keydown', onEsc)
      }
    }
  }, [showCreate])

  async function createTeam() {
    if (!createForm.name || !createForm.slug) return
    setCreating(true)
    try {
      const res = await fetch('/api/team/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create team')
      setTeam(data)
      setShowCreate(false)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function invite() {
    const list = emails.split(',').map(e => e.trim()).filter(Boolean)
    if (!team || list.length === 0) return
    const res = await fetch(`/api/team/${team.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: list, next: '/canvases' }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data?.error || 'Failed to send invites')
      return
    }
    alert(`Invites sent. Added ${data.added}, delivered ${data.sent}.`)
    setEmails('')
    const fresh = await fetch('/api/team/my').then(r => r.json())
    setTeam(fresh)
  }

  if (loading) {
    return (
      <div className={styles.centerWrap}>
        <div className={styles.spinner} aria-label="Loading" />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {!team ? (
        <div className={styles.card}>
          <h2 className={styles.title}>Create your team</h2>
          <p className={styles.muted}>Invite members by email to view shared pages without login.</p>
          <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>
            + New Team
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.headerRow}>
              <h2 className={styles.title}>{team.name}</h2>
              <button className={styles.btnGhost} onClick={() => setShowCreate(true)}>
                Edit team
              </button>
            </div>
            <p className={styles.kv}><span>Slug</span><code>{team.slug}</code></p>

            <h3 className={styles.subTitle}>Members</h3>
            {team.members?.length ? (
              <ul className={styles.list}>
                {team.members.map(m => (
                  <li key={m.email} className={styles.listItem}>
                    <span className={styles.avatar}>{m.email[0].toUpperCase()}</span>
                    <span className={styles.email}>{m.email}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No members yet.</p>
            )}
          </section>

          <section className={styles.card}>
            <h3 className={styles.subTitle}>Invite members</h3>
            <label className={styles.label} htmlFor="emails">Email addresses</label>
            <textarea
              id="emails"
              className={styles.textarea}
              placeholder="a@x.com, b@y.com"
              value={emails}
              onChange={e => setEmails(e.target.value)}
              rows={3}
            />
            <p className={styles.help}>Separate multiple emails with commas.</p>
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={invite}>Send invites</button>
            </div>
          </section>
        </div>
      )}

      {showCreate && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowCreate(false)}
          aria-modal="true"
          role="dialog"
        >
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{team ? 'Edit team' : 'Create team'}</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.form}>
              <label className={styles.label} htmlFor="team-name">Team name</label>
              <input
                id="team-name"
                ref={nameInputRef}
                className={styles.input}
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Marketing"
              />

              <label className={styles.label} htmlFor="team-slug">Slug</label>
              <input
                id="team-slug"
                className={styles.input}
                value={createForm.slug}
                onChange={e => {
                  setSlugTouched(true)
                  setCreateForm(f => ({ ...f, slug: slugify(e.target.value) }))
                }}
                placeholder="marketing"
              />

              <div className={styles.actions}>
                <button className={styles.btnSecondary} onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={createTeam}
                  disabled={creating || !createForm.name || !createForm.slug}
                >
                  {creating ? 'Saving…' : (team ? 'Save' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

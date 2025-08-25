/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerUser } from '@/lib/getServerUser'
import styles from './TicketsList.module.css'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Reusable: fetch tickets for a given user
async function getUserTickets(user: { id?: string; email?: string } | null) {
  if (!user?.email) {
    throw new Error('User not authenticated')
  }

  const payloadURL = process.env.NEXT_PUBLIC_PAYLOAD_API as string
  const qs = new URLSearchParams({
    limit: '50',
    sort: '-updatedAt',
    'where[or][0][reporterEmail][equals]': String(user.email),
    'where[or][1][assigneeEmail][equals]': String(user.email),
  })

  const res = await fetch(`${payloadURL}/tickets?${qs.toString()}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to load tickets for ${user.email}, status ${res.status}: ${text}`)
  }
  return res.json()
}

export default async function TicketsList() {
  const user = await getServerUser()
  const data = user ? await getUserTickets(user) : { docs: [] }
  const tickets = data?.docs || []

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Tickets</h1>
      <Link href="/tickets/new" className={styles.newButton}>
        New Ticket
      </Link>
      <ul className={styles.list}>
        {tickets.map((t: any) => {
          const id = t?.id || t?._id
          return (
            <li key={id || t.title} className={styles.listItem}>
              {id ? (
                <a href={`/tickets/${id}`} className={styles.link}>
                  <div className={styles.itemHeader}>
                    <div>
                      <p className={styles.title}>{t.title}</p>
                      <p className={styles.meta}>
                        {t.priority?.toUpperCase()} • {String(t.status).replace('_', ' ')}
                      </p>
                    </div>
                    <div className={styles.timestamp}>{new Date(t.updatedAt).toLocaleString()}</div>
                  </div>
                </a>
              ) : (
                <div className={styles.link}>
                  <div className={styles.itemHeader}>
                    <div>
                      <p className={styles.title}>{t.title}</p>
                      <p className={styles.meta}>
                        {t.priority?.toUpperCase()} • {String(t.status).replace('_', ' ')}
                      </p>
                    </div>
                    <div className={styles.timestamp}>{new Date(t.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

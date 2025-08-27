/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerUser } from '@/lib/getServerUser'
import styles from './TicketsList.module.css'
import Link from 'next/link'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type UserLite = { id?: string; email?: string } | null
async function getUserTickets(user: UserLite) {
  if (!user?.email) {
    throw new Error('User not authenticated')
  }

  const qs = new URLSearchParams({
    limit: '50',
    sort: '-updatedAt',
  })

  // Get absolute base URL (works locally + on Vercel)
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const cookie = (await headers()).get('cookie') ?? ''

  const res = await fetch(`${baseUrl}/api/app-tickets?${qs.toString()}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
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
            <li key={id || t?.title} className={styles.listItem}>
              {id ? (
                <a href={`/tickets/${id}`} className={styles.link}>
                  <div className={styles.itemHeader}>
                    <div>
                      <p className={styles.title}>{t.title}</p>
                      <p className={styles.meta}>
                        {String(t.priority || '').toUpperCase()} •{' '}
                        {String(t.status || '').replace('_', ' ')}
                      </p>
                    </div>
                    <div className={styles.timestamp}>
                      {t?.updatedAt ? new Date(t.updatedAt).toLocaleString() : ''}
                    </div>
                  </div>
                </a>
              ) : (
                <div className={styles.link}>
                  <div className={styles.itemHeader}>
                    <div>
                      <p className={styles.title}>{t.title}</p>
                      <p className={styles.meta}>
                        {String(t.priority || '').toUpperCase()} •{' '}
                        {String(t.status || '').replace('_', ' ')}
                      </p>
                    </div>
                    <div className={styles.timestamp}>
                      {t?.updatedAt ? new Date(t.updatedAt).toLocaleString() : ''}
                    </div>
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

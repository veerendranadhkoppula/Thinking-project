/* eslint-disable @typescript-eslint/no-explicit-any */
import { headers } from 'next/headers'
import { getServerOrigin } from '@/lib/http'
import styles from './TicketsList.module.css'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getTickets() {
  const origin = await getServerOrigin()
  const cookie = (await headers()).get('cookie') || ''

  // hit our proxy; no depth needed
  const url = `${origin}/api/app-my-tickets?limit=50&sort=-updatedAt`
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'include',
    headers: { cookie },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to load tickets, status ${res.status}: ${text}`)
  }
  return res.json()
}

export default async function TicketsList() {
  const data = await getTickets()
  const tickets = data?.docs || []

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Tickets</h1>
      <Link href="/tickets/new" className={styles.newButton}>New Ticket</Link>
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
                    <div className={styles.timestamp}>
                      {new Date(t.updatedAt).toLocaleString()}
                    </div>
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
                    <div className={styles.timestamp}>
                      {new Date(t.updatedAt).toLocaleString()}
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

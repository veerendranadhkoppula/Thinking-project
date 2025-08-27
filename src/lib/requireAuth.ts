// src/lib/requireAuth.ts
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerOrigin } from '@/lib/http'

export async function requireAuth(redirectTo: string) {
  const origin = await getServerOrigin()
  const cookie = (await headers()).get('cookie') || ''
  const me = await fetch(`${origin}/api/users/me`, {
    headers: { cookie },
    cache: 'no-store',
  })
  if (me.status !== 200) {
    redirect(`/admin/login?redirect=${encodeURIComponent(redirectTo)}`)
  }
  return me.json()
}

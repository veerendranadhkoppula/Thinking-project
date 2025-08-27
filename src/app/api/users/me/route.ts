/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/getServerUser' // <- do not modify this helper

/**
 * Bridge endpoint to satisfy requireAuth() which calls /api/users/me.
 * If a NextAuth session exists, we return a Payload-like response with 200.
 * Otherwise 401 (so requireAuth will redirect as it already does).
 *
 * NOTE: We intentionally keep the shape similar to Payload: { user: {...} }.
 */
export async function GET(_req: NextRequest) {
  const appUser = await getServerUser().catch(() => null)

  // If logged in via NextAuth, synthesize a minimal "user" like Payload's
  if (appUser?.email) {
    // You may look up a site-user id by email if you want a real id.
    // For now, use email as a stable fallback id so requireAuth() is happy.
    const user = {
      id: (appUser as any).id || (appUser as any).userId || appUser.email, // fallback
      email: appUser.email,
      name: (appUser as any).username || (appUser as any).name || appUser.email.split('@')[0],
      role: (appUser as any).role || 'member',
    }
    return NextResponse.json({ user }, { status: 200 })
  }

  // No NextAuth session -> treat as unauthenticated (requireAuth will redirect)
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}

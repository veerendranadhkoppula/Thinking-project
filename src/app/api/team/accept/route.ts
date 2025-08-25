/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { verifyViewerToken } from '@/lib/teamTokens' 

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''
  const next = url.searchParams.get('next') || '/'

  try {
    const payload = await getPayload({ config })
    const claims = await verifyViewerToken(token)
    const teamId = claims.sub as string
    const email = claims.email.toLowerCase()

    const team = await payload.findByID({ collection: 'teams', id: teamId })
    const emails = (team?.members || []).map((m: any) => String(m.email).toLowerCase())
    if (!emails.includes(email)) {
      return NextResponse.json({ error: 'No longer invited' }, { status: 403 })
    }

    const res = NextResponse.redirect(new URL(next, url.origin))
    res.cookies.set('team-viewer', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 90 * 24 * 60 * 60,
    })
    res.cookies.set('team-id', teamId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 90 * 24 * 60 * 60,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
  }
}

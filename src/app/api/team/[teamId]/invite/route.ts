/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { signViewerToken } from '@/lib/teamTokens'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: { teamId: string } }
) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { emails, next } = (await req.json()) as { emails: string[]; next?: string }
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'No emails' }, { status: 400 })
  }

  const team = await payload.findByID({ collection: 'teams', id: params.teamId })
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })


  const ownerId = typeof team.owner === 'object' ? team.owner.id : team.owner
  if (user.role !== 'admin' && ownerId !== user.id) {
    return NextResponse.json({ error: 'Not owner' }, { status: 403 })
  }

  const existing = (team.members || []).map((m: any) => String(m.email).toLowerCase())
  const toAdd = emails
    .map(e => e.trim().toLowerCase())
    .filter(e => e && !existing.includes(e))

  if (toAdd.length) {
    await payload.update({
      collection: 'teams',
      id: params.teamId,
      data: {
        members: [
          ...(team.members || []),
          ...toAdd.map(e => ({
            email: e,
            invitedAt: new Date().toISOString(),
            invitedBy: user.id,
          })),
        ],
      },
    })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const linkNext = next || '/canvases'

  for (const email of toAdd) {
    const token = await signViewerToken(params.teamId, email)
    const url = `${base}/api/team/accept?token=${encodeURIComponent(token)}&next=${encodeURIComponent(linkNext)}`
    await payload.sendEmail({
      to: email,
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      subject: `You have been invited to view ${team.name}`,
      html: `
        <p>You have access to ${team.name}.</p>
        <p><a href="${url}">Open your team pages</a></p>
        <p>This link signs you in, no password required.</p>
      `,
      text: `Open your team pages: ${url}`,
    })
  }

  return NextResponse.json({ added: toAdd.length })
}

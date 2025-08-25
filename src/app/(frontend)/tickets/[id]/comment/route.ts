import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const form = await req.formData()

  // Prefer hidden canonical id. Fallback to URL segment.
  const raw = (form.get('ticketId') ?? params?.id ?? '').toString().trim()
  const body = (form.get('body') ?? '').toString().trim()

  if (!raw) return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 })
  if (!body) return NextResponse.json({ error: 'Comment body required' }, { status: 400 })

  const ticket = /^\d+$/.test(raw) ? Number(raw) : raw

  const origin = req.nextUrl.origin
  const cookie = req.headers.get('cookie') || ''

  const res = await fetch(`${origin}/api/comments`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ ticket, body }),
  })

  if (!res.ok) {
    const text = await res.text()
    return new NextResponse(text || 'Failed to post comment', { status: 400 })
  }

  const redirectId = typeof ticket === 'number' ? String(ticket) : ticket
  return NextResponse.redirect(new URL(`/tickets/${encodeURIComponent(redirectId)}`, req.url))
}

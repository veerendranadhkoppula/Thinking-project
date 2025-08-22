import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin
  const cookie = req.headers.get('cookie') || ''
  const body = await req.json()

  const me = await fetch(`${origin}/api/users/me`, {
    headers: { cookie },
    cache: 'no-store',
  }).then(r => r.json()).catch(() => null)

  const r = await fetch(`${origin}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ ...body, reporter: me?.user?.id }),
  })

  return NextResponse.json(await r.json().catch(() => null), { status: r.status })
}

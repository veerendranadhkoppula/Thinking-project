import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const cookie = req.headers.get('cookie') || ''

  const meRes = await fetch(`${origin}/api/users/me`, {
    headers: { cookie },
    cache: 'no-store',
  })
  if (meRes.status !== 200) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const me = await meRes.json().catch(() => null)
  const userId = me?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'No user id' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = url.searchParams.get('limit') ?? '50'
  const sort  = url.searchParams.get('sort')  ?? '-updatedAt'
  const page  = url.searchParams.get('page')  ?? '1'

  const qs = new URLSearchParams({
    limit,
    sort,
    page,
    'where[or][0][reporter][equals]': String(userId),
    'where[or][1][assignee][equals]': String(userId),
  })

  const listRes = await fetch(`${origin}/api/tickets?${qs.toString()}`, {
    headers: { cookie },
    cache: 'no-store',
    credentials: 'include',
  })

  const body = await listRes.text()
  return new NextResponse(body, { status: listRes.status, headers: { 'content-type': 'application/json' } })
}

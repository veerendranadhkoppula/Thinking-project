import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const cookie = req.headers.get('cookie') || ''

  // Get the current user
  const meRes = await fetch(`${origin}/api/users/me`, {
    headers: { cookie },
    cache: 'no-store',
  })
  if (meRes.status !== 200) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const me = await meRes.json().catch(() => null)
  const userEmail = me?.user?.email
  if (!userEmail) {
    return NextResponse.json({ error: 'No user email' }, { status: 401 })
  }

  // Query params
  const url = new URL(req.url)
  const limit = url.searchParams.get('limit') ?? '50'
  const sort = url.searchParams.get('sort') ?? '-updatedAt'
  const page = url.searchParams.get('page') ?? '1'

  // Build query string filtering by email instead of id
  const qs = new URLSearchParams({
    limit,
    sort,
    page,
    'where[or][0][reporterEmail][equals]': String(userEmail),
    'where[or][1][assigneeEmail][equals]': String(userEmail),
  })

  const listRes = await fetch(`${origin}/api/tickets?${qs.toString()}`, {
    headers: { cookie },
    cache: 'no-store',
    credentials: 'include',
  })

  const body = await listRes.text()
  return new NextResponse(body, {
    status: listRes.status,
    headers: { 'content-type': 'application/json' },
  })
}

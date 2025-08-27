/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

async function safeJson(res: Response) {
  const txt = await res.text().catch(() => '')
  if (!txt) return {}
  try {
    return JSON.parse(txt)
  } catch {
    return {}
  }
}

/**
 * GET /api/app-tickets
 * Proxies to the Payload tickets list, scoping results to the current user via relationship IDs.
 * Accepts passthrough query params: limit, sort, page.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const cookie = req.headers.get('cookie') || ''

  // Identify current user
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

  // Passthrough params
  const url = new URL(req.url)
  const limit = url.searchParams.get('limit') ?? '50'
  const sort = url.searchParams.get('sort') ?? '-updatedAt'
  const page = url.searchParams.get('page') ?? '1'

  // IMPORTANT: filter by relationship IDs (reporter/assignee), not emails
  const qs = new URLSearchParams({
    limit,
    sort,
    page,
    'where[or][0][reporter][equals]': String(userId),
    'where[or][1][assignee][equals]': String(userId),
  })

  // Call the Payload REST API exposed by this Next app so cookies/ACL apply
  const listRes = await fetch(`${origin}/api/tickets?${qs.toString()}`, {
    headers: { cookie },
    cache: 'no-store',
    credentials: 'include',
  })

  const body = await listRes.text().catch(() => '')
  // Mirror status + content-type for transparency
  return new NextResponse(body, {
    status: listRes.status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * POST /api/app-tickets
 * Creates a ticket as the current user (reporter is enforced here and again by Payload hook).
 * Expects JSON body with title, description, priority, url, labels (array or comma-separated string).
 */
export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin
  const cookie = req.headers.get('cookie') || ''
  const rawBody = await safeJson(req as unknown as Response) // NextRequest doesn't have .json() without cloning
  // If safeJson above can't parse, fall back to req.json()
  const body = Object.keys(rawBody).length ? rawBody : await req.json().catch(() => ({}))

  // Get current user
  const meRes = await fetch(`${origin}/api/users/me`, {
    headers: { cookie },
    cache: 'no-store',
  })
  if (meRes.status !== 200) {
    const err = await safeJson(meRes as unknown as Response)
    return NextResponse.json({ error: err?.error || 'Not authenticated' }, { status: 401 })
  }
  const me = await meRes.json().catch(() => null)
  const reporterId = me?.user?.id
  if (!reporterId) {
    return NextResponse.json({ error: 'No user id' }, { status: 401 })
  }

  // Normalize labels: allow comma string or array of { value }
  let labels = body?.labels
  if (typeof labels === 'string') {
    labels = labels
      .split(',')
      .map((v: string) => ({ value: v.trim() }))
      .filter((v: { value: string }) => v.value)
  } else if (Array.isArray(labels)) {
    labels = labels
      .map((v: any) => (typeof v === 'string' ? { value: v.trim() } : v))
      .filter((v: any) => v?.value)
  } else {
    labels = []
  }

  const payload = {
    title: String(body?.title || '').trim(),
    description: String(body?.description || '').trim(),
    priority: String(body?.priority || 'medium'),
    url: String(body?.url || '').trim(),
    labels,
    // reporter is also set in the Payload beforeChange hook, but we set it here too
    reporter: reporterId,
  }

  const r = await fetch(`${origin}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  const json = await safeJson(r)
  return NextResponse.json(json, { status: r.status })
}

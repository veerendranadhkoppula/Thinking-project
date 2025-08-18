import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const rs = await payload.find({
    collection: 'teams',
    where: { owner: { equals: user.id } },
    limit: 1,
  })
  const t = rs.docs[0]
  if (!t) return NextResponse.json(null)
  return NextResponse.json({ id: t.id, name: t.name, slug: t.slug, members: t.members || [] })
}

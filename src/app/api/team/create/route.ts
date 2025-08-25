import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  const body = await req.json()

  const doc = await payload.create({
    collection: 'teams',
    data: {
      name: body.name,
      slug: body.slug,
      owner: user.id,
      members: [],
    },
  })
  return NextResponse.json({ id: doc.id, name: doc.name, slug: doc.slug, members: [] })
}

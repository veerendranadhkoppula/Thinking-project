import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Validate required fields from Website-like object
    if (!body?.url) {
      return NextResponse.json({ ok: false, error: 'Missing required field: url' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    // ---- Try to find the Website entry ----
    const found = await payload.find({
      collection: 'Website',
      where: { url: { equals: body.url } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    let website = found?.docs?.[0]

    if (!website) {
      // If not found → create new Website
      website = await payload.create({
        collection: 'Website',
        data: body,
        overrideAccess: true,
      })
      return NextResponse.json({ ok: true, data: website })
    }

    // If found → update existing Website
    const updated = await payload.update({
      collection: 'Website',

      id: website.id,
      data: body, // directly use Website-like structure
      overrideAccess: true,
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: any) {
    console.error('Save Website API Error:', e)
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unexpected_error' },
      { status: 500 },
    )
  }
}

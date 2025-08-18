import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.PAYLOAD_SECRET)

async function verify(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
  return payload
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  const protectedPrefixes = ['/canvases', '/team-content'] // edit to match your site
  if (!protectedPrefixes.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Owners logged into Payload are allowed, the accept API sets only viewer cookies, so here we check viewer cookies
  const token = req.cookies.get('team-viewer')?.value
  if (!token) {
    // allow owner sessions via Payload admin cookie by skipping, or redirect to info page
    return NextResponse.redirect(new URL('/access', req.url))
  }

  try {
    const pl = await verify(token)
    if (pl.purpose !== 'teamViewer' || pl.role !== 'viewer') {
      throw new Error('bad')
    }
    // token ok, let it through
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/access', req.url))
  }
}

export const config = {
  matcher: ['/canvases/:path*', '/team-content/:path*'],
}

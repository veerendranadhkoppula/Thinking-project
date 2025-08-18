import { SignJWT, jwtVerify, JWTPayload } from 'jose'

const secret = new TextEncoder().encode(process.env.PAYLOAD_SECRET || 'dev-secret')

export type ViewerClaims = JWTPayload & {
  sub: string   // teamId
  email: string
  role: 'viewer'
  purpose: 'teamViewer'
}

export async function signViewerToken(teamId: string, email: string, ttlDays = 90) {
  return await new SignJWT({ email, role: 'viewer', purpose: 'teamViewer' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(teamId)
    .setIssuedAt()
    .setExpirationTime(`${ttlDays}d`)
    .sign(secret)
}

export async function verifyViewerToken(token: string): Promise<ViewerClaims> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
  if (payload.purpose !== 'teamViewer' || payload.role !== 'viewer') throw new Error('Invalid token')
  return payload as ViewerClaims
}

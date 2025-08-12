// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { identifier, password } = await req.json();
  const payload = await getPayload({ config });

  // Find by email or username
  const rs = await payload.find({
    collection: 'users',
    where: {
      or: [
        { email: { equals: identifier } },
        { username: { equals: identifier } },
      ],
    },
    limit: 1,
  });

  const user = rs.docs[0];
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Login with email + password
  const login = await payload.login({
    collection: 'users',
    data: {
      email: user.email,
      password,
    },
  });

  if (!login?.token) {
    return NextResponse.json({ error: 'Login failed' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });

  const common = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };

  // Payload auth token (so Payload APIs work server-side)
  res.cookies.set('payload-token', login.token, common);
  // Email cookie that your HomePage reads to query Postgres
  res.cookies.set('email', user.email, common);

  // You can also set a non-HTTP-only `username` for client-only use
  // res.cookies.set('username', user.username, { ...common, httpOnly: false });

  return res;
}

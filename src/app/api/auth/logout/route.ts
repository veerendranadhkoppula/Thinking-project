// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ message: 'Logged out' });

  const clear = { path: '/', maxAge: 0 };

  res.cookies.set('payload-token', '', clear);
  res.cookies.set('email', '', clear);
  // res.cookies.set('username', '', clear);

  return res;
}

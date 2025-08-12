import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

function generateRandomString(length = 6) {
  return Math.random().toString(36).substring(2, 2 + length)
}

export async function POST() {
  const payload = await getPayload({ config })

  const randomId = generateRandomString()
  const username = `guest_${randomId}`
  const email = `${username}@example.com`
  const password = generateRandomString(12)

  try {
    // 1. Create the guest user
    await payload.create({
      collection: 'users',
      data: {
        username,
        email,
        password,
        role: 'guest',
      },
    })

    // 2. Log the guest user in
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (!result.token) {
      return NextResponse.json({ error: 'No token received' }, { status: 500 })
    }

    const res = NextResponse.json({ success: true, email })

    // 3. Set token as cookie
    res.cookies.set({
      name: 'payload-token',
      value: result.token,
      httpOnly: true,
      path: '/',
    })

    return res
  } catch (err) {
    console.error('Guest login error:', err)
    return NextResponse.json({ error: 'Guest login failed' }, { status: 500 })
  }
}
